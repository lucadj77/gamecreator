import { useContext } from 'react'
import { TextField } from '../editor/fields'
import { useI18n } from '../i18n/context'
import { languageName } from '../i18n/languageName'
import { ProjectLanguagesContext } from '../render/assets'

/**
 * Un campo per ogni lingua del progetto oltre la principale, per un testo fisso o una variabile.
 * Un campo vuoto usa il testo della lingua principale e non si salva.
 */
export default function TranslationFields({
  label,
  value,
  multiline,
  markupFields,
  onChange
}: {
  label: string
  value: Record<string, string> | undefined
  multiline?: boolean
  markupFields?: string[]
  /** undefined quando non resta nessuna traduzione */
  onChange(value: Record<string, string> | undefined): void
}): React.JSX.Element | null {
  const { t, lang } = useI18n()
  const languages = useContext(ProjectLanguagesContext)
  if (languages.length < 2) return null
  const change = (language: string, text: string): void => {
    const next = { ...value }
    if (text.trim() === '') delete next[language]
    else next[language] = text
    onChange(Object.keys(next).length ? next : undefined)
  }
  return (
    <div className="translation-fields">
      {languages.slice(1).map((l) => (
        <TextField
          key={l}
          label={`${label} · ${languageName(l, lang)}`}
          value={value?.[l] ?? ''}
          multiline={multiline}
          rows={2}
          markupFields={markupFields}
          placeholder={t('translation.placeholder')}
          onChange={(text) => change(l, text)}
        />
      ))}
    </div>
  )
}
