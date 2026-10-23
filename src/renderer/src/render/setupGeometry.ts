import type { LoadedSet } from '../../../shared/project'
import type { Side, Template } from '../../../shared/model/template'
import {
  anatomyCardSource,
  findCard,
  isMessage,
  parseCardRef
} from '../../../shared/model/document'
import type { Setup, SetupItem } from '../../../shared/model/setup'

// Misure degli elementi dello schema del tavolo (model/setup.ts), in mm: servono al disegno,
// all'area quando non è scritta e all'editor per selezionare e trascinare.

export interface Box {
  x: number
  y: number
  w: number
  h: number
}

/** Misure della carta richiamata (con width=…), o null se non si trova */
export function cardSize(
  card: string,
  sets: LoadedSet[],
  templates: Template[]
): { w: number; h: number; side: Side } | null {
  const ref = parseCardRef(anatomyCardSource(card))
  if (isMessage(ref)) return null
  const found = findCard(ref, sets)
  if (isMessage(found)) return null
  const t = templates.find((x) => x.name === found.set.template)
  if (!t) return null
  const w = ref.width ?? t.width
  return { w, h: (t.height * w) / t.width, side: ref.side }
}

/** Carte del mazzo disegnate una sull'altra, e il loro scostamento in mm */
export const DECK_LAYERS = 4
export const DECK_STEP = 0.8
/** Misura di una carta che non si trova, per poterla comunque spostare */
const MISSING = { w: 63, h: 88 }

/** Riquadro dritto che contiene un rettangolo w × h ruotato di `deg` gradi attorno al centro */
export function turnedSize(w: number, h: number, deg: number): { w: number; h: number } {
  const a = (deg * Math.PI) / 180
  const c = Math.abs(Math.cos(a))
  const s = Math.abs(Math.sin(a))
  // senza gli errori di arrotondamento: a 90° la carta è esattamente girata
  const round = (n: number): number => Math.round(n * 1e6) / 1e6
  return { w: round(w * c + h * s), h: round(w * s + h * c) }
}

/** Misura della carta di un elemento, anche se la carta non si trova */
export const itemCardSize = (card: string, sets: LoadedSet[], templates: Template[]): Size =>
  cardSize(card, sets, templates) ?? MISSING

interface Size {
  w: number
  h: number
}

/**
 * Riquadro dell'elemento sul tavolo, senza le didascalie. Una carta ruotata occupa il riquadro
 * dritto che la contiene: x e y sono il suo angolo in alto a sinistra.
 */
export function itemBox(it: SetupItem, sets: LoadedSet[], templates: Template[]): Box {
  switch (it.kind) {
    case 'card':
    case 'deck': {
      const s = itemCardSize(it.card, sets, templates)
      const turned = turnedSize(s.w, s.h, it.rotate)
      const extra = it.kind === 'deck' ? (Math.min(it.count, DECK_LAYERS + 1) - 1) * DECK_STEP : 0
      return { x: it.x, y: it.y, w: turned.w + extra, h: turned.h + extra }
    }
    case 'zone':
      return { x: it.x, y: it.y, w: it.w, h: it.h }
    case 'text':
      return { x: it.x, y: it.y, w: it.w, h: 8 }
    case 'image':
      return { x: it.x, y: it.y, w: it.w, h: it.w }
    case 'arrow': {
      const x = Math.min(it.x, it.x2)
      const y = Math.min(it.y, it.y2)
      return { x, y, w: Math.abs(it.x2 - it.x), h: Math.abs(it.y2 - it.y) }
    }
  }
}

/** Area disegnata: quella scritta, o quella che contiene gli elementi con un poco di margine */
export function setupArea(setup: Setup, boxes: Box[], below: number): Box {
  if (setup.size) return { x: 0, y: 0, w: setup.size.w, h: setup.size.h }
  if (!boxes.length) return { x: 0, y: 0, w: 100, h: 50 }
  const pad = 3
  const x = Math.min(...boxes.map((b) => b.x)) - pad
  const y = Math.min(...boxes.map((b) => b.y)) - pad
  const w = Math.max(...boxes.map((b) => b.x + b.w)) + pad - x
  const h = Math.max(...boxes.map((b) => b.y + b.h)) + pad + below - y
  return { x, y, w, h }
}

/** Interlinea delle didascalie */
export const SETUP_LINE = 1.25

export interface SetupView {
  /** Area disegnata, in mm */
  area: Box
  /** Riquadro di ogni elemento, nello stesso ordine */
  boxes: Box[]
  /** Corpo delle didascalie in mm del disegno */
  font: number
}

/**
 * Area, riquadri e corpo delle didascalie. Nel documento lo schema si riduce per stare nella
 * pagina: le didascalie crescono altrettanto, così si leggono come il testo.
 */
export function setupView(
  setup: Setup,
  sets: LoadedSet[],
  templates: Template[],
  maxWidth: number,
  font: number
): SetupView {
  const boxes = setup.items.map((it) => itemBox(it, sets, templates))
  const hasLabels = setup.items.some((it) => (it.kind === 'card' || it.kind === 'deck') && it.label)
  // prima si misura senza didascalie, per sapere quanto si riduce
  const raw = setupArea(setup, boxes, 0)
  const shrink = Math.min(1, maxWidth / Math.max(1, raw.w))
  const f = font / shrink
  const area = setupArea(setup, boxes, hasLabels ? f * SETUP_LINE * 2 + 1 : 0)
  return { area, boxes, font: f }
}

/** Lo schema con i testi trasformati, per esempio con le variabili del progetto risolte */
export function setupWithText(setup: Setup, f: (s: string) => string): Setup {
  return {
    ...setup,
    items: setup.items.map((it) =>
      it.kind === 'text'
        ? { ...it, text: f(it.text) }
        : 'label' in it
          ? { ...it, label: f(it.label) }
          : it
    )
  }
}
