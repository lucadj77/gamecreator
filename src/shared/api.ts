import type { LoadedProject, ProjectFile, Sheet } from './project'
import type { Template } from './model/template'
import type { Message } from './messages'
import type {
  ExportContext,
  ExportJob,
  ExportProfiles,
  ExportProgress,
  ExportResult,
  Scene
} from './export'
import type {
  AssetsUpdate,
  FontCatalog,
  FontVariant,
  IconCatalog,
  IconCollection,
  IconImport
} from './library'

export type Theme = 'system' | 'light' | 'dark'

export interface RecentProject {
  folder: string
  name: string
  /** Ultima apertura, in millisecondi */
  openedAt: number
  /** La cartella non c'è più o non contiene gamecreator.json */
  missing: boolean
  /** Immagine della prima carta come data URL */
  thumbnail?: string
}

/** API esposta dal preload al renderer come window.api */
export interface Api {
  chooseProjectFolder(): Promise<string | null>
  /** Progetti aperti di recente, dal più recente */
  recentProjects(): Promise<RecentProject[]>
  /** Toglie un progetto dall'elenco dei recenti; la cartella non si tocca */
  removeRecentProject(folder: string): Promise<void>
  /**
   * Salva la miniatura del progetto aperto disegnando il template dato (già legato ai valori
   * della carta); con onlyIfMissing non ridisegna una miniatura che esiste già
   */
  saveThumbnail(template: Template, context: ExportContext, onlyIfMissing: boolean): Promise<void>
  /** Cartella proposta per i progetti nuovi */
  defaultProjectsFolder(): Promise<string>
  /** Crea un progetto vuoto in <parent>/<nome> e ne restituisce la cartella */
  createProject(name: string, parent: string, data?: 'xlsx' | 'ods'): Promise<string>
  loadProject(folder: string): Promise<LoadedProject>
  /** Salva il template nel progetto aperto */
  saveTemplate(template: Template): Promise<void>
  /** Sposta il file del template nel cestino del sistema */
  deleteTemplate(file: string): Promise<void>
  /** Salva i fogli modificati e, se cambiati i set, gamecreator.json */
  saveData(changes: { file?: ProjectFile; sheets: Sheet[] }): Promise<void>
  /** Ingrandimento di tutta l'interfaccia, 1 = 100% */
  setUiZoom(factor: number): void
  /** Tema chiaro, scuro o quello del sistema: vale anche per menu e controlli nativi */
  setTheme(theme: Theme): void
  /** Esporta immagini, PDF o Tabletop Simulator; l'avanzamento arriva a onExportProgress */
  runExport(job: ExportJob, context: ExportContext): Promise<ExportResult>
  cancelExport(): void
  onExportProgress(cb: (p: ExportProgress) => void): () => void
  chooseExportFolder(current: string): Promise<string | null>
  /** Ricorda le opzioni di esportazione in gamecreator.json */
  saveExportProfiles(profiles: ExportProfiles): Promise<void>
  /** Cartelle predefinite: export/ del progetto e Saved Objects di Tabletop Simulator */
  defaultExportFolders(): Promise<{ export: string; tts: string }>
  showFolder(path: string): Promise<string>
  /** Catalogo di una raccolta di icone inclusa nell'app (game-icons.net, Kenney) */
  iconCatalog(collection: IconCollection): Promise<IconCatalog>
  /** Copia le icone in assets/icons/ (o assets/images/) e ne registra la licenza */
  importIcons(collection: IconCollection, items: IconImport[]): Promise<AssetsUpdate>
  /** Elenco dei font Google incluso nell'app */
  fontCatalog(): Promise<FontCatalog>
  /** Scarica le varianti di un font Google in assets/fonts/<famiglia>/ */
  downloadFont(family: string, variants: FontVariant[]): Promise<AssetsUpdate>
  /** Scrive i crediti in export/credits.txt e restituisce il percorso */
  saveCredits(text: string): Promise<string>
  /** Sceglie una cartella qualsiasi, partendo da current */
  chooseFolder(current?: string): Promise<string | null>
  /** Cartella proposta per un progetto Tabletop Creator convertito */
  defaultTtcTarget(source: string): Promise<string>
  /** Converte un progetto Tabletop Creator in un progetto nuovo; l'originale non si modifica */
  importTtc(options: TtcImportOptions): Promise<TtcImportResult>
  /** Solo nella finestra nascosta che disegna le esportazioni */
  exportPage: ExportPageApi
}

export interface ExportPageApi {
  onContext(cb: (c: ExportContext) => void): void
  onScene(cb: (id: number, scene: Scene) => void): void
  /** La pagina è pronta a ricevere le scene */
  ready(): void
  /** Scena disegnata, o errore */
  shown(id: number, error?: string): void
}

export interface TtcImportOptions {
  /** Cartella del progetto Tabletop Creator */
  source: string
  /** Cartella nuova (o vuota) del progetto GameCreator */
  target: string
  /** Cartella in cui cercare le icone della libreria che non sono nei cataloghi dell'app */
  iconFolder?: string
}

export interface TtcImportResult {
  folder: string
  templates: number
  sets: number
  cards: number
  assets: number
  variables: number
  /** Cose non convertite o convertite in modo approssimato */
  notes: Message[]
  /** Icone della libreria prese dai cataloghi dell'app (game-icons.net, Kenney) */
  libraryIcons: number
  /** Icone della libreria non trovate, come categoria/nome */
  missingIcons: string[]
  /** Caratteri usati dai testi, da installare nel sistema se mancano */
  fonts: string[]
}
