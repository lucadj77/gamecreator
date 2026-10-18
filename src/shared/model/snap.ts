import type { Bounds } from './edit'

// Magnetismo tra oggetti: i lati e i centri di un riquadro si agganciano alle linee
// degli altri livelli e della carta quando ci arrivano abbastanza vicino.

export interface SnapLines {
  /** Linee verticali (valori di x) e orizzontali (valori di y) in mm */
  x: number[]
  y: number[]
}

/** Lati e centro di ogni riquadro */
export function linesOf(boxes: Bounds[]): SnapLines {
  return {
    x: boxes.flatMap((b) => [b.x, b.x + b.w / 2, b.x + b.w]),
    y: boxes.flatMap((b) => [b.y, b.y + b.h / 2, b.y + b.h])
  }
}

/** Linea più vicina a uno dei valori, entro la soglia: correzione da applicare e linea */
export function nearest(
  values: number[],
  lines: number[],
  threshold: number
): { delta: number; line: number } | null {
  let best: { delta: number; line: number } | null = null
  for (const v of values)
    for (const line of lines) {
      const d = line - v
      if (Math.abs(d) <= threshold && (!best || Math.abs(d) < Math.abs(best.delta)))
        best = { delta: d, line }
    }
  return best
}

/** Aggancio di un riquadro in movimento: per ogni asse correzione e linea, se c'è */
export function snapBox(
  box: Bounds,
  lines: SnapLines,
  threshold: number
): { x: { delta: number; line: number } | null; y: { delta: number; line: number } | null } {
  return {
    x: nearest([box.x, box.x + box.w / 2, box.x + box.w], lines.x, threshold),
    y: nearest([box.y, box.y + box.h / 2, box.y + box.h], lines.y, threshold)
  }
}
