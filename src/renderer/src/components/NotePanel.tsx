import { useState } from 'react'
import { isValidNoteName } from '../../../shared/project'
import MarkupText from '../render/MarkupText'
import { useI18n } from '../i18n/context'
import { TrashIcon } from './icons'
import Segmented from './Segmented'

// Una nota del progetto (notes/<nome>.md), accanto a qualsiasi schermata: si scrive in Markdown e
// si salva da sola mentre si scrive.

interface Props {
  name: string
  text: string
  /** Nomi delle altre note, per non rinominarla come una di loro */
  others: string[]
  onChange(text: string): void
  onRename(name: string): void
  onDelete(): void
  onClose(): void
}

export default function NotePanel({
  name,
  text,
  others,
  onChange,
  onRename,
  onDelete,
  onClose
}: Props): React.JSX.Element {
  const { t } = useI18n()
  // una nota già scritta si apre in anteprima, una nuova (vuota) per scriverla
  const [mode, setMode] = useState<'edit' | 'preview'>(text.trim() ? 'preview' : 'edit')
  // il pannello si ricrea con un'altra nota o un nome nuovo (key), quindi basta lo stato iniziale
  const [draftName, setDraftName] = useState(name)

  const nameError = !isValidNoteName(draftName)
    ? t('note.invalidName', { name: draftName })
    : draftName !== name && others.includes(draftName)
      ? t('note.exists', { name: draftName })
      : null
  const commitName = (): void => {
    if (draftName === name) return
    if (nameError) setDraftName(name)
    else onRename(draftName)
  }

  return (
    <aside className="note-panel" aria-label={t('notes.panel')}>
      <div className="note-panel-head">
        <input
          className={nameError ? 'note-name invalid' : 'note-name'}
          value={draftName}
          title={nameError ?? t('notes.nameHint')}
          onChange={(e) => setDraftName(e.target.value)}
          onBlur={commitName}
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.currentTarget.blur()
            if (e.key === 'Escape') setDraftName(name)
          }}
        />
        <button className="icon-btn danger" title={t('notes.delete')} onClick={onDelete}>
          <TrashIcon />
        </button>
        <button className="icon-btn note-close" title={t('notes.close')} onClick={onClose}>
          ×
        </button>
      </div>
      <Segmented<'edit' | 'preview'>
        value={mode}
        onChange={setMode}
        options={[
          ['edit', t('notes.edit')],
          ['preview', t('notes.preview')]
        ]}
      />
      {mode === 'edit' ? (
        <textarea
          className="note-text"
          value={text}
          placeholder={t('notes.placeholder')}
          spellCheck
          autoFocus
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <div className="note-preview">
          {text.trim() ? (
            <MarkupText text={text} unit={3.8} ratio={1} paragraphSpacing={1.5} />
          ) : (
            <p className="muted">{t('notes.empty')}</p>
          )}
        </div>
      )}
      <p className="muted small">{t('notes.hint', { file: `notes/${name}.md` })}</p>
    </aside>
  )
}
