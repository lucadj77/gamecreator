// Piano di un'esportazione: quali file, pagine e fogli escono e cosa contengono. Lo usano sia il
// processo principale, che li disegna e li scrive (src/main/export/run.ts), sia l'anteprima nella
// finestra di esportazione, così l'anteprima mostra esattamente ciò che verrà scritto.

import {
  TTS_MAX_COLS,
  TTS_MAX_ROWS,
  cropMarks,
  effectivePattern,
  expandCopies,
  fileName,
  gridOverflows,
  pageSize,
  pdfGrid,
  planPdfPages,
  safeName,
  sidesOf,
  ttsAutoGrid,
  ttsScale,
  uniqueNames,
  type CardMode,
  type ExportCard,
  type ExportSet,
  type ImageOptions,
  type PdfOptions,
  type ScenePage,
  type TtsOptions
} from './export'
import type { Side, Template } from './model/template'

/** Una carta da sola, con o senza abbondanza */
export function cardPage(t: Template, side: Side, bleed: boolean, mode: CardMode): ScenePage {
  const b = bleed ? t.bleed : 0
  return {
    width: t.width + 2 * b,
    height: t.height + 2 * b,
    items: [{ x: 0, y: 0, template: t, side, mode: bleed ? 'bleed' : mode }],
    lines: []
  }
}

// ——— Immagini ———

export interface ImageFile {
  set: string
  card: ExportCard
  side: Side
  /** Percorsi relativi senza estensione, uno per copia: le copie sono la stessa immagine */
  names: string[]
}

export const imageExtension = (o: ImageOptions): 'jpg' | 'png' =>
  o.format === 'jpg' ? 'jpg' : 'png'

/** Le immagini da scrivere, carta per carta e lato per lato, con i nomi dei file */
export function planImages(o: ImageOptions, sets: ExportSet[]): ImageFile[] {
  const pattern = effectivePattern(o)
  const sides = sidesOf(o.sides)
  const out: ImageFile[] = []
  for (const set of sets) {
    const digits = String(set.cards.length).length
    const files: ImageFile[] = []
    const all: string[] = []
    for (const card of set.cards)
      for (const side of sides) {
        const copies = expandCopies([card], o.copies).map((x) => x.copy)
        const names = copies.map((copy) =>
          fileName(pattern, { set: set.name, n: card.n, digits, copy, side, fields: card.fields })
        )
        files.push({ set: set.name, card, side, names })
        all.push(...names)
      }
    // nomi ripetuti (per esempio {nome} uguale su due carte): si numerano
    const unique = uniqueNames(all)
    let k = 0
    for (const f of files) out.push({ ...f, names: f.names.map(() => unique[k++]) })
  }
  return out
}

// ——— PDF ———

export interface PdfDocument {
  /** Nome del file senza estensione, già reso unico */
  name: string
  pages: ScenePage[]
}

export interface PdfPlan {
  docs: PdfDocument[]
  /** Set la cui griglia esce dalla pagina */
  overflow: string[]
}

export function planPdf(o: PdfOptions, sets: ExportSet[], project: string): PdfPlan {
  const page = pageSize(o)
  const overflow: string[] = []
  const bySet = sets.map((set) => {
    const grid = pdfGrid(o, set.cards[0].template)
    if (gridOverflows(grid)) overflow.push(set.name)
    const plans = planPdfPages(o, grid, expandCopies(set.cards, o.copies))
    const pages = plans.map((plan) => ({
      side: plan.side,
      page: {
        width: page.width,
        height: page.height,
        items: plan.cards.map((c) => ({
          x: c.x,
          y: c.y,
          template: c.instance.card.template,
          side: c.side,
          mode: o.bleed ? ('bleed' as const) : o.rounded ? ('trim' as const) : ('cut' as const)
        })),
        lines: cropMarks(o, grid, plan.cards)
      }
    }))
    return { set, pages }
  })
  const docs: PdfDocument[] = []
  const base = safeName(project || 'cards')
  if (o.split === 'set') {
    for (const s of bySet)
      docs.push({ name: safeName(s.set.name), pages: s.pages.map((p) => p.page) })
  } else if (o.split === 'side') {
    for (const side of ['front', 'back'] as const) {
      const pages = bySet.flatMap((s) => s.pages.filter((p) => p.side === side).map((p) => p.page))
      if (pages.length) docs.push({ name: `${base}_${side}`, pages })
    }
  } else docs.push({ name: base, pages: bySet.flatMap((s) => s.pages.map((p) => p.page)) })
  const names = uniqueNames(docs.map((d) => d.name))
  return {
    docs: docs.map((d, i) => ({ ...d, name: names[i] })).filter((d) => d.pages.length),
    overflow
  }
}

// ——— Tabletop Simulator ———

export interface TtsChunk {
  cards: ExportCard[]
  cols: number
  rows: number
  /** Pixel per mm del foglio */
  scale: number
}

export interface TtsSetPlan {
  set: ExportSet
  chunks: TtsChunk[]
  /** Un foglio dei retri per ogni foglio di fronti, invece di un retro unico */
  uniqueBack: boolean
}

/** Fogli di ogni set: fino a 69 carte per foglio, l'ultima posizione alla carta nascosta */
export function planTts(o: TtsOptions, sets: ExportSet[]): TtsSetPlan[] {
  const fixed = o.grid === 'fixed'
  const cols = Math.min(TTS_MAX_COLS, Math.max(2, o.cols))
  const rows = Math.min(TTS_MAX_ROWS, Math.max(2, o.rows))
  const perSheet = fixed ? cols * rows - 1 : TTS_MAX_COLS * TTS_MAX_ROWS - 1
  return sets.map((set) => {
    // senza copie ogni riga è una carta; con le copie le righe a 0 non entrano nel mazzo
    const cards = set.cards.filter((c) => !o.copies || c.amount > 0)
    const chunks: TtsChunk[] = []
    for (let i = 0; i < cards.length; i += perSheet) {
      const chunk = cards.slice(i, i + perSheet)
      const t0 = chunk[0].template
      const g = fixed ? { cols, rows } : ttsAutoGrid(chunk.length, t0.width, t0.height)
      chunks.push({
        cards: chunk,
        ...g,
        scale: ttsScale(g.cols, g.rows, t0.width, t0.height, o.maxSize)
      })
    }
    const backs = cards.map((c) => JSON.stringify(c.template.back))
    const sameBacks = backs.every((b) => b === backs[0])
    return { set, chunks, uniqueBack: o.back === 'sheet' || (o.back === 'auto' && !sameBacks) }
  })
}

/** Foglio di carte a griglia; l'ultima posizione mostra il retro, come carta nascosta */
export function sheetPage(chunk: TtsChunk, side: Side): ScenePage {
  const { cards, cols, rows } = chunk
  const t0 = cards[0].template
  const items = cards.map((c, i) => ({
    x: (i % cols) * t0.width,
    y: Math.floor(i / cols) * t0.height,
    template: c.template,
    side,
    mode: 'cut' as const
  }))
  const last = cols * rows - 1
  items.push({
    x: (last % cols) * t0.width,
    y: Math.floor(last / cols) * t0.height,
    template: t0,
    side: 'back',
    mode: 'cut'
  })
  return { width: cols * t0.width, height: rows * t0.height, items, lines: [] }
}
