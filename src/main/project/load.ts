import { readFile, readdir } from 'fs/promises'
import { join } from 'path'
import {
  FORMAT_VERSION,
  PROJECT_FILE,
  type LoadedProject,
  type ProjectFile
} from '../../shared/project'
import { readSpreadsheet } from './spreadsheet'

export async function loadProject(folder: string): Promise<LoadedProject> {
  let file: ProjectFile
  try {
    file = JSON.parse(await readFile(join(folder, PROJECT_FILE), 'utf8'))
  } catch (e) {
    const err = e as NodeJS.ErrnoException
    if (err.code === 'ENOENT')
      throw new Error(`La cartella non contiene ${PROJECT_FILE}`, { cause: e })
    throw new Error(`${PROJECT_FILE} non è leggibile: ${err.message}`, { cause: e })
  }

  const warnings: string[] = []
  if (file.formatVersion > FORMAT_VERSION) {
    warnings.push(
      `Il progetto usa il formato ${file.formatVersion}, più recente di questa versione dell'app`
    )
  }

  const sheets = await readSpreadsheet(join(folder, file.dataFile))
  const byName = new Map(sheets.map((s) => [s.name, s]))

  const sets = (file.sets ?? []).map((def) => {
    const data = byName.get(def.sheet ?? def.name) ?? null
    if (!data) warnings.push(`Il set "${def.name}" non trova il foglio "${def.sheet ?? def.name}"`)
    return { ...def, data }
  })
  const used = new Set(sets.map((s) => s.data?.name))

  let templates: string[] = []
  try {
    templates = (await readdir(join(folder, 'templates')))
      .filter((f) => f.endsWith('.json'))
      .map((f) => f.slice(0, -5))
  } catch {
    // cartella templates assente: va bene finché non si arriva all'editor
  }
  for (const s of sets) {
    if (!templates.includes(s.template)) {
      warnings.push(`Il set "${s.name}" usa il template "${s.template}", che non esiste`)
    }
  }

  return {
    folder,
    file,
    sets,
    unusedSheets: sheets.map((s) => s.name).filter((n) => !used.has(n)),
    templates,
    warnings
  }
}
