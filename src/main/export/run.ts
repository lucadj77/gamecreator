import { mkdir, writeFile } from 'fs/promises'
import { dirname, join, resolve } from 'path'
import { pathToFileURL } from 'url'
import type { NativeImage } from 'electron'
import {
  cropMarks,
  defaultTtsFolder,
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
  ttsSavedObject,
  ttsScale,
  uniqueNames,
  TTS_MAX_COLS,
  TTS_MAX_ROWS,
  type ExportCard,
  type ExportContext,
  type ExportJob,
  type ExportProgress,
  type ExportResult,
  type ExportSet,
  type ImageOptions,
  type PdfOptions,
  type Scene,
  type ScenePage,
  type TtsDeckCard,
  type TtsOptions,
  type TtsSheet
} from '../../shared/export'
import { plainText } from '../../shared/model/markup'
import { msg } from '../../shared/messages'
import type { Side, Template } from '../../shared/model/template'
import { ExportWindow } from './window'

// Esegue un'esportazione: prepara le scene, le fa disegnare alla finestra nascosta e scrive i file.

/** 96 pixel CSS per pollice: le pagine del PDF si misurano così */
const PDF_SCALE = 96 / 25.4

export interface RunEnv {
  projectFolder: string
  platform: string
  home: string
  documents: string
  context: ExportContext
  onProgress(p: ExportProgress): void
  isCancelled(): boolean
}

interface Ctx {
  env: RunEnv
  win: ExportWindow
  result: ExportResult
  progress: ExportProgress
}

export async function runExport(job: ExportJob, env: RunEnv): Promise<ExportResult> {
  const result: ExportResult = { files: 0, folders: [], warnings: [], cancelled: false }
  const sets = job.sets.filter((s) => s.cards.length)
  if (!sets.length) return result
  const win = await ExportWindow.open(env.context)
  const ctx: Ctx = { env, win, result, progress: { done: 0, total: 0 } }
  try {
    if (job.kind === 'images') await exportImages(ctx, job.options, sets)
    else if (job.kind === 'pdf') await exportPdf(ctx, job.options, sets, job.project)
    else await exportTts(ctx, job.options, sets, job.project)
  } catch (e) {
    if (!(e instanceof Cancelled)) throw e
    result.cancelled = true
  } finally {
    win.close()
  }
  return result
}

class Cancelled extends Error {}

function step(ctx: Ctx): void {
  if (ctx.env.isCancelled()) throw new Cancelled()
  ctx.progress.done += 1
  ctx.env.onProgress({ ...ctx.progress })
}

function outputFolder(ctx: Ctx, folder: string): string {
  const out = folder.trim() ? resolve(folder) : join(ctx.env.projectFolder, 'export')
  if (!ctx.result.folders.includes(out)) ctx.result.folders.push(out)
  return out
}

async function write(ctx: Ctx, file: string, data: Buffer | string): Promise<void> {
  await mkdir(dirname(file), { recursive: true })
  await writeFile(file, data)
  ctx.result.files += 1
}

/** Una carta da sola, in pixel interi */
async function renderCard(
  ctx: Ctx,
  t: Template,
  side: Side,
  scale: number,
  opts: { bleed: boolean; mode: 'trim' | 'cut'; background: string | null }
): Promise<NativeImage> {
  const b = opts.bleed ? t.bleed : 0
  const page: ScenePage = {
    width: t.width + 2 * b,
    height: t.height + 2 * b,
    items: [{ x: 0, y: 0, template: t, side, mode: opts.bleed ? 'bleed' : opts.mode }],
    lines: []
  }
  const w = Math.round(page.width * scale)
  const h = Math.round(page.height * scale)
  // pixel interi: la scala si corregge di poco perché la carta riempia tutta l'immagine
  const scene: Scene = {
    pages: [page],
    scale: w / page.width,
    background: opts.background,
    lineColor: '#000',
    lineWidth: 0,
    linesOver: false
  }
  await ctx.win.show(scene, w, h)
  return ctx.win.capture(w, h)
}

// ——— Immagini ———

