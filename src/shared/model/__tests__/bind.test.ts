import { describe, expect, it } from 'vitest'
import { bindCard, parseValue, rowToCard, substituteFields } from '../bind'
import { normalizeTemplate } from '../normalize'
import type { ShapeLayer, TextLayer } from '../template'

const template = normalizeTemplate({
  name: 't',
  front: [
    { type: 'text', name: 'nome', text: 'x', size: 12 },
    { type: 'text', name: 'testo', text: 'Forza {forza}, {spada}' },
    { type: 'shape', name: 'banda', fill: '#000000' },
    { type: 'group', name: 'gruppo', children: [{ type: 'image', name: 'cover', src: '{nome}' }] }
  ]
})

describe('bindCard', () => {
  it('applica valore principale, proprietà e campi', () => {
    const card = rowToCard(
      ['amount', 'nome', 'nome.size', 'banda', 'forza', 'nome.color'],
      ['2', 'Drago', '14', '#A33A2A', '6', '']
    )
    const bound = bindCard(template, card)
    const [nome, testo, banda, gruppo] = bound.template.front
    expect(bound.amount).toBe(2)
    expect((nome as TextLayer).text).toBe('Drago')
    expect((nome as TextLayer).size).toBe(14)
    // cella vuota: resta il valore del template
    expect((nome as TextLayer).color).toBe('#000000')
    expect((banda as ShapeLayer).fill).toBe('#A33A2A')
    expect((testo as TextLayer).text).toBe('Forza 6, {spada}')
    expect(
      gruppo.type === 'group' && gruppo.children[0].type === 'image' && gruppo.children[0].src
    ).toBe('Drago')
    expect(bound.problems).toEqual([])
  })

  it('segnala proprietà inesistenti e valori non validi', () => {
    const bound = bindCard(template, rowToCard(['nome.pippo', 'nome.size'], ['1', 'grande']))
    expect(bound.problems.map((p) => p.key)).toEqual(['bind.unknownProperty', 'bind.invalidValue'])
  })

  it('copie: 1 se assente o non valida, 0 ammesso', () => {
    expect(rowToCard(['nome'], ['a']).amount).toBe(1)
    expect(rowToCard(['amount'], ['x']).amount).toBe(1)
    expect(rowToCard(['amount'], ['0']).amount).toBe(0)
  })
})

describe('parseValue', () => {
  it('converte numeri, booleani, contorni e none', () => {
    expect(parseValue('size', 10, '12,5')).toBe(12.5)
    expect(parseValue('visible', true, 'no')).toBe(false)
    expect(parseValue('visible', true, 'sì')).toBe(true)
    expect(parseValue('stroke', null, 'white/8%')).toEqual({ color: 'white', width: '8%' })
    expect(parseValue('stroke', null, 'red/0.5')).toEqual({ color: 'red', width: 0.5 })
    expect(parseValue('fill', '#fff', 'none')).toBeNull()
  })
})

describe('substituteFields', () => {
  it('lascia intatte variabili sconosciute, ripetizioni e graffe con escape', () => {
    expect(substituteFields('{a} {b} {spada*3} \\{a}', { a: '1' })).toBe('1 {b} {spada*3} \\{a}')
  })
})

describe('fonte del valore', () => {
  const t = normalizeTemplate({
    name: 't',
    front: [
      { type: 'text', name: 'fisso', text: 'sempre', source: { kind: 'fixed' } },
      { type: 'text', name: 'altro', text: '', source: { kind: 'column', column: 'titolo' } },
      { type: 'text', name: 'energia', text: '', source: { kind: 'formula', expr: '{forza}+2' } },
      { type: 'image', name: 'cover', source: { kind: 'formula', expr: '{nome}.png' } }
    ]
  })
  const texts = (headers: string[], row: string[]): string[] =>
    bindCard(t, rowToCard(headers, row)).template.front.map((l) =>
      l.type === 'text' ? l.text : l.type === 'image' ? l.src : ''
    )

  it('fisso ignora la colonna, colonna può avere un altro nome, formula calcola', () => {
    expect(
      texts(['fisso', 'titolo', 'forza', 'nome', 'fisso.color'], ['no', 'Re', '3', 'Drago', '#F00'])
    ).toEqual(['sempre', 'Re', '5', 'Drago.png'])
  })

  it('le colonne delle proprietà valgono anche con valore fisso', () => {
    const bound = bindCard(t, rowToCard(['fisso.color'], ['#FF0000']))
    expect((bound.template.front[0] as TextLayer).color).toBe('#FF0000')
  })

  it('segnala i campi mancanti nelle formule', () => {
    const bound = bindCard(t, rowToCard(['nome'], ['x']))
    expect(bound.problems.map((p) => p.params?.field)).toEqual(['forza'])
  })
})

describe('valori predefiniti e livelli valore', () => {
  const t = normalizeTemplate({
    name: 'v',
    front: [
      { type: 'value', name: 'forza', value: '3' },
      { type: 'value', name: 'doppia', source: { kind: 'formula', expr: '={forza}*2' } },
      {
        type: 'text',
        name: 'giudizio',
        source: { kind: 'formula', expr: '=IF({doppia}>6; "Forte"; "Debole")' }
      },
      { type: 'text', name: 'titolo', text: 'Drago' },
      { type: 'text', name: 'eco', source: { kind: 'formula', expr: '{titolo}!' } }
    ]
  })
  const text = (b: ReturnType<typeof bindCard>, i: number): string =>
    (b.template.front[i] as TextLayer).text

  it('senza riga usa i valori del template', () => {
    const b = bindCard(t, { fields: {}, amount: 1 })
    expect(text(b, 2)).toBe('Debole')
    expect(text(b, 4)).toBe('Drago!')
    expect(b.problems).toEqual([])
  })

  it('la riga cambia i valori e i livelli valore si ricalcolano', () => {
    const b = bindCard(t, rowToCard(['forza', 'titolo'], ['5', 'Orco']))
    expect(text(b, 2)).toBe('Forte')
    expect(text(b, 4)).toBe('Orco!')
  })

  it('un livello valore non ha riquadro e non sposta i gruppi', () => {
    const g = normalizeTemplate({
      name: 'g',
      front: [
        {
          type: 'group',
          name: 'gr',
          children: [
            { type: 'value', name: 'v' },
            { type: 'shape', name: 's', x: 10, y: 10, w: 5, h: 5 }
          ]
        }
      ]
    }).front[0]
    expect([g.x, g.y, g.w, g.h]).toEqual([10, 10, 5, 5])
  })
})
