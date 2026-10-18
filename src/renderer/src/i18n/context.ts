import { createContext, useContext } from 'react'
import type { Message } from '../../../shared/messages'
import type { MessageKey } from './en'

export const LANGUAGES = { en: 'English', it: 'Italiano' } as const
export type Language = keyof typeof LANGUAGES

export type Translate = (key: MessageKey | Message, params?: Message['params']) => string

export interface I18n {
  lang: Language
  setLang(lang: Language): void
  t: Translate
}

export const I18nContext = createContext<I18n | null>(null)

export function useI18n(): I18n {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useI18n outside I18nProvider')
  return ctx
}
