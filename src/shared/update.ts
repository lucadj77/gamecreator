// Controllo degli aggiornamenti: l'app confronta la propria versione con l'ultima release
// pubblicata su GitHub e ne mostra le novità. Le note arrivano da CHANGELOG.md, con una parte in
// italiano e una in inglese (vedi docs/rilascio.md).

export const RELEASES_API = 'https://api.github.com/repos/lucadj77/naibi/releases/latest'

export interface UpdateInfo {
  /** Versione senza la v iniziale, per esempio 1.1.0 */
  version: string
  /** Note della release in Markdown */
  notes: string
  /** Pagina della release, da cui si scaricano i pacchetti */
  url: string
}

/** Le parti numeriche di una versione: v1.2.0 → [1, 2, 0] */
function parts(version: string): number[] {
  return version
    .replace(/^v/, '')
    .split(/[.-]/)
    .slice(0, 3)
    .map((p) => parseInt(p, 10) || 0)
}

/** Positivo se a è più recente di b, negativo se è più vecchia, 0 se sono uguali */
export function compareVersions(a: string, b: string): number {
  const pa = parts(a)
  const pb = parts(b)
  for (let i = 0; i < 3; i++) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0)
    if (d) return d
  }
  return 0
}

/** L'aggiornamento descritto dalla risposta di GitHub, se è più recente della versione corrente */
export function updateFromRelease(release: unknown, current: string): UpdateInfo | null {
  if (!release || typeof release !== 'object') return null
  const r = release as Record<string, unknown>
  if (typeof r.tag_name !== 'string' || r.draft || r.prerelease) return null
  if (compareVersions(r.tag_name, current) <= 0) return null
  return {
    version: r.tag_name.replace(/^v/, ''),
    notes: typeof r.body === 'string' ? r.body : '',
    url: typeof r.html_url === 'string' ? r.html_url : ''
  }
}

/**
 * La parte delle note nella lingua dell'interfaccia: le note hanno un titolo per lingua
 * ("### Italiano", "### English"). Senza titoli si mostrano per intero.
 */
export function notesForLanguage(notes: string, lang: string): string {
  const sections = new Map<string, string[]>()
  let current: string[] | null = null
  const before: string[] = []
  for (const line of notes.replace(/\r\n/g, '\n').split('\n')) {
    const m = /^#{1,4}\s*(Italiano|English)\s*$/i.exec(line)
    if (m) {
      current = []
      sections.set(m[1].toLowerCase() === 'italiano' ? 'it' : 'en', current)
    } else (current ?? before).push(line)
  }
  const chosen = sections.get(lang) ?? sections.get('en') ?? before
  return chosen.join('\n').trim()
}

/** La sezione di CHANGELOG.md per una versione: le righe sotto "## 1.1.0" fino alla successiva */
export function changelogSection(changelog: string, version: string): string | null {
  const lines = changelog.replace(/\r\n/g, '\n').split('\n')
  const v = version.replace(/^v/, '')
  const start = lines.findIndex((l) =>
    new RegExp(`^##\\s+v?${v.replace(/\./g, '\\.')}(?=\\s|$)`).test(l)
  )
  if (start < 0) return null
  const end = lines.findIndex((l, i) => i > start && /^##\s/.test(l))
  return lines
    .slice(start + 1, end < 0 ? undefined : end)
    .join('\n')
    .trim()
}
