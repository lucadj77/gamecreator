import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import {
  findLayer,
  transformInto,
  translateLayer,
  updateLayers,
  type Bounds
} from '../../../shared/model/edit'
import {
  HANDLES,
  ancestorsOf,
  anchorPoint,
  angleFrom,
  handlePosition,
  hitTest,
  normalizeAngle,
  resizeWithHandle,
  rotateAround,
  snap,
  toFrame,
  toLocal,
  type Handle,
  type Point
} from '../../../shared/model/geometry'
import type { GroupLayer, Layer, Template } from '../../../shared/model/template'
import CardSvg from '../render/CardSvg'
import { ShowEmptyContext } from '../render/assets'
import { useI18n } from '../i18n/context'
import type { EditorAction, EditorState } from './useEditor'

/** Passo della griglia magnetica in mm; Alt la disattiva */
const SNAP = 0.5
const HANDLE_PX = 8
const ROTATE_PX = 22
const ZOOMS = [2, 3, 4, 6, 8, 12, 16]
const MIN_SCALE = 1
const MAX_SCALE = 60

type Gesture =
  | { kind: 'move'; start: Template; ids: string[]; frame: GroupLayer[]; p0: Point; ref: Layer }
  | { kind: 'resize'; start: Template; layer: Layer; frame: GroupLayer[]; handle: Handle }
  | { kind: 'rotate'; start: Template; layer: Layer; frame: GroupLayer[]; a0: number }

interface Props {
  state: EditorState
  /** Template da disegnare: quello in modifica, o con i dati di una riga applicati */
  display: Template
  dispatch: React.Dispatch<EditorAction>
}

