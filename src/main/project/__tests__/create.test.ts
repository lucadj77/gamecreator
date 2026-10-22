import { mkdtemp, readFile, writeFile } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'
import { describe, expect, it } from 'vitest'
import { createProject } from '../create'

describe('createProject', () => {
  it('con un file che c’è già ne mette una copia in data/', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'gc-'))
    const source = join(dir, 'Gioco.csv')
    await writeFile(source, 'nome\nDrago\n')
    const folder = await createProject('Prova', dir, undefined, source)
    const file = JSON.parse(await readFile(join(folder, 'naibi.json'), 'utf8'))
    expect(file.dataFile).toBe('data/Gioco.csv')
    expect(await readFile(join(folder, 'data', 'Gioco.csv'), 'utf8')).toBe('nome\nDrago\n')
    await expect(createProject('Altro', dir, undefined, join(dir, 'x.xls'))).rejects.toThrow()
  })
})
