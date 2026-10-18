// Ricerca approssimata per nomi di file, icone e font: trova anche parole scritte male o
// abbreviate ("brodsword", "swrd") e ordina per somiglianza.

/**
 * Punteggio di somiglianza tra una ricerca e un testo, da 0 (nessuna) a 1 (uguali). Ogni
 * parola della ricerca deve trovare posto nel testo; conta la peggiore.
 */
export function fuzzyScore(query: string, text: string): number {
  const words = tokens(query)
  if (!words.length) return 1
  const target = text.toLowerCase()
  const parts = tokens(text)
  let total = 1
  for (const w of words) {
    const s = wordScore(w, target, parts)
    if (s === 0) return 0
    total = Math.min(total, s)
  }
  return total
}

/** Elementi che somigliano alla ricerca, dal più simile; a parità resta l'ordine di partenza */
export function fuzzyFilter<T>(items: T[], query: string, text: (item: T) => string): T[] {
  if (!tokens(query).length) return items
  return items
    .map((item, i) => ({ item, i, score: fuzzyScore(query, text(item)) }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score || a.i - b.i)
    .map((r) => r.item)
}

function tokens(s: string): string[] {
  return s
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean)
}

function wordScore(w: string, target: string, parts: string[]): number {
  if (parts.includes(w)) return 1
  if (parts.some((p) => p.startsWith(w))) return 0.9
  if (target.includes(w)) return 0.8
  // lettere nello stesso ordine dentro una parola che inizia allo stesso modo, con pochi vuoti:
  // "swrd" in "sword"; su tutto il testo troverebbe quasi ogni cosa
  if (w.length >= 3) {
    let best = -1
    for (const p of parts) {
      if (p[0] !== w[0]) continue
      const gaps = subsequenceGaps(w, p)
      if (gaps >= 0 && gaps <= Math.max(2, w.length / 2) && (best < 0 || gaps < best)) best = gaps
    }
    if (best >= 0) return 0.7 - best * 0.05
  }
  // errori di battitura: una lettera sbagliata ogni quattro circa
  const allowed = w.length >= 8 ? 2 : w.length >= 4 ? 1 : 0
  if (allowed) {
    let best = Infinity
    for (const p of parts) {
      best = Math.min(best, distance(w, p), distance(w, p.slice(0, w.length)))
      if (best === 0) break
    }
    if (best <= allowed) return 0.5 - best * 0.1
  }
  return 0
}

/** Lettere saltate per trovare w dentro t nello stesso ordine; -1 se non c'è */
function subsequenceGaps(w: string, t: string): number {
  let i = 0
  let start = -1
  let gaps = 0
  for (let j = 0; j < t.length && i < w.length; j++) {
    if (t[j] === w[i]) {
      if (start < 0) start = j
      i++
    } else if (start >= 0) gaps++
  }
  return i === w.length ? gaps : -1
}

/** Distanza di Damerau-Levenshtein: inserimenti, cancellazioni, sostituzioni e scambi */
function distance(a: string, b: string): number {
  const d: number[][] = Array.from({ length: a.length + 1 }, (_, i) =>
    Array.from({ length: b.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  )
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost)
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1])
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1)
    }
  return d[a.length][b.length]
}
