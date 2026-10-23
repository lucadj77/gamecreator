import { describe, expect, it } from 'vitest'
import {
  changelogSection,
  channelFor,
  compareVersions,
  isPrerelease,
  notesForLanguage,
  updateFromReleases
} from '../update'

const notes = `### Italiano

- Controllo degli aggiornamenti

### English

- Update check`

describe('aggiornamenti', () => {
  it('confronta le versioni', () => {
    expect(compareVersions('v1.1.0', '1.0.0')).toBeGreaterThan(0)
    expect(compareVersions('1.0.0', '1.0.0')).toBe(0)
    expect(compareVersions('1.9.0', '1.10.0')).toBeLessThan(0)
    expect(compareVersions('2.0', '1.9.9')).toBeGreaterThan(0)
  })

  it('mette le beta prima della versione ufficiale', () => {
    expect(compareVersions('1.2.0-beta.1', '1.1.0')).toBeGreaterThan(0)
    expect(compareVersions('1.2.0-beta.1', '1.2.0')).toBeLessThan(0)
    expect(compareVersions('1.2.0-beta.2', '1.2.0-beta.1')).toBeGreaterThan(0)
    expect(compareVersions('1.2.0-beta.10', '1.2.0-beta.9')).toBeGreaterThan(0)
    expect(compareVersions('1.2.0-beta', '1.2.0-beta.1')).toBeLessThan(0)
    expect(isPrerelease('v1.2.0-beta.1')).toBe(true)
    expect(isPrerelease('1.2.0')).toBe(false)
  })

  it('propone la release più recente, con le beta solo a chi ha una beta', () => {
    const rel = (tag: string, extra = {}): Record<string, unknown> => ({
      tag_name: tag,
      body: notes,
      html_url: `https://x/${tag}`,
      prerelease: tag.includes('-'),
      ...extra
    })
    const list = [rel('v1.2.0-beta.2'), rel('v1.2.0-beta.1'), rel('v1.1.0'), rel('v1.0.0')]
    expect(updateFromReleases(list, '1.0.0')?.version).toBe('1.1.0')
    expect(updateFromReleases(list, '1.1.0')).toBeNull()
    expect(updateFromReleases(list, '1.2.0-beta.1')?.version).toBe('1.2.0-beta.2')
    expect(updateFromReleases(list, '1.2.0-beta.1')?.url).toBe('https://x/v1.2.0-beta.2')
    // la versione ufficiale supera le sue beta
    expect(updateFromReleases([rel('v1.2.0'), ...list], '1.2.0-beta.2')?.version).toBe('1.2.0')
    expect(updateFromReleases([rel('v1.3.0', { draft: true })], '1.0.0')).toBeNull()
    expect(updateFromReleases({ message: 'Not Found' }, '1.0.0')).toBeNull()
  })

  it('segue il canale scelto', () => {
    const rel = (tag: string): Record<string, unknown> => ({
      tag_name: tag,
      body: '',
      html_url: `https://x/${tag}`,
      prerelease: tag.includes('-')
    })
    const list = [rel('v1.3.0-beta.3'), rel('v1.2.1'), rel('v1.3.0-beta.2'), rel('v1.2.0')]
    // una versione ufficiale con il canale Beta riceve le beta
    expect(updateFromReleases(list, '1.2.0', 'beta')?.version).toBe('1.3.0-beta.3')
    expect(updateFromReleases(list, '1.2.0', 'stable')?.version).toBe('1.2.1')
    // da Beta a Stabile non si torna indietro
    expect(updateFromReleases(list, '1.3.0-beta.2', 'stable')).toBeNull()
    // releases/latest restituisce una release sola
    expect(updateFromReleases(rel('v1.2.1'), '1.2.0', 'stable')?.version).toBe('1.2.1')
    // senza scelta: Beta per chi ha una beta, Stabile per gli altri
    expect(channelFor('1.2.0-beta.30', undefined)).toBe('beta')
    expect(channelFor('1.2.0', null)).toBe('stable')
    expect(channelFor('1.2.0-beta.30', 'stable')).toBe('stable')
    expect(channelFor('1.2.0', 'beta')).toBe('beta')
  })

  it('sceglie le note nella lingua dell interfaccia', () => {
    expect(notesForLanguage(notes, 'it')).toBe('- Controllo degli aggiornamenti')
    expect(notesForLanguage(notes, 'en')).toBe('- Update check')
    expect(notesForLanguage(notes, 'fr')).toBe('- Update check')
    expect(notesForLanguage('- solo questo', 'it')).toBe('- solo questo')
  })

  it('estrae la sezione di una versione dal changelog', () => {
    const log = `# Novità\n\n## 1.1.0\n\n${notes}\n\n## 1.0.0\n\n- Prima versione\n`
    expect(changelogSection(log, 'v1.1.0')).toBe(notes)
    expect(changelogSection(log, '1.0.0')).toBe('- Prima versione')
    expect(changelogSection(log, '1.0')).toBeNull()
    expect(changelogSection(log, '2.0.0')).toBeNull()
  })
})
