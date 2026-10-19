import { describe, expect, it } from 'vitest'
import { changelogSection, compareVersions, notesForLanguage, updateFromRelease } from '../update'

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

  it('segnala solo una release più recente e pubblicata', () => {
    const release = { tag_name: 'v1.1.0', body: notes, html_url: 'https://x/v1.1.0' }
    expect(updateFromRelease(release, '1.0.0')).toEqual({
      version: '1.1.0',
      notes,
      url: 'https://x/v1.1.0'
    })
    expect(updateFromRelease(release, '1.1.0')).toBeNull()
    expect(updateFromRelease({ ...release, draft: true }, '1.0.0')).toBeNull()
    expect(updateFromRelease({ message: 'Not Found' }, '1.0.0')).toBeNull()
    expect(updateFromRelease(null, '1.0.0')).toBeNull()
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
