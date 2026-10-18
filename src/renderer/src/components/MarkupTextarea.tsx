import { useContext, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  markupProblems,
  parseAttrs,
  serializeAttrs,
  spanAt,
  type Attrs
} from '../../../shared/model/markup'
import { suggestAt, type Suggestion, type SuggestionResult } from '../../../shared/model/markupHelp'
import { useI18n } from '../i18n/context'
import type { MessageKey } from '../i18n/en'
import { AssetsContext, SaveStyleContext, StylesContext, VariablesContext } from '../render/assets'
import FormatDialog from './FormatDialog'

type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  ref?: React.Ref<HTMLTextAreaElement>
}

/**
 * Campo di testo con l'aiuto alla scrittura del markup: dentro le graffe propone attributi,
 * stili, colori, forme, campi e immagini, ciascuno con una riga di spiegazione. Sotto il campo
 * elenca gli errori del markup. ↑↓ scelgono, Invio o Tab inseriscono, Esc chiude.
 */
export default function MarkupTextarea({
  fields,
  value,
  onChange,
  onKeyDown,
  onBlur,
  ref: outerRef,
  showProblems = true,
  ...rest
}: TextareaProps & {
  value: string
  /** Campi della carta, proposti dentro {...} */
  fields: string[]
  onChange(e: React.ChangeEvent<HTMLTextAreaElement>): void
  /** Errori sotto il campo; nelle celle della tabella non c'è spazio */
  showProblems?: boolean
}): React.JSX.Element {
  const { t } = useI18n()
  const assets = useContext(AssetsContext)
  const styles = useContext(StylesContext)
  const variables = useContext(VariablesContext)
  const ref = useRef<HTMLTextAreaElement | null>(null)
  const [help, setHelp] = useState<(SuggestionResult & { index: number }) | null>(null)
  const [pos, setPos] = useState<{ x: number; y: number; top: number } | null>(null)
  // dopo Esc non si ripropone nulla finché non si scrive di nuovo
  const dismissed = useRef(false)
  const saveStyle = useContext(SaveStyleContext)
  /** Selezione da formattare: una porzione [testo]{...} esistente o un testo selezionato */
  const [target, setTarget] = useState<FormatTarget | null>(null)
  const [formatting, setFormatting] = useState<FormatTarget | null>(null)

  const setRefs = (el: HTMLTextAreaElement | null): void => {
    ref.current = el
    if (typeof outerRef === 'function') outerRef(el)
    else if (outerRef) (outerRef as React.MutableRefObject<HTMLTextAreaElement | null>).current = el
  }

  const refresh = (el: HTMLTextAreaElement): void => {
    if (showProblems) setTarget(formatTarget(el.value, el.selectionStart, el.selectionEnd))
    if (dismissed.current || el.selectionStart !== el.selectionEnd) return setHelp(null)
    const r = suggestAt(el.value, el.selectionStart, {
      fields,
      assets,
      styles: Object.keys(styles),
      variables
    })
    setHelp(r && r.items.length ? { ...r, index: 0 } : null)
    if (r) setPos(caretPosition(el, el.selectionStart))
  }

  const accept = (s: Suggestion): void => {
    const el = ref.current
    if (!el || !help) return
    const next = el.value.slice(0, help.from) + s.insert + el.value.slice(help.to)
    const caret = help.from + s.insert.length
    // si passa per il setter nativo, così React vede un normale evento di modifica
    setNativeValue(el, next)
    el.setSelectionRange(caret, caret)
    if (s.more) refresh(el)
    else setHelp(null)
  }

  // la posizione del cursore cambia anche con il mouse
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const onSelect = (): void => {
      if (document.activeElement === el) refresh(el)
    }
    document.addEventListener('selectionchange', onSelect)
    return () => document.removeEventListener('selectionchange', onSelect)
  })

  /** Sostituisce la porzione con il testo formattato e la riseleziona */
  const applyFormat = (f: FormatTarget, attrs: Attrs): void => {
    const el = ref.current
    setFormatting(null)
    if (!el) return
    const inner = el.value.slice(f.textFrom, f.textTo)
    const a = serializeAttrs(attrs)
    // senza attributi la porzione torna testo semplice
    const replacement = a ? `[${inner}]{${a}}` : inner
    setNativeValue(el, el.value.slice(0, f.from) + replacement + el.value.slice(f.to))
    el.focus()
    const start = f.from + (a ? 1 : 0)
    el.setSelectionRange(start, start + inner.length)
  }

  const problems = showProblems ? markupProblems(value, styles, fields) : []
  const current = help?.items[help.index]

  return (
    <span className="markup-input">
      <textarea
        {...rest}
        ref={setRefs}
        value={value}
        spellCheck={false}
        onChange={(e) => {
          dismissed.current = false
          onChange(e)
          refresh(e.currentTarget)
        }}
        onBlur={(e) => {
          setHelp(null)
          onBlur?.(e)
        }}
        onKeyDown={(e) => {
          if (help) {
            const n = help.items.length
            if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
              e.preventDefault()
              e.stopPropagation()
              const d = e.key === 'ArrowDown' ? 1 : -1
              setHelp({ ...help, index: (help.index + d + n) % n })
              return
            }
            if ((e.key === 'Enter' && !e.altKey && !e.shiftKey) || e.key === 'Tab') {
              e.preventDefault()
              e.stopPropagation()
              if (current) accept(current)
              return
            }
            if (e.key === 'Escape') {
              e.preventDefault()
              e.stopPropagation()
              dismissed.current = true
              setHelp(null)
              return
            }
          }
          onKeyDown?.(e)
        }}
      />
      {help && pos && (
        <div
          className="markup-help"
          // vicino al fondo della finestra si apre sopra la riga
          style={
            pos.y + 260 > window.innerHeight
              ? { left: pos.x, bottom: window.innerHeight - pos.top }
              : { left: pos.x, top: pos.y }
          }
          // il clic non deve togliere il fuoco al campo
          onMouseDown={(e) => e.preventDefault()}
        >
          <ul>
            {help.items.map((s, i) => (
              <li
                key={s.kind + s.label}
                className={i === help.index ? 'active' : undefined}
                onMouseEnter={() => setHelp({ ...help, index: i })}
                onClick={() => accept(s)}
              >
                {(s.kind === 'color' || s.swatch) && (
                  <span className="swatch" style={{ background: s.swatch ?? s.label }} />
                )}
                <span className="markup-help-label">{s.label}</span>
                <span className="markup-help-kind">
                  {t(`markupHelp.kind.${s.kind}` as MessageKey)}
                </span>
              </li>
            ))}
          </ul>
          {current?.attribute && (
            <p className="markup-help-detail">
              {t(`markupHelp.attr.${current.attribute}` as MessageKey)}
            </p>
          )}
        </div>
      )}
      {showProblems && (
        <span className="markup-tools">
          <button
            className="small-btn"
            disabled={!target}
            title={t('format.buttonHint')}
            // il clic non deve togliere la selezione al campo
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => target && setFormatting(target)}
          >
            {t('format.button')}
          </button>
        </span>
      )}
      {/* fuori dal campo nel DOM: gli stili del modulo della carta non toccano la finestra */}
      {formatting &&
        createPortal(
          <FormatDialog
            mode="text"
            initial={formatting.attrs}
            sample={String(value).slice(formatting.textFrom, formatting.textTo)}
            onApply={(attrs) => applyFormat(formatting, attrs)}
            onSaveStyle={
              saveStyle
                ? (name, attrs) => {
                    saveStyle(name, serializeAttrs(attrs))
                    applyFormat(formatting, { styles: [name] })
                  }
                : undefined
            }
            onClose={() => setFormatting(null)}
          />,
          document.body
        )}
      {problems.length > 0 && (
        <span className="markup-problems">
          {problems.map((p, i) => (
            <span key={i}>{t(p.message)}</span>
          ))}
        </span>
      )}
    </span>
  )
}

