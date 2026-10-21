import { describe, expect, it } from 'vitest'
import type { ProjectVersion } from '../../project'
import { cardFingerprints, changedCards } from '../compare'
import { normalizeTemplate } from '../normalize'
import type { Variables } from '../variables'

const t = normalizeTemplate({
  name: 't',
  front: [
    { type: 'text', name: 'nome' },
    { type: 'text', name: 'testo' }
  ]
})

const version = (rows: string[][], variables: Variables = {}): ProjectVersion => ({
  file: {
    formatVersion: 1,
    name: 'P',
    dataFile: 'data.xlsx',
    sets: [{ name: 'S', template: 't' }],
    variables
  },
  templates: [t],
  sets: [{ name: 'S', template: 't', data: { name: 'S', headers: ['nome', 'testo'], rows } }]
})

describe('confronto fra versioni', () => {
  const before = version(
    [
      ['A', 'uno'],
      ['B', 'due {x}'],
      ['C', 'tre']
    ],
    { x: { type: 'text', text: '1' } }
  )

  it('trova le carte nuove o cambiate, anche se spostate', () => {
    const now = version(
      [
        ['C', 'tre'],
        ['A', 'uno!'],
        ['B', 'due {x}'],
        ['D', 'quattro']
      ],
      { x: { type: 'text', text: '1' } }
    )
    const changed = changedCards(cardFingerprints(now, []), cardFingerprints(before, []))
    expect(changed).toEqual({ S: [1, 3] })
  })

  it('una variabile cambiata cambia solo le carte che la usano', () => {
    const now = version(before.sets[0].data!.rows, { x: { type: 'text', text: '2' } })
    expect(changedCards(cardFingerprints(now, []), cardFingerprints(before, []))).toEqual({
      S: [1]
    })
  })

  it('un set che prima non c era è tutto nuovo', () => {
    expect(changedCards(cardFingerprints(before, []), {})).toEqual({ S: [0, 1, 2] })
  })
})
