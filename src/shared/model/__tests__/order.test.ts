import { describe, expect, it } from 'vitest'
import {
  groupList,
  groupOf,
  isAlphabetical,
  moveItem,
  orderNames,
  renameInOrder,
  setGroup
} from '../order'

describe('ordine delle voci', () => {
  it('senza ordine salvato è alfabetico, con i numeri in ordine numerico', () => {
    expect(orderNames(['b', 'A', 'carta10', 'carta2'])).toEqual(['A', 'b', 'carta2', 'carta10'])
  })

  it("segue l'ordine salvato e mette in fondo le voci nuove", () => {
    expect(orderNames(['a', 'b', 'c', 'd'], ['c', 'x', 'a'])).toEqual(['c', 'a', 'b', 'd'])
  })

  it('sposta una voce nella posizione che avrà dopo', () => {
    expect(moveItem(['a', 'b', 'c', 'd'], 0, 2)).toEqual(['b', 'c', 'a', 'd'])
    expect(moveItem(['a', 'b', 'c', 'd'], 3, 0)).toEqual(['d', 'a', 'b', 'c'])
  })

  it("riconosce l'ordine alfabetico e rinomina nell'ordine", () => {
    expect(isAlphabetical(['a', 'B', 'c'])).toBe(true)
    expect(isAlphabetical(['b', 'a'])).toBe(false)
    expect(renameInOrder({ styles: ['x', 'y'] }, 'styles', 'y', 'z')).toEqual({
      styles: ['x', 'z']
    })
    expect(renameInOrder({ styles: ['x'] }, 'variables', 'x', 'z')).toEqual({ styles: ['x'] })
  })
})

describe('gruppi di stili e variabili', () => {
  it('mette e toglie una voce da un gruppo; senza gruppi non resta nulla', () => {
    const o = setGroup(undefined, 'variables', 'oro', 'Risorse')
    expect(groupOf(o, 'variables', 'oro')).toBe('Risorse')
    expect(setGroup(o, 'variables', 'oro', '')).toBeUndefined()
  })

  it('divide l elenco: prima le voci senza gruppo, poi i gruppi in ordine alfabetico', () => {
    let o = setGroup(undefined, 'variables', 'oro', 'Risorse')
    o = setGroup(o, 'variables', 'spada', 'Armi')
    o = setGroup(o, 'variables', 'legno', 'Risorse')
    const g = groupList(['legno', 'mano', 'oro', 'spada'], o, 'variables')
    expect(g.map((x) => [x.group, x.items.map((i) => `${i.name}${i.index}`)])).toEqual([
      ['', ['mano1']],
      ['Armi', ['spada3']],
      ['Risorse', ['legno0', 'oro2']]
    ])
    expect(groupList(['a'], undefined, 'styles')).toEqual([
      { group: '', items: [{ name: 'a', index: 0 }] }
    ])
  })

  it('rinominando una voce il gruppo la segue', () => {
    const o = setGroup({ variables: ['oro'] }, 'variables', 'oro', 'Risorse')
    const r = renameInOrder(o, 'variables', 'oro', 'denaro')
    expect(r?.variables).toEqual(['denaro'])
    expect(groupOf(r, 'variables', 'denaro')).toBe('Risorse')
    expect(groupOf(r, 'variables', 'oro')).toBe('')
  })
})
