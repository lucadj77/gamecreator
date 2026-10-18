import { access, readFile, rename, writeFile } from 'fs/promises'
import { extname } from 'path'
import ExcelJS from 'exceljs'
import Papa from 'papaparse'
import type { Sheet } from '../../shared/project'
import { MessageError, msg } from '../../shared/messages'

export async function readSpreadsheet(path: string): Promise<Sheet[]> {
  const ext = extname(path).toLowerCase()
  if (ext === '.xlsx') return readXlsx(path)
  if (ext === '.csv') return [await readCsv(path)]
  throw new MessageError(msg('load.unsupportedDataFile', { ext }))
}

async function readXlsx(path: string): Promise<Sheet[]> {
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.readFile(path)
  return workbook.worksheets.map((ws) => {
    const width = ws.columnCount
    const table: string[][] = []
    ws.eachRow({ includeEmpty: false }, (row) => {
      const cells: string[] = []
      for (let c = 1; c <= width; c++) cells.push(row.getCell(c).text ?? '')
      table.push(cells)
    })
    return toSheet(ws.name, table)
  })
}

async function readCsv(path: string): Promise<Sheet> {
  const text = await readFile(path, 'utf8')
  const parsed = Papa.parse<string[]>(text.replace(/^\uFEFF/, ''), { skipEmptyLines: true })
  const name = path
    .split(/[\\/]/)
    .pop()!
    .replace(/\.csv$/i, '')
  return toSheet(name, parsed.data)
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
export async function writeSpreadsheet(path: string, sheets: Sheet[]): Promise<void> {
  const ext = extname(path).toLowerCase()
  if (ext === '.xlsx') return writeXlsx(path, sheets)
  if (ext === '.csv') return writeCsv(path, sheets)
  throw new MessageError(msg('load.unsupportedDataFile', { ext }))
}

async function writeXlsx(path: string, sheets: Sheet[]): Promise<void> {
  const workbook = new ExcelJS.Workbook()
  if (await exists(path)) await workbook.xlsx.readFile(path)
  for (const s of sheets)
    writeWorksheet(workbook.getWorksheet(s.name) ?? workbook.addWorksheet(s.name), s)
  // scrittura in un file temporaneo e rinomina: un errore a metà non rovina il file
  const tmp = path + '.tmp'
  await workbook.xlsx.writeFile(tmp)
  await rename(tmp, path)
}

function writeWorksheet(ws: ExcelJS.Worksheet, s: Sheet): void {
  const head = ws.getRow(1)
  const existing = new Map<string, number>()
  for (let c = 1; c <= ws.columnCount; c++) {
    const h = head.getCell(c).text?.trim()
    if (h) existing.set(h, c)
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
  const last = Math.max(ws.rowCount, s.rows.length + 1)
  for (let r = 2; r <= last; r++) {
    const row = ws.getRow(r)
    const values = s.rows[r - 2]
    columns.forEach((c, i) => {
      const cell = row.getCell(c)
      const v = values?.[i] ?? ''
      if (cell.formula && cell.text === v) return
      cell.value = toCellValue(v)
    })
    for (const c of removed) row.getCell(c).value = null
  }
  for (const c of removed) head.getCell(c).value = null
}

/** I numeri scritti come tali restano numeri nel foglio; "007" e simili restano testo */
function toCellValue(v: string): string | number | null {
  if (v === '') return null
  if (/^-?(0|[1-9]\d*)(\.\d+)?$/.test(v)) return Number(v)
  return v
}

async function writeCsv(path: string, sheets: Sheet[]): Promise<void> {
  const name = path
    .split(/[\\/]/)
    .pop()!
    .replace(/\.csv$/i, '')
  if (sheets.length !== 1 || sheets[0].name !== name)
    throw new MessageError(msg('save.csvOneSheet'))
  const s = sheets[0]
  const tmp = path + '.tmp'
  await writeFile(tmp, Papa.unparse([s.headers, ...s.rows]) + '\n', 'utf8')
  await rename(tmp, path)
}

async function exists(path: string): Promise<boolean> {
  try {
    await access(path)
    return true
  } catch {
    return false
  }
}
