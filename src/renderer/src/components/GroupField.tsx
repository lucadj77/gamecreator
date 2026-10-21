import { useId } from 'react'
import { useI18n } from '../i18n/context'

// Gruppo di uno stile o di una variabile nella barra laterale: un nome libero, con i gruppi già
// usati come suggerimenti. Vuoto vuol dire nessun gruppo.

export default function GroupField({
  value,
  groups,
  onChange
}: {
  value: string
  groups: string[]
  onChange(group: string): void
}): React.JSX.Element {
  const { t } = useI18n()
  const listId = useId()
  return (
    <div className="field">
      <span className="field-label">{t('group.label')}</span>
      <span className="field-control">
        <input
          value={value}
          list={listId}
          placeholder={t('group.none')}
          onChange={(e) => onChange(e.target.value)}
        />
        <datalist id={listId}>
          {groups.map((g) => (
            <option key={g} value={g} />
          ))}
        </datalist>
      </span>
      <p className="field-note">{t('group.hint')}</p>
    </div>
  )
}
