import { useEffect, useRef, useState } from 'react'
import type { ExportContext, Scene } from '../../../shared/export'
import ScenePageView from '../render/SceneView'
import { AssetsContext, StylesContext, VariablesContext } from '../render/assets'
import { useRegisterFonts } from '../render/fonts'
import { cardToSvg } from './toSvg'
import { waitForAll, within, type Pending } from '../../../shared/exportWait'

// Pagina della finestra nascosta di esportazione: disegna le scene che arrivano dal processo
// principale e avvisa quando sono complete, così si possono catturare o stampare.

const EMPTY: ExportContext = { assets: [], fonts: [], styles: {} }
const NO_VARIABLES = {}

export default function ExportPage(): React.JSX.Element {
  const [context, setContext] = useState<ExportContext>(EMPTY)
  const [job, setJob] = useState<{ id: number; scene: Scene } | null>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  useRegisterFonts(context.fonts)

  // il processo principale chiede l'SVG della carta disegnata (esportazione in SVG)
  useEffect(() => {
    const w = window as unknown as { naibiCardSvg?: (bg: string | null) => Promise<string> }
    w.naibiCardSvg = (bg) => cardToSvg(rootRef.current!, context.fonts, bg)
  }, [context.fonts])

  useEffect(() => {
    const api = window.api.exportPage
    api.onContext(setContext)
    api.onScene((id, scene) => setJob({ id, scene }))
    api.ready()
  }, [])

  useEffect(() => {
    if (!job || !rootRef.current) return
    let stale = false
    const api = window.api.exportPage
    // segni di vita per il processo principale: un foglio grande può impiegare minuti
    const beat = setInterval(() => !stale && api.alive(job.id), HEARTBEAT)
    settle(rootRef.current)
      .then(() => !stale && api.shown(job.id))
      .catch((e) => !stale && api.shown(job.id, e instanceof Error ? e.message : String(e)))
      .finally(() => clearInterval(beat))
    return () => {
      stale = true
      clearInterval(beat)
    }
  }, [job])

  const scene = job?.scene
  const first = scene?.pages[0]
  const bg = scene?.background ?? 'transparent'
  return (
    <AssetsContext.Provider value={context.assets}>
      <StylesContext.Provider value={context.styles}>
        <VariablesContext.Provider value={context.variables ?? NO_VARIABLES}>
          <style>{`
          @page { size: ${first?.width ?? 210}mm ${first?.height ?? 297}mm; margin: 0 }
          html, body, #root { background: ${bg}; margin: 0; height: auto; overflow: hidden }
          .export-page { position: relative; overflow: hidden; break-after: page }
          .export-page:last-child { break-after: auto }
        `}</style>
          <div ref={rootRef} key={job?.id}>
            {scene?.pages.map((p, i) => (
              <ScenePageView key={i} className="export-page" page={p} scene={scene} />
            ))}
          </div>
        </VariablesContext.Provider>
      </StylesContext.Provider>
    </AssetsContext.Provider>
  )
}

const HEARTBEAT = 5000
/** Senza che finisca di caricarsi nessuna immagine o font per così tanto, qualcosa è bloccato */
const LOAD_IDLE = 60000
/** Dopo l'ultimo caricamento, la scena deve smettere di cambiare entro questo tempo */
const STABLE = 20000
/** Una pagina che non disegna fotogrammi per così tanto non verrà catturata */
const FRAME_TIMEOUT = 10000

/**
 * Oltre questo tempo non si aspetta più la decodifica di un'immagine già caricata: su Windows,
 * nella finestra nascosta, decode() di immagini grandi può non rispondere mai. La carta si
 * disegna lo stesso, decodificando l'immagine quando serve.
 */
const DECODE_WAIT = 2000

const loaded = new Map<string, Promise<void>>()
const ready = new Set<string>()

/** Carica l'immagine (e prova a decodificarla) prima della cattura */
function load(src: string): Promise<void> {
  let p = loaded.get(src)
  if (!p) {
    p = new Promise<void>((resolve) => {
      const img = new Image()
      img.onload = () => {
        within(img.decode(), DECODE_WAIT, 'decode')
          .catch(() => undefined)
          .then(() => resolve())
      }
      img.onerror = () => resolve()
      img.src = src
    }).then(() => void ready.add(src))
    loaded.set(src, p)
  }
  return p
}

/** Nome leggibile di un'immagine per i messaggi d'errore */
function imageName(src: string): string {
  if (src.startsWith('data:')) return 'embedded image'
  try {
    const parts = decodeURIComponent(new URL(src).pathname).split('/').filter(Boolean)
    return parts.slice(-2).join('/') || src
  } catch {
    return src
  }
}

/** Immagini e font della scena non ancora pronti */
function loading(root: HTMLElement): Pending[] {
  const srcs = new Set<string>()
  root.querySelectorAll('image').forEach((el) => {
    const href = el.getAttribute('href')
    if (href) srcs.add(href)
  })
  root.querySelectorAll('img').forEach((el) => el.src && srcs.add(el.src))
  const items: Pending[] = [...srcs]
    .filter((src) => !ready.has(src))
    .map((src) => ({ label: imageName(src), promise: load(src) }))
  document.fonts.forEach((f) => {
    if (f.status === 'loading') items.push({ label: `font ${f.family}`, promise: f.loaded })
  })
  return items
}

const frame = (): Promise<void> =>
  within(
    new Promise((r) => requestAnimationFrame(() => r())),
    FRAME_TIMEOUT,
    `the export page drew no frame for ${FRAME_TIMEOUT / 1000} s`
  )
const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms))

/**
 * Aspetta che la scena smetta di cambiare: font caricati, immagini decodificate, dimensioni
 * delle immagini lette e testi ridotti per stare nel riquadro. Non c'è un limite al tempo
 * totale, che cresce con le carte del foglio: ci si ferma solo quando niente procede più.
 */
async function settle(root: HTMLElement): Promise<void> {
  let deadline = Date.now() + STABLE
  let last = Date.now()
  const observer = new MutationObserver(() => (last = Date.now()))
  observer.observe(root, { subtree: true, childList: true, attributes: true, characterData: true })
  try {
    while (Date.now() < deadline) {
      try {
        // ogni immagine o font che arriva dà altro tempo alla scena per sistemarsi
        await waitForAll(loading(root), LOAD_IDLE, () => (deadline = Date.now() + STABLE))
      } catch (e) {
        throw new Error(`images or fonts did not load: ${(e as Error).message}`, { cause: e })
      }
      await frame()
      await frame()
      if (Date.now() - last > 150) break
      await sleep(50)
    }
    // la pagina non si ferma: meglio un errore che un'immagine a cui manca qualcosa
    if (Date.now() >= deadline)
      throw new Error(`the page kept changing for ${STABLE / 1000} s after loading`)
  } finally {
    observer.disconnect()
  }
  await frame()
  await frame()
}
