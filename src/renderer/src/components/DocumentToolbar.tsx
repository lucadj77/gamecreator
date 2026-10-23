import { useContext } from 'react'
import { BUILTIN_STYLES } from '../../../shared/model/markup'
import {
  applyStyle,
  changedRange,
  setHeading,
  toggleLines,
  toggleWrap,
  type DocEdit,
  type WrapMark
} from '../../../shared/model/docEdit'
import { useI18n } from '../i18n/context'
import { StylesContext } from '../render/assets'
import type { FormatControl } from './MarkupTextarea'
import Menu from './Menu'
import { ImageIcon } from './icons'

// Barra sopra il testo di un documento: grassetto, corsivo, titoli, elenchi, stili e gli
// inserimenti (immagine, tabella, carta, anatomia, tavolo). Scrive nel campo come si scriverebbe
// a mano, così ⌘Z annulla anche questi cambiamenti.

interface Props {
  editor: React.RefObject<HTMLTextAreaElement | null>
  format: FormatControl
  /** Livello del titolo dove sta il cursore, 0 per un paragrafo */
  level: number
  onImage(): void
  onTable(): void
  onCard(): void
  onAnatomy(): void
  onSetup(): void
}

/** Scrive il cambiamento nel campo come un'immissione da tastiera e rimette la selezione */
function run(
  el: HTMLTextAreaElement | null,
  edit: (src: string, a: number, b: number) => DocEdit
): void {
  if (!el) return
  const src = el.value
  const next = edit(src, el.selectionStart, el.selectionEnd)
  const r = changedRange(src, next.text)
  el.focus()
  el.setSelectionRange(r.from, r.to)
  // execCommand tiene la modifica nella cronologia del campo, a differenza di value =
  if (!document.execCommand('insertText', false, r.insert)) {
    el.setRangeText(r.insert, r.from, r.to)
    el.dispatchEvent(new Event('input', { bubbles: true }))
  }
  el.setSelectionRange(next.from, next.to)
}

export default function DocumentToolbar({
  editor,
  format,
  level,
  onImage,
  onTable,
  onCard,
  onAnatomy,
  onSetup
}: Props): React.JSX.Element {
  const { t } = useI18n()
  const styles = useContext(StylesContext)
  const styleNames = [...new Set([...Object.keys(styles), ...Object.keys(BUILTIN_STYLES)])].sort()

  const wrap = (mark: WrapMark) => () => run(editor.current, (s, a, b) => toggleWrap(s, a, b, mark))
  const button = (
    label: React.ReactNode,
    title: string,
    onClick: () => void,
    cls = ''
  ): React.JSX.Element => (
    <button
      className={`doc-tool ${cls}`}
      title={title}
      aria-label={title}
      // il clic non deve togliere la selezione al campo
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
    >
      {label}
    </button>
  )

  return (
    <div className="document-toolbar" role="toolbar">
      <select
        className="doc-heading"
        value={level > 3 ? 3 : level}
        title={t('docTools.headingHint')}
        onChange={(e) =>
          run(editor.current, (s, a, b) => setHeading(s, a, b, Number(e.target.value)))
        }
      >
        <option value={0}>{t('docTools.paragraph')}</option>
        <option value={1}>{t('docTools.heading', { n: 1 })}</option>
        <option value={2}>{t('docTools.heading', { n: 2 })}</option>
        <option value={3}>{t('docTools.heading', { n: 3 })}</option>
      </select>
      <span className="sep" />
      {button(<b>B</b>, t('docTools.bold'), wrap('**'))}
      {button(<i>I</i>, t('docTools.italic'), wrap('*'))}
      {button(<u>U</u>, t('docTools.underline'), wrap('++'))}
      {button(<s>S</s>, t('docTools.strike'), wrap('~~'))}
      <span className="sep" />
      {button('•≡', t('docTools.bullets'), () =>
        run(editor.current, (s, a, b) => toggleLines(s, a, b, 'bullet'))
      )}
      {button('1≡', t('docTools.numbers'), () =>
        run(editor.current, (s, a, b) => toggleLines(s, a, b, 'number'))
      )}
      {button('❝', t('docTools.quote'), () =>
        run(editor.current, (s, a, b) => toggleLines(s, a, b, 'quote'))
      )}
      <span className="sep" />
      <Menu
        className="doc-tool"
        label={t('docTools.style')}
        title={t('docTools.styleHint')}
        items={[
          ...styleNames.map((name) => ({
            label: name,
            onClick: () =>
              run(editor.current, (s, a, b) => applyStyle(s, a, b, name, t('docTools.sample')))
          })),
          'sep' as const,
          {
            label: t('format.button'),
            title: t('format.buttonHint'),
            disabled: !format.enabled,
            onClick: format.open
          }
        ]}
      />
      <span className="sep" />
      {button(
        <>
          <ImageIcon /> {t('docTools.image')}
        </>,
        t('docTools.imageHint'),
        onImage
      )}
      {button(t('documents.table'), t('documents.tableButtonHint'), onTable)}
      {button(t('documents.insertCard'), t('documents.insertCardHint'), onCard)}
      {button(t('documents.anatomy'), t('documents.anatomyButtonHint'), onAnatomy)}
      {button(t('documents.setup'), t('documents.setupButtonHint'), onSetup)}
    </div>
  )
}
