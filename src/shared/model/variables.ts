// Variabili del progetto: vedi docs/specifica.md, sezione 6.1.

/** Icona o immagine richiamata con {nome} nei testi, come sorgente di un livello o con bg= */
export interface ImageVariable {
  type: 'image'
  /** File in assets/, risolto come le altre immagini (sezione 3.1) */
  src: string
  /** Ricolora l'immagine: pensato per le icone monocromatiche */
  tint?: string | null
  /** Altezza rispetto alla riga di testo: 1 = altezza normale delle icone */
  scale?: number
  /** Spostamento verticale nel testo, in % dell'altezza della riga; positivo verso l'alto */
  raise?: number
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
