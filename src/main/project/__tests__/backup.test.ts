import { describe, expect, it } from 'vitest'
import { mkdtemp, mkdir, readdir, readFile, writeFile } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'
import { autoBackup, createBackup, listBackups, pruneBackups, restoreBackup } from '../backup'

async function project(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'naibi-backup-'))
  const folder = join(root, 'Assedio')
  await mkdir(join(folder, 'assets', 'icons'), { recursive: true })
  await mkdir(join(folder, 'export'), { recursive: true })
  await writeFile(join(folder, 'naibi.json'), '{"name":"Assedio"}')
  await writeFile(join(folder, 'assets', 'icons', 'spada.svg'), '<svg/>')
  await writeFile(join(folder, 'export', 'carte.pdf'), 'pdf')
  await writeFile(join(folder, '.DS_Store'), 'x')
  return folder
}

describe('backup', () => {
  it('salva il progetto senza export e file nascosti, e lo ripristina accanto', async () => {
    const folder = await project()
    const dir = join(folder, '..', 'backup')
    const item = await createBackup(folder, 'Assedio', dir, false, new Date(2026, 9, 19, 15, 30, 5))
    expect(item.name).toBe('Assedio 2026-10-19 15.30.05.zip')
    const list = await listBackups(dir)
    expect(list.map((b) => [b.name, b.auto])).toEqual([[item.name, false]])

    const restored = await restoreBackup(item.file, join(folder, '..'))
    expect(restored.endsWith('Assedio 2026-10-19 15.30.05')).toBe(true)
    expect((await readdir(restored)).sort()).toEqual(['assets', 'naibi.json'])
    expect(await readFile(join(restored, 'assets', 'icons', 'spada.svg'), 'utf8')).toBe('<svg/>')
    // un secondo ripristino non sovrascrive il primo
    expect(await restoreBackup(item.file, join(folder, '..'))).toBe(restored + ' 2')
  })

  it('non include la cartella dei backup se sta dentro il progetto', async () => {
    const folder = await project()
    const dir = join(folder, 'backup')
    await createBackup(folder, 'Assedio', dir, false, new Date(2026, 9, 19, 10, 0, 0))
    const second = await createBackup(folder, 'Assedio', dir, false, new Date(2026, 9, 19, 11, 0))
    const restored = await restoreBackup(second.file, await mkdtemp(join(tmpdir(), 'naibi-r-')))
    expect((await readdir(restored)).sort()).toEqual(['assets', 'naibi.json'])
  })

  it("automatico: non più di uno all'ora, e tiene solo gli ultimi", async () => {
    const folder = await project()
    const dir = join(folder, '..', 'backup')
    const settings = { folder: '', auto: true, keep: 2 }
    const at = (h: number, m = 0): Date => new Date(2026, 9, 19, h, m)
    expect(await autoBackup(folder, 'Assedio', dir, settings, at(9))).not.toBeNull()
    expect(await autoBackup(folder, 'Assedio', dir, settings, at(9, 30))).toBeNull()
    await createBackup(folder, 'Assedio', dir, false, at(9, 45))
    expect(await autoBackup(folder, 'Assedio', dir, settings, at(11))).not.toBeNull()
    expect(await autoBackup(folder, 'Assedio', dir, settings, at(13))).not.toBeNull()
    const names = (await listBackups(dir)).map((b) => b.name)
    // il manuale resta, degli automatici solo gli ultimi due
    expect(names).toEqual([
      'Assedio 2026-10-19 13.00.00 auto.zip',
      'Assedio 2026-10-19 11.00.00 auto.zip',
      'Assedio 2026-10-19 09.45.00.zip'
    ])
    expect(
      await autoBackup(folder, 'Assedio', dir, { ...settings, auto: false }, at(20))
    ).toBeNull()
    await pruneBackups(dir, 1)
    expect((await listBackups(dir)).length).toBe(2)
  })
})
