import type { LoadedSet, ProjectFile, SetDefinition, Sheet } from '../project'
import { walkLayers } from './normalize'
import type { Template } from './template'
import type { Variables } from './variables'

// Progetti in più lingue: le lingue stanno in stella.json (languages, la prima è la principale),
// i testi tradotti nelle colonne `campo@lingua` del foglio, i nomi tradotti di progetto e set in
// `names`. Vedi docs/formato.md, "Lingue".

/** Codice di una lingua: due o tre lettere minuscole, con una variante facoltativa (pt-BR) */
const CODE = /^[a-z]{2,3}(?:-[A-Za-z0-9]{2,8})?$/

export function isLanguageCode(code: string): boolean {
  return CODE.test(code)
}

/** Lingue del progetto, la principale per prima; vuoto se il progetto ha una sola lingua */
export function projectLanguages(file: Pick<ProjectFile, 'languages'>): string[] {
  const out: string[] = []
  for (const l of file.languages ?? []) if (isLanguageCode(l) && !out.includes(l)) out.push(l)
  return out.length > 1 ? out : []
}

/** `nome@en` → nome e en; un'intestazione senza lingua valida resta com'è */
export function splitLanguage(header: string): { base: string; language: string | null } {
  const at = header.lastIndexOf('@')
  if (at <= 0) return { base: header, language: null }
  const language = header.slice(at + 1)
  return isLanguageCode(language)
    ? { base: header.slice(0, at), language }
    : { base: header, language: null }
}

/** Una colonna tradotta: `nome@en`, `immagine.src@en` */
export function isTranslatedColumn(header: string): boolean {
  return splitLanguage(header).language !== null
}

/**
 * Celle tradotte di una riga nella lingua scelta, per colonna di base: `nome@en` dà nome. Una
 * cella vuota non c'è, e la carta usa il valore della lingua principale.
 */
export function translatedCells(
  fields: Record<string, string>,
  language: string
): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [h, v] of Object.entries(fields)) {
    if (v === '') continue
    const s = splitLanguage(h)
    if (s.language === language) out[s.base] = v
  }
  return out
}

/** Testo di una traduzione: quello della lingua, se c'è e non è vuoto */
export function translation(
  map: Record<string, string> | undefined,
  language: string | undefined
): string | undefined {
  const v = language ? map?.[language] : undefined
  return v !== undefined && v.trim() !== '' ? v : undefined
}

/** La lingua in cui si disegnano le carte, quando non è la principale, con i nomi tradotti */
export interface Localization {
  language: string
  /** Nome del progetto in questa lingua */
  project?: string
  /** Nome di ogni set in questa lingua, per nome del set */
  sets?: Record<string, string>
}

/** La traduzione per una lingua; nessuna per la lingua principale o una che il progetto non ha */
export function localizationOf(
  file: Pick<ProjectFile, 'languages' | 'names'>,
  sets: Pick<SetDefinition, 'name' | 'names'>[],
  language: string | null | undefined
): Localization | undefined {
  const langs = projectLanguages(file)
  if (!language || !langs.includes(language) || language === langs[0]) return undefined
  const setNames: Record<string, string> = {}
  for (const s of sets) {
    const n = s.names?.[language]?.trim()
    if (n) setNames[s.name] = n
  }
  return {
    language,
    ...(file.names?.[language]?.trim() ? { project: file.names[language].trim() } : {}),
    ...(Object.keys(setNames).length ? { sets: setNames } : {})
  }
}

/**
 * Colonne da aggiungere per tradurre un foglio: per ogni colonna di testo senza lingua quella
 * `@lingua` che ancora manca. Le colonne con soli numeri (costo, forza) non si traducono.
 */
export function missingTranslationColumns(
  sheet: Pick<Sheet, 'headers' | 'rows'>,
  language: string,
  textColumns: Set<string>
): string[] {
  const { headers, rows } = sheet
  const words = (i: number): boolean =>
    rows.some((r) => {
      const v = (r[i] ?? '').trim()
      return v !== '' && !/^[-+]?\d+([.,]\d+)?%?$/.test(v)
    })
  return headers
    .filter(
      (h, i) =>
        textColumns.has(h) &&
        !isTranslatedColumn(h) &&
        !headers.includes(`${h}@${language}`) &&
        words(i)
    )
    .map((h) => `${h}@${language}`)
}

/** Un testo da tradurre: ha almeno una lettera fuori dai richiami {campo} e {img} */
function hasWords(text: string): boolean {
  return /\p{L}/u.test(text.replace(/\{[^{}]*\}/g, ''))
}

/** Una traduzione che manca, per `stella check`: dove sta e cosa dice nella lingua principale */
export interface MissingTranslation {
  where: string
  text: string
}

/**
 * Testi senza traduzione in `language`: livelli di testo fissi e variabili di testo con parole,
 * livelli valore e variabili valore che hanno già una traduzione in un'altra lingua, celle vuote
 * di una colonna `@lingua` quando la principale ha parole. Sono solo avvisi: la carta usa il testo
 * della lingua principale.
 */
export function missingTranslations(
  project: {
    templates: Pick<Template, 'name' | 'front' | 'back'>[]
    variables?: Variables
    sets: Pick<LoadedSet, 'name' | 'data'>[]
  },
  language: string
): MissingTranslation[] {
  const out: MissingTranslation[] = []
  const lacks = (map: Record<string, string> | undefined): boolean =>
    translation(map, language) === undefined
  const elsewhere = (map: Record<string, string> | undefined): boolean =>
    Object.values(map ?? {}).some((v) => v.trim() !== '')
  for (const t of project.templates)
    for (const side of ['front', 'back'] as const)
      for (const l of walkLayers(t[side])) {
        if (l.type !== 'text' && l.type !== 'value') continue
        if (l.source.kind !== 'fixed') continue
        const where = `template ${t.name}, layer ${l.name} (${side})`
        if (l.type === 'text' && hasWords(l.text) && lacks(l.texts))
          out.push({ where, text: l.text })
        if (l.type === 'value' && elsewhere(l.values) && lacks(l.values))
          out.push({ where, text: l.value })
      }
  for (const [name, v] of Object.entries(project.variables ?? {})) {
    if (v.type === 'text' && hasWords(v.text) && lacks(v.texts))
      out.push({ where: `variable ${name}`, text: v.text })
    if (v.type === 'value' && elsewhere(v.values) && lacks(v.values))
      out.push({ where: `variable ${name}`, text: v.value })
  }
  for (const s of project.sets) {
    if (!s.data) continue
    const { headers, rows } = s.data
    headers.forEach((h, i) => {
      const sl = splitLanguage(h)
      if (sl.language !== language) return
      const main = headers.indexOf(sl.base)
      if (main < 0) return
      rows.forEach((r, n) => {
        const v = r[main] ?? ''
        if (hasWords(v) && (r[i] ?? '').trim() === '')
          out.push({ where: `${s.name} #${n + 1}, column ${h}`, text: v })
      })
    })
  }
  return out
}
