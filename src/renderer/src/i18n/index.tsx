import { useCallback, useMemo, useState } from 'react'
import { en, type MessageKey } from './en'
import { it } from './it'
import { I18nContext, LANGUAGES, type Language, type Translate } from './context'

const DICTIONARIES: Record<Language, Record<MessageKey, string>> = { en, it }
const STORAGE_KEY = 'language'

function initialLanguage(): Language {
  const saved = localStorage.getItem(STORAGE_KEY)
  if (saved && saved in LANGUAGES) return saved as Language
  return navigator.language.toLowerCase().startsWith('it') ? 'it' : 'en'
}

export function I18nProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const [lang, setLangState] = useState<Language>(initialLanguage)

  const setLang = useCallback((l: Language) => {
    localStorage.setItem(STORAGE_KEY, l)
    setLangState(l)
  }, [])

  const t = useCallback<Translate>(
    (key, params) => {
      const m = typeof key === 'string' ? { key, params } : key
      // una chiave sconosciuta (per esempio da una versione più nuova) si mostra com'è
      const text = DICTIONARIES[lang][m.key as MessageKey] ?? en[m.key as MessageKey] ?? m.key
      return text.replace(/\{(\w+)\}/g, (s, name) => String(m.params?.[name] ?? s))
    },
    [lang]
  )

  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t])
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}
