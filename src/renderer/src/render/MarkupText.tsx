import { useContext, type CSSProperties } from 'react'
import { resolveAsset } from '../../../shared/model/assets'
import {
  BLOCK_STYLE,
  isBox,
  mergeAttrs,
  parseMarkup,
  resolveStyles,
  type Attrs,
  type Block,
  type Inline
} from '../../../shared/model/markup'
import { AssetsContext, StylesContext, assetUrl } from './assets'

// Disegna il markup del testo (docs/specifica.md, 2.1) come HTML dentro il foreignObject del
// livello. Le misure sono nel sistema scalato del livello: `unit` pixel per millimetro.

const PT_TO_MM = 25.4 / 72

interface Scale {
  /** Pixel per millimetro */
  unit: number
  /** Riduzione applicata da "riduci per stare nel riquadro", per le dimensioni assolute */
  ratio: number
}

export default function MarkupText({
  text,
  unit,
  ratio,
  paragraphSpacing
}: {
  text: string
  unit: number
  ratio: number
  /** mm */
  paragraphSpacing: number
}): React.JSX.Element {
  const styles = useContext(StylesContext)
  const { blocks } = parseMarkup(text)
  const k = { unit, ratio }
  return (
    <>
      {blocks.map((b, i) => (
        <BlockView
          key={i}
          block={b}
          k={k}
          styles={styles}
          marginTop={i ? paragraphSpacing * unit : 0}
        />
      ))}
    </>
  )
}

function BlockView({
  block: b,
  k,
  styles,
  marginTop
}: {
  block: Block
  k: Scale
  styles: Record<string, string>
  marginTop: number
}): React.JSX.Element {
  if (b.kind === 'rule')
    return (
      <div
        style={{
          height: 0,
          borderTop: `${0.25 * k.unit}px solid currentColor`,
          opacity: 0.45,
          margin: `${marginTop || 0.35 * k.unit * 4}px 0 ${0.35 * k.unit * 4}px`
        }}
      />
    )
  const kindStyle = BLOCK_STYLE[b.kind]
  const attrs = resolveStyles(
    kindStyle ? mergeAttrs({ styles: [kindStyle] }, b.attrs) : b.attrs,
    styles
  )
  const marker = b.kind === 'bullet' ? '•' : b.kind === 'number' ? `${b.number}.` : null
  const style: CSSProperties = {
    margin: 0,
    marginTop,
    ...textStyle(attrs, k),
    textAlign: attrs.align,
    ...(marker ? { paddingLeft: '1.2em', textIndent: '-1.2em' } : null)
  }
  return (
    <p style={style}>
      {marker && (
        <span style={{ display: 'inline-block', width: '1.2em', textIndent: 0 }}>{marker}</span>
      )}
      {b.children.length ? <Inlines list={b.children} k={k} styles={styles} /> : ' '}
    </p>
  )
}

function Inlines({
  list,
  k,
  styles
}: {
  list: Inline[]
  k: Scale
  styles: Record<string, string>
}): React.JSX.Element {
  return (
    <>
      {list.map((n, i) => {
        switch (n.t) {
          case 'text':
            return n.text
          case 'br':
            return <br key={i} />
          case 'ref':
            return <Ref key={i} name={n.name} count={n.count} raw={n.raw} />
          default:
            return (
              <SpanView key={i} attrs={resolveStyles(n.attrs, styles)} k={k} styles={styles}>
                {n.children}
              </SpanView>
            )
        }
      })}
    </>
  )
}

function SpanView({
  attrs: a,
  k,
  styles,
  children
}: {
  attrs: Attrs
  k: Scale
  styles: Record<string, string>
  children: Inline[]
}): React.JSX.Element {
  const inner = <Inlines list={children} k={k} styles={styles} />
  if (!isBox(a)) return <span style={textStyle(a, k)}>{inner}</span>

  // riquadro: la dimensione va sul contenitore, così le misure in em valgono per entrambi;
  // il colore va sul testo, così lo sfondo prende di base il colore del testo intorno
  const { color, highlight, ...rest } = a
  const outer = textStyle({ ...rest, styles: [] }, k)
  const textOnly = textStyle({ styles: [], color, highlight }, k)
  const [pv, ph] = a.pad ?? (a.bg ? [0, 0.4] : [0.2, 0.6])
  const radius =
    a.radius === 'round' ? '999px' : a.radius !== undefined ? `${a.radius * k.unit}px` : undefined
  const border = a.border ? `${a.border.width * k.unit}px solid ${a.border.color}` : undefined

  if (!a.bg)
    return (
      <span
        style={{
          ...outer,
          display: 'inline-block',
          padding: `${pv * k.unit}px ${ph * k.unit}px`,
          border,
          borderRadius: radius,
          background: a.fill,
          lineHeight: 1.15,
          textIndent: 0
        }}
      >
        <span style={textOnly}>{inner}</span>
      </span>
    )

  const size = a.bgSize
    ? a.bgSize.endsWith('%')
      ? `${parseFloat(a.bgSize) / 100}em`
      : `${parseFloat(a.bgSize) * k.unit}px`
    : '1.45em'
  return (
    <span
      style={{
        ...outer,
        display: 'inline-grid',
        placeItems: 'center',
        position: 'relative',
        minWidth: size,
        height: size,
        padding: `${pv * k.unit}px ${ph * k.unit}px`,
        boxSizing: 'border-box',
        verticalAlign: 'middle',
        lineHeight: 1,
        textIndent: 0,
        background: a.fill,
        borderRadius: radius
      }}
    >
      <Background name={a.bg} color={a.bgColor} border={a.border} unit={k.unit} />
      <span style={{ ...textOnly, position: 'relative' }}>{inner}</span>
    </span>
  )
}

