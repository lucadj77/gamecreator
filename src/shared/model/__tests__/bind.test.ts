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
