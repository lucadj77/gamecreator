import { isArranged } from './normalize'
import { isDrawn, type GroupLayer, type Layer, type LayoutAlign } from './template'

// Disposizione automatica e ripetizione dei figli di un gruppo: vedi docs/specifica.md, sezione 5.
// Il riquadro del gruppo resta fermo e i figli vi si dispongono dentro; le copie della
// ripetizione esistono solo nel disegno, il template salva i figli una volta sola.

/** Limite alle copie, per non bloccare il disegno con un numero sbagliato nel foglio */
export const MAX_REPEAT = 200

/** Numero di ripetizioni: null se il valore non è un numero (per esempio un campo non risolto) */
export function parseRepeat(repeat: string): number | null {
  const n = Number(repeat.trim().replace(',', '.'))
  if (!repeat.trim() || !Number.isFinite(n)) return null
  return Math.max(0, Math.min(MAX_REPEAT, Math.floor(n)))
}

/** Le ripetizioni nel template: un campo come {forza} vale 1 finché non c'è una carta */
export function repeatCount(g: GroupLayer): number {
  return parseRepeat(g.repeat) ?? 1
}

function shift(l: Layer, dx: number, dy: number): Layer {
  const out = { ...l, x: l.x + dx, y: l.y + dy } as Layer
  if (out.type === 'group') out.children = out.children.map((c) => shift(c, dx, dy))
  return out
}

function copyOf(l: Layer, k: number): Layer {
  const out = { ...l, id: `${l.id}~${k}` } as Layer
  if (out.type === 'group') out.children = out.children.map((c) => copyOf(c, k))
  return out
}

function offset(align: LayoutAlign, free: number): number {
  return align === 'center' ? free / 2 : align === 'end' ? free : 0
}

interface Box {
  x: number
  y: number
  w: number
  h: number
}

function boxOf(layers: Layer[]): Box {
  const x = Math.min(...layers.map((l) => l.x))
  const y = Math.min(...layers.map((l) => l.y))
  const w = Math.max(...layers.map((l) => l.x + l.w)) - x
  const h = Math.max(...layers.map((l) => l.y + l.h)) - y
  return { x, y, w, h }
}

/** Posizioni degli elementi nel riquadro, nello stesso ordine */
function place(g: GroupLayer, items: Box[]): { x: number; y: number }[] {
  const n = items.length
  if (!n) return []
  const gap = g.gap
  if (g.layout === 'grid') {
    const cols = Math.max(1, Math.min(Math.floor(g.columns) || 1, n))
    const rows = Math.ceil(n / cols)
    const cw = Math.max(...items.map((b) => b.w))
    const ch = Math.max(...items.map((b) => b.h))
    const x0 = g.x + offset(g.justify, g.w - (cols * cw + (cols - 1) * gap))
    const y0 = g.y + offset(g.justify, g.h - (rows * ch + (rows - 1) * gap))
    return items.map((b, i) => ({
      x: x0 + (i % cols) * (cw + gap) + offset(g.alignItems, cw - b.w),
      y: y0 + Math.floor(i / cols) * (ch + gap) + offset(g.alignItems, ch - b.h)
    }))
  }
  // 'none' con la ripetizione mette i blocchi in riga
  const vertical = g.layout === 'column'
  const total = items.reduce((s, b) => s + (vertical ? b.h : b.w), 0) + (n - 1) * gap
  let pos = vertical ? g.y + offset(g.justify, g.h - total) : g.x + offset(g.justify, g.w - total)
  return items.map((b) => {
    const at = vertical
      ? { x: g.x + offset(g.alignItems, g.w - b.w), y: pos }
      : { x: pos, y: g.y + offset(g.alignItems, g.h - b.h) }
    pos += (vertical ? b.h : b.w) + gap
    return at
  })
}

/**
 * Figli disposti nel riquadro, con le copie della ripetizione dopo gli originali.
 * Con "ritaglia" la maschera (l'ultimo figlio) resta dov'è e non si ripete; i figli nascosti
 * o senza disegno non occupano spazio.
 */
export function arrangeGroup(g: GroupLayer, count = repeatCount(g)): GroupLayer {
  if (!isArranged(g)) return g
  const mask = g.clip && g.children.length > 1 ? g.children[g.children.length - 1] : null
  const own = mask ? g.children.slice(0, -1) : g.children
  const copies = Array.from({ length: count }, (_, k) =>
    k === 0 ? own : own.map((c) => copyOf(c, k))
  )
  const shown = (l: Layer): boolean => isDrawn(l) && l.visible
  let placed: Layer[][]
  if (g.layout === 'none') {
    // ogni copia è un blocco che conserva la posizione relativa dei figli
    const blocks = copies.map((c) => (c.some(shown) ? boxOf(c.filter(shown)) : null))
    const at = place(
      g,
      blocks.filter((b): b is Box => b !== null)
    )
    let i = 0
    placed = copies.map((c, k) => {
      const b = blocks[k]
      if (!b) return c
      const p = at[i++]
      return c.map((l) => shift(l, p.x - b.x, p.y - b.y))
    })
  } else {
    const items = copies.flat()
    const visible = items.filter(shown)
    const at = place(g, visible)
    const pos = new Map(visible.map((l, i) => [l, at[i]]))
    let k = 0
    placed = copies.map((c) =>
      c.map((l) => {
        const p = pos.get(items[k++])
        return p ? shift(l, p.x - l.x, p.y - l.y) : l
      })
    )
  }
  return { ...g, children: [...placed.flat(), ...(mask ? [mask] : [])] }
}

/** Il gruppo come si salva: figli disposti, senza le copie */
export function arrangeModel(g: GroupLayer): GroupLayer {
  if (!isArranged(g)) return g
  const ids = new Set(g.children.map((c) => c.id))
  const arranged = arrangeGroup(g, Math.max(1, repeatCount(g)))
  return { ...g, children: arranged.children.filter((c) => ids.has(c.id)) }
}
