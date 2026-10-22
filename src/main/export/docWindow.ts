import { BrowserWindow } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'
import type { DocExportFile, DocRenderFile, DocRenderInput } from '../../shared/api'
import { htmlToPdf } from './docPdf'

// Esportazione di un documento senza l'app (naibi export-doc): una finestra nascosta apre la
// pagina #document del renderer, che lo disegna come l'anteprima e restituisce i file.

/** Al massimo tanto per un documento: carte e immagini sono già nel progetto */
const TIMEOUT = 5 * 60 * 1000

export async function renderDocument(input: DocRenderInput): Promise<DocExportFile[]> {
  const win = new BrowserWindow({
    show: false,
    width: 1200,
    height: 900,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      offscreen: true,
      backgroundThrottling: false
    }
  })
  try {
    if (is.dev && process.env['ELECTRON_RENDERER_URL'])
      await win.loadURL(process.env['ELECTRON_RENDERER_URL'] + '#document')
    else await win.loadFile(join(__dirname, '../renderer/index.html'), { hash: 'document' })
    // la pagina è pronta quando ha registrato la funzione
    await win.webContents.executeJavaScript(
      `new Promise((r) => { const t = () => (window.naibiDocument ? r(true) : setTimeout(t, 50)); t() })`
    )
    let timer: NodeJS.Timeout | undefined
    const files = (await Promise.race([
      win.webContents
        .executeJavaScript(`window.naibiDocument(${JSON.stringify(input)})`)
        .catch((e: unknown) => {
          // l'errore della pagina arriva come oggetto semplice
          const m = e && typeof e === 'object' && 'message' in e ? String(e.message) : String(e)
          throw new Error(`${input.name}: ${m}`)
        }),
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error('the document took too long to draw')), TIMEOUT)
      })
    ]).finally(() => clearTimeout(timer))) as DocRenderFile[]
    const out: DocExportFile[] = files.map((f) => ({
      path: f.path,
      data:
        f.base64 !== undefined ? new Uint8Array(Buffer.from(f.base64, 'base64')) : (f.text ?? '')
    }))
    if (input.kind !== 'pdf') return out
    return [{ path: `${input.name}.pdf`, data: await htmlToPdf(String(out[0].data)) }]
  } finally {
    win.destroy()
  }
}
