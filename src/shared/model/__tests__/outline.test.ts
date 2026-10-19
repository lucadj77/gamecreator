import { describe, expect, it } from 'vitest'
import { outlinePath } from '../outline'

const grid = (w: number, h: number, on: (x: number, y: number) => boolean): Uint8Array => {
  const a = new Uint8Array(w * h)
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) a[y * w + x] = on(x, y) ? 255 : 0
  return a
}

describe("contorno di un'immagine", () => {
  it('un quadrato pieno diventa quattro punti in coordinate 0-1', () => {
    const d = outlinePath(
      grid(10, 10, (x, y) => x >= 2 && x < 8 && y >= 2 && y < 8),
      10,
      10
    )
    expect(d).toBe('M0.2 0.2L0.8 0.2L0.8 0.8L0.2 0.8Z')
  })

  it('un buco resta un anello a parte, i granelli si scartano', () => {
    const ring = (x: number, y: number): boolean =>
      x >= 1 && x < 19 && y >= 1 && y < 19 && !(x >= 6 && x < 14 && y >= 6 && y < 14)
    const d = outlinePath(
      grid(20, 20, (x, y) => ring(x, y) || (x === 0 && y === 19)),
      20,
      20
    )
    expect(d.match(/M/g)).toHaveLength(2)
  })

  it('un cerchio si semplifica', () => {
    const d = outlinePath(
      grid(100, 100, (x, y) => Math.hypot(x - 49.5, y - 49.5) < 40),
      100,
      100
    )
    const points = d.split(/[ML]/).length - 1
    expect(points).toBeGreaterThan(12)
    expect(points).toBeLessThan(120)
  })
})
