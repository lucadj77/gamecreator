import { mkdtemp, readFile } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'
import ExcelJS from 'exceljs'
import { describe, expect, it } from 'vitest'
import { readSpreadsheet, writeSpreadsheet } from '../spreadsheet'

async function workbook(path: string): Promise<void> {
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet('Personaggi')
  ws.addRow(['amount', 'nome', 'forza', 'energia', '', 'vecchia'])
  ws.addRow([1, 'Cavaliere', 4, null, 'nota', 'x'])
  ws.addRow([2, 'Arciere', 2, null, '', 'y'])
  ws.getCell('D2').value = { formula: 'C2+2', result: 6 }
  ws.getCell('D3').value = { formula: 'C3+2', result: 4 }
  ws.getCell('B1').font = { bold: true }
  wb.addWorksheet('Altro').addRow(['a'])
  await wb.xlsx.writeFile(path)
}

describe('writeSpreadsheet', () => {
  it('riscrive le celle tenendo formule, formattazione e altri fogli', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'gc-'))
    const path = join(dir, 'dati.xlsx')
    await workbook(path)
    await writeSpreadsheet(path, [
      {
        name: 'Personaggi',
        headers: ['amount', 'nome', 'forza', 'energia', 'testo'],
        rows: [
          ['1', 'Cavaliere', '4', '6', 'Attacca'],
          ['2', 'Arciere', '3', '5', ''],
          ['', 'Drago', '007', '', '']
        ]
      },
      { name: 'Nuovo', headers: ['amount', 'nome'], rows: [['', 'Uno']] }
    ])
    const wb = new ExcelJS.Workbook()
    await wb.xlsx.readFile(path)
    const ws = wb.getWorksheet('Personaggi')!
    // formula invariata dove il risultato coincide, valore dove è cambiato
    expect(ws.getCell('D2').formula).toBe('C2+2')
    expect(ws.getCell('D3').value).toBe(5)
    expect(ws.getCell('C3').value).toBe(3)
    expect(ws.getCell('C4').value).toBe('007')
    expect(ws.getCell('B1').font?.bold).toBe(true)
    // colonna senza intestazione intatta, colonna tolta svuotata, colonna nuova in fondo
    expect(ws.getCell('E2').value).toBe('nota')
    expect(ws.getCell('F1').value).toBeNull()
    expect(ws.getCell('G1').value).toBe('testo')
    const sheets = await readSpreadsheet(path)
    expect(sheets.map((s) => s.name)).toEqual(['Personaggi', 'Altro', 'Nuovo'])
    expect(sheets[0].rows[2]).toEqual(['', 'Drago', '007', '', 'Attacca'.slice(0, 0)])
    expect(sheets[2].rows).toEqual([['', 'Uno']])
  })

  it('riscrive un csv', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'gc-'))
    const path = join(dir, 'carte.csv')
    await writeSpreadsheet(path, [
      { name: 'carte', headers: ['nome', 'testo'], rows: [['A', 'x, y']] }
    ])
    expect(await readFile(path, 'utf8')).toBe('nome,testo\r\nA,"x, y"\n')
  })
})
