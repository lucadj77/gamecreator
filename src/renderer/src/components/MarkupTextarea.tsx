import { useContext, useLayoutEffect, useRef, useState } from 'react'
import { markupProblems } from '../../../shared/model/markup'
import { suggestAt, type Suggestion, type SuggestionResult } from '../../../shared/model/markupHelp'
import { useI18n } from '../i18n/context'
import type { MessageKey } from '../i18n/en'
import { AssetsContext, StylesContext } from '../render/assets'

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
  const ref = useRef<HTMLTextAreaElement | null>(null)
  const [help, setHelp] = useState<(SuggestionResult & { index: number }) | null>(null)
  const [pos, setPos] = useState<{ x: number; y: number; top: number } | null>(null)
  // dopo Esc non si ripropone nulla finché non si scrive di nuovo
  const dismissed = useRef(false)

  const setRefs = (el: HTMLTextAreaElement | null): void => {
    ref.current = el
    if (typeof outerRef === 'function') outerRef(el)
    else if (outerRef) (outerRef as React.MutableRefObject<HTMLTextAreaElement | null>).current = el
  }

  const refresh = (el: HTMLTextAreaElement): void => {
    if (dismissed.current || el.selectionStart !== el.selectionEnd) return setHelp(null)
    const r = suggestAt(el.value, el.selectionStart, {
      fields,
      assets,
      styles: Object.keys(styles)
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

  const problems = showProblems ? markupProblems(value, styles) : []
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
                {s.kind === 'color' && <span className="swatch" style={{ background: s.label }} />}
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
