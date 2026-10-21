// Ordine delle voci nella barra laterale (template, stili, variabili). Senza un ordine salvato
// le voci sono in ordine alfabetico; trascinandole si salva l'ordine scelto, e le voci che non
// ci sono ancora (per esempio una variabile nuova) vanno in fondo, in ordine alfabetico.

export type OrderKind = 'templates' | 'styles' | 'variables'

/** Elenchi che si possono dividere in gruppi */
export type GroupKind = 'styles' | 'variables'

/** Ordine scelto a mano per ogni elenco; assente vuol dire alfabetico */
export interface ListOrder extends Partial<Record<OrderKind, string[]>> {
  /** Gruppo di ogni stile e variabile, per nome; una voce assente non ha gruppo */
  groups?: Partial<Record<GroupKind, Record<string, string>>>
}

export const alphabetical = (a: string, b: string): number =>
  a.localeCompare(b, undefined, { sensitivity: 'base', numeric: true })

/** I nomi nell'ordine salvato; quelli che mancano dall'ordine vanno in fondo, alfabetici */
export function orderNames(names: string[], order?: string[]): string[] {
  const rest = [...names].sort(alphabetical)
  if (!order?.length) return rest
  const present = new Set(names)
  const first = order.filter((n, i) => present.has(n) && order.indexOf(n) === i)
  const placed = new Set(first)
  return [...first, ...rest.filter((n) => !placed.has(n))]
}

/** Sposta la voce `from` alla posizione `to` (posizione che avrà dopo lo spostamento) */
export function moveItem<T>(list: T[], from: number, to: number): T[] {
  if (from === to || from < 0 || from >= list.length) return list
  const out = [...list]
  const [x] = out.splice(from, 1)
  out.splice(Math.max(0, Math.min(out.length, to)), 0, x)
  return out
}

/** Vero se l'elenco è già in ordine alfabetico */
export const isAlphabetical = (names: string[]): boolean =>
  names.every((n, i) => i === 0 || alphabetical(names[i - 1], n) <= 0)

/** Rinomina una voce dell'ordine salvato, se c'è */
export function renameInOrder(
  order: ListOrder | undefined,
  kind: OrderKind,
  from: string,
  to: string
): ListOrder | undefined {
  const list = order?.[kind]
  let out = order
  if (list?.includes(from)) out = { ...out, [kind]: list.map((n) => (n === from ? to : n)) }
  // il gruppo segue la voce rinominata
  if (kind !== 'templates') {
    const group = order?.groups?.[kind]?.[from]
    if (group) out = setGroup(setGroup(out, kind, from, ''), kind, to, group)
  }
  return out
}

/** Gruppo di una voce; '' se non ne ha */
export function groupOf(order: ListOrder | undefined, kind: GroupKind, name: string): string {
  return order?.groups?.[kind]?.[name] ?? ''
}

/** Mette una voce in un gruppo, o la toglie con '' */
export function setGroup(
  order: ListOrder | undefined,
  kind: GroupKind,
  name: string,
  group: string
): ListOrder | undefined {
  const g = group.trim()
  const map = { ...order?.groups?.[kind] }
  if (g) map[name] = g
  else delete map[name]
  const groups = { ...order?.groups, [kind]: map }
  if (!Object.keys(map).length) delete groups[kind]
  const out: ListOrder = { ...order, groups }
  if (!Object.keys(groups).length) delete out.groups
  return Object.keys(out).length ? out : undefined
}

/** Nomi dei gruppi usati dalle voci che esistono, in ordine alfabetico */
export function groupNames(
  order: ListOrder | undefined,
  kind: GroupKind,
  names: string[]
): string[] {
  const map = order?.groups?.[kind] ?? {}
  return [...new Set(names.flatMap((n) => (map[n] ? [map[n]] : [])))].sort(alphabetical)
}

/**
 * L'elenco diviso in gruppi: prima le voci senza gruppo, poi i gruppi in ordine alfabetico.
 * Dentro ogni gruppo le voci restano nell'ordine dell'elenco; `index` è la posizione nell'elenco.
 */
export function groupList(
  names: string[],
  order: ListOrder | undefined,
  kind: GroupKind
): { group: string; items: { name: string; index: number }[] }[] {
  const map = order?.groups?.[kind] ?? {}
  const out = ['', ...groupNames(order, kind, names)].map((group) => ({
    group,
    items: names.flatMap((name, index) => ((map[name] ?? '') === group ? [{ name, index }] : []))
  }))
  return out.filter((g) => g.group || g.items.length)
}
