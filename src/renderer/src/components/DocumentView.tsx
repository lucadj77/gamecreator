import { useContext, useEffect, useMemo, useRef, useState } from 'react'
import { isValidNoteName, type LoadedSet } from '../../../shared/project'
import type { Template } from '../../../shared/model/template'
import {
  DOC_PAGES,
  DOCUMENTS_DIR,
  documentProblems,
  documentSettings,
  withDocumentSettings
} from '../../../shared/model/document'
import { useI18n } from '../i18n/context'
import { AssetsContext, StylesContext, VariablesContext } from '../render/assets'
import DocumentPreview, { DOC_UNIT } from '../render/DocumentPreview'
import DocumentSettingsPanel from './DocumentSettingsPanel'
import InsertCardDialog from './InsertCardDialog'
import MarkupTextarea from './MarkupTextarea'
import { TrashIcon } from './icons'

// Un documento del progetto (docs/<nome>.md: regolamento, sell sheet, appendice): a sinistra il
// testo in Markdown con il markup di Naibi, a destra l'anteprima sempre visibile, con le carte
// disegnate dal progetto. Si salva da solo mentre si scrive, come le note.

interface Props {
  name: string
  text: string
  /** Nomi degli altri documenti, per non rinominarlo come uno di loro */
  others: string[]
  project: string
  sets: LoadedSet[]
  templates: Template[]
  onChange(text: string): void
  onRename(name: string): void
  onDelete(): void
}

