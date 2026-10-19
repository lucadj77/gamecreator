import { describe, expect, it } from 'vitest'
import { DEFAULT_IMAGE, DEFAULT_PDF, DEFAULT_TTS, type ExportCard } from '../export'
import { planImages, planPdf, planTts, posterLayout, sheetPage } from '../exportPlan'
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

  it('poster: parti che si sovrappongono almeno quanto chiesto, orientamento con meno pagine', () => {
    // plancia 400 × 300 su A4 con 10 mm di margine (190 × 277): ruotata bastano 2 × 2 pagine
    const L = posterLayout(400, 300, 190, 277, 10, true)
    expect([L.cols, L.rows, L.rotated]).toEqual([2, 2, true])
    expect(190 - L.stepX).toBeGreaterThanOrEqual(10)
    const up = posterLayout(400, 300, 190, 277, 10, false)
    expect([up.cols, up.rows]).toEqual([3, 2])
    // la fine dell'ultima parte coincide con il bordo della carta
    expect((up.cols - 1) * up.stepX + up.tileW).toBeCloseTo(400)
  })

  it('PDF: una carta più grande della pagina diventa un poster con le parti nominate', () => {
    const big = normalizeTemplate({ name: 'p', width: 400, height: 300, bleed: 3 })
    const sets = [{ name: 'plancia', cards: [{ ...card(1), template: big }] }]
    const o = { ...DEFAULT_PDF, sides: 'front' as const, bleed: false }
    const plan = planPdf(o, sets, 'gioco')
    expect(plan.overflow).toEqual([])
    const pages = plan.docs[0].pages
    expect(pages).toHaveLength(4)
    expect(pages.map((p) => p.labels?.[0].text.split(' ')[0])).toEqual(['A1', 'B1', 'A2', 'B2'])
    expect(pages[0].clip).toBeDefined()
    // senza poster resta una pagina che esce dai bordi, segnalata
    expect(planPdf({ ...o, poster: false }, sets, 'gioco').overflow).toEqual(['plancia'])
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

describe('piegatura e fogli di prova', () => {
  it('piegatura: fronte e retro affiancati, abbondanza solo all esterno', () => {
    const cards = Array.from({ length: 5 }, (_, i) => card(i + 1))
    const o = { ...DEFAULT_PDF, fold: true, bleed: true, landscape: true, duplex: 'long' as const }
    const plan = planPdf(o, [{ name: 'a', cards }], 'gioco')
    const page = plan.docs[0].pages[0]
    // A4 orizzontale, 297 - 20 di margine: coppie larghe 2 × 63 + 6 → 2 per riga, 2 righe
    expect(plan.docs[0].pages).toHaveLength(2)
    const [front, back] = page.items
    expect([front.side, back.side]).toEqual(['front', 'back'])
    expect(back.x - front.x).toBe(63)
    expect(front.crop).toEqual({ l: 0, r: 3 })
    expect(back.crop).toEqual({ l: 3, r: 0 })
    // la piegatura è tratteggiata, sulla linea tra i due lati
    const fold = page.lines.filter((l) => l.dash)
    expect(fold[0].x1).toBeCloseTo(front.x + 3 + 63)
  })

  it('fogli di prova: un PDF in più con tutte le carte rimpicciolite', () => {
    const cards = Array.from({ length: 3 }, (_, i) => card(i + 1))
    const plan = planPdf(
      { ...DEFAULT_PDF, proof: true, sides: 'both' },
      [{ name: 'a', cards }],
      'gioco'
    )
    expect(plan.docs.map((d) => d.name)).toEqual(['gioco', 'gioco_proof'])
    const proof = plan.docs[1].pages[0]
    expect(proof.items).toHaveLength(6)
    expect(proof.items[0].zoom).toBeLessThan(1)
    expect(proof.labels?.map((l) => l.text).slice(0, 2)).toEqual(['a 1', 'a 1 · back'])
  })
})
