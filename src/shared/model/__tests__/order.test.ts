import { describe, expect, it } from 'vitest'
import { isAlphabetical, moveItem, orderNames, renameInOrder } from '../order'

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
