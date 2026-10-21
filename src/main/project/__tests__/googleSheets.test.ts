import ExcelJS from 'exceljs'
import { describe, expect, it } from 'vitest'
import { fetchGoogleSheet } from '../googleSheets'

const link = 'https://docs.google.com/spreadsheets/d/1AbCdEfGhIjKlMnOpQrStUvWxYz012345/edit'

async function xlsx(): Promise<ArrayBuffer> {
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet('Eroi')
  ws.addRow(['nome', 'forza'])
  ws.addRow(['Ada', 3])
  return (await wb.xlsx.writeBuffer()) as ArrayBuffer
}

describe('scaricare un foglio Google', () => {
  it('legge le schede dell xlsx esportato', async () => {
    const body = await xlsx()
    let asked = ''
    const sheets = await fetchGoogleSheet(link, async (url) => {
      asked = url
      return new Response(body)
    })
    expect(asked).toContain('/export?format=xlsx')
    expect(sheets).toEqual([{ name: 'Eroi', headers: ['nome', 'forza'], rows: [['Ada', '3']] }])
  })

  it('un foglio privato dà la pagina di accesso: errore che chiede di condividerlo', async () => {
    const page = async (): Promise<Response> =>
      new Response('<html>accedi</html>', { headers: { 'content-type': 'text/html' } })
    await expect(fetchGoogleSheet(link, page)).rejects.toThrow('gsheets.private')
    await expect(
      fetchGoogleSheet(link, async () => new Response('', { status: 404 }))
    ).rejects.toThrow('gsheets.notFound')
    await expect(fetchGoogleSheet('ciao')).rejects.toThrow('gsheets.badLink')
  })
})
