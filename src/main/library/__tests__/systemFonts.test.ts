import { mkdtemp, readFile, rm, writeFile } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { sfntToTtc, woffToSfnt } from '../../project/__tests__/sfnt'

vi.mock('electron', () => ({ net: {} }))

const { readFaces } = await import('../systemFonts')
const woff = await readFile(
  join(__dirname, '../../project/__tests__/fixtures/nunito-latin-700-italic.woff')
)

describe('font installati', () => {
  let dir = ''
  afterEach(() => rm(dir, { recursive: true, force: true }))

  it('legge un ttf e una raccolta senza caricare il file intero', async () => {
    dir = await mkdtemp(join(tmpdir(), 'naibi-fonts-'))
    const ttf = join(dir, 'Nunito-BoldItalic.ttf')
    const ttc = join(dir, 'Nunito.ttc')
    await writeFile(ttf, woffToSfnt(woff))
    await writeFile(ttc, sfntToTtc(woff))
    const face = { family: 'Nunito', weight: '700', style: 'italic', restricted: false }
    expect(await readFaces(ttf)).toEqual([
      expect.objectContaining({ ...face, file: ttf, collection: false })
    ])
    expect(await readFaces(ttc)).toEqual([
      expect.objectContaining({ ...face, file: ttc, collection: true })
    ])
    expect((await readFaces(ttf))[0].license).toBe('OFL-1.1')
  })
})
