import { describe, expect, it } from 'vitest'
import type { Sheet } from '../../project'
import { normalizeTemplate } from '../normalize'
import { columnStats, columnValues, rowAmounts } from '../stats'

const t = normalizeTemplate({
  name: 't',
  front: [
    { type: 'text', name: 'nome' },
    { type: 'value', name: 'costo', value: '0' },
    { type: 'value', name: 'doppio', source: { kind: 'formula', expr: '={costo}*2' } }
  ]
})

const sheet: Sheet = {
  name: 'S',
  headers: ['amount', 'nome', 'costo', 'tipo'],
  rows: [
    ['2', 'A', '1', 'arma'],
    ['', 'B', '3', 'arma'],
    ['3', 'C', '1', 'magia'],
    ['1', 'D', '', '']
  ]
}

describe('statistiche del set', () => {
  const rows = [0, 1, 2, 3]

  it('conta le carte per valore, con le copie, e somma i numeri', () => {
    const s = columnStats(
      'costo',
      columnValues(sheet, 'costo', rows, t, [t]),
      rowAmounts(sheet, rows)
    )
    expect(s.cards).toBe(7)
    expect(s.groups).toEqual([
      { value: '1', rows: 2, cards: 5 },
      { value: '3', rows: 1, cards: 1 },
      { value: '', rows: 1, cards: 1 }
    ])
    expect(s.numeric).toEqual({ sum: 8, min: 1, max: 3, mean: 8 / 6 })
  })

  it('i testi vanno dal più frequente e non hanno somma', () => {
    const s = columnStats('tipo', columnValues(sheet, 'tipo', rows, t, [t]), [1, 1, 1, 1])
    expect(s.groups.map((g) => [g.value, g.cards])).toEqual([
      ['arma', 2],
      ['magia', 1],
      ['', 1]
    ])
    expect(s.numeric).toBeUndefined()
  })

  it('calcola i livelli con formula che non hanno una colonna', () => {
    expect(columnValues(sheet, 'doppio', [0, 1], t, [t])).toEqual(['2', '6'])
  })
})
