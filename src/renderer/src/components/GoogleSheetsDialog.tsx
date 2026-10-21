import { useState } from 'react'
import { messageFromError, type Message } from '../../../shared/messages'
import { googleSheetId, matchTabs } from '../../../shared/model/googleSheets'
import type { LoadedProject, Sheet } from '../../../shared/project'
import { Dialog } from '../editor/dialogs'
import { useI18n } from '../i18n/context'

/** Una scheda del foglio Google e il set che ne riceve i dati */
export interface SheetImport {
  set: string
  sheet: Sheet
}

/**
 * Importa i dati da un foglio Google condiviso con il link: ogni scheda prende il posto dei dati
 * del set scelto (di solito quello con lo stesso nome). Il link resta nel progetto.
 */
export default function GoogleSheetsDialog({
  project,
  onImport,
  onClose
}: {
  project: LoadedProject
  onImport(link: string, imports: SheetImport[]): void
  onClose(): void
}): React.JSX.Element {
  const { t } = useI18n()
  const [link, setLink] = useState(project.file.googleSheet ?? '')
  const [tabs, setTabs] = useState<Sheet[] | null>(null)
  const [targets, setTargets] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<Message | null>(null)

  const download = async (): Promise<void> => {
    setBusy(true)
    setError(null)
    setTabs(null)
    try {
      const sheets = await window.api.fetchGoogleSheet(link.trim())
      setTabs(sheets)
      setTargets(
        matchTabs(
          sheets.map((s) => s.name),
          project.sets
        )
      )
    } catch (e) {
      setError(messageFromError(e))
    } finally {
      setBusy(false)
    }
  }

  const chosen = Object.values(targets).filter(Boolean)
  const imports: SheetImport[] = (tabs ?? [])
    .filter((s) => targets[s.name])
    .map((sheet) => ({ set: targets[sheet.name], sheet }))

  return (
    <Dialog title={t('gsheets.title')} onClose={onClose}>
      <div className="dialog-form gsheets-dialog">
        <p className="muted small">{t('gsheets.hint')}</p>
        <label>
          {t('gsheets.link')}
          <span className="gsheets-link">
            <input
              value={link}
              placeholder="https://docs.google.com/spreadsheets/d/…"
              onChange={(e) => setLink(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && googleSheetId(link)) void download()
              }}
            />
            <button disabled={busy || !googleSheetId(link)} onClick={download}>
              {busy ? t('gsheets.downloading') : t('gsheets.download')}
            </button>
          </span>
        </label>
        {link.trim() && !googleSheetId(link) && (
          <p className="field-error">{t('gsheets.badLink')}</p>
        )}
        {error && <p className="field-error">{t(error)}</p>}
        {tabs && !tabs.length && <p>{t('gsheets.empty')}</p>}
        {tabs && tabs.length > 0 && (
          <table className="gsheets-table">
            <thead>
              <tr>
                <th>{t('gsheets.tab')}</th>
                <th>{t('gsheets.rows')}</th>
                <th>{t('gsheets.target')}</th>
              </tr>
            </thead>
            <tbody>
              {tabs.map((s) => {
                const target = targets[s.name]
                const old = project.sets.find((x) => x.name === target)?.data
                const gone = old ? old.headers.filter((h) => !s.headers.includes(h)) : []
                return (
                  <tr key={s.name}>
                    <td>{s.name}</td>
                    <td>{s.rows.length}</td>
                    <td>
                      <select
                        value={target}
                        onChange={(e) => setTargets({ ...targets, [s.name]: e.target.value })}
                      >
                        <option value="">{t('gsheets.skip')}</option>
                        {project.sets.map((x) => (
                          <option
                            key={x.name}
                            value={x.name}
                            disabled={x.name !== target && chosen.includes(x.name)}
                          >
                            {x.name}
                          </option>
                        ))}
                      </select>
                      {gone.length > 0 && (
                        <div className="field-note small">
                          {t('gsheets.lost', { columns: gone.join(', ') })}
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
        <div className="dialog-buttons">
          <button onClick={onClose}>{t('dialog.cancel')}</button>
          <button
            className="primary"
            disabled={!imports.length}
            onClick={() => onImport(link.trim(), imports)}
          >
            {t('gsheets.import', { n: imports.length })}
          </button>
        </div>
      </div>
    </Dialog>
  )
}
