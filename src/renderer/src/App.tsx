import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { LoadedProject, LoadedSet, ProjectFile, Sheet } from '../../shared/project'
import { messageFromError, type Message } from '../../shared/messages'
import { bindCard, rowToCard, type BoundCard } from '../../shared/model/bind'
import type { Layer, Side, Template } from '../../shared/model/template'
import {
  addColumn,
  duplicateRows,
  insertRow,
  isValidSheetName,
  moveRow,
  newSheet,
  removeRows
} from '../../shared/model/sheet'
import { hitTest, toLocal } from '../../shared/model/geometry'
import {
  denormalizeTemplate,
  isValidTemplateName,
  normalizeTemplate
} from '../../shared/model/normalize'
import DataTable from './components/DataTable'
import Segmented from './components/Segmented'
import Resizer from './components/Resizer'
import { usePanelSide, usePanelWidth } from './components/usePanelWidth'
import PanelSideButton from './components/PanelSideButton'
import TemplateEditor from './editor/TemplateEditor'
import { NewTemplateDialog } from './editor/dialogs'
import CardGrid from './components/CardGrid'
import CardForm from './components/CardForm'
import { AddColumnDialog, DuplicateDialog, NewSetDialog } from './components/setDialogs'
import CardSvg from './render/CardSvg'
import {
  AssetsContext,
  SaveStyleContext,
  StylesContext,
  VariablesContext,
  useBindContext
} from './render/assets'
import VariableDialog, { VariableSwatch } from './components/VariableDialog'
import type { Variable, Variables } from '../../shared/model/variables'
import FormatDialog from './components/FormatDialog'
import ExportDialog from './export/ExportDialog'
import Tooltip from './components/Tooltip'
import { BUILTIN_STYLES, parseAttrs, serializeAttrs } from '../../shared/model/markup'
import { LANGUAGES, useI18n, type Language } from './i18n/context'
import { THEMES, applyTheme, loadTheme } from './theme/theme'
import type { Theme } from '../../shared/api'

const NO_STYLES: Record<string, string> = {}
const NO_VARIABLES: Variables = {}
const LAST_FOLDER_KEY = 'lastProjectFolder'
const VIEW_KEY = 'setView'
const UI_ZOOM_KEY = 'uiZoom'
const UI_ZOOMS = [0.8, 0.9, 1, 1.1, 1.25, 1.4, 1.6]

function loadUiZoom(): number {
  try {
    const z = Number(localStorage.getItem(UI_ZOOM_KEY))
    return UI_ZOOMS.includes(z) ? z : 1
  } catch {
    return 1
  }
}

type View = 'table' | 'grid'
/** Stato dei dati per annulla/ripristina */
type DataSnapshot = { sets: LoadedSet[]; file: ProjectFile }
const COALESCE_MS = 1200
type Selected = { kind: 'set'; index: number } | { kind: 'template'; name: string }

