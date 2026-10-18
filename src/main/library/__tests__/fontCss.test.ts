import { describe, expect, it } from 'vitest'
import { cssUrl, parseFontCss } from '../fontCss'

describe('cssUrl', () => {
  it('chiede pesi e corsivi in ordine', () => {
    expect(
      cssUrl('Open Sans', [
        { weight: 700, italic: false },
        { weight: 400, italic: true },
        { weight: 400, italic: false }
      ])
    ).toBe('https://fonts.googleapis.com/css2?family=Open+Sans:ital,wght@0,400;0,700;1,400')
    expect(cssUrl('Cinzel', [{ weight: 400, italic: false }])).toBe(
      'https://fonts.googleapis.com/css2?family=Cinzel:wght@400'
    )
  })
})

describe('parseFontCss', () => {
  it('legge stile, peso e indirizzo di ogni @font-face', () => {
    const css = `@font-face {
  font-family: 'Cinzel';
  font-style: normal;
  font-weight: 400;
  src: url(https://fonts.gstatic.com/s/cinzel/v26/a.ttf) format('truetype');
}
@font-face {
  font-family: 'Open Sans';
  font-style: italic;
  font-weight: 700;
  font-stretch: 100%;
  src: url(https://fonts.gstatic.com/s/opensans/v44/b.ttf) format('truetype');
}`
    expect(parseFontCss(css)).toEqual([
      { italic: false, weight: 400, url: 'https://fonts.gstatic.com/s/cinzel/v26/a.ttf' },
      { italic: true, weight: 700, url: 'https://fonts.gstatic.com/s/opensans/v44/b.ttf' }
    ])
  })
})
