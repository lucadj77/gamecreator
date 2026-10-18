import { describe, expect, it } from 'vitest'
import { anchorPoint, hitTest, normalizeAngle, resizeWithHandle, rotateAround } from '../geometry'
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
