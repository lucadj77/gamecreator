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

describe('espressioni con =', () => {
  const f = { forza: '4', nome: 'Drago', costo: '', tipo: 'mostro' }
  const ev = (e: string): string => evaluateFormula(e, f).value

  it('IF con confronti, testo e numeri', () => {
    expect(ev('=IF({forza}>3; "Forte"; "Debole")')).toBe('Forte')
    expect(ev('=IF({forza}>=5, "Forte", "Debole")')).toBe('Debole')
    expect(ev('=IF({tipo}="MOSTRO"; 1; 0)')).toBe('1')
    expect(ev('=IF(ISBLANK({costo}); "gratis"; {costo})')).toBe('gratis')
  })

  it('aritmetica, concatenazione e funzioni', () => {
    expect(ev('={forza}*2+1')).toBe('9')
    expect(ev('={nome} & " (" & {forza} & ")"')).toBe('Drago (4)')
    expect(ev('=ROUND(10/3; 2)')).toBe('3.33')
    expect(ev('=UPPER({nome})')).toBe('DRAGO')
    expect(ev('=AND({forza}>1; NOT({tipo}="eroe"))')).toBe('true')
    expect(ev('=MAX({forza}; 7)')).toBe('7')
    expect(evaluateFormula('=MIN()', {}).error).toContain('MIN')
  })

  it('IF non calcola il ramo scartato', () => {
    expect(evaluateFormula('=IF(FALSE; 1/0; "ok")', f).error).toBeUndefined()
  })

  it('segnala errori e campi mancanti', () => {
    expect(evaluateFormula('=IF({forza}>3; "a"', f).error).toBeTruthy()
    expect(evaluateFormula('=PIPPO(1)', f).error).toContain('PIPPO')
    expect(evaluateFormula('={x}+1', f).missing).toEqual(['x'])
    expect(evaluateFormula('={nome}+1', f).error).toBeTruthy()
  })
})
