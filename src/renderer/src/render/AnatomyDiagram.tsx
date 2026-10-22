import type { LoadedSet } from '../../../shared/project'
import type { Template } from '../../../shared/model/template'
import { anatomyCardSource, layerBounds, type Anatomy } from '../../../shared/model/document'
import CardSvg from './CardSvg'
import { MarkupInline } from './MarkupText'
import { useBoundCard } from './useBoundCard'

// Anatomia di una carta nei documenti (```anatomy): la carta disegnata dal progetto e, ai lati,
// le etichette collegate da una linea ai livelli che spiegano. È un unico SVG, misurato in mm,
// così l'esportazione lo tratta come una carta (HTML, PDF e PNG nel Markdown).

/** Larghezza della colonna delle etichette, in mm: la massima e la minima */
const LABEL_W = 42
const LABEL_MIN = 26
/** Spazio tra le etichette e la carta */
const GAP = 7
/** Larghezza minima della carta quando si riduce per stare nella pagina */
const CARD_MIN = 30
const LINE = 1.25
/** Spazio minimo tra due etichette */
const SPACING = 1.5
const INK = '#3a3a3c'

/**
 * Righe stimate di un'etichetta, andando a capo tra le parole come farà il browser: serve a non
 * sovrapporre le etichette prima di averle disegnate. La stima abbonda un poco.
 */
function lines(text: string, width: number, font: number): number {
  const char = font * 0.52
  let n = 0
  for (const para of text.replace(/\{[^}]*\}/g, 'MM').split('\n')) {
    let used = 0
    n++
    for (const word of para.split(/\s+/).filter(Boolean)) {
      const w = word.replace(/[*_]/g, '').length * char
      if (used && used + char + w > width) {
        n++
        used = w
      } else used += (used ? char : 0) + w
    }
  }
  return n
}

interface Placed {
  label: string
  /** Punto indicato sulla carta, in mm del disegno */
  ax: number
  ay: number
  /** Alto dell'etichetta */
  y: number
  h: number
}

/** Mette le etichette di un lato all'altezza dei loro punti, spostandole se si sovrappongono */
function stack(items: Omit<Placed, 'y'>[], top: number, bottom: number): Placed[] {
  const sorted = [...items].sort((a, b) => a.ay - b.ay)
  const out = sorted.map((it) => ({ ...it, y: it.ay - it.h / 2 }))
  for (let i = 0; i < out.length; i++)
    out[i].y = Math.max(out[i].y, i ? out[i - 1].y + out[i - 1].h + SPACING : top)
  // se escono in fondo si risale, senza superare l'alto; se non ci stanno, scendono sotto la carta
  bottom = Math.max(bottom, top + out.reduce((n, p) => n + p.h + SPACING, -SPACING))
  for (let i = out.length - 1; i >= 0; i--) {
    const limit = i === out.length - 1 ? bottom : out[i + 1].y - SPACING
    out[i].y = Math.max(top, Math.min(out[i].y, limit - out[i].h))
  }
  return out
}

export default function AnatomyDiagram({
  anatomy,
  sets,
  templates,
  project,
  unit,
  maxWidth,
  font
}: {
  anatomy: Anatomy
  sets: LoadedSet[]
  templates: Template[]
  project?: string
  /** Pixel per mm */
  unit: number
  /** Larghezza del testo della pagina in mm: carta ed etichette si riducono per starci */
  maxWidth: number
  /** Corpo delle etichette in mm */
  font: number
}): React.JSX.Element | null {
  const card = useBoundCard(anatomyCardSource(anatomy.card), sets, templates, project)
  if (!card) return null
  const t = card.template
  const layers = card.ref.side === 'front' ? t.front : t.back
  const found = anatomy.callouts
    .map((c) => ({ c, b: layerBounds(layers, c.layer) }))
    .filter((x) => x.b !== null)
  const sideOf = (c: (typeof found)[number]): 'left' | 'right' =>
    c.c.side ?? (c.b!.x + c.b!.w / 2 < t.width / 2 ? 'left' : 'right')
  const columns = new Set(found.map(sideOf)).size
  // prima si stringono le etichette, poi la carta (se la larghezza non è scritta)
  let width = card.ref.width ?? t.width
  let labelW = LABEL_W
  const room = (): number => maxWidth - columns * (labelW + GAP)
  if (width > room()) labelW = Math.max(LABEL_MIN, (maxWidth - width) / Math.max(1, columns) - GAP)
  if (width > room() && !card.ref.width) width = Math.max(CARD_MIN, room())
  const s = width / t.width
  const height = t.height * s

  const sides: Record<'left' | 'right', Omit<Placed, 'y'>[]> = { left: [], right: [] }
  for (const f of found) {
    const b = f.b!
    const side = sideOf(f)
    // il punto sta dentro il livello, vicino al bordo dalla parte dell'etichetta
    const inset = Math.min(2.5, (b.w * s) / 2)
    const ax = side === 'left' ? b.x * s + inset : (b.x + b.w) * s - inset
    const h = lines(f.c.label, labelW, font) * font * LINE
    sides[side].push({ label: f.c.label, ax, ay: (b.y + b.h / 2) * s, h })
  }
  const left = sides.left.length ? labelW + GAP : 0
  const right = sides.right.length ? labelW + GAP : 0
  const placedL = stack(sides.left, 0, height)
  const placedR = stack(sides.right, 0, height)
  const total = Math.max(height, ...[...placedL, ...placedR].map((p) => p.y + p.h))
  const w = left + width + right

  const label = (p: Placed, side: 'left' | 'right', k: number): React.JSX.Element => {
    const x = side === 'left' ? 0 : left + width + GAP
    const ex = side === 'left' ? labelW + 1 : x - 1
    const ey = p.y + Math.min(p.h, font * LINE) / 2
    return (
      <g key={`${side}${k}`}>
        <polyline
          points={`${ex},${ey} ${side === 'left' ? left - GAP / 2 : left + width + GAP / 2},${ey} ${left + p.ax},${p.ay}`}
          fill="none"
          stroke={INK}
          strokeWidth={0.3}
          strokeLinejoin="round"
        />
        <circle cx={left + p.ax} cy={p.ay} r={0.9} fill={INK} stroke="#ffffff" strokeWidth={0.3} />
        {/* la posizione sta nel gruppo: l'esportazione in SVG converte il foreignObject da sé */}
        <g transform={`translate(${x} ${p.y})`}>
          <foreignObject width={labelW} height={p.h + font}>
            <div
              style={{
                fontSize: font,
                lineHeight: LINE,
                textAlign: side === 'left' ? 'right' : 'left',
                color: 'inherit'
              }}
            >
              <MarkupInline text={p.label} unit={1} />
            </div>
          </foreignObject>
        </g>
      </g>
    )
  }

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={w * unit}
      height={total * unit}
      viewBox={`0 0 ${w} ${total}`}
      style={{ display: 'block', overflow: 'visible' }}
    >
      <g transform={`translate(${left} 0)`}>
        <CardSvg template={t} side={card.ref.side} scale={s} />
      </g>
      {placedL.map((p, k) => label(p, 'left', k))}
      {placedR.map((p, k) => label(p, 'right', k))}
    </svg>
  )
}
