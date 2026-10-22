import { useContext, useEffect, useMemo, useRef, useState } from 'react'
import { isValidNoteName, type LoadedSet, type ProjectFont } from '../../../shared/project'
import type { Template } from '../../../shared/model/template'
import {
  DOC_PAGES,
  DOCUMENTS_DIR,
  documentProblems,
  documentSettings,
  parseDocument,
  withDocumentSettings,
  type Anatomy
} from '../../../shared/model/document'
import { useI18n } from '../i18n/context'
import { AssetsContext, StylesContext, VariablesContext } from '../render/assets'
import DocumentPreview, { DOC_UNIT } from '../render/DocumentPreview'
import DocumentSettingsPanel from './DocumentSettingsPanel'
import DocumentExportDialog, { type DocExportKind } from './DocumentExportDialog'
import { documentHtml, documentMarkdown } from '../export/documentExport'
import InsertCardDialog from './InsertCardDialog'
import TableDialog, { type TableValue } from './TableDialog'
import MarkupTextarea from './MarkupTextarea'
import Menu from './Menu'

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
  fonts: ProjectFont[]
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
  fonts,
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
  /** Anatomia aperta: nuova, o quella del testo tra from e to */
  const [anatomyEdit, setAnatomyEdit] = useState<{
    value?: Anatomy
    from?: number
    to?: number
  } | null>(null)
  const [pageOpen, setPageOpen] = useState(false)
  const [exporting, setExporting] = useState(false)
  /** La tabella aperta nello strumento: nuova, o quella del testo tra from e to */
  const [tableEdit, setTableEdit] = useState<{
    value?: TableValue
    from?: number
    to?: number
  } | null>(null)
  const editor = useRef<HTMLTextAreaElement | null>(null)
  const preview = useRef<HTMLDivElement>(null)
  const nameInput = useRef<HTMLInputElement>(null)
  /** Dove rimettere il cursore dopo un inserimento, quando il testo nuovo è arrivato */
  const caret = useRef<number | null>(null)
  /** Ultima posizione del cursore nel testo; prima di scrivere si inserisce in fondo */
  const lastCaret = useRef<number | null>(null)

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
      documentProblems(text, { project, sets, assets, styles, variables, templates }).filter((p) =>
        p.message.key.startsWith('doc.')
      ),
    [text, project, sets, assets, styles, variables, templates]
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

  /** Apre lo strumento tabella: sulla tabella dove sta il cursore, se c'è */
  const openTable = (): void => {
    // il campo ricorda il cursore anche dopo aver perso il fuoco
    const at = lastCaret.current === null ? null : (editor.current?.selectionStart ?? null)
    const found =
      at === null
        ? undefined
        : parseDocument(text).find((b) => b.kind === 'table' && b.from <= at && at <= b.to)
    if (found?.kind === 'table')
      setTableEdit({
        value: { header: found.header, align: found.align, rows: found.rows },
        from: found.from,
        to: found.to
      })
    else setTableEdit({})
  }

  /** Apre l'anatomia della carta: quella dove sta il cursore, se c'è */
  const openAnatomy = (): void => {
    const at = lastCaret.current === null ? null : (editor.current?.selectionStart ?? null)
    const found =
      at === null
        ? undefined
        : parseDocument(text).find((b) => b.kind === 'anatomy' && b.from <= at && at <= b.to)
    if (found?.kind === 'anatomy') setAnatomyEdit({ value: found, from: found.from, to: found.to })
    else setAnatomyEdit({})
  }

  /** Riscrive il testo tra from e to, o inserisce un blocco al cursore */
  const putBlock = (md: string, from?: number, to?: number): void => {
    if (from === undefined || to === undefined) insertBlock(md)
    else {
      caret.current = from + md.length
      onChange(text.slice(0, from) + md + text.slice(to))
    }
  }

  /** Esporta dall'anteprima, mostrata per un momento senza riduzione: le carte si misurano così */
  const exportAs = async (kind: DocExportKind): Promise<string> => {
    const page = preview.current?.querySelector<HTMLElement>('.doc-page')
    if (!page) throw new Error('no preview')
    const zoomed = page.style.zoom
    page.style.zoom = '1'
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
    try {
      if (kind === 'md') {
        const ctx = { project, sets, assets, styles, variables }
        return await window.api.exportDocumentFiles(
          await documentMarkdown(page, name, text, ctx, fonts)
        )
      }
      const html = await documentHtml(page, name, settings, fonts)
      const data = kind === 'pdf' ? await window.api.documentPdf(html) : html
      return await window.api.exportDocumentFiles([{ path: `${name}.${kind}`, data }])
    } finally {
      page.style.zoom = zoomed
    }
  }

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
          ref={nameInput}
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
        <Menu
          className="more-button"
          label="⋯"
          title={t('app.more')}
          items={[
            {
              label: t('documents.rename'),
              title: t('documents.nameHint'),
              onClick: () => {
                nameInput.current?.focus()
                nameInput.current?.select()
              }
            },
            'sep',
            {
              label: t('documents.deleteShort'),
              title: t('documents.delete'),
              danger: true,
              onClick: onDelete
            }
          ]}
        />
        <button onClick={() => setInserting(true)} title={t('documents.insertCardHint')}>
          {t('documents.insertCard')}
        </button>
        <button onClick={openAnatomy} title={t('documents.anatomyButtonHint')}>
          {t('documents.anatomy')}
        </button>
        <button onClick={openTable} title={t('documents.tableButtonHint')}>
          {t('documents.table')}
        </button>
        <span className="sep" />
        <button
          className={pageOpen ? 'active' : ''}
          onClick={() => setPageOpen((o) => !o)}
          title={t('documents.pageButtonHint')}
        >
          {t('documents.page')}
        </button>
        <button onClick={() => setExporting(true)} title={t('documents.exportHint')}>
          {t('documents.exportButton')}
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
      {exporting && (
        <DocumentExportDialog
          name={name}
          problems={problems.length}
          onExport={exportAs}
          onClose={() => setExporting(false)}
        />
      )}
      {tableEdit && (
        <TableDialog
          initial={tableEdit.value}
          onClose={() => setTableEdit(null)}
          onSave={(md) => {
            setTableEdit(null)
            putBlock(md, tableEdit.from, tableEdit.to)
          }}
        />
      )}
      {anatomyEdit && (
        <InsertCardDialog
          anatomy
          initial={anatomyEdit.value}
          sets={sets}
          templates={templates}
          project={project}
          onInsert={(md) => {
            setAnatomyEdit(null)
            putBlock(md, anatomyEdit.from, anatomyEdit.to)
          }}
          onClose={() => setAnatomyEdit(null)}
        />
      )}
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
