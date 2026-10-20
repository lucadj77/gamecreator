import { readFile, rename, writeFile } from 'fs/promises'
import { join } from 'path'
import type { ProjectFile, Sheet } from '../../shared/project'
import { projectFilePath } from './projectFile'
import { keepDeletedSheets, writeSpreadsheet } from './spreadsheet'

export interface DataChanges {
  /** File di progetto aggiornato, se sono cambiati i set */
  file?: ProjectFile
  /** Fogli modificati o nuovi */
  sheets: Sheet[]
  /** Fogli dei set eliminati: escono dal file dati e vanno in deleted/ */
  removed?: string[]
}

/** Salva i fogli e, se serve, il file di progetto; prima i dati, così un set nuovo ha già il foglio */
export async function saveData(folder: string, changes: DataChanges): Promise<void> {
  // il file dati si legge dal progetto su disco: il renderer non sceglie dove scrivere
  const target = await projectFilePath(folder)
  const current: ProjectFile = JSON.parse(await readFile(target, 'utf8'))
  const data = join(folder, current.dataFile)
  const removed = changes.removed ?? []
  // la copia in deleted/ prima di toglierli: se non riesce il file dati resta com'era
  await keepDeletedSheets(folder, data, removed)
  if (changes.sheets.length || removed.length) await writeSpreadsheet(data, changes.sheets, removed)
  if (changes.file) {
    changes.file.dataFile = current.dataFile
    const tmp = target + '.tmp'
    await writeFile(tmp, JSON.stringify(changes.file, null, 2) + '\n', 'utf8')
    await rename(tmp, target)
  }
}