const SHAPES: Record<string, (p: React.SVGProps<SVGElement>) => React.JSX.Element> = {
  circle: (p) => (
    <ellipse cx={50} cy={50} rx={50} ry={50} {...(p as React.SVGProps<SVGEllipseElement>)} />
  ),
  square: (p) => <rect width={100} height={100} {...(p as React.SVGProps<SVGRectElement>)} />,
  rounded: (p) => (
    <rect width={100} height={100} rx={22} {...(p as React.SVGProps<SVGRectElement>)} />
  ),
  hexagon: (p) => (
    <polygon
      points="25,0 75,0 100,50 75,100 25,100 0,50"
      {...(p as React.SVGProps<SVGPolygonElement>)}
    />
  ),
  diamond: (p) => (
    <polygon points="50,0 100,50 50,100 0,50" {...(p as React.SVGProps<SVGPolygonElement>)} />
  )
}

const FILL: CSSProperties = { position: 'absolute', inset: 0, width: '100%', height: '100%' }

/** Sfondo del riquadro: una forma predefinita o un'immagine degli asset, colorabile */
function Background({
  name,
  color,
  border,
  unit
}: {
  name: string
  color?: string
  border?: { color: string; width: number }
  unit: number
}): React.JSX.Element {
  const assets = useContext(AssetsContext)
  const shape = SHAPES[name]
  if (shape)
    return (
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        style={{ ...FILL, overflow: 'visible' }}
      >
        {shape({
          fill: color ?? 'currentColor',
          stroke: border?.color,
          strokeWidth: border ? border.width * unit : undefined,
          vectorEffect: 'non-scaling-stroke'
        })}
      </svg>
    )
  const res = resolveAsset(name, assets)
  if (!res.ok) return <span style={{ ...FILL, border: '1px dashed #E5484D' }} title={name} />
  const url = assetUrl(res.path)
  // con un colore l'immagine fa da maschera: ricolora le icone monocromatiche
  if (color)
    return (
      <span
        style={{
          ...FILL,
          background: color,
          WebkitMask: `url("${url}") center / contain no-repeat`
        }}
      />
    )
  return <img src={url} style={{ ...FILL, objectFit: 'contain' }} alt="" />
}

/** {nome} rimasto dopo i campi: un'immagine degli asset, ripetuta; altrimenti un errore */
function Ref({
  name,
  count,
  raw
}: {
  name: string
  count: number
  raw: string
}): React.JSX.Element {
  const assets = useContext(AssetsContext)
  const res = name ? resolveAsset(name, assets) : null
  if (!res?.ok)
    return (
      <span style={{ textDecoration: 'underline wavy #E5484D', textDecorationSkipInk: 'none' }}>
        {raw}
      </span>
    )
  const url = assetUrl(res.path)
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <img
          key={i}
          src={url}
          alt=""
          style={{ height: '1.15em', width: 'auto', verticalAlign: '-0.22em', margin: '0 0.04em' }}
        />
      ))}
    </>
  )
}

/** Proprietà del carattere come stile CSS */
function textStyle(a: Attrs, k: Scale): CSSProperties {
  const pt = PT_TO_MM * k.unit
  const s: CSSProperties = {}
  if (a.color) s.color = a.color
  if (a.highlight) {
    s.backgroundColor = a.highlight
    s.boxDecorationBreak = 'clone'
    s.WebkitBoxDecorationBreak = 'clone'
  }
  if (a.size) {
    const v = parseFloat(a.size)
    s.fontSize = a.size.endsWith('%')
      ? `${v / 100}em`
      : /^[+-]/.test(a.size)
        ? `calc(1em + ${v * pt * k.ratio}px)`
        : `${v * pt * k.ratio}px`
  }
  if (a.font) s.fontFamily = `'${a.font}', sans-serif`
  if (a.weight) s.fontWeight = a.weight
  if (a.italic) s.fontStyle = 'italic'
  const deco = [a.underline && 'underline', a.strike && 'line-through'].filter(Boolean)
  if (deco.length) s.textDecorationLine = deco.join(' ')
  if (a.script) {
    s.verticalAlign = a.script === 'sup' ? 'super' : 'sub'
    if (!a.size) s.fontSize = '0.7em'
    s.lineHeight = 0
  }
  if (a.stroke) {
    const w =
      typeof a.stroke.width === 'string'
        ? `${(parseFloat(a.stroke.width) / 100) * 2}em`
        : `${a.stroke.width * 2 * k.unit}px`
    s.WebkitTextStroke = `${w} ${a.stroke.color}`
    s.paintOrder = 'stroke fill'
  }
  if (a.spacing !== undefined) s.letterSpacing = `${a.spacing / 1000}em`
  if (a.raise) {
    s.position = 'relative'
    s.top = `${-a.raise * pt}px`
  }
  if (a.transform === 'upper') s.textTransform = 'uppercase'
  if (a.transform === 'lower') s.textTransform = 'lowercase'
  if (a.transform === 'smallcaps') s.fontVariant = 'small-caps'
  return s
}
