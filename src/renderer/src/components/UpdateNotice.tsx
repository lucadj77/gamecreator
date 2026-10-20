import { useEffect, useState } from 'react'
import changelog from '../../../../CHANGELOG.md?raw'
import { changelogSection, notesForLanguage, type UpdateInfo } from '../../../shared/update'
import { Dialog } from '../editor/dialogs'
import { useI18n } from '../i18n/context'
import { CHECK_EVENT, checkForUpdateNow } from './updateCheck'

// Avviso di una nuova versione, controllata all'avvio, con le novità nella lingua
// dell'interfaccia. Una versione saltata non si ripresenta; "più tardi" vale fino al prossimo avvio.
// Il controllo si può anche chiedere a mano (checkForUpdateNow): allora vale anche una versione
// saltata e, se non c'è niente di nuovo, l'avviso dice che la versione è l'ultima.

const SKIPPED_KEY = 'skippedUpdate'
const RELEASES_PAGE = 'https://github.com/lucadj77/naibi/releases'

function skipped(): string | null {
  try {
    return localStorage.getItem(SKIPPED_KEY)
  } catch {
    return null
  }
}

export default function UpdateNotice(): React.JSX.Element | null {
  const { t, lang } = useI18n()
  const [update, setUpdate] = useState<UpdateInfo | null>(null)
  const [open, setOpen] = useState(false)
  /** Esito di un controllo a mano senza novità: la versione è l'ultima, o non si è potuto verificare */
  const [result, setResult] = useState<'latest' | 'failed' | 'checking' | null>(null)

  useEffect(() => {
    let live = true
    window.api.checkForUpdate().then(
      (u) => live && u && u.version !== skipped() && setUpdate(u),
      () => {}
    )
    const manual = (): void => {
      setResult('checking')
      window.api.checkForUpdate().then(
        (u) => {
          if (!live) return
          setUpdate(u)
          setResult(u ? null : 'latest')
        },
        () => live && setResult('failed')
      )
    }
    window.addEventListener(CHECK_EVENT, manual)
    return () => {
      live = false
      window.removeEventListener(CHECK_EVENT, manual)
    }
  }, [])

  if (!update) {
    if (!result) return null
    return (
      <div className={`banner update-notice ${result === 'failed' ? 'error' : 'info'}`}>
        <span>{t(`update.${result}`)}</span>
        <span className="spacer" />
        {result !== 'checking' && (
          <button className="link" onClick={() => setResult(null)}>
            {t('about.close')}
          </button>
        )}
      </div>
    )
  }
  const skip = (): void => {
    try {
      localStorage.setItem(SKIPPED_KEY, update.version)
    } catch {
      // senza memoria locale l'avviso torna al prossimo avvio
    }
    setUpdate(null)
  }
  // la pagina della release si apre nel browser (vedi setWindowOpenHandler)
  const download = (
    <button className="primary" onClick={() => window.open(update.url)}>
      {t('update.download')}
    </button>
  )

  return (
    <div className="banner info update-notice">
      <span>{t('update.available', { version: update.version })}</span>
      <button onClick={() => setOpen(true)}>{t('update.whatsNew')}</button>
      {download}
      <span className="spacer" />
      <button className="link" onClick={skip}>
        {t('update.skip')}
      </button>
      <button className="link" onClick={() => setUpdate(null)}>
        {t('update.later')}
      </button>
      {open && (
        <Dialog
          title={t('update.title', { version: update.version })}
          onClose={() => setOpen(false)}
        >
          <ReleaseNotes text={notesForLanguage(update.notes, lang)} empty={t('update.noNotes')} />
          <div className="dialog-buttons">
            <button onClick={() => setOpen(false)}>{t('about.close')}</button>
            {download}
          </div>
        </Dialog>
      )}
    </div>
  )
}

/** Le novità della versione in uso, da CHANGELOG.md incluso nell'app: si leggono anche senza rete */
export function WhatsNewDialog({
  version,
  onClose
}: {
  version: string
  onClose: () => void
}): React.JSX.Element {
  const { t, lang } = useI18n()
  const notes = changelogSection(changelog, version) ?? ''
  return (
    <Dialog title={t('update.title', { version })} onClose={onClose}>
      <ReleaseNotes text={notesForLanguage(notes, lang)} empty={t('update.noNotes')} />
      <div className="dialog-buttons">
        <button className="link" onClick={() => window.open(RELEASES_PAGE)}>
          {t('update.allVersions')}
        </button>
        <span className="spacer" />
        <button
          onClick={() => {
            onClose()
            checkForUpdateNow()
          }}
        >
          {t('update.check')}
        </button>
        <button className="primary" onClick={onClose}>
          {t('about.close')}
        </button>
      </div>
    </Dialog>
  )
}

/** Le note in Markdown semplice: titoli, elenchi puntati e paragrafi, con grassetto e codice */
function ReleaseNotes({ text, empty }: { text: string; empty: string }): React.JSX.Element {
  if (!text) return <p className="muted">{empty}</p>
  const blocks: React.ReactNode[] = []
  let items: string[] = []
  const flush = (): void => {
    if (items.length)
      blocks.push(
        <ul key={blocks.length}>
          {items.map((item, i) => (
            <li key={i}>{inline(item)}</li>
          ))}
        </ul>
      )
    items = []
  }
  for (const line of text.split('\n')) {
    const item = /^\s*[-*]\s+(.*)$/.exec(line)
    const heading = /^#{1,6}\s+(.*)$/.exec(line)
    if (item) items.push(item[1])
    else if (items.length && /^\s+\S/.test(line)) items[items.length - 1] += ' ' + line.trim()
    else {
      flush()
      if (heading) blocks.push(<h3 key={blocks.length}>{inline(heading[1])}</h3>)
      else if (line.trim()) blocks.push(<p key={blocks.length}>{inline(line)}</p>)
    }
  }
  flush()
  return <div className="release-notes">{blocks}</div>
}

function inline(text: string): React.ReactNode[] {
  return text
    .split(/(\*\*[^*]+\*\*|`[^`]+`)/)
    .map((part, i) =>
      part.startsWith('**') ? (
        <strong key={i}>{part.slice(2, -2)}</strong>
      ) : part.startsWith('`') ? (
        <code key={i}>{part.slice(1, -1)}</code>
      ) : (
        part
      )
    )
}
