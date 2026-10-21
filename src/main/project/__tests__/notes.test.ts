import { mkdtemp, readdir, rm } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { readNotes, saveNote, trashNote } from '../notes'

let folder: string
beforeEach(async () => {
  folder = await mkdtemp(join(tmpdir(), 'naibi-notes-'))
})
afterEach(async () => {
  await rm(folder, { recursive: true, force: true })
})

describe('note del progetto', () => {
  it('scrive, rinomina e legge le note in ordine alfabetico', async () => {
    expect(await readNotes(folder)).toEqual([])
    await saveNote(folder, 'Zeta', 'ultima')
    await saveNote(folder, 'Idee', '# Idee\n- una')
    await saveNote(folder, 'Promemoria', '# Idee\n- una\n- due', 'Idee')
    expect(await readNotes(folder)).toEqual([
      { name: 'Promemoria', text: '# Idee\n- una\n- due' },
      { name: 'Zeta', text: 'ultima' }
    ])
  })

  it('non rinomina sopra una nota che esiste e rifiuta i nomi non validi', async () => {
    await saveNote(folder, 'a', '1')
    await saveNote(folder, 'b', '2')
    await expect(saveNote(folder, 'b', '1', 'a')).rejects.toThrow()
    await expect(saveNote(folder, 'a/b', '')).rejects.toThrow()
    await expect(saveNote(folder, '.nascosta', '')).rejects.toThrow()
  })

  it('una nota eliminata va in deleted/', async () => {
    await saveNote(folder, 'vecchia', 'testo')
    await trashNote(folder, 'vecchia')
    expect(await readNotes(folder)).toEqual([])
    expect((await readdir(join(folder, 'deleted')))[0]).toMatch(/^vecchia .*\.md$/)
  })
})
