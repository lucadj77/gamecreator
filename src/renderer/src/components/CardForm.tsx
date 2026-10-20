import { Fragment, useEffect, useRef, useState } from 'react'
import type { Sheet } from '../../../shared/project'
import {
  boolText,
  colorColumns,
  parseBool,
  propertyColumns,
  writeCells,
  type ColumnInfo
} from '../../../shared/model/sheet'
import { walkLayers } from '../../../shared/model/normalize'
import { PRIMARY_PROPERTY, type Layer, type Template } from '../../../shared/model/template'
import { useI18n } from '../i18n/context'
import MarkupTextarea from './MarkupTextarea'
import AssetPicker from './AssetPicker'
import { EyeIcon, ImageIcon, SlidersIcon } from './icons'

interface Props {
  sheet: Sheet
  row: number
  /** Carte selezionate quando sono più di una: ogni campo scrive in tutte */
  rows?: number[]
  template: Template | null
  /** Colonne da mostrare, già senza quelle nascoste (vedi setColumns) */
  columns: ColumnInfo[]
  /** Colonne vero/falso, con il valore del template per le celle vuote */
  booleans: Map<string, boolean | null>
  /** Valori dei livelli fissi e con formula di una riga */
  computed(row: number): Record<string, string>
  /** Colonna da mettere a fuoco, per esempio dopo un clic su un livello della carta */
  focus: { column: string; seq: number } | null
  /** Campi con i dettagli del livello aperti */
  details: Set<string>
  onToggleDetails(column: string): void
  /** Nasconde il campo (e la colonna in tabella) */
  onHide(column: string): void
  onChange(sheet: Sheet, key?: string): void
}

/**
 * Campi della carta selezionata: è la sua riga del foglio, modificabile accanto all'anteprima.
 * Le colonne dei livelli di testo hanno un campo su più righe.
 */
