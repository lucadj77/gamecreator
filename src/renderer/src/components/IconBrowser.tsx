import { useContext, useEffect, useMemo, useState } from 'react'
import type { IconCatalog, IconCollection, IconImport } from '../../../shared/library'
import {
  ICON_COLLECTIONS,
  collectionFolder,
  iconExtension,
  isValidAssetName
} from '../../../shared/library'
import { resolveAsset } from '../../../shared/model/assets'
import { fuzzyScore } from '../../../shared/model/fuzzy'
import { messageFromError, type Message } from '../../../shared/messages'
import { Dialog } from '../editor/dialogs'
import { useI18n } from '../i18n/context'
import { ICON_GROUPS_IT, ICON_TAG_WORDS_IT, ICON_TAGS_IT } from '../i18n/iconTags'
import { AssetsContext, publishAssetsUpdate } from '../render/assets'
import Segmented from './Segmented'

// Finestra di importazione delle icone di game-icons.net e di Kenney: categorie a sinistra, ricerca
// approssimata, anteprima con la tinta scelta. Vedi docs/specifica.md, sezione 10.1.

const PAGE = 240
const TINT_KEY = 'iconBrowserTint'
const COLLECTION_KEY = 'iconBrowserCollection'

const catalogs = new Map<IconCollection, Promise<IconCatalog>>()

function loadCatalog(collection: IconCollection): Promise<IconCatalog> {
  let p = catalogs.get(collection)
  if (!p) {
    p = window.api.iconCatalog(collection)
    p.catch(() => catalogs.delete(collection))
    catalogs.set(collection, p)
  }
  return p
}

function loadCollection(): IconCollection {
  try {
    const c = localStorage.getItem(COLLECTION_KEY)
    return (ICON_COLLECTIONS as readonly string[]).includes(c ?? '')
      ? (c as IconCollection)
      : 'game-icons'
  } catch {
    return 'game-icons'
  }
}

interface Icon {
  /** Raccolta e id nel catalogo: "kenney-icons:icons/pawn" */
  key: string
  collection: IconCollection
  id: string
  name: string
  author: string
  /** Tracciato nel riquadro 512 × 512, o data URL dell'immagine */
  d: string
  image: boolean
  tags: string[]
  /** Testo su cui si cerca: nome, autore e nomi dei tag in inglese e in italiano */
  search: string
}

function loadTint(): string {
  try {
    return localStorage.getItem(TINT_KEY) || '#000000'
  } catch {
    return '#000000'
  }
}

