// Modello dei template: vedi docs/specifica.md, sezioni 1-5 e 8.1.
// Unità: millimetri per posizioni e dimensioni, punti per il testo, gradi per la rotazione.

export type Side = 'front' | 'back'

export type HAlign = 'left' | 'center' | 'right' | 'justify'
export type VAlign = 'top' | 'middle' | 'bottom'
export type Anchor =
  | 'top-left'
  | 'top'
  | 'top-right'
  | 'left'
  | 'center'
  | 'right'
  | 'bottom-left'
  | 'bottom'
  | 'bottom-right'

export interface Stroke {
  color: string
  /** Spessore in mm, oppure in % della dimensione del testo (solo testo) se termina con % */
  width: number | string
}

export interface Shadow {
  color: string
  blur: number
  dx: number
  dy: number
}

/**
 * Da dove arriva il valore principale del livello sulle carte: una colonna del foglio
 * (di base quella con il nome del livello), il valore fisso del template o una formula.
 */
export type ValueSource =
  { kind: 'column'; column: string | null } | { kind: 'fixed' } | { kind: 'formula'; expr: string }

export interface LayerBase {
  id: string
  /** Univoco nel template: è anche il nome della colonna nel foglio */
  name: string
  visible: boolean
  locked: boolean
  x: number
  y: number
  w: number
  h: number
  rotation: number
  anchor: Anchor
  opacity: number
  shadow: Shadow | null
  /** Proprietà esposte in tabella oltre al valore principale */
  exposed: string[]
  source: ValueSource
}

export interface TextLayer extends LayerBase {
  type: 'text'
  text: string
  style: string | null
  font: string
  weight: number
  italic: boolean
  size: number
  color: string
  align: HAlign
  valign: VAlign
  lineHeight: number
  letterSpacing: number
  paragraphSpacing: number
  padding: number
  transform: 'none' | 'upper' | 'lower' | 'capitalize'
  stroke: Stroke | null
  fit: 'none' | 'shrink' | 'truncate'
  minSize: number
}

export interface ImageLayer extends LayerBase {
  type: 'image'
  src: string
  fit: 'cover' | 'contain' | 'stretch' | 'original'
  /** Scala dell'immagine rispetto all'adattamento, intorno al centro: 1 = 100% */
  zoom: number
  /** Spostamento dell'immagine nel riquadro, in mm */
  offsetX: number
  offsetY: number
  flipH: boolean
  flipV: boolean
  tint: string | null
  radius: number
  stroke: Stroke | null
  missing: 'placeholder' | 'hide'
}

export type ShapeKind = 'rect' | 'ellipse' | 'polygon' | 'star' | 'line' | 'path'

export interface ShapeLayer extends LayerBase {
  type: 'shape'
  shape: ShapeKind
  fill: string | null
  stroke: Stroke | null
  radius: number
  sides: number
  innerRatio: number
  /** Tracciato SVG in coordinate 0-1 rispetto al riquadro, per shape = 'path' */
  path: string
}

export interface GroupLayer extends LayerBase {
  type: 'group'
  clip: boolean
  children: Layer[]
}

/**
 * Valore della carta senza rappresentazione: non si disegna, ma il suo risultato si può usare
 * come {nome} nelle formule e nei testi degli altri livelli.
 */
export interface ValueLayer extends LayerBase {
  type: 'value'
  value: string
}

export type Layer = TextLayer | ImageLayer | ShapeLayer | GroupLayer | ValueLayer
export type LayerType = Layer['type']

export interface Template {
  name: string
  /** Nome del file in templates/ senza estensione, se diverso dal nome; non si salva */
  file?: string
  width: number
  height: number
  bleed: number
  safeMargin: number
  cornerRadius: number
  /** Campo che dà il nome alle carte nelle anteprime dei set; null usa la prima colonna */
  labelField?: string | null
  front: Layer[]
  back: Layer[]
}

/** Valore principale di ogni tipo di livello: è la colonna che porta il nome del livello */
export const PRIMARY_PROPERTY: Record<LayerType, string> = {
  text: 'text',
  image: 'src',
  shape: 'fill',
  group: 'visible',
  value: 'value'
}

/** I livelli valore non hanno riquadro: non si disegnano, non si selezionano sulla carta */
export const isDrawn = (l: Layer): boolean => l.type !== 'value'
