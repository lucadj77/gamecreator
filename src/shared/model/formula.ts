// Formule dei livelli, in due forme.
// - Composizione: {campo} prende il valore della riga; se il risultato è un'espressione
//   aritmetica (numeri, + - * / e parentesi) si calcola, altrimenti resta testo.
//   Esempi: "{forza}+2" → "5", "{nome}.png" → "Drago.png".
// - Espressione, se inizia con "=" come in Excel: =IF({forza}>3; "Forte"; "Debole").
//   Vedi docs/specifica.md, "Formule".

export interface FormulaResult {
  value: string
  /** Campi citati che la riga non ha */
  missing: string[]
  /** Errore di sintassi o di calcolo, solo per le espressioni */
  error?: string
}

export function evaluateFormula(expr: string, fields: Record<string, string>): FormulaResult {
  if (expr.trimStart().startsWith('=')) return evaluateExpression(expr.trimStart().slice(1), fields)
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

// --- espressioni ---

type Value = number | string | boolean

type Token =
  | { t: 'num'; v: number }
  | { t: 'str'; v: string }
  | { t: 'field'; v: string }
  | { t: 'id'; v: string }
  | { t: 'op'; v: string }

class FormulaError extends Error {}

function tokenize(src: string): Token[] {
  const out: Token[] = []
  let i = 0
  while (i < src.length) {
    const c = src[i]
    if (/\s/.test(c)) {
      i++
    } else if (c === '{') {
      const end = src.indexOf('}', i)
      if (end < 0) throw new FormulaError('missing }')
      out.push({ t: 'field', v: src.slice(i + 1, end).trim() })
      i = end + 1
    } else if (c === '"') {
      // "" dentro una stringa è una virgoletta, come in Excel
      let v = ''
      i++
      for (;;) {
        if (i >= src.length) throw new FormulaError('missing "')
        if (src[i] === '"') {
          if (src[i + 1] === '"') {
            v += '"'
            i += 2
            continue
          }
          i++
          break
        }
        v += src[i++]
      }
      out.push({ t: 'str', v })
    } else if (/\d/.test(c) || (c === '.' && /\d/.test(src[i + 1] ?? ''))) {
      const m = /^\d*\.?\d+|^\d+/.exec(src.slice(i))!
      out.push({ t: 'num', v: Number(m[0]) })
      i += m[0].length
    } else if (/[A-Za-z_]/.test(c)) {
      const m = /^[A-Za-z_][A-Za-z0-9_]*/.exec(src.slice(i))!
      out.push({ t: 'id', v: m[0].toUpperCase() })
      i += m[0].length
    } else {
      const two = src.slice(i, i + 2)
      if (['<=', '>=', '<>', '!='].includes(two)) {
        out.push({ t: 'op', v: two === '!=' ? '<>' : two })
        i += 2
      } else if ('+-*/&=<>();,'.includes(c)) {
        out.push({ t: 'op', v: c })
        i++
      } else throw new FormulaError(`unexpected "${c}"`)
    }
  }
  return out
}

function toNumber(v: Value): number {
  if (typeof v === 'number') return v
  if (typeof v === 'boolean') return v ? 1 : 0
  const n = Number(v.trim().replace(',', '.'))
  if (v.trim() === '') return 0
  if (!Number.isFinite(n)) throw new FormulaError(`"${v}" is not a number`)
  return n
}

function toText(v: Value): string {
  if (typeof v === 'number') return formatNumber(v)
  if (typeof v === 'boolean') return v ? 'true' : 'false'
  return v
}

function toBool(v: Value): boolean {
  if (typeof v === 'boolean') return v
  if (typeof v === 'number') return v !== 0
  const s = v.trim().toLowerCase()
  return s !== '' && s !== '0' && s !== 'false' && s !== 'no'
}

/** Un valore di un campo è un numero se lo sembra, altrimenti testo */
function fieldValue(raw: string): Value {
  const n = Number(raw.trim().replace(',', '.'))
  return raw.trim() !== '' && Number.isFinite(n) ? n : raw
}

function compare(a: Value, b: Value): number {
  const na =
    typeof a === 'number' ||
    (typeof a === 'string' && Number.isFinite(Number(a.replace(',', '.'))) && a.trim() !== '')
  const nb =
    typeof b === 'number' ||
    (typeof b === 'string' && Number.isFinite(Number(b.replace(',', '.'))) && b.trim() !== '')
  if (na && nb) return toNumber(a) - toNumber(b)
  // il testo si confronta senza badare alle maiuscole, come in Excel
  return toText(a).localeCompare(toText(b), undefined, { sensitivity: 'base' })
}

type Fn = (args: (() => Value)[]) => Value

/** Funzioni disponibili; gli argomenti si valutano solo se servono (IF non calcola il ramo scartato) */
const FUNCTIONS: Record<string, Fn> = {
  IF: (a) => {
    if (a.length < 2 || a.length > 3) throw new FormulaError('IF needs 2 or 3 arguments')
    return toBool(a[0]()) ? a[1]() : a.length > 2 ? a[2]() : ''
  },
  AND: (a) => a.every((x) => toBool(x())),
  OR: (a) => a.some((x) => toBool(x())),
  NOT: (a) => !toBool(a[0]?.() ?? false),
  MIN: (a) => Math.min(...a.map((x) => toNumber(x()))),
  MAX: (a) => Math.max(...a.map((x) => toNumber(x()))),
  ABS: (a) => Math.abs(toNumber(a[0]())),
  ROUND: (a) => {
    const f = 10 ** (a[1] ? toNumber(a[1]()) : 0)
    return Math.round(toNumber(a[0]()) * f) / f
  },
  FLOOR: (a) => Math.floor(toNumber(a[0]())),
  CEILING: (a) => Math.ceil(toNumber(a[0]())),
  UPPER: (a) => toText(a[0]()).toUpperCase(),
  LOWER: (a) => toText(a[0]()).toLowerCase(),
  LEN: (a) => toText(a[0]()).length,
  CONCAT: (a) => a.map((x) => toText(x())).join(''),
  ISBLANK: (a) => toText(a[0]()).trim() === '',
  /** Quante volte compare un testo: COUNTIN({risorse}; "legno") */
  COUNTIN: (a) => {
    const text = toText(a[0]()).toLowerCase()
    const part = toText(a[1]?.() ?? '').toLowerCase()
    return part ? text.split(part).length - 1 : 0
  }
}

export const FORMULA_FUNCTIONS = Object.keys(FUNCTIONS)

function evaluateExpression(src: string, fields: Record<string, string>): FormulaResult {
  const missing: string[] = []
  try {
    const tokens = tokenize(src)
    let i = 0
    const peek = (): Token | undefined => tokens[i]
    const isOp = (v: string): boolean => peek()?.t === 'op' && peek()!.v === v
    const expect = (v: string): void => {
      if (!isOp(v)) throw new FormulaError(`expected "${v}"`)
      i++
    }

    // ogni regola restituisce una funzione: così IF valuta solo il ramo scelto
    const comparison = (): (() => Value) => {
      const left = concat()
      const t = peek()
      if (t?.t === 'op' && ['=', '<>', '<', '>', '<=', '>='].includes(t.v)) {
        i++
        const right = concat()
        return () => {
          const c = compare(left(), right())
          return {
            '=': c === 0,
            '<>': c !== 0,
            '<': c < 0,
            '>': c > 0,
            '<=': c <= 0,
            '>=': c >= 0
          }[t.v]!
        }
      }
      return left
    }
    const concat = (): (() => Value) => {
      let left = additive()
      while (isOp('&')) {
        i++
        const l = left
        const r = additive()
        left = () => toText(l()) + toText(r())
      }
      return left
    }
    const additive = (): (() => Value) => {
      let left = term()
      while (isOp('+') || isOp('-')) {
        const op = tokens[i++].v
        const l = left
        const r = term()
        left = () => (op === '+' ? toNumber(l()) + toNumber(r()) : toNumber(l()) - toNumber(r()))
      }
      return left
    }
    const term = (): (() => Value) => {
      let left = unary()
      while (isOp('*') || isOp('/')) {
        const op = tokens[i++].v
        const l = left
        const r = unary()
        left = () => {
          if (op === '*') return toNumber(l()) * toNumber(r())
          const d = toNumber(r())
          if (d === 0) throw new FormulaError('division by zero')
          return toNumber(l()) / d
        }
      }
      return left
    }
    const unary = (): (() => Value) => {
      if (isOp('-')) {
        i++
        const v = unary()
        return () => -toNumber(v())
      }
      if (isOp('+')) {
        i++
        return unary()
      }
      return primary()
    }
    const primary = (): (() => Value) => {
      const t = tokens[i++]
      if (!t) throw new FormulaError('unexpected end')
      if (t.t === 'num') return () => t.v
      if (t.t === 'str') return () => t.v
      if (t.t === 'field') {
        if (!Object.prototype.hasOwnProperty.call(fields, t.v)) missing.push(t.v)
        return () => fieldValue(fields[t.v] ?? '')
      }
      if (t.t === 'id') {
        if (t.v === 'TRUE') return () => true
        if (t.v === 'FALSE') return () => false
        const fn = FUNCTIONS[t.v]
        if (!fn) throw new FormulaError(`unknown function ${t.v}`)
        expect('(')
        const args: (() => Value)[] = []
        if (!isOp(')')) {
          args.push(comparison())
          // ; come in Excel in italiano, oppure ,
          while (isOp(';') || isOp(',')) {
            i++
            args.push(comparison())
          }
        }
        expect(')')
        return () => fn(args)
      }
      if (t.v === '(') {
        const v = comparison()
        expect(')')
        return v
      }
      throw new FormulaError(`unexpected "${t.v}"`)
    }

    const root = comparison()
    if (i < tokens.length) throw new FormulaError(`unexpected "${tokens[i].v}"`)
    return { value: toText(root()), missing }
  } catch (e) {
    if (e instanceof FormulaError) return { value: '', missing, error: e.message }
    throw e
  }
}
