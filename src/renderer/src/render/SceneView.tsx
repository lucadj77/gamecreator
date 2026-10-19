import type { Scene, SceneItem, ScenePage } from '../../../shared/export'
import CardSvg from './CardSvg'

// Una pagina di una scena di esportazione: carte e segni di taglio. La usano la finestra nascosta
// di esportazione e l'anteprima nella finestra Esporta.

export default function ScenePageView({
  page: p,
  scene: s,
  className
}: {
  page: ScenePage
  scene: Scene
  className?: string
}): React.JSX.Element {
  const lines = (p.lines.length > 0 || !!p.labels?.length) && (
    <svg
      width={p.width * s.scale}
      height={p.height * s.scale}
      viewBox={`0 0 ${p.width} ${p.height}`}
      style={{ position: 'absolute', left: 0, top: 0 }}
    >
      {p.lines.map((l, i) => (
        <line key={i} {...l} stroke={s.lineColor} strokeWidth={s.lineWidth} strokeLinecap="butt" />
      ))}
      {p.labels?.map((l, i) => (
        <text
          key={`t${i}`}
          x={l.x}
          y={l.y}
          fontSize={l.size}
          fontFamily="sans-serif"
          fill={s.lineColor}
          dominantBaseline="middle"
        >
          {l.text}
        </text>
      ))}
    </svg>
  )
  // una parte di un poster mostra le carte solo nel suo riquadro
  const c = p.clip ?? { x: 0, y: 0, w: p.width, h: p.height }
  return (
    <div
      className={className}
      style={{
        position: 'relative',
        overflow: 'hidden',
        width: p.width * s.scale,
        height: p.height * s.scale,
        background: s.background ?? undefined
      }}
    >
      {!s.linesOver && lines}
      <div
        style={{
          position: 'absolute',
          overflow: 'hidden',
          left: c.x * s.scale,
          top: c.y * s.scale,
          width: c.w * s.scale,
          height: c.h * s.scale
        }}
      >
        {p.items.map((it, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: (it.x - c.x) * s.scale,
              top: (it.y - c.y) * s.scale,
              ...turn(it, s.scale)
            }}
          >
            <CardSvg
              template={it.template}
              side={it.side}
              scale={s.scale}
              mode={it.mode}
              guides={false}
            />
          </div>
        ))}
      </div>
      {s.linesOver && lines}
    </div>
  )
}

/**
 * Rotazione di una carta intorno all'angolo in alto a sinistra, poi spostata perché la carta
 * ruotata parta dalla posizione indicata
 */
function turn(it: SceneItem, scale: number): React.CSSProperties {
  if (!it.rotate) return {}
  const b = it.mode === 'bleed' ? it.template.bleed : 0
  const w = (it.template.width + 2 * b) * scale
  const h = (it.template.height + 2 * b) * scale
  return {
    transformOrigin: '0 0',
    transform:
      it.rotate === 90
        ? `translate(${h}px, 0) rotate(90deg)`
        : `translate(0, ${w}px) rotate(-90deg)`
  }
}
