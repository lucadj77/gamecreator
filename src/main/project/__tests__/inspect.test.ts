import { mkdtemp, writeFile } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'
import ExcelJS from 'exceljs'
import { describe, expect, it } from 'vitest'
import { inspectDataFile } from '../inspect'

describe('inspectDataFile', () => {
  it('trova titolo, righe vuote, celle unite, errori e formule senza risultato in un xlsx', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'gc-'))
    const path = join(dir, 'dati.xlsx')
    const wb = new ExcelJS.Workbook()
    const ws = wb.addWorksheet('Unità')
    ws.getCell('A1').value = 'Le mie unità'
    ws.mergeCells('A1:C1')
    ws.getRow(2).values = ['nome', 'attacco', 'attacco', '', 'costo']
    ws.getRow(3).values = ['Fante', 2, 3, 'nota', 5]
    ws.getRow(5).values = ['Arciere', 1, 1]
    ws.getCell('E5').value = { formula: 'B5/0', result: { error: '#DIV/0!' } }
    ws.getRow(6).values = ['Mago', 4, 1]
    ws.getCell('E6').value = { formula: 'B6+C6' } as ExcelJS.CellFormulaValue
    wb.addWorksheet('Vuoto')
    await wb.xlsx.writeFile(path)

    const [units, empty] = await inspectDataFile(path)
    expect(units).toMatchObject({
      name: 'Unità',
      headerRow: 1,
      titleAbove: true,
      dataRows: 4,
      emptyRows: [4],
      merged: ['A1:C1'],
      errors: ['E5 #DIV/0!'],
      noResult: ['E6']
    })
    expect(empty).toMatchObject({ name: 'Vuoto', headerRow: 0, dataRows: 0 })
  })

  it('in un csv trova intestazioni doppie, colonne senza nome e righe vuote', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'gc-'))
    const path = join(dir, 'carte.csv')
    await writeFile(path, 'nome,forza,forza,\nA,1,2,x\n\nB,3,4,\n')
    const [s] = await inspectDataFile(path)
    expect(s).toMatchObject({
      name: 'carte',
      headerRow: 1,
      titleAbove: false,
      dataRows: 2,
      emptyRows: [3],
      duplicateHeaders: ['forza'],
      unnamedColumns: ['D']
    })
  })
})
