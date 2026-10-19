import type { Sheet } from '../project'
import { evaluateFormula } from './formula'

// Generatore di carte: da alcuni insiemi di valori crea le righe di un set con tutte le
// combinazioni. Ogni colonna sceglie `pick` valori dal suo insieme (con o senza ripetizioni,
// con o senza ordine) e li scrive uniti nella stessa cella; le colonne si combinano tra loro
// in tutti i modi possibili. Vedi docs/specifica.md, sezione 8.3.

export interface GeneratorColumn {
  /** Intestazione della colonna del foglio */
  column: string
  values: string[]
  /** Quanti valori dell'insieme vanno nella stessa cella */
  pick: number
  /** Lo stesso valore può comparire più volte nella cella */
  repeat: boolean
  /** L'ordine conta: A B e B A sono carte diverse */
  ordered: boolean
  /** Ogni valore si scrive come {valore}, cioè come icona o variabile */
  icons: boolean
  /** Tra un valore e l'altro nella stessa cella */
  separator: string
  /** Quante volte può comparire ogni valore nella cella; senza limite: da 0 a pick (o 1) */
  limits?: Record<string, ValueLimit>
}

export interface ValueLimit {
  min?: number
  max?: number
}

export interface GeneratorSpec {
  columns: GeneratorColumn[]
  /** Formula: la carta resta se il risultato è vero (vuoto = tutte) */
  filter: string
  /** Copie di ogni carta (colonna amount) */
  copies: number
}

/** Oltre questo numero di carte il generatore si ferma */
export const MAX_GENERATED = 5000

export function emptyColumn(column = ''): GeneratorColumn {
  return { column, values: [], pick: 1, repeat: false, ordered: false, icons: true, separator: '' }
}

/** Scelte di `k` valori: combinazioni o disposizioni, con o senza ripetizioni e limiti */
export function choices(
  values: string[],
  k: number,
  repeat: boolean,
  ordered: boolean,
  limits: Record<string, ValueLimit> = {}
): string[][] {
  const out: string[][] = []
  if (k <= 0) return [[]]
  const max = values.map((v) => {
    const m = limits[v]?.max ?? k
    return Math.max(0, repeat ? m : Math.min(1, m))
  })
  const min = values.map((v) => Math.max(0, limits[v]?.min ?? 0))
  const count = values.map(() => 0)
  // quante presenze obbligatorie mancano ancora: se superano i posti liberi si torna indietro
  const needed = (): number => min.reduce((n, m, i) => n + Math.max(0, m - count[i]), 0)
  const walk = (from: number, acc: string[]): void => {
    if (out.length > MAX_GENERATED) return
    if (needed() > k - acc.length) return
    if (acc.length === k) {
      out.push(acc)
      return
    }
    for (let i = ordered ? 0 : from; i < values.length; i++) {
      if (count[i] >= max[i]) continue
      count[i]++
      walk(i, [...acc, values[i]])
      count[i]--
    }
  }
  walk(0, [])
  return out
}

const hasLimits = (limits?: Record<string, ValueLimit>): boolean =>
  !!limits && Object.values(limits).some((l) => l.min !== undefined || l.max !== undefined)

/** Quante scelte ci sono; con i limiti si contano elencandole */
export function countChoices(
  n: number,
  k: number,
  repeat: boolean,
  ordered: boolean,
  values?: string[],
  limits?: Record<string, ValueLimit>
): number {
  if (values && hasLimits(limits)) return choices(values, k, repeat, ordered, limits).length
  if (k <= 0) return 1
  if (!repeat && k > n) return 0
  if (ordered) {
    if (repeat) return n ** k
    let p = 1
    for (let i = 0; i < k; i++) p *= n - i
    return p
  }
  // combinazioni: C(n, k), con ripetizioni C(n + k - 1, k)
  const top = repeat ? n + k - 1 : n
  let c = 1
  for (let i = 1; i <= k; i++) c = (c * (top - k + i)) / i
  return Math.round(c)
}

/**
 * Valori distinti di un elenco scritto a mano: uno per riga o separati da virgole. "1-5" o
 * "1..5" sono tutti i numeri dell'intervallo.
 */
export function parseValues(text: string): string[] {
  const out: string[] = []
  for (const raw of text.split(/[\n,;]/)) {
    const v = raw.trim()
    const range = v.match(/^(-?\d+)\s*(?:-|\.\.)\s*(-?\d+)$/)
    if (range) {
      const [a, b] = [Number(range[1]), Number(range[2])]
      const step = a <= b ? 1 : -1
      for (let n = a; out.length < MAX_GENERATED; n += step) {
        out.push(String(n))
        if (n === b) break
      }
    } else if (v) out.push(v)
  }
  return [...new Set(out)]
}

