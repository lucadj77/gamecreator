import JSZip from 'jszip'
import { createHash } from 'crypto'
import { createWriteStream } from 'fs'
import { copyFile, mkdir, readdir, readFile, rename, rm, stat, writeFile } from 'fs/promises'
import { basename, dirname, extname, join, relative, resolve, sep } from 'path'
import type { BackupItem, BackupSettings } from '../../shared/api'

// Copie di sicurezza del progetto: un file zip con la cartella del progetto, tranne export/ e i
// file nascosti, in una cartella fuori dal progetto (così non finisce nei backup successivi e
// non si sincronizza con il progetto). Vedi docs/specifica.md, sezione 12.
// I file di assets/ (immagini, font) cambiano di rado: non vanno nello zip ma in una cartella
// comune a tutti i backup del progetto, una sola volta per contenuto, con il nome dato dal loro
// hash; lo zip ne contiene l'elenco. Così dieci backup non sono dieci copie delle immagini.

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

/** Cartella comune dei file di assets/, dentro la cartella dei backup del progetto */
const STORE = 'assets'
/** Elenco dei file di assets/ nello zip: percorso nel progetto → file nella cartella comune */
const MANIFEST = 'naibi-backup.json'

interface Manifest {
  version: 1
  assets: Record<string, string>
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
  const manifest: Manifest = { version: 1, assets: {} }
  await mkdir(join(dir, STORE), { recursive: true })
  for (const f of files) {
    const data = await readFile(join(root, f))
    if (f.startsWith('assets/')) {
      const blob = createHash('sha256').update(data).digest('hex') + extname(f).toLowerCase()
      const target = join(dir, STORE, blob)
      if (!(await exists(target))) {
        await copyFile(join(root, f), target + '.tmp')
        await rename(target + '.tmp', target)
      }
      manifest.assets[f] = blob
      continue
    }
    const lower = f.toLowerCase()
    zip.file(f, data, {
      compression: STORED.some((e) => lower.endsWith(e)) ? 'STORE' : 'DEFLATE'
    })
  }
  zip.file(MANIFEST, JSON.stringify(manifest, null, 1))
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

async function readManifest(zip: JSZip): Promise<Manifest> {
  const entry = zip.file(MANIFEST)
  if (!entry) return { version: 1, assets: {} }
  const m = JSON.parse(await entry.async('string'))
  return { version: 1, assets: m && typeof m.assets === 'object' ? m.assets : {} }
}

/**
 * Toglie i backup automatici oltre i più recenti `keep` (quelli fatti a mano restano), poi i
 * file della cartella comune che nessun backup rimasto usa
 */
export async function pruneBackups(dir: string, keep: number): Promise<void> {
  const auto = (await listBackups(dir)).filter((b) => b.auto)
  for (const b of auto.slice(Math.max(0, keep))) await rm(b.file, { force: true })
  const used = new Set<string>()
  for (const b of await listBackups(dir)) {
    try {
      const m = await readManifest(await JSZip.loadAsync(await readFile(b.file)))
      Object.values(m.assets).forEach((blob) => used.add(blob))
    } catch {
      // uno zip illeggibile non deve far cancellare i file degli altri: non si pulisce nulla
      return
    }
  }
  let blobs: string[]
  try {
    blobs = await readdir(join(dir, STORE))
  } catch {
    return
  }
  for (const blob of blobs) if (!used.has(blob)) await rm(join(dir, STORE, blob), { force: true })
}

/** Spazio occupato da tutti i backup del progetto, cartella comune compresa */
export async function backupsSize(dir: string): Promise<number> {
  let total = 0
  for (const sub of [dir, join(dir, STORE)]) {
    let names: string[]
    try {
      names = await readdir(sub)
    } catch {
      continue
    }
    for (const n of names) {
      const st = await stat(join(sub, n))
      if (st.isFile()) total += st.size
    }
  }
  return total
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
  const manifest = await readManifest(zip)
  const base = basename(file, '.zip').replace(/ auto$/, '')
  // il nome del backup contiene già la data: basta aggiungere un numero se esiste
  let target = join(parent, base)
  for (let n = 2; await exists(target); n++) target = join(parent, `${base} ${n}`)
  const root = resolve(target)
  // un nome come ../x uscirebbe dalla cartella: si ignora
  const inside = (name: string): string | null => {
    const out = resolve(root, name)
    return out.startsWith(root + sep) ? out : null
  }
  for (const entry of Object.values(zip.files)) {
    const out = inside(entry.name)
    if (entry.dir || entry.name === MANIFEST || !out) continue
    await mkdir(dirname(out), { recursive: true })
    await writeFile(out, await entry.async('nodebuffer'))
  }
  const store = resolve(dirname(file), STORE)
  const missing: string[] = []
  for (const [path, blob] of Object.entries(manifest.assets)) {
    const out = inside(path)
    const source = resolve(store, blob)
    if (!out || dirname(source) !== store) continue
    await mkdir(dirname(out), { recursive: true })
    await copyFile(source, out).catch(() => missing.push(path))
  }
  await mkdir(root, { recursive: true })
  if (missing.length) console.error('backup: missing assets', missing)
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
