import { useEffect, useRef } from 'react'
import type { Bounds } from '../../../shared/model/edit'
import type { Layer } from '../../../shared/model/template'
import { useI18n } from '../i18n/context'

/**
 * Doppio clic su un livello fisso o con formula: il valore non si modifica dalla carta. Il
 * riquadro dice da dove arriva e porta all'editor del template.
 */
export default function ValueInfo({
  layer,
  box,
  scale,
  onEditTemplate,
  onClose
}: {
  layer: Layer
  box: Bounds
  scale: number
  onEditTemplate(): void
  onClose(): void
}): React.JSX.Element {
  const { t } = useI18n()
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const onDown = (e: PointerEvent): void => {
      if (!ref.current?.contains(e.target as Node)) onClose()
    }
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('pointerdown', onDown, true)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('pointerdown', onDown, true)
      window.removeEventListener('keydown', onKey)
    }
  }, [onClose])
  const src = layer.source
  return (
    <div
      ref={ref}
      className="value-info"
      style={{ left: box.x * scale, top: (box.y + box.h) * scale + 4 }}
      onClick={(e) => e.stopPropagation()}
      onDoubleClick={(e) => e.stopPropagation()}
    >
      <strong>{layer.name}</strong>
      <span>
        {src.kind === 'formula' ? t('valueInfo.formula', { expr: src.expr }) : t('valueInfo.fixed')}
      </span>
      <button className="small-btn" onClick={onEditTemplate}>
        {t('preview.editTemplate')}
      </button>
    </div>
  )
}