function App(): React.JSX.Element {
  const { t, lang, setLang } = useI18n()
  // dimensione dell'interfaccia: ingrandisce testi e controlli insieme, come ⌘+ nel browser
  const [uiZoom, setUiZoom] = useState(loadUiZoom)
  useEffect(() => window.api.setUiZoom(uiZoom), [uiZoom])
  const changeUiZoom = (z: number): void => {
    setUiZoom(z)
    try {
      localStorage.setItem(UI_ZOOM_KEY, String(z))
    } catch {
      // preferenza non essenziale
    }
  }
  const [theme, setTheme] = useState(loadTheme)
  const changeTheme = (th: Theme): void => {
    setTheme(th)
    applyTheme(th)
  }
  const [project, setProject] = useState<LoadedProject | null>(null)
  const [selected, setSelected] = useState<Selected>({ kind: 'set', index: 0 })
  const [error, setError] = useState<Message | null>(null)
  const [loading, setLoading] = useState(false)
  /** Template modificati e non ancora salvati */
  const [dirty, setDirty] = useState<Set<string>>(new Set())
  const [creating, setCreating] = useState(false)
  /** Stile aperto nell'editor: '' per uno nuovo */
  const [editingStyle, setEditingStyle] = useState<string | null>(null)
  /** Variabile aperta nell'editor: '' per una nuova */
  const [editingVariable, setEditingVariable] = useState<string | null>(null)
  const [creatingSet, setCreatingSet] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [duplicating, setDuplicating] = useState<Selected | null>(null)
  /** Fogli modificati e non ancora salvati, per nome del foglio */
  const [dirtySheets, setDirtySheets] = useState<Set<string>>(new Set())
  /** gamecreator.json da riscrivere (set nuovi) */
  const [fileDirty, setFileDirty] = useState(false)
  const [history, setHistory] = useState<{
    past: DataSnapshot[]
    future: DataSnapshot[]
    key?: string
    at: number
  }>({ past: [], future: [], at: 0 })
  const [saving, setSaving] = useState(false)
  const anyDirty = dirty.size > 0 || dirtySheets.size > 0 || fileDirty
  const [sidebarWidth, setSidebarWidth] = usePanelWidth('sidebar', 220)
  const [sidebarSide, toggleSidebarSide] = usePanelSide('sidebar', 'left')

  const load = useCallback(async (folder: string) => {
    setLoading(true)
    setError(null)
    try {
      const loaded = await window.api.loadProject(folder)
      setProject(loaded)
      setDirty(new Set())
      setDirtySheets(new Set())
      setFileDirty(false)
      setHistory({ past: [], future: [], at: 0 })
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
  const discardOk = (): boolean => !anyDirty || window.confirm(t('app.discardChanges'))

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

  /** Modifica del foglio di un set; le modifiche ravvicinate con la stessa chiave si annullano insieme */
  const updateSheet = (index: number, sheet: Sheet, key?: string): void => {
    if (!project) return
    const now = Date.now()
    const coalesce = key !== undefined && key === history.key && now - history.at < COALESCE_MS
    setHistory((h) => ({
      past: coalesce ? h.past : [...h.past.slice(-99), { sets: project.sets, file: project.file }],
      future: [],
      key,
      at: now
    }))
    // aggiornamento funzionale: nello stesso evento può cambiare anche altro (per esempio uno stile)
    setProject(
      (p) => p && { ...p, sets: p.sets.map((x, i) => (i === index ? { ...x, data: sheet } : x)) }
    )
    setDirtySheets((d) => (d.has(sheet.name) ? d : new Set(d).add(sheet.name)))
  }

  const undoData = (redo: boolean): void => {
    if (!project) return
    const from = redo ? history.future : history.past
    const snap = from[from.length - 1]
    if (!snap) return
    const current = { sets: project.sets, file: project.file }
    setHistory((h) =>
      redo
        ? { past: [...h.past, current], future: h.future.slice(0, -1), at: 0 }
        : { past: h.past.slice(0, -1), future: [...h.future, current], at: 0 }
    )
    setProject({ ...project, ...snap })
    // ciò che cambia tornando indietro va comunque salvato
    setDirtySheets((d) => {
      const next = new Set(d)
      for (const x of [...snap.sets, ...project.sets]) {
        const before = project.sets.find((y) => y.name === x.name)?.data
        const after = snap.sets.find((y) => y.name === x.name)?.data
        if (x.data && before !== after) next.add(x.data.name)
      }
      return next
    })
    if (snap.file !== project.file) setFileDirty(true)
  }

  /** Salva template, fogli e progetto modificati */
  /** Crea, modifica, rinomina (con `oldName`) o elimina (def null) uno stile del progetto */
  const saveStyle = useCallback((name: string, def: string | null, oldName?: string): void => {
    setProject((p) => {
      if (!p) return p
      const styles = { ...p.file.styles }
      if (oldName && oldName !== name) delete styles[oldName]
      if (def === null) delete styles[name]
      else styles[name] = def
      setHistory((h) => ({
        past: [...h.past.slice(-99), { sets: p.sets, file: p.file }],
        future: [],
        at: 0
      }))
      return { ...p, file: { ...p.file, styles } }
    })
    setFileDirty(true)
  }, [])

  /** Crea, modifica, rinomina (con `oldName`) o elimina (v null) una variabile del progetto */
  const saveVariable = (name: string, v: Variable | null, oldName?: string): void => {
    setProject((p) => {
      if (!p) return p
      const variables = { ...p.file.variables }
      if (oldName && oldName !== name) delete variables[oldName]
      if (v === null) delete variables[name]
      else variables[name] = v
      setHistory((h) => ({
        past: [...h.past.slice(-99), { sets: p.sets, file: p.file }],
        future: [],
        at: 0
      }))
      return { ...p, file: { ...p.file, variables } }
    })
    setFileDirty(true)
  }

  const saveAll = async (): Promise<void> => {
    if (!project || saving) return
    setError(null)
    setSaving(true)
    try {
      for (const name of dirty) {
        const tpl = project.templates.find((x) => x.name === name)
        if (tpl) await window.api.saveTemplate(tpl)
      }
      setDirty(new Set())
      const sheets = project.sets
        .map((x) => x.data)
        .filter((d): d is Sheet => !!d && dirtySheets.has(d.name))
      if (sheets.length || fileDirty)
        await window.api.saveData({ file: fileDirty ? project.file : undefined, sheets })
      setDirtySheets(new Set())
      setFileDirty(false)
    } catch (e) {
      setError(messageFromError(e))
    } finally {
      setSaving(false)
    }
  }

  const createSet = (name: string, template: string, sheetName: string | null): void => {
    if (!project) return
    if (project.file.dataFile.toLowerCase().endsWith('.csv')) {
      setError({ key: 'save.csvOneSheet' })
      setCreatingSet(false)
      return
    }
    const tpl = project.templates.find((x) => x.name === template) ?? null
    // un foglio non collegato si riprende dal file con le sue righe; si rilegge al salvataggio
    const data: Sheet = sheetName
      ? (project.unusedData?.find((x) => x.name === sheetName) ?? newSheet(sheetName, tpl))
      : newSheet(name, tpl)
    const def = { name, template, ...(data.name !== name ? { sheet: data.name } : {}) }
    setHistory((h) => ({
      past: [...h.past, { sets: project.sets, file: project.file }],
      future: [],
      at: 0
    }))
    setProject({
      ...project,
      file: { ...project.file, sets: [...project.file.sets, def] },
      sets: [...project.sets, { ...def, data }],
      unusedSheets: project.unusedSheets.filter((x) => x !== data.name)
    })
    if (!sheetName) setDirtySheets((d) => new Set(d).add(data.name))
    setFileDirty(true)
    setSelected({ kind: 'set', index: project.sets.length })
    setCreatingSet(false)
  }

  /** Nome libero per una copia: "Nome copia", "Nome copia 2", ... */
  const copyName = (base: string, taken: string[]): string => {
    const stem = `${base} ${t('duplicate.suffix')}`
    let name = stem
    for (let n = 2; taken.includes(name); n++) name = `${stem} ${n}`
    return name
  }
  const setNames = (): string[] =>
    project
      ? [
          ...project.sets.map((x) => x.name),
          ...project.sets.flatMap((x) => (x.data ? [x.data.name] : [])),
          ...project.unusedSheets
        ]
      : []
  const templateNames = (): string[] =>
    project ? project.templates.flatMap((x) => [x.name, x.file ?? x.name]) : []

  const duplicateSet = (index: number, name: string): void => {
    if (!project) return
    const src = project.sets[index]
    if (project.file.dataFile.toLowerCase().endsWith('.csv')) {
      setError({ key: 'save.csvOneSheet' })
      return
    }
    const data: Sheet = src.data
      ? { ...src.data, name, rows: src.data.rows.map((r) => [...r]) }
      : { name, headers: ['amount'], rows: [] }
    const def = { name, template: src.template }
    setHistory((h) => ({
      past: [...h.past, { sets: project.sets, file: project.file }],
      future: [],
      at: 0
    }))
    const at = index + 1
    const sets = [...project.sets]
    sets.splice(at, 0, { ...def, data })
    const defs = [...project.file.sets]
    defs.splice(at, 0, def)
    setProject({ ...project, sets, file: { ...project.file, sets: defs } })
    setDirtySheets((d) => new Set(d).add(name))
    setFileDirty(true)
    setSelected({ kind: 'set', index: at })
  }

  const duplicateTemplate = (from: string, name: string): void => {
    const src = project?.templates.find((x) => x.name === from)
    if (!src) return
    // i livelli ricevono id nuovi rileggendo il template come da file
    const copy = normalizeTemplate({ ...denormalizeTemplate(src), name })
    setProject((p) => p && { ...p, templates: [...p.templates, copy] })
    setDirty((d) => new Set(d).add(name))
    setSelected({ kind: 'template', name })
  }

  // ⌘S salva tutto ovunque; ⌘Z nei set annulla le modifiche ai dati (nell'editor vale l'editor)
  const onKey = (e: KeyboardEvent): void => {
    const mod = e.metaKey || e.ctrlKey
    if (!mod) return
    const k = e.key.toLowerCase()
    if (k === 's') {
      e.preventDefault()
      saveAll()
      return
    }
    if (selected.kind !== 'set') return
    const target = e.target as HTMLElement
    if (target.closest('input, textarea, select, [role="dialog"]')) return
    if (k === 'z') undoData(e.shiftKey)
    else if (k === 'y') undoData(true)
    else return
    e.preventDefault()
  }
  useEffect(() => {
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

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

  // la barra laterale sta a sinistra o a destra, a scelta
  const allStyles = { ...BUILTIN_STYLES, ...project?.file.styles }
  const styleList = Object.keys(allStyles).sort()
  const variables = project?.file.variables ?? NO_VARIABLES
  const variableList = Object.entries(variables).sort(([a], [b]) => a.localeCompare(b))
  const sidebar = project && (
    <nav className="sidebar" data-side={sidebarSide} style={{ width: sidebarWidth }}>
      <h2 className="with-action">
        {t('sidebar.sets')}
        <PanelSideButton side={sidebarSide} onToggle={toggleSidebarSide} />
        <button
          className="icon-btn"
          title={t('sidebar.newSet')}
          onClick={() => setCreatingSet(true)}
        >
          +
        </button>
      </h2>
      <ul>
        {project.sets.map((s, i) => (
          <li key={s.name}>
            <button
              className={selected.kind === 'set' && i === selected.index ? 'active' : ''}
              onClick={() => setSelected({ kind: 'set', index: i })}
              title={t('tip.openSet')}
            >
              <span>
                {s.name}
                {s.data && dirtySheets.has(s.data.name) && (
                  <span className="dirty-dot" title={t('app.unsaved')} />
                )}
              </span>
              <span className="muted">{s.data ? countCards(s.data) : '–'}</span>
            </button>
            <button
              className="icon-btn item-dup"
              title={t('sidebar.duplicate')}
              onClick={() => setDuplicating({ kind: 'set', index: i })}
            >
              ⧉
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
              className={selected.kind === 'template' && selected.name === tpl.name ? 'active' : ''}
              onClick={() => setSelected({ kind: 'template', name: tpl.name })}
              title={t('tip.openTemplate')}
            >
              <span>
                {tpl.name}
                {dirty.has(tpl.name) && <span className="dirty-dot" title={t('app.unsaved')} />}
              </span>
              <span className="muted">
                {tpl.width}×{tpl.height}
              </span>
            </button>
            <button
              className="icon-btn item-dup"
              title={t('sidebar.duplicate')}
              onClick={() => setDuplicating({ kind: 'template', name: tpl.name })}
            >
              ⧉
            </button>
          </li>
        ))}
      </ul>
      <h2 className="with-action">
        {t('sidebar.styles')}
        <button
          className="icon-btn"
          title={t('sidebar.newStyle')}
          onClick={() => setEditingStyle('')}
        >
          +
        </button>
      </h2>
      <ul>
        {styleList.map((name) => (
          <li key={name}>
            <button onClick={() => setEditingStyle(name)} title={allStyles[name]}>
              <span>.{name}</span>
              {!(name in (project.file.styles ?? {})) && (
                <span className="muted small">{t('sidebar.builtinStyle')}</span>
              )}
            </button>
          </li>
        ))}
      </ul>
      <h2 className="with-action">
        {t('sidebar.variables')}
        <button
          className="icon-btn"
          title={t('sidebar.newVariable')}
          onClick={() => setEditingVariable('')}
        >
          +
        </button>
      </h2>
      <ul>
        {variableList.map(([name, v]) => (
          <li key={name}>
            <button onClick={() => setEditingVariable(name)} title={t(`variable.type.${v.type}`)}>
              <span>{`{${name}}`}</span>
              <VariableSwatch v={v} variables={variables} />
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
  )

  return (
    <AssetsContext.Provider value={project?.assets ?? []}>
      <StylesContext.Provider value={project?.file.styles ?? NO_STYLES}>
        <VariablesContext.Provider value={variables}>
          <SaveStyleContext.Provider value={project ? saveStyle : null}>
            <div className="app">
              <Tooltip />
              <header className="toolbar">
                <button onClick={open} title={t('tip.openProject')}>
                  {t('app.openProject')}
                </button>
                {project && (
                  <>
                    <button
                      onClick={() => discardOk() && load(project.folder)}
                      title={t('tip.reload')}
                    >
                      {t('app.reload')}
                    </button>
                    <span className="project-name">{project.file.name}</span>
                    <span className="project-path">{project.folder}</span>
                  </>
                )}
                {loading && <span className="muted">{t('app.loading')}</span>}
                <span className="spacer" />
                {project && (
                  <button onClick={() => setExporting(true)} title={t('tip.export')}>
                    {t('app.export')}
                  </button>
                )}
                {project && (
                  <button
                    className="primary"
                    disabled={!anyDirty || saving}
                    title={t('app.saveHint')}
                    onClick={saveAll}
                  >
                    {anyDirty ? t('app.save') : t('app.saved')}
                  </button>
                )}
                <label className="muted" title={t('app.uiSizeHint')}>
                  {t('app.uiSize')}{' '}
                  <select value={uiZoom} onChange={(e) => changeUiZoom(Number(e.target.value))}>
                    {UI_ZOOMS.map((z) => (
                      <option key={z} value={z}>
                        {Math.round(z * 100)}%
                      </option>
                    ))}
                  </select>
                </label>
                <label className="muted">
                  {t('app.theme')}{' '}
                  <select value={theme} onChange={(e) => changeTheme(e.target.value as Theme)}>
                    {THEMES.map((th) => (
                      <option key={th} value={th}>
                        {t(`app.theme.${th}`)}
                      </option>
                    ))}
                  </select>
                </label>
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
                  {sidebarSide === 'left' && (
                    <>
                      {sidebar}
                      <Resizer
                        width={sidebarWidth}
                        onChange={setSidebarWidth}
                        edge="left"
                        max={400}
                      />
                    </>
                  )}
                  {editing ? (
                    <TemplateEditor
                      key={editing.name}
                      template={editing}
                      sets={project.sets.filter((s) => s.template === editing.name)}
                      onChange={updateTemplate}
                    />
                  ) : current ? (
                    <SetView
                      key={current.name}
                      set={current}
                      templates={project.templates}
                      onChange={(sheet, key) =>
                        updateSheet(selected.kind === 'set' ? selected.index : 0, sheet, key)
                      }
                    />
                  ) : (
                    <section className="content" />
                  )}
                  {sidebarSide === 'right' && (
                    <>
                      <Resizer
                        width={sidebarWidth}
                        onChange={setSidebarWidth}
                        edge="right"
                        max={400}
                      />
                      {sidebar}
                    </>
                  )}
                </main>
              ) : (
                !error && (
                  <div className="empty">
                    <p>{t('app.empty')}</p>
                  </div>
                )
              )}
              {duplicating && project && (
                <DuplicateDialog
                  title={
                    duplicating.kind === 'set'
                      ? t('duplicate.setTitle')
                      : t('duplicate.templateTitle')
                  }
                  initial={copyName(
                    duplicating.kind === 'set'
                      ? project.sets[duplicating.index].name
                      : duplicating.name,
                    duplicating.kind === 'set' ? setNames() : templateNames()
                  )}
                  validate={(name) =>
                    duplicating.kind === 'set'
                      ? !isValidSheetName(name)
                        ? t('newSet.invalidName')
                        : setNames().includes(name)
                          ? t('newSet.exists')
                          : null
                      : !isValidTemplateName(name)
                        ? t('newTemplate.invalidName')
                        : templateNames().includes(name)
                          ? t('newTemplate.exists')
                          : null
                  }
                  onDuplicate={(name) => {
                    if (duplicating.kind === 'set') duplicateSet(duplicating.index, name)
                    else duplicateTemplate(duplicating.name, name)
                    setDuplicating(null)
                  }}
                  onClose={() => setDuplicating(null)}
                />
              )}
              {creatingSet && project && (
                <NewSetDialog
                  templates={project.templates}
                  existing={[
                    ...project.sets.map((x) => x.name),
                    ...project.sets.flatMap((x) => (x.data ? [x.data.name] : [])),
                    ...project.unusedSheets
                  ]}
                  unusedSheets={project.unusedSheets}
                  onCreate={createSet}
                  onClose={() => setCreatingSet(false)}
                />
              )}
              {creating && project && (
                <NewTemplateDialog
                  existing={project.templates.map((x) => x.file ?? x.name)}
                  onCreate={createTemplate}
                  onClose={() => setCreating(false)}
                />
              )}
            </div>
            {exporting && project && (
              <ExportDialog
                project={project}
                // le opzioni sono già scritte su disco: il progetto non risulta modificato
                onProfiles={(profiles) =>
                  setProject((p) => p && { ...p, file: { ...p.file, export: profiles } })
                }
                onClose={() => setExporting(false)}
              />
            )}
            {editingStyle !== null && project && (
              <FormatDialog
                mode="style"
                styleName={editingStyle || undefined}
                initial={parseAttrs(allStyles[editingStyle] ?? '').attrs}
                sample={editingStyle || 'Aa'}
                onApply={(attrs, name) => {
                  if (name) saveStyle(name, serializeAttrs(attrs), editingStyle || undefined)
                  setEditingStyle(null)
                }}
                onDelete={() => {
                  saveStyle(editingStyle, null)
                  setEditingStyle(null)
                }}
                onClose={() => setEditingStyle(null)}
              />
            )}
            {editingVariable !== null && project && (
              <VariableDialog
                name={editingVariable}
                onSave={(name, v) => {
                  saveVariable(name, v, editingVariable || undefined)
                  setEditingVariable(null)
                }}
                onDelete={() => {
                  saveVariable(editingVariable, null)
                  setEditingVariable(null)
                }}
                onClose={() => setEditingVariable(null)}
              />
            )}
          </SaveStyleContext.Provider>
        </VariablesContext.Provider>
      </StylesContext.Provider>
    </AssetsContext.Provider>
  )
}

function SetView({
  set,
  templates,
  onChange
}: {
  set: LoadedSet
  templates: Template[]
  onChange(sheet: Sheet, key?: string): void
}): React.JSX.Element {
  const { t } = useI18n()
  const [selection, setSelection] = useState<number[]>([0])
  const [side, setSide] = useState<Side>('front')
  const [addingColumn, setAddingColumn] = useState(false)
  const [focus, setFocus] = useState<{ column: string; seq: number } | null>(null)
  const [previewWidth, setPreviewWidth] = usePanelWidth('preview', 320)
  const [previewSide, togglePreviewSide] = usePanelSide('preview', 'right')
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
  const bindCtx = useBindContext()
  const cards = useMemo<BoundCard[]>(() => {
    if (!template || !set.data) return []
    const { headers, rows } = set.data
    return rows.map((row) => bindCard(template, rowToCard(headers, row), bindCtx))
  }, [template, set.data, bindCtx])

  if (!set.data) {
    return (
      <section className="content">
        <p className="muted">{t('set.noData')}</p>
      </section>
    )
  }
  const sheet = set.data
  const current = selection[0] ?? -1
  const card = cards[current]
  const none = current < 0 || current >= sheet.rows.length

  const addCard = (): void => {
    const at = none ? sheet.rows.length : Math.max(...selection) + 1
    onChange(insertRow(sheet, at))
    setSelection([at])
  }
  const duplicate = (): void => {
    onChange(duplicateRows(sheet, selection))
    setSelection([Math.max(...selection) + 1])
  }
  const remove = (): void => {
    if (selection.length > 1 && !window.confirm(t('set.deleteConfirm', { n: selection.length })))
      return
    onChange(removeRows(sheet, selection))
    setSelection([Math.min(Math.min(...selection), sheet.rows.length - selection.length - 1)])
  }

  /** Clic su un livello della carta in anteprima: si va al campo della sua colonna */
  const pickField = (e: React.MouseEvent<HTMLDivElement>): void => {
    if (!card) return
    const svg = e.currentTarget.querySelector('svg')
    if (!svg) return
    const r = svg.getBoundingClientRect()
    const p = { x: (e.clientX - r.left) / PREVIEW_SCALE, y: (e.clientY - r.top) / PREVIEW_SCALE }
    const layers = side === 'front' ? card.template.front : card.template.back
    for (const l of hitsAt(layers, p)) {
      const column = l.source.kind === 'column' ? (l.source.column ?? l.name) : null
      if (column && sheet.headers.includes(column)) {
        setFocus({ column, seq: Date.now() })
        return
      }
    }
  }

  const preview = (
    <aside className="preview" data-side={previewSide} style={{ width: previewWidth }}>
      <div className="preview-header">
        <h2>
          {t('preview.title')}
          <PanelSideButton side={previewSide} onToggle={togglePreviewSide} />
        </h2>
        <Segmented<Side>
          value={side}
          options={[
            ['front', t('preview.front'), t('tip.front')],
            ['back', t('preview.back'), t('tip.back')]
          ]}
          onChange={setSide}
        />
      </div>
      {!template ? (
        <p className="muted">{t('preview.noTemplate', { name: set.template })}</p>
      ) : card ? (
        <>
          <div className="preview-card" title={t('preview.clickHint')} onClick={pickField}>
            <CardSvg template={card.template} side={side} scale={PREVIEW_SCALE} />
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
      {!none && (
        <CardForm
          key={current}
          sheet={sheet}
          row={current}
          template={template}
          focus={focus}
          onChange={onChange}
        />
      )}
    </aside>
  )

  return (
    <>
      {previewSide === 'left' && (
        <>
          {preview}
          <Resizer
            width={previewWidth}
            onChange={setPreviewWidth}
            edge="left"
            min={240}
            max={640}
          />
        </>
      )}
      <section className="content" ref={contentRef}>
        <div className="set-header">
          <h1>{set.name}</h1>
          <span className="muted">
            {t('set.template', { name: set.template })} ·{' '}
            {t('set.counts', { rows: sheet.rows.length, cards: countCards(sheet) })}
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
              ['table', t('set.table'), t('tip.tableView')],
              ['grid', t('set.grid'), t('tip.gridView')]
            ]}
            onChange={setView}
          />
        </div>
        <div className="set-actions">
          <button onClick={addCard} title={t('tip.addCard')}>
            {t('set.addCard')}
          </button>
          <button disabled={none} onClick={duplicate} title={t('tip.duplicateCards')}>
            {t('set.duplicate')}
          </button>
          <button disabled={none} onClick={remove} title={t('tip.deleteCards')}>
            {t('set.delete')}
          </button>
          <span className="sep" />
          <button onClick={() => setAddingColumn(true)} title={t('tip.addColumn')}>
            {t('set.addColumn')}
          </button>
          <span className="muted small">
            {view === 'grid' && template ? t('set.gridHint') : t('set.editHint')}
          </span>
        </div>
        {view === 'table' || !template ? (
          <DataTable
            sheet={sheet}
            selected={selection}
            onSelect={setSelection}
            onChange={onChange}
          />
        ) : (
          <CardGrid
            cards={cards}
            side={side}
            selected={current}
            onSelect={(i) => setSelection([i])}
            onMove={(from, to) => {
              onChange(moveRow(sheet, from, to))
              setSelection([to])
            }}
            scale={thumb}
          />
        )}
      </section>
      {previewSide === 'right' && (
        <>
          <Resizer
            width={previewWidth}
            onChange={setPreviewWidth}
            edge="right"
            min={240}
            max={640}
          />
          {preview}
        </>
      )}
      {addingColumn && (
        <AddColumnDialog
          sheet={sheet}
          template={template}
          onAdd={(h) => {
            onChange(addColumn(sheet, h))
            setAddingColumn(false)
          }}
          onClose={() => setAddingColumn(false)}
        />
      )}
    </>
  )
}

const PREVIEW_SCALE = 4.4

/** Livelli sotto il punto, dal più in alto, entrando nei gruppi */
function hitsAt(layers: Layer[], p: { x: number; y: number }): Layer[] {
  const out: Layer[] = []
  for (const l of layers) {
    if (!hitTest(l, p)) continue
    if (l.type === 'group') out.push(...hitsAt(l.children, toLocal(l, p)), l)
    else out.push(l)
  }
  return out
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
