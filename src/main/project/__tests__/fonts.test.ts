import { readFileSync } from 'fs'
import { join } from 'path'
import { describe, expect, it } from 'vitest'
import { fontInfo, infoFromPath, isFontAsset } from '../fonts'
import { woffToSfnt } from './sfnt'

const appFonts = join(__dirname, '../../../renderer/src/assets/fonts')
const woff = readFileSync(join(__dirname, 'fixtures/nunito-latin-700-italic.woff'))

describe('fontInfo', () => {
  it('reads a variable woff2', () => {
    const buf = readFileSync(join(appFonts, 'nunito-latin-wght-normal.woff2'))
    expect(fontInfo(buf)).toEqual({ family: 'Nunito', weight: '200 1000', style: 'normal' })
  })

  it('reads the italic variable woff2', () => {
    const buf = readFileSync(join(appFonts, 'nunito-latin-wght-italic.woff2'))
    expect(fontInfo(buf)).toEqual({ family: 'Nunito', weight: '200 1000', style: 'italic' })
  })

  it('reads a static woff', () => {
    expect(fontInfo(woff)).toEqual({ family: 'Nunito', weight: '700', style: 'italic' })
  })

  it('reads a ttf', () => {
    expect(fontInfo(woffToSfnt(woff))).toEqual({ family: 'Nunito', weight: '700', style: 'italic' })
  })

  it('rejects other files', () => {
    expect(fontInfo(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>'))).toBeNull()
  })
})

describe('infoFromPath', () => {
  it('uses the folder as family', () => {
    expect(infoFromPath('fonts/Open Sans/OpenSans-BoldItalic.ttf')).toEqual({
      family: 'Open Sans',
      weight: '700',
      style: 'italic'
    })
  })

  it('uses the file name without a folder', () => {
    expect(infoFromPath('fonts/Cinzel-600.woff2')).toEqual({
      family: 'Cinzel',
      weight: '600',
      style: 'normal'
    })
    expect(infoFromPath('fonts/Cinzel[wght].woff2').weight).toBe('100 900')
    expect(infoFromPath('fonts/Cinzel-SemiBold.otf').weight).toBe('600')
  })
})

describe('isFontAsset', () => {
  it('keeps only font files under fonts/', () => {
    expect(isFontAsset('fonts/a/x.WOFF2')).toBe(true)
    expect(isFontAsset('icons/x.ttf')).toBe(false)
    expect(isFontAsset('fonts/OFL.txt')).toBe(false)
  })
})
