import { copyFile, mkdir, open, readdir, readFile, type FileHandle } from 'fs/promises'
import { homedir } from 'os'
import { basename, extname, join } from 'path'
import {
  FONTS_FOLDER,
  today,
  type AssetsUpdate,
  type Sources,
  type SystemFontFamily
} from '../../shared/library'
import { MessageError, msg } from '../../shared/messages'
import { fontInfo, infoFromTables, readNames, WANTED, type FontInfo } from '../project/fonts'
import { assetsUpdate, updateSources } from './sources'

// Font installati sul computer: si cercano i file nelle cartelle dei font del sistema e se ne
// leggono famiglia, peso e stile, senza caricare i file interi (alcune raccolte superano i
// 50 MB). Un progetto che li usa si vede uguale solo dove sono installati: per questo si possono
// copiare in assets/fonts/, se il file non è una raccolta e la licenza permette l'incorporamento.

const EXTENSIONS = ['.ttf', '.otf', '.ttc', '.otc', '.woff', '.woff2']
const MAX_DEPTH = 4

interface Face extends FontInfo {
  file: string
  /** Il file è una raccolta (ttc): Chromium e il progetto usano solo file con un font */
  collection: boolean
  /** Il produttore vieta l'incorporamento (OS/2 fsType, bit 1) */
  restricted: boolean
  author?: string
  license?: string
  url?: string
}

function fontDirs(): string[] {
  const home = homedir()
  if (process.platform === 'darwin')
    return ['/System/Library/Fonts', '/Library/Fonts', join(home, 'Library/Fonts')]
  if (process.platform === 'win32') {
    const win = process.env.WINDIR ?? 'C:\\Windows'
    const local = process.env.LOCALAPPDATA ?? join(home, 'AppData', 'Local')
    return [join(win, 'Fonts'), join(local, 'Microsoft', 'Windows', 'Fonts')]
  }
  return [
    '/usr/share/fonts',
    '/usr/local/share/fonts',
    join(home, '.local/share/fonts'),
    join(home, '.fonts')
  ]
}

async function listFiles(dir: string, depth = 0, out: string[] = []): Promise<string[]> {
  let entries
  try {
    entries = await readdir(dir, { withFileTypes: true })
  } catch {
    return out
  }
  for (const e of entries) {
    const path = join(dir, e.name)
    if (e.isDirectory()) {
      if (depth < MAX_DEPTH) await listFiles(path, depth + 1, out)
    } else if (EXTENSIONS.includes(extname(e.name).toLowerCase())) out.push(path)
  }
  return out
}

async function readAt(fh: FileHandle, offset: number, length: number): Promise<Buffer> {
  const buf = Buffer.alloc(length)
  const { bytesRead } = await fh.read(buf, 0, length, offset)
  return buf.subarray(0, bytesRead)
}

/** Tabelle name, OS/2 e fvar di un font che inizia a `offset` nel file */
async function sfntTables(fh: FileHandle, offset: number): Promise<Record<string, Buffer>> {
  const head = await readAt(fh, offset, 12)
  if (head.length < 12) return {}
  const n = head.readUInt16BE(4)
  const dir = await readAt(fh, offset + 12, n * 16)
  const out: Record<string, Buffer> = {}
  for (let i = 0; i + 16 <= dir.length; i++) {
    const r = i * 16
    const tag = dir.toString('latin1', r, r + 4)
    if (!WANTED.includes(tag)) continue
    const length = dir.readUInt32BE(r + 12)
    if (length > 4_000_000) continue
    out[tag] = await readAt(fh, dir.readUInt32BE(r + 8), length)
  }
  return out
}

const SPDX: [RegExp, string][] = [
  [/open font license|scripts\.sil\.org\/ofl|openfontlicense/i, 'OFL-1.1'],
  [/apache license/i, 'Apache-2.0'],
  [/ubuntu font licen/i, 'UFL-1.0']
]

