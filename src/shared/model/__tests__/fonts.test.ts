import { describe, expect, it } from 'vitest'
import { isGenericFont, markupFonts } from '../fonts'

describe('markupFonts', () => {
  it('trova i font scritti nel markup e negli stili', () => {
    const styles = { title: 'font=Cinzel size=+2', big: '.title' }
    expect(markupFonts('[Hi]{font=Open_Sans} and [there]{.big}', styles).sort()).toEqual([
      'Cinzel',
      'Open Sans'
    ])
  })

  it('senza markup non trova nulla', () => {
    expect(markupFonts('**bold** text')).toEqual([])
  })
})

describe('isGenericFont', () => {
  it('riconosce le famiglie generiche del CSS', () => {
    expect(isGenericFont(' Serif ')).toBe(true)
    expect(isGenericFont('Nunito')).toBe(false)
  })
})
