// Sfumature nei riempimenti, scritte come in CSS così valgono anche in una cella del foglio:
//   linear-gradient(90deg, #A33A2A, #FFD27A 70%)
//   radial-gradient(white, rosso)
// Gli angoli seguono CSS: 0deg va verso l'alto, 90deg verso destra. I colori possono essere
// variabili colore del progetto.

export interface GradientStop {
  color: string
  /** Posizione 0-1 */
  at: number
}

export interface Gradient {
  kind: 'linear' | 'radial'
  /** Gradi, solo per le sfumature lineari */
  angle: number
  stops: GradientStop[]
}

const RE = /^\s*(linear|radial)-gradient\(\s*([\s\S]*)\)\s*$/i

export const isGradient = (v: string | null | undefined): v is string => !!v && RE.test(v)

/** Divide sulle virgole che non stanno dentro parentesi: rgb(1, 2, 3) resta intero */
function splitArgs(s: string): string[] {
  const out: string[] = []
  let depth = 0
  let cur = ''
  for (const c of s) {
    if (c === '(') depth++
    if (c === ')') depth--
    if (c === ',' && depth === 0) {
      out.push(cur.trim())
      cur = ''
    } else cur += c
  }
  if (cur.trim()) out.push(cur.trim())
  return out
}

const DIRECTIONS: Record<string, number> = {
  'to top': 0,
  'to right': 90,
  'to bottom': 180,
  'to left': 270
}

export function parseGradient(v: string): Gradient | null {
  const m = v.match(RE)
  if (!m) return null
  const kind = m[1].toLowerCase() as Gradient['kind']
  const args = splitArgs(m[2])
  let angle = 180
  if (kind === 'linear' && args.length) {
    const a = args[0].toLowerCase()
    if (/^-?\d+(\.\d+)?deg$/.test(a)) {
      angle = parseFloat(a)
      args.shift()
    } else if (a in DIRECTIONS) {
      angle = DIRECTIONS[a]
      args.shift()
    }
  }
  const raw = args.map((a) => {
    // la posizione è l'ultima parola se finisce con %
    const p = a.match(/^(.*\S)\s+(-?\d+(?:\.\d+)?)%$/)
    return p ? { color: p[1], at: parseFloat(p[2]) / 100 } : { color: a, at: NaN }
  })
  if (raw.length < 2) return null
  // le posizioni mancanti si distribuiscono tra quelle note, come in CSS
  if (isNaN(raw[0].at)) raw[0].at = 0
  if (isNaN(raw[raw.length - 1].at)) raw[raw.length - 1].at = 1
  for (let i = 1; i < raw.length; i++) {
    if (!isNaN(raw[i].at)) continue
    let j = i
    while (isNaN(raw[j].at)) j++
    const from = raw[i - 1].at
    const step = (raw[j].at - from) / (j - i + 1)
    for (let k = i; k < j; k++) raw[k].at = from + step * (k - i + 1)
  }
  return { kind, angle, stops: raw }
}

const pct = (n: number): string => `${Math.round(n * 1000) / 10}%`

export function serializeGradient(g: Gradient): string {
  const stops = g.stops.map((s) => `${s.color} ${pct(s.at)}`)
  return g.kind === 'linear'
    ? `linear-gradient(${g.angle}deg, ${stops.join(', ')})`
    : `radial-gradient(${stops.join(', ')})`
}

/** Applica `f` a ogni colore della sfumatura, per esempio per risolvere le variabili */
export function mapGradientColors(v: string, f: (c: string) => string): string {
  const g = parseGradient(v)
  return g
    ? serializeGradient({ ...g, stops: g.stops.map((s) => ({ ...s, color: f(s.color) })) })
    : v
}

/**
 * Estremi di una sfumatura lineare in un riquadro, come in CSS: la linea passa per il centro
 * ed è lunga quanto serve perché i colori estremi tocchino gli angoli.
 */
export function linearEnds(
  angle: number,
  box: { x: number; y: number; w: number; h: number }
): { x1: number; y1: number; x2: number; y2: number } {
  const a = (angle * Math.PI) / 180
  const dx = Math.sin(a)
  const dy = -Math.cos(a)
  const half = (Math.abs(box.w * dx) + Math.abs(box.h * dy)) / 2
  const cx = box.x + box.w / 2
  const cy = box.y + box.h / 2
  return { x1: cx - dx * half, y1: cy - dy * half, x2: cx + dx * half, y2: cy + dy * half }
}