async function exportImages(ctx: Ctx, o: ImageOptions, sets: ExportSet[]): Promise<void> {
  const folder = outputFolder(ctx, o.folder)
  const pattern = effectivePattern(o)
  const sides = sidesOf(o.sides)
  const ext = o.format === 'jpg' ? 'jpg' : 'png'
  ctx.progress.total = sets.reduce((n, s) => n + s.cards.length * sides.length, 0)
  const scale = o.dpi / 25.4
  const transparent = o.transparent && o.format === 'png'
  for (const set of sets) {
    const digits = String(set.cards.length).length
    const jobs: { card: ExportCard; side: Side; names: string[] }[] = []
    const all: string[] = []
    for (const card of set.cards)
      for (const side of sides) {
        const copies = expandCopies([card], o.copies).map((x) => x.copy)
        const names = copies.map((copy) =>
          fileName(pattern, { set: set.name, n: card.n, digits, copy, side, fields: card.fields })
        )
        jobs.push({ card, side, names })
        all.push(...names)
      }
    // nomi ripetuti (per esempio {nome} uguale su due carte): si numerano
    const unique = uniqueNames(all)
    let k = 0
    for (const j of jobs) {
      const names = j.names.map(() => unique[k++])
      if (names.length) {
        const img = await renderCard(ctx, j.card.template, j.side, scale, {
          bleed: o.bleed,
          mode: 'trim',
          background: transparent ? null : '#FFFFFF'
        })
        const data = ext === 'jpg' ? img.toJPEG(clampQuality(o.quality)) : img.toPNG()
        // le copie sono la stessa immagine: si disegna una volta sola
        for (const name of names) await write(ctx, join(folder, `${name}.${ext}`), data)
      }
      step(ctx)
    }
  }
}

function clampQuality(q: number): number {
  return Math.max(1, Math.min(100, Math.round(q) || 92))
}

// ——— PDF ———

interface PdfDoc {
  name: string
  pages: ScenePage[]
}

async function exportPdf(
  ctx: Ctx,
  o: PdfOptions,
  sets: ExportSet[],
  project: string
): Promise<void> {
  const folder = outputFolder(ctx, o.folder)
  const page = pageSize(o)
  const bySet = sets.map((set) => {
    const t = set.cards[0].template
    const grid = pdfGrid(o, t)
    if (gridOverflows(grid)) ctx.result.warnings.push(msg('export.gridOverflow', { set: set.name }))
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
          mode: o.bleed ? ('bleed' as const) : ('cut' as const)
        })),
        lines: cropMarks(o, grid, plan.cards)
      }
    }))
    return { set, pages }
  })
  const docs: PdfDoc[] = []
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

  ctx.progress.total = docs.length
  const names = uniqueNames(docs.map((d) => d.name))
  for (let i = 0; i < docs.length; i++) {
    const doc = docs[i]
    if (!doc.pages.length) continue
    const scene: Scene = {
      pages: doc.pages,
      scale: PDF_SCALE,
      background: '#FFFFFF',
      lineColor: o.markColor,
      lineWidth: o.markWidth,
      linesOver: o.marksOver
    }
    await ctx.win.show(scene, page.width * PDF_SCALE, page.height * PDF_SCALE)
    await write(ctx, join(folder, `${names[i]}.pdf`), await ctx.win.printToPdf())
    step(ctx)
  }
}

// ——— Tabletop Simulator ———

interface RenderedSheet {
  face: Buffer
  back: Buffer
  cols: number
  rows: number
  uniqueBack: boolean
}

