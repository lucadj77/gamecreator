import { useState } from 'react'
import type { Shadow, Stroke } from '../../../shared/model/template'
import { useI18n } from '../i18n/context'

// Campi del pannello proprietà. I campi di testo e numerici confermano con Invio o
// uscendo dal campo; Esc ripristina il valore.

interface Base {
  label: string
  /** Suggerimento al passaggio del mouse: di solito la colonna del foglio */
  hint?: string
}

function Row({ label, hint, children }: Base & { children: React.ReactNode }): React.JSX.Element {
  return (
    // un div e non un label: con più controlli il clic sull'etichetta attiverebbe il primo
    <div className="field" title={hint}>
      <span className="field-label">{label}</span>
      <span className="field-control">{children}</span>
    </div>
  )
}

/** Testo in modifica separato dal valore: si riallinea quando il valore cambia da fuori */
function useDraft(value: string): [string, (s: string) => void, () => void] {
  const [draft, setDraft] = useState<{ base: string; text: string } | null>(null)
  const text = draft && draft.base === value ? draft.text : value
  return [text, (s) => setDraft({ base: value, text: s }), () => setDraft(null)]
}

function parseNumber(s: string): number | null {
  const n = Number(s.trim().replace(',', '.'))
  return s.trim() !== '' && Number.isFinite(n) ? n : null
}

const round = (n: number): number => Math.round(n * 1000) / 1000

export function NumberField({
  label,
  hint,
  value,
  onChange,
  step = 0.5,
  min,
  max,
  unit,
  factor = 1
}: Base & {
  value: number
  onChange(v: number): void
  step?: number
  min?: number
  max?: number
  unit?: string
  /** Moltiplicatore per la visualizzazione, per esempio 100 per le percentuali */
  factor?: number
}): React.JSX.Element {
  const shown = String(round(value * factor))
  const [text, setText, reset] = useDraft(shown)
  const commit = (n: number | null): void => {
    reset()
    if (n === null) return
    let v = n / factor
    if (min !== undefined) v = Math.max(min, v)
    if (max !== undefined) v = Math.min(max, v)
    if (v !== value) onChange(v)
  }
  return (
    <Row label={label} hint={hint}>
      <input
        className="num"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={() => commit(parseNumber(text))}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit(parseNumber(text))
          else if (e.key === 'Escape') reset()
          else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
            e.preventDefault()
            const s = step * (e.shiftKey ? 10 : 1) * (e.key === 'ArrowUp' ? 1 : -1)
            commit(round((parseNumber(text) ?? value * factor) + s))
          }
        }}
      />
      {unit && <span className="unit">{unit}</span>}
    </Row>
  )
}

export function TextField({
  label,
  hint,
  value,
  onChange,
  multiline,
  list,
  validate,
  placeholder
}: Base & {
  value: string
  onChange(v: string): void
  multiline?: boolean
  list?: string
  /** Messaggio di errore, oppure null se il valore va bene */
  validate?(v: string): string | null
  placeholder?: string
}): React.JSX.Element {
  const [text, setText, reset] = useDraft(value)
  const error = validate && text !== value ? validate(text) : null
  const commit = (): void => {
    if (error) return
    reset()
    if (text !== value) onChange(text)
  }
  const common = {
    value: text,
    placeholder,
    className: error ? 'invalid' : undefined,
    onBlur: () => (error ? reset() : commit())
  }
  return (
    <Row label={label} hint={error ?? hint}>
      {multiline ? (
        <textarea
          {...common}
          rows={4}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            // Invio va a capo; Cmd/Ctrl+Invio conferma
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) commit()
            else if (e.key === 'Escape') reset()
          }}
        />
      ) : (
        <input
          {...common}
          list={list}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commit()
            else if (e.key === 'Escape') reset()
          }}
        />
      )}
      {error && <span className="field-error">{error}</span>}
    </Row>
  )
}

export function SelectField<T extends string | number>({
  label,
  hint,
  value,
  options,
  onChange
}: Base & {
  value: T
  options: [T, string][]
  onChange(v: T): void
}): React.JSX.Element {
  return (
    <Row label={label} hint={hint}>
      <select
        value={String(value)}
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
  value,
  onChange
}: Base & { value: boolean; onChange(v: boolean): void }): React.JSX.Element {
  return (
    <Row label={label} hint={hint}>
      <input type="checkbox" checked={value} onChange={(e) => onChange(e.target.checked)} />
    </Row>
  )
}

/** Il selettore nativo vuole #rrggbb: per nomi e codici brevi si mostra il nero */
function toHex6(c: string): string {
  if (/^#[0-9a-f]{6}$/i.test(c)) return c
  if (/^#[0-9a-f]{3}$/i.test(c)) return '#' + [...c.slice(1)].map((ch) => ch + ch).join('')
  return '#000000'
}

function ColorInput({
  value,
  onChange
}: {
  value: string
  onChange(v: string): void
}): React.JSX.Element {
  const [text, setText, reset] = useDraft(value)
  const commit = (): void => {
    reset()
    if (text.trim() && text.trim() !== value) onChange(text.trim())
  }
  return (
    <>
      <input
        type="color"
        value={toHex6(value)}
        onChange={(e) => onChange(e.target.value.toUpperCase())}
      />
      <input
        className="color-text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit()
          else if (e.key === 'Escape') reset()
        }}
      />
    </>
  )
}

export function ColorField({
  label,
  hint,
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
    <Row label={label} hint={hint}>
      {nullable && (
        <input
          type="checkbox"
          checked={value !== null}
          title={t('field.enabled')}
          onChange={(e) => onChange(e.target.checked ? fallback : null)}
        />
      )}
      {value !== null ? (
        <ColorInput value={value} onChange={onChange} />
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
  const [text, setText, reset] = useDraft(String(value?.width ?? ''))
  const commitWidth = (): void => {
    reset()
    if (!value) return
    const s = text.trim()
    if (allowPercent && /^\d+([.,]\d+)?%$/.test(s))
      onChange({ ...value, width: s.replace(',', '.') })
    else {
      const n = parseNumber(s)
      if (n !== null && n >= 0) onChange({ ...value, width: n })
    }
  }
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
            className="num"
            value={text}
            title={allowPercent ? t('field.strokeWidthPercent') : t('field.strokeWidth')}
            onChange={(e) => setText(e.target.value)}
            onBlur={commitWidth}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitWidth()
              else if (e.key === 'Escape') reset()
            }}
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
