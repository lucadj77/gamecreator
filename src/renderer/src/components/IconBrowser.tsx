import { useContext, useEffect, useMemo, useState } from 'react'
import type { IconCatalog, IconImport } from '../../../shared/library'
import { ICONS_FOLDER, isValidAssetName } from '../../../shared/library'
import { resolveAsset } from '../../../shared/model/assets'
import { fuzzyScore } from '../../../shared/model/fuzzy'
import { messageFromError, type Message } from '../../../shared/messages'
import { Dialog } from '../editor/dialogs'
import { useI18n } from '../i18n/context'
import { ICON_GROUPS_IT, ICON_TAG_WORDS_IT, ICON_TAGS_IT } from '../i18n/iconTags'
import { AssetsContext, publishAssetsUpdate } from '../render/assets'

// Finestra di importazione delle icone di game-icons.net: categorie a sinistra, ricerca
// approssimata, anteprima con la tinta scelta. Vedi docs/specifica.md, sezione 10.1.

const PAGE = 240
const TINT_KEY = 'iconBrowserTint'

let catalogPromise: Promise<IconCatalog> | null = null

function loadCatalog(): Promise<IconCatalog> {
  catalogPromise ??= window.api.iconCatalog()
  catalogPromise.catch(() => (catalogPromise = null))
  return catalogPromise
}

interface Icon {
  id: string
  name: string
  author: string
  d: string
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
  const [catalog, setCatalog] = useState<IconCatalog | null>(null)
  const [error, setError] = useState<Message | null>(null)
  const [query, setQuery] = useState('')
  const [tag, setTag] = useState<string | null>(null)
  const [open, setOpen] = useState<string | null>(null)
  /** Pagine mostrate: si torna alla prima quando cambiano ricerca o filtro */
  const [more, setMore] = useState({ view: '', limit: PAGE })
  const [tint, setTintState] = useState(loadTint)
  const [dark, setDark] = useState(false)
  /** id → nome del file scelto */
  const [chosen, setChosen] = useState<Map<string, string>>(new Map())
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    loadCatalog()
      .then(setCatalog)
      .catch((e) => setError(messageFromError(e)))
  }, [])

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

  const icons = useMemo<Icon[]>(() => {
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
      const authorName = catalog.authors[author]?.name ?? author
      return {
        id,
        name,
        author: authorName,
        d,
        tags,
        search: `${name} ${authorName} ${tags.map((s) => labels.get(s) ?? s).join(' ')}`
      }
    })
  }, [catalog])

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

  const view = `${tag}|${query}`
  const limit = more.view === view ? more.limit : PAGE
  const toggle = (icon: Icon): void => {
    const next = new Map(chosen)
    if (next.has(icon.id)) next.delete(icon.id)
    else next.set(icon.id, icon.name)
    setChosen(next)
  }

  const rename = (id: string, name: string): void => setChosen(new Map(chosen).set(id, name))

  /** Problema del nome scelto per un'icona, o null */
  const nameIssue = (id: string, name: string): { text: string; blocking: boolean } | null => {
    if (!isValidAssetName(name)) return { text: t('icons.badName'), blocking: true }
    const dup = [...chosen].some(([other, n]) => other !== id && n === name)
    if (dup) return { text: t('icons.duplicateName'), blocking: true }
    const path = `${ICONS_FOLDER}/${name}.svg`
    if (assets.includes(path)) return { text: t('icons.replaces'), blocking: false }
    const r = resolveAsset(name, assets)
    if (r.ok || r.reason === 'ambiguous')
      return {
        text: t('icons.ambiguous', { files: r.ok ? r.path : r.candidates.join(', ') }),
        blocking: false
      }
    return null
  }

  const blocked = [...chosen].some(([id, n]) => nameIssue(id, n)?.blocking)

  const run = async (): Promise<void> => {
    setBusy(true)
    setError(null)
    try {
      const items: IconImport[] = [...chosen].map(([id, name]) => ({ id, name }))
      const update = await window.api.importIcons(items)
      publishAssetsUpdate(update)
      onImported?.(items.map((i) => i.name))
      onClose()
    } catch (e) {
      setError(messageFromError(e))
    } finally {
      setBusy(false)
    }
  }

  const byId = useMemo(() => new Map(icons.map((i) => [i.id, i])), [icons])
  const author = (id: string): string => byId.get(id)?.author ?? ''

  return (
    <Dialog title={t('icons.title')} onClose={busy ? () => undefined : onClose}>
      <div className="icon-browser">
        <div className="asset-picker-bar">
          <input
            autoFocus
            type="search"
            value={query}
            placeholder={t('icons.search')}
            onChange={(e) => setQuery(e.target.value)}
          />
          <label className="icon-tint" title={t('icons.tint')}>
            <input type="color" value={tint} onChange={(e) => setTint(e.target.value)} />
          </label>
          <button className={dark ? 'small-btn on' : 'small-btn'} onClick={() => setDark(!dark)}>
            {t('icons.darkBackground')}
          </button>
        </div>
        <div className="icon-browser-body">
          <nav className="icon-tags">
            <button className={tag === null ? 'on' : ''} onClick={() => setTag(null)}>
              {t('icons.allTags')} <span className="muted">{icons.length}</span>
            </button>
            {catalog?.tags.groups.map((g) => (
              <div key={g.label}>
                <button
                  className="icon-group"
                  onClick={() => setOpen(open === g.label ? null : g.label)}
                >
                  {open === g.label ? '▾' : '▸'} {groupLabel(g.label)}
                </button>
                {open === g.label &&
                  g.tags.map((x) => (
                    <button
                      key={x.slug}
                      className={tag === x.slug ? 'on sub' : 'sub'}
                      onClick={() => setTag(x.slug)}
                    >
                      {tagLabel(x.slug, x.label)}{' '}
                      <span className="muted">{counts.get(x.slug) ?? 0}</span>
                    </button>
                  ))}
              </div>
            ))}
          </nav>
          <div className="icon-results">
            {!catalog && !error && <p className="muted">{t('icons.loading')}</p>}
            {catalog && shown.length === 0 && <p className="muted">{t('assetPicker.noMatch')}</p>}
            <div
              className={dark ? 'asset-grid icon-grid dark' : 'asset-grid icon-grid'}
              style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(76px, 1fr))' }}
            >
              {shown.slice(0, limit).map((i) => (
                <button
                  key={i.id}
                  className={chosen.has(i.id) ? 'asset-tile on' : 'asset-tile'}
                  title={`${i.name} · ${i.author}`}
                  onClick={() => toggle(i)}
                >
                  <span className="asset-thumb icon-thumb">
                    <svg viewBox="0 0 512 512" width="56" height="56" aria-hidden="true">
                      <path d={i.d} fill={tint} />
                    </svg>
                  </span>
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
            {[...chosen].map(([id, name]) => {
              const issue = nameIssue(id, name)
              return (
                <div key={id} className="icon-chosen-row">
                  <svg viewBox="0 0 512 512" width="22" height="22" aria-hidden="true">
                    <path d={byId.get(id)?.d} fill={tint} />
                  </svg>
                  <input
                    value={name}
                    title={t('icons.fileName')}
                    onChange={(e) => rename(id, e.target.value.trim())}
                  />
                  <span className="muted small">.svg · {author(id)}</span>
                  {issue && (
                    <span className={issue.blocking ? 'field-error' : 'field-warning'}>
                      {issue.text}
                    </span>
                  )}
                  <button
                    className="icon-btn"
                    title={t('icons.remove')}
                    onClick={() => toggle(byId.get(id)!)}
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
          <span className="muted small spacer-right">{t('icons.license')}</span>
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
