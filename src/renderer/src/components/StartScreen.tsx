import { useEffect, useState } from 'react'
import type { RecentProject } from '../../../shared/api'
import { projectFolderName } from '../../../shared/model/projectName'
import { messageFromError, type Message } from '../../../shared/messages'
import { Dialog } from '../editor/dialogs'
import { useI18n } from '../i18n/context'

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
        <h1>GameCreator</h1>
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
      const folder = await window.api.createProject(name, parent.trim())
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
