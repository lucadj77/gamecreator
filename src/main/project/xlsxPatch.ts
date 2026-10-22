import JSZip from 'jszip'

// Scrittura diretta nell'xml di un .xlsx: si cambiano solo le celle modificate dei fogli dei set
// e il resto dell'archivio resta byte per byte com'era, con grafici, tabelle pivot, macro e
// tutto ciò che exceljs non sa riscrivere. Quando il file ha una forma che qui non si gestisce
// (prefissi negli elementi, righe senza numero, formule condivise o matriciali da sovrascrivere)
// si restituisce null e il chiamante riscrive il file con exceljs.

export interface CellEdit {
  /** Riga e colonna, da 1 */
  row: number
  col: number
  /** null svuota la cella e ne tiene lo stile */
  value: string | number | null
}

/** L'archivio con le modifiche, per foglio; null se non si può scrivere senza exceljs */
export async function patchXlsx(
  data: Buffer,
  edits: Map<string, CellEdit[]>
): Promise<Buffer | null> {
  const zip = await JSZip.loadAsync(data)
  const workbookXml = await zip.file('xl/workbook.xml')?.async('string')
  const relsXml = await zip.file('xl/_rels/workbook.xml.rels')?.async('string')
  if (!workbookXml || !relsXml) return null
  const parts = sheetParts(workbookXml, relsXml)
  let formulaLost = false
  let changed = false
  for (const [name, list] of edits) {
    if (!list.length) continue
    const part = parts.get(name)
    const xml = part ? await zip.file(part)?.async('string') : undefined
    if (!part || xml === undefined) return null
    const out = patchSheet(xml, list)
    if (!out) return null
    formulaLost ||= out.formulaLost
    zip.file(part, out.xml)
    changed = true
  }
  if (!changed) return data
  let workbook = workbookXml
  // una formula sovrascritta non può restare nella catena di calcolo: Excel la ricostruisce
  if (formulaLost && zip.file('xl/calcChain.xml')) {
    zip.remove('xl/calcChain.xml')
    zip.file(
      'xl/_rels/workbook.xml.rels',
      relsXml.replace(/<Relationship\b[^>]*\/calcChain"[^>]*\/>/g, '')
    )
    const types = await zip.file('[Content_Types].xml')?.async('string')
    if (types)
      zip.file(
        '[Content_Types].xml',
        types.replace(/<Override\b[^>]*PartName="\/xl\/calcChain\.xml"[^>]*\/>/g, '')
      )
  }
  // i risultati salvati delle formule che dipendono dalle celle cambiate sono vecchi: Excel li
  // ricalcola all'apertura
  workbook = fullCalcOnLoad(workbook)
  zip.file('xl/workbook.xml', workbook)
  return zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' })
}

/** Nome del foglio → percorso del suo xml nell'archivio */
function sheetParts(workbookXml: string, relsXml: string): Map<string, string> {
  const targets = new Map<string, string>()
  for (const m of relsXml.matchAll(/<Relationship\b[^>]*>/g)) {
    const id = attr(m[0], 'Id')
    const target = attr(m[0], 'Target')
    if (id && target) targets.set(id, target)
  }
  const out = new Map<string, string>()
  for (const m of workbookXml.matchAll(/<sheet\b[^>]*>/g)) {
    const name = attr(m[0], 'name')
    const id = /\s[\w.-]+:id\s*=\s*"([^"]*)"/.exec(m[0])?.[1]
    const target = id ? targets.get(id) : undefined
    if (name !== null && target) out.set(name, partPath(target))
  }
  return out
}

