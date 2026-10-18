import { BrowserWindow, ipcMain, type NativeImage } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'
import type { ExportContext, Scene } from '../../shared/export'

// Finestra nascosta che disegna le carte con lo stesso codice dell'anteprima: da qui si
// catturano le immagini e si stampa il PDF.

let nextId = 1
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
    const ready = new Promise<void>((resolve) => ipcMain.once('export:page-ready', () => resolve()))
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
    this.win.webContents.send('export:scene', id, scene)
    await done
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
