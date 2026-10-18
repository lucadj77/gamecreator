import { useContext, useId, useLayoutEffect, useRef, useState } from 'react'
import { resolveAsset } from '../../../shared/model/assets'
import { anchorPoint, polygonVertices, roundedPolygonPath } from '../../../shared/model/geometry'
import { useI18n } from '../i18n/context'
import { AssetsContext, ShowEmptyContext, assetUrl } from './assets'
import { fitRect, useImageSize } from './imageSize'
import MarkupText from './MarkupText'
import type {
  GroupLayer,
  ImageLayer,
  Layer,
  LayerBase,
  ShapeLayer,
  Side,
  Stroke,
  Template,
  TextLayer
} from '../../../shared/model/template'

// Disegna una carta in SVG, in millimetri. È lo stesso disegno che userà l'esportazione PDF.

const PT_TO_MM = 25.4 / 72
/**
 * Il testo si impagina in un sistema scalato ×10 (decimi di mm): con font di pochi px
 * Chromium applica una dimensione minima e l'impaginazione sarebbe sbagliata.
 */
const TEXT_SCALE = 10

interface Props {
  template: Template
  side?: Side
  /** Pixel per millimetro */
  scale: number
  /** 'trim': carta rifilata con angoli arrotondati; 'bleed': con abbondanza e linea di taglio */
  mode?: 'trim' | 'bleed'
  /**
   * Area in mm da disegnare intorno alla carta, nell'editor: ciò che esce dalla carta si vede
   * tenue, così un livello spostato fuori per errore si ritrova.
   */
  pasteboard?: { x: number; y: number; w: number; h: number }
}

export default function CardSvg({
  template: t,
  side = 'front',
  scale,
  mode = 'trim',
  pasteboard
}: Props): React.JSX.Element {
  const uid = useId().replace(/:/g, '')
  const b = mode === 'bleed' ? t.bleed : 0
  const layers = side === 'front' ? t.front : t.back
  const vw = t.width + 2 * b
  const vh = t.height + 2 * b
  const box = pasteboard ?? { x: -b, y: -b, w: vw, h: vh }
  return (
    <svg
      width={box.w * scale}
      height={box.h * scale}
      viewBox={`${box.x} ${box.y} ${box.w} ${box.h}`}
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: 'block' }}
    >
      <defs>
        <clipPath id={`${uid}-card`}>
          {mode === 'trim' ? (
            <rect width={t.width} height={t.height} rx={t.cornerRadius} />
          ) : (
            <rect x={-b} y={-b} width={vw} height={vh} />
          )}
        </clipPath>
        {pasteboard && (
          <filter id={`${uid}-lift`} x="-10%" y="-10%" width="120%" height="120%">
            <feDropShadow dx={0} dy={0.6} stdDeviation={1} floodOpacity={0.3} />
          </filter>
        )}
      </defs>
      {pasteboard && (
        <>
          <g opacity={0.35}>
            <LayerList layers={layers} uid={`${uid}p`} />
          </g>
          <rect
            x={-b}
            y={-b}
            width={vw}
            height={vh}
            rx={mode === 'trim' ? t.cornerRadius : 0}
            fill="#FFFFFF"
            filter={`url(#${uid}-lift)`}
          />
        </>
      )}
      <g clipPath={`url(#${uid}-card)`}>
        <rect x={-b} y={-b} width={vw} height={vh} fill="#FFFFFF" />
        <LayerList layers={layers} uid={uid} />
      </g>
      {mode === 'bleed' && (
        <rect
          width={t.width}
          height={t.height}
          rx={t.cornerRadius}
          fill="none"
          stroke="#E5484D"
          strokeWidth={0.2}
          strokeDasharray="1 0.7"
        />
      )}
    </svg>
  )
}

/** Il primo livello dell'elenco è quello in cima, come nel pannello livelli */
function LayerList({ layers, uid }: { layers: Layer[]; uid: string }): React.JSX.Element {
  return (
    <>
      {[...layers].reverse().map((l) => (
        <LayerView key={l.id} layer={l} uid={uid} />
      ))}
    </>
  )
}

function LayerView({ layer: l, uid }: { layer: Layer; uid: string }): React.JSX.Element | null {
  if (!l.visible || l.type === 'value') return null
  const id = `${uid}-${l.id}`
  const { x: ax, y: ay } = anchorPoint(l)
  return (
    <g
      transform={l.rotation ? `rotate(${l.rotation} ${ax} ${ay})` : undefined}
      opacity={l.opacity < 1 ? l.opacity : undefined}
      filter={l.shadow ? `url(#${id}-shadow)` : undefined}
    >
      {l.shadow && (
        <defs>
          <filter id={`${id}-shadow`} x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow
              dx={l.shadow.dx}
              dy={l.shadow.dy}
              stdDeviation={l.shadow.blur / 2}
              floodColor={l.shadow.color}
            />
          </filter>
        </defs>
      )}
      {l.type === 'shape' && <ShapeView layer={l} />}
      {l.type === 'image' && <ImageView layer={l} id={id} />}
      {l.type === 'text' && <TextView layer={l} />}
      {l.type === 'group' && <GroupView layer={l} id={id} uid={uid} />}
    </g>
  )
}

