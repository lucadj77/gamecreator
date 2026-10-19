// Contorno di un'immagine come tracciato: si usa come forma della carta o di un livello forma.
// Dai pixel pieni (alfa sopra la soglia) si ricavano i bordi tra pixel pieni e vuoti, si
// uniscono in anelli chiusi e si semplificano. Il tracciato è in coordinate 0-1 rispetto
// all'immagine; i buchi restano buchi con la regola evenodd.

interface Pt {
  x: number
  y: number
}

/** Anelli dei bordi dei pixel pieni, orientati in senso orario attorno al pieno */
function rings(filled: (x: number, y: number) => boolean, w: number, h: number): Pt[][] {
  const key = (x: number, y: number): number => y * (w + 1) + x
  const next = new Map<number, number[]>()
  const add = (x1: number, y1: number, x2: number, y2: number): void => {
    const k = key(x1, y1)
    const list = next.get(k)
    if (list) list.push(key(x2, y2))
    else next.set(k, [key(x2, y2)])
  }
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      if (!filled(x, y)) continue
      if (y === 0 || !filled(x, y - 1)) add(x, y, x + 1, y)
      if (x === w - 1 || !filled(x + 1, y)) add(x + 1, y, x + 1, y + 1)
      if (y === h - 1 || !filled(x, y + 1)) add(x + 1, y + 1, x, y + 1)
      if (x === 0 || !filled(x - 1, y)) add(x, y + 1, x, y)
    }
  const out: Pt[][] = []
  for (const start of [...next.keys()]) {
    while (next.get(start)?.length) {
      const ring: Pt[] = []
      let k = start
      do {
        ring.push({ x: k % (w + 1), y: Math.floor(k / (w + 1)) })
        const list = next.get(k)!
        const n = list.pop()!
        if (!list.length) next.delete(k)
        k = n
      } while (k !== start && next.has(k))
      if (ring.length >= 4) out.push(ring)
    }
  }
  return out
}

/** Semplificazione di Ramer-Douglas-Peucker su un anello chiuso */
function simplify(ring: Pt[], eps: number): Pt[] {
  const dist = (p: Pt, a: Pt, b: Pt): number => {
    const dx = b.x - a.x
    const dy = b.y - a.y
    const len = Math.hypot(dx, dy)
    if (!len) return Math.hypot(p.x - a.x, p.y - a.y)
    return Math.abs(dy * p.x - dx * p.y + b.x * a.y - b.y * a.x) / len
  }
  const rdp = (pts: Pt[]): Pt[] => {
    if (pts.length < 3) return pts
    let best = 0
    let at = 0
    for (let i = 1; i < pts.length - 1; i++) {
      const d = dist(pts[i], pts[0], pts[pts.length - 1])
      if (d > best) {
        best = d
        at = i
      }
    }
    if (best <= eps) return [pts[0], pts[pts.length - 1]]
    return [...rdp(pts.slice(0, at + 1)).slice(0, -1), ...rdp(pts.slice(at))]
  }
  // l'anello si apre nel punto più lontano dal primo, così le due metà si semplificano bene
  let far = 0
  for (let i = 1; i < ring.length; i++)
    if (
      Math.hypot(ring[i].x - ring[0].x, ring[i].y - ring[0].y) >
      Math.hypot(ring[far].x - ring[0].x, ring[far].y - ring[0].y)
    )
      far = i
  const a = rdp([...ring.slice(0, far + 1)])
  const b = rdp([...ring.slice(far), ring[0]])
  return [...a.slice(0, -1), ...b.slice(0, -1)]
}

/**
 * Tracciato del contorno dei pixel con alfa sopra la soglia. alpha ha w × h valori 0-255.
 * Gli anelli più piccoli di `minArea` pixel (granelli) si scartano.
 */
export function outlinePath(
  alpha: ArrayLike<number>,
  w: number,
  h: number,
  { threshold = 128, eps = 0.8, minArea = 4 } = {}
): string {
  const filled = (x: number, y: number): boolean => alpha[y * w + x] >= threshold
  const parts: string[] = []
  const r = (v: number, size: number): string => String(Math.round((v / size) * 10000) / 10000)
  for (const ring of rings(filled, w, h)) {
    let area = 0
    for (let i = 0; i < ring.length; i++) {
      const p = ring[i]
      const q = ring[(i + 1) % ring.length]
      area += p.x * q.y - q.x * p.y
    }
    if (Math.abs(area / 2) < minArea) continue
    const pts = simplify(ring, eps)
    if (pts.length < 3) continue
    parts.push('M' + pts.map((p) => `${r(p.x, w)} ${r(p.y, h)}`).join('L') + 'Z')
  }
  return parts.join('')
}
