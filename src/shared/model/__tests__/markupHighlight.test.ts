import { describe, expect, it } from 'vitest'
import { highlightMarkup } from '../markupHighlight'

const pieces = (src: string): string[] =>
  highlightMarkup(src).map((p) => `${p.kind}:${src.slice(p.from, p.to)}`)

describe('colorazione del markup', () => {
  it('distingue richiami, ripetizioni e attributi', () => {
    expect(pieces('{spada*3 tint=red}')).toEqual([
      'punct:{',
      'ref:spada',
      'punct:*',
      'value:3',
      'attr:tint=',
      'value:red',
      'punct:}'
    ])
  })

  it('dopo le quadre le graffe sono attributi', () => {
    expect(pieces('[Rapido]{.keyword border=red/0.3 center}')).toEqual([
      'punct:[',
      'punct:]',
      'punct:{',
      'style:.keyword',
      'attr:border=',
      'value:red/0.3',
      'attr:center',
      'punct:}'
    ])
  })

  it('segni Markdown, attributi del paragrafo e caratteri letterali', () => {
    expect(pieces('{.flavor center} # Titolo')).toEqual([
      'punct:{',
      'style:.flavor',
      'attr:center',
      'punct:}',
      'md:#'
    ])
    expect(pieces('**forte** e 3 * 4 \\{no}')).toEqual(['md:**', 'md:**', 'escape:\\{'])
    expect(pieces('- voce\n---')).toEqual(['md:-', 'md:---'])
    // in mezzo alla riga {.x} è un richiamo, come per parseMarkup
    expect(pieces('a {.x}')).toEqual(['punct:{', 'ref:.x', 'punct:}'])
  })
})
