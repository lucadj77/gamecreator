import { useState } from 'react'
import type { BoundCard } from '../../../shared/model/bind'
import type { Side } from '../../../shared/model/template'
import CardSvg from '../render/CardSvg'
import { useI18n } from '../i18n/context'

interface Props {
  cards: BoundCard[]
  side: Side
  selected: number
  onSelect(index: number): void
  /** Trascinando una carta: `to` è la posizione che avrà dopo lo spostamento */
  onMove?(from: number, to: number): void
  /** Pixel per millimetro */
  scale: number
}

function CardGrid({ cards, side, selected, onSelect, onMove, scale }: Props): React.JSX.Element {
  const { t } = useI18n()
  const [dragging, setDragging] = useState<number | null>(null)
  const [drop, setDrop] = useState<{ index: number; after: boolean } | null>(null)
  const reset = (): void => {
    setDragging(null)
    setDrop(null)
  }
  return (
    <div className="card-grid">
      {cards.map((c, i) => (
        <button
          key={i}
          className={[
            'card-cell',
            i === selected && 'selected',
            dragging === i && 'dragging',
            drop?.index === i && dragging !== i && (drop.after ? 'drop-after' : 'drop-before')
          ]
            .filter(Boolean)
            .join(' ')}
          onClick={() => onSelect(i)}
          draggable={!!onMove}
          onDragStart={(e) => {
            e.dataTransfer.effectAllowed = 'move'
            e.dataTransfer.setData('text/plain', String(i + 1))
            setDragging(i)
          }}
          onDragEnd={reset}
          onDragOver={(e) => {
            if (dragging === null) return
            e.preventDefault()
            // metà sinistra: prima della carta, metà destra: dopo
            const r = e.currentTarget.getBoundingClientRect()
            const after = e.clientX > r.left + r.width / 2
            if (drop?.index !== i || drop.after !== after) setDrop({ index: i, after })
          }}
          onDrop={(e) => {
            e.preventDefault()
            if (dragging !== null && drop && onMove) {
              let to = drop.index + (drop.after ? 1 : 0)
              if (dragging < to) to -= 1
              if (to !== dragging) onMove(dragging, to)
            }
            reset()
          }}
        >
          <CardSvg template={c.template} side={side} scale={scale} />
          <span className="card-caption" title={`${i + 1}`}>
            <span className="card-label">{c.label || i + 1}</span>
            {c.amount !== 1 && <span className="muted"> {t('set.copies', { n: c.amount })}</span>}
            {c.problems.length > 0 && <span className="problem-dot" aria-label="!" />}
          </span>
        </button>
      ))}
    </div>
  )
}

export default CardGrid
