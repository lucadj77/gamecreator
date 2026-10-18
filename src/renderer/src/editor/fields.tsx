import { useState } from 'react'
import type { Shadow, Stroke } from '../../../shared/model/template'
import { useI18n } from '../i18n/context'
import MarkupTextarea from '../components/MarkupTextarea'

// Campi del pannello proprietà. Ogni modifica si applica subito, mentre si scrive: cambiare
// selezione o fare clic sulla carta non la perde. Annulla (⌘Z) torna indietro.

interface Base {
  label: string
  /** Suggerimento al passaggio del mouse: di solito la colonna del foglio */
  hint?: string
  disabled?: boolean
}

function Row({
  label,
  hint,
  disabled,
  children
}: Base & { children: React.ReactNode }): React.JSX.Element {
  return (
    // un div e non un label: con più controlli il clic sull'etichetta attiverebbe il primo
    <div className={disabled ? 'field disabled' : 'field'} title={hint}>
      <span className="field-label">{label}</span>
      <span className="field-control">{children}</span>
    </div>
  )
}

/**
 * Testo del campo mentre lo si modifica. Finché il campo ha il fuoco mostra ciò che si è
 * scritto (anche "1," a metà di un numero); `apply` riceve ogni versione valida.
 */
function useLive(
  value: string,
  apply: (text: string) => void,
  valid: (text: string) => boolean = () => true,
  /** Applica solo uscendo dal campo: per i valori che aprono una richiesta, come il formato */
  deferred = false
): {
  text: string
  set(text: string): void
  bind: {
    value: string
    onFocus(): void
    onBlur(): void
    onChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>): void
  }
} {
  const [editing, setEditing] = useState<string | null>(null)
  const text = editing ?? value
  const set = (t: string): void => {
    setEditing(t)
    if (!deferred && valid(t)) apply(t)
  }
  return {
    text,
    set,
    bind: {
      value: text,
      onFocus: () => setEditing(value),
      onBlur: () => {
        if (deferred && editing !== null && valid(editing)) apply(editing)
        setEditing(null)
      },
      onChange: (e) => set(e.target.value)
    }
  }
}

function parseNumber(s: string): number | null {
  const n = Number(s.trim().replace(',', '.'))
  return s.trim() !== '' && Number.isFinite(n) ? n : null
}

const round = (n: number): number => Math.round(n * 1000) / 1000

/** Invio conferma uscendo dal campo, come nei programmi di grafica */
const blurOnEnter = (e: React.KeyboardEvent<HTMLInputElement>): void => {
  if (e.key === 'Enter') e.currentTarget.blur()
}

export function NumberField({
  label,
  hint,
  disabled,
  value,
  onChange,
  step = 0.5,
  min,
  max,
  unit,
  factor = 1,
  deferred
}: Base & {
  value: number
  deferred?: boolean
  onChange(v: number): void
  step?: number
  min?: number
  max?: number
  unit?: string
  /** Moltiplicatore per la visualizzazione, per esempio 100 per le percentuali */
  factor?: number
}): React.JSX.Element {
  const clamp = (n: number): number => {
    let v = n / factor
    if (min !== undefined) v = Math.max(min, v)
    if (max !== undefined) v = Math.min(max, v)
    return v
  }
  const live = useLive(
    String(round(value * factor)),
    (t) => {
      const v = clamp(parseNumber(t)!)
      if (v !== value) onChange(v)
    },
    (t) => parseNumber(t) !== null,
    deferred
  )
  return (
    <Row label={label} hint={hint} disabled={disabled}>
      <input
        className="num"
        disabled={disabled}
        {...live.bind}
        onKeyDown={(e) => {
          if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
            e.preventDefault()
            const s = step * (e.shiftKey ? 10 : 1) * (e.key === 'ArrowUp' ? 1 : -1)
            live.set(String(round((parseNumber(live.text) ?? value * factor) + s)))
          } else blurOnEnter(e)
        }}
      />
      {unit && <span className="unit">{unit}</span>}
    </Row>
  )
}

export function TextField({
  label,
  hint,
  disabled,
  value,
  onChange,
  multiline,
  rows = 4,
  list,
  validate,
  placeholder,
  markupFields
}: Base & {
  value: string
  onChange(v: string): void
  multiline?: boolean
  /** Testo con markup: aiuto alla scrittura con questi campi */
  markupFields?: string[]
  rows?: number
  list?: string
  /** Messaggio di errore, oppure null se il valore va bene: un valore non valido non si applica */
  validate?(v: string): string | null
  placeholder?: string
}): React.JSX.Element {
  const live = useLive(
    value,
    (t) => t !== value && onChange(t),
    (t) => !validate || validate(t) === null
  )
  const error = validate && live.text !== value ? validate(live.text) : null
  const common = {
    ...live.bind,
    placeholder,
    disabled,
    className: error ? 'invalid' : undefined
  }
  return (
    <Row label={label} hint={error ?? hint} disabled={disabled}>
      {multiline && markupFields ? (
        <MarkupTextarea {...common} rows={rows} fields={markupFields} />
      ) : multiline ? (
        <textarea {...common} rows={rows} />
      ) : (
        <input {...common} list={list} onKeyDown={blurOnEnter} />
      )}
      {error && <span className="field-error">{error}</span>}
    </Row>
  )
}

