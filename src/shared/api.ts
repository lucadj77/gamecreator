import type { LoadedProject, ProjectFile, Sheet } from './project'
import type { Template } from './model/template'

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
}
