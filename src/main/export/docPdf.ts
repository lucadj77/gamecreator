import { BrowserWindow } from 'electron'
import { mkdtemp, rm, writeFile } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'

// PDF di un documento: la pagina HTML autonoma dell'esportazione (con @page per formato e
// margini) stampata da Chromium in una finestra nascosta.

export async function htmlToPdf(html: string): Promise<Uint8Array> {
  // un file e non un data: URL, che con molte immagini supererebbe i limiti di lunghezza
  const dir = await mkdtemp(join(tmpdir(), 'stella-doc-'))
  const file = join(dir, 'document.html')
  await writeFile(file, html)
  const win = new BrowserWindow({
    show: false,
    webPreferences: { offscreen: true, backgroundThrottling: false }
  })
  try {
    await win.loadFile(file)
    await win.webContents.executeJavaScript('document.fonts.ready.then(() => true)')
    return await win.webContents.printToPDF({ printBackground: true, preferCSSPageSize: true })
  } finally {
    win.destroy()
    await rm(dir, { recursive: true, force: true }).catch(() => undefined)
  }
}