function strokeProps(
  s: Stroke | null,
  fontSizeMm?: number
): { stroke?: string; strokeWidth?: number } {
  if (!s) return {}
  return { stroke: s.color, strokeWidth: strokeWidth(s, fontSizeMm) }
}

function strokeWidth(s: Stroke, fontSizeMm = 0): number {
  return typeof s.width === 'string' ? (parseFloat(s.width) / 100) * fontSizeMm : s.width
}

function ShapeView({ layer: l }: { layer: ShapeLayer }): React.JSX.Element {
  const paint = { fill: l.fill ?? 'none', ...strokeProps(l.stroke) }
  switch (l.shape) {
    case 'ellipse':
      return <ellipse cx={l.x + l.w / 2} cy={l.y + l.h / 2} rx={l.w / 2} ry={l.h / 2} {...paint} />
    case 'polygon':
    case 'star':
      return (
        <path
          d={roundedPolygonPath(polygonVertices(l), l.radius)}
          strokeLinejoin="round"
          {...paint}
        />
      )
    case 'line':
      return (
        <line
          x1={l.x}
          y1={l.y}
          x2={l.x + l.w}
          y2={l.y + l.h}
          {...strokeProps(l.stroke ?? { color: l.fill ?? '#000', width: 0.3 })}
        />
      )
    case 'path': {
      // il tracciato è in coordinate 0-1: lo spessore si riporta in mm dividendo per la scala
      const sw = l.stroke ? l.stroke.width : 0
      return (
        <path
          d={l.path}
          transform={`translate(${l.x} ${l.y}) scale(${l.w} ${l.h})`}
          fill={l.fill ?? 'none'}
          stroke={l.stroke?.color}
          strokeWidth={typeof sw === 'number' ? sw / ((l.w + l.h) / 2) : undefined}
        />
      )
    }
    default:
      return <rect x={l.x} y={l.y} width={l.w} height={l.h} rx={l.radius} {...paint} />
  }
}

const PRESERVE: Record<ImageLayer['fit'], string> = {
  cover: 'xMidYMid slice',
  contain: 'xMidYMid meet',
  stretch: 'none',
  original: 'xMidYMid meet'
}

function ImageView({ layer: l, id }: { layer: ImageLayer; id: string }): React.JSX.Element | null {
  const assets = useContext(AssetsContext)
  const { t } = useI18n()
  const showEmpty = useContext(ShowEmptyContext)
  const res = resolveAsset(l.src, assets)
  const size = useImageSize(res.ok ? assetUrl(res.path) : null)
  if (!res.ok) {
    if (res.reason === 'empty' && showEmpty) return <Placeholder layer={l} label={l.name} />
    if (l.missing === 'hide' || res.reason === 'empty') return null
    // nel template il nome viene spesso da un campo: si mostra il campo, non un errore
    if (/\{[^}]+\}/.test(l.src)) return <Placeholder layer={l} label={l.src} />
    const key = res.reason === 'ambiguous' ? 'asset.ambiguous' : 'asset.missing'
    return <Placeholder layer={l} label={t(key, { name: l.src })} />
  }
  // finché non si conoscono le dimensioni si lascia fare a preserveAspectRatio
  const r = size ? fitRect(l, size, l.fit) : l
  const rect = { x: r.x, y: r.y, width: r.w, height: r.h }
  const flip =
    l.flipH || l.flipV
      ? `translate(${l.flipH ? 2 * l.x + l.w : 0} ${l.flipV ? 2 * l.y + l.h : 0}) scale(${l.flipH ? -1 : 1} ${l.flipV ? -1 : 1})`
      : undefined
  return (
    <>
      <defs>
        <clipPath id={`${id}-clip`}>
          <rect x={l.x} y={l.y} width={l.w} height={l.h} rx={l.radius} />
        </clipPath>
        {l.tint && (
          // ricolora mantenendo la trasparenza: pensato per icone monocromatiche
          <filter id={`${id}-tint`}>
            <feFlood floodColor={l.tint} />
            <feComposite in2="SourceAlpha" operator="in" />
          </filter>
        )}
      </defs>
      <g clipPath={`url(#${id}-clip)`}>
        <image
          href={assetUrl(res.path)}
          {...rect}
          preserveAspectRatio={size ? 'none' : PRESERVE[l.fit]}
          transform={flip}
          filter={l.tint ? `url(#${id}-tint)` : undefined}
        />
      </g>
      {l.stroke && (
        <rect
          x={l.x}
          y={l.y}
          width={l.w}
          height={l.h}
          rx={l.radius}
          fill="none"
          {...strokeProps(l.stroke)}
        />
      )}
    </>
  )
}

