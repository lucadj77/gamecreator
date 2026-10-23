import {
  DEFAULT_DOC_SETTINGS,
  DOC_PAGES,
  type DocPage,
  type DocSettings
} from '../../../shared/model/document'
import { ColorField, FontField, NumberField, SelectField } from '../editor/fields'
import { useI18n } from '../i18n/context'

// Aspetto della pagina di un documento: formato, margini, caratteri, interlinea e colori. Ogni
// modifica si scrive in testa al file (documentSettings), dove la può cambiare anche un agente.

export default function DocumentSettingsPanel({
  settings: s,
  languages,
  onChange,
  onClose
}: {
  settings: DocSettings
  /** Lingue del progetto, la principale per prima; vuoto con una lingua sola */
  languages: string[]
  onChange(change: Partial<DocSettings>): void
  onClose(): void
}): React.JSX.Element {
  const { t } = useI18n()
  const reset = Object.fromEntries(
    Object.entries(DEFAULT_DOC_SETTINGS).map(([k]) => [k, undefined])
  ) as Partial<DocSettings>
  return (
    <aside className="properties document-settings">
      <div className="document-settings-head">
        <h3>{t('documents.page')}</h3>
        <button className="icon-btn" title={t('dialog.close')} onClick={onClose}>
          ×
        </button>
      </div>
      {(languages.length > 0 || s.language) && (
        <SelectField<string>
          label={t('documents.language')}
          hint={t('documents.languageHint')}
          value={s.language}
          options={[
            ['', t('documents.mainLanguage', { language: languages[0] ?? '' })],
            ...languages.slice(1).map((l): [string, string] => [l, l]),
            ...(s.language && !languages.includes(s.language)
              ? [[s.language, s.language] as [string, string]]
              : [])
          ]}
          onChange={(language) => onChange({ language })}
        />
      )}
      <SelectField<DocPage>
        label={t('documents.pageSize')}
        value={s.page}
        options={(Object.keys(DOC_PAGES) as DocPage[]).map((p) => [p, p])}
        onChange={(page) => onChange({ page })}
      />
      <NumberField
        label={t('documents.margin')}
        value={s.margin}
        unit="mm"
        step={1}
        min={0}
        max={60}
        onChange={(margin) => onChange({ margin })}
      />
      <FontField
        label={t('documents.font')}
        value={s.font}
        placeholder={t('documents.defaultFont')}
        onChange={(font) => onChange({ font: font.trim() })}
      />
      <NumberField
        label={t('documents.size')}
        value={s.size}
        unit="pt"
        min={5}
        max={30}
        onChange={(size) => onChange({ size })}
      />
      <NumberField
        label={t('documents.lineHeight')}
        value={s.lineHeight}
        step={0.05}
        min={0.8}
        max={3}
        onChange={(lineHeight) => onChange({ lineHeight })}
      />
      <NumberField
        label={t('documents.paragraphSpacing')}
        value={s.paragraphSpacing}
        unit="pt"
        step={1}
        min={0}
        max={40}
        onChange={(paragraphSpacing) => onChange({ paragraphSpacing })}
      />
      <SelectField<DocSettings['align']>
        label={t('documents.align')}
        value={s.align}
        options={[
          ['left', t('documents.alignLeft')],
          ['justify', t('documents.alignJustify')]
        ]}
        onChange={(align) => onChange({ align })}
      />
      <ColorField
        label={t('documents.color')}
        value={s.color}
        onChange={(color) => onChange({ color: color ?? DEFAULT_DOC_SETTINGS.color })}
      />
      <FontField
        label={t('documents.headingFont')}
        value={s.headingFont}
        placeholder={t('documents.sameAsText')}
        onChange={(headingFont) => onChange({ headingFont: headingFont.trim() })}
      />
      <ColorField
        label={t('documents.headingColor')}
        value={s.headingColor || null}
        nullable
        fallback={s.color}
        onChange={(headingColor) => onChange({ headingColor: headingColor ?? '' })}
      />
      <p className="muted small">{t('documents.pageHint')}</p>
      <button onClick={() => onChange(reset)}>{t('documents.resetPage')}</button>
    </aside>
  )
}
