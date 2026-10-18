import { describe, expect, it } from 'vitest'
import { creditsText, type CreditsLabels } from '../credits'
import type { Sources } from '../../library'

const labels: CreditsLabels = {
  icons: (source, license) => `Icons from ${source}, ${license}`,
  font: (family, license) => `Font ${family}, ${license}`,
  licenseName: (spdx) => spdx
}

const icon = (title: string, author: string, license = 'CC-BY-3.0'): Sources[string] => ({
  kind: 'icon',
  source: 'game-icons.net',
  id: `${author.toLowerCase()}/${title}`,
  title,
  author,
  license,
  imported: '2026-10-18'
})

const sources: Sources = {
  'icons/spada.svg': icon('broadsword', 'Lorc'),
  'icons/scudo.svg': icon('shield', 'Lorc'),
  'icons/pozione.svg': icon('potion-ball', 'Delapouite'),
  'icons/astratto.svg': icon('abstract-001', 'Viscious Speed', 'CC0-1.0'),
  'fonts/Cinzel/Cinzel-400.ttf': {
    kind: 'font',
    source: 'Google Fonts',
    id: 'Cinzel',
    title: 'Cinzel 400',
    license: 'OFL-1.1',
    imported: '2026-10-18'
  },
  'fonts/Cinzel/Cinzel-700.ttf': {
    kind: 'font',
    source: 'Google Fonts',
    id: 'Cinzel',
    title: 'Cinzel 700',
    license: 'OFL-1.1',
    imported: '2026-10-18'
  }
}

describe('creditsText', () => {
  it('raggruppa le icone per licenza e autore e cita ogni font una volta', () => {
    expect(creditsText(sources, labels)).toBe(
      [
        'Icons from game-icons.net, CC-BY-3.0 (https://creativecommons.org/licenses/by/3.0/)',
        '- Delapouite: potion-ball',
        '- Lorc: broadsword, shield',
        '',
        'Icons from game-icons.net, CC0-1.0 (https://creativecommons.org/publicdomain/zero/1.0/)',
        '- Viscious Speed: abstract-001',
        '',
        'Font Cinzel, OFL-1.1 (https://openfontlicense.org)',
        ''
      ].join('\n')
    )
  })

  it('con l’elenco dei file usati cita solo quelli', () => {
    const text = creditsText(sources, labels, {
      assets: new Set(['icons/spada.svg']),
      fonts: new Set()
    })
    expect(text).toContain('- Lorc: broadsword\n')
    expect(text).not.toContain('Delapouite')
    expect(text).not.toContain('Cinzel')
  })
})
