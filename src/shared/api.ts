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
  SystemFontFamily,
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
  /** La cartella non c'è più o non contiene il file di progetto */
  missing: boolean
  /** Immagine della prima carta come data URL */
  thumbnail?: string
}

/** API esposta dal preload al renderer come window.api */
export interface BackupSettings {
  /** Cartella dei backup; vuota per quella di base (Documenti/Naibi/Backup) */
  folder: string
  /** Backup automatico all'apertura del progetto */
  auto: boolean
  /** Quanti backup automatici tenere per progetto */
  keep: number
}

export interface BackupItem {
  file: string
  name: string
  /** Data del backup, in millisecondi */
  date: number
  /** Dimensione dello zip, senza le immagini che condivide con gli altri backup */
  size: number
  auto: boolean
}

export interface BackupState {
  /** Cartella dei backup del progetto aperto */
  folder: string
  /** Cartella di base, quando settings.folder è vuota */
  defaultFolder: string
  settings: BackupSettings
  items: BackupItem[]
  /** Spazio occupato da tutti i backup del progetto, immagini comprese */
  totalSize: number
}

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
  /** Salva i fogli modificati e, se cambiati i set, il file di progetto */
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
  /** Ricorda le opzioni di esportazione nel file di progetto */
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
  /** Font installati sul computer, per famiglia */
  systemFonts(): Promise<SystemFontFamily[]>
  /** Copia i file di un font installato in assets/fonts/<famiglia>/ */
  copySystemFont(family: string): Promise<AssetsUpdate>
  /** Scrive i crediti in export/credits.txt e restituisce il percorso */
  saveCredits(text: string): Promise<string>
  /** Sceglie una cartella qualsiasi, partendo da current */
  chooseFolder(current?: string): Promise<string | null>
  /** Backup del progetto aperto e impostazioni */
  backups(): Promise<BackupState>
  /** Crea subito un backup del progetto aperto (dei file salvati) */
  createBackup(): Promise<BackupItem>
  saveBackupSettings(settings: BackupSettings): Promise<BackupState>
  /** Estrae un backup in una cartella nuova accanto al progetto e ne restituisce il percorso */
  restoreBackup(file: string): Promise<string>
  /** Cartella proposta per un progetto Tabletop Creator convertito */
  defaultTtcTarget(source: string): Promise<string>
  /** Converte un progetto Tabletop Creator in un progetto nuovo; l'originale non si modifica */
  importTtc(options: TtcImportOptions): Promise<TtcImportResult>
  /** Come lanciare il comando naibi su questo computer; ready è falso se va prima compilato */
  naibiCommand(): Promise<{ command: string; ready: boolean }>
  /** Scrive la skill in <cartella>/naibi/SKILL.md e ne restituisce il percorso */
  saveSkill(folder: string, text: string): Promise<string>
  /** Cartella proposta per salvare la skill: quella delle skill di Claude Code, se c'è */
  skillsFolder(): Promise<string>
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
  /** Cartella nuova (o vuota) del progetto Naibi */
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
