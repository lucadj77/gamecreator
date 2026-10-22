// Dove scrivere le carte di un set nel suo foglio. In lettura le righe vuote in mezzo ai dati
// si saltano: in scrittura le carte tornano nelle righe che avevano dati, nello stesso ordine,
// così le righe vuote restano dove sono e le carte non scivolano verso l'alto rispetto alle
// colonne che Naibi non usa e alle formule che puntano a quelle righe.

export interface RowPlacement {
  /** Riga di ogni carta, nell'ordine del set */
  at: number[]
  /** Righe che avevano dati e non ricevono più una carta: vanno svuotate */
  clear: number[]
}

/**
 * `used` sono le righe che avevano dati, in ordine; `header` è la riga delle intestazioni. Le carte
 * in più vanno subito dopo l'ultima riga con dati.
 */
export function placeRows(used: number[], count: number, header: number): RowPlacement {
  const last = used.length ? used[used.length - 1] : header
  const at = Array.from({ length: count }, (_, k) =>
    k < used.length ? used[k] : last + 1 + k - used.length
  )
  return { at, clear: used.slice(count) }
}