export default function DocumentView({
  name,
  text,
  others,
  project,
  sets,
  templates,
  onChange,
  onRename,
  onDelete
}: Props): React.JSX.Element {
  const { t } = useI18n()
  const assets = useContext(AssetsContext)
  const styles = useContext(StylesContext)
  const variables = useContext(VariablesContext)
  const [draftName, setDraftName] = useState(name)
  const [inserting, setInserting] = useState(false)
  const [pageOpen, setPageOpen] = useState(false)
  const editor = useRef<HTMLTextAreaElement | null>(null)
  const preview = useRef<HTMLDivElement>(null)
  /** Dove rimettere il cursore dopo un inserimento, quando il testo nuovo è arrivato */
  const caret = useRef<number | null>(null)

  const nameError = !isValidNoteName(draftName)
    ? t('document.invalidName', { name: draftName })
    : draftName !== name && others.includes(draftName)
      ? t('document.exists', { name: draftName })
      : null
  const commitName = (): void => {
    if (draftName === name) return
    if (nameError) setDraftName(name)
    else onRename(draftName)
  }

  // gli errori del markup li elenca già il campo; qui carte, immagini e nomi che non si trovano
  const problems = useMemo(
    () =>
      documentProblems(text, { project, sets, assets, styles, variables }).filter((p) =>
        p.message.key.startsWith('doc.')
      ),
    [text, project, sets, assets, styles, variables]
  )

  const settings = useMemo(() => documentSettings(text).settings, [text])
  // la pagina si vede intera: se non ci sta in larghezza si riduce
  const [room, setRoom] = useState(0)
  useEffect(() => {
    const box = preview.current
    if (!box) return undefined
    const observer = new ResizeObserver(() => setRoom(box.clientWidth))
    observer.observe(box)
    return () => observer.disconnect()
  }, [])
  const pageWidth = DOC_PAGES[settings.page][0] * DOC_UNIT
  const zoom = room ? Math.min(1, (room - 26) / pageWidth) : 1

  useEffect(() => {
    const el = editor.current
    if (el && caret.current !== null) {
      el.focus()
      el.setSelectionRange(caret.current, caret.current)
      caret.current = null
    }
  }, [text])

  /** L'anteprima segue il cursore: mostra il blocco che si sta scrivendo */
  const followCaret = (): void => {
    const el = editor.current
    const box = preview.current
    if (el) lastCaret.current = el.selectionEnd
    if (!el || !box || document.activeElement !== el) return
    const at = el.selectionStart
    let target: HTMLElement | null = null
    for (const b of box.querySelectorAll<HTMLElement>('.doc-block'))
      if (Number(b.dataset.from) <= at) target = b
    if (!target) return
    const top = target.offsetTop - box.offsetTop
    if (
      top < box.scrollTop ||
      top + Math.min(target.offsetHeight, 80) > box.scrollTop + box.clientHeight
    )
      box.scrollTo({ top: Math.max(0, top - 40) })
  }

  /** Ultima posizione del cursore nel testo; prima di scrivere si inserisce in fondo */
  const lastCaret = useRef<number | null>(null)
  /** Inserisce un blocco al posto del cursore, su righe sue */
  const insertBlock = (block: string): void => {
    const at = Math.min(lastCaret.current ?? text.length, text.length)
    const before = text.slice(0, at)
    const after = text.slice(at)
    const lead = !before || before.endsWith('\n\n') ? '' : before.endsWith('\n') ? '\n' : '\n\n'
    const tail = after.startsWith('\n\n') ? '' : after.startsWith('\n') ? '\n' : '\n\n'
    caret.current = before.length + lead.length + block.length
    onChange(before + lead + block + tail + after)
  }

  return (
    <section className="content document-view">
      <div className="document-head">
        <input
          className={nameError ? 'document-name invalid' : 'document-name'}
          value={draftName}
          title={nameError ?? t('documents.nameHint')}
          onChange={(e) => setDraftName(e.target.value)}
          onBlur={commitName}
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.currentTarget.blur()
            if (e.key === 'Escape') setDraftName(name)
          }}
        />
        <button onClick={() => setInserting(true)} title={t('documents.insertCardHint')}>
          {t('documents.insertCard')}
        </button>
        <button
          className={pageOpen ? 'active' : ''}
          onClick={() => setPageOpen((o) => !o)}
          title={t('documents.pageButtonHint')}
        >
          {t('documents.page')}
        </button>
        <button className="icon-btn" title={t('documents.delete')} onClick={onDelete}>
          <TrashIcon />
        </button>
      </div>
      <div className={pageOpen ? 'document-body with-settings' : 'document-body'}>
        <div className="document-editor">
          <MarkupTextarea
            ref={editor}
            fields={[]}
            value={text}
            placeholder={t('documents.placeholder')}
            onChange={(e) => {
              lastCaret.current = e.target.selectionEnd
              onChange(e.target.value)
            }}
            onKeyUp={followCaret}
            onSelect={followCaret}
            onClick={followCaret}
          />
          {problems.length > 0 && (
            <ul className="document-problems">
              {problems.map((p, i) => (
                <li key={i}>
                  <button
                    className="link"
                    onClick={() => {
                      editor.current?.focus()
                      editor.current?.setSelectionRange(p.from, p.to)
                    }}
                  >
                    {t(p.message)}
                  </button>
                </li>
              ))}
            </ul>
          )}
          <p className="muted small">
            {t('documents.hint', { file: `${DOCUMENTS_DIR}/${name}.md` })}
          </p>
        </div>
        <div className="document-preview" ref={preview}>
          <DocumentPreview
            text={text}
            project={project}
            sets={sets}
            templates={templates}
            zoom={zoom}
            onPick={(from) => {
              const el = editor.current
              if (!el) return
              el.focus()
              el.setSelectionRange(from, from)
              // il campo scorre fino al cursore: si toglie e si rimette il fuoco
              el.blur()
              el.focus()
            }}
          />
        </div>
        {pageOpen && (
          <DocumentSettingsPanel
            settings={settings}
            onChange={(change) => onChange(withDocumentSettings(text, change))}
            onClose={() => setPageOpen(false)}
          />
        )}
      </div>
      {inserting && (
        <InsertCardDialog
          sets={sets}
          templates={templates}
          project={project}
          onInsert={(block) => {
            setInserting(false)
            insertBlock(block)
          }}
          onClose={() => setInserting(false)}
        />
      )}
    </section>
  )
}
