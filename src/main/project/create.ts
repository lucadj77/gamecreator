import { copyFile, mkdir, readdir, writeFile } from 'fs/promises'
import { basename, extname, join } from 'path'
import { FORMAT_VERSION, PROJECT_FILE, type ProjectFile } from '../../shared/project'
import { projectFolderName } from '../../shared/model/projectName'
import { MessageError, msg } from '../../shared/messages'

/** Cartelle di ogni progetto, anche vuote: ci si possono mettere i file prima di usarli */
export const PROJECT_FOLDERS = ['data', 'templates', 'assets', 'assets/fonts', 'docs', 'notes']

/**
 * Crea un progetto vuoto in <parent>/<nome>: naibi.json e le cartelle. Il file dati si
 * scrive al primo salvataggio di un set, oppure è la copia di `existing`, un file che c'è già:
 * i suoi fogli diventano set con "Nuovo set". La cartella deve essere nuova o vuota.
 */
export async function createProject(
  name: string,
  parent: string,
  data: 'xlsx' | 'ods' = 'xlsx',
  existing?: string
): Promise<string> {
  const folderName = projectFolderName(name)
  if (!folderName || !parent.trim()) throw new MessageError(msg('newProject.invalidName'))
  const ext = existing ? extname(existing).toLowerCase() : ''
  if (existing && !['.xlsx', '.ods', '.csv'].includes(ext))
    throw new MessageError(msg('load.unsupportedDataFile', { ext }))
  const folder = join(parent, folderName)
  try {
    const entries = (await readdir(folder)).filter((n) => !n.startsWith('.'))
    if (entries.length) throw new MessageError(msg('newProject.notEmpty', { folder }))
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== 'ENOENT') throw e
  }
  for (const sub of PROJECT_FOLDERS) await mkdir(join(folder, sub), { recursive: true })
  const file: ProjectFile = {
    formatVersion: FORMAT_VERSION,
    name: name.trim(),
    dataFile: existing
      ? `data/${basename(existing)}`
      : data === 'ods'
        ? 'data/cards.ods'
        : 'data/cards.xlsx',
    sets: []
  }
  if (existing) await copyFile(existing, join(folder, file.dataFile))
  await writeFile(join(folder, PROJECT_FILE), JSON.stringify(file, null, 2) + '\n', {
    encoding: 'utf8',
    flag: 'wx'
  })
  return folder
}
