import { describe, expect, it } from 'vitest'
import {
  cardRefSource,
  DEFAULT_DOC_SETTINGS,
  documentProblems,
  documentSettings,
  documentText,
  findCard,
  parseCardRef,
  anatomySource,
  layerBounds,
  parseDocument,
  tableSource,
  withDocumentSettings
} from '../document'
import type { LoadedSet } from '../../project'

const sets: LoadedSet[] = [
  {
    name: 'Personaggi',
    template: 'personaggio',
    data: {
      name: 'Personaggi',
      headers: ['nome', 'forza'],
      rows: [
        ['Mago', '2'],
        ['Guerriero', '5']
      ]
    }
  }
]

describe('documenti: blocchi', () => {
  it('riconosce titoli, paragrafi, elenchi, citazioni, righe e codice', () => {
    const src = [
      '# Regole',
      '',
      'Prima riga',
      'stesso paragrafo.',
      '',
      '## Preparazione',
      '- uno',
      '  - dentro',
      '- due',
      '',
      '3. tre',
      '4. quattro',
      '',
      '> Nota **importante**',
      '',
      '---',
      '```',
      '{non markup}',
      '```',
      '#### Quarto livello'
    ].join('\n')
    const blocks = parseDocument(src)
    expect(blocks.map((b) => b.kind)).toEqual([
      'heading',
      'paragraph',
      'heading',
      'list',
      'list',
      'quote',
      'rule',
      'code',
      'heading'
    ])
    expect(blocks[1]).toMatchObject({ text: 'Prima riga stesso paragrafo.' })
    expect(blocks[3]).toMatchObject({
      items: [
        { text: 'uno', depth: 0, ordered: false },
        { text: 'dentro', depth: 1 },
        { text: 'due', depth: 0 }
      ]
    })
    expect(blocks[4]).toMatchObject({
      items: [
        { text: 'tre', number: 3 },
        { text: 'quattro', number: 4 }
      ]
    })
    expect(blocks[7]).toMatchObject({ text: '{non markup}' })
    expect(blocks[8]).toMatchObject({ level: 3, text: 'Quarto livello' })
  })

  it('una riga con sole immagini è una figura, con la posizione di ogni immagine', () => {
    const src = 'Testo\n\n![Mago](card:Personaggi/1) ![](card:Personaggi/2?side=back)'
    const [, fig] = parseDocument(src)
    expect(fig.kind).toBe('figure')
    if (fig.kind !== 'figure') return
    expect(fig.images.map((i) => [i.alt, i.src])).toEqual([
      ['Mago', 'card:Personaggi/1'],
      ['', 'card:Personaggi/2?side=back']
    ])
    expect(src.slice(fig.images[0].from, fig.images[0].to)).toBe('![Mago](card:Personaggi/1)')
  })

  it('legge le tabelle con allineamento e \\| nelle celle', () => {
    const [t] = parseDocument('| Carta | Costo |\n|:--|--:|\n| Mago | 2 \\| 3 |\n| Re |')
    expect(t).toMatchObject({
      kind: 'table',
      header: ['Carta', 'Costo'],
      align: ['left', 'right'],
      rows: [
        ['Mago', '2 | 3'],
        ['Re', '']
      ]
    })
  })

  it('va a capo con due spazi o \\ a fine riga', () => {
    const [p] = parseDocument('uno  \ndue\\\ntre')
    expect(p).toMatchObject({ text: 'uno\ndue\ntre' })
  })
})

describe('documenti: carte', () => {
  it('legge i riferimenti alle carte', () => {
    expect(parseCardRef('card:Personaggi/2')).toEqual({ set: 'Personaggi', row: 2, side: 'front' })
    expect(parseCardRef('card:Carte rare/nome=Re%20nero?side=back&width=40')).toEqual({
      set: 'Carte rare',
      field: 'nome',
      value: 'Re nero',
      side: 'back',
      width: 40
    })
    expect(parseCardRef('card:Personaggi')).toMatchObject({ key: 'doc.card.badRef' })
    expect(parseCardRef('card:Personaggi/1?zoom=2')).toMatchObject({ key: 'doc.card.badOption' })
  })

  it('scrive i riferimenti in modo che si rileggano uguali', () => {
    const ref = { set: 'P', field: 'nome', value: 'A (b)?', side: 'back' as const, width: 30 }
    expect(cardRefSource(ref)).toBe('card:P/nome=A (b%29%3F?side=back&width=30')
    expect(parseCardRef(cardRefSource(ref))).toEqual(ref)
  })

  it('trova la carta per numero o per valore di un campo, senza badare alle maiuscole', () => {
    expect(findCard({ set: 'personaggi', row: 2, side: 'front' }, sets)).toMatchObject({ row: 1 })
    expect(
      findCard({ set: 'Personaggi', field: 'NOME', value: 'guerriero', side: 'front' }, sets)
    ).toMatchObject({ row: 1 })
    expect(findCard({ set: 'Mostri', row: 1, side: 'front' }, sets)).toMatchObject({
      key: 'doc.card.noSet'
    })
    expect(findCard({ set: 'Personaggi', row: 3, side: 'front' }, sets)).toMatchObject({
      key: 'doc.card.noRow'
    })
    expect(
      findCard({ set: 'Personaggi', field: 'nome', value: 'Re', side: 'front' }, sets)
    ).toMatchObject({ key: 'doc.card.noValue' })
  })
})

