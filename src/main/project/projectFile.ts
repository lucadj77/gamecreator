import { access } from 'fs/promises'
import { join } from 'path'
import { LEGACY_PROJECT_FILE, PROJECT_FILE } from '../../shared/project'

/**
 * Percorso del file di progetto: naibi.json, oppure gamecreator.json nei progetti creati prima
 * del cambio di nome, che continuano a salvare nel file che hanno già. Senza nessuno dei due si
 * restituisce naibi.json.
 */
export async function projectFilePath(folder: string): Promise<string> {
  for (const name of [PROJECT_FILE, LEGACY_PROJECT_FILE]) {
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
