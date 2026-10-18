import { useI18n } from '../i18n/context'
import type { PanelSide } from './usePanelWidth'

/** Sposta il pannello sull'altro lato della finestra; la freccia indica dove andrà */
export default function PanelSideButton({
  side,
  onToggle,
  className
}: {
  side: PanelSide
  onToggle(): void
  className?: string
}): React.JSX.Element {
  const { t } = useI18n()
  return (
    <button
      className={`icon-btn panel-side-btn${className ? ` ${className}` : ''}`}
      title={side === 'left' ? t('panel.moveRight') : t('panel.moveLeft')}
      onClick={(e) => {
        e.stopPropagation()
        onToggle()
      }}
    >
      {side === 'left' ? '⇥' : '⇤'}
    </button>
  )
}
