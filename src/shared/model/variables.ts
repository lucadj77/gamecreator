// Variabili del progetto: vedi docs/specifica.md, sezione 6.1.

/** Aspetto di un'immagine nel testo: valori della variabile o attributi in {nome tint=red} */
export interface ImageSettings {
  /** Ricolora l'immagine: pensato per le icone monocromatiche. null = colori originali */
  tint?: string | null
  /** Altezza rispetto alla riga di testo: 1 = altezza normale delle icone */
  scale?: number
  /** Spostamento verticale nel testo, in % dell'altezza della riga; positivo verso l'alto */
  raise?: number
  /** Rotazione in gradi, in senso orario */
  rotate?: number
  /** Ribaltamento orizzontale (h), verticale (v) o entrambi (hv) */
  flip?: Flip
  /** 0-1 */
  opacity?: number
}

export type Flip = 'h' | 'v' | 'hv'

/** Icona o immagine richiamata con {nome} nei testi, come sorgente di un livello o con bg= */
export interface ImageVariable extends ImageSettings {
  type: 'image'
  /** File in assets/, risolto come le altre immagini (sezione 3.1) */
  src: string
}

/** Testo con markup che prende il posto di {nome} */
export interface TextVariable {
  type: 'text'
  text: string
}

/** Colore con un nome, usabile in ogni proprietà colore */
export interface ColorVariable {
  type: 'color'
  color: string
}

/** Testo o numero costante, usabile nei testi e nelle formule */
export interface ValueVariable {
  type: 'value'
  value: string
}

export type Variable = ImageVariable | TextVariable | ColorVariable | ValueVariable
export type VariableType = Variable['type']
export type Variables = Record<string, Variable>

export const VARIABLE_TYPES: VariableType[] = ['image', 'text', 'color', 'value']

export function emptyVariable(type: VariableType): Variable {
  switch (type) {
    case 'image':
      return { type, src: '' }
    case 'text':
      return { type, text: '' }
    case 'color':
      return { type, color: '#000000' }
    default:
      return { type: 'value', value: '' }
  }
}

/** Nome valido: lettere, cifre, _ e -, senza spazi né caratteri del markup */
export const isValidVariableName = (name: string): boolean => /^[\p{L}\p{N}_-]+$/u.test(name)

const MAX_DEPTH = 5

/**
 * Valori di testo e valore come campi di base della carta: i campi con lo stesso nome li
 * sostituiscono. I testi possono richiamare altre variabili di testo o valore.
 */
export function variableFields(vars: Variables | undefined): Record<string, string> {
  const out: Record<string, string> = {}
  if (!vars) return out
  for (const [name, v] of Object.entries(vars)) {
    if (v.type === 'text') out[name] = v.text
    else if (v.type === 'value') out[name] = v.value
  }
  for (let i = 0; i < MAX_DEPTH; i++) {
    let changed = false
    for (const name of Object.keys(out)) {
      const next = out[name].replace(/(?<!\\)\{([^{}*]+)\}/g, (m, ref: string) => {
        const r = ref.trim()
        return r !== name && r in out ? out[r] : m
      })
      if (next !== out[name]) {
        out[name] = next
        changed = true
      }
    }
    if (!changed) break
  }
  return out
}

/** Tavolozza del progetto: nome → colore. Un nome può ridefinire un colore predefinito (red) */
export function palette(vars: Variables | undefined): Record<string, string> {
  const out: Record<string, string> = {}
  if (vars)
    for (const [name, v] of Object.entries(vars)) if (v.type === 'color') out[name] = v.color
  return out
}

/**
 * Colore effettivo: "rosso" e "{rosso}" danno il colore della variabile, ogni altro valore
 * resta com'è (codice esadecimale o nome standard).
 */
export function resolveColor(color: string, pal: Record<string, string>): string
export function resolveColor(color: undefined, pal: Record<string, string>): undefined
export function resolveColor(
  color: string | undefined,
  pal: Record<string, string>
): string | undefined
export function resolveColor(
  color: string | undefined,
  pal: Record<string, string>
): string | undefined {
  if (!color) return color
  const name = color
    .trim()
    .replace(/^\{(.*)\}$/, '$1')
    .trim()
  return Object.prototype.hasOwnProperty.call(pal, name) ? pal[name] : color
}

/** Variabile immagine con questo nome, se c'è */
export function imageVariable(
  name: string,
  vars: Variables | undefined
): ImageVariable | undefined {
  const v = vars?.[name.trim()]
  return v?.type === 'image' ? v : undefined
}

/** Attributi delle immagini nel testo, con il tipo di valore: per il parser e per l'aiuto */
export const IMAGE_ATTRIBUTES = {
  tint: 'color',
  size: 'size',
  raise: 'number',
  rotate: 'number',
  flip: 'flip',
  opacity: 'size'
} as const

const number = (s: string): number | null => {
  const n = Number(s.trim().replace(',', '.'))
  return s.trim() !== '' && Number.isFinite(n) ? n : null
}

/** "150%" o "1.5" → 1.5 */
const ratio = (s: string): number | null => {
  const n = number(s.replace(/%$/, ''))
  return n === null ? null : s.trim().endsWith('%') ? n / 100 : n
}

/**
 * Legge gli attributi dopo il nome in {spada tint=red size=150% rotate=90 flip=h}.
 * Restituisce null se il testo non è una lista di attributi; bad = attributi non validi.
 */
export function parseImageAttrs(src: string): { settings: ImageSettings; bad: string[] } | null {
  const parts = src.trim().split(/\s+/).filter(Boolean)
  if (!parts.length || !parts.every((p) => p.includes('='))) return null
  const settings: ImageSettings = {}
  const bad: string[] = []
  for (const p of parts) {
    const eq = p.indexOf('=')
    const key = p.slice(0, eq).toLowerCase()
    const value = p.slice(eq + 1)
    let ok = !!value
    switch (key) {
      case 'tint':
      case 'color':
        settings.tint = value === 'none' ? null : value
        break
      case 'size': {
        const n = ratio(value)
        ok = n !== null && n > 0
        if (ok) settings.scale = n!
        break
      }
      case 'raise':
      case 'rotate': {
        const n = number(value.replace(/°$/, ''))
        ok = n !== null
        if (ok) settings[key] = n!
        break
      }
      case 'flip': {
        const f = value.toLowerCase()
        const flip =
          f === 'h' || f === 'v' ? f : f === 'hv' || f === 'vh' || f === 'both' ? 'hv' : null
        ok = !!flip || f === 'none'
        if (flip) settings.flip = flip
        else if (ok) settings.flip = undefined
        break
      }
      case 'opacity': {
        const n = ratio(value)
        ok = n !== null && n >= 0 && n <= 1
        if (ok) settings.opacity = n!
        break
      }
      default:
        ok = false
    }
    if (!ok) bad.push(p)
  }
  return { settings, bad }
}

/** Le impostazioni scritte nel testo prevalgono su quelle della variabile */
export function mergeImageSettings(
  base: ImageSettings | undefined,
  over?: ImageSettings
): ImageSettings {
  // flip=none scrive flip: undefined, che deve annullare quello della variabile
  return { ...base, ...over }
}

/** Combina due ribaltamenti: h + h = nessuno */
export function combineFlip(a: Flip | undefined, h: boolean, v: boolean): [boolean, boolean] {
  return [h !== !!a?.includes('h'), v !== !!a?.includes('v')]
}