describe('documenti: testo e controllo', () => {
  it('sostituisce le variabili di testo e i collegamenti', () => {
    const variables = { vita: { type: 'text' as const, text: '3 vite' } }
    expect(
      documentText('Hai {vita} in {project.name}, vedi [qui](https://x.it)', {
        project: 'Farmony',
        variables
      })
    ).toBe('Hai 3 vite in Farmony, vedi [qui]{underline}')
  })

  it('segnala carte, immagini, stili e nomi che non si trovano', () => {
    const src = [
      'Ottieni {cuore} e {mistero} con [x]{.nessuno}',
      '',
      '![](card:Personaggi/9) ![](card:Personaggi/1) ![](icone/nulla.png)'
    ].join('\n')
    const problems = documentProblems(src, {
      sets,
      assets: ['icons/cuore.svg'],
      styles: {}
    })
    expect(problems.map((p) => p.message.key).sort()).toEqual([
      'doc.card.noRow',
      'doc.missingImage',
      'doc.unknownRef',
      'markup.unknownStyle'
    ])
    const row = problems.find((p) => p.message.key === 'doc.card.noRow')!
    expect(src.slice(row.from, row.to)).toBe('![](card:Personaggi/9)')
  })
})

describe('impostazioni della pagina', () => {
  const src =
    '---\nsize: 12\nlineHeight: 1,6\nfont: "Alegreya"\ncolour: red\nalign: center\n---\n# Regole\n'

  it('si leggono dalla testa, che non è testo', () => {
    const { settings, problems } = documentSettings(src)
    expect(settings).toMatchObject({ size: 12, lineHeight: 1.6, font: 'Alegreya', page: 'A4' })
    expect(problems.map((p) => p.message.key)).toEqual(['doc.setting.unknown', 'doc.setting.bad'])
    expect(src.slice(problems[0].from, problems[0].to)).toBe('colour: red')
    expect(parseDocument(src)).toEqual([
      { kind: 'heading', level: 1, text: 'Regole', from: src.indexOf('#') }
    ])
  })

  it('un --- che non apre impostazioni resta una riga', () => {
    expect(documentSettings('---\nTesto\n---\n').settings).toEqual(DEFAULT_DOC_SETTINGS)
    expect(parseDocument('---\nTesto')[0].kind).toBe('rule')
  })

  it('si scrivono e si tolgono', () => {
    const one = withDocumentSettings('# Regole\n', { size: 12, page: 'A5' })
    expect(one).toBe('---\nsize: 12\npage: A5\n---\n\n# Regole\n')
    const two = withDocumentSettings(one, { size: 11, margin: 10 })
    expect(two).toBe('---\npage: A5\nmargin: 10\n---\n\n# Regole\n')
    expect(withDocumentSettings(two, { page: 'A4', margin: 18 })).toBe('# Regole\n')
  })
})

describe('tabelle', () => {
  it('si riscrivono dal testo e tornano uguali', () => {
    const md = tableSource(
      ['Azione', 'Costo'],
      [null, 'center'],
      [['Attacco | forte', '1'], ['Difesa']]
    )
    expect(md).toBe(
      '| Azione           | Costo |\n| ---------------- | :---: |\n| Attacco \\| forte | 1     |\n| Difesa           |       |'
    )
    const src = `Testo\n\n${md}\n\nAltro`
    const t = parseDocument(src).find((b) => b.kind === 'table')!
    expect(t).toMatchObject({
      header: ['Azione', 'Costo'],
      align: [null, 'center'],
      rows: [
        ['Attacco | forte', '1'],
        ['Difesa', '']
      ]
    })
    expect(src.slice(t.from, t.kind === 'table' ? t.to : 0)).toBe(md)
  })
})

describe('anatomia della carta', () => {
  const src = anatomySource('Personaggi/nome=Mago', [
    { layer: 'nome', label: 'Il **nome**' },
    { layer: 'forza', label: 'Forza', side: 'left' }
  ])

  it('si scrive e si rilegge', () => {
    expect(src).toBe(
      '```anatomy\ncard: Personaggi/nome=Mago\n- nome: Il **nome**\n- forza (left): Forza\n```'
    )
    const [b] = parseDocument(`${src}\n\nDopo`)
    expect(b).toMatchObject({
      kind: 'anatomy',
      card: 'Personaggi/nome=Mago',
      callouts: [
        { layer: 'nome', label: 'Il **nome**' },
        { layer: 'forza', label: 'Forza', side: 'left' }
      ],
      bad: [],
      from: 0,
      to: src.length
    })
  })

  it('segnala righe, carte e livelli sbagliati', () => {
    const templates = [
      {
        name: 'personaggio',
        width: 63,
        height: 88,
        front: [
          { type: 'text', name: 'nome', x: 6, y: 4, w: 51, h: 9, rotation: 0, anchor: 'center' }
        ],
        back: []
      }
    ] as never
    const text = '```anatomy\ncard: Personaggi/1\n- nome: Nome\n- zampa: Zampa\nboh\n```'
    const problems = documentProblems(text, { sets, templates })
    expect(problems.map((p) => p.message.key)).toEqual([
      'doc.anatomy.noLayer',
      'doc.anatomy.badLine'
    ])
    expect(documentProblems('```anatomy\n- nome: x\n```', { sets })[0].message.key).toBe(
      'doc.anatomy.noCard'
    )
  })

  it('trova il riquadro del livello, anche ignorando le maiuscole', () => {
    const layers = [
      { type: 'text', name: 'Nome', x: 6, y: 4, w: 50, h: 10, rotation: 0, anchor: 'center' }
    ] as never
    expect(layerBounds(layers, 'nome')).toEqual({ x: 6, y: 4, w: 50, h: 10 })
    expect(layerBounds(layers, 'altro')).toBeNull()
  })
})
