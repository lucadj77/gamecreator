import { useEffect, useMemo, useState } from 'react'
import type { FontCatalog, FontFamilyEntry, FontVariant } from '../../../shared/library'
import { fuzzyFilter } from '../../../shared/model/fuzzy'
import { messageFromError, type Message } from '../../../shared/messages'
import { Dialog } from '../editor/dialogs'
import { useI18n } from '../i18n/context'
import type { MessageKey } from '../i18n/en'
import { publishAssetsUpdate } from '../render/assets'
import { APP_FONTS, useProjectFonts } from '../render/fonts'
import Segmented from './Segmented'

// Scelta del font con anteprima: i font del progetto e quelli di Google, che si scaricano in
// assets/fonts/. Vedi docs/specifica.md, sezione 10.2.

const SAMPLE_KEY = 'fontPickerSample'
const PAGE = 40
const CATEGORIES = ['serif', 'sans-serif', 'display', 'handwriting', 'monospace'] as const

let catalogPromise: Promise<FontCatalog> | null = null

function loadCatalog(): Promise<FontCatalog> {
  catalogPromise ??= window.api.fontCatalog()
  catalogPromise.catch(() => (catalogPromise = null))
  return catalogPromise
}

/** Fogli di stile già aggiunti per le anteprime dei font Google */
const previewLinks = new Set<string>()

function loadPreview(f: FontFamilyEntry): void {
  if (previewLinks.has(f[0])) return
  previewLinks.add(f[0])
  const weight = f[2].includes(400) ? 400 : f[2][0]
  const link = document.createElement('link')
  link.rel = 'stylesheet'
  link.href = `https://fonts.googleapis.com/css2?family=${f[0].replace(/ /g, '+')}:wght@${weight}&display=swap`
  link.onerror = () => previewLinks.delete(f[0])
  document.head.appendChild(link)
}

function loadSample(fallback: string): string {
  try {
    return localStorage.getItem(SAMPLE_KEY) || fallback
  } catch {
    return fallback
  }
}

/** Varianti proposte: normale e grassetto, più il corsivo se c'è */
function defaultVariants(f: FontFamilyEntry): FontVariant[] {
  const near = (w: number): number =>
    f[2].reduce((a, b) => (Math.abs(b - w) < Math.abs(a - w) ? b : a), f[2][0])
  const weights = [...new Set([near(400), near(700)])]
  const out = weights.map((weight) => ({ weight, italic: false }))
  if (f[3]) out.push({ weight: near(400), italic: true })
  return out
}

const key = (v: FontVariant): string => `${v.weight}${v.italic ? 'i' : ''}`

