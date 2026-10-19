import { readFile } from 'fs/promises'
import { join } from 'path'
import { brotliDecompressSync, inflateSync } from 'zlib'
import { FONT_EXTENSIONS, type ProjectFont } from '../../shared/project'

// Font del progetto: i file sotto assets/fonts/. Famiglia, peso e stile si leggono dal file
// (tabelle name, OS/2 e fvar); se il file non si legge si ricavano dal percorso.

export async function readProjectFonts(folder: string, assets: string[]): Promise<ProjectFont[]> {
  const files = assets.filter(isFontAsset)
  const out: ProjectFont[] = []
  for (const path of files) {
    let info: FontInfo | null
    try {
      info = fontInfo(await readFile(join(folder, 'assets', path)))
    } catch {
      info = null
    }
    out.push({ path, ...(info ?? infoFromPath(path)) })
  }
  return out
}

export function isFontAsset(path: string): boolean {
  const p = path.toLowerCase()
  return p.startsWith('fonts/') && FONT_EXTENSIONS.some((e) => p.endsWith(e))
}

export type FontInfo = Omit<ProjectFont, 'path'>

/** Legge un file ttf, otf, woff o woff2; null se il formato non è riconosciuto */
export function fontInfo(buf: Buffer): FontInfo | null {
  const tables = readTables(buf)
  return tables ? infoFromTables(tables) : null
}

/** Famiglia, peso e stile dalle tabelle name, OS/2 e fvar */
export function infoFromTables(tables: Record<string, Buffer>): FontInfo | null {
  const names = tables.name ? readNames(tables.name) : new Map<number, string>()
  let family = names.get(16) ?? names.get(21) ?? names.get(1)
  if (!family) return null
  const sub = (names.get(17) ?? names.get(2) ?? '').toLowerCase()

  let weight = '400'
  let italic = /italic|oblique/.test(sub)
  const os2 = tables['OS/2']
  if (os2 && os2.length >= 64) {
    weight = String(os2.readUInt16BE(4))
    // bit 0 corsivo, bit 9 obliquo
    const sel = os2.readUInt16BE(62)
    italic = (sel & 1) !== 0 || (sel & 0x200) !== 0
  }
  const axis = tables.fvar ? readAxis(tables.fvar, 'wght') : null
  if (axis) {
    weight = axis[0] === axis[1] ? String(axis[0]) : `${axis[0]} ${axis[1]}`
    // senza il nome tipografico (16) alcuni font variabili hanno nel nome il peso predefinito,
    // come "Nunito ExtraLight": la famiglia di un font variabile non dipende dal peso
    if (!names.has(16)) family = family.replace(WEIGHT_SUFFIX, '') || family
  }
  return { family, weight, style: italic ? 'italic' : 'normal' }
}

export const WANTED = ['name', 'OS/2', 'fvar']

function readTables(buf: Buffer): Record<string, Buffer> | null {
  if (buf.length < 12) return null
  const sig = buf.toString('latin1', 0, 4)
  if (sig === 'wOFF') return readWoff(buf)
  if (sig === 'wOF2') return readWoff2(buf)
  if (sig === '\0\x01\0\0' || sig === 'OTTO' || sig === 'true') return readSfnt(buf)
  return null
}

function readSfnt(buf: Buffer): Record<string, Buffer> {
  const n = buf.readUInt16BE(4)
  const out: Record<string, Buffer> = {}
  for (let i = 0; i < n; i++) {
    const r = 12 + i * 16
    const tag = buf.toString('latin1', r, r + 4)
    if (!WANTED.includes(tag)) continue
    const offset = buf.readUInt32BE(r + 8)
    out[tag] = buf.subarray(offset, offset + buf.readUInt32BE(r + 12))
  }
  return out
}

function readWoff(buf: Buffer): Record<string, Buffer> {
  const n = buf.readUInt16BE(12)
  const out: Record<string, Buffer> = {}
  for (let i = 0; i < n; i++) {
    const r = 44 + i * 20
    const tag = buf.toString('latin1', r, r + 4)
    if (!WANTED.includes(tag)) continue
    const offset = buf.readUInt32BE(r + 4)
    const comp = buf.readUInt32BE(r + 8)
    const orig = buf.readUInt32BE(r + 12)
    const data = buf.subarray(offset, offset + comp)
    out[tag] = comp < orig ? inflateSync(data) : data
  }
  return out
}

// Tabelle con indice fisso nella directory del WOFF2 (specifica W3C, sezione 4.2)
const WOFF2_TAGS = (
  'cmap head hhea hmtx maxp name OS/2 post cvt  fpgm glyf loca prep CFF  VORG EBDT EBLC gasp ' +
  'hdmx kern LTSH PCLT VDMX vhea vmtx BASE GDEF GPOS GSUB EBSC JSTF MATH CBDT CBLC COLR CPAL ' +
  'SVG  sbix acnt avar bdat bloc bsln cvar fdsc feat fmtx fvar gvar hsty just lcar mort morx ' +
  'opbd prop trak Zapf Silf Glat Gloc Feat Sill'
)
  .match(/.{4}\s?/g)!
  .map((s) => s.slice(0, 4))

