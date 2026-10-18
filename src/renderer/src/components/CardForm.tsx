import { useEffect, useRef } from 'react'
import type { Sheet } from '../../../shared/project'
import { colorColumns, setCell } from '../../../shared/model/sheet'
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

  const colors = template ? colorColumns(template) : new Map<string, string | null>()

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
              ) : colors.has(h) ? (
                <span className="color-cell">
                  <input {...common} placeholder={colors.get(h) ?? ''} />
                  <input
                    type="color"
                    title={t('cardForm.pickColor')}
                    // senza valore nella cella il selettore parte dal colore del template
                    value={toHex6(common.value.trim() || colors.get(h) || '')}
                    onChange={(e) =>
                      onChange(
                        setCell(sheet, row, i, e.target.value.toUpperCase()),
                        `cell:${row}:${i}`
                      )
                    }
                  />
                </span>
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

let probe: CanvasRenderingContext2D | null = null

/** Il selettore nativo vuole #rrggbb: i nomi dei colori si convertono con il canvas */
function toHex6(c: string): string {
  const v = c.trim()
  if (/^#[0-9a-f]{6}$/i.test(v)) return v
  if (/^#[0-9a-f]{8}$/i.test(v)) return v.slice(0, 7)
  if (/^#[0-9a-f]{3,4}$/i.test(v)) return '#' + [...v.slice(1, 4)].map((ch) => ch + ch).join('')
  if (!/^[a-z]+$/i.test(v)) return '#000000'
  probe ??= document.createElement('canvas').getContext('2d')
  if (!probe) return '#000000'
  probe.fillStyle = '#000000'
  probe.fillStyle = v
  return /^#[0-9a-f]{6}$/i.test(probe.fillStyle) ? probe.fillStyle : '#000000'
}

export default CardForm
