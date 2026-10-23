import { mkdtemp, rm, writeFile } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'
import { afterEach, describe, expect, it } from 'vitest'
import { projectFilePath } from '../projectFile'

describe('file di progetto', () => {
  let dir = ''
  afterEach(() => rm(dir, { recursive: true, force: true }))

  it('preferisce stella.json, accetta naibi.json e gamecreator.json e di base usa stella.json', async () => {
    dir = await mkdtemp(join(tmpdir(), 'stella-test-'))
    expect(await projectFilePath(dir)).toBe(join(dir, 'stella.json'))
    await writeFile(join(dir, 'gamecreator.json'), '{}')
    expect(await projectFilePath(dir)).toBe(join(dir, 'gamecreator.json'))
    await writeFile(join(dir, 'naibi.json'), '{}')
    expect(await projectFilePath(dir)).toBe(join(dir, 'naibi.json'))
    await writeFile(join(dir, 'stella.json'), '{}')
    expect(await projectFilePath(dir)).toBe(join(dir, 'stella.json'))
  })
})