export default function FontPicker({
  value,
  onPick,
  onClose
}: {
  value: string
  onPick(family: string): void
  onClose(): void
}): React.JSX.Element {
  const { t } = useI18n()
  const project = useProjectFonts()
  const [tab, setTab] = useState<'project' | 'google'>(
    project.families.length ? 'project' : 'google'
  )
  const [sample, setSampleState] = useState(() => loadSample(t('fonts.sample')))
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<string | null>(null)
  const [catalog, setCatalog] = useState<FontCatalog | null>(null)
  /** Pagine mostrate: si torna alla prima quando cambiano ricerca o filtro */
  const [more, setMore] = useState({ view: '', limit: PAGE })
  const [open, setOpen] = useState<FontFamilyEntry | null>(null)
  const [variants, setVariants] = useState<Set<string>>(new Set())
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<Message | null>(null)

  const setSample = (s: string): void => {
    setSampleState(s)
    try {
      localStorage.setItem(SAMPLE_KEY, s)
    } catch {
      // preferenza non essenziale
    }
  }

  useEffect(() => {
    if (tab !== 'google' || catalog) return
    loadCatalog()
      .then(setCatalog)
      .catch((e) => setError(messageFromError(e)))
  }, [tab, catalog])

  const own = useMemo(
    () => new Set([...project.families, ...APP_FONTS].map((f) => f.toLowerCase())),
    [project.families]
  )

  const google = useMemo(() => {
    if (!catalog) return []
    const list = catalog.families.filter((f) => !category || f[1] === category)
    return fuzzyFilter(list, query, (f) => f[0])
  }, [catalog, category, query])

  const view = `${category}|${query}`
  const limit = more.view === view ? more.limit : PAGE
  const visible = google.slice(0, limit)
  useEffect(() => {
    if (tab === 'google' && navigator.onLine) visible.forEach(loadPreview)
  }, [tab, visible])

  const projectFamilies = useMemo(
    () =>
      fuzzyFilter(
        [...new Set([...project.families, ...APP_FONTS])].sort((a, b) => a.localeCompare(b)),
        query,
        (f) => f
      ),
    [project.families, query]
  )

  const choose = (f: FontFamilyEntry): void => {
    if (open?.[0] === f[0]) return setOpen(null)
    setOpen(f)
    setVariants(new Set(defaultVariants(f).map(key)))
    setError(null)
  }

  const toggle = (v: FontVariant): void => {
    const next = new Set(variants)
    if (next.has(key(v))) next.delete(key(v))
    else next.add(key(v))
    setVariants(next)
  }

  const download = async (f: FontFamilyEntry): Promise<void> => {
    setBusy(true)
    setError(null)
    try {
      const list = allVariants(f).filter((v) => variants.has(key(v)))
      publishAssetsUpdate(await window.api.downloadFont(f[0], list))
      onPick(f[0])
      onClose()
    } catch (e) {
      setError(messageFromError(e))
    } finally {
      setBusy(false)
    }
  }

  const preview = (family: string): React.CSSProperties => ({
    fontFamily: `'${family}', ${t('fonts.fallbackFamily')}`
  })

  return (
    <Dialog title={t('fonts.title')} onClose={busy ? () => undefined : onClose}>
      <div className="font-picker">
        <div className="asset-picker-bar">
          <Segmented
            value={tab}
            options={[
              ['project', t('fonts.tabProject')],
              ['google', 'Google Fonts']
            ]}
            onChange={(v) => setTab(v as 'project' | 'google')}
          />
          <input
            autoFocus
            type="search"
            value={query}
            placeholder={t('fonts.search')}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="asset-picker-bar">
          <span className="muted small">{t('fonts.sampleLabel')}</span>
          <input value={sample} onChange={(e) => setSample(e.target.value)} />
        </div>
        {tab === 'google' && (
          <div className="asset-picker-folders">
            <button className={category === null ? 'on' : ''} onClick={() => setCategory(null)}>
              {t('assetPicker.all')}
            </button>
            {CATEGORIES.map((c) => (
              <button key={c} className={category === c ? 'on' : ''} onClick={() => setCategory(c)}>
                {t(`fonts.category.${c}` as MessageKey)}
              </button>
            ))}
          </div>
        )}
        <div className="font-list">
          {tab === 'project' &&
            projectFamilies.map((f) => (
              <button
                key={f}
                className={
                  f.toLowerCase() === value.trim().toLowerCase() ? 'font-row on' : 'font-row'
                }
                onClick={() => {
                  onPick(f)
                  onClose()
                }}
              >
                <span className="font-row-head">
                  <b>{f}</b>
                  <span className="muted small">
                    {APP_FONTS.includes(f) && !project.families.includes(f)
                      ? t('fonts.inApp')
                      : t('fonts.inProject')}
                  </span>
                </span>
                <span className="font-sample" style={preview(f)}>
                  {sample}
                </span>
              </button>
            ))}
          {tab === 'project' && projectFamilies.length === 0 && (
            <p className="muted">{t('fonts.noProjectFonts')}</p>
          )}
          {tab === 'google' && !catalog && !error && <p className="muted">{t('icons.loading')}</p>}
          {tab === 'google' && catalog && !navigator.onLine && (
            <p className="field-warning">{t('fonts.offline')}</p>
          )}
          {tab === 'google' &&
            visible.map((f) => (
              <div key={f[0]} className={open?.[0] === f[0] ? 'font-row open' : 'font-row'}>
                <button className="font-row-main" onClick={() => choose(f)}>
                  <span className="font-row-head">
                    <b>{f[0]}</b>
                    <span className="muted small">
                      {t(`fonts.category.${f[1]}` as MessageKey)} ·{' '}
                      {styleCount(f) === 1
                        ? t('fonts.oneStyle')
                        : t('fonts.styles', { n: styleCount(f) })}
                      {own.has(f[0].toLowerCase()) && ` · ${t('fonts.inProject')}`}
                    </span>
                  </span>
                  <span className="font-sample" style={preview(f[0])}>
                    {sample}
                  </span>
                </button>
                {open?.[0] === f[0] && (
                  <div className="font-variants">
                    <div className="font-variant-list">
                      {allVariants(f).map((v) => (
                        <label key={key(v)}>
                          <input
                            type="checkbox"
                            checked={variants.has(key(v))}
                            onChange={() => toggle(v)}
                          />
                          {v.weight}
                          {v.italic ? ` ${t('fonts.italic')}` : ''}
                        </label>
                      ))}
                    </div>
                    <span className="muted small">
                      {t('fonts.licenseNote', { license: f[5] || '?' })}
                    </span>
                    <button
                      className="primary"
                      disabled={!variants.size || busy}
                      onClick={() => download(f)}
                    >
                      {busy ? t('fonts.downloading') : t('fonts.download', { n: variants.size })}
                    </button>
                  </div>
                )}
              </div>
            ))}
          {tab === 'google' && google.length > limit && (
            <button className="more-btn" onClick={() => setMore({ view, limit: limit + PAGE })}>
              {t('icons.more', { n: google.length - limit })}
            </button>
          )}
          {tab === 'google' && catalog && google.length === 0 && (
            <p className="muted">{t('fonts.noMatch')}</p>
          )}
        </div>
        {error && <p className="field-error">{t(error)}</p>}
        <div className="dialog-buttons">
          <span className="muted small spacer-right">
            {tab === 'google' ? t('fonts.googleNote') : t('fonts.projectNote')}
          </span>
          <button onClick={onClose} disabled={busy}>
            {t('dialog.cancel')}
          </button>
        </div>
      </div>
    </Dialog>
  )
}

const styleCount = (f: FontFamilyEntry): number => f[2].length * (f[3] ? 2 : 1)

function allVariants(f: FontFamilyEntry): FontVariant[] {
  const out = f[2].map((weight) => ({ weight, italic: false }))
  if (f[3]) out.push(...f[2].map((weight) => ({ weight, italic: true })))
  return out
}