export default function Canvas({ state, display, dispatch }: Props): React.JSX.Element {
  const { t } = useI18n()
  const { template: tpl, side, selection, scope } = state
  const viewportRef = useRef<HTMLDivElement>(null)
  const overlayRef = useRef<SVGSVGElement>(null)
  const gesture = useRef<Gesture | null>(null)
  const marqueeStart = useRef<{ p0: Point; base: string[] } | null>(null)
  const [marquee, setMarquee] = useState<Bounds | null>(null)
  const [fitScale, setFitScale] = useState(4)
  const [zoom, setZoom] = useState<number | null>(null)
  const [guides, setGuides] = useState(loadGuides)
  const toggleGuide = (key: keyof Guides): void => {
    const next = { ...guides, [key]: !guides[key] }
    setGuides(next)
    try {
      localStorage.setItem(GUIDES_KEY, JSON.stringify(next))
    } catch {
      // preferenza non essenziale
    }
  }

  // senza abbondanza la tela mostra la carta rifilata, con gli angoli arrotondati
  const b = guides.bleed ? tpl.bleed : 0
  const vw = tpl.width + 2 * b
  const vh = tpl.height + 2 * b
  const scale = zoom ?? fitScale

  useLayoutEffect(() => {
    const el = viewportRef.current
    if (!el) return
    const update = (): void =>
      setFitScale(Math.max(1, Math.min((el.clientWidth - 64) / vw, (el.clientHeight - 64) / vh)))
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [vw, vh])

  // zoom con Cmd/Ctrl + rotella o con il pizzico sul trackpad, tenendo fermo il punto sotto il puntatore
  const scaleRef = useRef(scale)
  const anchor = useRef<{ mm: Point; cx: number; cy: number } | null>(null)
  useLayoutEffect(() => {
    scaleRef.current = scale
    const a = anchor.current
    const vp = viewportRef.current
    const ov = overlayRef.current
    if (!a || !vp || !ov) return
    anchor.current = null
    const r = ov.getBoundingClientRect()
    vp.scrollLeft += r.left + (a.mm.x + b) * scale - a.cx
    vp.scrollTop += r.top + (a.mm.y + b) * scale - a.cy
  }, [scale, b])
  useEffect(() => {
    const vp = viewportRef.current
    if (!vp) return
    const onWheel = (e: WheelEvent): void => {
      if (!e.ctrlKey && !e.metaKey) return
      e.preventDefault()
      const ov = overlayRef.current
      if (!ov) return
      const s = scaleRef.current
      const r = ov.getBoundingClientRect()
      anchor.current = {
        mm: { x: (e.clientX - r.left) / s - b, y: (e.clientY - r.top) / s - b },
        cx: e.clientX,
        cy: e.clientY
      }
      // uno scatto della rotella vale circa il 20%; i delta piccoli del trackpad danno uno zoom fluido
      const d = Math.sign(e.deltaY) * Math.min(Math.abs(e.deltaY), 50)
      setZoom(Math.min(MAX_SCALE, Math.max(MIN_SCALE, s * Math.exp(-d * 0.004))))
    }
    vp.addEventListener('wheel', onWheel, { passive: false })
    return () => vp.removeEventListener('wheel', onWheel)
  }, [b])

  const layers = tpl[side]

  /** Punto della carta in mm sotto il puntatore */
  const cardPoint = (e: React.PointerEvent | React.MouseEvent): Point => {
    const r = overlayRef.current!.getBoundingClientRect()
    return { x: (e.clientX - r.left) / scale - b, y: (e.clientY - r.top) / scale - b }
  }

  /** Livello colpito, prima nel gruppo in cui si è entrati e poi al primo livello */
  const pick = (p: Point): { hit: Layer | null; scope: string | null } => {
    const group = scope ? findLayer(layers, scope) : null
    if (group && group.type === 'group') {
      const q = toFrame(p, [...ancestorsOf(layers, group.id), group])
      const hit = group.children.find((l) => !l.locked && hitTest(l, q))
      if (hit) return { hit, scope }
    }
    return { hit: layers.find((l) => !l.locked && hitTest(l, p)) ?? null, scope: null }
  }

  const frameOf = (id: string): GroupLayer[] => ancestorsOf(layers, id)

  const begin = (e: React.PointerEvent, g: Gesture): void => {
    gesture.current = g
    overlayRef.current!.setPointerCapture(e.pointerId)
    dispatch({ type: 'gestureStart' })
  }

  const onPointerDown = (e: React.PointerEvent): void => {
    if (e.button !== 0) return
    const p = cardPoint(e)
    const { hit, scope: hitScope } = pick(p)
    if (!hit) {
      // sul vuoto si trascina un rettangolo di selezione
      if (!e.shiftKey) dispatch({ type: 'select', ids: [], scope })
      marqueeStart.current = { p0: p, base: e.shiftKey ? selection : [] }
      overlayRef.current!.setPointerCapture(e.pointerId)
      return
    }
    const sameContainer = hitScope === scope
    let ids: string[]
    if (e.shiftKey && sameContainer)
      ids = selection.includes(hit.id)
        ? selection.filter((id) => id !== hit.id)
        : [...selection, hit.id]
    else ids = selection.includes(hit.id) && sameContainer ? selection : [hit.id]
    dispatch({ type: 'select', ids, scope: hitScope })
    if (!ids.includes(hit.id)) return
    const movable = ids.filter((id) => !findLayer(layers, id)?.locked)
    const frame = frameOf(hit.id)
    begin(e, {
      kind: 'move',
      start: tpl,
      ids: movable,
      frame,
      p0: toFrame(p, frame),
      ref: hit
    })
  }

  const onHandleDown = (e: React.PointerEvent, layer: Layer, handle: Handle | 'rotate'): void => {
    if (e.button !== 0) return
    e.stopPropagation()
    const frame = frameOf(layer.id)
    if (handle === 'rotate') {
      const q = toFrame(cardPoint(e), frame)
      begin(e, { kind: 'rotate', start: tpl, layer, frame, a0: angleFrom(anchorPoint(layer), q) })
    } else begin(e, { kind: 'resize', start: tpl, layer, frame, handle })
  }

  const onPointerMove = (e: React.PointerEvent): void => {
    const m = marqueeStart.current
    if (m) {
      const p = cardPoint(e)
      const box = {
        x: Math.min(m.p0.x, p.x),
        y: Math.min(m.p0.y, p.y),
        w: Math.abs(p.x - m.p0.x),
        h: Math.abs(p.y - m.p0.y)
      }
      setMarquee(box)
      const group = scope ? findLayer(layers, scope) : null
      const list = group?.type === 'group' ? group.children : layers
      const chain = group?.type === 'group' ? [...frameOf(group.id), group] : []
      const inside = list
        .filter((l) => l.visible && !l.locked && intersects(worldBounds(l, chain), box))
        .map((l) => l.id)
      dispatch({ type: 'select', ids: [...new Set([...m.base, ...inside])] })
      return
    }
    const g = gesture.current
    if (!g) return
    const q = toFrame(cardPoint(e), g.frame)
    const step = e.altKey ? 0 : SNAP
    let next: Template
    if (g.kind === 'move') {
      // si aggancia alla griglia l'angolo del livello preso, gli altri lo seguono
      const dx = snap(g.ref.x + q.x - g.p0.x, step) - g.ref.x
      const dy = snap(g.ref.y + q.y - g.p0.y, step) - g.ref.y
      next = updateLayers(g.start, side, (l) =>
        g.ids.includes(l.id) ? translateLayer(l, dx, dy) : l
      )
    } else if (g.kind === 'resize') {
      const box = resizeWithHandle(g.layer, g.handle, toLocal(g.layer, q), {
        keepRatio: e.shiftKey,
        step
      })
      next = replace(g.start, side, g.layer.id, applyBounds(g.layer, box))
    } else {
      const raw = g.layer.rotation + angleFrom(anchorPoint(g.layer), q) - g.a0
      const rotation = normalizeAngle(e.shiftKey ? snap(raw, 15) : Math.round(raw * 10) / 10)
      next = replace(g.start, side, g.layer.id, { ...g.layer, rotation } as Layer)
    }
    dispatch({ type: 'gestureUpdate', template: next })
  }

  const onPointerUp = (e: React.PointerEvent): void => {
    if (marqueeStart.current) {
      marqueeStart.current = null
      setMarquee(null)
      overlayRef.current?.releasePointerCapture(e.pointerId)
      return
    }
    if (!gesture.current) return
    gesture.current = null
    overlayRef.current?.releasePointerCapture(e.pointerId)
    dispatch({ type: 'gestureEnd' })
  }

  /** Doppio clic su un gruppo: si entra nel gruppo e si seleziona il figlio sotto il puntatore */
  const onDoubleClick = (e: React.MouseEvent): void => {
    const p = cardPoint(e)
    const { hit } = pick(p)
    if (!hit || hit.type !== 'group') return
    const q = toFrame(p, [...frameOf(hit.id), hit])
    const child = hit.children.find((l) => !l.locked && hitTest(l, q))
    dispatch({ type: 'select', ids: child ? [child.id] : [], scope: hit.id })
  }

  const px = 1 / scale
  const selected = selection
    .map((id) => findLayer(layers, id))
    .filter((l): l is Layer => l !== null)
  const scopeGroup = scope ? findLayer(layers, scope) : null

  return (
    <>
      <div
        className="canvas-viewport"
        ref={viewportRef}
        onPointerDown={(e) => {
          // anche fuori dalla carta si può iniziare un rettangolo di selezione
          if (e.target !== e.currentTarget || e.button !== 0) return
          if (!e.shiftKey) dispatch({ type: 'select', ids: [], scope: null })
          marqueeStart.current = { p0: cardPoint(e), base: e.shiftKey ? selection : [] }
          overlayRef.current?.setPointerCapture(e.pointerId)
        }}
      >
        <div className="canvas-stage" style={{ width: vw * scale, height: vh * scale }}>
          <ShowEmptyContext.Provider value={true}>
            <CardSvg
              template={display}
              side={side}
              scale={scale}
              mode={guides.bleed ? 'bleed' : 'trim'}
            />
          </ShowEmptyContext.Provider>
          <svg
            ref={overlayRef}
            className="canvas-overlay"
            width={vw * scale}
            height={vh * scale}
            viewBox={`${-b} ${-b} ${vw} ${vh}`}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onDoubleClick={onDoubleClick}
          >
            {guides.safe && (
              <rect
                x={tpl.safeMargin}
                y={tpl.safeMargin}
                width={tpl.width - 2 * tpl.safeMargin}
                height={tpl.height - 2 * tpl.safeMargin}
                className="safe-area"
                vectorEffect="non-scaling-stroke"
              />
            )}
            {marquee && (
              <rect
                x={marquee.x}
                y={marquee.y}
                width={marquee.w}
                height={marquee.h}
                className="marquee"
                vectorEffect="non-scaling-stroke"
              />
            )}
            {scopeGroup && (
              <Framed chain={frameOf(scopeGroup.id)} layer={scopeGroup}>
                <Outline b={scopeGroup} className="scope-outline" />
              </Framed>
            )}
            {selected.map((l) => (
              <Framed key={l.id} chain={frameOf(l.id)} layer={l}>
                <Outline b={l} className={l.locked ? 'sel-outline locked' : 'sel-outline'} />
                {selected.length === 1 && !l.locked && (
                  <>
                    <line
                      x1={l.x + l.w / 2}
                      y1={l.y}
                      x2={l.x + l.w / 2}
                      y2={l.y - ROTATE_PX * px}
                      className="sel-outline"
                      vectorEffect="non-scaling-stroke"
                    />
                    <circle
                      cx={l.x + l.w / 2}
                      cy={l.y - ROTATE_PX * px}
                      r={(HANDLE_PX / 2) * px}
                      className="handle rotate"
                      vectorEffect="non-scaling-stroke"
                      onPointerDown={(e) => onHandleDown(e, l, 'rotate')}
                    >
                      <title>{t('editor.rotateHint')}</title>
                    </circle>
                    {HANDLES.map((h) => {
                      const pos = handlePosition(l, h)
                      return (
                        <rect
                          key={h}
                          x={pos.x - (HANDLE_PX / 2) * px}
                          y={pos.y - (HANDLE_PX / 2) * px}
                          width={HANDLE_PX * px}
                          height={HANDLE_PX * px}
                          className={`handle h-${h}`}
                          vectorEffect="non-scaling-stroke"
                          onPointerDown={(e) => onHandleDown(e, l, h)}
                        />
                      )
                    })}
                  </>
                )}
              </Framed>
            ))}
          </svg>
        </div>
      </div>
      <div className="zoom-controls">
        <button
          className={guides.bleed ? 'active' : ''}
          aria-pressed={guides.bleed}
          onClick={() => toggleGuide('bleed')}
        >
          {t('editor.showBleed')}
        </button>
        <button
          className={guides.safe ? 'active' : ''}
          aria-pressed={guides.safe}
          onClick={() => toggleGuide('safe')}
        >
          {t('editor.showSafe')}
        </button>
        <span className="zoom-sep" />
        <button onClick={() => setZoom(stepZoom(scale, -1))} aria-label={t('editor.zoomOut')}>
          −
        </button>
        <button className={zoom === null ? 'active' : ''} onClick={() => setZoom(null)}>
          {t('editor.zoomFit')}
        </button>
        <button onClick={() => setZoom(stepZoom(scale, 1))} aria-label={t('editor.zoomIn')}>
          +
        </button>
        <span className="muted small" title={t('editor.zoomHint')}>
          {Math.round((scale / 3.78) * 100)}%
        </span>
      </div>
    </>
  )
}

interface Guides {
  bleed: boolean
  safe: boolean
}

const GUIDES_KEY = 'editorGuides'

function loadGuides(): Guides {
  try {
    return { bleed: true, safe: true, ...JSON.parse(localStorage.getItem(GUIDES_KEY) ?? '{}') }
  } catch {
    return { bleed: true, safe: true }
  }
}

/** Disegna i figli nel sistema del livello: rotazioni dei gruppi che lo contengono e la sua */
function Framed({
  chain,
  layer,
  children
}: {
  chain: GroupLayer[]
  layer: Layer
  children: React.ReactNode
}): React.JSX.Element {
  return [...chain, layer].reduceRight<React.JSX.Element>(
    (inner, l) => {
      const a = anchorPoint(l)
      return (
        <g transform={l.rotation ? `rotate(${l.rotation} ${a.x} ${a.y})` : undefined}>{inner}</g>
      )
    },
    <>{children}</>
  )
}

function Outline({ b, className }: { b: Bounds; className: string }): React.JSX.Element {
  return (
    <rect
      x={b.x}
      y={b.y}
      width={b.w}
      height={b.h}
      className={className}
      vectorEffect="non-scaling-stroke"
    />
  )
}

/** Riquadro sulla carta di un livello, con le rotazioni sue e dei gruppi che lo contengono */
function worldBounds(l: Layer, chain: GroupLayer[]): Bounds {
  const corners = [
    { x: l.x, y: l.y },
    { x: l.x + l.w, y: l.y },
    { x: l.x, y: l.y + l.h },
    { x: l.x + l.w, y: l.y + l.h }
  ].map((p) =>
    [l, ...[...chain].reverse()].reduce((q, c) => rotateAround(q, anchorPoint(c), c.rotation), p)
  )
  const xs = corners.map((p) => p.x)
  const ys = corners.map((p) => p.y)
  const x = Math.min(...xs)
  const y = Math.min(...ys)
  return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y }
}

function intersects(a: Bounds, b: Bounds): boolean {
  return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h
}

function applyBounds(l: Layer, b: Bounds): Layer {
  return l.type === 'group' ? transformInto(l, b) : ({ ...l, ...b } as Layer)
}

function replace(t: Template, side: 'front' | 'back', id: string, layer: Layer): Template {
  return updateLayers(t, side, (l) => (l.id === id ? layer : l))
}

/** 3.78 px/mm è il 100% a 96 dpi */
function stepZoom(current: number, dir: 1 | -1): number {
  const levels = ZOOMS.map((z) => z * 3.78 * 0.25)
  if (dir > 0) return levels.find((z) => z > current + 0.01) ?? levels[levels.length - 1]
  return [...levels].reverse().find((z) => z < current - 0.01) ?? levels[0]
}
