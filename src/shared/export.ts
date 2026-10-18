// Esportazione: opzioni, impaginazione del PDF, nomi dei file, griglia e oggetto di Tabletop
// Simulator. Vedi docs/specifica.md, sezione 9. Tutte le misure sono in mm.

import type { Side, Template } from './model/template'
import type { Message } from './messages'

export type ExportKind = 'images' | 'pdf' | 'tts'
export type SidesChoice = 'front' | 'back' | 'both'

export interface CommonOptions {
  /** Set da esportare, per nome; vuoto vuol dire tutti */
  sets: string[]
  /** Ripete le carte secondo la colonna amount */
  copies: boolean
  /** Cartella di destinazione; vuota vuol dire export/ nel progetto */
  folder: string
}

export interface ImageOptions extends CommonOptions {
  format: 'png' | 'jpg'
  /** Qualità JPG, 1-100 */
  quality: number
  dpi: number
  bleed: boolean
  sides: SidesChoice
  /** Fuori dagli angoli arrotondati: trasparente (solo PNG) o bianco */
  transparent: boolean
  /** Nome dei file: %set, %n, %copy, %side, {campo}; / crea sottocartelle */
  pattern: string
}

export type PageSize = 'A4' | 'A3' | 'Letter' | 'custom'
export type MarksStyle = 'none' | 'corners' | 'lines'

export interface PdfOptions extends CommonOptions {
  page: PageSize
  /** Pagina personalizzata, verticale */
  pageWidth: number
  pageHeight: number
  landscape: boolean
  margin: number
  spacing: number
  layout: 'auto' | 'fixed'
  cols: number
  rows: number
  bleed: boolean
  marks: MarksStyle
  markLength: number
  markWidth: number
  markColor: string
  /** Segni di taglio sopra le carte invece che sotto */
  marksOver: boolean
  sides: SidesChoice
  /** Fronte-retro: retri su pagine alternate, specchiati per la rilegatura scelta */
  duplex: 'none' | 'long' | 'short'
  /** Spostamento dei retri per compensare il disallineamento della stampante */
  offsetX: number
  offsetY: number
  /** Un file in tutto, uno per set o uno per lato (fronti e retri separati) */
  split: 'single' | 'set' | 'side'
}

export interface TtsOptions extends Omit<CommonOptions, 'folder'> {
  grid: 'auto' | 'fixed'
  cols: number
  rows: number
  maxSize: 4096 | 8192
  /** Retro unico, foglio dei retri o scelta automatica (unico se tutti i retri sono uguali) */
  back: 'auto' | 'single' | 'sheet'
  destination: 'project' | 'tts' | 'both'
  /** Cartella Saved Objects di Tabletop Simulator; vuota usa quella predefinita del sistema */
  ttsFolder: string
  /** Campo per Nickname e Description; vuoto per lasciarli vuoti */
  nickname: string
  description: string
}

export interface ExportProfiles {
  images?: Partial<ImageOptions>
  pdf?: Partial<PdfOptions>
  tts?: Partial<TtsOptions>
}

export const DEFAULT_IMAGE: ImageOptions = {
  sets: [],
  copies: false,
  folder: '',
  format: 'png',
  quality: 92,
  dpi: 300,
  bleed: false,
  sides: 'front',
  transparent: true,
  pattern: '%set/%n'
}

export const DEFAULT_PDF: PdfOptions = {
  sets: [],
  copies: true,
  folder: '',
  page: 'A4',
  pageWidth: 210,
  pageHeight: 297,
  landscape: false,
  margin: 10,
  spacing: 0,
  layout: 'auto',
  cols: 3,
  rows: 3,
  bleed: false,
  marks: 'corners',
  markLength: 4,
  markWidth: 0.25,
  markColor: '#000000',
  marksOver: false,
  sides: 'front',
  duplex: 'none',
  offsetX: 0,
  offsetY: 0,
  split: 'single'
}

