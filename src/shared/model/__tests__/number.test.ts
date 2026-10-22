import { describe, expect, it } from 'vitest'
import { readNumber } from '../number'

describe('readNumber', () => {
  it('legge i numeri come si sono sempre letti', () => {
    expect(readNumber('1.5')).toBe(1.5)
    expect(readNumber('1,5')).toBe(1.5)
    expect(readNumber(' -3 ')).toBe(-3)
    // un solo separatore è quello dei decimali
    expect(readNumber('1,234')).toBe(1.234)
    expect(readNumber('')).toBeNull()
    expect(readNumber('Drago')).toBeNull()
  })

  it('legge percentuali, valute e migliaia come le mostra il foglio', () => {
    expect(readNumber('50%')).toBe(0.5)
    expect(readNumber('12.5 %')).toBe(0.125)
    expect(readNumber('1 234.50 €')).toBe(1234.5)
    expect(readNumber('€ 3,00')).toBe(3)
    expect(readNumber('-€3')).toBe(-3)
    expect(readNumber('$1,234.5')).toBe(1234.5)
    expect(readNumber('1.234,5')).toBe(1234.5)
    expect(readNumber('1.234.567')).toBe(1234567)
    expect(readNumber("1'000")).toBe(1000)
  })

  it('non scambia per numeri testi che non lo sono', () => {
    expect(readNumber('1.23.4')).toBeNull()
    expect(readNumber('12 34')).toBeNull()
    expect(readNumber('2-3')).toBeNull()
    expect(readNumber('%')).toBeNull()
    expect(readNumber('€')).toBeNull()
  })
})
