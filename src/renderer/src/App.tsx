import AiToolsDialog from './components/AiToolsDialog'
import BackupDialog from './components/BackupDialog'
import GenerateDialog from './components/GenerateDialog'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type {
  LoadedProject,
  LoadedSet,
  ProjectFile,
  SetDefinition,
  Sheet
} from '../../shared/project'
import { messageFromError, type Message } from '../../shared/messages'
import { bindCard, computedValues, rowToCard, type BoundCard } from '../../shared/model/bind'
import type { GroupLayer, Layer, Side, Template } from '../../shared/model/template'
import type { Bounds } from '../../shared/model/edit'
import {
  addColumn,
  booleanColumns,
  duplicateRows,
  insertRow,
  isValidSheetName,
  moveRow,
  newSheet,
  removeRows,
  applyOrder,
  setColumns,
  viewRows,
  writeCells,
  NO_VIEW,
  type RowView
} from '../../shared/model/sheet'
import {
  renameInDefinitions,
  renameInSheet,
  renameInTemplate,
  type RefKind
} from '../../shared/model/rename'
import { hitTest, toLocal, worldBounds } from '../../shared/model/geometry'
import { arrangeGroup } from '../../shared/model/arrange'
import {
  denormalizeTemplate,
  isValidTemplateName,
  normalizeTemplate
} from '../../shared/model/normalize'
import DataTable from './components/DataTable'
import Segmented from './components/Segmented'
import Resizer from './components/Resizer'
import {
  useClosedSections,
  usePanelCompact,
  usePanelSide,
  usePanelWidth
} from './components/usePanelWidth'
import PanelSideButton from './components/PanelSideButton'
import SidebarSection from './components/SidebarSection'
import { useDragReorder } from './components/useDragReorder'
import {
  alphabetical,
  isAlphabetical,
  moveItem,
  orderNames,
  renameInOrder,
  type OrderKind
} from '../../shared/model/order'
import {
  PanelIcon,
  SetsIcon,
  StylesIcon,
  TemplateIcon,
  TrashIcon,
  VariablesIcon
} from './components/icons'
import TemplateEditor from './editor/TemplateEditor'
import { NewTemplateDialog } from './editor/dialogs'
import CardGrid from './components/CardGrid'
import CardForm from './components/CardForm'
import ColumnsMenu from './components/ColumnsMenu'
import InlineEditor, { type InlineEdit } from './components/InlineEditor'
import { AddColumnDialog, DuplicateDialog, NewSetDialog } from './components/setDialogs'
import CardSvg from './render/CardSvg'
import {
  AssetsContext,
  SaveStyleContext,
  StylesContext,
  VariablesContext,
  onAssetsUpdate,
  useBindContext
} from './render/assets'
import { useRegisterFonts } from './render/fonts'
import VariableDialog, { VariableSwatch } from './components/VariableDialog'
import type { Variable, Variables } from '../../shared/model/variables'
import FormatDialog from './components/FormatDialog'
import ExportDialog from './export/ExportDialog'
import ImportTtcDialog from './components/ImportTtcDialog'
import StartScreen from './components/StartScreen'
import { thumbnailTemplate } from '../../shared/model/thumbnail'
import UpdateNotice from './components/UpdateNotice'
import Tooltip from './components/Tooltip'
import SidebarPreview from './components/SidebarPreview'
import { useSidebarPreview } from './components/useSidebarPreview'
import { BUILTIN_STYLES, parseAttrs, serializeAttrs } from '../../shared/model/markup'
import { LANGUAGES, useI18n, type Language } from './i18n/context'
import { THEMES, applyTheme, loadTheme } from './theme/theme'
import type { Theme } from '../../shared/api'

const NO_STYLES: Record<string, string> = {}
const NO_VARIABLES: Variables = {}
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
/** Stato dei dati per ⌘Z; i template solo quando li ha cambiati una rinomina */
type DataSnapshot = { sets: LoadedSet[]; file: ProjectFile; templates?: Template[] }
const COALESCE_MS = 1200
type Selected = { kind: 'set'; index: number } | { kind: 'template'; name: string }

