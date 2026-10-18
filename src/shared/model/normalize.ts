import { MessageError, msg } from '../messages'
import type {
  GroupLayer,
  ImageLayer,
  Layer,
  LayerBase,
  ShapeLayer,
  Template,
  TextLayer
} from './template'

// Nei file i livelli riportano solo le proprietà diverse dai default; qui si completano.

const BASE_DEFAULTS: Omit<LayerBase, 'id' | 'name'> = {
  visible: true,
  locked: false,
  x: 0,
  y: 0,
  w: 20,
  h: 10,
  rotation: 0,
  anchor: 'center',
  opacity: 1,
  shadow: null,
  exposed: []
}

const TEXT_DEFAULTS: Omit<TextLayer, keyof LayerBase | 'type'> = {
  text: '',
  style: null,
  font: 'Nunito',
  weight: 400,
  italic: false,
  size: 10,
  color: '#000000',
  align: 'left',
  valign: 'top',
  lineHeight: 1.2,
  letterSpacing: 0,
  paragraphSpacing: 0,
  padding: 0,
  transform: 'none',
  stroke: null,
  fit: 'none',
  minSize: 6
}

const IMAGE_DEFAULTS: Omit<ImageLayer, keyof LayerBase | 'type'> = {
  src: '',
  fit: 'cover',
  flipH: false,
  flipV: false,
  tint: null,
  radius: 0,
  stroke: null,
  missing: 'placeholder'
}

const SHAPE_DEFAULTS: Omit<ShapeLayer, keyof LayerBase | 'type'> = {
  shape: 'rect',
  fill: '#CCCCCC',
  stroke: null,
  radius: 0,
  sides: 6,
  innerRatio: 0.5,
  path: ''
}

let idCounter = 0

function newId(): string {
  idCounter += 1
  return `l${Date.now().toString(36)}${idCounter}`
}

/** Livello come scritto nel file: solo le proprietà diverse dai default */
export type RawLayer = {
  type?: string
  name?: string
  id?: string
  children?: RawLayer[]
} & Record<string, unknown>

export type RawTemplate = Partial<Omit<Template, 'front' | 'back'>> & {
  name: string
  front?: RawLayer[]
  back?: RawLayer[]
}

export function normalizeLayer(raw: RawLayer, index: number): Layer {
  const base = {
    ...BASE_DEFAULTS,
    id: raw.id ?? newId(),
    name: raw.name ?? `${raw.type ?? 'layer'}${index + 1}`
  }
  switch (raw.type) {
    case 'text':
      return { ...base, ...TEXT_DEFAULTS, ...(raw as Partial<TextLayer>), type: 'text' }
    case 'image':
      return { ...base, ...IMAGE_DEFAULTS, ...(raw as Partial<ImageLayer>), type: 'image' }
    case 'shape':
      return { ...base, ...SHAPE_DEFAULTS, ...(raw as Partial<ShapeLayer>), type: 'shape' }
    case 'group':
      return {
        ...base,
        clip: false,
        ...(raw as Partial<GroupLayer>),
        type: 'group',
        children: (raw.children ?? []).map(normalizeLayer)
      }
    default:
      throw new MessageError(
        msg('template.unknownLayerType', { layer: base.name, type: String(raw.type) })
      )
  }
}

export function normalizeTemplate(raw: RawTemplate): Template {
  return {
    width: 63,
    height: 88,
    bleed: 3,
    safeMargin: 3,
    cornerRadius: 3,
    ...raw,
    front: (raw.front ?? []).map(normalizeLayer),
    back: (raw.back ?? []).map(normalizeLayer)
  }
}

/** Tutti i livelli in profondità, gruppi compresi */
export function walkLayers(layers: Layer[]): Layer[] {
  return layers.flatMap((l) => (l.type === 'group' ? [l, ...walkLayers(l.children)] : [l]))
}

/** Nomi duplicati tra fronte e retro di un template */
export function duplicateNames(t: Template): string[] {
  const seen = new Set<string>()
  const dup = new Set<string>()
  for (const l of walkLayers([...t.front, ...t.back])) {
    if (seen.has(l.name)) dup.add(l.name)
    seen.add(l.name)
  }
  return [...dup]
}
