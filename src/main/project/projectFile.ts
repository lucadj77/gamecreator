import { access } from 'fs/promises'
import { join } from 'path'
import { LEGACY_PROJECT_FILES, PROJECT_FILE } from '../../shared/project'

/**
 * Percorso del file di progetto: stella.json, oppure naibi.json o gamecreator.json nei progetti
 * creati prima dei cambi di nome, che continuano a salvare nel file che hanno già. Senza nessuno dei due si
 * restituisce stella.json.
 */
export async function projectFilePath(folder: string): Promise<string> {
  for (const name of [PROJECT_FILE, ...LEGACY_PROJECT_FILES]) {
    const path = join(folder, name)
    try {
      await access(path)
      return path
    } catch {
      // si prova il nome successivo
    }
  }
  return join(folder, PROJECT_FILE)
}
