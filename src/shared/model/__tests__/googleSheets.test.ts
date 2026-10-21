import { describe, expect, it } from 'vitest'
import { googleExportUrl, googleSheetId, matchTabs } from '../googleSheets'

describe('Google Sheets', () => {
  const id = '1AbCdEfGhIjKlMnOpQrStUvWxYz0123456789_-xyz'

  it('codice del foglio dal link o da solo', () => {
    expect(googleSheetId(`https://docs.google.com/spreadsheets/d/${id}/edit#gid=0`)).toBe(id)
    expect(googleSheetId(`  ${id} `)).toBe(id)
    expect(googleSheetId('https://example.com/foglio')).toBeNull()
    expect(googleExportUrl(id)).toBe(
      `https://docs.google.com/spreadsheets/d/${id}/export?format=xlsx`
    )
  })

  it('ogni scheda al set con lo stesso foglio o nome, poi senza maiuscole; uno per set', () => {
    const sets = [{ name: 'Eroi' }, { name: 'Mostri', sheet: 'Nemici' }, { name: 'oggetti' }]
    expect(matchTabs(['nemici', 'Eroi', 'Oggetti', 'eroi', 'Altro'], sets)).toEqual({
      nemici: 'Mostri',
      Eroi: 'Eroi',
      Oggetti: 'oggetti',
      eroi: '',
      Altro: ''
    })
  })
})
