import { describe, expect, it } from 'vitest'
import {
  lineEnds,
  lineFromEnds,
  constrainAxis,
  hexagonPoints,
  anchorPoint,
  hitTest,
  normalizeAngle,
  polygonVertices,
  resizeWithHandle,
  rotateAround,
  roundedPolygonPath
} from '../geometry'
import type { ShapeLayer } from '../template'
import { normalizeLayer } from '../normalize'

const rect = normalizeLayer({ type: 'shape', name: 'r', x: 10, y: 10, w: 20, h: 10 }, 0)

const close = (a: number, b: number): void => expect(a).toBeCloseTo(b, 6)

describe('geometria', () => {
  it('colpisce i livelli tenendo conto della rotazione', () => {
    expect(hitTest(rect, { x: 12, y: 12 })).toBe(true)
    expect(hitTest(rect, { x: 20, y: 22 })).toBe(false)
    const rotated = { ...rect, rotation: 90 }
    // ruotato di 90° intorno al centro (20, 15): diventa alto 20 e largo 10
    expect(hitTest(rotated, { x: 20, y: 22 })).toBe(true)
    expect(hitTest(rotated, { x: 12, y: 15 })).toBe(false)
  })

  it('ridimensiona dal lato tenendo fermo quello opposto', () => {
    expect(resizeWithHandle(rect, 'e', { x: 40, y: 0 })).toEqual({ x: 10, y: 10, w: 30, h: 10 })
    expect(resizeWithHandle(rect, 'nw', { x: 5.2, y: 4.9 }, { step: 0.5 })).toEqual({
      x: 5,
      y: 5,
      w: 25,
      h: 15
    })
    const kept = resizeWithHandle(rect, 'se', { x: 50, y: 21 }, { keepRatio: true })
    expect(kept.w / kept.h).toBeCloseTo(2)
  })

  it("con le proporzioni bloccate un lato trascina anche l'altra misura, centrata", () => {
    expect(resizeWithHandle(rect, 'e', { x: 50, y: 0 }, { keepRatio: true })).toEqual({
      x: 10,
      y: 5,
      w: 40,
      h: 20
    })
    expect(resizeWithHandle(rect, 'n', { x: 0, y: 5 }, { keepRatio: true })).toEqual({
      x: 5,
      y: 5,
      w: 30,
      h: 15
    })
  })

  it('con il livello ruotato il lato opposto resta fermo sulla carta', () => {
    const r = { ...rect, rotation: 30 }
    const fixedBefore = rotateAround({ x: r.x, y: r.y + r.h / 2 }, anchorPoint(r), r.rotation)
    const b = resizeWithHandle(r, 'e', { x: 45, y: 15 })
    const after = { ...r, ...b }
    const fixedAfter = rotateAround(
      { x: after.x, y: after.y + after.h / 2 },
      anchorPoint(after),
      r.rotation
    )
    close(fixedAfter.x, fixedBefore.x)
    close(fixedAfter.y, fixedBefore.y)
    close(b.w, 35)
  })

  it('normalizza gli angoli', () => {
    expect(normalizeAngle(190)).toBe(-170)
    expect(normalizeAngle(-180)).toBe(180)
    expect(normalizeAngle(45)).toBe(45)
  })
})

describe('roundedPolygonPath', () => {
  const square = [
    { x: 0, y: 0 },
    { x: 10, y: 0 },
    { x: 10, y: 10 },
    { x: 0, y: 10 }
  ]
  it('senza raggio disegna angoli vivi', () => {
    expect(roundedPolygonPath(square, 0)).toBe('M0,0 L10,0 L10,10 L0,10 Z')
  })
  it('arrotonda gli angoli del quadrato come un rettangolo con raggio', () => {
    const d = roundedPolygonPath(square, 2)
    expect(d.startsWith('M0,2 A2,2 0 0 1 2,0 L8,0 A2,2 0 0 1 10,2')).toBe(true)
  })
  it('riduce il raggio se i lati sono troppo corti', () => {
    expect(roundedPolygonPath(square, 20)).toContain('A5,5')
  })
  it("negli angoli interni della stella l'arco gira al contrario", () => {
    const star = polygonVertices(
      normalizeLayer(
        { type: 'shape', shape: 'star', name: 's', sides: 5, innerRatio: 0.5, w: 20, h: 20 },
        0
      ) as ShapeLayer
    )
    const sweeps = [...roundedPolygonPath(star, 1).matchAll(/A[\d.]+,[\d.]+ 0 0 (\d)/g)].map(
      (m) => m[1]
    )
    expect(sweeps).toEqual(['1', '0', '1', '0', '1', '0', '1', '0', '1', '0'])
  })
})

describe('esagono della carta', () => {
  it('ha i lati piatti in alto se è più largo, le punte se è più alto', () => {
    expect(hexagonPoints(0, 0, 40, 30)[0]).toEqual({ x: 10, y: 0 })
    expect(hexagonPoints(0, 0, 30, 40)[0]).toEqual({ x: 15, y: 0 })
    expect(hexagonPoints(0, 0, 30, 40)).toHaveLength(6)
  })
})

describe('linea da A a B', () => {
  it('ricava posizione, lunghezza e angolo dagli estremi e viceversa', () => {
    const l = normalizeLayer({ type: 'shape', shape: 'line', x: 0, y: 0, w: 10, h: 0 }, 0)
    const A = { x: 10, y: 20 }
    const B = { x: 40, y: 60 }
    const placed = { ...l, ...lineFromEnds(l, A, B) }
    expect(placed.w).toBeCloseTo(50)
    const [a, b] = lineEnds(placed)
    expect(a.x).toBeCloseTo(10)
    expect(a.y).toBeCloseTo(20)
    expect(b.x).toBeCloseTo(40)
    expect(b.y).toBeCloseTo(60)
    // con l'ancoraggio in alto a sinistra gli estremi restano gli stessi
    const corner = { ...l, anchor: 'top-left' as const, h: 4 }
    const [c, d] = lineEnds({ ...corner, ...lineFromEnds(corner, A, B) })
    expect([c.x, c.y, d.x, d.y].map((v) => Math.round(v * 1000) / 1000)).toEqual([10, 20, 40, 60])
  })
})

describe('modificatori del trascinamento', () => {
  it('Maiuscolo: l asse più vicino tra orizzontale, verticale e 45°', () => {
    expect(constrainAxis(10, 2)).toBe('x')
    expect(constrainAxis(-1, 9)).toBe('y')
    expect(constrainAxis(5, -6)).toBe('diagonal')
    expect(constrainAxis(0, 0)).toBe(null)
  })

  it('dal centro: il lato opposto si muove in modo simmetrico', () => {
    const l = { x: 10, y: 10, w: 20, h: 10, rotation: 0 }
    expect(resizeWithHandle(l as never, 'e', { x: 35, y: 0 }, { fromCenter: true })).toEqual({
      x: 5,
      y: 10,
      w: 30,
      h: 10
    })
    // angolo con le proporzioni: si allarga attorno al centro
    expect(
      resizeWithHandle(l as never, 'se', { x: 40, y: 15 }, { fromCenter: true, keepRatio: true })
    ).toEqual({ x: 0, y: 5, w: 40, h: 20 })
  })
})
