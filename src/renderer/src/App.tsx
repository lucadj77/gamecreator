import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { LoadedProject, LoadedSet } from '../../shared/project'
import { messageFromError, type Message } from '../../shared/messages'
import { bindCard, rowToCard, type BoundCard } from '../../shared/model/bind'
import type { Side, Template } from '../../shared/model/template'
import { normalizeTemplate } from '../../shared/model/normalize'
import DataTable from './components/DataTable'
import Segmented from './components/Segmented'
import Resizer from './components/Resizer'
import { usePanelWidth } from './components/usePanelWidth'
import TemplateEditor from './editor/TemplateEditor'
import { NewTemplateDialog } from './editor/dialogs'
import CardGrid from './components/CardGrid'
import CardSvg from './render/CardSvg'
import { AssetsContext } from './render/assets'
import { LANGUAGES, useI18n, type Language } from './i18n/context'

const LAST_FOLDER_KEY = 'lastProjectFolder'
const VIEW_KEY = 'setView'

type View = 'table' | 'grid'
type Selected = { kind: 'set'; index: number } | { kind: 'template'; name: string }

function App(): React.JSX.Element {
  const { t, lang, setLang } = useI18n()
  const [project, setProject] = useState<LoadedProject | null>(null)
  const [selected, setSelected] = useState<Selected>({ kind: 'set', index: 0 })
  const [error, setError] = useState<Message | null>(null)
  const [loading, setLoading] = useState(false)
  /** Template modificati e non ancora salvati */
  const [dirty, setDirty] = useState<Set<string>>(new Set())
  const [creating, setCreating] = useState(false)
  const [sidebarWidth, setSidebarWidth] = usePanelWidth('sidebar', 220)

  const load = useCallback(async (folder: string) => {
    setLoading(true)
    setError(null)
    try {
      const loaded = await window.api.loadProject(folder)
      setProject(loaded)
      setDirty(new Set())
      setSelected((s) =>
        s.kind === 'set'
          ? { kind: 'set', index: s.index < loaded.sets.length ? s.index : 0 }
          : loaded.templates.some((tpl) => tpl.name === s.name)
            ? s
            : { kind: 'set', index: 0 }
      )
      localStorage.setItem(LAST_FOLDER_KEY, folder)
    } catch (e) {
      setError(messageFromError(e))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const last = localStorage.getItem(LAST_FOLDER_KEY)
    // ripristino una tantum dell'ultimo progetto aperto
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (last) load(last)
  }, [load])

  /** Chiede conferma prima di perdere modifiche non salvate */
  const discardOk = (): boolean => dirty.size === 0 || window.confirm(t('app.discardChanges'))

  const open = async (): Promise<void> => {
    if (!discardOk()) return
    const folder = await window.api.chooseProjectFolder()
    if (folder) load(folder)
  }

  const updateTemplate = useCallback((tpl: Template) => {
    setProject(
      (p) => p && { ...p, templates: p.templates.map((x) => (x.name === tpl.name ? tpl : x)) }
    )
    setDirty((d) => (d.has(tpl.name) ? d : new Set(d).add(tpl.name)))
  }, [])

  const saveTemplate = useCallback(async (tpl: Template) => {
    setError(null)
    try {
      await window.api.saveTemplate(tpl)
      setDirty((d) => {
        const next = new Set(d)
        next.delete(tpl.name)
        return next
      })
    } catch (e) {
      setError(messageFromError(e))
    }
  }, [])

  const createTemplate = (name: string, width: number, height: number): void => {
    const tpl = normalizeTemplate({
      name,
      width,
      height,
      front: [
        {
          type: 'shape',
          name: 'background',
          x: -3,
          y: -3,
          w: width + 6,
          h: height + 6,
          fill: '#FFFFFF',
          locked: true
        }
      ],
      back: [
        {
          type: 'shape',
          name: 'back_background',
          x: -3,
          y: -3,
          w: width + 6,
          h: height + 6,
          fill: '#5E4421',
          locked: true
        }
      ]
    })
    setProject((p) => p && { ...p, templates: [...p.templates, tpl] })
    setDirty((d) => new Set(d).add(name))
    setSelected({ kind: 'template', name })
    setCreating(false)
  }

  const current = selected.kind === 'set' ? project?.sets[selected.index] : undefined
  const editing =
    selected.kind === 'template'
      ? project?.templates.find((x) => x.name === selected.name)
      : undefined

  return (
    <AssetsContext.Provider value={project?.assets ?? []}>
      <div className="app">
        <header className="toolbar">
          <button onClick={open}>{t('app.openProject')}</button>
          {project && (
            <>
              <button onClick={() => discardOk() && load(project.folder)}>{t('app.reload')}</button>
              <span className="project-name">{project.file.name}</span>
              <span className="project-path">{project.folder}</span>
            </>
          )}
          {loading && <span className="muted">{t('app.loading')}</span>}
          <span className="spacer" />
          <label className="muted">
            {t('app.language')}{' '}
            <select value={lang} onChange={(e) => setLang(e.target.value as Language)}>
              {Object.entries(LANGUAGES).map(([code, name]) => (
                <option key={code} value={code}>
                  {name}
                </option>
              ))}
            </select>
          </label>
        </header>

        {error && <div className="banner error">{t(error)}</div>}
        {project?.warnings.map((w, i) => (
          <div key={i} className="banner warning">
            {t(w)}
          </div>
        ))}

        {project ? (
          <main className="workspace">
            <nav className="sidebar" style={{ width: sidebarWidth }}>
              <h2>{t('sidebar.sets')}</h2>
              <ul>
                {project.sets.map((s, i) => (
                  <li key={s.name}>
                    <button
                      className={selected.kind === 'set' && i === selected.index ? 'active' : ''}
                      onClick={() => setSelected({ kind: 'set', index: i })}
                    >
                      <span>{s.name}</span>
                      <span className="muted">{s.data ? countCards(s.data) : '–'}</span>
                    </button>
                  </li>
                ))}
              </ul>
              <h2 className="with-action">
                {t('sidebar.templates')}
                <button
                  className="icon-btn"
                  title={t('sidebar.newTemplate')}
                  onClick={() => setCreating(true)}
                >
                  +
                </button>
              </h2>
              <ul>
                {project.templates.map((tpl) => (
                  <li key={tpl.name}>
                    <button
                      className={
                        selected.kind === 'template' && selected.name === tpl.name ? 'active' : ''
                      }
                      onClick={() => setSelected({ kind: 'template', name: tpl.name })}
                    >
                      <span>
                        {tpl.name}
                        {dirty.has(tpl.name) && (
                          <span className="dirty-dot" title={t('app.unsaved')} />
                        )}
                      </span>
                      <span className="muted">
                        {tpl.width}×{tpl.height}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
              {project.unusedSheets.length > 0 && (
                <p className="muted small">
                  {t('sidebar.unusedSheets', { names: project.unusedSheets.join(', ') })}
                </p>
              )}
            </nav>
            <Resizer width={sidebarWidth} onChange={setSidebarWidth} edge="left" max={400} />
            {editing ? (
              <TemplateEditor
                key={editing.name}
                template={editing}
                sets={project.sets.filter((s) => s.template === editing.name)}
                dirty={dirty.has(editing.name)}
                onChange={updateTemplate}
                onSave={saveTemplate}
              />
            ) : current ? (
              <SetView key={current.name} set={current} templates={project.templates} />
            ) : (
              <section className="content" />
            )}
          </main>
        ) : (
          !error && (
            <div className="empty">
              <p>{t('app.empty')}</p>
            </div>
          )
        )}
        {creating && project && (
          <NewTemplateDialog
            existing={project.templates.map((x) => x.file ?? x.name)}
            onCreate={createTemplate}
            onClose={() => setCreating(false)}
          />
        )}
      </div>
    </AssetsContext.Provider>
  )
}

function SetView({ set, templates }: { set: LoadedSet; templates: Template[] }): React.JSX.Element {
  const { t } = useI18n()
  const [selected, setSelected] = useState(0)
  const [side, setSide] = useState<Side>('front')
  const [previewWidth, setPreviewWidth] = usePanelWidth('preview', 320)
  // dimensione delle miniature: pixel per millimetro
  const [thumb, setThumb] = usePanelWidth('thumbScale', 2.6)
  const contentRef = useRef<HTMLElement>(null)
  const thumbRef = useRef(thumb)
  useEffect(() => {
    thumbRef.current = thumb
  }, [thumb])
  useEffect(() => {
    const el = contentRef.current
    if (!el) return
    // Cmd/Ctrl + rotella o pizzico sul trackpad ingrandiscono le miniature
    const onWheel = (e: WheelEvent): void => {
      if (!e.ctrlKey && !e.metaKey) return
      e.preventDefault()
      const d = Math.sign(e.deltaY) * Math.min(Math.abs(e.deltaY), 50)
      setThumb(clampThumb(thumbRef.current * Math.exp(-d * 0.004)))
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  })
  const [view, setViewState] = useState<View>(() =>
    localStorage.getItem(VIEW_KEY) === 'grid' ? 'grid' : 'table'
  )
  const setView = (v: View): void => {
    localStorage.setItem(VIEW_KEY, v)
    setViewState(v)
  }

  const template = templates.find((tpl) => tpl.name === set.template) ?? null
  const cards = useMemo<BoundCard[]>(() => {
    if (!template || !set.data) return []
    const { headers, rows } = set.data
    return rows.map((row) => bindCard(template, rowToCard(headers, row)))
  }, [template, set.data])

  if (!set.data) {
    return (
      <section className="content">
        <p className="muted">{t('set.noData')}</p>
      </section>
    )
  }
  const card = cards[selected]

  return (
    <>
      <section className="content" ref={contentRef}>
        <div className="set-header">
          <h1>{set.name}</h1>
          <span className="muted">
            {t('set.template', { name: set.template })} ·{' '}
            {t('set.counts', { rows: set.data.rows.length, cards: countCards(set.data) })}
          </span>
          <span className="spacer" />
          {view === 'grid' && (
            <input
              type="range"
              className="thumb-size"
              min={THUMB_MIN}
              max={THUMB_MAX}
              step={0.1}
              value={thumb}
              title={t('set.thumbSize')}
              onChange={(e) => setThumb(Number(e.target.value))}
            />
          )}
          <Segmented<View>
            value={view}
            options={[
              ['table', t('set.table')],
              ['grid', t('set.grid')]
            ]}
            onChange={setView}
          />
        </div>
        {view === 'table' || !template ? (
          <DataTable sheet={set.data} selected={selected} onSelect={setSelected} />
        ) : (
          <CardGrid
            cards={cards}
            side={side}
            selected={selected}
            onSelect={setSelected}
            scale={thumb}
          />
        )}
      </section>
      <Resizer width={previewWidth} onChange={setPreviewWidth} edge="right" min={240} max={640} />
      <aside className="preview" style={{ width: previewWidth }}>
        <div className="preview-header">
          <h2>{t('preview.title')}</h2>
          <Segmented<Side>
            value={side}
            options={[
              ['front', t('preview.front')],
              ['back', t('preview.back')]
            ]}
            onChange={setSide}
          />
        </div>
        {!template ? (
          <p className="muted">{t('preview.noTemplate', { name: set.template })}</p>
        ) : card ? (
          <>
            <div className="preview-card">
              <CardSvg template={card.template} side={side} scale={4.4} />
            </div>
            {card.problems.length > 0 && (
              <div className="problems">
                <h3>{t('preview.problems')}</h3>
                <ul>
                  {card.problems.map((p, i) => (
                    <li key={i}>{t(p)}</li>
                  ))}
                </ul>
              </div>
            )}
          </>
        ) : (
          <p className="muted">{t('preview.selectRow')}</p>
        )}
      </aside>
    </>
  )
}

const THUMB_MIN = 1.2
const THUMB_MAX = 8

function clampThumb(v: number): number {
  return Math.min(THUMB_MAX, Math.max(THUMB_MIN, v))
}

/** Numero di carte del set, sommando la colonna amount quando presente */
function countCards(sheet: { headers: string[]; rows: string[][] }): number {
  const col = sheet.headers.indexOf('amount')
  if (col < 0) return sheet.rows.length
  return sheet.rows.reduce((sum, r) => {
    const n = parseInt(r[col], 10)
    return sum + (Number.isFinite(n) && n >= 0 ? n : 1)
  }, 0)
}

export default App