function setNativeValue(el: HTMLTextAreaElement, value: string): void {
  const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set
  setter?.call(el, value)
  el.dispatchEvent(new Event('input', { bubbles: true }))
}

/**
 * Posizione dei suggerimenti: in orizzontale al cursore, in verticale appena fuori dal campo.
 * Per trovare il cursore si copia il testo in un elemento
 * invisibile con lo stesso stile e si misura dove cade il segno nel punto del cursore.
 */
function caretPosition(
  el: HTMLTextAreaElement,
  pos: number
): { x: number; y: number; top: number } {
  const cs = getComputedStyle(el)
  const mirror = document.createElement('div')
  for (const p of [
    'boxSizing',
    'width',
    'paddingTop',
    'paddingRight',
    'paddingBottom',
    'paddingLeft',
    'borderTopWidth',
    'borderRightWidth',
    'borderBottomWidth',
    'borderLeftWidth',
    'fontFamily',
    'fontSize',
    'fontWeight',
    'lineHeight',
    'letterSpacing',
    'tabSize'
  ] as const)
    mirror.style[p] = cs[p]
  Object.assign(mirror.style, {
    position: 'fixed',
    visibility: 'hidden',
    whiteSpace: 'pre-wrap',
    overflowWrap: 'break-word',
    top: '0',
    left: '0'
  })
  mirror.textContent = el.value.slice(0, pos)
  const mark = document.createElement('span')
  mark.textContent = '​'
  mirror.appendChild(mark)
  document.body.appendChild(mirror)
  const box = el.getBoundingClientRect()
  const x = box.left + mark.offsetLeft - el.scrollLeft
  document.body.removeChild(mirror)
  // i suggerimenti stanno fuori dal campo, sotto o sopra: così non coprono il testo
  return {
    x: Math.max(4, Math.min(x, window.innerWidth - 300)),
    y: box.bottom + 2,
    top: box.top - 2
  }
}

interface FormatTarget {
  /** Parte del testo sostituita */
  from: number
  to: number
  /** Testo da formattare */
  textFrom: number
  textTo: number
  attrs: Attrs
}

/**
 * Cosa formatta il pulsante: la porzione [testo]{...} in cui sta la selezione o il cursore,
 * altrimenti il testo selezionato (che diventa una porzione nuova).
 */
function formatTarget(text: string, from: number, to: number): FormatTarget | null {
  const span = spanAt(text, from, to)
  if (span && from >= span.start)
    return {
      from: span.start,
      to: span.end,
      textFrom: span.textFrom,
      textTo: span.textTo,
      attrs: parseAttrs(text.slice(span.attrsFrom, span.attrsTo)).attrs
    }
  if (from === to || text.slice(from, to).includes('\n')) return null
  return { from, to, textFrom: from, textTo: to, attrs: { styles: [] } }
}
