import { describe, expect, it } from 'vitest'
import type { Sheet } from '../../project'
import { applyImport, importKey, previewImport } from '../importSheet'

const old: Sheet = {
  name: 'Truppe',
  headers: ['amount', 'nome', 'attacco', 'nota'],
  rows: [
    ['1', 'Fante', '2', 'base'],
    ['2', 'Arciere', '1', ''],
    ['1', 'Mago', '4', 'raro']
  ]
}
const next: Sheet = {
  name: 'Unità',
  headers: ['amount', 'nome', 'attacco', 'difesa'],
  rows: [
    ['1', 'Mago', '5', '1'],
    ['1', 'Fante', '2', ''],
    ['3', 'Drago', '9', '9']
  ]
}

describe('importSheet', () => {
  it('riconosce le righe dalla colonna chiave e dice cosa cambia', () => {
    expect(importKey(old, next)).toBe('nome')
    expect(previewImport(old, next)).toEqual({
      key: 'nome',
      added: ['Drago'],
      removed: ['Arciere'],
      // Fante ha solo la colonna nuova vuota: non cambia
      changed: ['Mago'],
      unchanged: 1,
      newColumns: ['difesa'],
      lostColumns: ['nota']
    })
  })

  it('senza una chiave confronta per posizione', () => {
    const a = { ...old, rows: [['1', 'X', '1', '']] }
    const b = {
      ...next,
      rows: [
        ['1', 'X', '1', ''],
        ['1', 'X', '2', '']
      ]
    }
    expect(previewImport(a, b)).toMatchObject({ key: null, added: ['2'], unchanged: 1 })
  })

  it('tiene, se chiesto, le colonne che il file non ha', () => {
    const kept = applyImport(old, next, true)
    expect(kept.name).toBe('Truppe')
    expect(kept.headers).toEqual(['amount', 'nome', 'attacco', 'difesa', 'nota'])
    expect(kept.rows.map((r) => r[4])).toEqual(['raro', 'base', ''])
    expect(applyImport(old, next, false).headers).toEqual(next.headers)
  })
})
