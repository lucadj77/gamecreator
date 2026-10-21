import { mkdir, mkdtemp, readdir, rm, writeFile } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { writeSpreadsheet } from '../spreadsheet'
import { dropDeleted, listDeleted, readDeleted } from '../trash'

let folder: string
beforeEach(async () => {
  folder = await mkdtemp(join(tmpdir(), 'naibi-trash-'))
  const dir = join(folder, 'deleted')
  await mkdir(dir)
  await writeFile(
    join(dir, 'eroe 2026-10-20-10-00-00.json'),
    JSON.stringify({ name: 'eroe', width: 63, height: 88, front: [], back: [] })
  )
  await writeFile(join(dir, 'Idee 2026-10-21-09-30-00.md'), '# Idee')
  await writeSpreadsheet(join(dir, 'Mostri 2026-10-19-08-00-00.xlsx'), [
    { name: 'Mostri', headers: ['amount', 'nome'], rows: [['2', 'Orco']] }
  ])
  await writeFile(join(dir, 'altro.txt'), 'ignorato')
})
afterEach(async () => {
  await rm(folder, { recursive: true, force: true })
})

describe('cestino del progetto', () => {
  it('elenca template, note e fogli dal più recente, con le colonne dei fogli', async () => {
    const list = await listDeleted(folder)
    expect(list.map((x) => [x.kind, x.name, x.date])).toEqual([
      ['note', 'Idee', '2026-10-21T09:30:00Z'],
      ['template', 'eroe', '2026-10-20T10:00:00Z'],
      ['sheet', 'Mostri', '2026-10-19T08:00:00Z']
    ])
    expect(list[2].columns).toEqual(['amount', 'nome'])
  })

  it('legge il contenuto e toglie i ripristinati', async () => {
    expect(await readDeleted(folder, 'Idee 2026-10-21-09-30-00.md')).toEqual({
      kind: 'note',
      name: 'Idee',
      text: '# Idee'
    })
    const tpl = await readDeleted(folder, 'eroe 2026-10-20-10-00-00.json')
    expect(tpl.kind === 'template' && tpl.template.width).toBe(63)
    const sheet = await readDeleted(folder, 'Mostri 2026-10-19-08-00-00.xlsx')
    expect(sheet.kind === 'sheet' && sheet.sheet.rows).toEqual([['2', 'Orco']])
    await dropDeleted(folder, ['Idee 2026-10-21-09-30-00.md'])
    expect((await readdir(join(folder, 'deleted'))).sort()).not.toContain(
      'Idee 2026-10-21-09-30-00.md'
    )
  })

  it('non legge fuori dal cestino', async () => {
    await expect(readDeleted(folder, '../naibi 2026-10-21-09-30-00.json')).rejects.toThrow()
    await expect(dropDeleted(folder, ['altro.txt'])).rejects.toThrow()
  })
})
