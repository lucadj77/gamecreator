import type { Crop } from './template'

// Ritaglio di un livello immagine: la parte dell'immagine da usare, in frazioni (0-1) della
// larghezza e dell'altezza del file. Non tocca il file; l'adattamento lavora sulla parte ritagliata.

/** Lato minimo del ritaglio, in frazione dell'immagine */
export const MIN_CROP = 0.01

/** Ritaglio valido e dentro l'immagine, o null se manca o copre tutta l'immagine */
export function cropRect(c: Crop | null | undefined): Crop | null {
  if (!c || ![c.x, c.y, c.w, c.h].every(Number.isFinite)) return null
  const x = clamp(c.x, 0, 1 - MIN_CROP)
  const y = clamp(c.y, 0, 1 - MIN_CROP)
  const w = clamp(c.w, MIN_CROP, 1 - x)
  const h = clamp(c.h, MIN_CROP, 1 - y)
  if (x === 0 && y === 0 && w === 1 && h === 1) return null
  return { x, y, w, h }
}

/** "x y larghezza altezza" in percentuale dell'immagine, come si scrive in una cella */
export function cropText(c: Crop): string {
  const p = (n: number): string => String(Math.round(n * 1000) / 10)
  return `${p(c.x)} ${p(c.y)} ${p(c.w)} ${p(c.h)}`
}

/**
 * Ritaglio scritto in una cella: quattro numeri in percentuale, separati da spazi, ";" o "/"
 * (il simbolo % è facoltativo); "none" o una cella vuota lo tolgono
 */
export function parseCrop(text: string): Crop | null | undefined {
  const v = text.trim()
  if (!v || v.toLowerCase() === 'none') return null
  const n = v
    .split(/[\s;/]+/)
    .filter(Boolean)
    .map((p) => Number(p.replace('%', '').replace(',', '.')))
  if (n.length !== 4 || !n.every(Number.isFinite)) return undefined
  return cropRect({ x: n[0] / 100, y: n[1] / 100, w: n[2] / 100, h: n[3] / 100 })
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n))
}
