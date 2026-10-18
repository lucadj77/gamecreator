import { msg, type Message } from '../messages'
import { resolveAsset } from './assets'
import { isGenericFont, markupFonts } from './fonts'
import { evaluateFormula } from './formula'
import { markupProblems, markupRefs } from './markup'
import { walkLayers } from './normalize'
import {
  combineFlip,
  imageVariable,
  palette,
  parseImageAttrs,
  resolveColor,
  variableFields,
  type Variables
} from './variables'
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

/** Progetto aperto: per controllare stili, immagini e font richiamati dai testi */
export interface BindContext {
  styles?: Record<string, string>
  assets?: string[]
  /** Dice se un font è disponibile: nel progetto, nell'app o installato sul computer */
  hasFont?: (family: string) => boolean
  variables?: Variables
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

  const fields = cardFields(template, card, ctx.variables)
  const pal = palette(ctx.variables)
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
        if (out.visible) {
          problems.push(...textProblems(out.name, out.text, ctx))
          if (ctx.hasFont)
            for (const font of new Set([out.font, ...markupFonts(out.text, ctx.styles)]))
              if (font.trim() && !isGenericFont(font) && !ctx.hasFont(font))
                problems.push(msg('bind.missingFont', { layer: out.name, font }))
        }
      }
      if (out.type === 'image') {
        out = { ...out, src: substituteFields(out.src, fields) }
        // una variabile immagine prevale su un file con lo stesso nome
        // {spada} come sorgente vale quanto spada
        const v = imageVariable(out.src.trim().replace(/^\{(.*)\}$/, '$1'), ctx.variables)
        if (v) {
          const [flipH, flipV] = combineFlip(v.flip, out.flipH, out.flipV)
          out = {
            ...out,
            src: v.src,
            tint: out.tint ?? v.tint ?? null,
            flipH,
            flipV,
            opacity: out.opacity * (v.opacity ?? 1)
          }
        }
      }
      if (out.type === 'group') out = { ...out, children: apply(out.children) }
      return paintLayer(out, pal)
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
      // di una variabile immagine si controlla il file
      const v = imageVariable(name, ctx.variables)
      const r = resolveAsset(v ? v.src : name, ctx.assets)
      if (r.ok) continue
      if (v && r.reason !== 'ambiguous')
        out.push(msg('bind.missingVariableImage', { layer, name, src: v.src }))
      else
        out.push(
          msg(r.reason === 'ambiguous' ? 'bind.ambiguousRef' : 'bind.unknownRef', {
            layer,
            name: v ? v.src : name
          })
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
export function cardFields(
  template: Template,
  card: CardData,
  variables?: Variables
): Record<string, string> {
  const all = walkLayers([...template.front, ...template.back])
  // le variabili di testo e valore valgono come campi, ma un campo con lo stesso nome vince
  const fields: Record<string, string> = variableFields(variables)
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
  return (
    text
      .replace(/(?<!\\)\{([^{}*]+)\}/g, (m, inner: string) => {
        if (has(inner)) return fields[inner.trim()]
        // {icona tint=red}: il campo dà il nome dell'immagine, gli attributi restano
        const at = inner.trim().search(/\s/)
        const name = at > 0 ? inner.trim().slice(0, at) : ''
        return name && has(name) && parseImageAttrs(inner.trim().slice(at))
          ? `{${fields[name].trim()}${inner.trim().slice(at)}}`
          : m
      })
      // {spada*{quanti}} è già diventato {spada*quanti} se quanti è un campo
      .replace(
        /(?<!\\)\{([^{}*]+)\*([^{}*\s]+)(\s[^{}]*)?\}/g,
        (m, name: string, count: string, rest?: string) =>
          has(count) ? `{${name}*${fields[count.trim()].trim()}${rest ?? ''}}` : m
      )
  )
}

/** Colori del livello con i nomi della tavolozza del progetto sostituiti dal loro valore */
function paintLayer(l: Layer, pal: Record<string, string>): Layer {
  if (!Object.keys(pal).length) return l
  const stroke = (s: Stroke | null): Stroke | null =>
    s && { ...s, color: resolveColor(s.color, pal) }
  const shadow = l.shadow && { ...l.shadow, color: resolveColor(l.shadow.color, pal) }
  switch (l.type) {
    case 'text':
      return { ...l, shadow, color: resolveColor(l.color, pal), stroke: stroke(l.stroke) }
    case 'shape':
      return {
        ...l,
        shadow,
        fill: l.fill && resolveColor(l.fill, pal),
        stroke: stroke(l.stroke)
      }
    case 'image':
      return { ...l, shadow, tint: l.tint && resolveColor(l.tint, pal), stroke: stroke(l.stroke) }
    default:
      return { ...l, shadow }
  }
}

const NULLABLE = new Set(['fill', 'tint', 'style', 'stroke', 'shadow'])

/** Converte il testo di una cella nel tipo della proprietà, usando il valore attuale come guida */
const PERCENT = new Set(['zoom', 'opacity'])

export function parseValue(key: string, current: unknown, raw: string): unknown {
  const v = raw.trim()
  if (NULLABLE.has(key) && v.toLowerCase() === 'none') return null
  if (key === 'stroke') return parseStroke(v)
  if (key === 'shadow') return parseShadow(v)
  if (typeof current === 'number') {
    // zoom e opacità si possono scrivere anche in percentuale: 120% = 1.2
    if (PERCENT.has(key) && v.endsWith('%')) {
      const p = Number(v.slice(0, -1).trim().replace(',', '.'))
      return Number.isFinite(p) ? p / 100 : undefined
    }
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
