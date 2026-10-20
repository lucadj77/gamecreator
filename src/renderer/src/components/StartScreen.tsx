import { useEffect, useState } from 'react'
import type { RecentProject } from '../../../shared/api'
import { projectFolderName } from '../../../shared/model/projectName'
import { isPrerelease } from '../../../shared/update'
import { messageFromError, type Message } from '../../../shared/messages'
import { Dialog } from '../editor/dialogs'
import { useI18n } from '../i18n/context'
import appIcon from '../assets/app-icon.png'
import AiToolsDialog from './AiToolsDialog'
import { WhatsNewDialog } from './UpdateNotice'
import { checkForUpdateNow } from './updateCheck'

// Schermata di ingresso: progetti recenti con miniatura, nuovo progetto, apertura e importazione.

const PARENT_KEY = 'newProjectParent'

export default function StartScreen({
  error,
  loading,
  settings,
  onOpen,
  onChoose,
  onImport
}: {
  error: Message | null
  loading: boolean
  /** Dimensione dell'interfaccia, tema e lingua */
  settings: React.ReactNode
  onOpen(folder: string): void
  /** Sceglie una cartella di progetto e la apre */
  onChoose(): void
  onImport(): void
}): React.JSX.Element {
  const { t, lang } = useI18n()
  const [recent, setRecent] = useState<RecentProject[] | null>(null)
  const [creating, setCreating] = useState(false)
  const [about, setAbout] = useState(false)
  const [aiTools, setAiTools] = useState(false)
  const [version, setVersion] = useState<string | null>(null)
  const [whatsNew, setWhatsNew] = useState(false)

  useEffect(() => {
    window.api.appVersion().then(setVersion, () => {})
  }, [])

  useEffect(() => {
    let live = true
    window.api.recentProjects().then(
      (list) => live && setRecent(list),
      () => live && setRecent([])
    )
    return () => {
      live = false
    }
  }, [])

  const remove = async (folder: string): Promise<void> => {
    await window.api.removeRecentProject(folder)
    setRecent((list) => list && list.filter((p) => p.folder !== folder))
  }

  const date = (ms: number): string =>
    new Date(ms).toLocaleDateString(lang, { day: 'numeric', month: 'short', year: 'numeric' })

  return (
    <div className="start">
      <header className="start-header">
        <img className="start-logo" src={appIcon} alt="" draggable={false} />
        <h1>Naibi</h1>
        {version && (
          <button
            className="start-version"
            title={t('update.whatsNewTip')}
            onClick={() => setWhatsNew(true)}
          >
            {version}
            {isPrerelease(version) && <span className="beta-badge">beta</span>}
          </button>
        )}
        <span className="spacer" />
        {settings}
      </header>
      {error && <div className="banner error">{t(error)}</div>}
      <div className="start-body">
        <div className="start-actions">
          <button className="primary" onClick={() => setCreating(true)} title={t('tip.newProject')}>
            {t('start.newProject')}
          </button>
          <button onClick={onChoose} title={t('tip.openProject')}>
            {t('start.openProject')}
          </button>
          <button onClick={onImport} title={t('tip.importTtc')}>
            {t('start.importTtc')}
          </button>
          <button onClick={() => setAiTools(true)} title={t('tip.aiTools')}>
            {t('app.aiTools')}
          </button>
          {loading && <span className="muted">{t('app.loading')}</span>}
        </div>
        <h2 className="start-title">{t('start.recent')}</h2>
        {recent && recent.length === 0 && <p className="muted">{t('start.noRecent')}</p>}
        <ul className="recent-list">
          {recent?.map((p) => (
            <li key={p.folder} className={p.missing ? 'missing' : ''}>
              <button
                className="recent-open"
                disabled={p.missing || loading}
                onClick={() => onOpen(p.folder)}
                title={p.missing ? t('start.missing') : p.folder}
              >
                <span className="recent-thumb">
                  {p.thumbnail ? (
                    <img src={p.thumbnail} alt="" draggable={false} />
                  ) : (
                    <span className="recent-initial">{p.name.trim().charAt(0).toUpperCase()}</span>
                  )}
                </span>
                <span className="recent-name">{p.name}</span>
                <span className="recent-meta muted small">
                  {p.missing ? t('start.missing') : date(p.openedAt)}
                </span>
                <span className="recent-path muted small">{p.folder}</span>
              </button>
              <button
                className="icon-btn recent-remove"
                title={t('start.remove')}
                onClick={() => remove(p.folder)}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      </div>
      <footer className="start-footer">
        {version && (
          <button className="about-link" onClick={() => setWhatsNew(true)}>
            {t('update.whatsNew')}
          </button>
        )}
        <button className="about-link" onClick={checkForUpdateNow}>
          {t('update.check')}
        </button>
        <button className="about-link" onClick={() => setAbout(true)}>
          {t('about.link')}
        </button>
      </footer>
      {whatsNew && version && (
        <WhatsNewDialog version={version} onClose={() => setWhatsNew(false)} />
      )}
      {about && <AboutDialog onClose={() => setAbout(false)} />}
      {aiTools && <AiToolsDialog onClose={() => setAiTools(false)} />}
      {creating && (
        <NewProjectDialog
          onCreate={(folder) => {
            setCreating(false)
            onOpen(folder)
          }}
          onClose={() => setCreating(false)}
        />
      )}
    </div>
  )
}

function NewProjectDialog({
  onCreate,
  onClose
}: {
  onCreate(folder: string): void
  onClose(): void
}): React.JSX.Element {
  const { t } = useI18n()
  const [name, setName] = useState('')
  const [parent, setParent] = useState(() => localStorage.getItem(PARENT_KEY) ?? '')
  const [error, setError] = useState<Message | null>(null)
  const [busy, setBusy] = useState(false)
  const [data, setData] = useState<'xlsx' | 'ods'>('xlsx')

  useEffect(() => {
    if (parent) return
    window.api.defaultProjectsFolder().then((f) => setParent((p) => p || f))
  }, [parent])

  const folderName = projectFolderName(name)
  const sep = parent.includes('\\') && !parent.includes('/') ? '\\' : '/'
  const target = folderName && parent ? parent.replace(/[\\/]+$/, '') + sep + folderName : ''

  const create = async (): Promise<void> => {
    setBusy(true)
    setError(null)
    try {
      const folder = await window.api.createProject(name, parent.trim(), data)
      localStorage.setItem(PARENT_KEY, parent.trim())
      onCreate(folder)
    } catch (e) {
      setError(messageFromError(e))
      setBusy(false)
    }
  }

  return (
    <Dialog title={t('newProject.title')} onClose={onClose}>
      <form
        className="dialog-form new-project"
        onSubmit={(e) => {
          e.preventDefault()
          if (target && !busy) create()
        }}
      >
        <label>
          {t('prop.name')}
          <input autoFocus value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label>
          {t('newProject.location')}
          <span className="field-control">
            <input value={parent} title={parent} onChange={(e) => setParent(e.target.value)} />
            <button
              type="button"
              title={t('tip.chooseFolder')}
              onClick={async () => {
                const f = await window.api.chooseFolder(parent || undefined)
                if (f) setParent(f)
              }}
            >
              {t('export.choose')}
            </button>
          </span>
        </label>
        <label>
          {t('newProject.dataFile')}
          <select value={data} onChange={(e) => setData(e.target.value as 'xlsx' | 'ods')}>
            <option value="xlsx">{t('newProject.xlsx')}</option>
            <option value="ods">{t('newProject.ods')}</option>
          </select>
        </label>
        <p className="field-note">
          {target ? t('newProject.folder', { folder: target }) : t('newProject.hint')}
        </p>
        {error && <p className="field-error">{t(error)}</p>}
        <div className="dialog-buttons">
          <button type="button" onClick={onClose}>
            {t('dialog.cancel')}
          </button>
          <button type="submit" className="primary" disabled={!target || busy}>
            {t('newTemplate.create')}
          </button>
        </div>
      </form>
    </Dialog>
  )
}

const ABOUT_PARAGRAPHS = ['about.p1', 'about.p2', 'about.p3', 'about.p4', 'about.p5'] as const

/** Le parole tra due asterischi vanno in grassetto, quelle tra un asterisco in corsivo */
function emphasis(text: string): React.ReactNode[] {
  return text
    .split(/(\*\*[^*]+\*\*|\*[^*]+\*)/)
    .map((part, i) =>
      part.startsWith('**') ? (
        <strong key={i}>{part.slice(2, -2)}</strong>
      ) : part.startsWith('*') ? (
        <em key={i}>{part.slice(1, -1)}</em>
      ) : (
        part
      )
    )
}

/** Origine del nome dell'app */
function AboutDialog({ onClose }: { onClose(): void }): React.JSX.Element {
  const { t } = useI18n()
  return (
    <Dialog title={t('about.title')} onClose={onClose}>
      <div className="about-text">
        {ABOUT_PARAGRAPHS.map((key) => (
          <p key={key}>{emphasis(t(key))}</p>
        ))}
      </div>
      <div className="dialog-buttons">
        <button className="primary" autoFocus onClick={onClose}>
          {t('about.close')}
        </button>
      </div>
    </Dialog>
  )
}
