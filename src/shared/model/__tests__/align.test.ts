import { describe, expect, it } from 'vitest'
import { alignLayers, arrangeGrid, distributeLayers } from '../align'
import { findLayer } from '../edit'
import { normalizeTemplate } from '../normalize'
import { linesOf, snapBox } from '../snap'
import { parseValue } from '../bind'
import type { Template } from '../template'

const tpl = normalizeTemplate({
  name: 't',
  width: 60,
  height: 90,
  safeMargin: 3,
  front: [
    { type: 'shape', id: 'a', name: 'a', x: 10, y: 10, w: 10, h: 10 },
    { type: 'shape', id: 'b', name: 'b', x: 30, y: 20, w: 6, h: 4 },
    { type: 'shape', id: 'c', name: 'c', x: 44, y: 40, w: 4, h: 8 }
  ]
})

const pos = (t: Template, id: string): [number, number] => {
  const l = findLayer(t.front, id)!
  return [l.x, l.y]
}

describe('allineamento', () => {
  it('allinea alla selezione e alla carta', () => {
    const left = alignLayers(tpl, 'front', ['a', 'b', 'c'], 'left', 'selection')
    expect(['a', 'b', 'c'].map((id) => pos(left, id)[0])).toEqual([10, 10, 10])
    const bottom = alignLayers(tpl, 'front', ['a', 'b'], 'bottom', 'card')
    expect(pos(bottom, 'a')[1]).toBe(80)
    expect(pos(bottom, 'b')[1]).toBe(86)
    const safe = alignLayers(tpl, 'front', ['a'], 'right', 'safe')
    expect(pos(safe, 'a')[0]).toBe(47)
  })

  it('con un solo livello la selezione vale come carta', () => {
    const c = alignLayers(tpl, 'front', ['b'], 'hcenter', 'selection')
    expect(pos(c, 'b')[0]).toBe(27)
  })

  it('distribuisce con spazi uguali', () => {
    const d = distributeLayers(tpl, 'front', ['a', 'b', 'c'], 'h', 'selection')
    // estremi fermi (10 e 48), larghezze 10+6+4: spazi di 9
    expect(pos(d, 'a')[0]).toBe(10)
    expect(pos(d, 'b')[0]).toBe(29)
    expect(pos(d, 'c')[0]).toBe(44)
    const onCard = distributeLayers(tpl, 'front', ['a', 'c'], 'v', 'card')
    expect(pos(onCard, 'a')[1]).toBe(0)
    expect(pos(onCard, 'c')[1]).toBe(82)
  })

  it('dispone a griglia in ordine di lettura', () => {
    const g = arrangeGrid(
      tpl,
      'front',
      ['a', 'b', 'c'],
      { columns: 2, rows: 1, gapX: 2, gapY: 2 },
      'selection'
    )
    // celle 10×10 dall'angolo (10, 10): a, b nella prima riga, c sotto
    expect(pos(g, 'a')).toEqual([10, 10])
    expect(pos(g, 'b')).toEqual([24, 13])
    expect(pos(g, 'c')).toEqual([13, 23])
  })
})

describe('magnetismo', () => {
  it('aggancia il lato più vicino entro la soglia', () => {
    const lines = linesOf([{ x: 10, y: 10, w: 10, h: 10 }])
    const hit = snapBox({ x: 20.4, y: 50, w: 5, h: 5 }, lines, 1)
    expect(hit.x).toEqual({ delta: expect.closeTo(-0.4), line: 20 })
    expect(hit.y).toBeNull()
  })
})

describe('valori in percentuale', () => {
  it('legge zoom e opacità in percentuale', () => {
    expect(parseValue('zoom', 1, '120%')).toBeCloseTo(1.2)
    expect(parseValue('zoom', 1, '0,8')).toBe(0.8)
    expect(parseValue('stroke', null, 'red/0.5/dashed')).toEqual({
      color: 'red',
      width: 0.5,
      dash: 'dashed'
    })
    expect(parseValue('size', 10, '50%')).toBeUndefined()
  })
})