function Placeholder({ layer: l, label }: { layer: LayerBase; label: string }): React.JSX.Element {
  return (
    <g>
      <rect
        x={l.x}
        y={l.y}
        width={l.w}
        height={l.h}
        fill="#E9E4DA"
        stroke="#B3A994"
        strokeWidth={0.2}
        strokeDasharray="1 0.6"
      />
      <text
        x={l.x + l.w / 2}
        y={l.y + l.h / 2}
        fontSize={Math.min(2.4, l.h / 3)}
        textAnchor="middle"
        dominantBaseline="middle"
        fill="#6B6255"
        fontFamily="monospace"
      >
        {label}
      </text>
    </g>
  )
}

const VALIGN: Record<TextLayer['valign'], string> = {
  top: 'flex-start',
  middle: 'center',
  bottom: 'flex-end'
}

function TextView({ layer: l }: { layer: TextLayer }): React.JSX.Element {
  const showEmpty = useContext(ShowEmptyContext)
  const empty = showEmpty && !l.text.trim()
  const boxRef = useRef<HTMLDivElement>(null)
  const [fitted, setFitted] = useState<{ key: string; size: number } | null>(null)
  const fitKey = `${l.text}|${l.size}|${l.w}|${l.h}|${l.font}|${l.weight}|${l.lineHeight}|${l.fit}`
  const size = fitted && fitted.key === fitKey ? fitted.size : l.size

  // "riduci per stare nel riquadro": si scende di mezzo punto finché il testo non sta
  useLayoutEffect(() => {
    const el = boxRef.current
    if (!el || l.fit !== 'shrink') return
    const overflows =
      el.scrollHeight > el.clientHeight + 0.5 || el.scrollWidth > el.clientWidth + 0.5
    if (overflows && size - 0.5 >= l.minSize) setFitted({ key: fitKey, size: size - 0.5 })
  }, [fitKey, size, l.fit, l.minSize])

  const sizeMm = size * PT_TO_MM
  const s = TEXT_SCALE
  return (
    <g transform={`translate(${l.x} ${l.y}) scale(${1 / s})`}>
      <foreignObject
        width={l.w * s}
        height={l.h * s}
        overflow={l.fit === 'none' ? 'visible' : 'hidden'}
      >
        <div
          ref={boxRef}
          style={{
            width: '100%',
            height: '100%',
            boxSizing: 'border-box',
            padding: l.padding * s,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: VALIGN[l.valign],
            // "esce dal riquadro" lascia vedere il testo in eccesso, le altre modalità lo tagliano
            overflow: l.fit === 'none' ? 'visible' : 'hidden',
            fontFamily: `'${l.font}', sans-serif`,
            fontWeight: l.weight,
            fontStyle: l.italic ? 'italic' : 'normal',
            fontSize: sizeMm * s,
            lineHeight: l.lineHeight,
            letterSpacing: `${l.letterSpacing / 1000}em`,
            color: l.color,
            textAlign: l.align,
            textTransform:
              l.transform === 'upper'
                ? 'uppercase'
                : l.transform === 'lower'
                  ? 'lowercase'
                  : l.transform,
            whiteSpace: 'pre-wrap',
            overflowWrap: 'break-word',
            WebkitTextStroke: l.stroke
              ? `${strokeWidth(l.stroke, sizeMm) * 2 * s}px ${l.stroke.color}`
              : undefined,
            paintOrder: 'stroke fill'
          }}
        >
          <div style={empty ? { opacity: 0.35, fontStyle: 'italic' } : undefined}>
            {empty ? (
              <p style={{ margin: 0 }}>{l.name}</p>
            ) : (
              <MarkupText
                text={l.text}
                unit={s}
                ratio={size / l.size}
                paragraphSpacing={l.paragraphSpacing}
              />
            )}
          </div>
        </div>
      </foreignObject>
    </g>
  )
}

/**
 * Con "ritaglia" il livello in fondo al gruppo fa da maschera: non si disegna e i livelli
 * sopra si vedono solo dentro la sua forma.
 */
function GroupView({
  layer: l,
  id,
  uid
}: {
  layer: GroupLayer
  id: string
  uid: string
}): React.JSX.Element {
  const mask = l.clip ? l.children[l.children.length - 1] : undefined
  if (!mask || l.children.length < 2) return <LayerList layers={l.children} uid={uid} />
  const a = anchorPoint(mask)
  return (
    <>
      <defs>
        {/* dentro clipPath non sono ammessi i <g>: la rotazione va sul clipPath */}
        <clipPath
          id={`${id}-clip`}
          transform={mask.rotation ? `rotate(${mask.rotation} ${a.x} ${a.y})` : undefined}
        >
          {mask.type === 'shape' && mask.shape !== 'line' ? (
            <ShapeView layer={mask} />
          ) : (
            <rect x={mask.x} y={mask.y} width={mask.w} height={mask.h} />
          )}
        </clipPath>
      </defs>
      <g clipPath={`url(#${id}-clip)`}>
        <LayerList layers={l.children.slice(0, -1)} uid={uid} />
      </g>
    </>
  )
}