export const DEFAULT_TTS: TtsOptions = {
  sets: [],
  copies: true,
  grid: 'auto',
  cols: 10,
  rows: 7,
  maxSize: 4096,
  back: 'auto',
  destination: 'project',
  ttsFolder: '',
  nickname: '',
  description: ''
}

/** Una carta da esportare: il template con i valori della riga già applicati */
export interface ExportCard {
  /** Posizione nel set, da 1 */
  n: number
  amount: number
  label: string
  fields: Record<string, string>
  template: Template
}

export interface ExportSet {
  name: string
  cards: ExportCard[]
}

interface JobBase {
  /** Nome del progetto: dà il nome al PDF unico e alla cartella in Tabletop Simulator */
  project: string
  sets: ExportSet[]
}

export type ExportJob =
  | (JobBase & { kind: 'images'; options: ImageOptions })
  | (JobBase & { kind: 'pdf'; options: PdfOptions })
  | (JobBase & { kind: 'tts'; options: TtsOptions })

/** Contesto del disegno: immagini e stili del progetto aperto */
export interface ExportContext {
  assets: string[]
  styles: Record<string, string>
}

export interface ExportResult {
  files: number
  folders: string[]
  warnings: Message[]
  cancelled: boolean
}

export interface ExportProgress {
  done: number
  total: number
}

// ——— Scene: ciò che la finestra di esportazione disegna ———

export type CardMode = 'trim' | 'cut' | 'bleed'

export interface SceneItem {
  x: number
  y: number
  template: Template
  side: Side
  /** 'trim': angoli arrotondati; 'cut': rettangolo di taglio; 'bleed': con l'abbondanza */
  mode: CardMode
}

export interface SceneLine {
  x1: number
  y1: number
  x2: number
  y2: number
}

export interface ScenePage {
  width: number
  height: number
  items: SceneItem[]
  lines: SceneLine[]
}

export interface Scene {
  pages: ScenePage[]
  /** Pixel per mm */
  scale: number
  /** null: sfondo trasparente */
  background: string | null
  lineColor: string
  lineWidth: number
  linesOver: boolean
}

// ——— Carte e copie ———

export interface Instance {
  card: ExportCard
  /** Copia, da 1 */
  copy: number
}

/** Le carte ripetute secondo amount; senza copie, una per riga (anche se amount è 0) */
export function expandCopies(cards: ExportCard[], copies: boolean): Instance[] {
  const out: Instance[] = []
  for (const card of cards) {
    const n = copies ? card.amount : 1
    for (let copy = 1; copy <= n; copy++) out.push({ card, copy })
  }
  return out
}

export function sidesOf(choice: SidesChoice): Side[] {
  return choice === 'both' ? ['front', 'back'] : [choice]
}

// ——— Nomi dei file ———

