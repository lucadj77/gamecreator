import type { GroupLayer, Layer, LayerBase, ShapeLayer } from './template'
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
  if (!l.visible || l.type === 'value') return false
  const q = toLocal(l, p)
  if (l.type === 'group') return l.children.some((c) => hitTest(c, q))
  const px = l.w < 2 * HIT_PAD ? HIT_PAD : 0
  const py = l.h < 2 * HIT_PAD ? HIT_PAD : 0
  return q.x >= l.x - px && q.x <= l.x + l.w + px && q.y >= l.y - py && q.y <= l.y + l.h + py
}

/** Riquadro sulla carta di un livello, con le rotazioni sue e dei gruppi che lo contengono */
export function worldBounds(l: Layer, chain: GroupLayer[] = []): Bounds {
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
  } else if (opts.keepRatio && start.w > 0 && start.h > 0) {
    // maniglia su un lato: l'altra misura segue, centrata sull'asse che non si trascina
    if (handle === 'e' || handle === 'w') {
      const h = (start.h * (right - left)) / start.w
      top = start.y + (start.h - h) / 2
      bottom = top + h
    } else {
      const w = (start.w * (bottom - top)) / start.h
      left = start.x + (start.w - w) / 2
      right = left + w
    }
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

/** Vertici di un poligono regolare o di una stella inscritti nel riquadro, dall'alto in senso orario */
export function polygonVertices(l: ShapeLayer): Point[] {
  const n = Math.max(3, Math.round(l.sides))
  const cx = l.x + l.w / 2
  const cy = l.y + l.h / 2
  const count = l.shape === 'star' ? n * 2 : n
  const pts: Point[] = []
  for (let i = 0; i < count; i++) {
    const r = l.shape === 'star' && i % 2 === 1 ? l.innerRatio : 1
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / count
    pts.push({ x: cx + (Math.cos(a) * r * l.w) / 2, y: cy + (Math.sin(a) * r * l.h) / 2 })
  }
  return pts
}

const fmt = (n: number): string => String(Math.round(n * 1000) / 1000)

/**
 * Tracciato SVG di un poligono chiuso con gli angoli arrotondati da archi di raggio r (mm).
 * Se il lato è troppo corto il raggio si riduce, così due archi vicini non si sovrappongono.
 */
export function roundedPolygonPath(pts: Point[], r: number): string {
  const n = pts.length
  if (r <= 0 || n < 3) return 'M' + pts.map((p) => `${fmt(p.x)},${fmt(p.y)}`).join(' L') + ' Z'
  const dist = (a: Point, b: Point): number => Math.hypot(b.x - a.x, b.y - a.y)
  const parts: string[] = []
  for (let i = 0; i < n; i++) {
    const a = pts[(i - 1 + n) % n]
    const p = pts[i]
    const b = pts[(i + 1) % n]
    const la = dist(p, a)
    const lb = dist(p, b)
    const ua = { x: (a.x - p.x) / la, y: (a.y - p.y) / la }
    const ub = { x: (b.x - p.x) / lb, y: (b.y - p.y) / lb }
    // angolo interno al vertice e distanza dal vertice a cui l'arco tocca i lati
    const theta = Math.acos(Math.max(-1, Math.min(1, ua.x * ub.x + ua.y * ub.y)))
    const tan = Math.tan(theta / 2)
    let d = tan > 1e-9 ? r / tan : 0
    d = Math.min(d, la / 2, lb / 2)
    const radius = d * tan
    const p1 = { x: p.x + ua.x * d, y: p.y + ua.y * d }
    const p2 = { x: p.x + ub.x * d, y: p.y + ub.y * d }
    // svolta a destra sullo schermo (y verso il basso): arco in senso orario
    const cross = (p.x - a.x) * (b.y - p.y) - (p.y - a.y) * (b.x - p.x)
    parts.push(
      `${i ? 'L' : 'M'}${fmt(p1.x)},${fmt(p1.y)}`,
      `A${fmt(radius)},${fmt(radius)} 0 0 ${cross > 0 ? 1 : 0} ${fmt(p2.x)},${fmt(p2.y)}`
    )
  }
  return parts.join(' ') + ' Z'
}

/**
 * Esagono inscritto nel riquadro: con i lati piatti in alto se è più largo che alto,
 * altrimenti con le punte in alto.
 */
export function hexagonPoints(x: number, y: number, w: number, h: number): Point[] {
  const p = (u: number, v: number): Point => ({ x: x + u * w, y: y + v * h })
  return w >= h
    ? [p(0.25, 0), p(0.75, 0), p(1, 0.5), p(0.75, 1), p(0.25, 1), p(0, 0.5)]
    : [p(0.5, 0), p(1, 0.25), p(1, 0.75), p(0.5, 1), p(0, 0.75), p(0, 0.25)]
}
