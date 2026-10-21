import { describe, expect, it } from 'vitest'
import { DEFAULT_IMAGE, DEFAULT_PDF, DEFAULT_TTS, type ExportCard } from '../export'
import { piecePage, planImages, planPdf, planTts, posterLayout, sheetPage } from '../exportPlan'
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

describe('Tabletop Simulator: segnalini e tessere', () => {
  it('un set di segnalini non ha fogli: un pezzo per carta con le sue copie', () => {
    const o = {
      ...DEFAULT_TTS,
      objects: { s: { type: 'token' as const, thickness: 0.3, edgeColor: '#FFF' } }
    }
    const [plan, other] = planTts(o, [
      { name: 's', cards: [card(1, 3), card(2, 0), card(3, 1)] },
      { name: 'carte', cards: [card(1)] }
    ])
    expect(plan.chunks).toEqual([])
    expect(plan.pieces.map((p) => [p.card.n, p.count])).toEqual([
      [1, 3],
      [3, 1]
    ])
    expect(plan.pieces[0].scale).toBeLessThanOrEqual(300 / 25.4)
    expect(other.object.type).toBe('card')
    expect(other.chunks).toHaveLength(1)
  })

  it('il segnalino ha un margine trasparente, la tessera è il rettangolo della carta', () => {
    const token = piecePage(tpl, 'front', 'token')
    expect([token.width, token.height]).toEqual([65, 90])
    expect(token.items[0]).toMatchObject({ x: 1, y: 1, mode: 'trim' })
    const tile = piecePage(tpl, 'back', 'tile')
    expect([tile.width, tile.height]).toEqual([63, 88])
    expect(tile.items[0]).toMatchObject({ side: 'back', mode: 'cut' })
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

describe('casi limite', () => {
  it('immagini: nomi unici tra set diversi anche senza %set', () => {
    const sets = [
      { name: 'eroi', cards: [card(1, 1, 'A')] },
      { name: 'mostri', cards: [card(1, 1, 'A')] }
    ]
    const files = planImages({ ...DEFAULT_IMAGE, pattern: '{nome}' }, sets)
    expect(files.map((f) => f.names[0])).toEqual(['A', 'A_2'])
  })

  it('poster: senza area utile il conto delle parti resta finito', () => {
    const L = posterLayout(63, 88, 0, 77, 10, true)
    expect(Number.isFinite(L.cols) && Number.isFinite(L.rows)).toBe(true)
    expect(L.cols * L.rows).toBeLessThanOrEqual(4)
    const big = normalizeTemplate({ name: 'big', width: 300, height: 400, front: [], back: [] })
    const sets = [{ name: 'eroi', cards: [{ ...card(1), template: big }] }]
    const plan = planPdf({ ...DEFAULT_PDF, poster: true, margin: 105, sides: 'front' }, sets, 'p')
    expect(plan.overflow).toEqual(['eroi'])
    expect(plan.docs.every((d) => d.pages.length < 100)).toBe(true)
    const grid = planPdf({ ...DEFAULT_PDF, margin: 200, sides: 'front' }, sets, 'p')
    expect(grid.overflow).toEqual(['eroi'])
  })
  it('TTS: copie nel mazzo o ripetute nel foglio', () => {
    const sets = [{ name: 's', cards: [card(1, 3), card(2, 0), card(3, 1)] }]
    const [deck] = planTts(DEFAULT_TTS, sets)
    expect(deck.chunks[0].cards.map((c) => c.n)).toEqual([1, 3])
    expect(deck.chunks[0].counts).toEqual([3, 1])
    const [sheet] = planTts({ ...DEFAULT_TTS, copiesIn: 'sheet' }, sets)
    expect(sheet.chunks[0].cards.map((c) => c.n)).toEqual([1, 1, 1, 3])
    expect(sheet.chunks[0].counts).toEqual([1, 1, 1, 1])
    // senza copie la scelta non conta: una carta per riga
    const [none] = planTts({ ...DEFAULT_TTS, copies: false, copiesIn: 'sheet' }, sets)
    expect(none.chunks[0].cards.map((c) => c.n)).toEqual([1, 2, 3])
    expect(none.chunks[0].counts).toEqual([1, 1, 1])
  })
  it('TTS: le copie ripetute nel foglio usano il template di ogni copia', () => {
    const t2 = normalizeTemplate({ name: 't2', width: 63, height: 88, front: [], back: [] })
    const c = { ...card(1, 2), perCopy: [tpl, t2] }
    const [plan] = planTts({ ...DEFAULT_TTS, copiesIn: 'sheet' }, [{ name: 's', cards: [c] }])
    expect(plan.chunks[0].cards.map((x) => x.template.name)).toEqual(['t', 't2'])
  })
})
