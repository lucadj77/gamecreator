import { access, readFile, rename, writeFile } from 'fs/promises'
import { extname } from 'path'
import ExcelJS from 'exceljs'
import Papa from 'papaparse'
import type { Sheet } from '../../shared/project'
import { odsTableNames, odsWithOnly, readOds, writeOds } from './ods'
import { MessageError, msg } from '../../shared/messages'
import { deletedPath } from './deleted'

export async function readSpreadsheet(path: string): Promise<Sheet[]> {
  const ext = extname(path).toLowerCase()
  if (ext === '.xlsx') return readXlsx(path)
  if (ext === '.csv') return [await readCsv(path)]
  if (ext === '.ods')
    return (await readOds(await readFile(path))).map((t) => toSheet(t.name, t.rows))
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
  const v = cell.value
  const date =
    v instanceof Date
      ? v
      : v && typeof v === 'object' && 'result' in v && v.result instanceof Date
        ? v.result
        : null
  if (date) return isoDate(date)
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
    const probe = new ExcelJS.Workbook()
    await probe.xlsx.readFile(path)
    for (const name of names.filter((n) => probe.getWorksheet(n))) {
      const copy = new ExcelJS.Workbook()
      await copy.xlsx.readFile(path)
      for (const ws of [...copy.worksheets]) if (ws.name !== name) copy.removeWorksheet(ws.id)
      const target = await deletedPath(folder, name, ext)
      await copy.xlsx.writeFile(target)
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
  const workbook = new ExcelJS.Workbook()
  if (await exists(path)) await workbook.xlsx.readFile(path)
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
      // una cella con lo stesso testo resta com'è: formula, data, testo formattato, collegamento
      if (cellText(cell) === v) return
      cell.value = toCellValue(v)
    })
    for (const c of removed) row.getCell(c).value = null
  }
  for (const c of removed) head.getCell(c).value = null
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
