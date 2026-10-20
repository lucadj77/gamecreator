// Conversioni tra codici esadecimali, RGB, HSV (per l'area del selettore) e HSL (per i campi).
// I componenti sono interi 0-255 per RGB, gradi 0-360 per la tonalità, 0-100 per saturazione,
// luminosità e valore; la trasparenza è 0-1.

export interface Rgba {
  r: number
  g: number
  b: number
  a: number
}

export interface Hsv {
  h: number
  s: number
  v: number
}

export interface Hsl {
  h: number
  s: number
  l: number
}

/** Colore da un codice #rgb, #rgba, #rrggbb o #rrggbbaa; null se non è un codice */
export function parseHex(text: string): Rgba | null {
  const m = text.trim().match(/^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i)
  if (!m) return null
  let hex = m[1]
  if (hex.length <= 4) hex = [...hex].map((c) => c + c).join('')
  const n = (i: number): number => parseInt(hex.slice(i, i + 2), 16)
  return { r: n(0), g: n(2), b: n(4), a: hex.length === 8 ? n(6) / 255 : 1 }
}

/** Colore da "rgb(...)"/"rgba(...)", come lo restituisce il browser; null altrimenti */
export function parseRgbFunction(text: string): Rgba | null {
  const m = text
    .trim()
    .match(/^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:[\s,/]+([\d.]+%?))?\s*\)$/i)
  if (!m) return null
  const a = m[4] === undefined ? 1 : m[4].endsWith('%') ? parseFloat(m[4]) / 100 : parseFloat(m[4])
  return { r: Math.round(+m[1]), g: Math.round(+m[2]), b: Math.round(+m[3]), a: clamp(a, 0, 1) }
}

/** Codice esadecimale maiuscolo: #RRGGBB, o #RRGGBBAA se il colore è trasparente */
export function toHex({ r, g, b, a }: Rgba): string {
  const h = (n: number): string =>
    Math.round(clamp(n, 0, 255))
      .toString(16)
      .padStart(2, '0')
  const alpha = Math.round(clamp(a, 0, 1) * 255)
  return ('#' + h(r) + h(g) + h(b) + (alpha < 255 ? h(alpha) : '')).toUpperCase()
}

export function rgbToHsv({ r, g, b }: Rgba): Hsv {
  const [R, G, B] = [r / 255, g / 255, b / 255]
  const max = Math.max(R, G, B)
  const d = max - Math.min(R, G, B)
  return { h: hue(R, G, B, max, d), s: max ? (d / max) * 100 : 0, v: max * 100 }
}

export function hsvToRgb({ h, s, v }: Hsv, a = 1): Rgba {
  const S = s / 100
  const V = v / 100
  const f = (n: number): number => {
    const k = (n + h / 60) % 6
    return Math.round((V - V * S * Math.max(0, Math.min(k, 4 - k, 1))) * 255)
  }
  return { r: f(5), g: f(3), b: f(1), a }
}

export function rgbToHsl({ r, g, b }: Rgba): Hsl {
  const [R, G, B] = [r / 255, g / 255, b / 255]
  const max = Math.max(R, G, B)
  const min = Math.min(R, G, B)
  const d = max - min
  const l = (max + min) / 2
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1))
  return { h: hue(R, G, B, max, d), s: s * 100, l: l * 100 }
}

export function hslToRgb({ h, s, l }: Hsl, a = 1): Rgba {
  const S = s / 100
  const L = l / 100
  const k = (n: number): number => (n + h / 30) % 12
  const q = S * Math.min(L, 1 - L)
  const f = (n: number): number =>
    Math.round((L - q * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1))) * 255)
  return { r: f(0), g: f(8), b: f(4), a }
}

function hue(R: number, G: number, B: number, max: number, d: number): number {
  if (d === 0) return 0
  const h = max === R ? ((G - B) / d) % 6 : max === G ? (B - R) / d + 2 : (R - G) / d + 4
  return (h * 60 + 360) % 360
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Number.isFinite(n) ? n : min))
}
