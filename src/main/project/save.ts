import { readFile, rename, writeFile } from 'fs/promises'
import { join } from 'path'
import { PROJECT_FILE, type ProjectFile, type Sheet } from '../../shared/project'
import { writeSpreadsheet } from './spreadsheet'

export interface DataChanges {
  /** File di progetto aggiornato, se sono cambiati i set */
  file?: ProjectFile
  /** Fogli modificati o nuovi */
  sheets: Sheet[]
}

/** Salva i fogli e, se serve, gamecreator.json; prima i dati, così un set nuovo ha già il foglio */
export async function saveData(folder: string, changes: DataChanges): Promise<void> {
  // il file dati si legge dal progetto su disco: il renderer non sceglie dove scrivere
  const current: ProjectFile = JSON.parse(await readFile(join(folder, PROJECT_FILE), 'utf8'))
  if (changes.sheets.length) await writeSpreadsheet(join(folder, current.dataFile), changes.sheets)
  if (changes.file) {
    changes.file.dataFile = current.dataFile
    const target = join(folder, PROJECT_FILE)
    const tmp = target + '.tmp'
    await writeFile(tmp, JSON.stringify(changes.file, null, 2) + '\n', 'utf8')
    await rename(tmp, target)
  }
}
