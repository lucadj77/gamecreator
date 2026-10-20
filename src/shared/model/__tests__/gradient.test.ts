import { describe, expect, it } from 'vitest'
import { isGradient, linearEnds, mapGradientColors, parseGradient } from '../gradient'

describe('sfumature', () => {
  it('legge angoli, direzioni e posizioni come in CSS', () => {
    expect(parseGradient('linear-gradient(90deg, red, blue 80%)')).toEqual({
      kind: 'linear',
      angle: 90,
      stops: [
        { color: 'red', at: 0 },
        { color: 'blue', at: 0.8 }
      ]
    })
    const g = parseGradient('linear-gradient(to bottom, rgb(1, 2, 3), white, black)')!
    expect(g.angle).toBe(180)
    expect(g.stops.map((s) => [s.color, s.at])).toEqual([
      ['rgb(1, 2, 3)', 0],
      ['white', 0.5],
      ['black', 1]
    ])
    expect(parseGradient('radial-gradient(white, rosso)')?.kind).toBe('radial')
    expect(parseGradient('linear-gradient(to top left, red, blue)')?.angle).toBe(315)
    expect(parseGradient('linear-gradient(To  Right Bottom, red, blue)')?.angle).toBe(135)
    expect(isGradient('#FF0000')).toBe(false)
    expect(parseGradient('linear-gradient(red)')).toBeNull()
  })

  it('risolve i colori e calcola gli estremi nel riquadro', () => {
    expect(
      mapGradientColors('radial-gradient(rosso, blu)', (c) => (c === 'rosso' ? '#A33' : c))
    ).toBe('radial-gradient(#A33 0%, blu 100%)')
    const e = linearEnds(90, { x: 0, y: 0, w: 20, h: 10 })
    expect([e.x1, e.y1, e.x2, e.y2].map((n) => Math.round(n * 1000) / 1000)).toEqual([0, 5, 20, 5])
  })
})
