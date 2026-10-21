import { describe, expect, it } from 'vitest'
import type { Sheet } from '../../project'
import { normalizeTemplate } from '../normalize'
import { splitAspect, splitImage } from '../split'

const t = normalizeTemplate({
  name: 't',
  width: 60,
  height: 90,
  bleed: 3,
  front: [{ type: 'image', name: 'arte', x: -3, y: -3, w: 66, h: 96 }]
})

const empty: Sheet = { name: 'S', headers: ['amount', 'nome'], rows: [['1', 'a']] }

const cell = (s: Sheet, row: number, h: string): string => s.rows[row][s.headers.indexOf(h)] ?? ''

describe('immagine divisa tra le carte', () => {
  it('con l abbondanza esterna nell immagine ogni carta ha il suo pezzo, abbondanza compresa', () => {
    const s = splitImage(empty, t, {
      layer: 'arte',
      src: 'mappa.png',
      cols: 2,
      rows: 1,
      order: 'rows',
      outerBleed: true,
      start: 0
    })
    expect(s.rows).toHaveLength(2)
    // immagine larga 2 × 60 + 6 = 126 mm, alta 96 mm
    expect(cell(s, 0, 'arte.crop')).toBe('0 0 52.4 100')
    expect(cell(s, 1, 'arte.crop')).toBe('47.6 0 52.4 100')
    expect(cell(s, 1, 'arte.src')).toBe('mappa.png')
    expect(cell(s, 0, 'arte.fit')).toBe('stretch')
    expect(s.headers.includes('arte.x')).toBe(false)
    expect(splitAspect(t, { cols: 2, rows: 1, outerBleed: true })).toBeCloseTo(126 / 96)
  })

  it('senza abbondanza nell immagine, sul bordo il riquadro si ferma all immagine', () => {
    const s = splitImage(empty, t, {
      layer: 'arte',
      src: 'mappa.png',
      cols: 2,
      rows: 2,
      order: 'columns',
      outerBleed: false,
      start: 0
    })
    expect(s.rows).toHaveLength(4)
    // in colonna: la seconda carta è quella sotto la prima
    expect(cell(s, 1, 'arte.crop')).toBe('0 48.3 52.5 51.7')
    expect(cell(s, 0, 'arte.x')).toBe('0')
    expect(cell(s, 0, 'arte.w')).toBe('63')
    expect(cell(s, 0, 'arte.h')).toBe('93')
    expect(cell(s, 3, 'arte.x')).toBe('')
    expect(cell(s, 3, 'arte.w')).toBe('63')
  })
})
