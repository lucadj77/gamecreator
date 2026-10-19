import JSZip from 'jszip'

// Fogli di calcolo OpenDocument (.ods): un archivio zip con le tabelle in content.xml.
// Si legge il testo delle celle come lo mostra il foglio; si scrive come per l'xlsx (vedi
// spreadsheet.ts): si riscrivono solo le celle delle colonne con intestazione, e il resto del
// file (stili, altri fogli, colonne senza intestazione, formule con lo stesso risultato) resta.

const MIME = 'application/vnd.oasis.opendocument.spreadsheet'

export interface OdsTable {
  name: string
  /** Righe con il testo delle celle; le righe vuote ci sono, così gli indici coincidono */
  rows: string[][]
}

// ——— XML minimo ———

interface Tag {
  /** 'open', 'close', 'empty' (<x/>), 'text', o 'other' (dichiarazioni, commenti) */
  kind: 'open' | 'close' | 'empty' | 'text' | 'other'
  name: string
  raw: string
  start: number
  end: number
}

function* tokens(xml: string, from = 0, to = xml.length): Generator<Tag> {
  const re = /<!--[\s\S]*?-->|<!\[CDATA\[[\s\S]*?\]\]>|<[^>]*>|[^<]+/g
  re.lastIndex = from
  let m: RegExpExecArray | null
  while ((m = re.exec(xml)) && m.index < to) {
    const raw = m[0]
    const start = m.index
    const end = start + raw.length
    if (raw[0] !== '<') yield { kind: 'text', name: '', raw, start, end }
    else if (raw.startsWith('<!--') || raw.startsWith('<?') || raw.startsWith('<!'))
      yield { kind: raw.startsWith('<![CDATA[') ? 'text' : 'other', name: '', raw, start, end }
    else if (raw[1] === '/') yield { kind: 'close', name: raw.slice(2, -1).trim(), raw, start, end }
    else {
      const name = /^<([^\s/>]+)/.exec(raw)![1]
      yield { kind: raw.endsWith('/>') ? 'empty' : 'open', name, raw, start, end }
    }
  }
}

/** Fine dell'elemento che comincia con il tag dato (indice dopo il tag di chiusura) */
function elementEnd(xml: string, open: Tag): number {
  if (open.kind === 'empty') return open.end
  let depth = 0
  for (const t of tokens(xml, open.start)) {
    if (t.kind === 'open' && t.name === open.name) depth++
    else if (t.kind === 'close' && t.name === open.name && --depth === 0) return t.end
  }
  throw new Error(`unclosed <${open.name}>`)
}

function attr(raw: string, name: string): string | null {
  const m = new RegExp(`\\s${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`).exec(raw)
  return m ? decode(m[1] ?? m[2]) : null
}

function decode(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos);/gi, (_, e: string) => {
    if (e[0] === '#')
      return String.fromCodePoint(
        e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : +e.slice(1)
      )
    return { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" }[e.toLowerCase()]!
  })
}

