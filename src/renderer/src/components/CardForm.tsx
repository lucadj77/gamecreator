import { useEffect, useRef, useState } from 'react'
import type { Sheet } from '../../../shared/project'
import { colorColumns, setCells } from '../../../shared/model/sheet'
import { walkLayers } from '../../../shared/model/normalize'
import type { Template } from '../../../shared/model/template'
import { useI18n } from '../i18n/context'
import MarkupTextarea from './MarkupTextarea'
import AssetPicker from './AssetPicker'
import { ImageIcon } from './icons'

interface Props {
  sheet: Sheet
  row: number
  /** Carte selezionate quando sono più di una: ogni campo scrive in tutte */
  rows?: number[]
  template: Template | null
  /** Colonna da mettere a fuoco, per esempio dopo un clic su un livello della carta */
  focus: { column: string; seq: number } | null
  onChange(sheet: Sheet, key?: string): void
}

/**
 * Campi della carta selezionata: è la sua riga del foglio, modificabile accanto all'anteprima.
 * Le colonne dei livelli di testo hanno un campo su più righe.
 */
function CardForm({ sheet, row, rows, template, focus, onChange }: Props): React.JSX.Element {
  const { t } = useI18n()
  const boxRef = useRef<HTMLDivElement>(null)
  const columnsOf = (type: 'text' | 'image'): Set<string> =>
    new Set(
      template
        ? walkLayers([...template.front, ...template.back])
            .filter((l) => l.type === type && l.source.kind === 'column')
            .map((l) => (l.source.kind === 'column' && l.source.column) || l.name)
        : []
    )
  const textColumns = columnsOf('text')
  const imageColumns = columnsOf('image')
  /** Colonna di cui si sta scegliendo l'immagine */
  const [picking, setPicking] = useState<number | null>(null)

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
  const targets = rows && rows.length > 1 ? rows : [row]
  const multi = targets.length > 1
  // con più carte un campo mostra il valore solo se è uguale in tutte; vuoto vuol dire "diversi"
  const values = sheet.headers.map((_, i) => {
    const vs = new Set(targets.map((r) => sheet.rows[r]?.[i] ?? ''))
    return vs.size === 1 ? [...vs][0] : null
  })
  const write = (i: number, v: string): void =>
    onChange(setCells(sheet, targets, i, v), `cell:${targets.join(',')}:${i}`)
  return (
    <div className="card-form" ref={boxRef}>
      <h3>
        {multi
          ? t('cardForm.multiTitle', { n: targets.length })
          : t('cardForm.title', { n: row + 1 })}
      </h3>
      {multi && <p className="muted small">{t('cardForm.multiHint')}</p>}
      {sheet.headers.map((h, i) => {
        const common = {
          'data-column': h,
          value: values[i] ?? '',
          ...(values[i] === null ? { placeholder: t('cardForm.mixed') } : {}),
          onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
            write(i, e.target.value)
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
                  <input {...common} placeholder={common.placeholder ?? colors.get(h) ?? ''} />
                  <input
                    type="color"
                    title={t('cardForm.pickColor')}
                    // senza valore nella cella il selettore parte dal colore del template
                    value={toHex6(common.value.trim() || colors.get(h) || '')}
                    onChange={(e) => write(i, e.target.value.toUpperCase())}
                  />
                </span>
              ) : imageColumns.has(h) ? (
                <>
                  <input {...common} />
                  <button
                    className="pick-btn"
                    title={t('assetPicker.open')}
                    onClick={(e) => {
                      // il pulsante è dentro l'etichetta: senza questo il clic va al campo
                      e.preventDefault()
                      setPicking(i)
                    }}
                  >
                    <ImageIcon />
                  </button>
                </>
              ) : (
                <input {...common} />
              )}
            </span>
          </label>
        )
      })}
      {picking !== null && (
        <AssetPicker
          value={values[picking] ?? ''}
          onPick={(name) => write(picking, name)}
          onClose={() => setPicking(null)}
        />
      )}
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