function describe(file: string, tables: Record<string, Buffer>, collection: boolean): Face | null {
  const info = infoFromTables(tables)
  if (!info) return null
  const names = tables.name ? readNames(tables.name) : new Map<number, string>()
  const os2 = tables['OS/2']
  const fsType = os2 && os2.length >= 10 ? os2.readUInt16BE(8) : 0
  const licenseText = `${names.get(13) ?? ''} ${names.get(14) ?? ''}`
  return {
    ...info,
    file,
    collection,
    // solo "restricted license embedding" (bit 1) vieta l'incorporamento
    restricted: (fsType & 0x000f) === 0x0002,
    author: names.get(9) || names.get(8) || undefined,
    license: SPDX.find(([re]) => re.test(licenseText))?.[1],
    url: names.get(14) || names.get(11) || undefined
  }
}

export async function readFaces(file: string): Promise<Face[]> {
  const ext = extname(file).toLowerCase()
  if (ext === '.woff' || ext === '.woff2') {
    const info = fontInfo(await readFile(file))
    return info ? [{ ...info, file, collection: false, restricted: false }] : []
  }
  const fh = await open(file, 'r')
  try {
    const head = await readAt(fh, 0, 12)
    if (head.toString('latin1', 0, 4) !== 'ttcf') {
      const face = describe(file, await sfntTables(fh, 0), false)
      return face ? [face] : []
    }
    const count = Math.min(head.readUInt32BE(8), 64)
    const offsets = await readAt(fh, 12, count * 4)
    const out: Face[] = []
    for (let i = 0; i + 4 <= offsets.length; i += 4) {
      const face = describe(file, await sfntTables(fh, offsets.readUInt32BE(i)), true)
      if (face) out.push(face)
    }
    return out
  } finally {
    await fh.close()
  }
}

let scan: Promise<Map<string, Face[]>> | null = null

/** Famiglie per nome in minuscolo; la ricerca si fa una volta per avvio */
function scanFonts(): Promise<Map<string, Face[]>> {
  scan ??= (async () => {
    const files = (await Promise.all(fontDirs().map((d) => listFiles(d)))).flat()
    const families = new Map<string, Face[]>()
    const queue = [...new Set(files)]
    const worker = async (): Promise<void> => {
      for (let file = queue.pop(); file; file = queue.pop()) {
        let faces: Face[] = []
        try {
          faces = await readFaces(file)
        } catch {
          // file illeggibile o protetto: si salta
        }
        for (const f of faces) {
          // le famiglie che iniziano con un punto sono interne al sistema (macOS)
          if (f.family.startsWith('.')) continue
          const key = f.family.toLowerCase()
          families.set(key, [...(families.get(key) ?? []), f])
        }
      }
    }
    await Promise.all(Array.from({ length: 8 }, worker))
    return families
  })()
  return scan
}

export async function systemFonts(): Promise<SystemFontFamily[]> {
  const families = await scanFonts()
  return [...families.values()]
    .map((faces) => {
      const restricted = faces.every((f) => f.restricted)
      const copyable = faces.filter((f) => !f.collection && !f.restricted)
      return {
        family: faces[0].family,
        styles: faces.length,
        copyable: copyable.length > 0,
        ...(copyable.length
          ? {}
          : { reason: restricted ? ('restricted' as const) : ('collection' as const) })
      }
    })
    .sort((a, b) => a.family.localeCompare(b.family))
}

/** Copia i file della famiglia in assets/fonts/<famiglia>/ e ne registra la provenienza */
export async function copySystemFont(folder: string, family: string): Promise<AssetsUpdate> {
  const faces = ((await scanFonts()).get(family.toLowerCase()) ?? []).filter(
    (f) => !f.collection && !f.restricted
  )
  if (!faces.length) throw new MessageError(msg('fonts.cannotCopy', { family }))
  const name = faces[0].family
  const dir = join(folder, 'assets', FONTS_FOLDER, name.replace(/[\\/:*?"<>|]/g, ''))
  await mkdir(dir, { recursive: true })
  const entries: Sources = {}
  for (const f of new Map(faces.map((f) => [f.file, f])).values()) {
    const file = basename(f.file)
    await copyFile(f.file, join(dir, file))
    entries[`${FONTS_FOLDER}/${basename(dir)}/${file}`] = {
      kind: 'font',
      source: 'computer',
      id: name,
      title: `${name} ${f.weight}${f.style === 'italic' ? ' italic' : ''}`,
      ...(f.author ? { author: f.author } : {}),
      license: f.license ?? 'unknown',
      ...(f.url ? { url: f.url } : {}),
      imported: today()
    }
  }
  return assetsUpdate(folder, await updateSources(folder, entries))
}
