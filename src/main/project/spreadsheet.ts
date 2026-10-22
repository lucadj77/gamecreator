import { readFile, rename, writeFile } from 'fs/promises'
import { exists } from '../fs'
import { basename, extname } from 'path'
import ExcelJS from 'exceljs'
import JSZip from 'jszip'
import Papa from 'papaparse'
import type { DataFileLoss, Sheet } from '../../shared/project'
import { odsTableNames, odsWithOnly, readOds, writeOds } from './ods'
import { MessageError, msg } from '../../shared/messages'
import { deletedPath } from './deleted'
import { placeRows } from './rowSlots'

export async function readSpreadsheet(path: string): Promise<Sheet[]> {
  const ext = extname(path).toLowerCase()
  if (ext === '.xlsx') return readXlsx(path)
  if (ext === '.csv') return [await readCsv(path)]
  if (ext === '.ods')
    return (await readOds(await readFile(path))).map((t) => toSheet(t.name, t.rows))
  throw new MessageError(msg('load.unsupportedDataFile', { ext }))
}

/** Fogli di un .xlsx, da un file o dai suoi dati */
export async function readXlsx(source: string | Buffer): Promise<Sheet[]> {
  const workbook = await readWorkbook(source)
  return workbook.worksheets.map((ws) => {
    const width = ws.columnCount
    const table: string[][] = []
    ws.eachRow({ includeEmpty: false }, (row) => {
      const cells: string[] = []
      for (let c = 1; c <= width; c++) cells.push(cellText(row.getCell(c)))
      table.push(cells)
    })
    return toSheet(ws.name, table)
  })
}

/**
 * Testo di una cella come lo vede chi la legge: una data come AAAA-MM-GG (con l'ora se non è
 * mezzanotte), non la stringa JavaScript che darebbe `text`
 */
export function cellText(cell: ExcelJS.Cell): string {
  // di una formula conta il risultato salvato nel file (da cell.result: cell.value perde FALSO)
  const r = cell.type === ExcelJS.ValueType.Formula ? cell.result : cell.value
  if (r instanceof Date) return isoDate(r)
  // un errore (#DIV/0!, #N/A) si legge com'è scritto, VERO e FALSO come true e false
  if (r && typeof r === 'object' && 'error' in r) return String(r.error)
  if (typeof r === 'boolean') return String(r)
  return cell.text ?? ''
}

function isoDate(d: Date): string {
  const p = (n: number): string => String(n).padStart(2, '0')
  // le date dell'xlsx sono in UTC
  const day = `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())}`
  const time = `${p(d.getUTCHours())}:${p(d.getUTCMinutes())}`
  return time === '00:00' ? day : `${day} ${time}`
}

async function readCsv(path: string): Promise<Sheet> {
  const text = await readFile(path, 'utf8')
  const parsed = Papa.parse<string[]>(text.replace(/^\uFEFF/, ''), { skipEmptyLines: true })
  return toSheet(csvSheetName(path), parsed.data)
}

/** La prima riga contiene le intestazioni; colonne senza intestazione e righe vuote sono scartate */
function toSheet(name: string, table: string[][]): Sheet {
  const [head = [], ...body] = table
  const keep = head.map((h, i) => (h.trim() ? i : -1)).filter((i) => i >= 0)
  return {
    name,
    headers: keep.map((i) => head[i].trim()),
    rows: body
      .map((r) => keep.map((i) => (r[i] ?? '').toString()))
      .filter((r) => r.some((v) => v.trim() !== ''))
  }
}

/**
 * Scrive i fogli modificati nel file dati. Nell'xlsx si riscrivono solo le celle delle colonne
 * con intestazione: formattazione, altri fogli e colonne senza intestazione restano. Una cella
 * con formula resta formula se il suo risultato non è cambiato.
 */
