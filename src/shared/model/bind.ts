import { msg, type Message } from '../messages'
import { resolveAsset } from './assets'
import { evaluateFormula } from './formula'
import { markupProblems, markupRefs } from './markup'
import { walkLayers } from './normalize'
import {
  PRIMARY_PROPERTY,
  type Layer,
  type Shadow,
  type Stroke,
  type Template,
  type ValueSource
} from './template'

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
  /** Nome della carta: il campo scelto nel template, o la prima colonna non vuota */
  label: string
}

export function rowToCard(headers: string[], row: string[]): CardData {
  const fields: Record<string, string> = {}
  headers.forEach((h, i) => (fields[h] = row[i] ?? ''))
  const amount = parseInt(fields.amount ?? '', 10)
  return { fields, amount: Number.isFinite(amount) && amount >= 0 ? amount : 1 }
}

/** Progetto aperto: per controllare stili e immagini richiamati nel markup dei testi */
export interface BindContext {
  styles?: Record<string, string>
  assets?: string[]
}

export function bindCard(template: Template, card: CardData, ctx: BindContext = {}): BoundCard {
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

  const fields = cardFields(template, card)
  const apply = (layers: Layer[]): Layer[] =>
    layers.map((layer) => {
      let out: Layer = layer
      const src = layer.source
      const column = src.kind === 'column' && src.column ? src.column : layer.name
      const props = new Map(overrides.get(column))
      // il valore principale segue la fonte scelta; le colonne delle altre proprietà valgono sempre
      if (src.kind === 'fixed') props.delete('')
      if (src.kind === 'formula') {
        const r = evaluateFormula(src.expr, fields)
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
      if (out.type === 'text') {
        out = { ...out, text: substituteFields(out.text, fields) }
        if (out.visible) problems.push(...textProblems(out.name, out.text, ctx))
      }
      if (out.type === 'image') out = { ...out, src: substituteFields(out.src, fields) }
      if (out.type === 'group') out = { ...out, children: apply(out.children) }
      return out
    })

  return {
    template: { ...template, front: apply(template.front), back: apply(template.back) },
    amount: card.amount,
    problems,
    label: cardLabel(template, card, fields)
  }
}

/** Errori del markup di un testo, e {nome} che non è né un campo né un'immagine */
function textProblems(layer: string, text: string, ctx: BindContext): Message[] {
  const out = markupProblems(text, ctx.styles).map((p) =>
    msg('bind.markup', { layer, problem: p.message })
  )
  if (ctx.assets)
    for (const name of new Set(markupRefs(text))) {
      if (!name) continue
      const r = resolveAsset(name, ctx.assets)
      if (!r.ok)
        out.push(
          msg(r.reason === 'ambiguous' ? 'bind.ambiguousRef' : 'bind.unknownRef', { layer, name })
        )
    }
  return out
}

function cardLabel(template: Template, card: CardData, fields: Record<string, string>): string {
  if (template.labelField) return fields[template.labelField] ?? ''
  const first = Object.entries(card.fields).find(
    ([h, v]) => h !== 'amount' && !h.includes('.') && v.trim() !== ''
  )
  return first?.[1] ?? ''
}

/** Valore principale di un livello come testo, quello che vale se la riga non lo cambia */
export function defaultValue(l: Layer): string | null {
  switch (l.type) {
    case 'text':
      return l.text
    case 'image':
      return l.src
    case 'shape':
      return l.fill ?? ''
    case 'value':
      return l.value
    default:
      return null
  }
}

/**
 * Fonte del livello dopo il cambio di tipo. Passando a formula si parte dal valore attuale,
 * così la carta non cambia; restando sullo stesso tipo non cambia nulla.
 */
export function switchSource(l: Layer, kind: ValueSource['kind']): ValueSource {
  if (l.source.kind === kind) return l.source
  if (kind === 'column') return { kind, column: null }
  if (kind === 'fixed') return { kind }
  const v = defaultValue(l)
  return { kind, expr: v?.trim() ? v : `{${l.name}}` }
}

/**
 * Campi disponibili per formule e {campo}: i valori del template come base, sopra le celle non
 * vuote della riga, poi i livelli valore calcolati in ordine (uno può usare i precedenti).
 */
export function cardFields(template: Template, card: CardData): Record<string, string> {
  const all = walkLayers([...template.front, ...template.back])
  const fields: Record<string, string> = {}
  for (const l of all) {
    const v = defaultValue(l)
    if (v !== null) fields[l.name] = v
  }
  for (const [k, v] of Object.entries(card.fields))
    if (v.trim() !== '' || !(k in fields)) fields[k] = v
  for (const l of all) {
    if (l.type !== 'value') continue
    const src = l.source
    if (src.kind === 'fixed') fields[l.name] = l.value
    else if (src.kind === 'formula') fields[l.name] = evaluateFormula(src.expr, fields).value
    else if (src.column) {
      const cell = card.fields[src.column]
      fields[l.name] = cell?.trim() ? cell : l.value
    }
  }
  return fields
}

/**
 * Sostituisce {campo} con il valore della riga e, in {icona*campo}, il campo con il suo valore;
 * le altre graffe restano per le variabili e le immagini.
 */
export function substituteFields(text: string, fields: Record<string, string>): string {
  const has = (name: string): boolean => Object.prototype.hasOwnProperty.call(fields, name.trim())
  return text
    .replace(/(?<!\\)\{([^{}*]+)\}/g, (m, name: string) => (has(name) ? fields[name.trim()] : m))
    .replace(/(?<!\\)\{([^{}*]+)\*([^{}*]+)\}/g, (m, name: string, count: string) =>
      has(count) ? `{${name}*${fields[count.trim()].trim()}}` : m
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
