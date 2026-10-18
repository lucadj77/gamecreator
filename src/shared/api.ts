import type { LoadedProject } from './project'
import type { Template } from './model/template'

/** API esposta dal preload al renderer come window.api */
export interface Api {
  chooseProjectFolder(): Promise<string | null>
  loadProject(folder: string): Promise<LoadedProject>
  /** Salva il template nel progetto aperto */
  saveTemplate(template: Template): Promise<void>
}
