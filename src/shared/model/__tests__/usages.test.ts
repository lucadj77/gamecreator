import { describe, expect, it } from 'vitest'
import { normalizeTemplate } from '../normalize'
import { cardRanges, findUsages, isUnused } from '../usages'

const tpl = normalizeTemplate({
  name: 'carta',
  width: 63,
  height: 88,
  front: [
    { type: 'text', name: 'testo', text: 'Paga 2 {oro}' },
    { type: 'shape', name: 'fondo', fill: 'rosso' },
    { type: 'text', name: 'titolo', text: '[x]{.titolo}' }
  ],
  back: []
})

const project = {
  templates: [tpl],
  sets: [
    {
      name: 'Mercato',
      template: 'carta',
      data: {
        name: 'Mercato',
        headers: ['amount', 'testo'],
        rows: [
          ['1', 'prendi {oro}'],
          ['1', 'niente'],
          ['1', '{oro}{oro}'],
          ['1', '3 {oro}']
        ]
      }
    }
  ],
  variables: {
    oro: { type: 'image' as const, src: 'oro' },
    rosso: { type: 'color' as const, color: '#A00' },
    ricco: { type: 'text' as const, text: 'molto {oro}' }
  },
  styles: { titolo: 'weight=800 color=rosso', sotto: '.titolo italic' }
}

describe('dove è usato', () => {
  it('una variabile: template con i livelli, carte, altre variabili', () => {
    const u = findUsages(project, 'variable', 'oro')
    expect(u.templates).toEqual([{ name: 'carta', layers: ['testo'] }])
    expect(u.sets).toEqual([{ name: 'Mercato', index: 0, cards: [1, 3, 4] }])
    expect(u.variables).toEqual(['ricco'])
    expect(u.styles).toEqual([])
  })

  it('un colore usato senza graffe in una proprietà e in uno stile', () => {
    const u = findUsages(project, 'variable', 'rosso')
    expect(u.templates).toEqual([{ name: 'carta', layers: ['fondo'] }])
    expect(u.styles).toEqual(['titolo'])
  })

  it('uno stile: nei testi e negli altri stili', () => {
    const u = findUsages(project, 'style', 'titolo')
    expect(u.templates).toEqual([{ name: 'carta', layers: ['titolo'] }])
    expect(u.styles).toEqual(['sotto'])
    expect(isUnused(findUsages(project, 'style', 'sotto'))).toBe(true)
  })

  it('numeri di carta come intervalli', () => {
    expect(cardRanges([1, 3, 4, 6, 7, 8, 10])).toBe('1, 3, 4, 6–8, 10')
  })
})