/** Percorso nell'archivio di una destinazione relativa a xl/ (o assoluta) */
function partPath(target: string): string {
  const segs = target.startsWith('/') ? [] : ['xl']
  for (const s of target.replace(/^\//, '').split('/')) {
    if (s === '..') segs.pop()
    else if (s && s !== '.') segs.push(s)
  }
  return segs.join('/')
}

function fullCalcOnLoad(xml: string): string {
  const calc = /<calcPr\b[^>]*?\/?>/.exec(xml)
  if (calc) {
    if (/\sfullCalcOnLoad\s*=/.test(calc[0]))
      return xml.replace(
        calc[0],
        calc[0].replace(/fullCalcOnLoad\s*=\s*"[^"]*"/, 'fullCalcOnLoad="1"')
      )
    return xml.replace(calc[0], calc[0].replace(/^<calcPr/, '<calcPr fullCalcOnLoad="1"'))
  }
  // calcPr va dopo sheets, functionGroups, externalReferences e definedNames
  for (const after of [
    '</definedNames>',
    '</externalReferences>',
    '</functionGroups>',
    '</sheets>'
  ]) {
    const at = xml.indexOf(after)
    if (at >= 0)
      return (
        xml.slice(0, at + after.length) +
        '<calcPr fullCalcOnLoad="1"/>' +
        xml.slice(at + after.length)
      )
  }
  return xml
}

// ——— Foglio ———

interface Cell {
  col: number
  raw: string
}

interface Row {
  num: number
  /** Tag di apertura senza la chiusura: <row r="3" ht="20" */
  open: string
  cells: Cell[]
  touched: boolean
}

export function patchSheet(
  xml: string,
  edits: CellEdit[]
): { xml: string; formulaLost: boolean } | null {
  const data = /<sheetData\b[^>]*?(\/>|>([\s\S]*?)<\/sheetData>)/.exec(xml)
  if (!data) return null
  const body = data[2] ?? ''
  const rows: Row[] = []
  const rowRe = /<row\b([^>]*?)(\/>|>([\s\S]*?)<\/row>)/g
  let last = 0
  for (const m of body.matchAll(rowRe)) {
    // tra una riga e l'altra non ci deve essere altro che spazio
    if (body.slice(last, m.index).trim()) return null
    last = m.index + m[0].length
    const num = Number(attr(m[0], 'r'))
    if (!Number.isInteger(num) || num < 1) return null
    const cells: Cell[] = []
    for (const c of (m[3] ?? '').matchAll(/<c\b[^>]*?(?:\/>|>[\s\S]*?<\/c>)/g)) {
      const ref = attr(c[0], 'r')
      const pos = ref ? parseRef(ref) : null
      if (!pos || pos.row !== num) return null
      cells.push({ col: pos.col, raw: c[0] })
    }
    rows.push({ num, open: `<row${m[1]}`, cells, touched: false })
  }
  if (body.slice(last).trim()) return null
  const colStyles = columnStyles(xml)
  let formulaLost = false
  let bounds = dimension(xml)
  for (const e of edits) {
    let row = rows.find((r) => r.num === e.row)
    if (!row) {
      if (e.value === null) continue
      row = { num: e.row, open: `<row r="${e.row}"`, cells: [], touched: true }
      const i = rows.findIndex((r) => r.num > e.row)
      rows.splice(i < 0 ? rows.length : i, 0, row)
    }
    const at = row.cells.findIndex((c) => c.col === e.col)
    const old = at >= 0 ? row.cells[at] : null
    if (old) {
      const f = /<f\b[^>]*>/.exec(old.raw)?.[0]
      if (f) {
        const t = attr(f, 't')
        // il capo di una formula condivisa o una formula matriciale valgono anche per altre celle
        if (t === 'array' || t === 'dataTable' || (t === 'shared' && attr(f, 'ref') !== null))
          return null
        formulaLost = true
      }
    } else if (e.value === null) continue
    const style = old
      ? attr(old.raw.slice(0, old.raw.indexOf('>') + 1), 's')
      : (rowStyle(row.open) ?? colStyles.get(e.col) ?? null)
    const raw = cellXml(colLetter(e.col) + e.row, style, e.value)
    row.touched = true
    if (raw === null) row.cells.splice(at, 1)
    else if (old) row.cells[at] = { col: e.col, raw }
    else {
      const i = row.cells.findIndex((c) => c.col > e.col)
      row.cells.splice(i < 0 ? row.cells.length : i, 0, { col: e.col, raw })
    }
    if (raw !== null) bounds = grow(bounds, e.row, e.col)
  }
  const sheetData =
    '<sheetData>' +
    rows
      .map((r) => {
        // spans è solo un suggerimento e dopo le modifiche può essere sbagliato
        const open = r.touched ? r.open.replace(/\sspans\s*=\s*"[^"]*"/, '') : r.open
        return r.cells.length ? `${open}>${r.cells.map((c) => c.raw).join('')}</row>` : `${open}/>`
      })
      .join('') +
    '</sheetData>'
  let out = xml.replace(data[0], () => sheetData)
  if (bounds) {
    const ref = `${colLetter(bounds.c1)}${bounds.r1}:${colLetter(bounds.c2)}${bounds.r2}`
    out = out.replace(/<dimension\b[^>]*\/>/, `<dimension ref="${ref}"/>`)
  }
  return { xml: out, formulaLost }
}

function cellXml(ref: string, style: string | null, value: CellEdit['value']): string | null {
  const s = style !== null ? ` s="${style}"` : ''
  if (value === null) return style !== null ? `<c r="${ref}"${s}/>` : null
  if (typeof value === 'number') return `<c r="${ref}"${s}><v>${value}</v></c>`
  // i caratteri di controllo non sono ammessi nell'xml
  // eslint-disable-next-line no-control-regex
  const text = escapeXml(value.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, ''))
  return `<c r="${ref}"${s} t="inlineStr"><is><t xml:space="preserve">${text}</t></is></c>`
}

