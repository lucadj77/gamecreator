import { useState } from 'react'
import { messageFromError, type Message } from '../../../shared/messages'
import { applyImport, previewImport } from '../../../shared/model/importSheet'
import type { LoadedProject, Sheet } from '../../../shared/project'
import { Dialog } from '../editor/dialogs'
import { useI18n } from '../i18n/context'

/** Al massimo tanti nomi di righe per gruppo nell'anteprima */
const NAMES = 8

/**
 * Importa in un set un foglio di un altro file (.xlsx, .ods, .csv): si sceglie il file, il foglio
 * e il set, si vede cosa cambia, e le righe del file prendono il posto di quelle del set
 */
export default function ImportSheetDialog({
  project,
  initialSet,
  onImport,
  onClose
}: {
  project: LoadedProject
  initialSet?: string
  onImport(set: string, sheet: Sheet, file: string): void
  onClose(): void
}): React.JSX.Element {
  const { t } = useI18n()
  const [source, setSource] = useState<{ file: string; sheets: Sheet[] } | null>(null)
  const [sheetName, setSheetName] = useState('')
  const [target, setTarget] = useState(initialSet ?? project.sets[0]?.name ?? '')
  const [keep, setKeep] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<Message | null>(null)

  const choose = async (): Promise<void> => {
    setBusy(true)
    setError(null)
    try {
      const picked = await window.api.chooseImportFile()
      if (!picked) return
      if (!picked.sheets.length) throw new Error(t('import.noSheets'))
      setSource(picked)
      // di solito il foglio ha il nome del set
      setSheetName(picked.sheets.find((s) => s.name === target)?.name ?? picked.sheets[0].name)
    } catch (e) {
      setError(messageFromError(e))
    } finally {
      setBusy(false)
    }
  }

  const sheet = source?.sheets.find((s) => s.name === sheetName) ?? null
  const set = project.sets.find((s) => s.name === target)
  const old: Sheet = set?.data ?? { name: set?.sheet ?? target, headers: [], rows: [] }
  const preview = sheet ? previewImport(old, sheet) : null
  const names = (list: string[]): string =>
    list.length > NAMES
      ? `${list.slice(0, NAMES).join(', ')} (+${list.length - NAMES})`
      : list.join(', ')

  return (
    <Dialog title={t('import.title')} onClose={onClose}>
      <div className="dialog-form import-sheet">
        <p className="muted small">{t('import.hint')}</p>
        <div className="import-file">
          <button disabled={busy} onClick={choose}>
            {source ? t('import.otherFile') : t('import.chooseFile')}
          </button>
          {source && <span>{source.file}</span>}
        </div>
        {error && <p className="field-error">{t(error)}</p>}
        {source && (
          <>
            <label>
              {t('import.sheet')}
              <select value={sheetName} onChange={(e) => setSheetName(e.target.value)}>
                {source.sheets.map((s) => (
                  <option key={s.name} value={s.name}>
                    {t('import.sheetOption', { name: s.name, n: s.rows.length })}
                  </option>
                ))}
              </select>
            </label>
            <label>
              {t('import.target')}
              <select value={target} onChange={(e) => setTarget(e.target.value)}>
                {project.sets.map((s) => (
                  <option key={s.name} value={s.name}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
          </>
        )}
        {preview && sheet && (
          <div className="import-preview">
            <p>{preview.key ? t('import.byKey', { key: preview.key }) : t('import.byPosition')}</p>
            <ul>
              <li>{t('import.rows', { before: old.rows.length, after: sheet.rows.length })}</li>
              {preview.added.length > 0 && (
                <li>
                  {t('import.added', { n: preview.added.length, names: names(preview.added) })}
                </li>
              )}
              {preview.removed.length > 0 && (
                <li>
                  {t('import.removed', {
                    n: preview.removed.length,
                    names: names(preview.removed)
                  })}
                </li>
              )}
              {preview.changed.length > 0 && (
                <li>
                  {t('import.changed', {
                    n: preview.changed.length,
                    names: names(preview.changed)
                  })}
                </li>
              )}
              <li>{t('import.unchanged', { n: preview.unchanged })}</li>
              {preview.newColumns.length > 0 && (
                <li>{t('import.newColumns', { columns: preview.newColumns.join(', ') })}</li>
              )}
            </ul>
            {preview.lostColumns.length > 0 && (
              <label className="check">
                <input type="checkbox" checked={keep} onChange={(e) => setKeep(e.target.checked)} />
                {t('import.keepColumns', { columns: preview.lostColumns.join(', ') })}
              </label>
            )}
            <p className="muted small">{t('import.backupNote')}</p>
          </div>
        )}
        <div className="dialog-buttons">
          <button onClick={onClose}>{t('dialog.cancel')}</button>
          <button
            className="primary"
            disabled={!sheet || !set}
            onClick={() => sheet && onImport(target, applyImport(old, sheet, keep), source!.file)}
          >
            {t('import.import')}
          </button>
        </div>
      </div>
    </Dialog>
  )
}