async function exportTts(
  ctx: Ctx,
  o: TtsOptions,
  sets: ExportSet[],
  project: string
): Promise<void> {
  const env = ctx.env
  const targets: string[] = []
  if (o.destination !== 'tts') targets.push(join(env.projectFolder, 'export', 'tts'))
  if (o.destination !== 'project') {
    const root = o.ttsFolder.trim() || defaultTtsFolder(env.platform, env.home, env.documents)
    targets.push(join(root, safeName(project || 'GameCreator')))
  }
  for (const t of targets) if (!ctx.result.folders.includes(t)) ctx.result.folders.push(t)

  const fixed = o.grid === 'fixed'
  const cols = Math.min(TTS_MAX_COLS, Math.max(2, o.cols))
  const rows = Math.min(TTS_MAX_ROWS, Math.max(2, o.rows))
  const perSheet = fixed ? cols * rows - 1 : TTS_MAX_COLS * TTS_MAX_ROWS - 1
  const plans = sets.map((set) => {
    // senza copie ogni riga è una carta; con le copie le righe a 0 non entrano nel mazzo
    const cards = set.cards.filter((c) => !o.copies || c.amount > 0)
    const chunks: ExportCard[][] = []
    for (let i = 0; i < cards.length; i += perSheet) chunks.push(cards.slice(i, i + perSheet))
    return { set, chunks }
  })
  ctx.progress.total = plans.reduce((n, p) => n + p.chunks.length * 2 + 1, 0)

  for (const { set, chunks } of plans) {
    if (!chunks.length) continue
    const t0 = chunks[0][0].template
    const backs = chunks.flat().map((c) => JSON.stringify(c.template.back))
    const sameBacks = backs.every((b) => b === backs[0])
    const unique = o.back === 'sheet' || (o.back === 'auto' && !sameBacks)

    const sheets: RenderedSheet[] = []
    let singleBack: Buffer | null = null
    for (const chunk of chunks) {
      const g = fixed ? { cols, rows } : ttsAutoGrid(chunk.length, t0.width, t0.height)
      const scale = ttsScale(g.cols, g.rows, t0.width, t0.height, o.maxSize)
      const face = await renderSheet(ctx, chunk, 'front', g.cols, g.rows, scale)
      step(ctx)
      let back: Buffer
      if (unique) back = await renderSheet(ctx, chunk, 'back', g.cols, g.rows, scale)
      else {
        singleBack ??= (
          await renderCard(ctx, t0, 'back', scale, {
            bleed: false,
            mode: 'cut',
            background: '#FFFFFF'
          })
        ).toPNG()
        back = singleBack
      }
      step(ctx)
      sheets.push({ face, back, ...g, uniqueBack: unique })
    }
    const thumb = (
      await renderCard(ctx, t0, 'front', 256 / t0.width, {
        bleed: false,
        mode: 'trim',
        background: null
      })
    ).toPNG()
    step(ctx)

    const deck: TtsDeckCard[] = []
    chunks.forEach((chunk, sheet) =>
      chunk.forEach((card, slot) => {
        const n = o.copies ? card.amount : 1
        for (let i = 0; i < n; i++)
          deck.push({
            sheet,
            slot,
            nickname: fieldText(card, o.nickname),
            description: fieldText(card, o.description)
          })
      })
    )

    const stem = safeName(set.name)
    for (const target of targets) {
      const ttsSheets: TtsSheet[] = []
      for (let i = 0; i < sheets.length; i++) {
        const s = sheets[i]
        const faceFile = join(target, 'images', `${stem}_faces_${i + 1}.png`)
        await write(ctx, faceFile, s.face)
        let backFile: string
        if (s.uniqueBack) {
          backFile = join(target, 'images', `${stem}_backs_${i + 1}.png`)
          await write(ctx, backFile, s.back)
        } else {
          backFile = join(target, 'images', `${stem}_back.png`)
          if (i === 0) await write(ctx, backFile, s.back)
        }
        ttsSheets.push({
          faceUrl: pathToFileURL(faceFile).href,
          backUrl: pathToFileURL(backFile).href,
          cols: s.cols,
          rows: s.rows,
          uniqueBack: s.uniqueBack
        })
      }
      const object = ttsSavedObject(set.name, ttsSheets, deck)
      await write(ctx, join(target, `${stem}.json`), JSON.stringify(object, null, 2) + '\n')
      // miniatura mostrata da Tabletop Simulator tra gli oggetti salvati
      await write(ctx, join(target, `${stem}.png`), thumb)
    }
  }
}

function fieldText(card: ExportCard, field: string): string {
  if (!field) return ''
  return plainText(card.fields[field] ?? '').trim()
}

/** Foglio di carte a griglia; l'ultima posizione mostra il retro, come carta nascosta */
async function renderSheet(
  ctx: Ctx,
  cards: ExportCard[],
  side: Side,
  cols: number,
  rows: number,
  scale: number
): Promise<Buffer> {
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
  const width = cols * t0.width
  const height = rows * t0.height
  const scene: Scene = {
    pages: [{ width, height, items, lines: [] }],
    scale,
    background: '#FFFFFF',
    lineColor: '#000',
    lineWidth: 0,
    linesOver: false
  }
  const w = Math.round(width * scale)
  const h = Math.round(height * scale)
  await ctx.win.show(scene, w, h)
  return (await ctx.win.capture(w, h)).toPNG()
}
