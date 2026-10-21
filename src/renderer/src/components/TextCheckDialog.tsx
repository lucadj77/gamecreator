import { useEffect, useRef, useState } from 'react'
import type { BoundCard } from '../../../shared/model/bind'
import { Dialog } from '../editor/dialogs'
import { useI18n } from '../i18n/context'
import CardSvg from '../render/CardSvg'

interface Found {
  row: number
  side: 'front' | 'back'
  layers: string[]
}

/**
 * Controllo dei testi di tutte le carte del set, fronte e retro: le disegna fuori dalla vista,
 * aspetta i font e raccoglie i livelli di testo che escono dal riquadro (data-overflow)
 */
export default function TextCheckDialog({
  cards,
  onPick,
  onClose
}: {
  cards: BoundCard[]
  onPick(row: number): void
  onClose(): void
}): React.JSX.Element {
  const { t } = useI18n()
  const stage = useRef<HTMLDivElement>(null)
  const [found, setFound] = useState<Found[] | null>(null)

  useEffect(() => {
    let alive = true
    const collect = (): void => {
      const el = stage.current
      if (!alive || !el) return
      const out: Found[] = []
      for (const c of el.querySelectorAll<HTMLElement>('[data-row]')) {
        const layers = [...c.querySelectorAll('[data-overflow]')].map(
          (g) => g.getAttribute('data-overflow') ?? ''
        )
        if (layers.length)
          out.push({
            row: Number(c.dataset.row),
            side: c.dataset.side as Found['side'],
            layers: [...new Set(layers)]
          })
      }
      setFound(out)
    }
    // i font si caricano dopo il primo disegno; i testi da ridurre scendono in più passaggi
    void document.fonts.ready.then(() => setTimeout(collect, 600))
    return () => {
      alive = false
    }
  }, [cards])

  const label = (row: number): string => {
    const s = cards[row]?.label || String(row + 1)
    return s.length > 40 ? `${s.slice(0, 40)}…` : s
  }

  return (
    <Dialog title={t('textCheck.title')} onClose={onClose}>
      <div className="dialog-form text-check">
        {found === null ? (
          <p className="muted">{t('textCheck.running', { n: cards.length })}</p>
        ) : found.length === 0 ? (
          <p>{t('textCheck.none', { n: cards.length })}</p>
        ) : (
          <>
            <p className="muted small">{t('textCheck.found', { n: found.length })}</p>
            <ul className="text-check-list">
              {found.map((f) => (
                <li key={`${f.row}-${f.side}`}>
                  <button onClick={() => onPick(f.row)} title={t('textCheck.pick')}>
                    <strong>
                      {f.row + 1}. {label(f.row)}
                    </strong>{' '}
                    <span className="muted">
                      {t(f.side === 'front' ? 'preview.front' : 'preview.back')}:
                    </span>{' '}
                    {f.layers.join(', ')}
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
        <div className="dialog-buttons">
          <button className="primary" onClick={onClose}>
            {t('dialog.close')}
          </button>
        </div>
      </div>
      <div ref={stage} className="text-check-stage" aria-hidden>
        {cards.map((c, i) =>
          (['front', 'back'] as const)
            .filter((side) => c.template[side].length > 0)
            .map((side) => (
              <div key={`${i}-${side}`} data-row={i} data-side={side}>
                <CardSvg template={c.template} side={side} scale={2} />
              </div>
            ))
        )}
      </div>
    </Dialog>
  )
}
