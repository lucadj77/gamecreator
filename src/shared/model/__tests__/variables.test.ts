import { describe, expect, it } from 'vitest'
import { bindCard, cardFields, rowToCard } from '../bind'
import { suggestAt } from '../markupHelp'
import { normalizeTemplate } from '../normalize'
import type { ImageLayer, ShapeLayer, TextLayer } from '../template'
import { palette, resolveColor, variableFields, type Variables } from '../variables'

const variables: Variables = {
  spada: { type: 'image', src: 'sword', tint: 'rosso' },
  pino: { type: 'text', text: '[pino]{color=green weight=700}' },
  bosco: { type: 'text', text: '{pino} e {max_mano}' },
  max_mano: { type: 'value', value: '7' },
  rosso: { type: 'color', color: '#A33A2A' },
  red: { type: 'color', color: '#B00000' }
}

const template = normalizeTemplate({
  name: 't',
  front: [
    {
      type: 'text',
      name: 'testo',
      text: 'Tieni {max_mano} carte {spada*2} {bosco}',
      color: 'rosso'
    },
    { type: 'shape', name: 'banda', fill: '{red}' },
    { type: 'image', name: 'icona', src: 'spada' },
    { type: 'value', name: 'limite', source: { kind: 'formula', expr: '{max_mano}+1' } }
  ]
})

describe('variabili', () => {
  it('testi e valori si espandono anche dentro altre variabili', () => {
    expect(variableFields(variables)).toMatchObject({
      max_mano: '7',
      bosco: '[pino]{color=green weight=700} e 7'
    })
  })

  it('i colori con nome usano la tavolozza, anche ridefinendo quelli standard', () => {
    const pal = palette(variables)
    expect(resolveColor('rosso', pal)).toBe('#A33A2A')
    expect(resolveColor('{red}', pal)).toBe('#B00000')
    expect(resolveColor('blue', pal)).toBe('blue')
  })

  it('applicate alla carta: testo, valore, colore e immagine', () => {
    const bound = bindCard(template, rowToCard([], []), { variables, assets: ['sword.svg'] })
    const [testo, banda, icona] = bound.template.front
    expect((testo as TextLayer).text).toBe(
      'Tieni 7 carte {spada*2} [pino]{color=green weight=700} e 7'
    )
    expect((testo as TextLayer).color).toBe('#A33A2A')
    expect((banda as ShapeLayer).fill).toBe('#B00000')
    expect((icona as ImageLayer).src).toBe('sword')
    expect((icona as ImageLayer).tint).toBe('#A33A2A')
    expect(bound.problems).toEqual([])
    expect(cardFields(template, rowToCard([], []), variables).limite).toBe('8')
  })

  it('un campo con lo stesso nome vince sulla variabile', () => {
    const bound = bindCard(template, rowToCard(['max_mano'], ['5']), { variables })
    expect((bound.template.front[0] as TextLayer).text).toMatch(/^Tieni 5 carte/)
  })

  it('compaiono nei suggerimenti del markup', () => {
    const ctx = { fields: [], assets: ['sword.svg'], styles: [], variables }
    const refs = suggestAt('{sp', 3, ctx)!.items.map((i) => `${i.kind}:${i.label}`)
    expect(refs).toContain('variable:spada')
    const colors = suggestAt('[a]{color=ro', 12, ctx)!.items
    expect(colors[0]).toMatchObject({ kind: 'variable', label: 'rosso', swatch: '#A33A2A' })
  })
})
