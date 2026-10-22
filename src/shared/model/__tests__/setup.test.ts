import { describe, expect, it } from 'vitest'
import { parseSetup, setupSource } from '../setup'
import { documentProblems, parseDocument } from '../document'
import type { LoadedSet } from '../../project'

const lines = (src: string): { lines: string[]; starts: number[] } => {
  const ls = src.split('\n')
  const starts: number[] = []
  let at = 0
  for (const l of ls) {
    starts.push(at)
    at += l.length + 1
  }
  return { lines: ls, starts }
}
const parse = (src: string): ReturnType<typeof parseSetup> => {
  const { lines: ls, starts } = lines(src)
  return parseSetup(ls, starts)
}

describe('schema del tavolo', () => {
  it('legge ogni tipo di elemento', () => {
    const s = parse(
      [
        'size 280x180',
        'zone 0,0 280x60 "Giocatore 1"',
        'deck Personaggi/1?side=back 20,10 count=8 "Mazzo"',
        'card Personaggi/nome=Mago 60,10 rotate=90 "Il \\"mago\\""',
        'text 140,30 width=40 "Pesca **2** carte"',
        'arrow 40,50 -> 60,80 "pesca"',
        'image icons/moneta%20oro.png 200,20 width=10',
        '# un commento',
        ''
      ].join('\n')
    )
    expect(s.bad).toEqual([])
    expect(s.size).toEqual({ w: 280, h: 180 })
    expect(s.items.map((i) => i.kind)).toEqual(['zone', 'deck', 'card', 'text', 'arrow', 'image'])
    expect(s.items[0]).toMatchObject({ x: 0, y: 0, w: 280, h: 60, label: 'Giocatore 1' })
    expect(s.items[1]).toMatchObject({ card: 'Personaggi/1?side=back', count: 8, rotate: 0 })
    expect(s.items[2]).toMatchObject({ rotate: 90, label: 'Il "mago"' })
    expect(s.items[3]).toMatchObject({ w: 40, text: 'Pesca **2** carte' })
    expect(s.items[4]).toMatchObject({ x: 40, y: 50, x2: 60, y2: 80, label: 'pesca' })
    expect(s.items[5]).toMatchObject({ src: 'icons/moneta oro.png', w: 10 })
  })

  it('segnala le righe che non capisce', () => {
    const s = parse('zone 0,0 "senza misura"\ncard 10,10\nboh\nzone 1,1 5x5')
    expect(s.bad.map((b) => b.from)).toEqual([0, 24, 35])
    expect(s.items).toHaveLength(1)
  })

  it('riscrive lo stesso schema', () => {
    const src = [
      '```setup',
      'size 200x100',
      'zone 0,0 100x50 "Zona"',
      'deck Mazzo%20base/1 10,10 count=8 rotate=90 "Pesca"',
      'text 5,5 width=50 "Un \\"testo\\""',
      'arrow 1,2 -> 3,4',
      'image icone/a%20b.png 7,8 width=12',
      '```'
    ].join('\n')
    const s = parse(src.split('\n').slice(1, -1).join('\n'))
    expect(setupSource(s)).toBe(src)
  })

  it('nel documento controlla carte e righe', () => {
    const sets: LoadedSet[] = [
      {
        name: 'Personaggi',
        template: 'personaggio',
        data: { name: 'Personaggi', headers: ['nome'], rows: [['Mago']] }
      }
    ]
    const text = '```setup\ncard Personaggi/nome=Mago 0,0\ncard Personaggi/9 0,0\nboh\n```'
    expect(parseDocument(text)[0].kind).toBe('setup')
    const keys = documentProblems(text, { sets }).map((p) => p.message.key)
    expect(keys.sort()).toEqual(['doc.card.noRow', 'doc.setup.badLine'])
  })
})
