import type { Sheet } from '../project'
import { plainText } from './markup'
import { walkLayers } from './normalize'
import type { Template } from './template'

// Modifiche ai fogli dati. Tutte pure: restituiscono un nuovo foglio.

export function setCell(s: Sheet, row: number, col: number, value: string): Sheet {
  if (s.rows[row]?.[col] === value) return s
  const rows = s.rows.map((r, i) => {
    if (i !== row) return r
    const next = [...r]
    while (next.length < s.headers.length) next.push('')
    next[col] = value
    return next
  })
  return { ...s, rows }
}

/** Riga vuota inserita alla posizione indicata (in fondo se assente) */
export function insertRow(s: Sheet, at = s.rows.length, values?: string[]): Sheet {
  const row = s.headers.map((_, i) => values?.[i] ?? '')
  const rows = [...s.rows]
  rows.splice(at, 0, row)
  return { ...s, rows }
}

export function duplicateRows(s: Sheet, indexes: number[]): Sheet {
  const sorted = [...new Set(indexes)].sort((a, b) => a - b)
  const rows: string[][] = []
  s.rows.forEach((r, i) => {
    rows.push(r)
    if (sorted.includes(i)) rows.push([...r])
  })
  return { ...s, rows }
}

export function removeRows(s: Sheet, indexes: number[]): Sheet {
  const drop = new Set(indexes)
  return { ...s, rows: s.rows.filter((_, i) => !drop.has(i)) }
}

/** Sposta una riga: `to` è la posizione che avrà dopo lo spostamento */
export function moveRow(s: Sheet, from: number, to: number): Sheet {
  if (from === to || from < 0 || from >= s.rows.length) return s
  const rows = [...s.rows]
  const [row] = rows.splice(from, 1)
  rows.splice(Math.max(0, Math.min(rows.length, to)), 0, row)
  return { ...s, rows }
}

// ——— Ordinamento e filtro della vista: non cambiano il foglio ———

export interface RowView {
  /** Colonna su cui ordinare, null per l'ordine del foglio */
  sort: string | null
  desc: boolean
  /** Testo cercato, senza distinguere maiuscole e accenti */
  filter: string
  /** Colonna in cui cercare, null per tutte */
  filterColumn: string | null
}

export const NO_VIEW: RowView = { sort: null, desc: false, filter: '', filterColumn: null }

const fold = (s: string): string => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()

const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' })

/** Confronto di due celle: numeri come numeri, vuote in fondo, il resto in ordine alfabetico */
export function compareCells(a: string, b: string): number {
  const x = a.trim()
  const y = b.trim()
  if (!x || !y) return x ? -1 : y ? 1 : 0
  const nx = Number(x.replace(',', '.'))
  const ny = Number(y.replace(',', '.'))
  if (Number.isFinite(nx) && Number.isFinite(ny)) return nx - ny
  return collator.compare(plainText(x), plainText(y))
}

/** Righe da mostrare, come indici del foglio, nell'ordine della vista */
export function viewRows(s: Sheet, v: RowView): number[] {
  let rows = s.rows.map((_, i) => i)
  const q = fold(v.filter.trim())
  if (q) {
    const col = v.filterColumn === null ? -1 : s.headers.indexOf(v.filterColumn)
    const cols = col >= 0 ? [col] : s.headers.map((_, i) => i)
    rows = rows.filter((r) => cols.some((c) => fold(plainText(s.rows[r][c] ?? '')).includes(q)))
  }
  const col = v.sort === null ? -1 : s.headers.indexOf(v.sort)
  if (col >= 0) {
    const sign = v.desc ? -1 : 1
    // ordinamento stabile: a parità resta l'ordine del foglio; le celle vuote restano in fondo
    rows = [...rows].sort((a, b) => {
      const x = s.rows[a][col] ?? ''
      const y = s.rows[b][col] ?? ''
      const empty = Number(!x.trim()) - Number(!y.trim())
      return empty || sign * compareCells(x, y) || a - b
    })
  }
  return rows
}

