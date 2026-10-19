import { describe, expect, it } from 'vitest'
import { DEFAULT_IMAGE, DEFAULT_PDF, DEFAULT_TTS, type ExportCard } from '../export'
import { planImages, planPdf, planTts, sheetPage } from '../exportPlan'
import { normalizeTemplate } from '../model/normalize'

const tpl = normalizeTemplate({ name: 't', width: 63, height: 88, bleed: 3, front: [], back: [] })
const card = (n: number, amount = 1, nome = `Carta ${n}`): ExportCard => ({
  n,
  amount,
  label: `c${n}`,
  fields: { nome },
  template: tpl
})

describe("piano dell'esportazione", () => {
  it('immagini: un file per carta e lato, nomi ripetuti numerati, copie raggruppate', () => {
    const sets = [{ name: 'eroi', cards: [card(1, 2, 'A'), card(2, 1, 'A')] }]
    const files = planImages({ ...DEFAULT_IMAGE, pattern: '%set/{nome}', copies: true }, sets)
    expect(files.map((f) => f.names)).toEqual([['eroi/A_1', 'eroi/A_2'], ['eroi/A_1_2']])
  })

  it('PDF: un documento per set con le sue pagine', () => {
    const cards = Array.from({ length: 10 }, (_, i) => card(i + 1))
    const plan = planPdf(
      { ...DEFAULT_PDF, split: 'set', sides: 'front' },
      [
        { name: 'a', cards },
        { name: 'a', cards: [card(1)] }
      ],
      'gioco'
    )
    expect(plan.docs.map((d) => [d.name, d.pages.length])).toEqual([
      ['a', 2],
      ['a_2', 1]
    ])
    expect(plan.overflow).toEqual([])
  })

  it("Tabletop Simulator: la carta nascosta occupa l'ultima posizione del foglio", () => {
    const [plan] = planTts(DEFAULT_TTS, [{ name: 's', cards: [card(1), card(2), card(3)] }])
    expect(plan.chunks).toHaveLength(1)
    const page = sheetPage(plan.chunks[0], 'front')
    const { cols, rows } = plan.chunks[0]
    expect(page.items).toHaveLength(4)
    expect(page.items[3]).toMatchObject({
      x: (cols - 1) * 63,
      y: (rows - 1) * 88,
      side: 'back'
    })
  })
})