/** Stile di una riga formattata (customFormat), per le sue celle nuove */
function rowStyle(open: string): string | undefined {
  return attr(open, 'customFormat') === '1' || attr(open, 'customFormat') === 'true'
    ? (attr(open, 's') ?? undefined)
    : undefined
}

/** Stile delle colonne formattate, per le celle nuove: <col min="2" max="3" style="5"/> */
function columnStyles(xml: string): Map<number, string> {
  const out = new Map<number, string>()
  for (const m of xml.matchAll(/<col\b[^>]*>/g)) {
    const min = Number(attr(m[0], 'min'))
    const max = Number(attr(m[0], 'max'))
    const style = attr(m[0], 'style')
    if (style === null || !min || !max || max - min > 16384) continue
    for (let c = min; c <= max; c++) out.set(c, style)
  }
  return out
}

interface Bounds {
  r1: number
  c1: number
  r2: number
  c2: number
}

function dimension(xml: string): Bounds | null {
  const ref = /<dimension\b[^>]*>/.exec(xml)
  const v = ref ? attr(ref[0], 'ref') : null
  if (!v) return null
  const [a, b = a] = v.split(':')
  const p = parseRef(a)
  const q = parseRef(b)
  return p && q ? { r1: p.row, c1: p.col, r2: q.row, c2: q.col } : null
}

function grow(b: Bounds | null, row: number, col: number): Bounds | null {
  if (!b) return null
  return {
    r1: Math.min(b.r1, row),
    c1: Math.min(b.c1, col),
    r2: Math.max(b.r2, row),
    c2: Math.max(b.c2, col)
  }
}

function parseRef(ref: string): { row: number; col: number } | null {
  const m = /^\$?([A-Z]{1,3})\$?(\d+)$/i.exec(ref.trim())
  if (!m) return null
  let col = 0
  for (const ch of m[1].toUpperCase()) col = col * 26 + ch.charCodeAt(0) - 64
  return { row: Number(m[2]), col }
}

function colLetter(col: number): string {
  let s = ''
  for (let n = col; n > 0; n = Math.floor((n - 1) / 26))
    s = String.fromCharCode(65 + ((n - 1) % 26)) + s
  return s
}

function attr(raw: string, name: string): string | null {
  const m = new RegExp(`\\s${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`).exec(raw)
  return m ? decode(m[1] ?? m[2]) : null
}

function decode(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos);/gi, (_, e: string) => {
    const named: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" }
    if (named[e.toLowerCase()]) return named[e.toLowerCase()]
    return String.fromCodePoint(
      e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : Number(e.slice(1))
    )
  })
}

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
