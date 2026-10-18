import { useEffect, useRef, useState } from 'react'
import type { ExportContext, Scene, ScenePage } from '../../../shared/export'
import CardSvg from '../render/CardSvg'
import { AssetsContext, StylesContext, VariablesContext } from '../render/assets'

// Pagina della finestra nascosta di esportazione: disegna le scene che arrivano dal processo
// principale e avvisa quando sono complete, così si possono catturare o stampare.

const EMPTY: ExportContext = { assets: [], styles: {} }
const NO_VARIABLES = {}

export default function ExportPage(): React.JSX.Element {
  const [context, setContext] = useState<ExportContext>(EMPTY)
  const [job, setJob] = useState<{ id: number; scene: Scene } | null>(null)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const api = window.api.exportPage
    api.onContext(setContext)
    api.onScene((id, scene) => setJob({ id, scene }))
    api.ready()
  }, [])

  useEffect(() => {
    if (!job || !rootRef.current) return
    let stale = false
    settle(rootRef.current)
      .then(() => !stale && window.api.exportPage.shown(job.id))
      .catch((e) => !stale && window.api.exportPage.shown(job.id, String(e)))
    return () => {
      stale = true
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
              <Page key={i} page={p} scene={scene} />
            ))}
          </div>
        </VariablesContext.Provider>
      </StylesContext.Provider>
    </AssetsContext.Provider>
  )
}

function Page({ page: p, scene: s }: { page: ScenePage; scene: Scene }): React.JSX.Element {
  const lines = p.lines.length > 0 && (
    <svg
      width={p.width * s.scale}
      height={p.height * s.scale}
      viewBox={`0 0 ${p.width} ${p.height}`}
      style={{ position: 'absolute', left: 0, top: 0 }}
    >
      {p.lines.map((l, i) => (
        <line key={i} {...l} stroke={s.lineColor} strokeWidth={s.lineWidth} strokeLinecap="butt" />
      ))}
    </svg>
  )
  return (
    <div
      className="export-page"
      style={{
        width: p.width * s.scale,
        height: p.height * s.scale,
        background: s.background ?? undefined
      }}
    >
      {!s.linesOver && lines}
      {p.items.map((it, i) => (
        <div key={i} style={{ position: 'absolute', left: it.x * s.scale, top: it.y * s.scale }}>
          <CardSvg
            template={it.template}
            side={it.side}
            scale={s.scale}
            mode={it.mode}
            guides={false}
          />
        </div>
      ))}
      {s.linesOver && lines}
    </div>
  )
}

const decoded = new Map<string, Promise<void>>()

function decode(src: string): Promise<void> {
  let p = decoded.get(src)
  if (!p) {
    const img = new Image()
    img.src = src
    p = img.decode().catch(() => undefined)
    decoded.set(src, p)
  }
  return p
}

const frame = (): Promise<void> => new Promise((r) => requestAnimationFrame(() => r()))
const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms))

/**
 * Aspetta che la scena smetta di cambiare: font caricati, immagini decodificate, dimensioni
 * delle immagini lette e testi ridotti per stare nel riquadro.
 */
async function settle(root: HTMLElement): Promise<void> {
  const deadline = Date.now() + 20000
  let last = Date.now()
  const observer = new MutationObserver(() => (last = Date.now()))
  observer.observe(root, { subtree: true, childList: true, attributes: true, characterData: true })
  try {
    while (Date.now() < deadline) {
      await document.fonts.ready
      const srcs = new Set<string>()
      root.querySelectorAll('image').forEach((el) => {
        const href = el.getAttribute('href')
        if (href) srcs.add(href)
      })
      root.querySelectorAll('img').forEach((el) => el.src && srcs.add(el.src))
      await Promise.all([...srcs].map(decode))
      await frame()
      await frame()
      if (Date.now() - last > 150) break
      await sleep(50)
    }
  } finally {
    observer.disconnect()
  }
  await frame()
  await frame()
}
