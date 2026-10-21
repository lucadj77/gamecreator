import { mkdir, writeFile } from 'fs/promises'
import { dirname, join, resolve } from 'path'
import { pathToFileURL } from 'url'
import {
  defaultTtsFolder,
  ttsImageUrl,
  pageSize,
  safeName,
  uniqueNames,
  ttsSavedObject,
  type ExportCard,
  type ExportContext,
  type ExportJob,
  type ExportProgress,
  type ExportResult,
  type ExportSet,
  type ImageOptions,
  type PdfOptions,
  type Scene,
  type TtsDeckCard,
  type TtsOptions,
  type TtsSheet
} from '../../shared/export'
import {
  cardPage,
  imageExtension,
  planImages,
  planPdf,
  planTts,
  sheetPage,
  type TtsChunk
} from '../../shared/exportPlan'
import { plainText } from '../../shared/model/markup'
import { msg } from '../../shared/messages'
import type { Side, Template } from '../../shared/model/template'

// Esegue un'esportazione: prepara le scene, le fa disegnare alla finestra nascosta e scrive i file.
// La finestra arriva da chi chiama (window.ts nell'app, un iframe nella versione web), così questo
// file non dipende da Electron.

/** 96 pixel CSS per pollice: le pagine del PDF si misurano così */
const PDF_SCALE = 96 / 25.4

/** Immagine catturata, come NativeImage di Electron */
export interface CapturedImage {
  toPNG(): Buffer
  toJPEG(quality: number): Buffer
}

/** Ciò che disegna le scene: la finestra nascosta di Electron o, nel browser, un iframe */
export interface RenderWindow {
  /** Disegna la scena e aspetta che immagini, font e adattamenti del testo siano finiti */
  show(scene: Scene, width: number, height: number): Promise<void>
  capture(width: number, height: number): Promise<CapturedImage>
  toWebp(png: Buffer, quality: number): Promise<Buffer>
  toSvg(background: string | null): Promise<Buffer>
  /** PDF delle pagine; null se le pagine sono andate alla stampa del browser e non c'è un file */
  printToPdf(): Promise<Buffer | null>
  close(): void
}

export interface RunEnv {
  openWindow(context: ExportContext): Promise<RenderWindow>
  /** Conversione del PDF in CMYK; null se non riesce, assente dove non si può fare */
  toCmyk?(pdf: Buffer): Promise<Buffer | null>
  /**
   * Versione web: il percorso vero di un file sul computer (il browser ne conosce uno virtuale),
   * per gli indirizzi delle immagini di Tabletop Simulator, e il sistema a cui appartiene
   */
  realPath?(file: string): { path: string; platform: string }
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
  win: RenderWindow
  result: ExportResult
  progress: ExportProgress
}

export async function runExport(job: ExportJob, env: RunEnv): Promise<ExportResult> {
  const result: ExportResult = { files: 0, folders: [], warnings: [], cancelled: false }
  const sets = job.sets.filter((s) => s.cards.length)
  if (!sets.length) return result
  const win = await env.openWindow(env.context)
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
): Promise<CapturedImage> {
  const page = cardPage(t, side, opts.bleed, opts.mode)
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
  const ext = imageExtension(o)
  const files = planImages(o, sets)
  ctx.progress.total = files.length
  const scale = o.dpi / 25.4
  const transparent = o.transparent && o.format !== 'jpg'
  for (const f of files) {
    if (f.names.length && ext === 'svg') {
      const page = cardPage(f.card.template, f.side, o.bleed, 'trim')
      await ctx.win.show(
        {
          pages: [page],
          scale,
          background: null,
          lineColor: '#000',
          lineWidth: 0,
          linesOver: false
        },
        page.width * scale,
        page.height * scale
      )
      const data = await ctx.win.toSvg(o.transparent ? null : '#FFFFFF')
      for (const name of f.names) await write(ctx, join(folder, `${name}.svg`), data)
    } else if (f.names.length) {
      const img = await renderCard(ctx, f.card.template, f.side, scale, {
        bleed: o.bleed,
        mode: 'trim',
        background: transparent ? null : '#FFFFFF'
      })
      const data =
        ext === 'jpg'
          ? img.toJPEG(clampQuality(o.quality))
          : ext === 'webp'
            ? await ctx.win.toWebp(img.toPNG(), clampQuality(o.quality))
            : img.toPNG()
      // le copie sono la stessa immagine: si disegna una volta sola
      for (const name of f.names) await write(ctx, join(folder, `${name}.${ext}`), data)
    }
    step(ctx)
  }
}

