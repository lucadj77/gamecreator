import { describe, expect, it } from 'vitest'
import {
  hslToRgb,
  hsvToRgb,
  parseHex,
  parseRgbFunction,
  rgbToHsl,
  rgbToHsv,
  toHex
} from '../colorMath'

describe('hex', () => {
  it('reads short and long codes, with transparency', () => {
    expect(parseHex('#f00')).toEqual({ r: 255, g: 0, b: 0, a: 1 })
    expect(parseHex('#00000080')!.a).toBeCloseTo(0.502, 2)
    expect(parseHex('red')).toBeNull()
  })
  it('writes #RRGGBB, adding alpha only when transparent', () => {
    expect(toHex({ r: 163, g: 58, b: 42, a: 1 })).toBe('#A33A2A')
    expect(toHex({ r: 0, g: 0, b: 0, a: 0.5 })).toBe('#00000080')
  })
  it('reads the rgb() of the browser', () => {
    expect(parseRgbFunction('rgb(1, 2, 3)')).toEqual({ r: 1, g: 2, b: 3, a: 1 })
    expect(parseRgbFunction('rgba(1, 2, 3, 0.5)')!.a).toBe(0.5)
  })
})

describe('hsv and hsl', () => {
  const samples = ['#A33A2A', '#336699', '#FFFFFF', '#000000', '#7FFF00', '#808080']
  it('go back to the same color', () => {
    for (const hex of samples) {
      const c = parseHex(hex)!
      expect(toHex(hsvToRgb(rgbToHsv(c)))).toBe(hex)
      expect(toHex(hslToRgb(rgbToHsl(c)))).toBe(hex)
    }
  })
  it('match known values', () => {
    const hsl = rgbToHsl(parseHex('#336699')!)
    expect(Math.round(hsl.h)).toBe(210)
    expect(Math.round(hsl.s)).toBe(50)
    expect(Math.round(hsl.l)).toBe(40)
    expect(toHex(hslToRgb({ h: 0, s: 100, l: 50 }))).toBe('#FF0000')
    expect(toHex(hsvToRgb({ h: 120, s: 100, v: 100 }))).toBe('#00FF00')
  })
})
