import { useEffect, useRef, useState } from 'react'
import type { ExportContext, Scene } from '../../../shared/export'
import type { ProjectFont } from '../../../shared/project'
import ScenePageView from '../render/SceneView'
import { AssetsContext, StylesContext, VariablesContext } from '../render/assets'
import { useRegisterFonts } from '../render/fonts'
import { cardToSvg, svgOfCard } from './toSvg'
import { settle } from './settle'

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
    const w = window as unknown as {
      stellaCardSvg?: (bg: string | null) => Promise<string>
      stellaPageCards?: () => Promise<PageCard[]>
    }
    w.stellaCardSvg = (bg) => cardToSvg(rootRef.current!, context.fonts, bg)
    // versione web: ogni carta della pagina con la sua posizione, per disegnarle su un canvas
    w.stellaPageCards = () => pageCards(rootRef.current!, context.fonts)
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
          * { print-color-adjust: exact; -webkit-print-color-adjust: exact }
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

/** Una carta della pagina come SVG autonomo, con posizione e dimensioni in pixel */
export interface PageCard {
  svg: string
  x: number
  y: number
  width: number
  height: number
}

async function pageCards(root: HTMLElement, fonts: ProjectFont[]): Promise<PageCard[]> {
  const origin = root.getBoundingClientRect()
  const cards = [...root.querySelectorAll<SVGSVGElement>('svg[xmlns]')].filter(
    // le carte, non i disegni che contengono
    (el) => !el.parentElement?.closest('svg[xmlns]')
  )
  const out: PageCard[] = []
  for (const el of cards) {
    const r = el.getBoundingClientRect()
    out.push({
      svg: await svgOfCard(el, fonts, null),
      x: r.left - origin.left,
      y: r.top - origin.top,
      width: r.width,
      height: r.height
    })
  }
  return out
}

const HEARTBEAT = 5000
