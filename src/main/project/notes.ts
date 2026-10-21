import { mkdir, readFile, readdir, rename, writeFile } from 'fs/promises'
import { join } from 'path'
import { exists } from '../fs'
import { MessageError, msg } from '../../shared/messages'
import { isValidNoteName, type ProjectNote } from '../../shared/project'
import { deletedPath } from './deleted'

// Note del progetto: un file Markdown per nota in notes/, da scrivere nell'app o con un editor
// qualsiasi; le legge anche un'IA che lavora sul progetto (docs/cli.md).

const dir = (folder: string): string => join(folder, 'notes')

/** Note in notes/*.md, in ordine alfabetico */
export async function readNotes(folder: string): Promise<ProjectNote[]> {
  let files: string[]
  try {
    files = (await readdir(dir(folder))).filter((f) => f.toLowerCase().endsWith('.md'))
  } catch {
    return []
  }
  const notes = await Promise.all(
    files.map(async (f) => ({
      name: f.slice(0, -3),
      text: await readFile(join(dir(folder), f), 'utf8')
    }))
  )
  return notes.sort((a, b) => a.name.localeCompare(b.name))
}

/** Scrive notes/<name>.md; con `oldName` diverso la nota cambia nome */
export async function saveNote(
  folder: string,
  name: string,
  text: string,
  oldName?: string
): Promise<void> {
  if (!isValidNoteName(name)) throw new MessageError(msg('note.invalidName', { name }))
  await mkdir(dir(folder), { recursive: true })
  const target = join(dir(folder), `${name}.md`)
  if (oldName && oldName !== name && isValidNoteName(oldName)) {
    const old = join(dir(folder), `${oldName}.md`)
    if (await exists(target)) throw new MessageError(msg('note.exists', { name }))
    if (await exists(old)) await rename(old, target)
  }
  // file temporaneo e rinomina: un errore a metà non tronca la nota
  const tmp = `${target}.tmp`
  await writeFile(tmp, text, 'utf8')
  await rename(tmp, target)
}

/** Sposta la nota in deleted/ */
export async function trashNote(folder: string, name: string): Promise<void> {
  if (!isValidNoteName(name)) return
  const file = join(dir(folder), `${name}.md`)
  if (await exists(file)) await rename(file, await deletedPath(folder, name, '.md'))
}