function readWoff2(buf: Buffer): Record<string, Buffer> | null {
  // le raccolte (ttcf) hanno una directory in più: non servono per le carte
  if (buf.toString('latin1', 4, 8) === 'ttcf') return null
  const n = buf.readUInt16BE(12)
  const compressed = buf.readUInt32BE(20)
  let pos = 48
  const base128 = (): number => {
    let v = 0
    for (let i = 0; i < 5; i++) {
      const b = buf[pos++]
      v = v * 128 + (b & 0x7f)
      if (!(b & 0x80)) return v
    }
    throw new Error('woff2: invalid UIntBase128')
  }
  const dir: { tag: string; length: number }[] = []
  for (let i = 0; i < n; i++) {
    const flags = buf[pos++]
    let tag: string
    if ((flags & 0x3f) === 0x3f) {
      tag = buf.toString('latin1', pos, pos + 4)
      pos += 4
    } else tag = WOFF2_TAGS[flags & 0x3f]
    const version = flags >> 6
    const orig = base128()
    // glyf e loca sono trasformate con la versione 0, le altre con una versione diversa da 0
    const transformed = tag === 'glyf' || tag === 'loca' ? version !== 3 : version !== 0
    dir.push({ tag, length: transformed ? base128() : orig })
  }
  const data = brotliDecompressSync(buf.subarray(pos, pos + compressed))
  const out: Record<string, Buffer> = {}
  let offset = 0
  for (const t of dir) {
    if (WANTED.includes(t.tag)) out[t.tag] = data.subarray(offset, offset + t.length)
    offset += t.length
  }
  return out
}

/** Nomi della tabella name per numero, preferendo l'inglese di Windows */
export function readNames(t: Buffer): Map<number, string> {
  const count = t.readUInt16BE(2)
  const strings = t.readUInt16BE(4)
  const out = new Map<number, { text: string; rank: number }>()
  for (let i = 0; i < count; i++) {
    const r = 6 + i * 12
    if (r + 12 > t.length) break
    const platform = t.readUInt16BE(r)
    const lang = t.readUInt16BE(r + 4)
    const id = t.readUInt16BE(r + 6)
    const len = t.readUInt16BE(r + 8)
    const start = strings + t.readUInt16BE(r + 10)
    const raw = t.subarray(start, start + len)
    let text: string
    let rank: number
    if (platform === 3 || platform === 0) {
      // UTF-16 big endian
      text = raw.length % 2 === 0 ? Buffer.from(raw).swap16().toString('utf16le') : ''
      rank = platform === 3 && lang === 0x409 ? 3 : 2
    } else if (platform === 1) {
      text = raw.toString('latin1')
      rank = lang === 0 ? 1 : 0
    } else continue
    const prev = out.get(id)
    if (text && (!prev || rank > prev.rank)) out.set(id, { text: text.trim(), rank })
  }
  return new Map([...out].map(([id, v]) => [id, v.text]))
}

/** Minimo e massimo di un asse dei font variabili */
function readAxis(t: Buffer, wanted: string): [number, number] | null {
  const offset = t.readUInt16BE(4)
  const count = t.readUInt16BE(8)
  const size = t.readUInt16BE(10)
  for (let i = 0; i < count; i++) {
    const r = offset + i * size
    if (r + 16 > t.length) break
    if (t.toString('latin1', r, r + 4) !== wanted) continue
    return [Math.round(t.readInt32BE(r + 4) / 65536), Math.round(t.readInt32BE(r + 12) / 65536)]
  }
  return null
}

const WEIGHT_SUFFIX =
  /\s+(thin|hairline|(extra|ultra)\s?light|light|regular|book|medium|(semi|demi)\s?bold|(extra|ultra)\s?bold|bold|black|heavy)$/i

const WEIGHT_WORDS: [RegExp, number][] = [
  [/thin|hairline/, 100],
  [/extra-?light|ultra-?light/, 200],
  [/light/, 300],
  [/medium/, 500],
  [/semi-?bold|demi-?bold/, 600],
  [/extra-?bold|ultra-?bold/, 800],
  [/black|heavy/, 900],
  [/bold/, 700]
]

/**
 * Famiglia, peso e stile dal percorso, per i file che non si leggono: la cartella sotto fonts/
 * è la famiglia (fonts/Open Sans/OpenSans-Bold.ttf), altrimenti la parte del nome prima di "-".
 */
export function infoFromPath(path: string): FontInfo {
  const parts = path.split('/')
  const file = parts[parts.length - 1].replace(/\.[^.]+$/, '')
  const dash = file.indexOf('-')
  const family =
    parts.length > 2 ? parts[1] : (dash > 0 ? file.slice(0, dash) : file).replace(/_/g, ' ')
  const rest = (dash > 0 ? file.slice(dash + 1) : '').toLowerCase()
  const variable = /\[.*wght.*\]|variable/i.test(file)
  const number = rest.match(/(?:^|[^0-9])([1-9]00)(?![0-9])/)
  const word = WEIGHT_WORDS.find(([re]) => re.test(rest))
  const weight = variable ? '100 900' : number ? number[1] : word ? String(word[1]) : '400'
  return { family, weight, style: /italic|oblique/i.test(file) ? 'italic' : 'normal' }
}