function clampQuality(q: number): number {
  return Math.max(1, Math.min(100, Math.round(q) || 92))
}

// ——— PDF ———

async function exportPdf(
  ctx: Ctx,
  o: PdfOptions,
  sets: ExportSet[],
  project: string
): Promise<void> {
  const folder = outputFolder(ctx, o.folder)
  const page = pageSize(o)
  const { docs, overflow } = planPdf(o, sets, project)
  let cmykWarned = false
  let printed = false
  for (const set of overflow) ctx.result.warnings.push(msg('export.gridOverflow', { set }))
  ctx.progress.total = docs.length
  for (const doc of docs) {
    const scene: Scene = {
      pages: doc.pages,
      scale: PDF_SCALE,
      background: '#FFFFFF',
      lineColor: o.markColor,
      lineWidth: o.markWidth,
      linesOver: o.marksOver
    }
    await ctx.win.show(scene, page.width * PDF_SCALE, page.height * PDF_SCALE)
    let pdf = await ctx.win.printToPdf()
    if (!pdf) {
      printed = true
      step(ctx)
      continue
    }
    if (o.cmyk) {
      const converted = ctx.env.toCmyk ? await ctx.env.toCmyk(pdf) : null
      if (converted) pdf = converted
      else if (!cmykWarned) {
        ctx.result.warnings.push(msg('export.cmykUnavailable'))
        cmykWarned = true
      }
    }
    await write(ctx, join(folder, `${doc.name}.pdf`), pdf)
    step(ctx)
  }
  if (printed) ctx.result.warnings.push(msg('export.printed'))
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
    targets.push(join(root, safeName(project || 'Naibi')))
  }
  for (const t of targets) if (!ctx.result.folders.includes(t)) ctx.result.folders.push(t)

  const plans = planTts(o, sets)
  ctx.progress.total = plans.reduce((n, p) => n + p.chunks.length * 2 + 1, 0)

  // set con nomi che differiscono solo per caratteri non ammessi (a/b e a_b) non si sovrascrivono
  const stems = uniqueNames(plans.map((p) => safeName(p.set.name)))
  for (const [index, { set, chunks, uniqueBack: unique }] of plans.entries()) {
    if (!chunks.length) continue
    const t0 = chunks[0].cards[0].template

    const sheets: RenderedSheet[] = []
    let singleBack: Buffer | null = null
    for (const chunk of chunks) {
      const face = await renderSheet(ctx, chunk, 'front')
      step(ctx)
      let back: Buffer
      if (unique) back = await renderSheet(ctx, chunk, 'back')
      else {
        singleBack ??= (
          await renderCard(ctx, t0, 'back', chunk.scale, {
            bleed: false,
            mode: 'cut',
            background: '#FFFFFF'
          })
        ).toPNG()
        back = singleBack
      }
      step(ctx)
      sheets.push({ face, back, cols: chunk.cols, rows: chunk.rows, uniqueBack: unique })
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
      chunk.cards.forEach((card, slot) => {
        for (let i = 0; i < chunk.counts[slot]; i++)
          deck.push({
            sheet,
            slot,
            nickname: fieldText(card, o.nickname),
            description: fieldText(card, o.description)
          })
      })
    )

    const stem = stems[index]
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
          faceUrl: imageUrl(env, faceFile),
          backUrl: imageUrl(env, backFile),
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

/** Indirizzo di un'immagine scritta per Tabletop Simulator, come lo legge TTS */
function imageUrl(env: RunEnv, file: string): string {
  const real = env.realPath?.(file) ?? { path: file, platform: env.platform }
  // un percorso di Windows scritto a mano nel web non diventa un URL standard: non serve
  const standard = real.platform === 'win32' ? '' : pathToFileURL(real.path).href
  return ttsImageUrl(real.path, real.platform, standard)
}

function fieldText(card: ExportCard, field: string): string {
  if (!field) return ''
  return plainText(card.fields[field] ?? '').trim()
}

/** Foglio di carte a griglia, in pixel interi */
async function renderSheet(ctx: Ctx, chunk: TtsChunk, side: Side): Promise<Buffer> {
  const page = sheetPage(chunk, side)
  const scene: Scene = {
    pages: [page],
    scale: chunk.scale,
    background: '#FFFFFF',
    lineColor: '#000',
    lineWidth: 0,
    linesOver: false
  }
  const w = Math.round(page.width * chunk.scale)
  const h = Math.round(page.height * chunk.scale)
  await ctx.win.show(scene, w, h)
  return (await ctx.win.capture(w, h)).toPNG()
}
