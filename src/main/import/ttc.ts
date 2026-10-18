import { copyFile, mkdir, readFile, readdir, stat, writeFile } from 'fs/promises'
import { basename, dirname, extname, join } from 'path'
import { MessageError, msg, type Message } from '../../shared/messages'
import { normalizeTemplate } from '../../shared/model/normalize'
import { LIBRARY_FOLDER, convertTtcProject, parseTtcJson } from '../../shared/import/ttc'
import { PROJECT_FILE } from '../../shared/project'
import type { TtcImportOptions, TtcImportResult } from '../../shared/api'
import { listAssets } from '../project/assets'
import { saveTemplate } from '../project/templates'
import { writeSpreadsheet } from '../project/spreadsheet'

// Importazione di un progetto Tabletop Creator in una cartella nuova: la cartella di origine si
// legge soltanto. La conversione dei dati è in src/shared/import/ttc.ts.

async function exists(path: string): Promise<boolean> {
  try {
    await stat(path)
    return true
  } catch {
    return false
  }
}

async function readJson(path: string): Promise<unknown> {
  return parseTtcJson(await readFile(path, 'utf8'))
}

async function readJsonDir(dir: string, notes: Message[]): Promise<unknown[]> {
  let names: string[]
  try {
    names = (await readdir(dir)).filter((n) => n.endsWith('.json') && !n.startsWith('.')).sort()
  } catch {
    return []
  }
  const out: unknown[] = []
  for (const n of names) {
    try {
      out.push(await readJson(join(dir, n)))
    } catch (e) {
      notes.push(msg('ttc.unreadableFile', { file: n, error: String((e as Error).message ?? e) }))
    }
  }
  return out
}

/** Una cartella è un progetto Tabletop Creator se ha data/blueprints o un file .tcp */
export async function isTtcProject(folder: string): Promise<boolean> {
  if (await exists(join(folder, 'data', 'blueprints'))) return true
  try {
    return (await readdir(folder)).some((n) => n.endsWith('.tcp'))
  } catch {
    return false
  }
}

/** Nome proposto per la cartella del progetto convertito: accanto all'originale */
export function defaultTarget(source: string): string {
  return join(dirname(source), `${basename(source)} GameCreator`)
}

export async function importTtc(opts: TtcImportOptions): Promise<TtcImportResult> {
  const { source, target } = opts
  if (!(await isTtcProject(source)))
    throw new MessageError(msg('ttc.notTtcProject', { folder: source }))
  if (await exists(target)) {
    const entries = (await readdir(target)).filter((n) => !n.startsWith('.'))
    if (entries.length) throw new MessageError(msg('ttc.targetNotEmpty', { folder: target }))
  }

  const notes: Message[] = []
  const data = join(source, 'data')
  const files = {
    project: (await exists(join(data, 'project.json')))
      ? await readJson(join(data, 'project.json'))
      : undefined,
    blueprints: await readJsonDir(join(data, 'blueprints'), notes),
    sets: await readJsonDir(join(data, 'sets'), notes),
    variables: (await exists(join(data, 'variables.json')))
      ? await readJson(join(data, 'variables.json'))
      : undefined
  }
  const assets = await listAssets(source)
  const result = convertTtcProject(files, assets)
  notes.push(...result.notes)

  // le immagini del progetto si copiano con la stessa struttura di cartelle
  await mkdir(target, { recursive: true })
  for (const a of assets) {
    const to = join(target, 'assets', ...a.split('/'))
    await mkdir(dirname(to), { recursive: true })
    await copyFile(join(source, 'assets', ...a.split('/')), to)
  }

  // icone della libreria di Tabletop Creator: si cercano nella cartella indicata
  const missing: string[] = []
  const found = opts.iconFolder ? await indexIcons(opts.iconFolder) : new Map<string, string>()
  for (const ref of result.libraryIcons) {
    const name = ref.slice(ref.lastIndexOf('/') + 1).toLowerCase()
    const file = found.get(name)
    if (!file) {
      missing.push(ref)
      continue
    }
    const to = join(target, 'assets', LIBRARY_FOLDER, ...ref.split('/')) + extname(file)
    await mkdir(dirname(to), { recursive: true })
    await copyFile(file, to)
  }

  for (const raw of result.templates) await saveTemplate(target, normalizeTemplate(raw))
  await mkdir(join(target, 'data'), { recursive: true })
  await writeSpreadsheet(join(target, result.file.dataFile), result.sheets)
  await writeFile(join(target, PROJECT_FILE), JSON.stringify(result.file, null, 2) + '\n', 'utf8')

  return {
    folder: target,
    templates: result.templates.length,
    sets: result.sheets.length,
    cards: result.sheets.reduce((n, s) => n + s.rows.length, 0),
    assets: assets.length,
    variables: Object.keys(result.file.variables ?? {}).length,
    notes,
    missingIcons: missing
  }
}

const ICON_EXT = ['.svg', '.png', '.webp', '.jpg', '.jpeg']

/**
 * Icone per nome di file, senza estensione e in minuscolo, cercate in tutte le sottocartelle.
 * A parità di nome si preferisce l'SVG, poi il PNG più grande (pacchetti con più dimensioni).
 */
async function indexIcons(root: string): Promise<Map<string, string>> {
  const best = new Map<string, { path: string; rank: number; size: number }>()
  let visited = 0
  const walk = async (dir: string, depth: number): Promise<void> => {
    if (depth > 8 || visited > 50000) return
    let entries
    try {
      entries = await readdir(dir, { withFileTypes: true })
    } catch {
      return
    }
    for (const e of entries) {
      if (e.name.startsWith('.')) continue
      const full = join(dir, e.name)
      if (e.isDirectory()) {
        await walk(full, depth + 1)
        continue
      }
      visited++
      const ext = extname(e.name).toLowerCase()
      const rank = ICON_EXT.indexOf(ext)
      if (rank < 0) continue
      const key = e.name.slice(0, -ext.length).toLowerCase()
      const size = (await stat(full)).size
      const prev = best.get(key)
      if (!prev || rank < prev.rank || (rank === prev.rank && size > prev.size))
        best.set(key, { path: full, rank, size })
    }
  }
  await walk(root, 0)
  return new Map([...best].map(([k, v]) => [k, v.path]))
}
