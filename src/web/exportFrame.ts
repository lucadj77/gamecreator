import { Buffer } from 'buffer'
import type { CapturedImage, RenderWindow } from '../main/export/run'
import type { ExportContext, Scene } from '../shared/export'
import type { ExportPageApi } from '../shared/api'
import { Watchdog } from '../shared/exportWait'
import type { PageCard } from '../renderer/src/export/ExportPage'

// La finestra nascosta delle esportazioni nella versione web: un iframe invisibile con la stessa
// pagina (#export) dell'app desktop. Il browser non cattura i pixel di una pagina: l'immagine si
// ottiene dall'SVG della carta (export/toSvg.ts, lo stesso dell'esportazione in SVG) disegnato su
// un canvas. Il PDF passa dalla finestra di stampa del browser.

const SILENCE_TIMEOUT = 60 * 1000

/** Il collegamento tra questa pagina e quella dell'iframe, trovato da lì con window.name */
interface Channel {
  page: ExportPageApi
  onReady(): void
  onShown(id: number, error?: string): void
  onAlive(id: number): void
  context?(c: ExportContext): void
  scene?(id: number, scene: Scene): void
}

type Host = Window & { stellaExportChannels?: Record<string, Channel> }

/** Per la pagina dell'iframe: la sua window.api.exportPage */
export function exportPageApi(): ExportPageApi | null {
  try {
    const host = window.parent as Host
    return host !== (window as Window)
      ? (host.stellaExportChannels?.[window.name]?.page ?? null)
      : null
  } catch {
    return null
  }
}

let nextFrame = 1
let nextId = 1

export class FrameWindow implements RenderWindow {
  private waiting = new Map<number, { resolve(): void; reject(e: Error): void; dog: Watchdog }>()
  private background: string | null = null

  private constructor(
    private frame: HTMLIFrameElement,
    private name: string
  ) {}

  static async open(context: ExportContext): Promise<FrameWindow> {
    const name = `stella-export-${nextFrame++}`
    const frame = document.createElement('iframe')
    frame.name = name
    frame.setAttribute('aria-hidden', 'true')
    frame.tabIndex = -1
    // invisibile ma disegnata: con display:none o fuori dallo schermo il browser non la disegna
    Object.assign(frame.style, {
      position: 'fixed',
      left: '0',
      top: '0',
      width: '800px',
      height: '600px',
      border: '0',
      opacity: '0',
      pointerEvents: 'none',
      zIndex: '-1'
    })
    const w = new FrameWindow(frame, name)
    const host = window as Host
    const ready = new Promise<void>((resolve) => {
      const channel: Channel = {
        onReady: resolve,
        onShown: (id, error) => w.settle(id, error ? new Error(error) : undefined),
        onAlive: (id) => w.waiting.get(id)?.dog.alive(),
        page: {
          onContext: (cb) => (channel.context = cb),
          onScene: (cb) => (channel.scene = cb),
          ready: () => channel.onReady(),
          shown: (id, error) => channel.onShown(id, error),
          alive: (id) => channel.onAlive(id)
        }
      }
      host.stellaExportChannels = { ...host.stellaExportChannels, [name]: channel }
    })
    frame.src = location.pathname + location.search + '#export'
    document.body.appendChild(frame)
    await ready
    w.channel().context?.(context)
    return w
  }

  private channel(): Channel {
    return (window as Host).stellaExportChannels![this.name]
  }

  private settle(id: number, error?: Error): void {
    const w = this.waiting.get(id)
    if (!w) return
    this.waiting.delete(id)
    w.dog.stop()
    if (error) w.reject(error)
    else w.resolve()
  }

  async show(scene: Scene, width: number, height: number): Promise<void> {
    this.background = scene.background
    this.frame.style.width = `${Math.max(1, Math.ceil(width))}px`
    this.frame.style.height = `${Math.max(1, Math.ceil(height))}px`
    const id = nextId++
    const done = new Promise<void>((resolve, reject) => {
      const dog = new Watchdog(SILENCE_TIMEOUT, () =>
        this.settle(id, new Error('the export page stopped responding for 60 s'))
      )
      this.waiting.set(id, { resolve, reject, dog })
    })
    this.channel().scene?.(id, scene)
    await done
  }

  private async svg(background: string | null): Promise<string> {
    const page = this.frame.contentWindow as
      (Window & { stellaCardSvg?: (bg: string | null) => Promise<string> }) | null
    if (!page?.stellaCardSvg) throw new Error('the export page is not ready')
    return page.stellaCardSvg(background)
  }

  /**
   * Immagine della pagina: ogni carta come SVG (lo stesso dell'esportazione in SVG) disegnata al
   * suo posto su un canvas delle dimensioni chieste. Vale per una carta sola e per i fogli di
   * Tabletop Simulator; i segni di taglio non ci sono, e qui non servono.
   */
  async capture(width: number, height: number): Promise<CapturedImage> {
    const w = Math.max(1, Math.round(width))
    const h = Math.max(1, Math.round(height))
    const page = this.frame.contentWindow as
      (Window & { stellaPageCards?: () => Promise<PageCard[]> }) | null
    if (!page?.stellaPageCards) throw new Error('the export page is not ready')
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')!
    if (this.background) {
      ctx.fillStyle = this.background
      ctx.fillRect(0, 0, w, h)
    }
    for (const card of await page.stellaPageCards()) {
      // l'SVG è in mm: si disegna alle dimensioni che la carta ha nella pagina
      const doc = new DOMParser().parseFromString(card.svg, 'image/svg+xml')
      doc.documentElement.setAttribute('width', String(card.width))
      doc.documentElement.setAttribute('height', String(card.height))
      const img = new Image()
      const url = URL.createObjectURL(
        new Blob([new XMLSerializer().serializeToString(doc)], { type: 'image/svg+xml' })
      )
      try {
        img.src = url
        await img.decode()
      } finally {
        URL.revokeObjectURL(url)
      }
      ctx.drawImage(img, card.x, card.y, card.width, card.height)
    }
    const encode = (type: string, quality?: number): Buffer =>
      Buffer.from(canvas.toDataURL(type, quality).split(',')[1], 'base64')
    return {
      toPNG: () => encode('image/png'),
      toJPEG: (quality) => encode('image/jpeg', quality / 100)
    }
  }

  async toWebp(png: Buffer, quality: number): Promise<Buffer> {
    const bmp = await createImageBitmap(new Blob([png as BlobPart], { type: 'image/png' }))
    const canvas = new OffscreenCanvas(bmp.width, bmp.height)
    canvas.getContext('2d')!.drawImage(bmp, 0, 0)
    const blob = await canvas.convertToBlob({ type: 'image/webp', quality: quality / 100 })
    if (blob.type !== 'image/webp') throw new Error('WebP encoding not available')
    return Buffer.from(await blob.arrayBuffer())
  }

  async toSvg(background: string | null): Promise<Buffer> {
    return Buffer.from(await this.svg(background), 'utf8')
  }

  /** Le pagine vanno alla finestra di stampa, da cui si sceglie "Salva come PDF" */
  async printToPdf(): Promise<null> {
    this.frame.contentWindow?.focus()
    this.frame.contentWindow?.print()
    return null
  }

  close(): void {
    for (const id of [...this.waiting.keys()]) this.settle(id, new Error('export closed'))
    this.frame.remove()
    const host = window as Host
    if (host.stellaExportChannels) delete host.stellaExportChannels[this.name]
  }
}
