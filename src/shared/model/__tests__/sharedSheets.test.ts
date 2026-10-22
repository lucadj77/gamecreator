import { describe, expect, it } from 'vitest'
import type { LoadedSet, Sheet } from '../../project'
import { sharingSets, syncSharedSheets } from '../sharedSheets'

const sheet = (name: string, v: string): Sheet => ({ name, headers: ['nome'], rows: [[v]] })

describe('fogli condivisi', () => {
  const truppe = sheet('Truppe', 'Fante')
  const prev: LoadedSet[] = [
    { name: 'Rosse', template: 'rosso', data: truppe },
    { name: 'Gialle', template: 'giallo', sheet: 'Truppe', data: truppe },
    { name: 'Eroi', template: 'eroe', data: sheet('Eroi', 'Re') }
  ]

  it('trova i set che condividono il foglio', () => {
    expect(sharingSets(prev, 0).map((s) => s.name)).toEqual(['Gialle'])
    expect(sharingSets(prev, 2)).toEqual([])
  })

  it('una modifica di un set passa agli altri con lo stesso foglio', () => {
    const changed = sheet('Truppe', 'Arciere')
    const next = prev.map((s, i) => (i === 1 ? { ...s, data: changed } : s))
    const out = syncSharedSheets(prev, next)
    expect(out[0].data).toBe(changed)
    expect(out[1].data).toBe(changed)
    expect(out[2]).toBe(prev[2])
  })

  it('senza modifiche ai dati restituisce gli stessi set', () => {
    const next = prev.map((s, i) => (i === 2 ? { ...s, template: 'altro' } : s))
    expect(syncSharedSheets(prev, next)).toBe(next)
  })
})
