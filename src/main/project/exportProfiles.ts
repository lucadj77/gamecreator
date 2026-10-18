import { readFile, rename, writeFile } from 'fs/promises'
import { join } from 'path'
import { PROJECT_FILE, type ProjectFile } from '../../shared/project'
import type { ExportProfiles } from '../../shared/export'

/**
 * Ricorda le opzioni dell'ultima esportazione in gamecreator.json. Si tocca solo la chiave
 * export del file su disco: le altre modifiche non salvate restano al comando Salva.
 */
export async function saveExportProfiles(folder: string, profiles: ExportProfiles): Promise<void> {
  const target = join(folder, PROJECT_FILE)
  const file: ProjectFile = JSON.parse(await readFile(target, 'utf8'))
  file.export = profiles
  const tmp = target + '.tmp'
  await writeFile(tmp, JSON.stringify(file, null, 2) + '\n', 'utf8')
  await rename(tmp, target)
}
