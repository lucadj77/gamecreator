// Formule dei livelli: {campo} prende il valore della riga; se il risultato è un'espressione
// aritmetica (numeri, + - * / e parentesi) si calcola, altrimenti resta testo.
// Esempi: "{forza}+2" → "5", "{nome}.png" → "Drago.png".

export interface FormulaResult {
  value: string
  /** Campi citati che la riga non ha */
  missing: string[]
}

export function evaluateFormula(expr: string, fields: Record<string, string>): FormulaResult {
  const missing: string[] = []
  const text = expr.replace(/(?<!\\)\{([^{}*]+)\}/g, (_, raw: string) => {
    const name = raw.trim()
    if (Object.prototype.hasOwnProperty.call(fields, name)) return fields[name]
    missing.push(name)
    return ''
  })
  // si calcola solo se l'operatore è scritto nella formula: una data come 2026-10-18 in un
  // campo non deve diventare una sottrazione
  const hasOperator = /[-+*/]/.test(expr.replace(/\{[^{}]*\}/g, ''))
  const n = hasOperator ? arithmetic(text) : null
  return { value: n === null ? text : formatNumber(n), missing }
}

function formatNumber(n: number): string {
  return String(Math.round(n * 1e6) / 1e6)
}

/** Calcola un'espressione con + - * / e parentesi; null se non è un'espressione numerica */
export function arithmetic(src: string): number | null {
  const s = src.trim()
  // serve almeno un operatore o una cifra, e nient'altro che numeri e operatori
  if (!s || !/^[\d\s+\-*/().,]+$/.test(s) || !/\d/.test(s)) return null
  const tokens = s.match(/\d+(?:[.,]\d+)?|[-+*/()]/g) ?? []
  let i = 0
  const peek = (): string | undefined => tokens[i]
  const expr = (): number => {
    let v = term()
    while (peek() === '+' || peek() === '-') v = tokens[i++] === '+' ? v + term() : v - term()
    return v
  }
  const term = (): number => {
    let v = factor()
    while (peek() === '*' || peek() === '/') v = tokens[i++] === '*' ? v * factor() : v / factor()
    return v
  }
  const factor = (): number => {
    const t = tokens[i++]
    if (t === '-') return -factor()
    if (t === '+') return factor()
    if (t === '(') {
      const v = expr()
      if (tokens[i++] !== ')') throw new Error('parenthesis')
      return v
    }
    const n = Number(t?.replace(',', '.'))
    if (t === undefined || !Number.isFinite(n)) throw new Error('number')
    return n
  }
  try {
    const v = expr()
    return i === tokens.length && Number.isFinite(v) ? v : null
  } catch {
    return null
  }
}
