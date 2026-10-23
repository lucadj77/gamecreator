import { mkdir, mkdtemp, rm, writeFile } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { loadProject } from '../load'

let folder: string

beforeEach(async () => {
  folder = await mkdtemp(join(tmpdir(), 'stella-load-'))
  await mkdir(join(folder, 'templates'))
})

afterEach(async () => {
  await rm(folder, { recursive: true, force: true })
})

const template = (name: string): string =>
  JSON.stringify({ name, width: 63, height: 88, front: [], back: [] })

describe('lettura del progetto', () => {
  it('un file di progetto senza dataFile è un errore chiaro', async () => {
    await writeFile(join(folder, 'stella.json'), '{"name":"x","formatVersion":1}')
    await expect(loadProject(folder)).rejects.toThrow(/dataFile missing/)
  })

  it('due file con lo stesso nome di template: vale il primo, con avviso', async () => {
    await writeFile(
      join(folder, 'stella.json'),
      JSON.stringify({ name: 'x', formatVersion: 1, dataFile: 'data/cards.xlsx', sets: [] })
    )
    await writeFile(join(folder, 'templates', 'a.json'), template('Carta'))
    await writeFile(join(folder, 'templates', 'b.json'), template('Carta'))
    const p = await loadProject(folder)
    expect(p.templates.map((t) => t.name)).toEqual(['Carta'])
    expect(p.templates[0].file).toBe('a')
    expect(p.warnings.map((w) => w.key)).toContain('load.duplicateTemplate')
  })
})
