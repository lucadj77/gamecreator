import { useEffect, useState } from 'react'
import { messageFromError, type Message } from '../../../shared/messages'
import { checkDataFile, type DataCheck } from '../../../shared/model/dataCheck'
import type { LoadedProject } from '../../../shared/project'
import { Dialog } from '../editor/dialogs'
import { useI18n } from '../i18n/context'

/**
 * Controlla file dati: ogni foglio del file dati com'è scritto sul disco, i set che lo usano, le
 * colonne che i loro template leggono e il foglio non ha, e le anomalie (titoli sopra le
 * intestazioni, celle unite, errori, formule senza risultato, righe vuote)
 */
export default function DataCheckDialog({
  project,
  onImport,
  onClose
}: {
  project: LoadedProject
  /** Apre l'importazione di un foglio da un altro file */
  onImport(): void
  onClose(): void
}): React.JSX.Element {
  const { t } = useI18n()
  const [check, setCheck] = useState<DataCheck | null>(null)
  const [error, setError] = useState<Message | null>(null)

  useEffect(() => {
    let alive = true
    window.api
      .inspectData()
      .then((sheets) => alive && setCheck(checkDataFile(project, sheets)))
      .catch((e) => alive && setError(messageFromError(e)))
    return () => {
      alive = false
    }
  }, [project])

  const losses = project.dataFileLosses ?? []
  return (
    <Dialog title={t('check.title')} onClose={onClose}>
      <div className="dialog-form data-check">
        <div className="data-check-body">
          <p className="muted small">
            {t('check.intro', { file: project.file.dataFile })}
            {project.file.dataReadOnly ? ` ${t('check.readOnly')}` : ''}
          </p>
          {error && <p className="field-error">{t(error)}</p>}
          {!check && !error && <p className="muted">{t('check.reading')}</p>}
          {losses.length > 0 && (
            <p className="data-check-note warning">
              {t('check.losses', { what: losses.map((x) => t(`dataLoss.${x}`)).join(', ') })}
            </p>
          )}
          {check?.missingSheets.map((m) => (
            <p key={m.set} className="data-check-note warning">
              {t('check.missingSheet', m)}
            </p>
          ))}
          {check?.sheets.map(({ sheet, sets, notes }) => (
            <section key={sheet.name} className="data-check-sheet">
              <h3>
                {sheet.name}
                <span className="muted small">
                  {' · '}
                  {sets.length
                    ? t('check.linked', { sets: sets.map((s) => s.name).join(', ') })
                    : t('check.unlinked')}
                  {sheet.headerRow > 0 && ` · ${t('check.rows', { n: sheet.dataRows })}`}
                </span>
              </h3>
              {sets
                .filter((s) => s.missing.length)
                .map((s) => (
                  <p key={s.name} className="data-check-note info">
                    {t('check.missingColumns', {
                      set: s.name,
                      template: s.template,
                      columns: s.missing.join(', ')
                    })}
                  </p>
                ))}
              {notes.map((n, i) => (
                <p key={i} className={`data-check-note ${n.level}`}>
                  {t(n.message)}
                </p>
              ))}
              {!notes.length && !sets.some((s) => s.missing.length) && (
                <p className="data-check-note ok">{t('check.ok')}</p>
              )}
            </section>
          ))}
        </div>
        <div className="dialog-buttons">
          {/* nel browser non si può ancora leggere un altro file */}
          {!window.api.isWeb && project.sets.length > 0 && (
            <button onClick={onImport}>{t('import.open')}</button>
          )}
          <button className="primary" onClick={onClose}>
            {t('dialog.close')}
          </button>
        </div>
      </div>
    </Dialog>
  )
}
