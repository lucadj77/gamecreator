import { useMemo, useState } from 'react'
import type { LoadedSet } from '../../../shared/project'
import type { Side, Template } from '../../../shared/model/template'
import { bindRow } from '../../../shared/model/bind'
import { systemOfSet } from '../../../shared/model/system'
import { cardRefSource, type CardRef } from '../../../shared/model/document'
import { Dialog } from '../editor/dialogs'
import { useI18n } from '../i18n/context'
import CardSvg from '../render/CardSvg'
import { useBindContext } from '../render/assets'
import Segmented from './Segmented'

/** Carte mostrate al massimo nella griglia: con un set grande si cerca per nome */
const MAX_SHOWN = 60

/**
 * Sceglie una carta del progetto e scrive nel documento il riferimento ![nome](card:…), senza
 * doverne ricordare la sintassi
 */
export default function InsertCardDialog({
  sets,
  templates,
  project,
  onInsert,
  onClose
}: {
  sets: LoadedSet[]
  templates: Template[]
  project: string
  /** Il testo da inserire: ![didascalia](card:…) */
  onInsert(text: string): void
  onClose(): void
}): React.JSX.Element {
  const { t } = useI18n()
  const [setName, setSetName] = useState('')
  const bindCtx = useBindContext()
  const { usable, set, template, cards } = useMemo(() => {
    const usable = sets.filter((s) => s.data?.rows.length)
    const set = usable.find((s) => s.name === setName) ?? usable[0]
    const template = set && templates.find((x) => x.name === set.template)
    const info = set ? systemOfSet(project, set) : null
    const cards =
      set?.data && template && info
        ? set.data.rows.map((row, i) =>
            bindRow(set.data!.headers, row, template, templates, {
              ...bindCtx,
              system: { ...info, number: i + 1 }
            })
          )
        : []
    return { usable, set, template, cards }
  }, [sets, setName, templates, bindCtx, project])
  const headers = (set?.data?.headers ?? []).filter((h) => h && h !== 'amount' && !h.includes('.'))

  const [query, setQuery] = useState('')
  const [row, setRow] = useState(0)
  // di base si cerca la carta per il campo del nome: il riferimento regge se le righe cambiano ordine
  const defaultKey =
    (template?.labelField && headers.includes(template.labelField)
      ? template.labelField
      : headers[0]) ?? ''
  const [keyChoice, setKey] = useState<string | null>(null)
  const key =
    keyChoice !== null && (keyChoice === '' || headers.includes(keyChoice)) ? keyChoice : defaultKey
  const [side, setSide] = useState<Side>('front')
  const [width, setWidth] = useState('')
  const [caption, setCaption] = useState<string | null>(null)

  const shown = cards
    .map((c, i) => ({ c, i }))
    .filter(({ c }) => !query.trim() || c.label.toLowerCase().includes(query.trim().toLowerCase()))
  const current = cards[row] ? row : 0
  const col = set?.data?.headers.indexOf(key) ?? -1
  const value = col >= 0 ? (set?.data?.rows[current]?.[col] ?? '').trim() : ''
  const repeated =
    col >= 0 &&
    value !== '' &&
    (set?.data?.rows.filter((r) => (r[col] ?? '').trim() === value).length ?? 0) > 1
  // per campo solo se il valore c'è e distingue la carta; altrimenti per numero
  const byField = key !== '' && value !== '' && !repeated
  const ref: CardRef | null = set
    ? {
        set: set.name,
        ...(byField ? { field: key, value } : { row: current + 1 }),
        side,
        ...(Number(width) > 0 ? { width: Number(width) } : {})
      }
    : null
  const alt = caption ?? cards[current]?.label ?? ''
  const text = ref ? `![${alt.replace(/[[\]]/g, '')}](${cardRefSource(ref)})` : ''

  return (
    <Dialog title={t('documents.insertCard')} onClose={onClose}>
      <div className="dialog-form insert-card">
        {!set ? (
          <p className="muted">{t('documents.noCards')}</p>
        ) : (
          <>
            <div className="dialog-row">
              <label>
                {t('documents.set')}
                <select
                  value={set.name}
                  onChange={(e) => {
                    setSetName(e.target.value)
                    setRow(0)
                    setKey(null)
                    setCaption(null)
                  }}
                >
                  {usable.map((s) => (
                    <option key={s.name}>{s.name}</option>
                  ))}
                </select>
              </label>
              <label className="grow">
                {t('documents.search')}
                <input
                  autoFocus
                  value={query}
                  placeholder={t('documents.searchHint')}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </label>
            </div>
            <div className="insert-card-grid">
              {shown.slice(0, MAX_SHOWN).map(({ c, i }) => (
                <button
                  key={i}
                  className={i === current ? 'active' : ''}
                  title={c.label}
                  onClick={() => {
                    setRow(i)
                    setCaption(null)
                  }}
                >
                  <CardSvg template={c.template} side={side} scale={80 / c.template.width} />
                  <span>{c.label || `#${i + 1}`}</span>
                </button>
              ))}
              {shown.length > MAX_SHOWN && (
                <p className="muted small">
                  {t('documents.more', { n: shown.length - MAX_SHOWN })}
                </p>
              )}
            </div>
            <div className="dialog-row">
              <label>
                {t('documents.side')}
                <Segmented<Side>
                  value={side}
                  options={[
                    ['front', t('documents.front')],
                    ['back', t('documents.back')]
                  ]}
                  onChange={setSide}
                />
              </label>
              <label>
                {t('documents.width')}
                <input
                  className="num"
                  type="number"
                  min={5}
                  value={width}
                  placeholder={template ? String(template.width) : ''}
                  onChange={(e) => setWidth(e.target.value)}
                />
              </label>
              <label className="grow">
                {t('documents.findBy')}
                <select value={key} onChange={(e) => setKey(e.target.value)}>
                  <option value="">{t('documents.byNumber')}</option>
                  {headers.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            {key !== '' && !byField && (
              <p className="muted small">
                {t(repeated ? 'documents.repeatedValue' : 'documents.emptyValue', { field: key })}
              </p>
            )}
            <label>
              {t('documents.caption')}
              <input value={alt} onChange={(e) => setCaption(e.target.value)} />
            </label>
            <code className="insert-card-code">{text}</code>
          </>
        )}
        <div className="dialog-buttons">
          <button onClick={onClose}>{t('dialog.cancel')}</button>
          <button className="primary" disabled={!text} onClick={() => onInsert(text)}>
            {t('documents.insert')}
          </button>
        </div>
      </div>
    </Dialog>
  )
}
