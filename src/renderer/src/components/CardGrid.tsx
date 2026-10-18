import type { BoundCard } from '../../../shared/model/bind'
import type { Side } from '../../../shared/model/template'
import CardSvg from '../render/CardSvg'
import { useI18n } from '../i18n/context'

interface Props {
  cards: BoundCard[]
  side: Side
  selected: number
  onSelect(index: number): void
  /** Pixel per millimetro */
  scale: number
}

function CardGrid({ cards, side, selected, onSelect, scale }: Props): React.JSX.Element {
  const { t } = useI18n()
  return (
    <div className="card-grid">
      {cards.map((c, i) => (
        <button
          key={i}
          className={`card-cell${i === selected ? ' selected' : ''}`}
          onClick={() => onSelect(i)}
        >
          <CardSvg template={c.template} side={side} scale={scale} />
          <span className="card-caption">
            {i + 1} <span className="muted">{t('set.copies', { n: c.amount })}</span>
            {c.problems.length > 0 && <span className="problem-dot" aria-label="!" />}
          </span>
        </button>
      ))}
    </div>
  )
}

export default CardGrid
