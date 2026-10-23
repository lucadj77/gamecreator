import JSZip from 'jszip'
import { mkdir, readFile, rm, writeFile } from 'fs/promises'
import { dirname, join, resolve, sep } from 'path'
import { exists } from '../fs'
import type { PrintedState, ProjectVersion } from '../../shared/project'
import { isManifest } from './backup'
import { loadProject } from './load'

// Versioni del progetto da confrontare con quella di adesso: un backup, o le carte dell'ultima
// esportazione (impronte salvate in .stella-printed.json, un file nascosto che i backup saltano).

const PRINTED = '.stella-printed.json'
/** Lo stesso file, scritto quando l'app si chiamava Naibi: si legge finché non c'è il nuovo */
const OLD_PRINTED = '.naibi-printed.json'

/**
 * Il progetto com'era in un backup: si estrae (senza le immagini, che non servono al confronto)
 * in una cartella temporanea accanto ai backup, si legge e si cancella
 */
export async function readBackupVersion(file: string): Promise<ProjectVersion> {
  const zip = await JSZip.loadAsync(await readFile(file))
  const root = resolve(join(dirname(file), `.compare-${Date.now()}`))
  try {
    await mkdir(root, { recursive: true })
    for (const entry of Object.values(zip.files)) {
      const out = resolve(root, entry.name)
      if (entry.dir || isManifest(entry.name) || !out.startsWith(root + sep)) continue
      await mkdir(dirname(out), { recursive: true })
      await writeFile(out, await entry.async('nodebuffer'))
    }
    const p = await loadProject(root)
    return { file: p.file, sets: p.sets, templates: p.templates }
  } finally {
    await rm(root, { recursive: true, force: true })
  }
}

export async function readPrinted(folder: string): Promise<PrintedState | null> {
  let path = join(folder, PRINTED)
  if (!(await exists(path))) path = join(folder, OLD_PRINTED)
  if (!(await exists(path))) return null
  try {
    const s = JSON.parse(await readFile(path, 'utf8'))
    return typeof s?.date === 'number' && s.sets && typeof s.sets === 'object' ? s : null
  } catch {
    return null
  }
}

export async function savePrinted(folder: string, state: PrintedState): Promise<void> {
  await writeFile(join(folder, PRINTED), JSON.stringify(state) + '\n')
  await rm(join(folder, OLD_PRINTED), { force: true })
}
