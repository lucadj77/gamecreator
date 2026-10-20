import { describe, expect, it } from 'vitest'
import {
  DEFAULT_IMAGE,
  DEFAULT_PDF,
  cellPosition,
  cropMarks,
  effectivePattern,
  expandCopies,
  fileName,
  gridOverflows,
  mirrorsX,
  pdfGrid,
  planPdfPages,
  safeName,
  ttsAutoGrid,
  ttsSavedObject,
  ttsScale,
  uniqueNames,
  type ExportCard,
  type PdfOptions
} from '../export'
import { normalizeTemplate } from '../model/normalize'

const tpl = normalizeTemplate({ name: 't', width: 63, height: 88, bleed: 3, front: [], back: [] })
const card = (n: number, amount = 1): ExportCard => ({
  n,
  amount,
  label: `c${n}`,
  fields: { nome: `Carta ${n}` },
  template: tpl
})
const pdf = (o: Partial<PdfOptions> = {}): PdfOptions => ({ ...DEFAULT_PDF, ...o })

describe('copie', () => {
  it('ripete le carte secondo amount, o una per riga senza copie', () => {
    const cards = [card(1, 2), card(2, 0), card(3)]
    expect(expandCopies(cards, true).map((i) => `${i.card.n}.${i.copy}`)).toEqual([
      '1.1',
      '1.2',
      '3.1'
    ])
    expect(expandCopies(cards, false)).toHaveLength(3)
  })
})

describe('nomi dei file', () => {
  const parts = {
    set: 'Eroi',
    n: 7,
    digits: 3,
    copy: 2,
    side: 'back' as const,
    fields: { nome: 'Re/Regina' }
  }
  it('sostituisce i segnaposto e crea sottocartelle con /', () => {
    expect(fileName('%set/%n_{nome}_%side_%copy', parts)).toBe('Eroi/007_Re_Regina_back_2')
  })
  it('non esce dalla cartella e toglie i caratteri non ammessi', () => {
    expect(fileName('../%set', parts)).toBe('_/Eroi')
    expect(safeName('a:b*c?')).toBe('a_b_c_')
    // nomi riservati di Windows, con o senza estensione
    expect(safeName('CON')).toBe('_CON')
    expect(safeName('aux.png')).toBe('_aux.png')
    expect(safeName('console')).toBe('console')
  })
  it('rende unici i nomi uguali a meno di maiuscole', () => {
    expect(uniqueNames(['Eroi', 'eroi', 'Mostri', 'EROI'])).toEqual([
      'Eroi',
      'eroi_2',
      'Mostri',
      'EROI_3'
    ])
  })
  it('aggiunge lato e copia quando servono', () => {
    expect(effectivePattern({ ...DEFAULT_IMAGE, sides: 'both', copies: true })).toBe(
      '%set/%n_%side_%copy'
    )
  })
  it('numera i nomi ripetuti', () => {
    expect(uniqueNames(['a', 'b', 'A'])).toEqual(['a', 'b', 'A_2'])
  })
})

