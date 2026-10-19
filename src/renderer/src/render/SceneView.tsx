import type { Scene, ScenePage } from '../../../shared/export'
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
  const lines = p.lines.length > 0 && (
    <svg
      width={p.width * s.scale}
      height={p.height * s.scale}
      viewBox={`0 0 ${p.width} ${p.height}`}
      style={{ position: 'absolute', left: 0, top: 0 }}
    >
      {p.lines.map((l, i) => (
        <line key={i} {...l} stroke={s.lineColor} strokeWidth={s.lineWidth} strokeLinecap="butt" />
      ))}
    </svg>
  )
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
      {p.items.map((it, i) => (
        <div key={i} style={{ position: 'absolute', left: it.x * s.scale, top: it.y * s.scale }}>
          <CardSvg
            template={it.template}
            side={it.side}
            scale={s.scale}
            mode={it.mode}
            guides={false}
          />
        </div>
      ))}
      {s.linesOver && lines}
    </div>
  )
}
