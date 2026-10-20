import { describe, expect, it } from 'vitest'
import type { Sheet } from '../../project'
import { computedValues, rowToCard } from '../bind'
import { hitTest } from '../geometry'
import { normalizeTemplate } from '../normalize'
import { booleanColumns, boolText, parseBool, setColumns, writeCells } from '../sheet'

const t = normalizeTemplate({
  name: 't',
  front: [
    { type: 'text', name: 'nome' },
    { type: 'text', name: 'fisso', text: 'Attacco', source: { kind: 'fixed' } },
    { type: 'value', name: 'doppio', source: { kind: 'formula', expr: '={forza}*2' } },
    { type: 'value', name: 'forza', value: '1' },
    { type: 'value', name: 'eroe', value: 'false' },
    { type: 'shape', name: 'banda' }
  ]
})

const sheet: Sheet = {
  name: 'S',
  headers: ['amount', 'nome', 'fisso', 'nome.italic', 'raro'],
  rows: [
    ['1', 'Cavaliere', 'vecchio', '', 'TRUE'],
    ['', 'Drago', '', 'true', '']
  ]
}

describe('colonne del set', () => {
  it('mostra le colonne del foglio, poi quelle che il template legge, poi le calcolate', () => {
    const cols = setColumns(sheet, t)
    expect(cols.map((c) => [c.header, c.index, c.computed])).toEqual([
      ['amount', 0, false],
      ['nome', 1, false],
      ['fisso', 2, true],
      ['nome.italic', 3, false],
      ['raro', 4, false],
      ['forza', -1, false],
      ['eroe', -1, false],
      ['doppio', -1, true]
    ])
  })

  it('crea la colonna scrivendoci un valore, non per un valore vuoto', () => {
    expect(writeCells(sheet, [0], 'forza', '')).toBe(sheet)
    const s = writeCells(sheet, [0, 1], 'forza', '3')
    expect(s.headers).toContain('forza')
    const i = s.headers.indexOf('forza')
    expect(s.rows.map((r) => r[i])).toEqual(['3', '3'])
  })

  it('riconosce le colonne vero/falso', () => {
    const b = booleanColumns(sheet, t)
    expect(b.get('nome.italic')).toBe(false)
    expect(b.get('raro')).toBeNull()
    expect(b.get('eroe')).toBe(false)
    expect(b.has('nome')).toBe(false)
    expect(b.has('amount')).toBe(false)
    expect(parseBool(' False ')).toBe(false)
    expect(parseBool('sì')).toBeNull()
    expect(boolText(sheet, 'raro', false)).toBe('FALSE')
    expect(boolText(sheet, 'nome.italic', true)).toBe('true')
  })

  it('calcola i livelli fissi e con formula', () => {
    const v = computedValues(t, rowToCard(['forza'], ['4']))
    expect(v.fisso).toBe('Attacco')
    expect(v.doppio).toBe('8')
    expect(v.nome).toBeUndefined()
  })
})

describe('clic sui livelli', () => {
  it('prende i figli di un gruppo dove sono disposti', () => {
    const g = normalizeTemplate({
      name: 'g',
      front: [
        {
          type: 'group',
          name: 'fila',
          x: 0,
          y: 0,
          w: 30,
          h: 10,
          layout: 'row',
          repeat: '3',
          children: [{ type: 'shape', name: 'pallino', x: 0, y: 0, w: 5, h: 5 }]
        }
      ]
    }).front[0]
    // la terza copia è più a destra del figlio salvato
    expect(hitTest(g, { x: 16, y: 4 })).toBe(true)
  })

  it('allarga la tolleranza per le linee sottili', () => {
    const line = normalizeTemplate({
      name: 'l',
      front: [{ type: 'shape', name: 'riga', x: 0, y: 10, w: 20, h: 0.2 }]
    }).front[0]
    expect(hitTest(line, { x: 5, y: 11 })).toBe(false)
    expect(hitTest(line, { x: 5, y: 11 }, 1.5)).toBe(true)
  })
})
