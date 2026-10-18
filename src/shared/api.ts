import type { LoadedProject, ProjectFile, Sheet } from './project'
import type { Template } from './model/template'
import type {
  ExportContext,
  ExportJob,
  ExportProfiles,
  ExportProgress,
  ExportResult,
  Scene
} from './export'

export type Theme = 'system' | 'light' | 'dark'

/** API esposta dal preload al renderer come window.api */
export interface Api {
  chooseProjectFolder(): Promise<string | null>
  loadProject(folder: string): Promise<LoadedProject>
  /** Salva il template nel progetto aperto */
  saveTemplate(template: Template): Promise<void>
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
