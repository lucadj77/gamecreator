import { readFileSync } from 'fs'
import { join } from 'path'
import { inflateSync } from 'zlib'
import { describe, expect, it } from 'vitest'
import { fontInfo, infoFromPath, isFontAsset } from '../fonts'

const appFonts = join(__dirname, '../../../renderer/src/assets/fonts')
const woff = readFileSync(join(__dirname, 'fixtures/nunito-latin-700-italic.woff'))

/** Ricostruisce un ttf dal woff, per provare la lettura diretta delle tabelle */
function woffToSfnt(buf: Buffer): Buffer {
  const n = buf.readUInt16BE(12)
  const tables = Array.from({ length: n }, (_, i) => {
    const r = 44 + i * 20
    const offset = buf.readUInt32BE(r + 4)
    const comp = buf.readUInt32BE(r + 8)
    const orig = buf.readUInt32BE(r + 12)
    const data = buf.subarray(offset, offset + comp)
    return { tag: buf.subarray(r, r + 4), data: comp < orig ? inflateSync(data) : data }
  })
  const head = Buffer.alloc(12 + n * 16)
  head.writeUInt32BE(0x00010000, 0)
  head.writeUInt16BE(n, 4)
  let offset = head.length
  const body: Buffer[] = []
  tables.forEach((t, i) => {
    const r = 12 + i * 16
    t.tag.copy(head, r)
    head.writeUInt32BE(offset, r + 8)
    head.writeUInt32BE(t.data.length, r + 12)
    const padded = Buffer.alloc(Math.ceil(t.data.length / 4) * 4)
    t.data.copy(padded)
    body.push(padded)
    offset += padded.length
  })
  return Buffer.concat([head, ...body])
}

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
