import { describe, expect, it } from 'vitest'
import { fuzzyFilter, fuzzyScore } from '../fuzzy'

const names = ['broadsword', 'icons/sword.svg', 'images/drago.png', 'crossed-swords', 'shield']

describe('fuzzyScore', () => {
  it('preferisce la parola intera, poi l’inizio, poi una parte', () => {
    expect(fuzzyScore('sword', 'sword')).toBe(1)
    expect(fuzzyScore('sword', 'crossed-swords')).toBeLessThan(1)
    expect(fuzzyScore('sword', 'broadsword')).toBeGreaterThan(fuzzyScore('swrd', 'sword'))
  })

  it('trova abbreviazioni ed errori di battitura', () => {
    expect(fuzzyScore('swrd', 'sword')).toBeGreaterThan(0)
    expect(fuzzyScore('brodsword', 'broadsword')).toBeGreaterThan(0)
    expect(fuzzyScore('sowrd', 'sword')).toBeGreaterThan(0)
    expect(fuzzyScore('drgao', 'images/drago.png')).toBeGreaterThan(0)
  })

  it('richiede tutte le parole', () => {
    expect(fuzzyScore('sword shield', 'broadsword')).toBe(0)
    expect(fuzzyScore('xyz', 'sword')).toBe(0)
  })
})

describe('fuzzyFilter', () => {
  it('ordina per somiglianza e senza ricerca lascia tutto', () => {
    expect(fuzzyFilter(names, 'sword', (s) => s)).toEqual([
      'icons/sword.svg',
      'crossed-swords',
      'broadsword'
    ])
    expect(fuzzyFilter(names, '  ', (s) => s)).toEqual(names)
  })
})