export default function IconBrowser({
  onImported,
  onClose
}: {
  /** Nomi delle icone importate (senza estensione) */
  onImported?(names: string[]): void
  onClose(): void
}): React.JSX.Element {
  const { t, lang } = useI18n()
  const assets = useContext(AssetsContext)
  const [collection, setCollectionState] = useState<IconCollection>(loadCollection)
  const [catalog, setCatalog] = useState<{ c: IconCollection; catalog: IconCatalog } | null>(null)
  const [error, setError] = useState<Message | null>(null)
  const [query, setQuery] = useState('')
  const [tag, setTag] = useState<string | null>(null)
  const [open, setOpen] = useState<string | null>(null)
  /** Pagine mostrate: si torna alla prima quando cambiano ricerca o filtro */
  const [more, setMore] = useState({ view: '', limit: PAGE })
  const [tint, setTintState] = useState(loadTint)
  const [dark, setDark] = useState(false)
  /** chiave → icona e nome del file scelto; si possono scegliere icone di più raccolte */
  const [chosen, setChosen] = useState<Map<string, { icon: Icon; name: string }>>(new Map())
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let live = true
    loadCatalog(collection)
      .then((c) => live && setCatalog({ c: collection, catalog: c }))
      .catch((e) => live && setError(messageFromError(e)))
    return () => {
      live = false
    }
  }, [collection])

  const setCollection = (c: IconCollection): void => {
    setCollectionState(c)
    setTag(null)
    setOpen(null)
    try {
      localStorage.setItem(COLLECTION_KEY, c)
    } catch {
      // preferenza non essenziale
    }
  }

  const setTint = (c: string): void => {
    setTintState(c)
    try {
      localStorage.setItem(TINT_KEY, c)
    } catch {
      // preferenza non essenziale
    }
  }

  const tagLabel = (slug: string, label: string): string =>
    lang === 'it' ? (ICON_TAGS_IT[slug] ?? label) : label
  const groupLabel = (label: string): string =>
    lang === 'it' ? (ICON_GROUPS_IT[label] ?? label) : label

  // il catalogo mostrato è quello della raccolta scelta, appena è caricato
  const current = catalog?.c === collection ? catalog.catalog : null
  const imageCatalog = current?.kind === 'image'
  const groups = current?.tags.groups ?? []
  /** Un solo gruppo: i suoi tag si mostrano direttamente, senza doverlo aprire */
  const flat = groups.length === 1

  const icons = useMemo<Icon[]>(() => {
    const catalog = current
    if (!catalog) return []
    const labels = new Map(
      catalog.tags.groups.flatMap((g) =>
        g.tags.map(
          (x) =>
            [
              x.slug,
              `${x.label} ${ICON_TAGS_IT[x.slug] ?? ''} ${ICON_TAG_WORDS_IT[x.slug] ?? ''}`
            ] as const
        )
      )
    )
    return catalog.icons.map(([id, d]) => {
      const [author, name] = id.split('/')
      const tags = catalog.tags.icons[id] ?? []
      const authorName = catalog.author?.name ?? catalog.authors[author]?.name ?? author
      return {
        key: `${collection}:${id}`,
        collection,
        id,
        name,
        author: authorName,
        d,
        image: catalog.kind === 'image',
        tags,
        search: `${name} ${authorName} ${tags.map((s) => labels.get(s) ?? s).join(' ')}`
      }
    })
  }, [current, collection])

  const counts = useMemo(() => {
    const c = new Map<string, number>()
    for (const i of icons) for (const s of i.tags) c.set(s, (c.get(s) ?? 0) + 1)
    return c
  }, [icons])

  const shown = useMemo(() => {
    const inTag = tag === null ? icons : icons.filter((i) => i.tags.includes(tag))
    if (!query.trim()) return inTag
    // il nome conta più dei tag e dell'autore
    return inTag
      .map((i) => ({
        i,
        score: Math.max(fuzzyScore(query, i.name), fuzzyScore(query, i.search) * 0.95)
      }))
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score || a.i.name.localeCompare(b.i.name))
      .map((r) => r.i)
  }, [icons, tag, query])

  const view = `${collection}|${tag}|${query}`
  const limit = more.view === view ? more.limit : PAGE
  const toggle = (icon: Icon): void => {
    const next = new Map(chosen)
    if (next.has(icon.key)) next.delete(icon.key)
    else next.set(icon.key, { icon, name: icon.name })
    setChosen(next)
  }

  const rename = (key: string, name: string): void => {
    const c = chosen.get(key)
    if (c) setChosen(new Map(chosen).set(key, { ...c, name }))
  }

  /** Percorso sotto assets/ del file che un'icona diventa */
  const filePath = (icon: Icon, name: string): string =>
    `${collectionFolder(icon.collection)}/${name}.${iconExtension(icon.d)}`

  /** Problema del nome scelto per un'icona, o null */
  const nameIssue = (key: string, name: string): { text: string; blocking: boolean } | null => {
    if (!isValidAssetName(name)) return { text: t('icons.badName'), blocking: true }
    const icon = chosen.get(key)!.icon
    const path = filePath(icon, name)
    const dup = [...chosen].some(([other, c]) => other !== key && filePath(c.icon, c.name) === path)
    if (dup) return { text: t('icons.duplicateName'), blocking: true }
    if (assets.includes(path)) return { text: t('icons.replaces'), blocking: false }
    const r = resolveAsset(name, assets)
    if (r.ok || r.reason === 'ambiguous')
      return {
        text: t('icons.ambiguous', { files: r.ok ? r.path : r.candidates.join(', ') }),
        blocking: false
      }
    return null
  }

  const blocked = [...chosen].some(([key, c]) => nameIssue(key, c.name)?.blocking)

  const run = async (): Promise<void> => {
    setBusy(true)
    setError(null)
    try {
      // un'importazione per raccolta; l'ultima porta lo stato completo degli asset
      const byCollection = new Map<IconCollection, IconImport[]>()
      for (const { icon, name } of chosen.values())
        byCollection.set(icon.collection, [
          ...(byCollection.get(icon.collection) ?? []),
          { id: icon.id, name }
        ])
      for (const [c, items] of byCollection)
        publishAssetsUpdate(await window.api.importIcons(c, items))
      onImported?.([...chosen.values()].map((c) => c.name))
      onClose()
    } catch (e) {
      setError(messageFromError(e))
    } finally {
      setBusy(false)
    }
  }

  const preview = (i: Icon, size: number): React.JSX.Element =>
    i.image ? (
      <img src={i.d} alt="" style={{ maxWidth: size, maxHeight: size }} draggable={false} />
    ) : (
      <svg viewBox="0 0 512 512" width={size} height={size} aria-hidden="true">
        <path d={i.d} fill={tint} />
      </svg>
    )
  const kenneyChosen = [...chosen.values()].some((c) => c.icon.collection !== 'game-icons')
  const gameIconsChosen = [...chosen.values()].some((c) => c.icon.collection === 'game-icons')

  const tagButton = (x: { slug: string; label: string }, sub: boolean): React.JSX.Element => (
    <button
      key={x.slug}
      className={[tag === x.slug ? 'on' : '', sub ? 'sub' : ''].join(' ').trim()}
      onClick={() => setTag(x.slug)}
    >
      {tagLabel(x.slug, x.label)} <span className="muted">{counts.get(x.slug) ?? 0}</span>
    </button>
  )

  return (
    <Dialog title={t('icons.title')} onClose={busy ? () => undefined : onClose}>
      <div className="icon-browser">
        <Segmented<IconCollection>
          value={collection}
          options={ICON_COLLECTIONS.map((c) => [c, t(`icons.collection.${c}`)])}
          onChange={setCollection}
        />
        <div className="asset-picker-bar">
          <input
            autoFocus
            type="search"
            value={query}
            placeholder={t('icons.search')}
            onChange={(e) => setQuery(e.target.value)}
          />
          {!imageCatalog && (
            <label className="icon-tint" title={t('icons.tint')}>
              <input type="color" value={tint} onChange={(e) => setTint(e.target.value)} />
            </label>
          )}
          <button className={dark ? 'small-btn on' : 'small-btn'} onClick={() => setDark(!dark)}>
            {t('icons.darkBackground')}
          </button>
        </div>
        <div className="icon-browser-body">
          <nav className="icon-tags">
            <button className={tag === null ? 'on' : ''} onClick={() => setTag(null)}>
              {t('icons.allTags')} <span className="muted">{icons.length}</span>
            </button>
            {flat
              ? groups[0].tags.map((x) => tagButton(x, false))
              : groups.map((g) => (
                  <div key={g.label}>
                    <button
                      className="icon-group"
                      onClick={() => setOpen(open === g.label ? null : g.label)}
                    >
                      {open === g.label ? '▾' : '▸'} {groupLabel(g.label)}
                    </button>
                    {open === g.label && g.tags.map((x) => tagButton(x, true))}
                  </div>
                ))}
          </nav>
          <div className="icon-results">
            {!current && !error && <p className="muted">{t('icons.loading')}</p>}
            {current && shown.length === 0 && <p className="muted">{t('assetPicker.noMatch')}</p>}
            <div
              className={dark ? 'asset-grid icon-grid dark' : 'asset-grid icon-grid'}
              style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(76px, 1fr))' }}
            >
              {shown.slice(0, limit).map((i) => (
                <button
                  key={i.key}
                  className={chosen.has(i.key) ? 'asset-tile on' : 'asset-tile'}
                  title={`${i.name} · ${i.author}`}
                  onClick={() => toggle(i)}
                >
                  <span className="asset-thumb icon-thumb">{preview(i, 56)}</span>
                  <span className="asset-name">{i.name}</span>
                </button>
              ))}
            </div>
            {shown.length > limit && (
              <button className="more-btn" onClick={() => setMore({ view, limit: limit + PAGE })}>
                {t('icons.more', { n: shown.length - limit })}
              </button>
            )}
          </div>
        </div>
        {chosen.size > 0 && (
          <div className="icon-chosen">
            <h3>{t('icons.chosen', { n: chosen.size })}</h3>
            {[...chosen].map(([key, { icon, name }]) => {
              const issue = nameIssue(key, name)
              return (
                <div key={key} className="icon-chosen-row">
                  {preview(icon, 22)}
                  <input
                    value={name}
                    title={t('icons.fileName', { folder: collectionFolder(icon.collection) })}
                    onChange={(e) => rename(key, e.target.value.trim())}
                  />
                  <span className="muted small">
                    .{iconExtension(icon.d)} · {icon.author}
                  </span>
                  {issue && (
                    <span className={issue.blocking ? 'field-error' : 'field-warning'}>
                      {issue.text}
                    </span>
                  )}
                  <button
                    className="icon-btn"
                    title={t('icons.remove')}
                    onClick={() => toggle(icon)}
                  >
                    ✕
                  </button>
                </div>
              )
            })}
          </div>
        )}
        {error && <p className="field-error">{t(error)}</p>}
        <div className="dialog-buttons">
          <span className="muted small spacer-right">
            {[
              (gameIconsChosen || collection === 'game-icons') && t('icons.license'),
              (kenneyChosen || collection !== 'game-icons') && t('icons.licenseKenney')
            ]
              .filter(Boolean)
              .join(' ')}
          </span>
          <button onClick={onClose} disabled={busy}>
            {t('dialog.cancel')}
          </button>
          <button className="primary" disabled={!chosen.size || blocked || busy} onClick={run}>
            {t('icons.import', { n: chosen.size })}
          </button>
        </div>
      </div>
    </Dialog>
  )
}
