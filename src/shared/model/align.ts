import { findLayer, translateLayer, updateLayers, type Bounds } from './edit'
import { worldBounds } from './geometry'
import type { Layer, Side, Template } from './template'

// Allineamento, distribuzione e disposizione a griglia dei livelli selezionati.
// I livelli sono fratelli nello stesso contenitore; si usa il loro ingombro ruotato.

export type AlignMode = 'left' | 'hcenter' | 'right' | 'top' | 'vcenter' | 'bottom'
export type AlignTarget = 'card' | 'safe' | 'selection'

export interface GridOptions {
  columns: number
  rows: number
  /** Spazio tra le celle in mm; null lo calcola per riempire l'area */
  gapX: number | null
  gapY: number | null
}

interface Item {
  id: string
  box: Bounds
}

export function unionBounds(boxes: Bounds[]): Bounds {
  const x1 = Math.min(...boxes.map((b) => b.x))
  const y1 = Math.min(...boxes.map((b) => b.y))
  const x2 = Math.max(...boxes.map((b) => b.x + b.w))
  const y2 = Math.max(...boxes.map((b) => b.y + b.h))
  return { x: x1, y: y1, w: x2 - x1, h: y2 - y1 }
}

/** Area della carta: rifilo o area sicura */
export function cardArea(t: Template, target: 'card' | 'safe'): Bounds {
  const m = target === 'safe' ? t.safeMargin : 0
  return { x: m, y: m, w: t.width - 2 * m, h: t.height - 2 * m }
}

function items(t: Template, side: Side, ids: string[]): Item[] {
  return ids
    .map((id) => findLayer(t[side], id))
    .filter((l): l is Layer => !!l && l.type !== 'value' && !l.locked)
    .map((l) => ({ id: l.id, box: worldBounds(l) }))
}

/** Con un solo livello la selezione non è un riferimento: si usa la carta */
function reference(t: Template, target: AlignTarget, list: Item[]): Bounds {
  if (target === 'selection' && list.length > 1) return unionBounds(list.map((i) => i.box))
  return cardArea(t, target === 'safe' ? 'safe' : 'card')
}

function moveAll(t: Template, side: Side, moves: Map<string, [number, number]>): Template {
  return updateLayers(t, side, (l) => {
    const m = moves.get(l.id)
    return m && (m[0] || m[1]) ? translateLayer(l, m[0], m[1]) : l
  })
}

export function alignLayers(
  t: Template,
  side: Side,
  ids: string[],
  mode: AlignMode,
  target: AlignTarget
): Template {
  const list = items(t, side, ids)
  if (!list.length) return t
  const r = reference(t, target, list)
  const moves = new Map<string, [number, number]>()
  for (const { id, box: b } of list) {
    const dx =
      mode === 'left'
        ? r.x - b.x
        : mode === 'right'
          ? r.x + r.w - (b.x + b.w)
          : mode === 'hcenter'
            ? r.x + r.w / 2 - (b.x + b.w / 2)
            : 0
    const dy =
      mode === 'top'
        ? r.y - b.y
        : mode === 'bottom'
          ? r.y + r.h - (b.y + b.h)
          : mode === 'vcenter'
            ? r.y + r.h / 2 - (b.y + b.h / 2)
            : 0
    moves.set(id, [dx, dy])
  }
  return moveAll(t, side, moves)
}

/**
 * Spazi uguali tra i livelli. Rispetto alla selezione i due estremi restano fermi;
 * rispetto alla carta i livelli occupano tutta la larghezza (o l'altezza).
 */
export function distributeLayers(
  t: Template,
  side: Side,
  ids: string[],
  axis: 'h' | 'v',
  target: AlignTarget
): Template {
  const list = items(t, side, ids)
  if (list.length < 2) return t
  const r = reference(t, target, list)
  const [pos, size] = axis === 'h' ? (['x', 'w'] as const) : (['y', 'h'] as const)
  const sorted = [...list].sort(
    (a, b) => a.box[pos] + a.box[size] / 2 - (b.box[pos] + b.box[size] / 2)
  )
  const total = sorted.reduce((s, i) => s + i.box[size], 0)
  const gap = (r[size] - total) / (sorted.length - 1)
  const moves = new Map<string, [number, number]>()
  let at = r[pos]
  for (const { id, box } of sorted) {
    const d = at - box[pos]
    moves.set(id, axis === 'h' ? [d, 0] : [0, d])
    at += box[size] + gap
  }
  return moveAll(t, side, moves)
}

/** Ordine di lettura: per righe dall'alto, e in ogni riga da sinistra */
function readingOrder(list: Item[]): Item[] {
  const byY = [...list].sort((a, b) => a.box.y + a.box.h / 2 - (b.box.y + b.box.h / 2))
  const out: Item[] = []
  let line: Item[] = []
  let bottom = -Infinity
  for (const i of byY) {
    if (line.length && i.box.y + i.box.h / 2 > bottom) {
      out.push(...line.sort((a, b) => a.box.x - b.box.x))
      line = []
    }
    if (!line.length) bottom = i.box.y + i.box.h
    line.push(i)
  }
  out.push(...line.sort((a, b) => a.box.x - b.box.x))
  return out
}

/**
 * Dispone i livelli su una griglia di celle grandi quanto il livello più grande, ognuno
 * centrato nella sua cella. Le righe aumentano se non bastano per tutti i livelli.
 * Rispetto alla selezione la griglia parte dal suo angolo in alto a sinistra; rispetto
 * alla carta è centrata. Con lo spazio automatico la griglia riempie l'area.
 */
export function arrangeGrid(
  t: Template,
  side: Side,
  ids: string[],
  opts: GridOptions,
  target: AlignTarget
): Template {
  const list = readingOrder(items(t, side, ids))
  if (list.length < 2) return t
  const cols = Math.max(1, Math.min(Math.round(opts.columns), list.length))
  const rows = Math.max(Math.round(opts.rows), Math.ceil(list.length / cols))
  const r = reference(t, target, list)
  const cellW = Math.max(...list.map((i) => i.box.w))
  const cellH = Math.max(...list.map((i) => i.box.h))
  const auto = (space: number, cell: number, n: number): number =>
    n > 1 ? Math.max(0, (space - n * cell) / (n - 1)) : 0
  const gapX = opts.gapX ?? auto(r.w, cellW, cols)
  const gapY = opts.gapY ?? auto(r.h, cellH, rows)
  const gridW = cols * cellW + (cols - 1) * gapX
  const gridH = rows * cellH + (rows - 1) * gapY
  const x0 = target === 'selection' ? r.x : r.x + (r.w - gridW) / 2
  const y0 = target === 'selection' ? r.y : r.y + (r.h - gridH) / 2
  const moves = new Map<string, [number, number]>()
  list.forEach(({ id, box }, n) => {
    const cx = x0 + (n % cols) * (cellW + gapX) + cellW / 2
    const cy = y0 + Math.floor(n / cols) * (cellH + gapY) + cellH / 2
    moves.set(id, [cx - (box.x + box.w / 2), cy - (box.y + box.h / 2)])
  })
  return moveAll(t, side, moves)
}
