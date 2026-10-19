import type { GradientStop } from '../../../shared/model/gradient'

// Passaggio morbido tra i colori di una sfumatura. SVG e CSS mescolano i colori in sRGB e in
// modo lineare: tra due colori saturi il centro esce spento, e sui colori intermedi si vede uno
// spigolo. Qui tra ogni coppia di colori si aggiungono tappe mescolate in OKLab, con
// un'accelerazione morbida (smoothstep) che toglie lo spigolo.

type Rgba = [number, number, number, number]

let ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null = null
const cache = new Map<string, Rgba | null>()

/** Un colore CSS qualsiasi (nome, #hex, rgb()) in componenti 0-1, attraverso il canvas */
function rgba(color: string): Rgba | null {
  if (cache.has(color)) return cache.get(color)!
  ctx ??= new OffscreenCanvas(1, 1).getContext('2d')
  let out: Rgba | null = null
  if (ctx) {
    ctx.clearRect(0, 0, 1, 1)
    ctx.fillStyle = '#00000000'
    ctx.fillStyle = color
    ctx.fillRect(0, 0, 1, 1)
    const d = ctx.getImageData(0, 0, 1, 1).data
    out = d[3] ? [d[0] / 255, d[1] / 255, d[2] / 255, d[3] / 255] : null
    // un colore trasparente vero (transparent, #0000) resta valido
    if (!out && /^(transparent|#0{3,4}|#0{6}00)$/i.test(color.trim())) out = [0, 0, 0, 0]
  }
  cache.set(color, out)
  return out
}

const toLinear = (c: number): number => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
const toGamma = (c: number): number =>
  c <= 0.0031308 ? 12.92 * c : 1.055 * Math.max(0, c) ** (1 / 2.4) - 0.055

function oklab([r, g, b]: Rgba): [number, number, number] {
  const [lr, lg, lb] = [toLinear(r), toLinear(g), toLinear(b)]
  const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb)
  const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb)
  const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb)
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s
  ]
}

function fromOklab([L, A, B]: [number, number, number]): [number, number, number] {
  const l = (L + 0.3963377774 * A + 0.2158037573 * B) ** 3
  const m = (L - 0.1055613458 * A - 0.0638541728 * B) ** 3
  const s = (L - 0.0894841775 * A - 1.291485548 * B) ** 3
  return [
    toGamma(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
    toGamma(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    toGamma(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s)
  ]
}

const hex = (v: number): string =>
  Math.round(Math.min(1, Math.max(0, v)) * 255)
    .toString(16)
    .padStart(2, '0')

/** Tappe intermedie per coppia di colori */
const STEPS = 12

export interface SmoothStop {
  at: number
  color: string
  opacity: number
}

export function smoothStops(stops: GradientStop[]): SmoothStop[] {
  const parsed = stops.map((s) => ({ at: s.at, c: rgba(s.color) }))
  // senza canvas (o con colori sconosciuti) si lasciano le tappe come sono
  if (parsed.some((p) => !p.c)) return stops.map((s) => ({ at: s.at, color: s.color, opacity: 1 }))
  const out: SmoothStop[] = []
  const push = (at: number, c: Rgba): void => {
    out.push({ at, color: `#${hex(c[0])}${hex(c[1])}${hex(c[2])}`, opacity: c[3] })
  }
  for (let i = 0; i < parsed.length; i++) {
    const a = parsed[i]
    push(a.at, a.c!)
    const b = parsed[i + 1]
    if (!b || b.at <= a.at) continue
    const la = oklab(a.c!)
    const lb = oklab(b.c!)
    for (let k = 1; k < STEPS; k++) {
      const t = k / STEPS
      const e = t * t * (3 - 2 * t)
      const mix = la.map((v, j) => v + (lb[j] - v) * e) as [number, number, number]
      const [r, g, bl] = fromOklab(mix)
      push(a.at + (b.at - a.at) * t, [r, g, bl, a.c![3] + (b.c![3] - a.c![3]) * e])
    }
  }
  return out
}

/** La stessa sfumatura in CSS, per l'anteprima nel pannello */
export function smoothCss(kind: 'linear' | 'radial', angle: number, stops: GradientStop[]): string {
  const list = smoothStops(stops)
    .map((s) => {
      const c = s.opacity < 1 ? `${s.color}${hex(s.opacity)}` : s.color
      return `${c} ${Math.round(s.at * 10000) / 100}%`
    })
    .join(', ')
  return kind === 'linear'
    ? `linear-gradient(${angle}deg, ${list})`
    : `radial-gradient(farthest-corner, ${list})`
}
