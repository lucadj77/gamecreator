import JSZip from 'jszip'
import { describe, expect, it } from 'vitest'
import { odsWithOnly, readOds, writeOds } from '../ods'

const NS =
  'xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" ' +
  'xmlns:table="urn:oasis:names:tc:opendocument:xmlns:table:1.0" ' +
  'xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0"'

/** Un .ods come lo scrive LibreOffice: righe e celle ripetute, note, formule, spazi codificati */
async function ods(tables: string): Promise<Buffer> {
  const zip = new JSZip()
  zip.file('mimetype', 'application/vnd.oasis.opendocument.spreadsheet')
  zip.file(
    'content.xml',
    `<?xml version="1.0" encoding="UTF-8"?><office:document-content ${NS}><office:body><office:spreadsheet>${tables}</office:spreadsheet></office:body></office:document-content>`
  )
  return zip.generateAsync({ type: 'nodebuffer' })
}

const cell = (text: string, extra = ''): string =>
  `<table:table-cell office:value-type="string"${extra}><text:p>${text}</text:p></table:table-cell>`

const sample = (): Promise<Buffer> =>
  ods(
    `<table:table table:name="Carte"><table:table-column table:number-columns-repeated="4"/>` +
      `<table:table-header-rows><table:table-row>${cell('amount')}${cell('nome')}${cell('forza')}<table:table-cell table:number-columns-repeated="1021"/></table:table-row></table:table-header-rows>` +
      `<table:table-row>${cell('2')}${cell('Cavaliere<office:annotation><text:p>nota</text:p></office:annotation>')}<table:table-cell table:formula="of:=1+3" office:value-type="float" office:value="4"><text:p>4</text:p></table:table-cell></table:table-row>` +
      `<table:table-row table:number-rows-repeated="2"><table:table-cell table:number-columns-repeated="3"/></table:table-row>` +
      `<table:table-row><table:table-cell/>${cell('Drago<text:s text:c="2"/>rosso')}${cell('a<text:line-break/>b')}</table:table-row>` +
      `<table:table-row table:number-rows-repeated="1048570"><table:table-cell table:number-columns-repeated="1024"/></table:table-row>` +
      `</table:table><table:table table:name="Altro"><table:table-row>${cell('x')}</table:table-row></table:table>`
  )

describe('ods', () => {
  it('legge il testo delle celle, senza note e senza le righe vuote in fondo', async () => {
    const tables = await readOds(await sample())
    expect(tables.map((t) => t.name)).toEqual(['Carte', 'Altro'])
    expect(tables[0].rows).toEqual([
      ['amount', 'nome', 'forza'],
      ['2', 'Cavaliere', '4'],
      [],
      [],
      ['', 'Drago  rosso', 'a\nb']
    ])
  })

  it('riscrive le colonne con intestazione e tiene il resto', async () => {
    const out = await writeOds(await sample(), [
      {
        name: 'Carte',
        headers: ['amount', 'nome', 'forza', 'testo'],
        rows: [
          ['2', 'Cavaliere', '4', 'Attacca'],
          ['', 'Drago  & co', '5', '']
        ]
      },
      { name: 'Nuovo', headers: ['nome'], rows: [['Uno']] }
    ])
    const tables = await readOds(out)
    expect(tables.map((t) => t.name)).toEqual(['Carte', 'Altro', 'Nuovo'])
    expect(tables[0].rows).toEqual([
      ['amount', 'nome', 'forza', 'testo'],
      ['2', 'Cavaliere', '4', 'Attacca'],
      ['', 'Drago  & co', '5']
    ])
    const xml = await (await JSZip.loadAsync(out)).file('content.xml')!.async('string')
    // formula e nota della cella rimasta uguale ci sono ancora; le righe vuote in fondo restano
    // ripetute, e la carta tolta dal set è stata svuotata
    expect(xml).toContain('table:formula="of:=1+3"')
    expect(xml).toContain('<office:annotation>')
    expect(xml).toContain('table:number-rows-repeated="1048570"')
    expect(xml).toContain('<text:p>Drago <text:s text:c="1"/>&amp; co</text:p>')
  })

  it('rinomina la tabella di un set rinominato tenendone il contenuto', async () => {
    const out = await writeOds(await sample(), [
      {
        name: 'Eroi & co',
        origin: 'Carte',
        headers: ['amount', 'nome', 'forza'],
        rows: [['2', 'Cavaliere', '4']]
      }
    ])
    const tables = await readOds(out)
    expect(tables.map((t) => t.name)).toEqual(['Eroi & co', 'Altro'])
    expect(tables[0].rows[1]).toEqual(['2', 'Cavaliere', '4'])
    const xml = await (await JSZip.loadAsync(out)).file('content.xml')!.async('string')
    expect(xml).toContain('table:formula="of:=1+3"')
  })

  it('toglie la tabella di un set eliminato e ne lascia prendere il nome', async () => {
    const out = await writeOds(
      await sample(),
      [{ name: 'Carte', origin: 'Altro', headers: ['x'], rows: [['y']] }],
      ['Carte']
    )
    const tables = await readOds(out)
    expect(tables.map((t) => t.name)).toEqual(['Carte'])
    expect(tables[0].rows).toEqual([['x'], ['y']])
  })

  it('copia una sola tabella, con il suo contenuto', async () => {
    const tables = await readOds(await odsWithOnly(await sample(), 'Carte'))
    expect(tables.map((t) => t.name)).toEqual(['Carte'])
    expect(tables[0].rows[1]).toEqual(['2', 'Cavaliere', '4'])
  })

  it('crea un file nuovo', async () => {
    const out = await writeOds(null, [{ name: 'Set', headers: ['nome', 'n'], rows: [['A', '1']] }])
    const zip = await JSZip.loadAsync(out)
    expect(Object.keys(zip.files)[0]).toBe('mimetype')
    expect((await readOds(out))[0].rows).toEqual([
      ['nome', 'n'],
      ['A', '1']
    ])
  })
})
