import { describe, expect, it } from 'vitest'
import { arithmetic, evaluateFormula } from '../formula'

describe('formule', () => {
  it('calcola le espressioni numeriche', () => {
    expect(evaluateFormula('{forza}+2', { forza: '3' }).value).toBe('5')
    expect(evaluateFormula('({a} + {b}) * 2', { a: '1,5', b: '2' }).value).toBe('7')
    expect(evaluateFormula('{a}/3', { a: '1' }).value).toBe('0.333333')
  })

  it('compone testo quando non è un calcolo', () => {
    expect(evaluateFormula('{nome}.png', { nome: 'Drago' }).value).toBe('Drago.png')
    expect(evaluateFormula('Forza {forza}', { forza: '3' }).value).toBe('Forza 3')
    expect(evaluateFormula('{data}', { data: '2026-10-18' }).value).toBe('2026-10-18')
  })

  it('segnala i campi mancanti', () => {
    expect(evaluateFormula('{x}+1', {}).missing).toEqual(['x'])
  })

  it('non calcola ciò che non è aritmetica', () => {
    expect(arithmetic('12')).toBe(12)
    expect(arithmetic('2-')).toBeNull()
    expect(arithmetic('(1')).toBeNull()
    expect(arithmetic('1.2.3')).toBeNull()
    expect(arithmetic('abc')).toBeNull()
  })
})
