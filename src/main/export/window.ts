import { BrowserWindow, ipcMain, type NativeImage } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'
import type { ExportContext, Scene } from '../../shared/export'

// Finestra nascosta che disegna le carte con lo stesso codice dell'anteprima: da qui si
// catturano le immagini e si stampa il PDF.

let nextId = 1
/** Oltre questo tempo la pagina non risponderà più: è andata in errore */
const SHOW_TIMEOUT = 60 * 1000
const waiting = new Map<number, { resolve(): void; reject(e: Error): void }>()

ipcMain.on('export:shown', (_, id: number, error?: string) => {
  const w = waiting.get(id)
  if (!w) return
  waiting.delete(id)
  if (error) w.reject(new Error(error))
  else w.resolve()
})

export class ExportWindow {
  private constructor(private win: BrowserWindow) {}

  static async open(context: ExportContext): Promise<ExportWindow> {
    const win = new BrowserWindow({
      show: false,
      width: 800,
      height: 600,
      useContentSize: true,
      transparent: true,
      frame: false,
      backgroundColor: '#00000000',
      // macOS limita la finestra allo schermo: i fogli di Tabletop Simulator sono più grandi
      enableLargerThanScreen: true,
      webPreferences: {
        preload: join(__dirname, '../preload/index.js'),
        sandbox: false,
        offscreen: true,
        backgroundThrottling: false
      }
    })
    win.webContents.setFrameRate(60)
    // solo la pagina di questa finestra: una miniatura e un'esportazione possono aprirne due insieme
    const ready = new Promise<void>((resolve) => {
      const onReady = (event: Electron.IpcMainEvent): void => {
        if (event.sender.id !== win.webContents.id) return
        ipcMain.removeListener('export:page-ready', onReady)
        resolve()
      }
      ipcMain.on('export:page-ready', onReady)
    })
    if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
      await win.loadURL(process.env['ELECTRON_RENDERER_URL'] + '#export')
    } else {
      await win.loadFile(join(__dirname, '../renderer/index.html'), { hash: 'export' })
    }
    await ready
    const w = new ExportWindow(win)
    w.win.webContents.send('export:context', context)
    return w
  }

  /** Disegna la scena e aspetta che immagini, font e adattamenti del testo siano finiti */
  async show(scene: Scene, width: number, height: number): Promise<void> {
    this.win.setContentSize(Math.max(1, Math.ceil(width)), Math.max(1, Math.ceil(height)))
    const id = nextId++
    const done = new Promise<void>((resolve, reject) => waiting.set(id, { resolve, reject }))
    // se la pagina va in errore prima di rispondere, l'esportazione non resta appesa
    const timer = setTimeout(() => {
      const w = waiting.get(id)
      if (!w) return
      waiting.delete(id)
      w.reject(new Error('the export page did not answer within 60 s'))
    }, SHOW_TIMEOUT)
    this.win.webContents.send('export:scene', id, scene)
    try {
      await done
    } finally {
      clearTimeout(timer)
    }
  }

  /** Immagine dell'angolo in alto a sinistra, nelle dimensioni chieste in pixel */
  async capture(width: number, height: number): Promise<NativeImage> {
    const w = Math.round(width)
    const h = Math.round(height)
    let img = await this.win.webContents.capturePage({ x: 0, y: 0, width: w, height: h })
    const size = img.getSize()
    // con uno schermo ad alta densità la cattura può avere più pixel di quelli chiesti
    if (size.width !== w || size.height !== h)
      img = img.resize({ width: w, height: h, quality: 'best' })
    return img
  }

  /**
   * WebP da un PNG: Electron non lo scrive da sé, lo codifica Chromium nella finestra nascosta.
   * La qualità va da 1 a 100.
   */
  async toWebp(png: Buffer, quality: number): Promise<Buffer> {
    const b64: string = await this.win.webContents.executeJavaScript(`(async () => {
      const bin = atob(${JSON.stringify(png.toString('base64'))})
      const bytes = new Uint8Array(bin.length)
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
      const bmp = await createImageBitmap(new Blob([bytes], { type: 'image/png' }))
      const canvas = new OffscreenCanvas(bmp.width, bmp.height)
      canvas.getContext('2d').drawImage(bmp, 0, 0)
      const blob = await canvas.convertToBlob({ type: 'image/webp', quality: ${quality / 100} })
      if (blob.type !== 'image/webp') throw new Error('WebP encoding not available')
      const out = new Uint8Array(await blob.arrayBuffer())
      let s = ''
      for (let i = 0; i < out.length; i += 0x8000) s += String.fromCharCode(...out.subarray(i, i + 0x8000))
      return btoa(s)
    })()`)
    return Buffer.from(b64, 'base64')
  }

  /** SVG autonomo della carta mostrata, con immagini e font del progetto dentro il file */
  async toSvg(background: string | null): Promise<Buffer> {
    const svg: string = await this.win.webContents.executeJavaScript(
      `window.naibiCardSvg(${JSON.stringify(background)})`
    )
    return Buffer.from(svg, 'utf8')
  }

  /** PDF delle pagine della scena, con il formato dato da @page */
  printToPdf(): Promise<Buffer> {
    return this.win.webContents.printToPDF({
      printBackground: true,
      preferCSSPageSize: true,
      margins: { top: 0, bottom: 0, left: 0, right: 0 }
    })
  }

  close(): void {
    if (!this.win.isDestroyed()) this.win.destroy()
  }
}
