import { msg, type Message } from '../messages'
import { evaluateFormula } from './formula'
import { PRIMARY_PROPERTY, type Layer, type Shadow, type Stroke, type Template } from './template'

// Applica una riga del foglio a un template: vedi docs/formato.md, "Fogli dati".

export interface CardData {
  /** Valori della riga per intestazione */
  fields: Record<string, string>
  amount: number
}

export interface BoundCard {
  template: Template
  amount: number
  problems: Message[]
}

export function rowToCard(headers: string[], row: string[]): CardData {
  const fields: Record<string, string> = {}
  headers.forEach((h, i) => (fields[h] = row[i] ?? ''))
  const amount = parseInt(fields.amount ?? '', 10)
  return { fields, amount: Number.isFinite(amount) && amount >= 0 ? amount : 1 }
}

export function bindCard(template: Template, card: CardData): BoundCard {
  const problems: Message[] = []
  const overrides = new Map<string, Map<string, string>>()
  for (const [header, value] of Object.entries(card.fields)) {
    if (value.trim() === '' || header === 'amount') continue
    const dot = header.indexOf('.')
    const layer = dot < 0 ? header : header.slice(0, dot)
    const prop = dot < 0 ? null : header.slice(dot + 1)
    if (!overrides.has(layer)) overrides.set(layer, new Map())
    overrides.get(layer)!.set(prop ?? '', value)
  }

  const apply = (layers: Layer[]): Layer[] =>
    layers.map((layer) => {
      let out: Layer = layer
      const src = layer.source
      const column = src.kind === 'column' && src.column ? src.column : layer.name
      const props = new Map(overrides.get(column))
      // il valore principale segue la fonte scelta; le colonne delle altre proprietà valgono sempre
      if (src.kind === 'fixed') props.delete('')
      if (src.kind === 'formula') {
        const r = evaluateFormula(src.expr, card.fields)
        for (const f of r.missing)
          problems.push(msg('bind.formulaField', { layer: layer.name, field: f }))
        if (r.value.trim() !== '') props.set('', r.value)
        else props.delete('')
      }
      if (props.size) {
        const patch: Record<string, unknown> = {}
        for (const [prop, raw] of props) {
          const key = prop || PRIMARY_PROPERTY[layer.type]
          if (!(key in layer)) {
            problems.push(msg('bind.unknownProperty', { column: `${column}.${key}` }))
            continue
          }
          const parsed = parseValue(key, (layer as unknown as Record<string, unknown>)[key], raw)
          if (parsed === undefined)
            problems.push(msg('bind.invalidValue', { column: `${column}.${key}`, value: raw }))
          else patch[key] = parsed
        }
        out = { ...layer, ...patch } as Layer
      }
      if (out.type === 'text') out = { ...out, text: substituteFields(out.text, card.fields) }
      if (out.type === 'image') out = { ...out, src: substituteFields(out.src, card.fields) }
      if (out.type === 'group') out = { ...out, children: apply(out.children) }
      return out
    })

  return {
    template: { ...template, front: apply(template.front), back: apply(template.back) },
    amount: card.amount,
    problems
  }
}

/** Sostituisce {campo} con il valore della riga; le altre graffe restano per le variabili */
export function substituteFields(text: string, fields: Record<string, string>): string {
  return text.replace(/(?<!\\)\{([^{}*]+)\}/g, (m, name: string) =>
    Object.prototype.hasOwnProperty.call(fields, name.trim()) ? fields[name.trim()] : m
  )
}

const NULLABLE = new Set(['fill', 'tint', 'style', 'stroke', 'shadow'])

/** Converte il testo di una cella nel tipo della proprietà, usando il valore attuale come guida */
export function parseValue(key: string, current: unknown, raw: string): unknown {
  const v = raw.trim()
  if (NULLABLE.has(key) && v.toLowerCase() === 'none') return null
  if (key === 'stroke') return parseStroke(v)
  if (key === 'shadow') return parseShadow(v)
  if (typeof current === 'number') {
    const n = Number(v.replace(',', '.'))
    return Number.isFinite(n) ? n : undefined
  }
  if (typeof current === 'boolean') {
    const s = v.toLowerCase()
    if (['true', 'yes', 'y', '1', 'x', 'sì', 'si'].includes(s)) return true
    if (['false', 'no', 'n', '0'].includes(s)) return false
    return undefined
  }
  return v
}

/** "colore/spessore", spessore in mm o in % */
function parseStroke(v: string): Stroke | undefined {
  const [color, width] = v.split('/').map((p) => p.trim())
  if (!color) return undefined
  if (width === undefined) return { color, width: 0.3 }
  if (width.endsWith('%')) return { color, width }
  const n = Number(width.replace(',', '.'))
  return Number.isFinite(n) ? { color, width: n } : undefined
}

/** "colore/sfocatura/dx/dy" in mm */
function parseShadow(v: string): Shadow | undefined {
  const [color, ...nums] = v.split('/').map((p) => p.trim())
  const [blur = 0.5, dx = 0.3, dy = 0.3] = nums.map((n) => Number(n.replace(',', '.')))
  if (!color || [blur, dx, dy].some((n) => !Number.isFinite(n))) return undefined
  return { color, blur, dx, dy }
}
