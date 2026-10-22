// Analisi del file dati (Controlla file dati): com'è fatto ogni foglio, letto dal file così com'è
// (vedi main/project/inspect.ts), e cosa ne fanno i set del progetto (model/dataCheck.ts)

/** Un foglio del file dati com'è scritto; righe e colonne come in Excel (1 = prima riga, A) */
export interface SheetInspection {
  name: string
  /** Riga delle intestazioni: la prima con dati; 0 se il foglio è vuoto */
  headerRow: number
  headers: string[]
  /** Righe con dati sotto le intestazioni */
  dataRows: number
  /** La prima riga ha una sola cella piena e la seguente di più: probabilmente è un titolo */
  titleAbove: boolean
  /** Righe vuote tra le intestazioni e l'ultima riga con dati */
  emptyRows: number[]
  duplicateHeaders: string[]
  /** Colonne con dati ma senza intestazione: Naibi le ignora */
  unnamedColumns: string[]
  /** Celle unite (solo .xlsx), come A1:C1 */
  merged: string[]
  /** Celle con un errore (solo .xlsx), come "D4 #DIV/0!" */
  errors: string[]
  /** Celle con una formula senza risultato salvato (solo .xlsx): Naibi le legge vuote */
  noResult: string[]
}

/** Lettera della colonna: 1 → A, 27 → AA */
export function columnLetter(n: number): string {
  let s = ''
  for (; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s
  return s
}

/** Righe non vuote del foglio, con il loro numero: da qui le analisi comuni a tutti i formati */
export function inspectTable(
  name: string,
  rows: { n: number; cells: string[] }[]
): Omit<SheetInspection, 'merged' | 'errors' | 'noResult'> {
  const full = rows.filter((r) => r.cells.some((c) => c.trim() !== ''))
  const [head, ...body] = full
  if (!head)
    return {
      name,
      headerRow: 0,
      headers: [],
      dataRows: 0,
      titleAbove: false,
      emptyRows: [],
      duplicateHeaders: [],
      unnamedColumns: []
    }
  // valori diversi: un titolo in celle unite si legge ripetuto in ognuna
  const filled = (cells: string[]): number =>
    new Set(cells.map((c) => c.trim()).filter(Boolean)).size
  const headers = head.cells.map((c) => c.trim())
  const seen = new Set<string>()
  const duplicateHeaders = new Set<string>()
  for (const h of headers.filter(Boolean)) (seen.has(h) ? duplicateHeaders : seen).add(h)
  const unnamed = new Set<number>()
  for (const r of body)
    r.cells.forEach((c, i) => {
      if (c.trim() !== '' && !headers[i]) unnamed.add(i)
    })
  const present = new Set(body.map((r) => r.n))
  const last = body.length ? body[body.length - 1].n : head.n
  const emptyRows: number[] = []
  for (let n = head.n + 1; n < last; n++) if (!present.has(n)) emptyRows.push(n)
  return {
    name,
    headerRow: head.n,
    headers,
    dataRows: body.length,
    titleAbove: filled(head.cells) === 1 && !!body[0] && filled(body[0].cells) > 1,
    emptyRows,
    duplicateHeaders: [...duplicateHeaders],
    unnamedColumns: [...unnamed].sort((a, b) => a - b).map((i) => columnLetter(i + 1))
  }
}