/** Rende definitivo l'ordinamento della vista: le righe del foglio prendono quell'ordine */
export function applyOrder(s: Sheet, v: RowView): Sheet {
  const order = viewRows(s, { ...v, filter: '' })
  return { ...s, rows: order.map((i) => s.rows[i]) }
}

/** Nuova colonna; le colonne delle proprietà vanno subito dopo quella del loro livello */
export function addColumn(s: Sheet, header: string): Sheet {
  if (s.headers.includes(header)) return s
  let at = s.headers.length
  const dot = header.indexOf('.')
  if (dot > 0) {
    const base = header.slice(0, dot)
    const last = s.headers.reduce(
      (found, h, i) => (h === base || h.startsWith(base + '.') ? i : found),
      -1
    )
    if (last >= 0) at = last + 1
  }
  const headers = [...s.headers]
  headers.splice(at, 0, header)
  const rows = s.rows.map((r) => {
    const next = [...r]
    while (next.length < s.headers.length) next.push('')
    next.splice(at, 0, '')
    return next
  })
  return { ...s, headers, rows }
}

export function removeColumn(s: Sheet, col: number): Sheet {
  return {
    ...s,
    headers: s.headers.filter((_, i) => i !== col),
    rows: s.rows.map((r) => r.filter((_, i) => i !== col))
  }
}

export function renameColumn(s: Sheet, col: number, header: string): Sheet {
  if (s.headers.includes(header)) return s
  return { ...s, headers: s.headers.map((h, i) => (i === col ? header : h)) }
}

/**
 * Colonne che il template legge: amount, poi una per ogni testo, immagine o valore che prende il
 * valore da una colonna (con il nome del livello o quello indicato). Per un set nuovo sono le
 * intestazioni.
 */
export function templateColumns(t: Template): string[] {
  const cols = ['amount']
  for (const l of walkLayers([...t.front, ...t.back])) {
    if (l.source.kind !== 'column') continue
    // forme e gruppi (riempimento, visibilità) di solito sono decorazione: si aggiungono a mano
    if (l.type === 'group' || l.type === 'shape') continue
    const col = l.source.column ?? l.name
    if (!cols.includes(col)) cols.push(col)
  }
  return cols
}

/** Proprietà che si possono aggiungere come colonne per un livello: `nome.color`, ... */
export function propertyColumns(t: Template, layerName: string): string[] {
  const l = walkLayers([...t.front, ...t.back]).find((x) => x.name === layerName)
  if (!l) return []
  const skip = new Set(['id', 'name', 'type', 'children', 'source', 'exposed', 'locked'])
  return Object.keys(l)
    .filter((k) => !skip.has(k))
    .map((k) => `${layerName}.${k}`)
}

/** Un foglio nuovo per un set */
export function newSheet(name: string, t: Template | null): Sheet {
  return { name, headers: t ? templateColumns(t) : ['amount', 'name'], rows: [] }
}

/** Nome di un set o di un foglio: niente caratteri che Excel non accetta nei fogli */
export const isValidSheetName = (n: string): boolean =>
  n.trim() === n && n.length > 0 && n.length <= 31 && !/[\\/?*[\]:]/.test(n)

/** Proprietà che contengono un colore, per tipo di livello */
const COLOR_PROPERTIES: Record<string, string[]> = {
  text: ['color'],
  image: ['tint'],
  shape: ['fill']
}

/**
 * Colonne che contengono un colore, con il colore del template come valore di partenza:
 * `nome.color`, `icona.tint`, `banda.fill` e il valore principale delle forme (il riempimento).
 */
export function colorColumns(t: Template): Map<string, string | null> {
  const out = new Map<string, string | null>()
  for (const l of walkLayers([...t.front, ...t.back])) {
    const props = COLOR_PROPERTIES[l.type] ?? []
    const column = l.source.kind === 'column' && l.source.column ? l.source.column : l.name
    const values = l as unknown as Record<string, string | null>
    for (const p of props) out.set(`${column}.${p}`, values[p] ?? null)
    if (l.type === 'shape' && l.source.kind === 'column') out.set(column, l.fill)
  }
  return out
}