function CardForm({
  sheet,
  row,
  rows,
  template,
  columns,
  booleans,
  computed,
  focus,
  details,
  onToggleDetails,
  onHide,
  onChange
}: Props): React.JSX.Element {
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
  const [picking, setPicking] = useState<string | null>(null)

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
  const same = (vs: string[]): string | null => (new Set(vs).size === 1 ? vs[0] : null)
  const valueOf = (h: string, calc = false): string | null => {
    const index = sheet.headers.indexOf(h)
    return same(
      targets.map((r) =>
        calc ? (computed(r)[h] ?? '') : index < 0 ? '' : (sheet.rows[r]?.[index] ?? '')
      )
    )
  }
  const write = (h: string, v: string): void =>
    onChange(writeCells(sheet, targets, h, v), `cell:${targets.join(',')}:${h}`)

  // livello di ogni campo: le sue proprietà si aprono con l'icona accanto al campo
  const layerOf = new Map<string, Layer>()
  for (const l of template ? walkLayers([...template.front, ...template.back]) : []) {
    if (l.type === 'group') continue
    const column = l.source.kind === 'column' && l.source.column ? l.source.column : l.name
    if (!layerOf.has(column)) layerOf.set(column, l)
  }
  const shown = new Set(columns.map((c) => c.header))
  const baseOf = (h: string): string => h.slice(0, h.indexOf('.'))
  // le colonne delle proprietà stanno nei dettagli del loro campo, se il campo è mostrato
  const inDetails = (h: string): boolean =>
    h.includes('.') && shown.has(baseOf(h)) && layerOf.has(baseOf(h))

  /** Proprietà del livello modificabili carta per carta, prima quelle già usate */
  const propertiesOf = (column: string): string[] => {
    const l = layerOf.get(column)
    if (!l || !template) return []
    // il valore principale è già il campo stesso
    const keys = propertyColumns(template, l.name)
      .map((c) => c.slice(c.indexOf('.') + 1))
      .filter((k) => k !== PRIMARY_PROPERTY[l.type])
    const own = keys.filter((k) => !COMMON_KEYS.includes(k))
    const common = COMMON_KEYS.filter((k) => keys.includes(k))
    const all = [...own, ...common].map((k) => `${column}.${k}`)
    const used = all.filter((h) => valueOf(h)?.trim())
    return [...used, ...all.filter((h) => !used.includes(h))]
  }
  const usedProperties = (column: string): number =>
    sheet.headers.filter((h) => h.startsWith(column + '.') && valueOf(h)?.trim()).length

  const field = (
    h: string,
    opts: { index: number; calc: boolean; prop?: boolean }
  ): React.JSX.Element => {
    const { index, calc } = opts
    const value = valueOf(h, calc)
    const dot = h.indexOf('.')
    const layer = dot > 0 ? layerOf.get(h.slice(0, dot)) : undefined
    // valore del template per le proprietà: suggerimento nel campo vuoto
    const fallback =
      layer && dot > 0 ? (layer as unknown as Record<string, unknown>)[h.slice(dot + 1)] : undefined
    const hint =
      fallback === undefined || fallback === null || typeof fallback === 'object'
        ? ''
        : String(fallback)
    const common = {
      'data-column': h,
      value: value ?? '',
      placeholder: value === null ? t('cardForm.mixed') : hint,
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
        write(h, e.target.value)
    }
    const className = ['field', h.includes('.') && 'prop-field', calc && 'calc-field']
      .filter(Boolean)
      .join(' ')
    const label = h === 'amount' ? t('cardForm.amount') : opts.prop ? h.slice(dot + 1) : h
    const tools = !opts.prop && (
      <span className="field-tools">
        {layerOf.has(h) && !calc && (
          <button
            className={'icon-btn' + (details.has(h) ? ' on' : '')}
            aria-expanded={details.has(h)}
            title={t('cardForm.details')}
            onClick={(e) => {
              // i pulsanti sono dentro l'etichetta: senza questo il clic va al campo
              e.preventDefault()
              onToggleDetails(h)
            }}
          >
            <SlidersIcon />
            {usedProperties(h) > 0 && <span className="field-count">{usedProperties(h)}</span>}
          </button>
        )}
        <button
          className="icon-btn"
          title={t('cardForm.hide')}
          onClick={(e) => {
            e.preventDefault()
            onHide(h)
          }}
        >
          <EyeIcon />
        </button>
      </span>
    )
    if (calc)
      return (
        <label key={h} className={className} title={t('table.computedHint')}>
          <span className="field-label">ƒ {label}</span>
          <span className="field-control">
            <input {...common} placeholder="" readOnly onChange={undefined} />
          </span>
          {tools}
        </label>
      )
    const boolDefault = booleans.has(h)
      ? booleans.get(h)
      : typeof fallback === 'boolean'
        ? fallback
        : undefined
    if (boolDefault !== undefined) {
      const own = value === null ? null : parseBool(value)
      return (
        <label key={h} className={className}>
          <span className="field-label">{label}</span>
          <span className="field-control">
            <input
              type="checkbox"
              data-column={h}
              className={value?.trim() ? undefined : 'bool-default'}
              title={value?.trim() ? value : t('table.boolDefault')}
              checked={own ?? (value === null ? false : (boolDefault ?? false))}
              ref={(el) => {
                if (el) el.indeterminate = value === null
              }}
              onChange={(e) => write(h, boolText(sheet, h, e.target.checked))}
            />
          </span>
          {tools}
        </label>
      )
    }
    return (
      <label key={h} className={index < 0 && !opts.prop ? className + ' new-field' : className}>
        <span className="field-label">{label}</span>
        <span className="field-control">
          {textColumns.has(h) ? (
            <MarkupTextarea
              {...common}
              fields={fields}
              rows={Math.min(8, Math.max(2, common.value.split('\n').length))}
            />
          ) : colors.has(h) ? (
            <span className="color-cell">
              <input
                {...common}
                placeholder={value === null ? common.placeholder : (colors.get(h) ?? '')}
              />
              <input
                type="color"
                title={t('cardForm.pickColor')}
                // senza valore nella cella il selettore parte dal colore del template
                value={toHex6(common.value.trim() || colors.get(h) || '')}
                onChange={(e) => write(h, e.target.value.toUpperCase())}
              />
            </span>
          ) : imageColumns.has(h) ? (
            <>
              <input {...common} />
              <button
                className="pick-btn"
                title={t('assetPicker.open')}
                onClick={(e) => {
                  e.preventDefault()
                  setPicking(h)
                }}
              >
                <ImageIcon />
              </button>
            </>
          ) : (
            <input {...common} />
          )}
        </span>
        {tools}
      </label>
    )
  }

  return (
    <div className="card-form" ref={boxRef}>
      <h3>
        {multi
          ? t('cardForm.multiTitle', { n: targets.length })
          : t('cardForm.title', { n: row + 1 })}
      </h3>
      {multi && <p className="muted small">{t('cardForm.multiHint')}</p>}
      {columns
        .filter((c) => !inDetails(c.header))
        .map(({ header: h, index, computed: calc }) => (
          <Fragment key={h}>
            {field(h, { index, calc })}
            {details.has(h) && layerOf.has(h) && (
              <div className="field-details">
                {propertiesOf(h).map((p) =>
                  field(p, { index: sheet.headers.indexOf(p), calc: false, prop: true })
                )}
              </div>
            )}
          </Fragment>
        ))}
      {picking !== null && (
        <AssetPicker
          value={valueOf(picking) ?? ''}
          onPick={(name) => write(picking, name)}
          onClose={() => setPicking(null)}
        />
      )}
    </div>
  )
}

/** Proprietà comuni a tutti i livelli: nei dettagli vengono dopo quelle del tipo */
const COMMON_KEYS = [
  'visible',
  'opacity',
  'x',
  'y',
  'w',
  'h',
  'rotation',
  'anchor',
  'blend',
  'shadow'
]

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