export async function writeSpreadsheet(
  path: string,
  sheets: Sheet[],
  removed: string[] = []
): Promise<void> {
  const ext = extname(path).toLowerCase()
  if (ext === '.xlsx') return writeXlsx(path, sheets, removed)
  // un csv ha un solo foglio: eliminando il set il file resta
  if (ext === '.csv') return sheets.length ? writeCsv(path, sheets) : undefined
  if (ext === '.ods') return writeOdsFile(path, sheets, removed)
  throw new MessageError(msg('load.unsupportedDataFile', { ext }))
}

/**
 * Copia in deleted/ i fogli che stanno per uscire dal file dati, uno per file con la sua
 * formattazione: da lì si recuperano copiandoli di nuovo nel file dati. Restituisce i file scritti.
 */
export async function keepDeletedSheets(
  folder: string,
  path: string,
  names: string[]
): Promise<string[]> {
  const ext = extname(path).toLowerCase()
  if (!names.length || ext === '.csv' || !(await exists(path))) return []
  const out: string[] = []
  if (ext === '.xlsx') {
    const data = await readFile(path)
    const probe = await readWorkbook(data)
    for (const name of names.filter((n) => probe.getWorksheet(n))) {
      const copy = await readWorkbook(data)
      for (const ws of [...copy.worksheets]) if (ws.name !== name) copy.removeWorksheet(ws.id)
      const target = await deletedPath(folder, name, ext)
      await writeFile(target, await workbookBuffer(copy))
      out.push(target)
    }
  } else if (ext === '.ods') {
    const data = await readFile(path)
    const present = await odsTableNames(data)
    for (const name of names.filter((n) => present.includes(n))) {
      const target = await deletedPath(folder, name, ext)
      await writeFile(target, await odsWithOnly(data, name))
      out.push(target)
    }
  }
  return out
}

async function writeXlsx(path: string, sheets: Sheet[], removed: string[]): Promise<void> {
  const workbook = (await exists(path)) ? await readWorkbook(path) : new ExcelJS.Workbook()
  // prima si tolgono i fogli dei set eliminati: un set può prenderne il nome
  for (const name of removed) {
    const ws = workbook.getWorksheet(name)
    if (ws) workbook.removeWorksheet(ws.id)
  }
  for (const s of sheets) {
    let ws = workbook.getWorksheet(s.name)
    // un set rinominato si porta dietro il suo foglio, con formattazione e colonne in più
    const renamed = !ws && s.origin ? workbook.getWorksheet(s.origin) : undefined
    if (renamed) renamed.name = s.name
    ws ??= renamed ?? workbook.addWorksheet(s.name)
    writeWorksheet(ws, s)
  }
  // un file senza fogli non si apre
  if (!workbook.worksheets.length) workbook.addWorksheet('Sheet1')
  // scrittura in un file temporaneo e rinomina: un errore a metà non rovina il file
  const tmp = path + '.tmp'
  await writeFile(tmp, await workbookBuffer(workbook))
  await rename(tmp, path)
}

