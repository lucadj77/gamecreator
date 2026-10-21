import type { Sheet } from '../project'
import { cropText } from './crop'
import { insertRow, writeCells } from './sheet'
import type { ImageLayer, Template } from './template'

// Un'immagine grande divisa tra le carte di un set: ogni carta mostra il suo pezzo, così messe in
// griglia ricompongono l'immagine. Per ogni carta si scrivono nel foglio l'immagine, il ritaglio
// e, dove il livello esce dall'immagine (l'abbondanza delle carte sul bordo), il riquadro ridotto.

export interface SplitOptions {
  /** Nome del livello immagine, sul fronte o sul retro, non dentro un gruppo */
  layer: string
  src: string
  cols: number
  rows: number
  /** 'rows': da sinistra a destra, poi la riga sotto; 'columns': dall'alto in basso */
  order: 'rows' | 'columns'
  /** L'immagine comprende anche l'abbondanza esterna, intorno a tutta la griglia */
  outerBleed: boolean
  /** Prima riga del foglio da usare (0 = la prima) */
  start: number
}

/** Livelli immagine che si possono dividere: non ruotati e non dentro un gruppo */
export function splittableLayers(t: Template): ImageLayer[] {
  return [...t.front, ...t.back].filter((l): l is ImageLayer => l.type === 'image' && !l.rotation)
}

/** Proporzioni (larghezza / altezza) che l'immagine dovrebbe avere per non deformarsi */
export function splitAspect(
  t: Template,
  o: Pick<SplitOptions, 'cols' | 'rows' | 'outerBleed'>
): number {
  const b = o.outerBleed ? t.bleed : 0
  return (o.cols * t.width + 2 * b) / (o.rows * t.height + 2 * b)
}

const mm = (n: number): string => String(Math.round(n * 100) / 100)

export function splitImage(sheet: Sheet, t: Template, o: SplitOptions): Sheet {
  const l = splittableLayers(t).find((x) => x.name === o.layer)
  if (!l || o.cols < 1 || o.rows < 1) return sheet
  const W = t.width
  const H = t.height
  const b = o.outerBleed ? t.bleed : 0
  const TW = o.cols * W + 2 * b
  const TH = o.rows * H + 2 * b
  const n = o.cols * o.rows
  let s = sheet
  while (s.rows.length < o.start + n) s = insertRow(s)
  for (let k = 0; k < n; k++) {
    const c = o.order === 'rows' ? k % o.cols : Math.floor(k / o.rows)
    const r = o.order === 'rows' ? Math.floor(k / o.cols) : k % o.rows
    // la carta nella griglia dell'immagine, in mm, e il livello dentro di lei
    const gx = b + c * W
    const gy = b + r * H
    const x0 = Math.max(0, gx + l.x)
    const y0 = Math.max(0, gy + l.y)
    const x1 = Math.min(TW, gx + l.x + l.w)
    const y1 = Math.min(TH, gy + l.y + l.h)
    const row = o.start + k
    s = writeCells(s, [row], `${l.name}.src`, o.src)
    if (x1 <= x0 || y1 <= y0) {
      s = writeCells(s, [row], `${l.name}.visible`, 'false')
      continue
    }
    if (s.headers.includes(`${l.name}.visible`)) s = writeCells(s, [row], `${l.name}.visible`, '')
    s = writeCells(s, [row], `${l.name}.fit`, 'stretch')
    // un'icona colorata del template diventerebbe una sagoma: il pezzo ha i suoi colori
    if (l.tint) s = writeCells(s, [row], `${l.name}.tint`, 'none')
    s = writeCells(
      s,
      [row],
      `${l.name}.crop`,
      cropText({ x: x0 / TW, y: y0 / TH, w: (x1 - x0) / TW, h: (y1 - y0) / TH })
    )
    // il riquadro cambia solo dove il livello esce dall'immagine; altrimenti vale il template
    const box: [string, number, number][] = [
      ['x', x0 - gx, l.x],
      ['y', y0 - gy, l.y],
      ['w', x1 - x0, l.w],
      ['h', y1 - y0, l.h]
    ]
    for (const [key, v, base] of box)
      if (Math.abs(v - base) > 0.001 || s.headers.includes(`${l.name}.${key}`))
        s = writeCells(s, [row], `${l.name}.${key}`, Math.abs(v - base) > 0.001 ? mm(v) : '')
  }
  return s
}
