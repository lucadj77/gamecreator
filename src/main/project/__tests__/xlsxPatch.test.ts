import { copyFile, mkdtemp, readFile, writeFile } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'
import JSZip from 'jszip'
import { describe, expect, it } from 'vitest'
import { saveData } from '../save'
import { readSpreadsheet, writeSpreadsheet } from '../spreadsheet'
import { patchSheet, patchXlsx } from '../xlsxPatch'

const chart = join(__dirname, 'fixtures', 'chart.xlsx')

async function copyOfChart(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'gc-'))
  const path = join(dir, 'dati.xlsx')
  await copyFile(chart, path)
  return path
}

const sheet = (body: string, extra = ''): string =>
  `<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><dimension ref="A1:B2"/>${extra}<sheetData>${body}</sheetData></worksheet>`

describe('scrittura diretta nell xlsx', () => {
  it('cambia solo le celle modificate e tiene i grafici', async () => {
    const path = await copyOfChart()
    const [s] = await readSpreadsheet(path)
    s.rows[0][1] = '10'
    s.rows.push(['c', '3', '', 'Nuova\nriga & <altro>'])
    expect(await writeSpreadsheet(path, [s])).toBe(false)
    const zip = await JSZip.loadAsync(await readFile(path))
    const before = await JSZip.loadAsync(await readFile(chart))
    // grafico, disegno e il resto dell'archivio sono gli stessi
    for (const f of ['xl/charts/chart1.xml', 'xl/drawings/drawing1.xml', 'xl/styles.xml'])
      expect(await zip.file(f)!.async('string')).toBe(await before.file(f)!.async('string'))
    const [again] = await readSpreadsheet(path)
    expect(again.rows).toEqual([
      ['a', '10', '#DIV/0!', 'true'],
      ['b', '2', '#N/A', 'false'],
      ['c', '3', '', 'Nuova\nriga & <altro>']
    ])
    const xml = await zip.file('xl/worksheets/sheet1.xml')!.async('string')
    expect(xml).toContain('<dimension ref="A1:D4"/>')
    // le formule non toccate restano
    expect(xml).toContain('<f aca="false">NA()</f>')
    expect(await zip.file('xl/workbook.xml')!.async('string')).toContain('fullCalcOnLoad="1"')
  })

  it('senza modifiche il file resta uguale', async () => {
    const path = await copyOfChart()
    const before = await readFile(path)
    const [s] = await readSpreadsheet(path)
    await writeSpreadsheet(path, [s])
    expect(await readFile(path)).toEqual(before)
  })

  it('un set rinominato riscrive il file: con keepParts si rifiuta, senza perde il grafico', async () => {
    const path = await copyOfChart()
    const [s] = await readSpreadsheet(path)
    const renamed = { ...s, name: 'Mazzo', origin: s.name }
    await expect(writeSpreadsheet(path, [renamed], [], { keepParts: true })).rejects.toThrow(
      'save.needsRewrite'
    )
    expect(await writeSpreadsheet(path, [renamed])).toBe(true)
    const zip = await JSZip.loadAsync(await readFile(path))
    expect(zip.file('xl/charts/chart1.xml')).toBeNull()
  })

  it('saveData dice se il file è stato riscritto', async () => {
    const path = await copyOfChart()
    const dir = join(path, '..')
    const file = { formatVersion: 1, name: 'p', dataFile: 'dati.xlsx', sets: [] }
    await writeFile(join(dir, 'naibi.json'), JSON.stringify(file))
    const [s] = await readSpreadsheet(path)
    s.rows[1][0] = 'bb'
    expect(await saveData(dir, { sheets: [s], keepParts: true })).toEqual({ rewritten: false })
  })

  it('una formula sovrascritta esce dalla catena di calcolo', async () => {
    const zip = await JSZip.loadAsync(await readFile(chart))
    zip.file('xl/calcChain.xml', '<calcChain><c r="C2" i="1"/></calcChain>')
    const rels = await zip.file('xl/_rels/workbook.xml.rels')!.async('string')
    zip.file(
      'xl/_rels/workbook.xml.rels',
      rels.replace(
        '</Relationships>',
        '<Relationship Id="rId9" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/calcChain" Target="calcChain.xml"/></Relationships>'
      )
    )
    const data = await zip.generateAsync({ type: 'nodebuffer' })
    const out = await patchXlsx(data, new Map([['Carte', [{ row: 2, col: 3, value: 5 }]]]))
    const after = await JSZip.loadAsync(out!)
    expect(after.file('xl/calcChain.xml')).toBeNull()
    expect(await after.file('xl/_rels/workbook.xml.rels')!.async('string')).not.toContain(
      'calcChain'
    )
  })
})

describe('patchSheet', () => {
  it('aggiunge righe e celle in ordine, con lo stile della colonna', () => {
    const xml = sheet(
      '<row r="1" spans="1:2"><c r="A1" t="s"><v>0</v></c><c r="C1"><v>1</v></c></row><row r="5"><c r="A5"><v>2</v></c></row>',
      '<cols><col min="2" max="2" style="7"/></cols>'
    )
    const out = patchSheet(xml, [
      { row: 1, col: 2, value: 0.5 },
      { row: 3, col: 1, value: 'x' },
      { row: 5, col: 1, value: null },
      { row: 9, col: 1, value: null }
    ])!.xml
    expect(out).toContain(
      '<row r="1"><c r="A1" t="s"><v>0</v></c><c r="B1" s="7"><v>0.5</v></c><c r="C1"><v>1</v></c></row>' +
        '<row r="3"><c r="A3" t="inlineStr"><is><t xml:space="preserve">x</t></is></c></row><row r="5"/>'
    )
    expect(out).not.toContain('r="9"')
  })

  it('una cella svuotata tiene lo stile', () => {
    const out = patchSheet(sheet('<row r="2"><c r="B2" s="3"><v>4</v></c></row>'), [
      { row: 2, col: 2, value: null }
    ])!
    expect(out.xml).toContain('<row r="2"><c r="B2" s="3"/></row>')
    expect(out.formulaLost).toBe(false)
  })

  it('lascia a exceljs le forme che non gestisce', () => {
    const shared =
      '<row r="2"><c r="B2"><f t="shared" ref="B2:B3" si="0">A2*2</f><v>2</v></c></row>'
    expect(patchSheet(sheet(shared), [{ row: 2, col: 2, value: 1 }])).toBeNull()
    // una cella che usa la formula condivisa si può sovrascrivere
    const child = '<row r="3"><c r="B3"><f t="shared" si="0"/><v>4</v></c></row>'
    expect(patchSheet(sheet(child), [{ row: 3, col: 2, value: 1 }])!.formulaLost).toBe(true)
    // righe senza numero, elementi con prefisso
    expect(patchSheet(sheet('<row><c><v>1</v></c></row>'), [])).toBeNull()
    expect(patchSheet('<x:worksheet><x:sheetData/></x:worksheet>', [])).toBeNull()
  })
})
