import { describe, expect, it } from 'vitest'
import { gridGeometry, type GridSpec } from '../grid'

const base: GridSpec = {
  w: 50,
  h: 40,
  cell: 'square',
  rows: 4,
  columns: 5,
  cellRatio: 1,
  orientation: 'pointy',
  interlock: false,
  gap: 0,
  padding: 0,
  zoom: 1,
  alignX: 'center',
  alignY: 'center',
  radius: 0
}

/** Numeri di un tracciato, a coppie x y */
const points = (d: string): number[][] => {
  const v = d.match(/-?\d+(\.\d+)?/g)!.map(Number)
  const out: number[][] = []
  for (let i = 0; i + 1 < v.length; i += 2) out.push([v[i], v[i + 1]])
  return out
}

describe('griglia', () => {
  it('a zoom 1 (100%) riempie il riquadro senza deformare le caselle', () => {
    const g = gridGeometry(base)
    expect(g.cells).toHaveLength(20)
    // 5 colonne in 50 mm, 4 righe in 40: caselle da 10
    expect(g.bounds).toEqual({ x: 0, y: 0, w: 50, h: 40 })
    expect(points(g.cells[0])).toEqual([
      [0, 0],
      [10, 0],
      [10, 10],
      [0, 10]
    ])
  })

  it('lo spazio tra le caselle e il margine restano in mm', () => {
    const g = gridGeometry({ ...base, w: 100, gap: 2, padding: 1 })
    // l'altezza comanda: 40 = 2·1 + 4 s + 3·2 → s = 8
    expect(g.bounds.h).toBeCloseTo(40)
    expect(g.bounds.w).toBeCloseTo(2 + 5 * 8 + 4 * 2)
    expect(g.bounds.x).toBeCloseTo((100 - 50) / 2)
    expect(points(g.cells[1])[0][0] - points(g.cells[0])[0][0]).toBeCloseTo(10)
  })

  it('zoom e allineamento', () => {
    const g = gridGeometry({ ...base, zoom: 0.5, alignX: 'start', alignY: 'end' })
    expect(g.bounds).toEqual({ x: 0, y: 20, w: 25, h: 20 })
  })

  it('esagoni ad alveare: le righe dispari si spostano di mezza casella', () => {
    const g = gridGeometry({ ...base, cell: 'hex', interlock: true, rows: 2, columns: 2 })
    const top = (d: string): number[] => points(d)[0]
    // il vertice in alto della casella sotto, a destra di mezza casella
    const a = top(g.cells[0])
    const c = top(g.cells[2])
    const w = top(g.cells[1])[0] - a[0]
    expect(c[0] - a[0]).toBeCloseTo(w / 2)
    // e salita di un quarto: le caselle si toccano
    const h = (w * 2) / Math.sqrt(3)
    expect(c[1] - a[1]).toBeCloseTo(h * 0.75)
    expect(g.bounds.w).toBeLessThanOrEqual(50 + 1e-9)
    expect(g.bounds.h).toBeLessThanOrEqual(40 + 1e-9)
  })

  it('triangoli alternati e angoli arrotondati', () => {
    const g = gridGeometry({ ...base, cell: 'triangle', interlock: true, rows: 1, columns: 3 })
    expect(points(g.cells[0])[0][1]).toBeLessThan(points(g.cells[1])[0][1] + 1)
    const round = gridGeometry({ ...base, radius: 2 })
    expect(round.cells[0]).toContain('Q')
    expect(gridGeometry({ ...base, cell: 'circle', radius: 2 }).cells[0]).toContain('A')
  })
})
