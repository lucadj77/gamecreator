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
  mirrorsX,
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
  type SceneLine,
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
    if (gridOverflows(grid) && o.poster) return { set, pages: posterPages(o, set) }
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
          mode: o.bleed ? ('bleed' as const) : o.rounded ? ('trim' as const) : ('cut' as const),
          // girando il foglio sul lato verticale la carta si capovolge: il retro ruota al contrario
          rotate: !grid.rotated
            ? (0 as const)
            : c.side === 'back' && o.duplex !== 'none' && mirrorsX(o)
              ? (270 as const)
              : (90 as const)
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

// ——— Poster ———

/** Lettere delle colonne delle parti di un poster: A, B, …, Z, AA, AB… */
const column = (i: number): string =>
  (i >= 26 ? column(Math.floor(i / 26) - 1) : '') + String.fromCharCode(65 + (i % 26))

export interface PosterLayout {
  cols: number
  rows: number
  /** Passo tra una parte e la successiva, in mm della carta */
  stepX: number
  stepY: number
  /** Parte visibile su ogni pagina */
  tileW: number
  tileH: number
  rotated: boolean
}

/**
 * Parti di un poster per una carta di cw × ch mm su un'area stampabile aw × ah: le parti si
 * sovrappongono almeno di `overlap`, distribuite in modo uguale. Si sceglie l'orientamento
 * della carta con meno pagine.
 */
export function posterLayout(
  cw: number,
  ch: number,
  aw: number,
  ah: number,
  overlap: number,
  autoRotate: boolean
): PosterLayout {
  const axis = (size: number, avail: number): { n: number; step: number; tile: number } => {
    if (size <= avail + 1e-6) return { n: 1, step: 0, tile: size }
    const ov = Math.min(Math.max(0, overlap), avail / 2)
    const n = Math.ceil((size - ov) / (avail - ov) - 1e-6)
    return { n, step: (size - avail) / (n - 1), tile: avail }
  }
  const make = (w: number, h: number, rotated: boolean): PosterLayout => {
    const x = axis(w, aw)
    const y = axis(h, ah)
    return {
      cols: x.n,
      rows: y.n,
      stepX: x.step,
      stepY: y.step,
      tileW: x.tile,
      tileH: y.tile,
      rotated
    }
  }
  const upright = make(cw, ch, false)
  if (!autoRotate) return upright
  const turned = make(ch, cw, true)
  return turned.cols * turned.rows < upright.cols * upright.rows ? turned : upright
}

/**
 * Pagine di un set le cui carte non entrano nella pagina: ogni carta (e ogni copia) si divide
 * in parti che si sovrappongono. Sulla pagina: i segni di taglio della carta dove cadono, i
 * segni dell'inizio della sovrapposizione nei margini, e il nome della parte (A1, B1…).
 * I retri seguono i fronti come pagine a parte, senza fronte-retro.
 */
function posterPages(o: PdfOptions, set: ExportSet): { side: Side; page: ScenePage }[] {
  const page = pageSize(o)
  const aw = page.width - 2 * o.margin
  const ah = page.height - 2 * o.margin
  const out: { side: Side; page: ScenePage }[] = []
  const sides = o.duplex !== 'none' ? (['front', 'back'] as const) : sidesOf(o.sides)
  for (const side of sides)
    for (const inst of expandCopies(set.cards, o.copies)) {
      const t = inst.card.template
      const b = o.bleed ? t.bleed : 0
      const w0 = t.width + 2 * b
      const h0 = t.height + 2 * b
      const L = posterLayout(w0, h0, aw, ah, o.posterOverlap, o.autoRotate)
      const [cw, ch] = L.rotated ? [h0, w0] : [w0, h0]
      // la parte sta in alto a sinistra dell'area stampabile, centrata se la carta è più piccola
      const x0 = o.margin + (aw - L.tileW) / 2
      const y0 = o.margin + (ah - L.tileH) / 2
      for (let r = 0; r < L.rows; r++)
        for (let c = 0; c < L.cols; c++) {
          const ox = c * L.stepX
          const oy = r * L.stepY
          const clip = { x: x0, y: y0, w: L.tileW, h: L.tileH }
          // bordi di taglio della carta in coordinate della pagina
          const trim = {
            l: x0 - ox + b,
            t: y0 - oy + b,
            r: x0 - ox + cw - b,
            b: y0 - oy + ch - b
          }
          const lines: SceneLine[] = []
          const len = Math.min(o.markLength, o.margin)
          const inX = (x: number): boolean => x >= clip.x - 1e-6 && x <= clip.x + clip.w + 1e-6
          const inY = (y: number): boolean => y >= clip.y - 1e-6 && y <= clip.y + clip.h + 1e-6
          if (o.marks !== 'none' && len > 0) {
            for (const x of [trim.l, trim.r])
              if (inX(x)) {
                lines.push({ x1: x, y1: clip.y - len, x2: x, y2: clip.y })
                lines.push({ x1: x, y1: clip.y + clip.h, x2: x, y2: clip.y + clip.h + len })
              }
            for (const y of [trim.t, trim.b])
              if (inY(y)) {
                lines.push({ x1: clip.x - len, y1: y, x2: clip.x, y2: y })
                lines.push({ x1: clip.x + clip.w, y1: y, x2: clip.x + clip.w + len, y2: y })
              }
          }
          // dove comincia la parte accanto: lì si sovrappone, o si taglia per accostare
          const half = len / 2
          if (c + 1 < L.cols) {
            const x = clip.x + L.stepX
            lines.push({ x1: x, y1: clip.y - half, x2: x, y2: clip.y })
            lines.push({ x1: x, y1: clip.y + clip.h, x2: x, y2: clip.y + clip.h + half })
          }
          if (r + 1 < L.rows) {
            const y = clip.y + L.stepY
            lines.push({ x1: clip.x - half, y1: y, x2: clip.x, y2: y })
            lines.push({ x1: clip.x + clip.w, y1: y, x2: clip.x + clip.w + half, y2: y })
          }
          const name = `${column(c)}${r + 1}`
          const size = Math.min(3, Math.max(1.5, o.margin / 3))
          out.push({
            side,
            page: {
              width: page.width,
              height: page.height,
              items: [
                {
                  x: x0 - ox,
                  y: y0 - oy,
                  template: t,
                  side,
                  mode: o.bleed ? 'bleed' : o.rounded ? 'trim' : 'cut',
                  rotate: L.rotated ? 90 : 0
                }
              ],
              lines,
              clip,
              labels:
                L.cols * L.rows > 1
                  ? [
                      {
                        x: clip.x,
                        y: Math.min(page.height - size / 2, clip.y + clip.h + size * 1.5),
                        text: `${name} · ${set.name} ${inst.card.n}${side === 'back' ? ' · back' : ''}`,
                        size
                      }
                    ]
                  : undefined
            }
          })
        }
    }
  return out
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
