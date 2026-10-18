import { describe, expect, it } from 'vitest'
import type { Sheet } from '../../project'
import { normalizeTemplate } from '../normalize'
import {
  addColumn,
  duplicateRows,
  insertRow,
  moveRow,
  removeColumn,
  removeRows,
  setCell,
  templateColumns
} from '../sheet'

const sheet: Sheet = {
  name: 'S',
  headers: ['amount', 'nome', 'forza'],
  rows: [
    ['1', 'Cavaliere', '4'],
    ['2', 'Arciere', '2'],
    ['', 'Drago', '9']
  ]
}

describe('fogli', () => {
  it('modifica celle e righe', () => {
    expect(setCell(sheet, 1, 2, '3').rows[1]).toEqual(['2', 'Arciere', '3'])
    expect(setCell(sheet, 1, 2, '2')).toBe(sheet)
    expect(insertRow(sheet, 1).rows[1]).toEqual(['', '', ''])
    expect(duplicateRows(sheet, [0, 2]).rows.map((r) => r[1])).toEqual([
      'Cavaliere',
      'Cavaliere',
      'Arciere',
      'Drago',
      'Drago'
    ])
    expect(removeRows(sheet, [0, 1]).rows).toEqual([['', 'Drago', '9']])
    expect(moveRow(sheet, 0, 2).rows.map((r) => r[1])).toEqual(['Arciere', 'Drago', 'Cavaliere'])
  })

  it('aggiunge le colonne delle proprietà accanto al livello', () => {
    const s = addColumn(sheet, 'nome.color')
    expect(s.headers).toEqual(['amount', 'nome', 'nome.color', 'forza'])
    expect(s.rows[0]).toEqual(['1', 'Cavaliere', '', '4'])
    expect(addColumn(sheet, 'testo').headers.at(-1)).toBe('testo')
    expect(removeColumn(s, 2)).toEqual(sheet)
  })

  it('ricava le colonne dal template', () => {
    const t = normalizeTemplate({
      name: 't',
      front: [
        { type: 'text', name: 'nome' },
        { type: 'shape', name: 'banda' },
        { type: 'text', name: 'fisso', source: { kind: 'fixed' } },
        { type: 'image', name: 'cover', source: { kind: 'formula', expr: '{nome}' } },
        { type: 'value', name: 'forza' },
        { type: 'text', name: 'altro', source: { kind: 'column', column: 'titolo' } }
      ]
    })
    expect(templateColumns(t)).toEqual(['amount', 'nome', 'forza', 'titolo'])
  })
})
