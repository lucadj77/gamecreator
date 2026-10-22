import type { ProjectFile, SetDefinition, Sheet } from '../project'

// Progetti in più lingue: le lingue stanno in naibi.json (languages, la prima è la principale),
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