// caratteri non ammessi nei nomi di file su Windows, compresi quelli di controllo
// eslint-disable-next-line no-control-regex
const UNSAFE = /[\\:*?"<>|\u0000-\u001f]/g

/** Ripulisce un nome per il file system, senza uscire dalla cartella con .. */
export function safeName(s: string): string {
  const v = s.replace(UNSAFE, '_').replace(/\//g, '_').trim().replace(/^\.+/, '_')
  return v || '_'
}

export interface NameParts {
  set: string
  n: number
  /** Cifre di %n: con 12 carte 01, 02, ... */
  digits: number
  copy: number
  side: Side
  fields: Record<string, string>
}

/** Percorso relativo del file, senza estensione, dal modello di nome */
export function fileName(pattern: string, p: NameParts): string {
  const src = pattern.trim() || '%set/%n'
  const segments = src.split('/').map((seg) =>
    seg
      .replace(/%set/g, p.set)
      .replace(/%n/g, String(p.n).padStart(p.digits, '0'))
      .replace(/%copy/g, String(p.copy))
      .replace(/%side/g, p.side)
      .replace(/\{([^{}]+)\}/g, (_, f: string) => p.fields[f.trim()] ?? '')
  )
  return segments.map(safeName).join('/')
}

/** Aggiunge _2, _3, ... ai nomi già usati */
export function uniqueNames(names: string[]): string[] {
  const seen = new Map<string, number>()
  return names.map((n) => {
    const key = n.toLowerCase()
    const count = (seen.get(key) ?? 0) + 1
    seen.set(key, count)
    return count === 1 ? n : `${n}_${count}`
  })
}

/** Completa il modello: con entrambi i lati serve %side, con le copie %copy */
export function effectivePattern(o: ImageOptions): string {
  let p = o.pattern.trim() || DEFAULT_IMAGE.pattern
  if (o.sides === 'both' && !p.includes('%side')) p += '_%side'
  if (o.copies && !p.includes('%copy')) p += '_%copy'
  return p
}

// ——— PDF ———

export const PAGE_SIZES: Record<Exclude<PageSize, 'custom'>, [number, number]> = {
  A4: [210, 297],
  A3: [297, 420],
  Letter: [215.9, 279.4]
}

export function pageSize(o: PdfOptions): { width: number; height: number } {
  const [w, h] = o.page === 'custom' ? [o.pageWidth, o.pageHeight] : PAGE_SIZES[o.page]
  const [a, b] = [Math.min(w, h), Math.max(w, h)]
  return o.landscape ? { width: b, height: a } : { width: a, height: b }
}

export interface Grid {
  cols: number
  rows: number
  /** Riquadro di una carta con l'eventuale abbondanza */
  cellW: number
  cellH: number
  gap: number
  /** Angolo in alto a sinistra della griglia, centrata nella pagina */
  x0: number
  y0: number
  bleed: number
}

/**
 * Con l'abbondanza le carte si toccano: i segni di taglio restano fuori dalla griglia.
 * Senza, le carte sono separate dalla spaziatura.
 */
export function pdfGrid(
  o: PdfOptions,
  card: { width: number; height: number; bleed: number }
): Grid {
  const page = pageSize(o)
  const bleed = o.bleed ? card.bleed : 0
  const cellW = card.width + 2 * bleed
  const cellH = card.height + 2 * bleed
  const gap = o.bleed ? 0 : Math.max(0, o.spacing)
  const availW = page.width - 2 * o.margin
  const availH = page.height - 2 * o.margin
  const fit = (avail: number, cell: number): number =>
    Math.max(1, Math.floor((avail + gap + 1e-6) / (cell + gap)))
  const cols = o.layout === 'fixed' ? Math.max(1, o.cols) : fit(availW, cellW)
  const rows = o.layout === 'fixed' ? Math.max(1, o.rows) : fit(availH, cellH)
  const gridW = cols * cellW + (cols - 1) * gap
  const gridH = rows * cellH + (rows - 1) * gap
  return {
    cols,
    rows,
    cellW,
    cellH,
    gap,
    x0: (page.width - gridW) / 2,
    y0: (page.height - gridH) / 2,
    bleed
  }
}

/** La griglia esce dalla pagina: troppe righe o colonne per il formato */
export function gridOverflows(g: Grid): boolean {
  return g.x0 < -1e-6 || g.y0 < -1e-6
}

/**
 * Specchiatura dei retri: girando il foglio sul lato lungo di una pagina verticale le colonne
 * si invertono; sul lato corto (o sul lato lungo di una pagina orizzontale) le righe.
 */
export function mirrorsX(o: PdfOptions): boolean {
  const page = pageSize(o)
  const portrait = page.height >= page.width
  return (o.duplex === 'long') === portrait
}

export interface PlacedCard {
  x: number
  y: number
  instance: Instance
  side: Side
}

/** Posizione della cella i di una pagina, sul fronte o sul retro specchiato */
export function cellPosition(
  o: PdfOptions,
  g: Grid,
  i: number,
  back: boolean
): { x: number; y: number } {
  const page = pageSize(o)
  const col = i % g.cols
  const row = Math.floor(i / g.cols)
  let x = g.x0 + col * (g.cellW + g.gap)
  let y = g.y0 + row * (g.cellH + g.gap)
  if (back && o.duplex !== 'none') {
    if (mirrorsX(o)) x = page.width - x - g.cellW
    else y = page.height - y - g.cellH
    x += o.offsetX
    y += o.offsetY
  }
  return { x, y }
}

export interface PdfPagePlan {
  side: Side
  cards: PlacedCard[]
}

/**
 * Pagine del PDF. Senza fronte-retro tutti i fronti, poi tutti i retri; con il fronte-retro
 * ogni pagina di fronti è seguita dalla pagina dei retri corrispondenti.
 */
export function planPdfPages(o: PdfOptions, g: Grid, instances: Instance[]): PdfPagePlan[] {
  const per = g.cols * g.rows
  const chunks: Instance[][] = []
  for (let i = 0; i < instances.length; i += per) chunks.push(instances.slice(i, i + per))
  const page = (chunk: Instance[], side: Side): PdfPagePlan => ({
    side,
    cards: chunk.map((instance, i) => ({
      ...cellPosition(o, g, i, side === 'back'),
      instance,
      side
    }))
  })
  if (o.duplex !== 'none') return chunks.flatMap((c) => [page(c, 'front'), page(c, 'back')])
  return sidesOf(o.sides).flatMap((side) => chunks.map((c) => page(c, side)))
}

/** Segni di taglio di una pagina, sulle linee di rifilo delle carte */
export function cropMarks(o: PdfOptions, g: Grid, cards: PlacedCard[]): SceneLine[] {
  if (o.marks === 'none' || !cards.length) return []
  const page = pageSize(o)
  const trims = cards.map((c) => ({
    l: c.x + g.bleed,
    t: c.y + g.bleed,
    r: c.x + g.cellW - g.bleed,
    b: c.y + g.cellH - g.bleed
  }))
  const round = (v: number): number => Math.round(v * 1000) / 1000
  if (o.marks === 'lines') {
    const xs = [...new Set(trims.flatMap((t) => [round(t.l), round(t.r)]))]
    const ys = [...new Set(trims.flatMap((t) => [round(t.t), round(t.b)]))]
    return [
      ...xs.map((x) => ({ x1: x, y1: 0, x2: x, y2: page.height })),
      ...ys.map((y) => ({ x1: 0, y1: y, x2: page.width, y2: y }))
    ]
  }
  // angoli: trattini che partono dal bordo dell'abbondanza e vanno verso l'esterno
  const out: SceneLine[] = []
  const len = o.markLength
  const d = g.bleed
  for (const t of trims) {
    for (const x of [t.l, t.r]) {
      out.push({ x1: x, y1: t.t - d - len, x2: x, y2: t.t - d })
      out.push({ x1: x, y1: t.b + d, x2: x, y2: t.b + d + len })
    }
    for (const y of [t.t, t.b]) {
      out.push({ x1: t.l - d - len, y1: y, x2: t.l - d, y2: y })
      out.push({ x1: t.r + d, y1: y, x2: t.r + d + len, y2: y })
    }
  }
  return out
}

// ——— Tabletop Simulator ———

export const TTS_MAX_COLS = 10
export const TTS_MAX_ROWS = 7
/** Oltre questa risoluzione le carte non guadagnano nulla in Tabletop Simulator */
export const TTS_MAX_DPI = 300

/**
 * Griglia del foglio per n carte: l'ultima posizione resta alla carta nascosta, quindi servono
 * n + 1 posizioni. Si sceglie la griglia con meno posizioni vuote e, a parità, il foglio più
 * vicino al quadrato.
 */
export function ttsAutoGrid(
  n: number,
  cardW: number,
  cardH: number
): { cols: number; rows: number } {
  let best = { cols: TTS_MAX_COLS, rows: TTS_MAX_ROWS, slots: Infinity, shape: Infinity }
  const need = Math.min(n, TTS_MAX_COLS * TTS_MAX_ROWS - 1) + 1
  for (let cols = 2; cols <= TTS_MAX_COLS; cols++)
    for (let rows = 2; rows <= TTS_MAX_ROWS; rows++) {
      const slots = cols * rows
      if (slots < need) continue
      const shape = Math.abs(Math.log((cols * cardW) / (rows * cardH)))
      if (slots < best.slots || (slots === best.slots && shape < best.shape - 1e-9))
        best = { cols, rows, slots, shape }
    }
  return { cols: best.cols, rows: best.rows }
}

/** Pixel per mm del foglio: entro la dimensione massima e senza superare 300 DPI */
export function ttsScale(
  cols: number,
  rows: number,
  cardW: number,
  cardH: number,
  maxSize: number
): number {
  const s = Math.min(maxSize / (cols * cardW), maxSize / (rows * cardH), TTS_MAX_DPI / 25.4)
  // carte di larghezza intera in pixel: Tabletop Simulator divide il foglio in parti uguali
  return Math.floor(cardW * s) / cardW
}

export interface TtsSheet {
  faceUrl: string
  backUrl: string
  cols: number
  rows: number
  uniqueBack: boolean
}

export interface TtsDeckCard {
  /** Indice del foglio (da 0) e posizione nel foglio */
  sheet: number
  slot: number
  nickname: string
  description: string
}

function transform(y = 1): Record<string, number> {
  return {
    posX: 0,
    posY: y,
    posZ: 0,
    rotX: 0,
    rotY: 180,
    rotZ: 180,
    scaleX: 1,
    scaleY: 1,
    scaleZ: 1
  }
}

/** Oggetto salvato di Tabletop Simulator: un mazzo, o una carta sola se ce n'è una */
export function ttsSavedObject(
  name: string,
  sheets: TtsSheet[],
  cards: TtsDeckCard[]
): Record<string, unknown> {
  const customDeck = (i: number): Record<string, unknown> => ({
    [String(i + 1)]: {
      FaceURL: sheets[i].faceUrl,
      BackURL: sheets[i].backUrl,
      NumWidth: sheets[i].cols,
      NumHeight: sheets[i].rows,
      BackIsHidden: true,
      UniqueBack: sheets[i].uniqueBack,
      Type: 0
    }
  })
  const cardId = (c: TtsDeckCard): number => (c.sheet + 1) * 100 + c.slot
  const cardObject = (c: TtsDeckCard): Record<string, unknown> => ({
    Name: 'Card',
    Transform: transform(),
    Nickname: c.nickname,
    Description: c.description,
    CardID: cardId(c),
    CustomDeck: customDeck(c.sheet),
    Locked: false,
    Grid: true,
    Snap: true,
    Hands: true,
    SidewaysCard: false
  })
  const object =
    cards.length === 1
      ? { ...cardObject(cards[0]), Nickname: cards[0].nickname || name }
      : {
          Name: 'Deck',
          Transform: transform(),
          Nickname: name,
          Description: '',
          DeckIDs: cards.map(cardId),
          CustomDeck: Object.assign({}, ...sheets.map((_, i) => customDeck(i))),
          ContainedObjects: cards.map(cardObject),
          Locked: false,
          Grid: true,
          Snap: true,
          Hands: false,
          SidewaysCard: false
        }
  return {
    SaveName: '',
    GameMode: '',
    Gravity: 0.5,
    PlayArea: 0.5,
    Date: '',
    Table: '',
    Sky: '',
    Note: '',
    Rules: '',
    XmlUI: '',
    LuaScript: '',
    LuaScriptState: '',
    ObjectStates: [object],
    TabStates: {},
    VersionNumber: ''
  }
}

/** Cartella Saved Objects di Tabletop Simulator per sistema operativo */
export function defaultTtsFolder(platform: string, home: string, documents: string): string {
  if (platform === 'darwin') return `${home}/Library/Tabletop Simulator/Saves/Saved Objects`
  if (platform === 'win32')
    return `${documents}\\My Games\\Tabletop Simulator\\Saves\\Saved Objects`
  return `${home}/.local/share/Tabletop Simulator/Saves/Saved Objects`
}