function escape(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** Elementi figli diretti (o più in basso, attraverso i contenitori dati) di un intervallo */
function children(
  xml: string,
  from: number,
  to: number,
  names: string[],
  through: string[] = []
): Tag[] {
  const out: Tag[] = []
  let i = from
  for (const t of tokens(xml, from, to)) {
    if (t.start < i) continue
    if (t.kind !== 'open' && t.kind !== 'empty') continue
    if (names.includes(t.name)) {
      out.push(t)
      i = elementEnd(xml, t)
    } else if (through.includes(t.name) && t.kind === 'open') {
      // si entra nel contenitore: i suoi figli vengono dopo il tag di apertura
      continue
    } else {
      i = elementEnd(xml, t)
    }
  }
  return out
}

// ——— Celle ———

const ROW_GROUPS = ['table:table-header-rows', 'table:table-rows', 'table:table-row-group']
const CELLS = ['table:table-cell', 'table:covered-table-cell']

/** Testo di una cella come lo mostra il foglio: paragrafi separati da a capo */
function cellText(xml: string, cell: Tag): string {
  const end = elementEnd(xml, cell)
  const paras: string[] = []
  let cur: string | null = null
  let depth = 0
  // le note (office:annotation) hanno paragrafi propri, che non sono il testo della cella
  let note = 0
  for (const t of tokens(xml, cell.end, end)) {
    if (t.name === 'office:annotation') {
      if (t.kind === 'open') note++
      else if (t.kind === 'close') note--
      continue
    }
    if (note > 0) continue
    if (t.name === 'text:p' || t.name === 'text:h') {
      if (t.kind === 'open') {
        if (depth++ === 0) cur = ''
      } else if (t.kind === 'close') {
        if (--depth === 0 && cur !== null) paras.push(cur)
      } else if (t.kind === 'empty') paras.push('')
      continue
    }
    if (cur === null) continue
    if (t.kind === 'text') cur += t.raw.startsWith('<![CDATA[') ? t.raw.slice(9, -3) : decode(t.raw)
    else if (t.name === 'text:s') cur += ' '.repeat(Number(attr(t.raw, 'text:c') ?? 1))
    else if (t.name === 'text:tab') cur += '\t'
    else if (t.name === 'text:line-break') cur += '\n'
  }
  if (paras.length) return paras.join('\n')
  // senza paragrafi vale il valore della cella, se c'è
  return (
    attr(cell.raw, 'office:string-value') ??
    attr(cell.raw, 'office:value') ??
    attr(cell.raw, 'office:date-value') ??
    attr(cell.raw, 'office:boolean-value') ??
    ''
  )
}

const repeat = (raw: string, name: string): number =>
  Math.max(1, Math.floor(Number(attr(raw, name) ?? 1)) || 1)

// ——— Lettura ———

export async function readOds(data: Buffer): Promise<OdsTable[]> {
  const zip = await JSZip.loadAsync(data)
  const content = await zip.file('content.xml')?.async('string')
  if (!content) throw new Error('content.xml missing')
  return tablesOf(content).map((t) => ({ name: t.name, rows: readRows(content, t.tag) }))
}

function tablesOf(xml: string): { name: string; tag: Tag; end: number }[] {
  const out: { name: string; tag: Tag; end: number }[] = []
  let i = 0
  for (const t of tokens(xml)) {
    if (t.start < i || t.name !== 'table:table' || (t.kind !== 'open' && t.kind !== 'empty'))
      continue
    const end = elementEnd(xml, t)
    out.push({ name: attr(t.raw, 'table:name') ?? `Sheet${out.length + 1}`, tag: t, end })
    i = end
  }
  return out
}

function readRows(xml: string, table: Tag): string[][] {
  const end = elementEnd(xml, table)
  const rows: string[][] = []
  let pendingEmpty = 0
  for (const row of children(xml, table.end, end, ['table:table-row'], ROW_GROUPS)) {
    const cells = readCells(xml, row)
    const n = repeat(row.raw, 'table:number-rows-repeated')
    // le righe vuote ripetute (spesso migliaia in fondo al foglio) si contano solo se seguite da dati
    if (!cells.length) {
      pendingEmpty += n
      continue
    }
    for (; pendingEmpty > 0; pendingEmpty--) rows.push([])
    for (let k = 0; k < Math.min(n, 10000); k++) rows.push([...cells])
  }
  return rows
}

function readCells(xml: string, row: Tag): string[] {
  if (row.kind === 'empty') return []
  const end = elementEnd(xml, row)
  const cells: string[] = []
  let pendingEmpty = 0
  for (const cell of children(xml, row.end, end, CELLS)) {
    const text = cellText(xml, cell)
    const n = repeat(cell.raw, 'table:number-columns-repeated')
    if (!text) {
      pendingEmpty += n
      continue
    }
    for (; pendingEmpty > 0; pendingEmpty--) cells.push('')
    for (let k = 0; k < Math.min(n, 1024); k++) cells.push(text)
  }
  return cells
}

// ——— Scrittura ———

export interface OdsSheet {
  name: string
  headers: string[]
  rows: string[][]
}

/** Il file aggiornato, o un file nuovo se data è null */
export async function writeOds(data: Buffer | null, sheets: OdsSheet[]): Promise<Buffer> {
  const zip = data ? await JSZip.loadAsync(data) : newPackage()
  let xml = (await zip.file('content.xml')?.async('string')) ?? EMPTY_CONTENT
  for (const s of sheets) {
    const table = tablesOf(xml).find((t) => t.name === s.name)
    if (table) {
      xml =
        xml.slice(0, table.tag.start) +
        writeTable(xml, table.tag, table.end, s) +
        xml.slice(table.end)
    } else {
      const at = xml.lastIndexOf('</office:spreadsheet>')
      if (at < 0) throw new Error('office:spreadsheet missing')
      const fresh = `<table:table table:name="${escape(s.name)}"><table:table-column/></table:table>`
      xml =
        xml.slice(0, at) + writeTable(fresh, [...tokens(fresh)][0], fresh.length, s) + xml.slice(at)
    }
  }
  zip.file('content.xml', xml)
  // il tipo deve essere il primo file, non compresso
  zip.file('mimetype', MIME, { compression: 'STORE' })
  return zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' })
}

interface RawCell {
  /** XML della cella senza l'attributo di ripetizione */
  raw: string
  text: string
}

/** Una riga in celle singole, fino a `need` colonne; il resto resta com'era */
function splitCells(xml: string, row: Tag, need: number): { cells: RawCell[]; rest: string } {
  const cells: RawCell[] = []
  let rest = ''
  if (row.kind === 'empty') {
    while (cells.length < need) cells.push({ raw: '<table:table-cell/>', text: '' })
    return { cells, rest }
  }
  const end = elementEnd(xml, row)
  for (const cell of children(xml, row.end, end, CELLS)) {
    const cellEnd = elementEnd(xml, cell)
    const n = repeat(cell.raw, 'table:number-columns-repeated')
    const single =
      cell.raw.replace(/\s+table:number-columns-repeated\s*=\s*("[^"]*"|'[^']*')/, '') +
      xml.slice(cell.end, cellEnd)
    const text = cellText(xml, cell)
    const take = Math.max(0, Math.min(n, need - cells.length))
    for (let k = 0; k < take; k++) cells.push({ raw: single, text })
    if (n > take) rest += withRepeat(single, 'table:number-columns-repeated', n - take)
  }
  while (cells.length < need) cells.push({ raw: '<table:table-cell/>', text: '' })
  return { cells, rest }
}

function withRepeat(raw: string, name: string, n: number): string {
  if (n === 1) return raw
  return raw.replace(/^<([^\s/>]+)/, `<$1 ${name}="${n}"`)
}

function cellXml(old: RawCell, v: string): string {
  // una cella con lo stesso testo resta com'è, con formula, formattazione e nota
  if (old.text === v) return old.raw
  const style = attr(old.raw.slice(0, old.raw.indexOf('>') + 1), 'table:style-name')
  const s = style ? ` table:style-name="${escape(style)}"` : ''
  if (v === '') return `<table:table-cell${s}/>`
  if (/^-?(0|[1-9]\d*)(\.\d+)?$/.test(v))
    return `<table:table-cell${s} office:value-type="float" office:value="${v}"><text:p>${v}</text:p></table:table-cell>`
  const paras = v
    .split('\n')
    .map((p) => `<text:p>${paragraph(p)}</text:p>`)
    .join('')
  return `<table:table-cell${s} office:value-type="string">${paras}</table:table-cell>`
}

/** Spazi multipli e tabulazioni si scrivono come elementi, altrimenti il foglio li comprime */
function paragraph(p: string): string {
  return p
    .split('\t')
    .map((part) =>
      escape(part).replace(/(^ +| {2,})/g, (sp, _, at: number) =>
        at === 0 ? `<text:s text:c="${sp.length}"/>` : ` <text:s text:c="${sp.length - 1}"/>`
      )
    )
    .join('<text:tab/>')
}

function writeTable(xml: string, table: Tag, end: number, s: OdsSheet): string {
  if (table.kind === 'empty') {
    const open = table.raw.slice(0, -2).trimEnd() + '>'
    const fresh = open + '<table:table-column/></table:table>'
    return writeTable(fresh, [...tokens(fresh)][0], fresh.length, s)
  }
  const rowTags = children(xml, table.end, end, ['table:table-row'], ROW_GROUPS)
  // ciò che precede le righe (colonne) e ciò che le segue resta com'è
  const firstRow = rowTags[0]?.start ?? end - '</table:table>'.length
  const head = xml
    .slice(table.start, firstRow)
    .replace(/<table:table-(header-rows|rows|row-group)[^>]*>\s*$/, '')
  const lastRowEnd = rowTags.length ? elementEnd(xml, rowTags[rowTags.length - 1]) : firstRow
  const tail = xml
    .slice(lastRowEnd, end)
    .replace(/^(\s*<\/table:table-(header-rows|rows|row-group)>)+/, '')

  // righe singole fino a quelle che servono: intestazione e una per carta,
  // e tutte quelle che hanno già dati: le carte tolte dal set vanno svuotate
  const need = Math.max(s.rows.length + 1, readRows(xml, table).length, 1)
  const rows: { open: string; tag: Tag | null }[] = []
  let rest = ''
  for (const r of rowTags) {
    const n = repeat(r.raw, 'table:number-rows-repeated')
    const take = Math.max(0, Math.min(n, need - rows.length))
    const open = r.raw.replace(/\s+table:number-rows-repeated\s*=\s*("[^"]*"|'[^']*')/, '')
    for (let k = 0; k < take; k++) rows.push({ open, tag: r })
    if (n > take) {
      const rowEnd = elementEnd(xml, r)
      rest += withRepeat(open + xml.slice(r.end, rowEnd), 'table:number-rows-repeated', n - take)
    }
  }
  while (rows.length < need) rows.push({ open: '<table:table-row>', tag: null })

  // colonne con intestazione: quelle già presenti tengono il posto, le nuove vanno in fondo
  const headTexts = rows[0].tag ? readCells(xml, rows[0].tag) : []
  const existing = new Map<string, number>()
  headTexts.forEach((h, i) => h.trim() && !existing.has(h.trim()) && existing.set(h.trim(), i))
  let next = headTexts.length
  const columns = s.headers.map((h) => {
    const c = existing.get(h) ?? next++
    existing.delete(h)
    return c
  })
  const removed = [...existing.values()]
  const width = Math.max(next, ...columns.map((c) => c + 1), 1)

  const out = rows.map((r, i) => {
    const { cells, rest: cellRest } = r.tag
      ? splitCells(xml, r.tag, width)
      : {
          cells: Array.from({ length: width }, () => ({ raw: '<table:table-cell/>', text: '' })),
          rest: ''
        }
    const values = i === 0 ? s.headers : s.rows[i - 1]
    columns.forEach(
      (c, k) => (cells[c] = { raw: cellXml(cells[c], values?.[k] ?? ''), text: values?.[k] ?? '' })
    )
    for (const c of removed) cells[c] = { raw: cellXml(cells[c], ''), text: '' }
    const open = r.open.endsWith('/>') ? r.open.slice(0, -2) + '>' : r.open
    return `${open}${cells.map((c) => c.raw).join('')}${cellRest}</table:table-row>`
  })
  return head + out.join('') + rest + tail
}

// ——— File nuovo ———

const EMPTY_CONTENT =
  '<?xml version="1.0" encoding="UTF-8"?>' +
  '<office:document-content xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0"' +
  ' xmlns:table="urn:oasis:names:tc:opendocument:xmlns:table:1.0"' +
  ' xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0" office:version="1.3">' +
  '<office:body><office:spreadsheet></office:spreadsheet></office:body></office:document-content>'

function newPackage(): JSZip {
  const zip = new JSZip()
  zip.file('mimetype', MIME, { compression: 'STORE' })
  zip.file(
    'META-INF/manifest.xml',
    '<?xml version="1.0" encoding="UTF-8"?>' +
      '<manifest:manifest xmlns:manifest="urn:oasis:names:tc:opendocument:xmlns:manifest:1.0" manifest:version="1.3">' +
      `<manifest:file-entry manifest:full-path="/" manifest:version="1.3" manifest:media-type="${MIME}"/>` +
      '<manifest:file-entry manifest:full-path="content.xml" manifest:media-type="text/xml"/>' +
      '</manifest:manifest>'
  )
  zip.file('content.xml', EMPTY_CONTENT)
  return zip
}
