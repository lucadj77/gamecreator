import { useRef } from 'react'

// Bordo trascinabile tra due pannelli. La larghezza scelta si ricorda per ogni pannello.

export default function Resizer({
  width,
  onChange,
  edge,
  min = 160,
  max = 520
}: {
  width: number
  onChange(w: number): void
  /** Da che parte sta il pannello rispetto al bordo */
  edge: 'left' | 'right'
  min?: number
  max?: number
}): React.JSX.Element {
  const start = useRef<{ x: number; w: number } | null>(null)
  return (
    <div
      className="resizer"
      role="separator"
      aria-orientation="vertical"
      onPointerDown={(e) => {
        start.current = { x: e.clientX, w: width }
        e.currentTarget.setPointerCapture(e.pointerId)
      }}
      onPointerMove={(e) => {
        const s = start.current
        if (!s) return
        const dx = e.clientX - s.x
        onChange(Math.min(max, Math.max(min, s.w + (edge === 'left' ? dx : -dx))))
      }}
      onPointerUp={() => (start.current = null)}
    />
  )
}
