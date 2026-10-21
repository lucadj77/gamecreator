import type { SetDefinition } from '../project'

// Dati da Google Sheets: il foglio condiviso con chiunque abbia il link si scarica come .xlsx,
// senza account; ogni scheda del foglio Google prende il posto dei dati di un set.

/** Codice del foglio da un link (…/spreadsheets/d/<codice>/…) o dal codice stesso */
export function googleSheetId(link: string): string | null {
  const s = link.trim()
  const m = /\/spreadsheets\/d\/([A-Za-z0-9_-]{20,})/.exec(s)
  if (m) return m[1]
  return /^[A-Za-z0-9_-]{25,}$/.test(s) ? s : null
}

/** Indirizzo da cui scaricare tutto il foglio come .xlsx */
export function googleExportUrl(id: string): string {
  return `https://docs.google.com/spreadsheets/d/${id}/export?format=xlsx`
}

/**
 * Set che riceve ogni scheda: quello con lo stesso foglio o lo stesso nome, poi senza badare a
 * maiuscole; '' se nessuno. Un set riceve al massimo una scheda.
 */
export function matchTabs(
  tabs: string[],
  sets: Pick<SetDefinition, 'name' | 'sheet'>[]
): Record<string, string> {
  const out: Record<string, string> = {}
  const used = new Set<string>()
  const pick = (tab: string, test: (s: Pick<SetDefinition, 'name' | 'sheet'>) => boolean): void => {
    if (out[tab]) return
    const set = sets.find((s) => !used.has(s.name) && test(s))
    if (set) {
      out[tab] = set.name
      used.add(set.name)
    }
  }
  for (const tab of tabs) pick(tab, (s) => (s.sheet ?? s.name) === tab || s.name === tab)
  const low = (v: string): string => v.trim().toLowerCase()
  for (const tab of tabs)
    pick(tab, (s) => low(s.sheet ?? s.name) === low(tab) || low(s.name) === low(tab))
  for (const tab of tabs) out[tab] ??= ''
  return out
}
