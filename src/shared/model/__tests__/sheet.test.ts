import { describe, expect, it } from 'vitest'
import type { Sheet } from '../../project'
import { normalizeTemplate } from '../normalize'
import {
  addColumn,
  applyOrder,
  colorColumns,
  duplicateRows,
  insertRow,
  moveRow,
  moveRows,
  removeColumn,
  removeRows,
  setCell,
  templateColumns,
  viewRows,
  NO_VIEW
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

describe('colonne dei colori', () => {
  it('riconosce le proprietà colore e il riempimento delle forme', () => {
    const t = normalizeTemplate({
      name: 't',
      front: [
        { type: 'text', name: 'nome', color: '#112233' },
        { type: 'image', name: 'icona' },
        { type: 'shape', name: 'banda', fill: '#2F5DA8' }
      ]
    })
    const cols = colorColumns(t)
    expect(cols.get('nome.color')).toBe('#112233')
    expect(cols.get('icona.tint')).toBeNull()
    expect(cols.get('banda')).toBe('#2F5DA8')
    expect(cols.has('nome')).toBe(false)
  })
})

describe('ordinamento e filtro della vista', () => {
  const s = {
    name: 'x',
    headers: ['nome', 'forza'],
    rows: [
      ['Strega', '3'],
      ['Àncora', '10'],
      ['**Arciere**', ''],
      ['cavaliere', '4']
    ]
  }
  it('ordina i numeri come numeri e lascia le celle vuote in fondo', () => {
    expect(viewRows(s, { ...NO_VIEW, sort: 'forza' })).toEqual([0, 3, 1, 2])
    expect(viewRows(s, { ...NO_VIEW, sort: 'forza', desc: true })).toEqual([1, 3, 0, 2])
  })
  it('ordina i testi senza markup, maiuscole e accenti', () => {
    expect(viewRows(s, { ...NO_VIEW, sort: 'nome' })).toEqual([1, 2, 3, 0])
  })
  it('filtra in tutte le colonne o in una sola', () => {
    expect(viewRows(s, { ...NO_VIEW, filter: 'ARC' })).toEqual([2])
    expect(viewRows(s, { ...NO_VIEW, filter: 'anc' })).toEqual([1])
    expect(viewRows(s, { ...NO_VIEW, filter: '4', filterColumn: 'nome' })).toEqual([])
  })
  it("applica l'ordine al foglio, comprese le righe filtrate", () => {
    const sorted = applyOrder(s, { ...NO_VIEW, sort: 'forza', filter: 'zzz' })
    expect(sorted.rows.map((r) => r[0])).toEqual(['Strega', 'cavaliere', 'Àncora', '**Arciere**'])
  })
})

describe('moveRows', () => {
  const s: Sheet = { name: 'x', headers: ['n'], rows: [['a'], ['b'], ['c'], ['d'], ['e']] }
  const names = (x: Sheet): string => x.rows.map((r) => r[0]).join('')
  it('moves the rows together, in their order, before the given row', () => {
    const r = moveRows(s, [3, 1], 0)
    expect(names(r.sheet)).toBe('bdace')
    expect(r.rows).toEqual([0, 1])
  })
  it('moves them to the end', () => {
    const r = moveRows(s, [0, 2], 5)
    expect(names(r.sheet)).toBe('bdeac')
    expect(r.rows).toEqual([3, 4])
  })
  it('counts the target in the original sheet', () => {
    const r = moveRows(s, [0, 1], 4)
    expect(names(r.sheet)).toBe('cdabe')
    expect(r.rows).toEqual([2, 3])
  })
  it('leaves the sheet alone when nothing changes', () => {
    expect(moveRows(s, [1, 2], 1).sheet).toBe(s)
  })
})
