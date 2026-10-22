import type { SheetInspection } from '../dataCheck'
import { msg, type Message } from '../messages'
import type { LoadedProject } from '../project'
import { templateColumns } from './sheet'

// Controlla file dati: per ogni foglio i set che lo usano, le colonne che i loro template leggono
// e il foglio non ha, e le anomalie trovate leggendo il file

export interface SheetCheck {
  sheet: SheetInspection
  /** Set collegati al foglio, con le colonne lette dal template che il foglio non ha */
  sets: { name: string; template: string; missing: string[] }[]
  /** Anomalie: warning per quelle che cambiano le carte, info per le altre */
  notes: { level: 'warning' | 'info'; message: Message }[]
}

export interface DataCheck {
  sheets: SheetCheck[]
  /** Set il cui foglio non è nel file */
  missingSheets: { set: string; sheet: string }[]
}

/** Al massimo tante righe vuote elencate */
const ROWS = 10

export function checkDataFile(project: LoadedProject, inspections: SheetInspection[]): DataCheck {
  const sheets = inspections.map((sheet): SheetCheck => {
    const headers = new Set(sheet.headers.filter(Boolean))
    const sets = project.sets
      // sul disco il foglio di un set rinominato e non ancora salvato ha il nome di prima
      .filter((s) => (s.data ? (s.data.origin ?? s.data.name) : null) === sheet.name)
      .map((s) => {
        const tpl = project.templates.find((t) => t.name === s.template)
        const missing = tpl
          ? templateColumns(tpl).filter((c) => c !== 'amount' && !headers.has(c))
          : []
        return { name: s.name, template: s.template, missing }
      })
    const notes: SheetCheck['notes'] = []
    const warn = (key: string, params?: Message['params']): void => {
      notes.push({ level: 'warning', message: msg(key, params) })
    }
    const info = (key: string, params?: Message['params']): void => {
      notes.push({ level: 'info', message: msg(key, params) })
    }
    if (!sheet.headerRow) info('check.emptySheet')
    else {
      if (sheet.titleAbove) warn('check.titleAbove', { row: sheet.headerRow })
      else if (sheet.headerRow > 1) info('check.headerRow', { row: sheet.headerRow })
      if (!sheet.dataRows) info('check.noRows')
    }
    // con un titolo sopra, intestazioni ripetute e colonne senza nome dipendono dal titolo
    if (sheet.duplicateHeaders.length && !sheet.titleAbove)
      warn('check.duplicateHeaders', { names: sheet.duplicateHeaders.join(', ') })
    if (sheet.errors.length) warn('check.errors', { cells: sheet.errors.join(', ') })
    if (sheet.noResult.length) warn('check.noResult', { cells: sheet.noResult.join(', ') })
    if (sheet.merged.length) warn('check.merged', { cells: sheet.merged.join(', ') })
    if (sheet.unnamedColumns.length && !sheet.titleAbove)
      info('check.unnamedColumns', { columns: sheet.unnamedColumns.join(', ') })
    if (sheet.emptyRows.length) {
      const shown = sheet.emptyRows.slice(0, ROWS).join(', ')
      const more = sheet.emptyRows.length - ROWS
      info('check.emptyRows', { rows: more > 0 ? `${shown} (+${more})` : shown })
    }
    return { sheet, sets, notes }
  })
  // un set il cui foglio non c'era all'apertura non ha dati
  const missingSheets = project.sets
    .filter((s) => !s.data)
    .map((s) => ({ set: s.name, sheet: s.sheet ?? s.name }))
  return { sheets, missingSheets }
}
