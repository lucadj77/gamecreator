import { describe, expect, it } from 'vitest'
import type { SheetInspection } from '../../dataCheck'
import type { LoadedProject } from '../../project'
import type { Template } from '../template'
import { checkDataFile } from '../dataCheck'

const inspection = (over: Partial<SheetInspection>): SheetInspection => ({
  name: 'Truppe',
  headerRow: 1,
  headers: ['amount', 'nome'],
  dataRows: 3,
  titleAbove: false,
  emptyRows: [],
  duplicateHeaders: [],
  unnamedColumns: [],
  merged: [],
  errors: [],
  noResult: [],
  ...over
})

const template = { name: 'rosse', front: [], back: [] } as unknown as Template

describe('checkDataFile', () => {
  it('collega i fogli ai set, elenca le colonne mancanti e le anomalie', () => {
    const data = { name: 'Truppe', headers: ['amount', 'nome'], rows: [] }
    const project = {
      sets: [
        { name: 'Rosse', template: 'rosse', data },
        { name: 'Gialle', template: 'rosse', sheet: 'Truppe', data },
        { name: 'Perso', template: 'rosse', data: null }
      ],
      templates: [template]
    } as unknown as LoadedProject
    const check = checkDataFile(project, [
      inspection({ titleAbove: true, headerRow: 2, errors: ['C4 #N/A'] }),
      inspection({ name: 'Analisi', emptyRows: [3, 4] })
    ])
    expect(check.sheets[0].sets.map((s) => s.name)).toEqual(['Rosse', 'Gialle'])
    expect(check.sheets[0].notes.map((n) => [n.level, n.message.key])).toEqual([
      ['warning', 'check.titleAbove'],
      ['warning', 'check.errors']
    ])
    expect(check.sheets[1].sets).toEqual([])
    expect(check.sheets[1].notes.map((n) => n.message.key)).toEqual(['check.emptyRows'])
    expect(check.missingSheets).toEqual([{ set: 'Perso', sheet: 'Perso' }])
  })
})
