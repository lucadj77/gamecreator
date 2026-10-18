import { useContext, useState } from 'react'
import {
  BUILTIN_SHAPES,
  BUILTIN_STYLES,
  parseAttrs,
  serializeAttrs,
  type Attrs
} from '../../../shared/model/markup'
import { CheckField, ColorField, SelectField, StrokeField, TextField } from '../editor/fields'
import { Dialog } from '../editor/dialogs'
import { useI18n } from '../i18n/context'
import { AssetsContext, StylesContext } from '../render/assets'
import MarkupText from '../render/MarkupText'

// Editor visuale degli attributi del markup: formatta una porzione di testo oppure modifica uno
// stile del progetto. Ogni campo corrisponde a un attributo di docs/specifica.md, 2.1.

const WEIGHTS = [100, 200, 300, 400, 500, 600, 700, 800, 900]
const NAME_RE = /^[A-Za-z][\w-]*$/

interface Props {
  /** Attributi di partenza */
  initial: Attrs
  /** Testo dell'anteprima */
  sample: string
  /** 'text': porzione di testo, con "salva come stile"; 'style': stile del progetto */
  mode: 'text' | 'style'
  /** Nome dello stile modificato (mode 'style'); vuoto per uno stile nuovo */
  styleName?: string
  onApply(attrs: Attrs, name?: string): void
  /** Salva gli attributi come nuovo stile del progetto */
  onSaveStyle?(name: string, attrs: Attrs): void
  onDelete?(): void
  onClose(): void
}