describe('impaginazione PDF', () => {
  it('mette 3 × 3 carte poker su un A4 con margini di 10 mm', () => {
    const g = pdfGrid(pdf(), tpl)
    expect([g.cols, g.rows]).toEqual([3, 3])
    expect(g.x0).toBeCloseTo((210 - 189) / 2)
  })
  it("con l'abbondanza le carte si toccano e la spaziatura non conta", () => {
    const g = pdfGrid(pdf({ bleed: true, spacing: 5, margin: 5, autoRotate: false }), tpl)
    expect(g.gap).toBe(0)
    expect(g.cellW).toBe(69)
    expect([g.cols, g.rows]).toEqual([2, 3])
  })
  it('ruota le carte quando ne entrano di più', () => {
    // 69 × 94 con l'abbondanza: dritte 2 × 3, ruotate 2 × 4
    const g = pdfGrid(pdf({ bleed: true, margin: 5 }), tpl)
    expect(g.rotated).toBe(true)
    expect([g.cellW, g.cellH, g.cols, g.rows]).toEqual([94, 69, 2, 4])
  })
  it('ruota una carta che dritta non entra nella pagina', () => {
    const big = normalizeTemplate({ name: 'p', width: 280, height: 200, front: [], back: [] })
    const g = pdfGrid(pdf({ margin: 5 }), big)
    expect(g.rotated).toBe(true)
    expect(gridOverflows(g)).toBe(false)
  })
  it('alterna fronti e retri e specchia i retri sul lato lungo', () => {
    const o = pdf({ duplex: 'long' })
    const g = pdfGrid(o, tpl)
    const pages = planPdfPages(o, g, expandCopies([card(1), card(2)], true))
    expect(pages.map((p) => p.side)).toEqual(['front', 'back'])
    expect(mirrorsX(o)).toBe(true)
    const front = pages[0].cards[0]
    const back = pages[1].cards[0]
    expect(back.x).toBeCloseTo(210 - front.x - 63)
    expect(back.y).toBeCloseTo(front.y)
  })
  it('sul lato corto specchia le righe, con lo spostamento dei retri', () => {
    const o = pdf({ duplex: 'short', offsetX: 1, offsetY: -0.5 })
    const g = pdfGrid(o, tpl)
    const f = cellPosition(o, g, 0, false)
    const b = cellPosition(o, g, 0, true)
    expect(b.x).toBeCloseTo(f.x + 1)
    expect(b.y).toBeCloseTo(297 - f.y - 88 - 0.5)
  })
  it('senza fronte-retro mette i retri dopo tutti i fronti', () => {
    const o = pdf({ sides: 'both' })
    const g = pdfGrid(o, tpl)
    const many = expandCopies([card(1, 12)], true)
    expect(planPdfPages(o, g, many).map((p) => p.side)).toEqual(['front', 'front', 'back', 'back'])
  })
  it("i segni agli angoli partono dal bordo dell'abbondanza", () => {
    const o = pdf({ bleed: true, markLength: 4 })
    const g = pdfGrid(o, tpl)
    const [page] = planPdfPages(o, g, expandCopies([card(1)], true))
    const marks = cropMarks(o, g, page.cards)
    expect(marks).toHaveLength(8)
    const c = page.cards[0]
    expect(marks[0]).toEqual({ x1: c.x + 3, y1: c.y - 4, x2: c.x + 3, y2: c.y })
  })
  it('le linee intere non si ripetono', () => {
    const o = pdf({ marks: 'lines' })
    const g = pdfGrid(o, tpl)
    const [page] = planPdfPages(o, g, expandCopies([card(1, 9)], true))
    // 3 colonne senza spaziatura: 4 linee verticali e 4 orizzontali
    expect(cropMarks(o, g, page.cards)).toHaveLength(8)
  })
})

describe('Tabletop Simulator', () => {
  it("lascia libera l'ultima posizione e riduce le posizioni vuote", () => {
    expect(ttsAutoGrid(4, 63, 88)).toEqual({ cols: 3, rows: 2 })
    expect(ttsAutoGrid(3, 63, 88)).toEqual({ cols: 2, rows: 2 })
    expect(ttsAutoGrid(69, 63, 88)).toEqual({ cols: 10, rows: 7 })
    const g = ttsAutoGrid(20, 63, 88)
    expect(g.cols * g.rows).toBeGreaterThanOrEqual(21)
  })
  it('resta entro la dimensione massima e i 300 DPI', () => {
    const s = ttsScale(10, 7, 63, 88, 4096)
    expect(10 * 63 * s).toBeLessThanOrEqual(4096)
    expect(Number.isInteger(63 * s)).toBe(true)
    expect(ttsScale(2, 2, 63, 88, 8192)).toBeLessThanOrEqual(300 / 25.4)
  })
  it('crea un mazzo con le copie e una carta sola se ce n’è una', () => {
    const sheet = { faceUrl: 'f', backUrl: 'b', cols: 3, rows: 2, uniqueBack: false }
    const deck = ttsSavedObject(
      'Eroi',
      [sheet],
      [
        { sheet: 0, slot: 0, nickname: 'A', description: '' },
        { sheet: 0, slot: 0, nickname: 'A', description: '' },
        { sheet: 0, slot: 1, nickname: 'B', description: 'x' }
      ]
    ) as { ObjectStates: Record<string, unknown>[] }
    const obj = deck.ObjectStates[0]
    expect(obj.Name).toBe('Deck')
    expect(obj.DeckIDs).toEqual([100, 100, 101])
    // le copie hanno GUID diversi, altrimenti Tabletop Simulator ne tiene una sola
    const guids = (obj.ContainedObjects as { GUID: string }[]).map((c) => c.GUID)
    expect(new Set([obj.GUID, ...guids]).size).toBe(4)
    for (const g of guids) expect(g).toMatch(/^[0-9a-f]{6}$/)
    expect(obj.ContainedObjects).toHaveLength(3)
    const one = ttsSavedObject(
      'Eroi',
      [sheet],
      [{ sheet: 0, slot: 0, nickname: '', description: '' }]
    ) as { ObjectStates: Record<string, unknown>[] }
    expect(one.ObjectStates[0]).toMatchObject({ Name: 'Card', CardID: 100, Nickname: 'Eroi' })
  })
})
