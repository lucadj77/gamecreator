import { useCallback, useEffect, useState } from 'react'
import type { LoadedProject } from '../../shared/project'
import DataTable from './components/DataTable'

const LAST_FOLDER_KEY = 'lastProjectFolder'

function App(): React.JSX.Element {
  const [project, setProject] = useState<LoadedProject | null>(null)
  const [selected, setSelected] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const load = useCallback(async (folder: string) => {
    setLoading(true)
    setError(null)
    try {
      const loaded = await window.api.loadProject(folder)
      setProject(loaded)
      setSelected(0)
      localStorage.setItem(LAST_FOLDER_KEY, folder)
    } catch (e) {
      // gli errori IPC arrivano con un prefisso tecnico di Electron
      setError(
        (e as Error).message.replace(/^Error invoking remote method '[^']+': (Error: )?/, '')
      )
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const last = localStorage.getItem(LAST_FOLDER_KEY)
    // ripristino una tantum dell'ultimo progetto aperto
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (last) load(last)
  }, [load])

  const open = async (): Promise<void> => {
    const folder = await window.api.chooseProjectFolder()
    if (folder) load(folder)
  }

  const current = project?.sets[selected]

  return (
    <div className="app">
      <header className="toolbar">
        <button onClick={open}>Apri progetto</button>
        {project && (
          <>
            <button onClick={() => load(project.folder)}>Ricarica</button>
            <span className="project-name">{project.file.name}</span>
            <span className="project-path">{project.folder}</span>
          </>
        )}
        {loading && <span className="muted">Caricamento…</span>}
      </header>

      {error && <div className="banner error">{error}</div>}
      {project?.warnings.map((w) => (
        <div key={w} className="banner warning">
          {w}
        </div>
      ))}

      {project ? (
        <main className="workspace">
          <nav className="sidebar">
            <h2>Set</h2>
            <ul>
              {project.sets.map((s, i) => (
                <li key={s.name}>
                  <button className={i === selected ? 'active' : ''} onClick={() => setSelected(i)}>
                    <span>{s.name}</span>
                    <span className="muted">{s.data ? countCards(s.data) : '–'}</span>
                  </button>
                </li>
              ))}
            </ul>
            {project.unusedSheets.length > 0 && (
              <p className="muted small">Fogli non collegati: {project.unusedSheets.join(', ')}</p>
            )}
          </nav>
          <section className="content">
            {current?.data ? (
              <>
                <h1>
                  {current.name} <span className="muted">template: {current.template}</span>
                </h1>
                <DataTable sheet={current.data} />
              </>
            ) : (
              <p className="muted">Nessun dato per questo set.</p>
            )}
          </section>
        </main>
      ) : (
        !error && (
          <div className="empty">
            <p>Apri una cartella che contiene un file gamecreator.json.</p>
          </div>
        )
      )}
    </div>
  )
}

/** Numero di carte del set, sommando la colonna amount quando presente */
function countCards(sheet: { headers: string[]; rows: string[][] }): number {
  const col = sheet.headers.indexOf('amount')
  if (col < 0) return sheet.rows.length
  return sheet.rows.reduce((sum, r) => sum + (parseInt(r[col], 10) || 1), 0)
}

export default App
