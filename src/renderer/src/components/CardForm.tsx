import { useEffect, useRef } from 'react'
import type { Sheet } from '../../../shared/project'
import { setCell } from '../../../shared/model/sheet'
import { walkLayers } from '../../../shared/model/normalize'
import type { Template } from '../../../shared/model/template'
import { useI18n } from '../i18n/context'
import MarkupTextarea from './MarkupTextarea'

interface Props {
  sheet: Sheet
  row: number
  template: Template | null
  /** Colonna da mettere a fuoco, per esempio dopo un clic su un livello della carta */
  focus: { column: string; seq: number } | null
  onChange(sheet: Sheet, key?: string): void
}

/**
 * Campi della carta selezionata: è la sua riga del foglio, modificabile accanto all'anteprima.
 * Le colonne dei livelli di testo hanno un campo su più righe.
 */
function CardForm({ sheet, row, template, focus, onChange }: Props): React.JSX.Element {
  const { t } = useI18n()
  const boxRef = useRef<HTMLDivElement>(null)
  const textColumns = new Set(
    template
      ? walkLayers([...template.front, ...template.back])
          .filter((l) => l.type === 'text' && l.source.kind === 'column')
          .map((l) => (l.source.kind === 'column' && l.source.column) || l.name)
      : []
  )

  useEffect(() => {
    if (!focus) return
    const el = boxRef.current?.querySelector<HTMLInputElement>(
      `[data-column="${CSS.escape(focus.column)}"]`
    )
    el?.focus()
    el?.select()
  }, [focus])

  const fields = [
    ...new Set([
      ...sheet.headers.filter((h) => h !== 'amount' && !h.includes('.')),
      ...(template
        ? walkLayers([...template.front, ...template.back])
            .filter((l) => l.type !== 'group')
            .map((l) => l.name)
        : [])
    ])
  ]
  const values = sheet.rows[row] ?? []
  return (
    <div className="card-form" ref={boxRef}>
      <h3>{t('cardForm.title', { n: row + 1 })}</h3>
      {sheet.headers.map((h, i) => {
        const common = {
          'data-column': h,
          value: values[i] ?? '',
          onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
            onChange(setCell(sheet, row, i, e.target.value), `cell:${row}:${i}`)
        }
        return (
          <label key={h} className={h.includes('.') ? 'field prop-field' : 'field'}>
            <span className="field-label">{h === 'amount' ? t('cardForm.amount') : h}</span>
            <span className="field-control">
              {textColumns.has(h) ? (
                <MarkupTextarea
                  {...common}
                  fields={fields}
                  rows={Math.min(8, Math.max(2, common.value.split('\n').length))}
                />
              ) : (
                <input {...common} />
              )}
            </span>
          </label>
        )
      })}
    </div>
  )
}

export default CardForm
