// Ordine delle voci nella barra laterale (template, stili, variabili). Senza un ordine salvato
// le voci sono in ordine alfabetico; trascinandole si salva l'ordine scelto, e le voci che non
// ci sono ancora (per esempio una variabile nuova) vanno in fondo, in ordine alfabetico.

export type OrderKind = 'templates' | 'styles' | 'variables'

/** Ordine scelto a mano per ogni elenco; assente vuol dire alfabetico */
export type ListOrder = Partial<Record<OrderKind, string[]>>

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
  if (!list?.includes(from)) return order
  return { ...order, [kind]: list.map((n) => (n === from ? to : n)) }
}
