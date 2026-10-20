import { describe, expect, it } from 'vitest'
import { parseValue } from '../bind'
import { cropRect, cropText, parseCrop } from '../crop'

describe('crop', () => {
  it('keeps the crop inside the image and drops the whole image', () => {
    expect(cropRect({ x: 0.5, y: -1, w: 0.8, h: 0.5 })).toEqual({ x: 0.5, y: 0, w: 0.5, h: 0.5 })
    expect(cropRect({ x: 0, y: 0, w: 1, h: 1 })).toBeNull()
    expect(cropRect(null)).toBeNull()
  })
  it('writes and reads the percentages of a cell', () => {
    const c = { x: 0.1, y: 0, w: 0.5, h: 0.255 }
    expect(cropText(c)).toBe('10 0 50 25.5')
    expect(parseCrop('10 0 50 25.5')).toEqual(c)
    expect(parseCrop('10%; 0%; 50%; 25,5%')).toEqual(c)
    expect(parseCrop('none')).toBeNull()
    expect(parseCrop('10 20')).toBeUndefined()
  })
  it('is a property that a column can change', () => {
    expect(parseValue('crop', null, '0 0 50 50')).toEqual({ x: 0, y: 0, w: 0.5, h: 0.5 })
    expect(parseValue('crop', { x: 0, y: 0, w: 0.5, h: 0.5 }, 'none')).toBeNull()
  })
})
