import { useCallback, useEffect, useMemo, useState } from 'react'
import type { LoadedProject, LoadedSet } from '../../shared/project'
import { messageFromError, type Message } from '../../shared/messages'
import { bindCard, rowToCard, type BoundCard } from '../../shared/model/bind'
import type { Side, Template } from '../../shared/model/template'
import DataTable from './components/DataTable'
import CardGrid from './components/CardGrid'
import CardSvg from './render/CardSvg'
import { AssetsContext } from './render/assets'
import { LANGUAGES, useI18n, type Language } from './i18n/context'

const LAST_FOLDER_KEY = 'lastProjectFolder'
const VIEW_KEY = 'setView'

type View = 'table' | 'grid'

function App(): React.JSX.Element {
  const { t, lang, setLang } = useI18n()
  const [project, setProject] = useState<LoadedProject | null>(null)
  const [setIndex, setSetIndex] = useState(0)
  const [error, setError] = useState<Message | null>(null)
  const [loading, setLoading] = useState(false)

  const load = useCallback(async (folder: string) => {
    setLoading(true)
    setError(null)
    try {
      const loaded = await window.api.loadProject(folder)
      setProject(loaded)
      setSetIndex((i) => (i < loaded.sets.length ? i : 0))
      localStorage.setItem(LAST_FOLDER_KEY, folder)
    } catch (e) {
      setError(messageFromError(e))
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

  const current = project?.sets[setIndex]

  return (
    <AssetsContext.Provider value={project?.assets ?? []}>
      <div className="app">
        <header className="toolbar">
          <button onClick={open}>{t('app.openProject')}</button>
          {project && (
            <>
              <button onClick={() => load(project.folder)}>{t('app.reload')}</button>
              <span className="project-name">{project.file.name}</span>
              <span className="project-path">{project.folder}</span>
            </>
          )}
          {loading && <span className="muted">{t('app.loading')}</span>}
          <span className="spacer" />
          <label className="muted">
            {t('app.language')}{' '}
            <select value={lang} onChange={(e) => setLang(e.target.value as Language)}>
              {Object.entries(LANGUAGES).map(([code, name]) => (
                <option key={code} value={code}>
                  {name}
                </option>
              ))}
            </select>
          </label>
        </header>

        {error && <div className="banner error">{t(error)}</div>}
        {project?.warnings.map((w, i) => (
          <div key={i} className="banner warning">
            {t(w)}
          </div>
        ))}

        {project ? (
          <main className="workspace">
            <nav className="sidebar">
              <h2>{t('sidebar.sets')}</h2>
              <ul>
                {project.sets.map((s, i) => (
                  <li key={s.name}>
                    <button
                      className={i === setIndex ? 'active' : ''}
                      onClick={() => setSetIndex(i)}
                    >
                      <span>{s.name}</span>
                      <span className="muted">{s.data ? countCards(s.data) : '–'}</span>
                    </button>
                  </li>
                ))}
              </ul>
              <h2>{t('sidebar.templates')}</h2>
              <ul>
                {project.templates.map((tpl) => (
                  <li key={tpl.name} className="static">
                    {tpl.name}{' '}
                    <span className="muted">
                      {tpl.width}×{tpl.height}
                    </span>
                  </li>
                ))}
              </ul>
              {project.unusedSheets.length > 0 && (
                <p className="muted small">
                  {t('sidebar.unusedSheets', { names: project.unusedSheets.join(', ') })}
                </p>
              )}
            </nav>
            {current ? (
              <SetView key={current.name} set={current} templates={project.templates} />
            ) : (
              <section className="content" />
            )}
          </main>
        ) : (
          !error && (
            <div className="empty">
              <p>{t('app.empty')}</p>
            </div>
          )
        )}
      </div>
    </AssetsContext.Provider>
  )
}

function SetView({ set, templates }: { set: LoadedSet; templates: Template[] }): React.JSX.Element {
  const { t } = useI18n()
  const [selected, setSelected] = useState(0)
  const [side, setSide] = useState<Side>('front')
  const [view, setViewState] = useState<View>(() =>
    localStorage.getItem(VIEW_KEY) === 'grid' ? 'grid' : 'table'
  )
  const setView = (v: View): void => {
    localStorage.setItem(VIEW_KEY, v)
    setViewState(v)
  }

  const template = templates.find((tpl) => tpl.name === set.template) ?? null
  const cards = useMemo<BoundCard[]>(() => {
    if (!template || !set.data) return []
    const { headers, rows } = set.data
    return rows.map((row) => bindCard(template, rowToCard(headers, row)))
  }, [template, set.data])

  if (!set.data) {
    return (
      <section className="content">
        <p className="muted">{t('set.noData')}</p>
      </section>
    )
  }
  const card = cards[selected]

  return (
    <>
      <section className="content">
        <div className="set-header">
          <h1>{set.name}</h1>
          <span className="muted">
            {t('set.template', { name: set.template })} ·{' '}
            {t('set.counts', { rows: set.data.rows.length, cards: countCards(set.data) })}
          </span>
          <span className="spacer" />
          <Segmented<View>
            value={view}
            options={[
              ['table', t('set.table')],
              ['grid', t('set.grid')]
            ]}
            onChange={setView}
          />
        </div>
        {view === 'table' || !template ? (
          <DataTable sheet={set.data} selected={selected} onSelect={setSelected} />
        ) : (
          <CardGrid
            cards={cards}
            side={side}
            selected={selected}
            onSelect={setSelected}
            scale={2.6}
          />
        )}
      </section>
      <aside className="preview">
        <div className="preview-header">
          <h2>{t('preview.title')}</h2>
          <Segmented<Side>
            value={side}
            options={[
              ['front', t('preview.front')],
              ['back', t('preview.back')]
            ]}
            onChange={setSide}
          />
        </div>
        {!template ? (
          <p className="muted">{t('preview.noTemplate', { name: set.template })}</p>
        ) : card ? (
          <>
            <div className="preview-card">
              <CardSvg template={card.template} side={side} scale={4.4} />
            </div>
            {card.problems.length > 0 && (
              <div className="problems">
                <h3>{t('preview.problems')}</h3>
                <ul>
                  {card.problems.map((p, i) => (
                    <li key={i}>{t(p)}</li>
                  ))}
                </ul>
              </div>
            )}
          </>
        ) : (
          <p className="muted">{t('preview.selectRow')}</p>
        )}
      </aside>
    </>
  )
}

function Segmented<T extends string>({
  value,
  options,
  onChange
}: {
  value: T
  options: [T, string][]
  onChange(v: T): void
}): React.JSX.Element {
  return (
    <div className="segmented" role="group">
      {options.map(([v, label]) => (
        <button
          key={v}
          className={v === value ? 'active' : ''}
          aria-pressed={v === value}
          onClick={() => onChange(v)}
        >
          {label}
        </button>
      ))}
    </div>
  )
}

/** Numero di carte del set, sommando la colonna amount quando presente */
function countCards(sheet: { headers: string[]; rows: string[][] }): number {
  const col = sheet.headers.indexOf('amount')
  if (col < 0) return sheet.rows.length
  return sheet.rows.reduce((sum, r) => {
    const n = parseInt(r[col], 10)
    return sum + (Number.isFinite(n) && n >= 0 ? n : 1)
  }, 0)
}

export default App
