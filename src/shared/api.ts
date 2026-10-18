import type { LoadedProject } from './project'

/** API esposta dal preload al renderer come window.api */
export interface Api {
  chooseProjectFolder(): Promise<string | null>
  loadProject(folder: string): Promise<LoadedProject>
}
