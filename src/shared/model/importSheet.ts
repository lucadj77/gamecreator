import type { Sheet } from '../project'

// Importare in un set un foglio preso da un altro file: anteprima di cosa cambia, poi le righe
// nuove al posto di quelle del set. Le righe si riconoscono da una colonna chiave (la prima con
// valori diversi in ogni riga in tutti e due i fogli, per esempio il nome), altrimenti per posizione.

export interface ImportPreview {
  /** Colonna che riconosce le righe; null: per posizione */
  key: string | null
  /** Etichette (valore della chiave, o numero di riga) delle righe nuove, tolte e cambiate */
  added: string[]
  removed: string[]
  changed: string[]
  unchanged: number
  /** Colonne che arrivano dal file e che il set non aveva, e quelle del set che il file non ha */
  newColumns: string[]
  lostColumns: string[]
}

/** Valori pieni e tutti diversi, non tutti numeri (un numero come 2 si ripete per caso) */
const uniqueValues = (s: Sheet, col: number): boolean => {
  const seen = new Set<string>()
  for (const r of s.rows) {
    const v = (r[col] ?? '').trim()
    if (!v || seen.has(v)) return false
    seen.add(v)
  }
  return [...seen].some((v) => !Number.isFinite(Number(v)))
}

/** La colonna chiave: comune ai due fogli, con valori pieni e tutti diversi in entrambi */
export function importKey(old: Sheet, next: Sheet): string | null {
  for (const h of next.headers) {
    if (h === 'amount') continue
    const i = old.headers.indexOf(h)
    if (i >= 0 && uniqueValues(old, i) && uniqueValues(next, next.headers.indexOf(h))) return h
  }
  return null
}

/** Righe dei due fogli accoppiate: per chiave o per posizione; null dove manca */
function pairs(old: Sheet, next: Sheet, key: string | null): [number | null, number | null][] {
  if (!key) {
    const n = Math.max(old.rows.length, next.rows.length)
    return Array.from({ length: n }, (_, i) => [
      i < old.rows.length ? i : null,
      i < next.rows.length ? i : null
    ])
  }
  const ok = old.headers.indexOf(key)
  const nk = next.headers.indexOf(key)
  const byKey = new Map(old.rows.map((r, i) => [r[ok].trim(), i]))
  const out: [number | null, number | null][] = next.rows.map((r, i) => {
    const o = byKey.get(r[nk].trim())
    byKey.delete(r[nk].trim())
    return [o ?? null, i]
  })
  for (const o of byKey.values()) out.push([o, null])
  return out
}

export function previewImport(old: Sheet, next: Sheet): ImportPreview {
  const key = importKey(old, next)
  const label = (s: Sheet, i: number): string =>
    key ? s.rows[i][s.headers.indexOf(key)].trim() : String(i + 1)
  const columns = [...new Set([...old.headers, ...next.headers])]
  const cell = (s: Sheet, i: number, h: string): string => {
    const c = s.headers.indexOf(h)
    return c < 0 ? '' : (s.rows[i][c] ?? '')
  }
  const out: ImportPreview = {
    key,
    added: [],
    removed: [],
    changed: [],
    unchanged: 0,
    newColumns: next.headers.filter((h) => !old.headers.includes(h)),
    lostColumns: old.headers.filter((h) => !next.headers.includes(h))
  }
  for (const [o, n] of pairs(old, next, key)) {
    if (o === null) out.added.push(label(next, n!))
    else if (n === null) out.removed.push(label(old, o))
    // le colonne che il file non ha non contano: si possono tenere
    else if (columns.some((h) => next.headers.includes(h) && cell(old, o, h) !== cell(next, n, h)))
      out.changed.push(label(next, n))
    else out.unchanged++
  }
  return out
}

/**
 * Il foglio del set dopo l'importazione: le righe del file, nell'ordine del file. Con
 * `keepColumns` le colonne che il file non ha restano, con i valori della riga corrispondente.
 */
export function applyImport(old: Sheet, next: Sheet, keepColumns: boolean): Sheet {
  const lost = old.headers.filter((h) => !next.headers.includes(h))
  if (!keepColumns || !lost.length) return { ...old, headers: next.headers, rows: next.rows }
  const key = importKey(old, next)
  const match = new Map<number, number>()
  for (const [o, n] of pairs(old, next, key)) if (o !== null && n !== null) match.set(n, o)
  const idx = lost.map((h) => old.headers.indexOf(h))
  return {
    ...old,
    headers: [...next.headers, ...lost],
    rows: next.rows.map((r, n) => {
      const o = match.get(n)
      return [...r, ...idx.map((c) => (o === undefined ? '' : (old.rows[o][c] ?? '')))]
    })
  }
}
