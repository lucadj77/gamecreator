import JSZip from 'jszip'
import { createWriteStream } from 'fs'
import { mkdir, readdir, readFile, rename, rm, stat, writeFile } from 'fs/promises'
import { basename, dirname, join, relative, resolve, sep } from 'path'
import type { BackupItem, BackupSettings } from '../../shared/api'

// Copie di sicurezza del progetto: un file zip con la cartella del progetto, tranne export/ e i
// file nascosti, in una cartella fuori dal progetto (così non finisce nei backup successivi e
// non si sincronizza con il progetto). Vedi docs/specifica.md, sezione 12.

export const DEFAULT_BACKUP_SETTINGS: BackupSettings = { folder: '', auto: true, keep: 10 }

/** Un backup automatico non si ripete se l'ultimo ha meno di un'ora */
const AUTO_MIN_INTERVAL = 60 * 60 * 1000

/** Estensioni già compresse: zipparle di nuovo costa tempo senza ridurle */
const STORED = ['.png', '.jpg', '.jpeg', '.webp', '.zip', '.woff', '.woff2', '.gz']

/** Nome della sottocartella dei backup di un progetto */
export function backupDirName(projectName: string): string {
  return projectName.replace(/[\\/:*?"<>|]/g, '-').trim() || 'progetto'
}

function stamp(d: Date): string {
  const p = (n: number): string => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}.${p(d.getMinutes())}.${p(d.getSeconds())}`
}

const NAME_RE = /^(.*) (\d{4})-(\d\d)-(\d\d) (\d\d)\.(\d\d)\.(\d\d)( auto)?\.zip$/

export async function listBackups(dir: string): Promise<BackupItem[]> {
  let names: string[]
  try {
    names = await readdir(dir)
  } catch {
    return []
  }
  const items: BackupItem[] = []
  for (const name of names) {
    const m = NAME_RE.exec(name)
    if (!m) continue
    const [, , y, mo, d, h, mi, s, auto] = m
    const date = new Date(+y, +mo - 1, +d, +h, +mi, +s).getTime()
    const size = (await stat(join(dir, name))).size
    items.push({ file: join(dir, name), name, date, size, auto: !!auto })
  }
  return items.sort((a, b) => b.date - a.date)
}

/** File del progetto da salvare, con percorsi relativi e "/" come separatore */
async function projectFiles(folder: string, exclude: string[]): Promise<string[]> {
  const out: string[] = []
  const walk = async (dir: string): Promise<void> => {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      if (entry.name.startsWith('.')) continue
      const full = join(dir, entry.name)
      if (exclude.some((e) => full === e || full.startsWith(e + sep))) continue
      if (entry.isDirectory()) await walk(full)
      else if (entry.isFile()) out.push(relative(folder, full).split(sep).join('/'))
    }
  }
  await walk(folder)
  return out.sort()
}

export async function createBackup(
  folder: string,
  projectName: string,
  dir: string,
  auto = false,
  now = new Date()
): Promise<BackupItem> {
  const root = resolve(folder)
  const files = await projectFiles(root, [join(root, 'export'), resolve(dir)])
  const zip = new JSZip()
  for (const f of files) {
    const lower = f.toLowerCase()
    zip.file(f, await readFile(join(root, f)), {
      compression: STORED.some((e) => lower.endsWith(e)) ? 'STORE' : 'DEFLATE'
    })
  }
  await mkdir(dir, { recursive: true })
  const name = `${backupDirName(projectName)} ${stamp(now)}${auto ? ' auto' : ''}.zip`
  const file = join(dir, name)
  const tmp = file + '.tmp'
  await new Promise<void>((ok, fail) => {
    zip
      .generateNodeStream({ type: 'nodebuffer', streamFiles: true })
      .pipe(createWriteStream(tmp))
      .on('finish', ok)
      .on('error', fail)
  })
  await rename(tmp, file)
  return { file, name, date: now.getTime(), size: (await stat(file)).size, auto }
}

/** Toglie i backup automatici oltre i più recenti `keep`; quelli fatti a mano restano */
export async function pruneBackups(dir: string, keep: number): Promise<void> {
  const auto = (await listBackups(dir)).filter((b) => b.auto)
  for (const b of auto.slice(Math.max(0, keep))) await rm(b.file, { force: true })
}

/** Backup all'apertura: solo se l'ultimo è abbastanza vecchio. Restituisce null se non serve */
export async function autoBackup(
  folder: string,
  projectName: string,
  dir: string,
  settings: BackupSettings,
  now = new Date()
): Promise<BackupItem | null> {
  if (!settings.auto) return null
  const last = (await listBackups(dir))[0]
  if (last && now.getTime() - last.date < AUTO_MIN_INTERVAL) return null
  const item = await createBackup(folder, projectName, dir, true, now)
  await pruneBackups(dir, settings.keep)
  return item
}

/**
 * Estrae un backup in una cartella nuova accanto al progetto, senza toccare l'originale.
 * Restituisce la cartella creata.
 */
export async function restoreBackup(file: string, parent: string): Promise<string> {
  const zip = await JSZip.loadAsync(await readFile(file))
  const base = basename(file, '.zip').replace(/ auto$/, '')
  // il nome del backup contiene già la data: basta aggiungere un numero se esiste
  let target = join(parent, base)
  for (let n = 2; await exists(target); n++) target = join(parent, `${base} ${n}`)
  const root = resolve(target)
  for (const entry of Object.values(zip.files)) {
    if (entry.dir) continue
    const out = resolve(root, entry.name)
    // un nome come ../x uscirebbe dalla cartella: si ignora
    if (!out.startsWith(root + sep)) continue
    await mkdir(dirname(out), { recursive: true })
    await writeFile(out, await entry.async('nodebuffer'))
  }
  await mkdir(root, { recursive: true })
  return root
}

async function exists(path: string): Promise<boolean> {
  try {
    await stat(path)
    return true
  } catch {
    return false
  }
}

// --- impostazioni, nei dati dell'app come i progetti recenti ---

export async function readBackupSettings(file: string): Promise<BackupSettings> {
  try {
    const s = JSON.parse(await readFile(file, 'utf8'))
    return {
      folder: typeof s.folder === 'string' ? s.folder : '',
      auto: typeof s.auto === 'boolean' ? s.auto : DEFAULT_BACKUP_SETTINGS.auto,
      keep:
        Number.isFinite(s.keep) && s.keep >= 1 ? Math.round(s.keep) : DEFAULT_BACKUP_SETTINGS.keep
    }
  } catch {
    return { ...DEFAULT_BACKUP_SETTINGS }
  }
}

export async function writeBackupSettings(file: string, settings: BackupSettings): Promise<void> {
  await mkdir(dirname(file), { recursive: true })
  await writeFile(file, JSON.stringify(settings, null, 2) + '\n', 'utf8')
}