export default function FormatDialog({
  initial,
  sample,
  mode,
  styleName,
  onApply,
  onSaveStyle,
  onDelete,
  onClose
}: Props): React.JSX.Element {
  const { t } = useI18n()
  const styles = useContext(StylesContext)
  const assets = useContext(AssetsContext)
  const [a, setA] = useState<Attrs>(initial)
  const [raw, setRaw] = useState<string | null>(null)
  const [name, setName] = useState(styleName ?? '')
  const [saving, setSaving] = useState<string | null>(null)
  const set = (patch: Partial<Attrs>): void => {
    setRaw(null)
    setA((x) => {
      const next = { ...x, ...patch }
      for (const k of Object.keys(patch) as (keyof Attrs)[])
        if (next[k] === undefined || next[k] === null) delete next[k]
      return next
    })
  }
  const opt = (v: string): string | undefined => (v.trim() === '' ? undefined : v.trim())

  const styleNames = [...new Set([...Object.keys(BUILTIN_STYLES), ...Object.keys(styles)])]
    .filter((n) => n !== styleName)
    .sort()
  const images = [
    ...new Set(
      assets.map((p) => {
        const base = p.slice(p.lastIndexOf('/') + 1)
        return base.slice(0, base.lastIndexOf('.'))
      })
    )
  ].sort()
  const text = serializeAttrs(a)
  const parsed = raw !== null ? parseAttrs(raw) : null

  const nameError =
    mode === 'style' && name && !NAME_RE.test(name)
      ? t('format.invalidName')
      : mode === 'style' && name !== styleName && name in styles
        ? t('format.styleExists')
        : null
  const saveError =
    saving && !NAME_RE.test(saving)
      ? t('format.invalidName')
      : saving && saving in styles
        ? t('format.styleExists')
        : null

  return (
    <Dialog title={mode === 'style' ? t('format.styleTitle') : t('format.title')} onClose={onClose}>
      <div className="format-dialog">
        <div className="format-preview">
          <MarkupText
            text={`[${sample.replace(/([[\]{}\\])/g, '\\$1') || 'Aa'}]{${text}}`}
            unit={4}
            ratio={1}
            paragraphSpacing={0}
          />
        </div>
        <div className="format-fields">
          {mode === 'style' && (
            <TextField
              label={t('format.name')}
              value={name}
              validate={(v) => (!v || NAME_RE.test(v) ? null : t('format.invalidName'))}
              onChange={setName}
            />
          )}
          <SelectField<string>
            label={mode === 'style' ? t('format.basedOn') : t('format.style')}
            value={a.styles[0] ?? ''}
            options={[['', t('format.none')], ...styleNames.map((n): [string, string] => [n, n])]}
            onChange={(s) => set({ styles: s ? [s] : [] })}
          />
          <h3>{t('format.character')}</h3>
          <ColorField
            label={t('format.color')}
            value={a.color ?? null}
            nullable
            onChange={(c) => set({ color: c ?? undefined })}
          />
          <ColorField
            label={t('format.highlight')}
            value={a.highlight ?? null}
            nullable
            fallback="#FFE58F"
            onChange={(c) => set({ highlight: c ?? undefined })}
          />
          <TextField
            label={t('format.size')}
            hint={t('format.sizeHint')}
            value={a.size ?? ''}
            placeholder="+2 · 14 · 80%"
            validate={(v) => (!v.trim() || /^[+-]?\d+([.,]\d+)?%?$/.test(v.trim()) ? null : '✕')}
            onChange={(v) => set({ size: opt(v.replace(',', '.')) })}
          />
          <TextField
            label={t('format.font')}
            value={a.font ?? ''}
            onChange={(v) => set({ font: opt(v) })}
          />
          <SelectField<number>
            label={t('format.weight')}
            value={a.weight ?? 0}
            options={[
              [0, t('format.inherit')],
              ...WEIGHTS.map((w): [number, string] => [w, String(w)])
            ]}
            onChange={(w) => set({ weight: w || undefined })}
          />
          <div className="format-checks">
            <CheckField
              label={t('format.italic')}
              value={!!a.italic}
              onChange={(v) => set({ italic: v || undefined })}
            />
            <CheckField
              label={t('format.underline')}
              value={!!a.underline}
              onChange={(v) => set({ underline: v || undefined })}
            />
            <CheckField
              label={t('format.strike')}
              value={!!a.strike}
              onChange={(v) => set({ strike: v || undefined })}
            />
          </div>
          <SelectField<string>
            label={t('format.transform')}
            value={a.transform ?? ''}
            options={[
              ['', t('format.none')],
              ['upper', t('format.upper')],
              ['lower', t('format.lower')],
              ['smallcaps', t('format.smallcaps')]
            ]}
            onChange={(v) => set({ transform: (v || undefined) as Attrs['transform'] })}
          />
          <StrokeField
            label={t('format.stroke')}
            value={a.stroke ?? null}
            allowPercent
            onChange={(s) => set({ stroke: s ?? undefined })}
          />
          <TextField
            label={t('format.spacing')}
            hint={t('format.spacingHint')}
            value={a.spacing === undefined ? '' : String(a.spacing)}
            validate={(v) =>
              !v.trim() || Number.isFinite(Number(v.replace(',', '.'))) ? null : '✕'
            }
            onChange={(v) => set({ spacing: v.trim() ? Number(v.replace(',', '.')) : undefined })}
          />
          <TextField
            label={t('format.raise')}
            hint={t('format.raiseHint')}
            value={a.raise === undefined ? '' : String(a.raise)}
            validate={(v) =>
              !v.trim() || Number.isFinite(Number(v.replace(',', '.'))) ? null : '✕'
            }
            onChange={(v) => set({ raise: v.trim() ? Number(v.replace(',', '.')) : undefined })}
          />
          <h3>{t('format.box')}</h3>
          <StrokeField
            label={t('format.border')}
            value={a.border ?? null}
            onChange={(s) =>
              set({ border: s ? { color: s.color, width: Number(s.width) || 0.3 } : undefined })
            }
          />
          <ColorField
            label={t('format.fill')}
            value={a.fill ?? null}
            nullable
            fallback="#EDE4D3"
            onChange={(c) => set({ fill: c ?? undefined })}
          />
          <TextField
            label={t('format.radius')}
            hint={t('format.radiusHint')}
            value={a.radius === undefined ? '' : String(a.radius)}
            placeholder="1 · round"
            validate={(v) =>
              !v.trim() || v.trim() === 'round' || Number.isFinite(Number(v.replace(',', '.')))
                ? null
                : '✕'
            }
            onChange={(v) =>
              set({
                radius: !v.trim()
                  ? undefined
                  : v.trim() === 'round'
                    ? 'round'
                    : Number(v.replace(',', '.'))
              })
            }
          />
          <TextField
            label={t('format.pad')}
            hint={t('format.padHint')}
            value={a.pad ? (a.pad[0] === a.pad[1] ? `${a.pad[0]}` : `${a.pad[0]}/${a.pad[1]}`) : ''}
            placeholder="0.3/1"
            validate={(v) =>
              !v.trim() || /^\d+([.,]\d+)?(\/\d+([.,]\d+)?)?$/.test(v.trim()) ? null : '✕'
            }
            onChange={(v) => {
              const p = v
                .trim()
                .split('/')
                .map((x) => Number(x.replace(',', '.')))
              set({ pad: v.trim() ? [p[0], p[1] ?? p[0]] : undefined })
            }}
          />
          <SelectField<string>
            label={t('format.bg')}
            value={a.bg ?? ''}
            options={[
              ['', t('format.none')],
              ...BUILTIN_SHAPES.map((s): [string, string] => [s, t(`format.shape.${s}`)]),
              ...images.map((n): [string, string] => [n, n])
            ]}
            onChange={(v) => set({ bg: v || undefined })}
          />
          {a.bg && (
            <>
              <ColorField
                label={t('format.bgColor')}
                value={a.bgColor ?? null}
                nullable
                onChange={(c) => set({ bgColor: c ?? undefined })}
              />
              <TextField
                label={t('format.bgSize')}
                hint={t('format.bgSizeHint')}
                value={a.bgSize ?? ''}
                placeholder="140% · 4"
                validate={(v) => (!v.trim() || /^\d+([.,]\d+)?%?$/.test(v.trim()) ? null : '✕')}
                onChange={(v) => set({ bgSize: opt(v.replace(',', '.')) })}
              />
            </>
          )}
          {mode === 'style' && (
            <>
              <h3>{t('format.paragraph')}</h3>
              <SelectField<string>
                label={t('format.align')}
                value={a.align ?? ''}
                options={[
                  ['', t('format.inherit')],
                  ['left', t('align.left')],
                  ['center', t('align.center')],
                  ['right', t('align.right')],
                  ['justify', t('align.justify')]
                ]}
                onChange={(v) => set({ align: (v || undefined) as Attrs['align'] })}
              />
            </>
          )}
        </div>
        <label className="format-raw">
          <span className="muted small">{t('format.raw')}</span>
          <input
            value={raw ?? text}
            spellCheck={false}
            onChange={(e) => {
              setRaw(e.target.value)
              const r = parseAttrs(e.target.value)
              if (!r.problems.length) setA(r.attrs)
            }}
            onBlur={() => setRaw(null)}
          />
          {parsed?.problems.map((p, i) => (
            <span key={i} className="field-error">
              {t(p.message)}
            </span>
          ))}
        </label>
        {saving !== null && (
          <div className="format-save">
            <input
              autoFocus
              placeholder={t('format.name')}
              value={saving}
              onChange={(e) => setSaving(e.target.value.trim())}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && saving && !saveError) onSaveStyle?.(saving, a)
              }}
            />
            <button
              className="primary"
              disabled={!saving || !!saveError}
              onClick={() => onSaveStyle?.(saving, a)}
            >
              {t('format.saveStyleConfirm')}
            </button>
            {saveError && <span className="field-error">{saveError}</span>}
          </div>
        )}
        <div className="dialog-buttons">
          {mode === 'text' && onSaveStyle && saving === null && (
            <button
              className="spacer-right"
              onClick={() => setSaving('')}
              title={t('tip.saveStyle')}
            >
              {t('format.saveStyle')}
            </button>
          )}
          {mode === 'style' && onDelete && styleName && !(styleName in BUILTIN_STYLES) && (
            <button className="spacer-right danger" onClick={onDelete} title={t('tip.deleteStyle')}>
              {t('format.delete')}
            </button>
          )}
          {mode === 'text' && (
            <button onClick={() => onApply({ styles: [] })} title={t('tip.clearFormat')}>
              {t('format.clear')}
            </button>
          )}
          <button onClick={onClose}>{t('format.cancel')}</button>
          <button
            className="primary"
            disabled={mode === 'style' && (!name || !!nameError)}
            onClick={() => onApply(a, name)}
          >
            {mode === 'style' ? t('format.saveStyleConfirm') : t('format.apply')}
          </button>
        </div>
        {nameError && <span className="field-error">{nameError}</span>}
      </div>
    </Dialog>
  )
}