/** Ridisegna la miniatura per la schermata di ingresso; un errore non disturba il lavoro */
function updateThumbnail(project: LoadedProject, onlyIfMissing: boolean): void {
  const tpl = thumbnailTemplate(project)
  if (!tpl) return
  const context = {
    assets: project.assets,
    fonts: project.fonts,
    styles: project.file.styles ?? {},
    variables: project.file.variables ?? {}
  }
  window.api.saveThumbnail(tpl, context, onlyIfMissing).catch((e) => console.error(e))
}

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
  useRegisterFonts(project?.fonts)
  // la versione installata resta visibile nel titolo della finestra
  const projectName = project?.file.name
  useEffect(() => {
    document.title = [projectName, `Naibi ${__APP_VERSION__}`].filter(Boolean).join(' — ')
  }, [projectName])
  // icone e font importati: gli asset cambiano senza ricaricare il progetto
  useEffect(() => onAssetsUpdate((u) => setProject((p) => p && { ...p, ...u })), [])
  const [selected, setSelected] = useState<Selected>({ kind: 'set', index: 0 })
  const [error, setError] = useState<Message | null>(null)
  const [loading, setLoading] = useState(false)
  /** Template modificati e non ancora salvati */
  const [dirty, setDirty] = useState<Set<string>>(new Set())
  const [creating, setCreating] = useState(false)
  /** Stile aperto nell'editor: '' per uno nuovo */
  const [editingStyle, setEditingStyle] = useState<string | null>(null)
  // cambia quando una rinomina riscrive i template: l'editor aperto riparte dal template nuovo
  const [editorRev, setEditorRev] = useState(0)
  /** Variabile aperta nell'editor: '' per una nuova */
  const [editingVariable, setEditingVariable] = useState<string | null>(null)
  const [creatingSet, setCreatingSet] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [backingUp, setBackingUp] = useState(false)
  const [aiTools, setAiTools] = useState(false)
  const [importing, setImporting] = useState(false)
  const [duplicating, setDuplicating] = useState<Selected | null>(null)
  /** Fogli modificati e non ancora salvati, per nome del foglio */
  const [dirtySheets, setDirtySheets] = useState<Set<string>>(new Set())
  /** file di progetto da riscrivere (set nuovi) */
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
  const [sidebarCompact, setSidebarCompact] = usePanelCompact('sidebar')
  const [closedSections, setSectionClosed] = useClosedSections('sidebar')
  const sidebarPreview = useSidebarPreview()

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
      updateThumbnail(loaded, true)
    } catch (e) {
      setError(messageFromError(e))
    } finally {
      setLoading(false)
    }
  }, [])

  /** Chiede conferma prima di perdere modifiche non salvate */
  const discardOk = (): boolean => !anyDirty || window.confirm(t('app.discardChanges'))

  const open = async (): Promise<void> => {
    const folder = await window.api.chooseProjectFolder()
    if (folder) load(folder)
  }

  /** Torna alla schermata di ingresso */
  const closeProject = (): void => {
    if (!discardOk()) return
    setProject(null)
    setError(null)
    setSelected({ kind: 'set', index: 0 })
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

  /** Assegna al set un altro template; i dati non cambiano e ⌘Z annulla */
  const setTemplate = (index: number, template: string): void => {
    if (!project || project.sets[index]?.template === template) return
    setHistory((h) => ({
      past: [...h.past.slice(-99), { sets: project.sets, file: project.file }],
      future: [],
      at: 0
    }))
    setProject({
      ...project,
      sets: project.sets.map((x, i) => (i === index ? { ...x, template } : x)),
      file: {
        ...project.file,
        sets: project.file.sets.map((x, i) => (i === index ? { ...x, template } : x))
      }
    })
    setFileDirty(true)
  }

  /** Colonne mostrate nel set: è una preferenza, salvata nel progetto ma fuori dall'annulla */
  const setColumnsView = (
    index: number,
    view: Pick<SetDefinition, 'hiddenColumns' | 'showComputed'>
  ): void => {
    if (!project) return
    const patch = <T extends SetDefinition>(x: T): T => {
      const next = { ...x, ...view }
      if (!next.hiddenColumns?.length) delete next.hiddenColumns
      if (!next.showComputed) delete next.showComputed
      return next
    }
    setProject({
      ...project,
      sets: project.sets.map((x, i) => (i === index ? patch(x) : x)),
      file: { ...project.file, sets: project.file.sets.map((x, i) => (i === index ? patch(x) : x)) }
    })
    setFileDirty(true)
  }

  /** Sposta un set nella barra laterale; il set aperto resta aperto. ⌘Z annulla */
  const reorderSets = (order: number[]): void => {
    if (!project || order.every((x, i) => x === i)) return
    setHistory((h) => ({
      past: [...h.past.slice(-99), { sets: project.sets, file: project.file }],
      future: [],
      at: 0
    }))
    setProject({
      ...project,
      sets: order.map((i) => project.sets[i]),
      file: { ...project.file, sets: order.map((i) => project.file.sets[i]) }
    })
    setFileDirty(true)
    if (selected.kind === 'set') setSelected({ kind: 'set', index: order.indexOf(selected.index) })
  }
  const moveSet = (from: number, to: number): void =>
    reorderSets(moveItem(project?.sets.map((_, i) => i) ?? [], from, to))
  const sortSetsAlpha = (): void => {
    if (!project) return
    const idx = project.sets.map((_, i) => i)
    reorderSets(idx.sort((a, b) => alphabetical(project.sets[a].name, project.sets[b].name)))
  }

  /** Ordine scelto a mano di template, stili o variabili; `null` torna all'ordine alfabetico */
  const setListOrder = (kind: OrderKind, names: string[] | null): void => {
    if (!project) return
    const order = { ...project.file.order }
    if (names) order[kind] = names
    else delete order[kind]
    setHistory((h) => ({
      past: [...h.past.slice(-99), { sets: project.sets, file: project.file }],
      future: [],
      at: 0
    }))
    setProject({
      ...project,
      file: { ...project.file, order: Object.keys(order).length ? order : undefined }
    })
    setFileDirty(true)
  }

  const undoData = (redo: boolean): void => {
    if (!project) return
    const from = redo ? history.future : history.past
    const snap = from[from.length - 1]
    if (!snap) return
    const current: DataSnapshot = {
      sets: project.sets,
      file: project.file,
      templates: snap.templates && project.templates
    }
    setHistory((h) =>
      redo
        ? { past: [...h.past, current], future: h.future.slice(0, -1), at: 0 }
        : { past: h.past.slice(0, -1), future: [...h.future, current], at: 0 }
    )
    // un set eliminato che torna riprende il suo foglio, che non è più tra quelli non collegati
    const linked = new Set(snap.sets.flatMap((x) => (x.data ? [x.data.name] : [])))
    setProject({
      ...project,
      ...snap,
      templates: snap.templates ?? project.templates,
      unusedSheets: project.unusedSheets.filter((x) => !linked.has(x)),
      unusedData: project.unusedData?.filter((x) => !linked.has(x.name))
    })
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
    if (snap.templates)
      markRenamed(project, { ...project, templates: snap.templates, sets: snap.sets })
  }

  /** Dopo una rinomina: template e fogli cambiati vanno salvati, l'editor riparte dal template nuovo */
  const markRenamed = (before: LoadedProject, after: LoadedProject): void => {
    const tpls = after.templates.filter((t, i) => t !== before.templates[i]).map((t) => t.name)
    const sheets = after.sets.flatMap((x, i) =>
      x.data && x.data !== before.sets[i].data ? [x.data.name] : []
    )
    if (tpls.length) {
      setDirty((d) => new Set([...d, ...tpls]))
      setEditorRev((r) => r + 1)
    }
    if (sheets.length) setDirtySheets((d) => new Set([...d, ...sheets]))
  }

  /** Crea, modifica, rinomina (con `oldName`) o elimina (def null) uno stile del progetto */
  const saveStyle = useCallback((name: string, def: string | null, oldName?: string): void => {
    setProject((p) => {
      if (!p) return p
      const renaming = !!oldName && oldName !== name && def !== null
      const base = renaming ? renameReferences(p, 'style', oldName, name) : p
      const styles = { ...base.file.styles }
      if (renaming) delete styles[oldName]
      if (def === null) delete styles[name]
      else styles[name] = def
      setHistory((h) => ({
        past: [
          ...h.past.slice(-99),
          { sets: p.sets, file: p.file, templates: renaming ? p.templates : undefined }
        ],
        future: [],
        at: 0
      }))
      if (renaming) markRenamed(p, base)
      const order = renaming
        ? renameInOrder(base.file.order, 'styles', oldName, name)
        : base.file.order
      return { ...base, file: { ...base.file, styles, order } }
    })
    setFileDirty(true)
  }, [])

  /** Crea, modifica, rinomina (con `oldName`) o elimina (v null) una variabile del progetto */
  const saveVariable = (name: string, v: Variable | null, oldName?: string): void => {
    setProject((p) => {
      if (!p) return p
      const renaming = !!oldName && oldName !== name && v !== null
      const base = renaming ? renameReferences(p, 'variable', oldName, name) : p
      const variables = { ...base.file.variables }
      if (renaming) delete variables[oldName]
      if (v === null) delete variables[name]
      else variables[name] = v
      setHistory((h) => ({
        past: [
          ...h.past.slice(-99),
          { sets: p.sets, file: p.file, templates: renaming ? p.templates : undefined }
        ],
        future: [],
        at: 0
      }))
      if (renaming) markRenamed(p, base)
      const order = renaming
        ? renameInOrder(base.file.order, 'variables', oldName, name)
        : base.file.order
      return { ...base, file: { ...base.file, variables, order } }
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
      updateThumbnail(project, false)
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

  /**
   * Toglie un set dal progetto. Il foglio dei dati resta nel file, tra quelli non collegati:
   * si può ricollegare con Nuovo set, e ⌘Z annulla.
   */
  const deleteSet = (index: number): void => {
    if (!project) return
    const set = project.sets[index]
    if (!window.confirm(t('sidebar.deleteSetConfirm', { name: set.name }))) return
    setHistory((h) => ({
      past: [...h.past, { sets: project.sets, file: project.file }],
      future: [],
      at: 0
    }))
    const sheet = set.data
    // un foglio mai salvato non è nel file: sparisce con il set
    const saved = sheet && !dirtySheets.has(sheet.name)
    setProject({
      ...project,
      sets: project.sets.filter((_, i) => i !== index),
      file: { ...project.file, sets: project.file.sets.filter((_, i) => i !== index) },
      unusedSheets: saved ? [...project.unusedSheets, sheet.name] : project.unusedSheets,
      unusedData: saved ? [...(project.unusedData ?? []), sheet] : project.unusedData
    })
    if (sheet)
      setDirtySheets((d) => {
        const next = new Set(d)
        next.delete(sheet.name)
        return next
      })
    setFileDirty(true)
    if (selected.kind === 'set' && selected.index >= index && selected.index > 0)
      setSelected({ kind: 'set', index: selected.index - 1 })
  }

  /** Elimina un template non usato dai set: il file va nel cestino del sistema */
  const deleteTemplate = async (name: string): Promise<void> => {
    if (!project) return
    const users = project.sets.filter((s) => s.template === name).map((s) => s.name)
    if (users.length) {
      window.alert(t('sidebar.templateInUse', { name, sets: users.join(', ') }))
      return
    }
    const tpl = project.templates.find((x) => x.name === name)
    if (!tpl || !window.confirm(t('sidebar.deleteTemplateConfirm', { name }))) return
    try {
      await window.api.deleteTemplate(tpl.file ?? tpl.name)
    } catch (e) {
      setError(messageFromError(e))
      return
    }
    setProject((p) => p && { ...p, templates: p.templates.filter((x) => x.name !== name) })
    setDirty((d) => {
      const next = new Set(d)
      next.delete(name)
      return next
    })
    if (selected.kind === 'template' && selected.name === name)
      setSelected({ kind: 'set', index: 0 })
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
  const order = project?.file.order
  const styleList = orderNames(Object.keys(allStyles), order?.styles)
  const variables = project?.file.variables ?? NO_VARIABLES
  const variableList = orderNames(Object.keys(variables), order?.variables).map(
    (n): [string, Variable] => [n, variables[n]]
  )
  const templateList = orderNames(
    project?.templates.map((x) => x.name) ?? [],
    order?.templates
  ).flatMap((n) => project?.templates.find((x) => x.name === n) ?? [])
  // trascinando una voce si salva l'ordine dell'elenco come appare
  const dragSets = useDragReorder(moveSet)
  const dragTemplates = useDragReorder((a, b) =>
    setListOrder(
      'templates',
      moveItem(
        templateList.map((x) => x.name),
        a,
        b
      )
    )
  )
  const dragStyles = useDragReorder((a, b) => setListOrder('styles', moveItem(styleList, a, b)))
  const dragVariables = useDragReorder((a, b) =>
    setListOrder(
      'variables',
      moveItem(
        variableList.map(([n]) => n),
        a,
        b
      )
    )
  )
  /** Pulsante "A–Z" accanto al +, solo quando l'elenco non è già alfabetico */
  const sortButton = (names: string[], onSort: () => void): React.ReactNode =>
    !isAlphabetical(names) && (
      <button className="icon-btn sort-alpha" title={t('sidebar.sortAlpha')} onClick={onSort}>
        A–Z
      </button>
    )
  // sezioni della barra laterale, per la versione ridotta a icone
  const sidebarSections: [string, React.ReactNode, string][] = [
    ['sets', <SetsIcon key="sets" />, t('sidebar.sets')],
    ['templates', <TemplateIcon key="templates" />, t('sidebar.templates')],
    ['styles', <StylesIcon key="styles" />, t('sidebar.styles')],
    ['variables', <VariablesIcon key="variables" />, t('sidebar.variables')]
  ]
  const sidebar =
    project && sidebarCompact ? (
      <nav className="sidebar compact" data-side={sidebarSide}>
        <button
          className="icon-btn sidebar-compact-btn"
          title={t('sidebar.expand')}
          onClick={() => setSidebarCompact(false)}
        >
          <PanelIcon />
        </button>
        {sidebarSections.map(([id, icon, title]) => (
          <button
            key={id}
            className="sidebar-icon"
            title={title}
            onClick={() => {
              // apre il pannello sulla sezione scelta
              setSectionClosed(id, false)
              setSidebarCompact(false)
              requestAnimationFrame(() =>
                document.getElementById(`sidebar-${id}`)?.scrollIntoView({ block: 'start' })
              )
            }}
          >
            {icon}
          </button>
        ))}
      </nav>
    ) : (
      project && (
        <nav className="sidebar" data-side={sidebarSide} style={{ width: sidebarWidth }}>
          <div className="sidebar-bar">
            <button
              className="icon-btn sidebar-compact-btn"
              title={t('sidebar.compact')}
              onClick={() => setSidebarCompact(true)}
            >
              <PanelIcon />
            </button>
            <PanelSideButton side={sidebarSide} onToggle={toggleSidebarSide} />
          </div>
          <SidebarSection
            id="sets"
            icon={<SetsIcon />}
            title={t('sidebar.sets')}
            open={!closedSections.has('sets')}
            onToggle={(open) => setSectionClosed('sets', !open)}
            actions={
              <>
                {project &&
                  sortButton(
                    project.sets.map((x) => x.name),
                    sortSetsAlpha
                  )}
                <button
                  className="icon-btn"
                  title={t('sidebar.newSet')}
                  onClick={() => setCreatingSet(true)}
                >
                  +
                </button>
              </>
            }
          >
            <ul>
              {project.sets.map((s, i) => (
                <li key={s.name} {...dragSets.itemProps(i)}>
                  <button
                    className={selected.kind === 'set' && i === selected.index ? 'active' : ''}
                    onClick={() => setSelected({ kind: 'set', index: i })}
                    {...sidebarPreview.bind({ kind: 'set', index: i })}
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
                  <button
                    className="icon-btn item-dup"
                    title={t('sidebar.delete')}
                    onClick={() => deleteSet(i)}
                  >
                    <TrashIcon />
                  </button>
                </li>
              ))}
            </ul>
          </SidebarSection>
          <SidebarSection
            id="templates"
            icon={<TemplateIcon />}
            title={t('sidebar.templates')}
            open={!closedSections.has('templates')}
            onToggle={(open) => setSectionClosed('templates', !open)}
            actions={
              <>
                {sortButton(
                  templateList.map((x) => x.name),
                  () => setListOrder('templates', null)
                )}
                <button
                  className="icon-btn"
                  title={t('sidebar.newTemplate')}
                  onClick={() => setCreating(true)}
                >
                  +
                </button>
              </>
            }
          >
            <ul>
              {templateList.map((tpl, i) => (
                <li key={tpl.name} {...dragTemplates.itemProps(i)}>
                  <button
                    className={
                      selected.kind === 'template' && selected.name === tpl.name ? 'active' : ''
                    }
                    onClick={() => setSelected({ kind: 'template', name: tpl.name })}
                    {...sidebarPreview.bind({ kind: 'template', name: tpl.name })}
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
                  <button
                    className="icon-btn item-dup"
                    title={t('sidebar.duplicate')}
                    onClick={() => setDuplicating({ kind: 'template', name: tpl.name })}
                  >
                    ⧉
                  </button>
                  <button
                    className="icon-btn item-dup"
                    title={t('sidebar.delete')}
                    onClick={() => deleteTemplate(tpl.name)}
                  >
                    <TrashIcon />
                  </button>
                </li>
              ))}
            </ul>
          </SidebarSection>
          <SidebarSection
            id="styles"
            icon={<StylesIcon />}
            title={t('sidebar.styles')}
            open={!closedSections.has('styles')}
            onToggle={(open) => setSectionClosed('styles', !open)}
            actions={
              <>
                {sortButton(styleList, () => setListOrder('styles', null))}
                <button
                  className="icon-btn"
                  title={t('sidebar.newStyle')}
                  onClick={() => setEditingStyle('')}
                >
                  +
                </button>
              </>
            }
          >
            <ul>
              {styleList.map((name, i) => (
                <li key={name} {...dragStyles.itemProps(i)}>
                  <button
                    onClick={() => setEditingStyle(name)}
                    {...sidebarPreview.bind({ kind: 'style', name })}
                  >
                    <span>.{name}</span>
                    {!(name in (project.file.styles ?? {})) && (
                      <span className="muted small">{t('sidebar.builtinStyle')}</span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          </SidebarSection>
          <SidebarSection
            id="variables"
            icon={<VariablesIcon />}
            title={t('sidebar.variables')}
            open={!closedSections.has('variables')}
            onToggle={(open) => setSectionClosed('variables', !open)}
            actions={
              <>
                {sortButton(
                  variableList.map(([n]) => n),
                  () => setListOrder('variables', null)
                )}
                <button
                  className="icon-btn"
                  title={t('sidebar.newVariable')}
                  onClick={() => setEditingVariable('')}
                >
                  +
                </button>
              </>
            }
          >
            <ul>
              {variableList.map(([name, v], i) => (
                <li key={name} {...dragVariables.itemProps(i)}>
                  <button
                    onClick={() => setEditingVariable(name)}
                    {...sidebarPreview.bind({ kind: 'variable', name })}
                  >
                    <span>{`{${name}}`}</span>
                    <VariableSwatch v={v} variables={variables} />
                  </button>
                </li>
              ))}
            </ul>
          </SidebarSection>
          {project.unusedSheets.length > 0 && (
            <p className="muted small">
              {t('sidebar.unusedSheets', { names: project.unusedSheets.join(', ') })}
            </p>
          )}
        </nav>
      )
    )

  /** Dimensione dell'interfaccia, tema e lingua: nella schermata di ingresso e nel progetto */
  const settings = (
    <span className="app-settings">
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
    </span>
  )

  return (
    <AssetsContext.Provider value={project?.assets ?? []}>
      <StylesContext.Provider value={project?.file.styles ?? NO_STYLES}>
        <VariablesContext.Provider value={variables}>
          <SaveStyleContext.Provider value={project ? saveStyle : null}>
            <div className="app">
              <Tooltip />
              <UpdateNotice />
              {project && !sidebarCompact && (
                <SidebarPreview
                  hover={sidebarPreview.hover}
                  project={project}
                  styles={allStyles}
                  side={sidebarSide}
                />
              )}
              {project && (
                <header className="toolbar">
                  <span className="project-name">{project.file.name}</span>
                  <span className="project-path">{project.folder}</span>
                  {loading && <span className="muted">{t('app.loading')}</span>}
                  <span className="spacer" />
                  <button onClick={() => setExporting(true)} title={t('tip.export')}>
                    {t('app.export')}
                  </button>
                  <button onClick={() => setBackingUp(true)} title={t('tip.backup')}>
                    {t('app.backup')}
                  </button>
                  <button onClick={() => setAiTools(true)} title={t('tip.aiTools')}>
                    {t('app.aiTools')}
                  </button>
                  <span className="toolbar-group">
                    <button
                      className="primary"
                      disabled={!anyDirty || saving}
                      title={t('app.saveHint')}
                      onClick={saveAll}
                    >
                      {anyDirty ? t('app.save') : t('app.saved')}
                    </button>
                    <button
                      onClick={() => discardOk() && load(project.folder)}
                      title={t('tip.reload')}
                    >
                      {t('app.reload')}
                    </button>
                    <button onClick={closeProject} title={t('tip.closeProject')}>
                      {t('app.closeProject')}
                    </button>
                  </span>
                  {settings}
                </header>
              )}

              {project && error && <div className="banner error">{t(error)}</div>}
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
                      {!sidebarCompact && (
                        <Resizer
                          width={sidebarWidth}
                          onChange={setSidebarWidth}
                          edge="left"
                          max={400}
                        />
                      )}
                    </>
                  )}
                  {editing ? (
                    <TemplateEditor
                      key={`${editing.name}:${editorRev}`}
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
                      onEditTemplate={() =>
                        setSelected({ kind: 'template', name: current.template })
                      }
                      onChangeTemplate={(name) =>
                        setTemplate(selected.kind === 'set' ? selected.index : 0, name)
                      }
                      onChangeColumns={(view) =>
                        setColumnsView(selected.kind === 'set' ? selected.index : 0, view)
                      }
                    />
                  ) : (
                    <section className="content">
                      {!project.sets.length && (
                        <div className="empty">
                          <div>
                            {project.templates.length ? (
                              <>
                                <p>{t('app.noSets')}</p>
                                <button className="primary" onClick={() => setCreatingSet(true)}>
                                  {t('sidebar.newSet')}
                                </button>
                              </>
                            ) : (
                              <>
                                <p>{t('app.emptyProject')}</p>
                                <button className="primary" onClick={() => setCreating(true)}>
                                  {t('sidebar.newTemplate')}
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      )}
                    </section>
                  )}
                  {sidebarSide === 'right' && (
                    <>
                      {!sidebarCompact && (
                        <Resizer
                          width={sidebarWidth}
                          onChange={setSidebarWidth}
                          edge="right"
                          max={400}
                        />
                      )}
                      {sidebar}
                    </>
                  )}
                </main>
              ) : (
                <StartScreen
                  error={error}
                  loading={loading}
                  settings={settings}
                  onOpen={load}
                  onChoose={open}
                  onImport={() => setImporting(true)}
                />
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
            {importing && (
              <ImportTtcDialog
                onOpen={(folder) => {
                  if (!discardOk()) return
                  setImporting(false)
                  load(folder)
                }}
                onClose={() => setImporting(false)}
              />
            )}
            {aiTools && <AiToolsDialog onClose={() => setAiTools(false)} />}
            {backingUp && project && (
              <BackupDialog
                dirty={anyDirty}
                onSave={saveAll}
                onRestored={(folder) => {
                  setBackingUp(false)
                  if (discardOk()) load(folder)
                }}
                onClose={() => setBackingUp(false)}
              />
            )}
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
  onChange,
  onEditTemplate,
  onChangeTemplate,
  onChangeColumns
}: {
  set: LoadedSet
  templates: Template[]
  onChange(sheet: Sheet, key?: string): void
  /** Assegna al set un altro template */
  onChangeTemplate(name: string): void
  /** Colonne nascoste e livelli calcolati mostrati */
  onChangeColumns(view: Pick<SetDefinition, 'hiddenColumns' | 'showComputed'>): void
  /** Apre nell'editor il template del set */
  onEditTemplate(): void
}): React.JSX.Element {
  const { t } = useI18n()
  const [selection, setSelection] = useState<number[]>([0])
  const [side, setSide] = useState<Side>('front')
  const [addingColumn, setAddingColumn] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [focus, setFocus] = useState<{ column: string; seq: number } | null>(null)
  /** Campi del modulo con i dettagli del livello aperti: restano aperti passando di carta in carta */
  const [details, setDetails] = useState<Set<string>>(new Set())
  /** Livello in modifica direttamente sulla carta in anteprima */
  const [inline, setInline] = useState<InlineEdit | null>(null)
  /** Ultimo clic sull'anteprima, per passare al livello sotto con un altro clic */
  const lastPick = useRef<{ x: number; y: number; row: number; column: string } | null>(null)
  const [rowView, setRowView] = useState<RowView>(NO_VIEW)
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

  const order = useMemo(() => (set.data ? viewRows(set.data, rowView) : []), [set.data, rowView])

  // colonne mostrate: tutte quelle modificabili, tranne le nascoste; i livelli fissi e con
  // formula solo a richiesta
  const allColumns = useMemo(
    () => (set.data ? setColumns(set.data, template) : []),
    [set.data, template]
  )
  const hidden = new Set(set.hiddenColumns ?? [])
  const columns = allColumns.filter(
    (c) => !hidden.has(c.header) && (!c.computed || set.showComputed)
  )
  const booleans = useMemo(
    () => (set.data ? booleanColumns(set.data, template) : new Map<string, boolean | null>()),
    [set.data, template]
  )
  // valori dei livelli fissi e con formula, solo quando si mostrano
  const showsComputed = columns.some((c) => c.computed)
  const computedRows = useMemo(
    () =>
      template && set.data && showsComputed
        ? set.data.rows.map((r) =>
            computedValues(template, rowToCard(set.data!.headers, r), bindCtx.variables)
          )
        : [],
    [template, set.data, bindCtx, showsComputed]
  )
  const computed = useCallback(
    (row: number): Record<string, string> => computedRows[row] ?? {},
    [computedRows]
  )

  // PagSu e PagGiù passano alla carta precedente o successiva, nell'ordine della vista, anche
  // mentre si scrive nei campi della carta (il campo resta lo stesso)
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key !== 'PageDown' && e.key !== 'PageUp') return
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey || !order.length) return
      const target = e.target instanceof HTMLElement ? e.target : null
      if (target?.closest('[role="dialog"], select, .table-wrap textarea, .table-wrap input'))
        return
      e.preventDefault()
      const at = order.indexOf(selection[0] ?? -1)
      const next =
        at < 0
          ? order[e.key === 'PageDown' ? 0 : order.length - 1]
          : order[Math.max(0, Math.min(order.length - 1, at + (e.key === 'PageDown' ? 1 : -1)))]
      if (next === selection[0] && selection.length === 1) return
      const column = target?.closest('.card-form') ? target.dataset.column : undefined
      if (column) setFocus({ column, seq: Date.now() })
      setSelection([next])
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  if (!set.data) {
    return (
      <section className="content">
        <p className="muted">{t('set.noData')}</p>
      </section>
    )
  }
  const sheet = set.data
  const viewActive = rowView.sort !== null || rowView.filter.trim() !== ''
  /** Clic su un'intestazione: crescente, decrescente, poi l'ordine del foglio */
  const sortBy = (column: string): void =>
    setRowView((v) =>
      v.sort !== column
        ? { ...v, sort: column, desc: false }
        : v.desc
          ? { ...v, sort: null, desc: false }
          : { ...v, desc: true }
    )
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

  /** Livelli con un campo sotto il puntatore, dal più in alto, con dove stanno sulla carta */
  const fieldsAt = (
    e: React.MouseEvent<HTMLDivElement>,
    allowed: Set<string>
  ): { column: string; layer: Layer; box: Bounds; p: { x: number; y: number } }[] => {
    if (!card) return []
    const svg = e.currentTarget.querySelector('svg')
    if (!svg) return []
    const r = svg.getBoundingClientRect()
    const p = { x: (e.clientX - r.left) / PREVIEW_SCALE, y: (e.clientY - r.top) / PREVIEW_SCALE }
    const layers = side === 'front' ? card.template.front : card.template.back
    const out: { column: string; layer: Layer; box: Bounds; p: { x: number; y: number } }[] = []
    for (const { layer: l, chain } of hitsAt(layers, p)) {
      const column = l.source.kind === 'column' ? (l.source.column ?? l.name) : null
      if (column && allowed.has(column) && !out.some((f) => f.column === column))
        out.push({ column, layer: l, box: worldBounds(l, chain), p })
    }
    return out
  }

  /**
   * Clic su un livello della carta in anteprima: si va al campo della sua colonna. Alt+clic
   * nello stesso punto passa al livello sotto, se anche quello ha un campo.
   */
  const pickField = (e: React.MouseEvent<HTMLDivElement>): void => {
    // il secondo clic di un doppio clic apre la modifica sulla carta
    if (e.detail > 1) return
    const found = fieldsAt(e, new Set(columns.filter((c) => !c.computed).map((c) => c.header)))
    if (!found.length) return
    const p = found[0].p
    const last = lastPick.current
    const again =
      e.altKey && last && last.row === current && Math.hypot(last.x - p.x, last.y - p.y) < 1
        ? (found.findIndex((f) => f.column === last.column) + 1) % found.length
        : 0
    lastPick.current = { ...p, row: current, column: found[again].column }
    setFocus({ column: found[again].column, seq: Date.now() })
  }

  /** Doppio clic sulla carta: si modifica il livello lì, sopra l'anteprima */
  const editOnCard = (e: React.MouseEvent<HTMLDivElement>): void => {
    if (none) return
    const found = fieldsAt(
      e,
      new Set(allColumns.filter((c) => !c.computed).map((c) => c.header))
    ).filter((f) => f.layer.type === 'text' || f.layer.type === 'image' || f.layer.type === 'shape')
    if (!found.length) return
    // dopo un Alt+clic si modifica il livello scelto, non quello in cima
    const last = lastPick.current
    const hit = (last && found.find((f) => f.column === last.column)) || found[0]
    const index = sheet.headers.indexOf(hit.column)
    const original = index < 0 ? '' : (sheet.rows[current]?.[index] ?? '')
    setInline({ column: hit.column, type: hit.layer.type, box: hit.box, original, row: current })
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
          <div
            className="preview-card"
            title={inline ? undefined : t('preview.clickHint')}
            onClick={pickField}
            onDoubleClick={editOnCard}
          >
            <div className="preview-card-inner">
              <CardSvg template={card.template} side={side} scale={PREVIEW_SCALE} />
              {inline && inline.row === current && (
                <InlineEditor
                  key={`${inline.row}:${inline.column}`}
                  edit={inline}
                  scale={PREVIEW_SCALE}
                  value={sheet.rows[current]?.[sheet.headers.indexOf(inline.column)] ?? ''}
                  fields={sheet.headers.filter((h) => h !== 'amount' && !h.includes('.'))}
                  onChange={(v) =>
                    onChange(
                      writeCells(sheet, [inline.row], inline.column, v),
                      `cell:${inline.row}:${inline.column}`
                    )
                  }
                  onClose={() => setInline(null)}
                />
              )}
            </div>
          </div>
          <button
            className="preview-edit"
            title={t('tip.editTemplate', { name: set.template })}
            onClick={onEditTemplate}
          >
            <TemplateIcon /> {t('preview.editTemplate')}
          </button>
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
          key={selection.join(',')}
          sheet={sheet}
          row={current}
          rows={selection}
          template={template}
          columns={columns}
          booleans={booleans}
          computed={computed}
          focus={focus}
          details={details}
          onToggleDetails={(h) =>
            setDetails((d) => {
              const next = new Set(d)
              if (next.has(h)) next.delete(h)
              else next.add(h)
              return next
            })
          }
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
          <span className="muted set-template">
            {t('set.templateLabel')}
            <select
              value={set.template}
              title={t('tip.setTemplate')}
              onChange={(e) => onChangeTemplate(e.target.value)}
            >
              {/* un template mancante resta nell'elenco, così si vede quale manca */}
              {!template && <option value={set.template}>{set.template}</option>}
              {templates.map((x) => (
                <option key={x.name} value={x.name}>
                  {x.name}
                </option>
              ))}
            </select>
            · {t('set.counts', { rows: sheet.rows.length, cards: countCards(sheet) })}
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
          <button onClick={() => setGenerating(true)} title={t('tip.generateCards')}>
            {t('set.generate')}
          </button>
          <span className="sep" />
          <button onClick={() => setAddingColumn(true)} title={t('tip.addColumn')}>
            {t('set.addColumn')}
          </button>
          <ColumnsMenu
            columns={allColumns}
            hidden={hidden}
            showComputed={!!set.showComputed}
            onChange={onChangeColumns}
          />
          <span className="sep" />
          <input
            type="search"
            className="row-filter"
            placeholder={t('set.filter')}
            title={t('tip.filterRows')}
            value={rowView.filter}
            onChange={(e) => setRowView((v) => ({ ...v, filter: e.target.value }))}
          />
          <select
            className="row-filter-column"
            title={t('tip.filterColumn')}
            value={rowView.filterColumn ?? ''}
            onChange={(e) => setRowView((v) => ({ ...v, filterColumn: e.target.value || null }))}
          >
            <option value="">{t('set.filterAll')}</option>
            {sheet.headers
              .filter((h) => h && !h.includes('.'))
              .map((h) => (
                <option key={h} value={h}>
                  {h}
                </option>
              ))}
          </select>
          {view === 'grid' && (
            <select
              title={t('tip.sortColumn')}
              value={rowView.sort ?? ''}
              onChange={(e) =>
                setRowView((v) => ({ ...v, sort: e.target.value || null, desc: false }))
              }
            >
              <option value="">{t('set.sortNone')}</option>
              {sheet.headers
                .filter((h) => h && !h.includes('.'))
                .map((h) => (
                  <option key={h} value={h}>
                    {t('set.sortBy', { column: h })}
                  </option>
                ))}
            </select>
          )}
          {rowView.sort !== null && (
            <>
              {view === 'grid' && (
                <button
                  title={t('tip.sortDirection')}
                  onClick={() => setRowView((v) => ({ ...v, desc: !v.desc }))}
                >
                  {rowView.desc ? '↓' : '↑'}
                </button>
              )}
              <button
                title={t('tip.applyOrder')}
                onClick={() => {
                  onChange(applyOrder(sheet, rowView))
                  setRowView((v) => ({ ...v, sort: null, desc: false }))
                }}
              >
                {t('set.applyOrder')}
              </button>
            </>
          )}
          {viewActive && (
            <button title={t('tip.clearView')} onClick={() => setRowView(NO_VIEW)}>
              {t('set.clearView')}
            </button>
          )}
        </div>
        <p className="muted small set-hint">
          {viewActive
            ? t('set.viewHint', { shown: order.length, total: sheet.rows.length })
            : view === 'grid' && template
              ? t('set.gridHint')
              : t('set.editHint')}
        </p>
        {view === 'table' || !template ? (
          <DataTable
            sheet={sheet}
            columns={columns}
            booleans={booleans}
            computed={computed}
            selected={selection}
            onSelect={setSelection}
            onChange={onChange}
            rows={order}
            sort={{ column: rowView.sort, desc: rowView.desc }}
            onSort={sortBy}
          />
        ) : (
          <CardGrid
            cards={cards}
            side={side}
            selected={current}
            selection={selection}
            onSelect={(i, e) => {
              // come nella tabella: Maiuscolo seleziona un intervallo, ⌘ aggiunge o toglie
              if (e.shiftKey && selection.length) {
                const pa = order.indexOf(current)
                const pb = order.indexOf(i)
                const [a, b] = pa < pb ? [pa, pb] : [pb, pa]
                setSelection([
                  current,
                  ...order.slice(Math.max(0, a), b + 1).filter((r) => r !== current)
                ])
              } else if (e.metaKey || e.ctrlKey) {
                const next = selection.includes(i)
                  ? selection.filter((r) => r !== i)
                  : [...selection, i]
                setSelection(next.length ? next : [i])
              } else setSelection([i])
            }}
            onMove={
              viewActive
                ? undefined
                : (from, to) => {
                    onChange(moveRow(sheet, from, to))
                    setSelection([to])
                  }
            }
            scale={thumb}
            order={order}
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
      {generating && (
        <GenerateDialog
          sheet={sheet}
          template={template}
          onApply={(s) => {
            onChange(s)
            setGenerating(false)
          }}
          onClose={() => setGenerating(false)}
        />
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

/** Il progetto con i riferimenti a una variabile o a uno stile rinominati ovunque */
function renameReferences(
  p: LoadedProject,
  kind: RefKind,
  from: string,
  to: string
): LoadedProject {
  const templates = p.templates.map((t) => renameInTemplate(t, kind, from, to))
  const sets = p.sets.map((x) => {
    if (!x.data) return x
    const tpl = p.templates.find((t) => t.name === x.template) ?? null
    const data = renameInSheet(x.data, tpl, kind, from, to)
    return data === x.data ? x : { ...x, data }
  })
  const defs = renameInDefinitions(p.file.variables ?? {}, p.file.styles ?? {}, kind, from, to)
  return { ...p, templates, sets, file: { ...p.file, ...defs } }
}

/**
 * Livelli sotto il punto, dal più in alto, entrando nei gruppi con i figli dove sono disegnati,
 * ognuno con i gruppi che lo contengono. I livelli che sulla carta non mostrano nulla (testo
 * vuoto, immagine senza file, opacità zero) non coprono quelli sotto.
 */
function hitsAt(
  layers: Layer[],
  p: { x: number; y: number },
  chain: GroupLayer[] = []
): { layer: Layer; chain: GroupLayer[] }[] {
  const out: { layer: Layer; chain: GroupLayer[] }[] = []
  for (const l of layers) {
    if (!hitTest(l, p) || l.opacity <= 0) continue
    if (l.type === 'group') {
      const g = arrangeGroup(l)
      out.push(...hitsAt(g.children, toLocal(l, p), [...chain, g]), { layer: l, chain })
    } else if (!isBlank(l)) out.push({ layer: l, chain })
  }
  return out
}

function isBlank(l: Layer): boolean {
  if (l.type === 'text') return !l.text.trim()
  if (l.type === 'image') return !l.src.trim()
  if (l.type === 'shape') return !l.fill && !l.stroke
  return false
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
