import { Dialog } from '../editor/dialogs'
import { useI18n } from '../i18n/context'

// Solo nella versione web: cosa c'è in più nell'app desktop, con il link per scaricarla.
// Quando una di queste funzioni arriva anche nel web, la sua voce si toglie da qui.

const RELEASES = 'https://github.com/lucadj77/naibi/releases'

const ITEMS = [
  'web.desktop.pdf',
  'web.desktop.tts',
  'web.desktop.fonts',
  'web.desktop.catalogs',
  'web.desktop.ai',
  'web.desktop.browser'
] as const

export default function DesktopFeaturesDialog({ onClose }: { onClose(): void }): React.JSX.Element {
  const { t } = useI18n()
  return (
    <Dialog title={t('web.desktopTitle')} onClose={onClose}>
      <div className="about-text">
        <p>{t('web.desktopIntro')}</p>
        <ul>
          {ITEMS.map((key) => (
            <li key={key}>{t(key)}</li>
          ))}
        </ul>
        <p>{t('web.desktopOutro')}</p>
      </div>
      <div className="dialog-buttons">
        <a className="button" href={RELEASES} target="_blank" rel="noreferrer">
          {t('web.download')}
        </a>
        <button className="primary" autoFocus onClick={onClose}>
          {t('about.close')}
        </button>
      </div>
    </Dialog>
  )
}
