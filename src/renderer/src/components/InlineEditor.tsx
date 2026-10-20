import { useEffect, useRef } from 'react'
import type { Bounds } from '../../../shared/model/edit'
import type { Layer } from '../../../shared/model/template'
import { useI18n } from '../i18n/context'
import AssetPicker from './AssetPicker'
import MarkupTextarea from './MarkupTextarea'

/** Livello che si sta modificando direttamente sulla carta in anteprima */
export interface InlineEdit {
  column: string
  type: Layer['type']
  /** Riquadro del livello sulla carta, in millimetri */
  box: Bounds
  /** Valore della cella all'apertura: Esc lo ripristina */
  original: string
  row: number
}

/**
 * Modifica sulla carta: il testo si scrive in un riquadro sopra il livello, le immagini si
 * scelgono dalle miniature, le forme cambiano colore. Ogni modifica va subito nella cella;
 * Esc annulla, un clic fuori o Ctrl+Invio chiude.
 */
export default function InlineEditor({
  edit,
  scale,
  value,
  fields,
  onChange,
  onClose
}: {
  edit: InlineEdit
  /** Pixel per millimetro dell'anteprima */
  scale: number
  value: string
  fields: string[]
  onChange(value: string): void
  onClose(): void
}): React.JSX.Element | null {
  const { t } = useI18n()
  const boxRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement | HTMLInputElement | null>(null)

  useEffect(() => {
    inputRef.current?.focus()
    if (inputRef.current instanceof HTMLTextAreaElement) inputRef.current.select()
  }, [])

  // un clic fuori chiude; i dialoghi aperti dal campo (formato, icone) non contano
  useEffect(() => {
    if (edit.type === 'image') return
    const onDown = (e: PointerEvent): void => {
      const el = e.target as Element
      if (boxRef.current?.contains(el) || el.closest?.('.dialog-backdrop')) return
      onClose()
    }
    window.addEventListener('pointerdown', onDown, true)
    return () => window.removeEventListener('pointerdown', onDown, true)
  }, [edit.type, onClose])

  const onKeyDown = (e: React.KeyboardEvent): void => {
    if (e.defaultPrevented) return
    if (e.key === 'Escape') {
      e.preventDefault()
      e.stopPropagation()
      if (value !== edit.original) onChange(edit.original)
      onClose()
    } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      onClose()
    }
  }

  if (edit.type === 'image')
    return (
      <AssetPicker
        value={value}
        onPick={(name) => {
          onChange(name)
          onClose()
        }}
        onClose={onClose}
      />
    )

  const style: React.CSSProperties = {
    left: edit.box.x * scale,
    top: edit.box.y * scale,
    width: Math.max(edit.box.w * scale, 140),
    minHeight: edit.box.h * scale
  }
  return (
    <div
      ref={boxRef}
      className={`inline-editor inline-editor-${edit.type}`}
      style={style}
      // i clic dentro non devono scegliere un altro campo né riaprire la modifica
      onClick={(e) => e.stopPropagation()}
      onDoubleClick={(e) => e.stopPropagation()}
    >
      {edit.type === 'shape' ? (
        <span className="inline-editor-color">
          <input
            type="color"
            ref={(el) => {
              inputRef.current = el
            }}
            value={/^#[0-9a-f]{6}$/i.test(value) ? value : '#000000'}
            title={t('cardForm.pickColor')}
            onChange={(e) => onChange(e.target.value.toUpperCase())}
            onKeyDown={onKeyDown}
          />
          <input
            value={value}
            placeholder={edit.original}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={onKeyDown}
          />
        </span>
      ) : (
        <MarkupTextarea
          ref={(el) => {
            inputRef.current = el
          }}
          value={value}
          fields={fields}
          showProblems={false}
          rows={Math.max(2, value.split('\n').length)}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKeyDown}
        />
      )}
      <span className="inline-editor-hint">{t('inlineEdit.hint')}</span>
    </div>
  )
}
