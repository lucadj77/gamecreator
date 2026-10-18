import type { GroupLayer, Layer, LayerBase } from './template'
import { findLayer, type Bounds } from './edit'

// Geometria dei livelli: punti di ancoraggio, rotazioni, selezione con il puntatore e
// ridimensionamento con le maniglie. Coordinate in mm, angoli in gradi in senso orario.

export interface Point {
  x: number
  y: number
}

export function anchorPoint(l: LayerBase): Point {
  const [v, h] = l.anchor.includes('-')
    ? (l.anchor.split('-') as [string, string])
    : l.anchor === 'top' || l.anchor === 'bottom'
      ? [l.anchor, 'center']
      : ['middle', l.anchor]
  const x = h === 'left' ? l.x : h === 'right' ? l.x + l.w : l.x + l.w / 2
  const y = v === 'top' ? l.y : v === 'bottom' ? l.y + l.h : l.y + l.h / 2
  return { x, y }
}

export function rotateAround(p: Point, c: Point, deg: number): Point {
  if (!deg) return p
  const r = (deg * Math.PI) / 180
  const cos = Math.cos(r)
  const sin = Math.sin(r)
  const dx = p.x - c.x
  const dy = p.y - c.y
  return { x: c.x + dx * cos - dy * sin, y: c.y + dx * sin + dy * cos }
}

/** Dal sistema del contenitore a quello del livello non ruotato */
export function toLocal(l: LayerBase, p: Point): Point {
  return rotateAround(p, anchorPoint(l), -l.rotation)
}

/** Gruppi che contengono il livello, dal più esterno */
export function ancestorsOf(layers: Layer[], id: string): GroupLayer[] {
  for (const l of layers) {
    if (l.id === id) return []
    if (l.type === 'group') {
      if (findLayer(l.children, id)) return [l, ...ancestorsOf(l.children, id)]
    }
  }
  return []
}

/** Porta un punto della carta nel sistema dei figli dell'ultimo gruppo della catena */
export function toFrame(p: Point, chain: GroupLayer[]): Point {
  return chain.reduce((q, g) => toLocal(g, q), p)
}

/** Tolleranza in mm per i livelli molto sottili, come le linee */
const HIT_PAD = 0.6

export function hitTest(l: Layer, p: Point): boolean {
  if (!l.visible) return false
  const q = toLocal(l, p)
  if (l.type === 'group') return l.children.some((c) => hitTest(c, q))
  const px = l.w < 2 * HIT_PAD ? HIT_PAD : 0
  const py = l.h < 2 * HIT_PAD ? HIT_PAD : 0
  return q.x >= l.x - px && q.x <= l.x + l.w + px && q.y >= l.y - py && q.y <= l.y + l.h + py
}

export type Handle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w'

export const HANDLES: Handle[] = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w']

export function handlePosition(b: Bounds, h: Handle): Point {
  const x = h.includes('w') ? b.x : h.includes('e') ? b.x + b.w : b.x + b.w / 2
  const y = h.includes('n') ? b.y : h.includes('s') ? b.y + b.h : b.y + b.h / 2
  return { x, y }
}

export function snap(v: number, step: number): number {
  return step > 0 ? Math.round(v / step) * step : v
}

const MIN_SIZE = 0.5

/**
 * Nuovo riquadro trascinando una maniglia. `local` è il puntatore nel sistema del livello
 * all'inizio del gesto. Il lato opposto resta fermo anche se il livello è ruotato.
 */
export function resizeWithHandle(
  start: LayerBase,
  handle: Handle,
  local: Point,
  opts: { keepRatio?: boolean; step?: number } = {}
): Bounds {
  const step = opts.step ?? 0
  let left = start.x
  let top = start.y
  let right = start.x + start.w
  let bottom = start.y + start.h
  if (handle.includes('w')) left = Math.min(snap(local.x, step), right - MIN_SIZE)
  if (handle.includes('e')) right = Math.max(snap(local.x, step), left + MIN_SIZE)
  if (handle.includes('n')) top = Math.min(snap(local.y, step), bottom - MIN_SIZE)
  if (handle.includes('s')) bottom = Math.max(snap(local.y, step), top + MIN_SIZE)

  if (opts.keepRatio && handle.length === 2 && start.w > 0 && start.h > 0) {
    const s = Math.max((right - left) / start.w, (bottom - top) / start.h)
    const w = start.w * s
    const h = start.h * s
    if (handle.includes('w')) left = right - w
    else right = left + w
    if (handle.includes('n')) top = bottom - h
    else bottom = top + h
  }

  const b = { x: left, y: top, w: right - left, h: bottom - top }
  if (!start.rotation) return b
  // il punto di ancoraggio si sposta con il riquadro: si trasla per compensare la rotazione
  const a = anchorPoint(start)
  const a2 = anchorPoint({ ...start, ...b })
  const moved = rotateAround(a2, a, start.rotation)
  return { ...b, x: b.x + moved.x - a2.x, y: b.y + moved.y - a2.y }
}

/** Angolo in gradi della direzione da c a p, con 0 verso l'alto */
export function angleFrom(c: Point, p: Point): number {
  return (Math.atan2(p.y - c.y, p.x - c.x) * 180) / Math.PI + 90
}

/** Riporta un angolo nell'intervallo (-180, 180] */
export function normalizeAngle(deg: number): number {
  const a = ((((deg + 180) % 360) + 360) % 360) - 180
  return a === -180 ? 180 : a
}
