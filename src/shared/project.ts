// Formato di progetto GameCreator: vedi docs/formato.md

import type { Template } from './model/template'
import type { Message } from './messages'

export const PROJECT_FILE = 'gamecreator.json'
export const FORMAT_VERSION = 1

export interface SetDefinition {
  /** Nome del set, mostrato nell'interfaccia */
  name: string
  /** Nome del template (file templates/<template>.json) */
  template: string
  /** Foglio del file dati che contiene le carte; se assente, uguale a name */
  sheet?: string
}

export interface ProjectFile {
  formatVersion: number
  name: string
  /** Percorso relativo del file dati (.xlsx o .csv) */
  dataFile: string
  sets: SetDefinition[]
}

export interface Sheet {
  name: string
  headers: string[]
  /** Righe come testo, nello stesso ordine di headers */
  rows: string[][]
}

export interface LoadedSet extends SetDefinition {
  /** Foglio collegato, null se non presente nel file dati */
  data: Sheet | null
}

export interface LoadedProject {
  folder: string
  file: ProjectFile
  sets: LoadedSet[]
  /** Fogli del file dati non collegati a nessun set */
  unusedSheets: string[]
  /** Contenuto dei fogli non collegati: un set nuovo può riprenderli */
  unusedData: Sheet[]
  /** Template letti da templates/ */
  templates: Template[]
  /** File sotto assets/, percorsi relativi */
  assets: string[]
  warnings: Message[]
}
