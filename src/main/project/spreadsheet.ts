import { readFile } from 'fs/promises'
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
