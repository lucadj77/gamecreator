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
  /** Tratteggio; assente vuol dire linea continua */
  dash?: 'dashed' | 'dotted'
}

/**
 * Dissolvenza dell'opacità: il livello passa da un'opacità all'altra lungo una direzione
 * (lineare) o dal centro verso i bordi (radiale). Opacità e posizioni sono 0-1.
 */
export interface Fade {
  kind: 'linear' | 'radial'
  /** Gradi come nelle sfumature: 180 va dall'alto verso il basso */
  angle: number
  from: number
  to: number
  start: number
  end: number
}

export type BlendMode = 'normal' | 'multiply' | 'screen' | 'overlay'

/**
 * Come segue il livello un cambio di formato del template ("lascia i livelli"): resta fermo a
 * sinistra o in alto, segue il lato opposto, resta centrato, si allunga con la carta, o scala.
 */
export interface Constraints {
  h: 'left' | 'right' | 'center' | 'both' | 'scale'
  v: 'top' | 'bottom' | 'center' | 'both' | 'scale'
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
  /** Fusione con ciò che sta sotto */
  blend: BlendMode
  fade: Fade | null
  shadow: Shadow | null
  constraints: Constraints
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
  /** Rientro della prima riga di ogni paragrafo, in mm */
  indent: number
  padding: number
  /** Margini interni diversi per lato (alto, destra, basso, sinistra); null usa padding */
  paddingSides: [number, number, number, number] | null
  transform: 'none' | 'upper' | 'lower' | 'capitalize'
  stroke: Stroke | null
  fit: 'none' | 'shrink' | 'truncate'
  minSize: number
  underline: boolean
  strike: boolean
  /** A capo automatico; senza, ogni paragrafo resta su una riga */
  wrap: boolean
}

export interface ImageLayer extends LayerBase {
  type: 'image'
  src: string
  fit: 'cover' | 'contain' | 'stretch' | 'original' | 'tile'
  /** Dove sta l'immagine nel riquadro quando non lo riempie o lo eccede */
  align: Anchor
  /** Scala dell'immagine rispetto all'adattamento, intorno al centro: 1 = 100% */
  zoom: number
  /** Rotazione dell'immagine dentro il riquadro, in gradi; il riquadro non ruota */
  imageRotation: number
  /** Spostamento dell'immagine nel riquadro, in mm */
  offsetX: number
  offsetY: number
  flipH: boolean
  flipV: boolean
  tint: string | null
  /** Regolazioni: 1 = invariato */
  grayscale: boolean
  brightness: number
  contrast: number
  saturation: number
  radius: number
  stroke: Stroke | null
  missing: 'placeholder' | 'hide'
}

export type ShapeKind = 'rect' | 'ellipse' | 'polygon' | 'star' | 'line' | 'path'

export interface ShapeLayer extends LayerBase {
  type: 'shape'
  shape: ShapeKind
  /** Colore, variabile colore o sfumatura (linear-gradient(...), radial-gradient(...)) */
  fill: string | null
  stroke: Stroke | null
  radius: number
  sides: number
  innerRatio: number
  /** Tracciato SVG in coordinate 0-1 rispetto al riquadro, per shape = 'path' */
  path: string
}

export type GroupLayout = 'none' | 'row' | 'column' | 'grid'
export type LayoutAlign = 'start' | 'center' | 'end'

export interface GroupLayer extends LayerBase {
  type: 'group'
  clip: boolean
  children: Layer[]
  /** Disposizione automatica dei figli dentro il riquadro del gruppo */
  layout: GroupLayout
  /** Spazio tra i figli in mm */
  gap: number
  /** Colonne della griglia */
  columns: number
  /** Posizione del contenuto nel riquadro, lungo la riga o la colonna */
  justify: LayoutAlign
  /** Allineamento di ciascun figlio nell'altra direzione */
  alignItems: LayoutAlign
  /** Quante volte ripetere i figli: un numero o un campo, come {forza} */
  repeat: string
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

export type CardShape = 'rect' | 'ellipse' | 'hexagon' | 'path'

export interface ManualGuides {
  x: number[]
  y: number[]
}

export interface Template {
  name: string
  /** Nome del file in templates/ senza estensione, se diverso dal nome; non si salva */
  file?: string
  width: number
  height: number
  bleed: number
  safeMargin: number
  cornerRadius: number
  /** Forma della carta rifilata; assente vale rettangolo (con cornerRadius) */
  shape?: CardShape
  /** Contorno per shape = 'path': tracciato SVG in coordinate 0-1 rispetto alla carta */
  shapePath?: string
  /** Guide manuali dell'editor in mm: linee verticali (x) e orizzontali (y) */
  guides?: ManualGuides
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