/** I numeri restano numeri anche con "come icona": {3} non è un'icona */
const cell = (c: GeneratorColumn, pick: string[]): string =>
  pick
    .map((v) => (c.icons && !/^\{.*\}$/.test(v) && !/^-?\d+([.,]\d+)?$/.test(v) ? `{${v}}` : v))
    .join(c.separator)

export interface GeneratedCards {
  headers: string[]
  rows: string[][]
  /** Carte prima del filtro */
  total: number
  /** Il risultato supera MAX_GENERATED: le righe sono troncate */
  truncated: boolean
  /** Errore della formula del filtro, se c'è */
  filterError?: string
}

/**
 * Righe del generatore. Nel filtro ogni colonna vale il testo della sua cella; in più
 * {colonna_1}, {colonna_2}... sono i singoli valori scelti, senza graffe.
 */
export function generateCards(spec: GeneratorSpec): GeneratedCards {
  const cols = spec.columns.filter((c) => c.column.trim() && c.values.length)
  const total = cols.reduce(
    (n, c) => n * countChoices(c.values.length, c.pick, c.repeat, c.ordered, c.values, c.limits),
    cols.length ? 1 : 0
  )
  // più insiemi sulla stessa colonna finiscono nella stessa cella, separati da uno spazio
  const names = [...new Set(cols.map((c) => c.column.trim()))]
  const headers = [...names, 'amount']
  const rows: string[][] = []
  let filterError: string | undefined
  const lists = cols.map((c) => choices(c.values, c.pick, c.repeat, c.ordered, c.limits))
  const filter = spec.filter.trim()
  const walk = (i: number, picked: string[][]): boolean => {
    if (rows.length >= MAX_GENERATED) return false
    if (i === cols.length) {
      const cells = cols.map((c, j) => cell(c, picked[j]))
      const values = names.map((name) =>
        cells.filter((_, j) => cols[j].column.trim() === name).join(' ')
      )
      if (filter) {
        const fields: Record<string, string> = {}
        names.forEach((name, j) => (fields[name] = values[j]))
        cols.forEach((c, j) =>
          picked[j].forEach((v, n) => (fields[`${c.column.trim()}_${n + 1}`] ??= v))
        )
        const r = evaluateFormula(filter.startsWith('=') ? filter : `=${filter}`, fields)
        if (r.error) {
          filterError ??= r.error
          return true
        }
        if (!truthy(r.value)) return true
      }
      rows.push([...values, String(Math.max(1, Math.round(spec.copies) || 1))])
      return true
    }
    for (const p of lists[i]) if (!walk(i + 1, [...picked, p])) return false
    return true
  }
  if (cols.length) walk(0, [])
  return {
    headers,
    rows,
    total,
    truncated: rows.length >= MAX_GENERATED && total > MAX_GENERATED,
    ...(filterError ? { filterError } : {})
  }
}

function truthy(v: string): boolean {
  const s = v.trim().toLowerCase()
  return s !== '' && s !== '0' && s !== 'false' && s !== 'no'
}

/** Come entrano le carte generate nel set */
export type GenerateMode = 'append' | 'replace' | 'update'

/**
 * Carte generate nel foglio del set: le colonne che mancano si aggiungono in fondo, le altre
 * colonne delle righe nuove restano vuote. "replace" toglie prima le righe esistenti; "update"
 * scrive le colonne generate nelle righe già presenti, una carta generata per riga nell'ordine
 * del foglio, senza toccare le altre colonne né amount. Le carte generate in più si aggiungono
 * in fondo.
 */
export function addGenerated(s: Sheet, gen: GeneratedCards, mode: GenerateMode): Sheet {
  const headers = [...s.headers]
  for (const h of gen.headers) if (!headers.includes(h)) headers.push(h)
  const widen = (r: string[]): string[] =>
    r.length < headers.length ? [...r, ...Array(headers.length - r.length).fill('')] : r
  const index = gen.headers.map((h) => headers.indexOf(h))
  const rows = gen.rows.map((r) => {
    const out = Array<string>(headers.length).fill('')
    r.forEach((v, i) => (out[index[i]] = v))
    return out
  })
  if (mode === 'update') {
    const updated = s.rows.map((r, i) => {
      const g = gen.rows[i]
      if (!g) return widen(r)
      const out = [...widen(r)]
      g.forEach((v, j) => gen.headers[j] !== 'amount' && (out[index[j]] = v))
      return out
    })
    return { ...s, headers, rows: [...updated, ...rows.slice(s.rows.length)] }
  }
  return { ...s, headers, rows: [...(mode === 'replace' ? [] : s.rows.map(widen)), ...rows] }
}