export function SelectField<T extends string | number>({
  label,
  hint,
  disabled,
  value,
  options,
  onChange
}: Base & {
  value: T
  options: [T, string][]
  onChange(v: T): void
}): React.JSX.Element {
  return (
    <Row label={label} hint={hint} disabled={disabled}>
      <select
        value={String(value)}
        disabled={disabled}
        onChange={(e) => {
          const found = options.find(([v]) => String(v) === e.target.value)
          if (found) onChange(found[0])
        }}
      >
        {options.map(([v, text]) => (
          <option key={String(v)} value={String(v)}>
            {text}
          </option>
        ))}
      </select>
    </Row>
  )
}

export function CheckField({
  label,
  hint,
  disabled,
  value,
  onChange
}: Base & { value: boolean; onChange(v: boolean): void }): React.JSX.Element {
  return (
    <Row label={label} hint={hint} disabled={disabled}>
      <input
        type="checkbox"
        checked={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
    </Row>
  )
}

/** Il selettore nativo vuole #rrggbb: per nomi e codici brevi si mostra il nero */
function toHex6(c: string): string {
  if (/^#[0-9a-f]{6}$/i.test(c)) return c
  if (/^#[0-9a-f]{3}$/i.test(c)) return '#' + [...c.slice(1)].map((ch) => ch + ch).join('')
  return '#000000'
}

/** Codice esadecimale completo o nome di colore: le versioni a metà non si applicano */
const isColor = (t: string): boolean =>
  /^#([0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(t.trim()) ||
  /^[a-z]{3,}$/i.test(t.trim())

function ColorInput({
  value,
  onChange,
  disabled
}: {
  value: string
  onChange(v: string): void
  disabled?: boolean
}): React.JSX.Element {
  const live = useLive(value, (t) => t.trim() !== value && onChange(t.trim()), isColor)
  return (
    <>
      <input
        type="color"
        disabled={disabled}
        value={toHex6(value)}
        onChange={(e) => onChange(e.target.value.toUpperCase())}
      />
      <input className="color-text" disabled={disabled} {...live.bind} onKeyDown={blurOnEnter} />
    </>
  )
}

export function ColorField({
  label,
  hint,
  disabled,
  value,
  onChange,
  nullable,
  fallback = '#000000'
}: Base & {
  value: string | null
  onChange(v: string | null): void
  nullable?: boolean
  /** Colore proposto quando si riattiva un colore assente */
  fallback?: string
}): React.JSX.Element {
  const { t } = useI18n()
  return (
    <Row label={label} hint={hint} disabled={disabled}>
      {nullable && (
        <input
          type="checkbox"
          checked={value !== null}
          disabled={disabled}
          title={t('field.enabled')}
          onChange={(e) => onChange(e.target.checked ? fallback : null)}
        />
      )}
      {value !== null ? (
        <ColorInput value={value} onChange={onChange} disabled={disabled} />
      ) : (
        <span className="muted">{t('field.none')}</span>
      )}
    </Row>
  )
}

export function StrokeField({
  label,
  hint,
  value,
  onChange,
  allowPercent
}: Base & {
  value: Stroke | null
  onChange(v: Stroke | null): void
  /** Il testo accetta lo spessore in % della dimensione */
  allowPercent?: boolean
}): React.JSX.Element {
  const { t } = useI18n()
  const isPercent = (s: string): boolean => !!allowPercent && /^\d+([.,]\d+)?%$/.test(s.trim())
  const width = useLive(
    String(value?.width ?? ''),
    (s) => {
      if (!value) return
      const w = isPercent(s) ? s.trim().replace(',', '.') : parseNumber(s)!
      if (w !== value.width) onChange({ ...value, width: w })
    },
    (s) => isPercent(s) || (parseNumber(s) ?? -1) >= 0
  )
  return (
    <Row label={label} hint={hint}>
      <input
        type="checkbox"
        checked={value !== null}
        title={t('field.enabled')}
        onChange={(e) => onChange(e.target.checked ? { color: '#000000', width: 0.3 } : null)}
      />
      {value ? (
        <>
          <ColorInput value={value.color} onChange={(color) => onChange({ ...value, color })} />
          <input
            className="num narrow"
            title={allowPercent ? t('field.strokeWidthPercent') : t('field.strokeWidth')}
            {...width.bind}
            onKeyDown={blurOnEnter}
          />
        </>
      ) : (
        <span className="muted">{t('field.none')}</span>
      )}
    </Row>
  )
}

export function ShadowFields({
  value,
  onChange,
  hint
}: {
  value: Shadow | null
  onChange(v: Shadow | null): void
  hint?: string
}): React.JSX.Element {
  const { t } = useI18n()
  return (
    <>
      <ColorField
        label={t('prop.shadow')}
        hint={hint}
        value={value?.color ?? null}
        nullable
        fallback="#00000080"
        onChange={(color) =>
          onChange(color === null ? null : { blur: 0.5, dx: 0.3, dy: 0.3, ...value, color })
        }
      />
      {value && (
        <div className="field-group">
          <NumberField
            label={t('prop.shadowBlur')}
            value={value.blur}
            min={0}
            step={0.1}
            unit="mm"
            onChange={(blur) => onChange({ ...value, blur })}
          />
          <NumberField
            label={t('prop.shadowDx')}
            value={value.dx}
            step={0.1}
            unit="mm"
            onChange={(dx) => onChange({ ...value, dx })}
          />
          <NumberField
            label={t('prop.shadowDy')}
            value={value.dy}
            step={0.1}
            unit="mm"
            onChange={(dy) => onChange({ ...value, dy })}
          />
        </div>
      )}
    </>
  )
}
