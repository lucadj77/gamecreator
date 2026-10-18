import { readFile, readdir } from 'fs/promises'
import { join } from 'path'
import {
  FORMAT_VERSION,
  PROJECT_FILE,
  type LoadedProject,
  type ProjectFile
} from '../../shared/project'
import { readSpreadsheet } from './spreadsheet'
import { listAssets } from './assets'
import { readProjectFonts } from './fonts'
import { readSources } from '../library/sources'
import { duplicateNames, normalizeTemplate } from '../../shared/model/normalize'
import type { Template } from '../../shared/model/template'
import { MessageError, messageFromError, msg, type Message } from '../../shared/messages'

export async function loadProject(folder: string): Promise<LoadedProject> {
  let file: ProjectFile
  try {
    file = JSON.parse(await readFile(join(folder, PROJECT_FILE), 'utf8'))
  } catch (e) {
    const err = e as NodeJS.ErrnoException
    if (err.code === 'ENOENT')
      throw new MessageError(msg('load.noProjectFile', { file: PROJECT_FILE }))
    throw new MessageError(
      msg('load.unreadableProjectFile', { file: PROJECT_FILE, error: err.message })
    )
  }

  const warnings: Message[] = []
  if (file.formatVersion > FORMAT_VERSION) {
    warnings.push(msg('load.newerFormat', { version: file.formatVersion }))
  }

  const sheets = await readSpreadsheet(join(folder, file.dataFile))
  const byName = new Map(sheets.map((s) => [s.name, s]))

  const sets = (file.sets ?? []).map((def) => {
    const data = byName.get(def.sheet ?? def.name) ?? null
    if (!data)
      warnings.push(msg('load.missingSheet', { set: def.name, sheet: def.sheet ?? def.name }))
    return { ...def, data }
  })
  const used = new Set(sets.map((s) => s.data?.name))

  const templates = await loadTemplates(folder, warnings)
  for (const s of sets) {
    if (!templates.some((t) => t.name === s.template)) {
      warnings.push(msg('load.missingTemplate', { set: s.name, template: s.template }))
    }
  }

  const assets = await listAssets(folder)
  return {
    folder,
    file,
    sets,
    unusedSheets: sheets.map((s) => s.name).filter((n) => !used.has(n)),
    unusedData: sheets.filter((s) => !used.has(s.name)),
    templates,
    assets,
    fonts: await readProjectFonts(folder, assets),
    sources: await readSources(folder),
    warnings
  }
}

async function loadTemplates(folder: string, warnings: Message[]): Promise<Template[]> {
  let files: string[]
  try {
    files = (await readdir(join(folder, 'templates'))).filter((f) => f.endsWith('.json'))
  } catch {
    return []
  }
  const templates: Template[] = []
  for (const f of files.sort()) {
    try {
      const raw = JSON.parse(await readFile(join(folder, 'templates', f), 'utf8'))
      const file = f.slice(0, -5)
      const t = normalizeTemplate({ ...raw, name: raw.name ?? file })
      if (t.name !== file) t.file = file
      const dup = duplicateNames(t)
      if (dup.length)
        warnings.push(msg('load.duplicateLayers', { template: t.name, names: dup.join(', ') }))
      templates.push(t)
    } catch (e) {
      const m = messageFromError(e)
      warnings.push(
        m.key === 'error.generic'
          ? msg('load.unreadableTemplate', { file: f, error: String(m.params?.text) })
          : { ...m, params: { ...m.params, file: f } }
      )
    }
  }
  return templates
}
