// Formato di progetto GameCreator: vedi docs/formato.md

import type { Template } from './model/template'
import type { Message } from './messages'
import type { ExportProfiles } from './export'
import type { Sources } from './library'
import type { Variables } from './model/variables'
import type { ListOrder } from './model/order'

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
  /**
   * Stili di testo: nome → attributi del markup, per esempio "keyword": "weight=700 color=green".
   * heading1, heading2 e note esistono sempre e si possono ridefinire.
   */
  styles?: Record<string, string>
  /** Variabili del progetto: nome → definizione (docs/specifica.md, 6.1) */
  variables?: Variables
  /** Ultime opzioni usate per ogni tipo di esportazione */
  export?: ExportProfiles
  /** Ordine scelto a mano di template, stili e variabili nella barra laterale; assente: alfabetico */
  order?: ListOrder
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
  /** Font sotto assets/fonts/, da registrare prima di disegnare */
  fonts: ProjectFont[]
  /** Provenienza e licenza dei file importati dall'app (assets/sources.json) */
  sources: Sources
  warnings: Message[]
}

export const FONT_EXTENSIONS = ['.ttf', '.otf', '.woff', '.woff2']

/** Un file di font del progetto, con i dati letti dal file */
export interface ProjectFont {
  /** Percorso sotto assets/ */
  path: string
  family: string
  /** Peso, o intervallo "100 900" per i font variabili */
  weight: string
  style: 'normal' | 'italic'
}
