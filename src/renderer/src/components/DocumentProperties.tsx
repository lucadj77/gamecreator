import { useState } from 'react'
import {
  documentProperties,
  isPropertyKey,
  withDocumentProperties,
  type DocProperty
} from '../../../shared/model/document'
import { useI18n } from '../i18n/context'

// Proprietà del documento, come in Obsidian: le voci del frontmatter YAML in testa al file (tags,
// tipo, autore…) in una tabella da modificare. Non si stampano, a meno di spuntare "Mostra nel
// documento" (showProperties). Le impostazioni della pagina stanno nel pannello Pagina.

export default function DocumentProperties({
  text,
  shown,
  onChange,
  onShow
}: {
  text: string
  /** Le proprietà si mostrano in testa al documento ed escono nelle esportazioni */
  shown: boolean
  onChange(text: string): void
  onShow(show: boolean): void
}): React.JSX.Element {
  const { t } = useI18n()
  const entries = documentProperties(text)
  const [open, setOpen] = useState(entries.length > 0)
  /** La proprietà che si sta aggiungendo: entra nel testo quando ha un nome valido */
  const [draft, setDraft] = useState<{ key: string; value: string } | null>(null)

  const write = (next: DocProperty[]): void => onChange(withDocumentProperties(text, next))
  const update = (i: number, change: Partial<DocProperty>): void =>
    write(entries.map((p, k) => (k === i ? { ...p, ...change } : p)))
  const commitDraft = (): void => {
    if (!draft) return
    const key = draft.key.trim()
    if (isPropertyKey(key) && !entries.some((p) => p.key === key))
      write([...entries, { key, value: draft.value, list: draft.value.includes(',') }])
    setDraft(null)
  }
  const draftError =
    draft && draft.key.trim() && !isPropertyKey(draft.key.trim())
      ? t('documents.propertyInvalid')
      : draft && entries.some((p) => p.key === draft.key.trim())
        ? t('documents.propertyExists')
        : null

  return (
    <div className="document-properties">
      <div className="document-properties-head">
        <button className="link" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
          {open ? '▾' : '▸'} {t('documents.properties')}
          {entries.length > 0 && <span className="muted"> ({entries.length})</span>}
        </button>
        <label className="document-properties-show" title={t('documents.showPropertiesHint')}>
          <input type="checkbox" checked={shown} onChange={(e) => onShow(e.target.checked)} />
          {t('documents.showProperties')}
        </label>
      </div>
      {open && (
        <>
          {entries.length === 0 && !draft && (
            <p className="muted small">{t('documents.propertiesHint')}</p>
          )}
          <table>
            <tbody>
              {entries.map((p, i) => (
                <tr key={p.key}>
                  <th title={p.list ? t('documents.propertyList') : undefined}>
                    {p.key}
                    {p.list && <span className="muted"> ≡</span>}
                  </th>
                  <td>
                    {p.value.length > 60 ? (
                      <textarea
                        rows={Math.min(5, Math.ceil(p.value.length / 60))}
                        value={p.value}
                        onChange={(e) => update(i, { value: e.target.value.replace(/\n/g, ' ') })}
                      />
                    ) : (
                      <input
                        value={p.value}
                        placeholder={p.list ? t('documents.propertyListHint') : undefined}
                        onChange={(e) => update(i, { value: e.target.value })}
                      />
                    )}
                  </td>
                  <td>
                    <button
                      className="icon-btn"
                      title={t('documents.removeProperty')}
                      onClick={() => write(entries.filter((_, k) => k !== i))}
                    >
                      ×
                    </button>
                  </td>
                </tr>
              ))}
              {draft && (
                <tr>
                  <th>
                    <input
                      autoFocus
                      value={draft.key}
                      placeholder={t('documents.propertyName')}
                      onChange={(e) => setDraft({ ...draft, key: e.target.value })}
                      onKeyDown={(e) => {
                        if (e.key === 'Escape') setDraft(null)
                      }}
                    />
                  </th>
                  <td>
                    <input
                      value={draft.value}
                      placeholder={t('documents.propertyValue')}
                      onChange={(e) => setDraft({ ...draft, value: e.target.value })}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') commitDraft()
                        if (e.key === 'Escape') setDraft(null)
                      }}
                    />
                  </td>
                  <td>
                    <button
                      className="icon-btn"
                      title={t('documents.addProperty')}
                      disabled={!draft.key.trim() || !!draftError}
                      onClick={commitDraft}
                    >
                      ✓
                    </button>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          {draftError && <p className="field-error">{draftError}</p>}
          {!draft && (
            <button className="link" onClick={() => setDraft({ key: '', value: '' })}>
              + {t('documents.addProperty')}
            </button>
          )}
        </>
      )}
    </div>
  )
}