/** Parti di un .xlsx che exceljs non riscrive, per tipo */
const LOST_PARTS: [DataFileLoss, RegExp][] = [
  ['charts', /^xl\/(charts|chartsheets)\//],
  ['pivotTables', /^xl\/(pivotTables|pivotCache)\//],
  ['slicers', /^xl\/(slicers|slicerCaches|timelines|timelineCaches)\//],
  ['macros', /^xl\/vbaProject\.bin$/],
  ['externalLinks', /^xl\/externalLinks\//]
]

/**
 * Cosa si perderebbe riscrivendo il file dati .xlsx: grafici, tabelle pivot e altro che exceljs
 * non conosce e che al salvataggio sparisce da tutto il file, non solo dai fogli dei set.
 */
export async function xlsxLosses(source: string | Buffer): Promise<DataFileLoss[]> {
  const data = typeof source === 'string' ? await readFile(source) : source
  const zip = await JSZip.loadAsync(data)
  const present = LOST_PARTS.filter(([, re]) => Object.keys(zip.files).some((f) => re.test(f)))
  if (!present.length) return []
  const after = await JSZip.loadAsync(await workbookBuffer(await readWorkbook(data)))
  const kept = Object.keys(after.files)
  return present.filter(([, re]) => !kept.some((f) => re.test(f))).map(([kind]) => kind)
}

/**
 * Si legge e si scrive l'xlsx come dati, non con readFile/writeFile di exceljs: così lo stesso
 * codice funziona anche nella versione web, dove i file passano dal browser
 */
async function readWorkbook(source: string | Buffer): Promise<ExcelJS.Workbook> {
  const workbook = new ExcelJS.Workbook()
  const data = typeof source === 'string' ? await readFile(source) : source
  await workbook.xlsx.load(data as unknown as ArrayBuffer)
  return workbook
}

async function workbookBuffer(workbook: ExcelJS.Workbook): Promise<Buffer> {
  return Buffer.from(await workbook.xlsx.writeBuffer())
}

function writeWorksheet(ws: ExcelJS.Worksheet, s: Sheet): void {
  // le intestazioni sono nella prima riga con dati, come in lettura
  let headRow = 0
  ws.eachRow({ includeEmpty: false }, (_, n) => {
    if (!headRow) headRow = n
  })
  headRow ||= 1
  const head = ws.getRow(headRow)
  const existing = new Map<string, number>()
  for (let c = 1; c <= ws.columnCount; c++) {
    const h = head.getCell(c).text?.trim()
    if (h) existing.set(h, c)
  }
  // righe che in lettura sono diventate carte: quelle con dati in una colonna con intestazione
  const headed = [...existing.values()]
  const used: number[] = []
  for (let r = headRow + 1; r <= ws.rowCount; r++) {
    const row = ws.getRow(r)
    if (headed.some((c) => cellText(row.getCell(c)).trim() !== '')) used.push(r)
  }
  let next = ws.columnCount + 1
  const columns = s.headers.map((h) => {
    const c = existing.get(h) ?? next++
    head.getCell(c).value = h
    existing.delete(h)
    return c
  })
  // colonne tolte dal set: si svuotano, intestazione compresa
  const removed = [...existing.values()]
  const { at, clear } = placeRows(used, s.rows.length, headRow)
  at.forEach((r, k) => {
    const row = ws.getRow(r)
    columns.forEach((c, i) => {
      const cell = row.getCell(c)
      const v = s.rows[k][i] ?? ''
      // una cella con lo stesso testo resta com'è: formula, data, testo formattato, collegamento
      if (cellText(cell) === v) return
      cell.value = toCellValue(v)
    })
  })
  for (const r of clear) for (const c of columns) ws.getRow(r).getCell(c).value = null
  for (let r = headRow; r <= ws.rowCount; r++)
    for (const c of removed) ws.getRow(r).getCell(c).value = null
}

/** I numeri scritti come tali restano numeri nel foglio; "007" e simili restano testo */
function toCellValue(v: string): string | number | null {
  if (v === '') return null
  // solo se il numero si rilegge uguale: "1.50" e i numeri oltre le 15 cifre restano testo
  if (/^-?(0|[1-9]\d*)(\.\d+)?$/.test(v) && String(Number(v)) === v) return Number(v)
  return v
}

async function writeOdsFile(path: string, sheets: Sheet[], removed: string[]): Promise<void> {
  const data = (await exists(path)) ? await readFile(path) : null
  const tmp = path + '.tmp'
  await writeFile(tmp, await writeOds(data, sheets, removed))
  await rename(tmp, path)
}

/** Un file .csv ha un solo foglio, con il nome del file */
function csvSheetName(path: string): string {
  return basename(path).replace(/\.csv$/i, '')
}

async function writeCsv(path: string, sheets: Sheet[]): Promise<void> {
  if (sheets.length !== 1 || sheets[0].name !== csvSheetName(path))
    throw new MessageError(msg('save.csvOneSheet'))
  const s = sheets[0]
  const tmp = path + '.tmp'
  await writeFile(tmp, Papa.unparse([s.headers, ...s.rows]) + '\n', 'utf8')
  await rename(tmp, path)
}
