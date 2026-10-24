// Il gioco che l'agente IA crea nel video 6: «Elementi», 24 creature di quattro elementi e un
// segnalino per le ferite. Qui ci sono i file che l'agente scrive, nelle due lingue; agente.mjs li
// scrive nel progetto durante la registrazione e lancia i comandi stella veri.
const L = (lang) => (a, b) => (lang === 'it' ? a : b)

// icone di game-icons.net (CC BY 3.0), dal repository GitHub del sito
export const ICONS = [
  ['carl-olsen/flame', 'Carl Olsen'],
  ['lorc/droplets', 'Lorc'],
  ['delapouite/stone-pile', 'Delapouite'],
  ['lorc/whirlwind', 'Lorc'],
  ['lorc/fist', 'Lorc'],
  ['skoll/blood', 'Skoll']
]

export function game(lang) {
  const t = L(lang)
  const E = {
    fire: t('fuoco', 'fire'),
    water: t('acqua', 'water'),
    earth: t('terra', 'earth'),
    air: t('aria', 'air')
  }
  const fist = t('pugno', 'fist')
  const wound = t('ferita', 'wound')
  const iconNames = [E.fire, E.water, E.earth, E.air, fist, t('sangue', 'blood')]
  const name = t('Elementi', 'Elements')
  const cards = t('Creature', 'Creatures')
  const wounds = t('Ferite', 'Wounds')
  const creature = t('creatura', 'creature')
  const F = t('nome', 'name'),
    EL = t('elemento', 'element'),
    S = t('forza', 'strength'),
    X = t('testo', 'text')
  const color = `=IF({${EL}}="${E.fire}"; "#C8462B"; IF({${EL}}="${E.water}"; "#2F6FA8"; IF({${EL}}="${E.earth}"; "#6B7F3A"; "#7E6BAE")))`

  const template = {
    name: creature,
    width: 63,
    height: 88,
    bleed: 3,
    safeMargin: 3,
    cornerRadius: 3,
    labelField: F,
    front: [
      {
        type: 'text',
        name: F,
        x: 6,
        y: 4,
        w: 41,
        h: 10,
        size: 13,
        weight: 800,
        color: '#FFFFFF',
        valign: 'middle',
        fit: 'shrink'
      },
      {
        type: 'text',
        name: S,
        x: 48.5,
        y: 3.5,
        w: 11,
        h: 11,
        size: 16,
        weight: 900,
        color: '#FFFFFF',
        align: 'center',
        valign: 'middle'
      },
      {
        type: 'shape',
        name: t('bollo', 'badge'),
        shape: 'ellipse',
        x: 48.5,
        y: 3.5,
        w: 11,
        h: 11,
        fill: '#000000',
        opacity: 0.35
      },
      {
        type: 'text',
        name: X,
        x: 7,
        y: 59,
        w: 49,
        h: 23,
        size: 10.5,
        color: '#2A241C',
        align: 'center',
        valign: 'middle'
      },
      {
        type: 'shape',
        name: t('riquadro', 'panel'),
        x: 4,
        y: 57,
        w: 55,
        h: 27,
        radius: 2.5,
        fill: '#FFFFFF',
        opacity: 0.92
      },
      {
        type: 'text',
        name: t('tipo', 'type'),
        x: 4,
        y: 50,
        w: 55,
        h: 5,
        text: `{${EL}}`,
        source: { kind: 'fixed' },
        size: 7.5,
        weight: 800,
        color: '#FFFFFF',
        align: 'center',
        valign: 'middle',
        transform: 'upper',
        letterSpacing: 250
      },
      {
        type: 'image',
        name: t('simbolo', 'symbol'),
        x: 14,
        y: 15,
        w: 35,
        h: 34,
        src: `{${EL}}`,
        source: { kind: 'fixed' },
        fit: 'contain',
        tint: '#FFFFFF',
        opacity: 0.9
      },
      {
        type: 'shape',
        name: t('sfondo', 'background'),
        x: -3,
        y: -3,
        w: 69,
        h: 94,
        fill: '#888888',
        source: { kind: 'formula', expr: color },
        locked: true
      }
    ],
    back: [
      {
        type: 'text',
        name: t('titolo', 'title'),
        x: 4,
        y: 38,
        w: 55,
        h: 12,
        text: '{project.name}',
        source: { kind: 'fixed' },
        size: 18,
        weight: 900,
        color: '#F4EFE4',
        align: 'center',
        valign: 'middle',
        transform: 'upper',
        letterSpacing: 200
      },
      {
        type: 'shape',
        name: t('cornice', 'frame'),
        x: 4,
        y: 4,
        w: 55,
        h: 80,
        radius: 2.5,
        fill: 'none',
        stroke: { color: '#F4EFE4', width: 0.6 }
      },
      {
        type: 'shape',
        name: t('dorso', 'backing'),
        x: -3,
        y: -3,
        w: 69,
        h: 94,
        fill: '#2A241C',
        locked: true
      }
    ]
  }
  const token = {
    name: wound,
    width: 25,
    height: 25,
    bleed: 2,
    safeMargin: 2,
    shape: 'ellipse',
    front: [
      {
        type: 'image',
        name: t('simbolo', 'symbol'),
        x: 5,
        y: 5,
        w: 15,
        h: 15,
        src: t('sangue', 'blood'),
        source: { kind: 'fixed' },
        fit: 'contain',
        tint: '#FFFFFF'
      },
      {
        type: 'shape',
        name: t('sfondo', 'background'),
        x: -2,
        y: -2,
        w: 29,
        h: 29,
        fill: '#A33A2A',
        locked: true
      }
    ],
    back: []
  }

  const f = `{${fist}}`
  const rows = [
    [
      t('Salamandra', 'Salamander'),
      E.fire,
      2,
      t('Quando entra: 1 danno a una creatura.', 'On entry: 1 damage to a creature.')
    ],
    [
      t('Fenice', 'Phoenix'),
      E.fire,
      4,
      t('Se viene sconfitta, torna in mano.', 'If defeated, return it to your hand.')
    ],
    [
      t('Scintilla', 'Spark'),
      E.fire,
      1,
      t('Quando entra: pesca una carta.', 'On entry: draw a card.')
    ],
    [
      t('Drago rosso', 'Red dragon'),
      E.fire,
      6,
      t('Non può attaccare nel turno in cui entra.', 'Cannot attack the turn it enters.')
    ],
    [
      t('Brace', 'Ember'),
      E.fire,
      3,
      t(`+1 ${f} se hai un'altra creatura di fuoco.`, `+1 ${f} if you have another fire creature.`)
    ],
    [
      'Ifrit',
      E.fire,
      5,
      t(
        "Quando attacca: 1 danno a ogni creatura d'aria.",
        'When it attacks: 1 damage to each air creature.'
      )
    ],
    [
      t('Ondina', 'Undine'),
      E.water,
      4,
      t('Quando entra: pesca una carta.', 'On entry: draw a card.')
    ],
    [
      t('Leviatano', 'Leviathan'),
      E.water,
      6,
      t('Le creature di fuoco non possono attaccarla.', 'Fire creatures cannot attack it.')
    ],
    [
      t('Tritone', 'Triton'),
      E.water,
      5,
      t(
        'Quando entra: rimetti in mano una creatura con forza 2 o meno.',
        'On entry: return a creature with strength 2 or less to its hand.'
      )
    ],
    [
      t('Sirena', 'Siren'),
      E.water,
      5,
      t(`Le creature di terra avversarie hanno −1 ${f}.`, `Opposing earth creatures get −1 ${f}.`)
    ],
    [
      t('Granchio', 'Crab'),
      E.water,
      4,
      t('Non subisce danni dalle creature di fuoco.', 'Takes no damage from fire creatures.')
    ],
    [
      t('Nebbia', 'Mist'),
      E.water,
      3,
      t(
        'Quando entra: guarda le prime 3 carte del tuo mazzo.',
        'On entry: look at the top 3 cards of your deck.'
      )
    ],
    ['Golem', E.earth, 5, t('Non può essere rimesso in mano.', 'Cannot be returned to hand.')],
    [
      t('Talpa', 'Mole'),
      E.earth,
      1,
      t(
        'Quando entra: pesca una carta, poi scartane una.',
        'On entry: draw a card, then discard one.'
      )
    ],
    [
      t('Uomo albero', 'Treant'),
      E.earth,
      4,
      t(
        'A fine turno togli 1 ferita da una tua creatura.',
        'At the end of your turn, remove 1 wound from one of your creatures.'
      )
    ],
    [
      t('Gnomo', 'Gnome'),
      E.earth,
      2,
      t(`+1 ${f} a un'altra creatura di terra.`, `+1 ${f} to another earth creature.`)
    ],
    [t('Basilisco', 'Basilisk'), E.earth, 6, t('Entra con 2 ferite.', 'Enters with 2 wounds.')],
    [
      t('Cinghiale', 'Boar'),
      E.earth,
      3,
      t('Può attaccare nel turno in cui entra.', 'Can attack the turn it enters.')
    ],
    [
      t('Silfide', 'Sylph'),
      E.air,
      2,
      t('Quando entra: pesca una carta.', 'On entry: draw a card.')
    ],
    [
      t('Grifone', 'Griffin'),
      E.air,
      5,
      t('Può attaccare due volte per turno.', 'Can attack twice per turn.')
    ],
    [
      t('Falco', 'Hawk'),
      E.air,
      1,
      t('Quando entra: guarda la mano di un avversario.', "On entry: look at an opponent's hand.")
    ],
    [
      t('Arpia', 'Harpy'),
      E.air,
      3,
      t(
        "Quando attacca: l'avversario scarta una carta.",
        'When it attacks: the opponent discards a card.'
      )
    ],
    [
      'Roc',
      E.air,
      6,
      t('Le creature di terra non possono bloccarla.', 'Earth creatures cannot block it.')
    ],
    [
      'Djinn',
      E.air,
      4,
      t(
        'Quando entra: rimetti in mano una creatura di fuoco.',
        'On entry: return a fire creature to its hand.'
      )
    ]
  ].map(([n, e, s, x]) => ({ [F]: n, [EL]: e, [S]: s, [X]: x }))

  const doc = t(
    `# Elementi

Un gioco di carte per due giocatori: le creature del fuoco, dell'acqua, della terra e dell'aria si sfidano. Vince chi per primo sconfigge 5 creature avversarie.

## Materiale

- 24 carte creatura, 6 per elemento
- 20 segnalini ferita {sangue}

## La carta

\`\`\`anatomy
card: Creature/nome=Fenice?width=50
- nome: Nome della creatura
- forza: Forza {pugno}
- testo: Effetto
- simbolo (left): Elemento
\`\`\`

## Preparazione

Mescolate le carte e datene 12 a ogni giocatore: sono il suo mazzo. Ognuno pesca 4 carte. Le ferite stanno in mezzo al tavolo.

\`\`\`setup
size 300x150
zone 0,0 145x118 "Giocatore 1"
zone 155,0 145x118 "Giocatore 2"
deck Creature/1?side=back 8,8 count=6 "Mazzo"
deck Creature/1?side=back 163,8 count=6 "Mazzo"
card Creature/nome=Golem 76,8 "In gioco"
card Creature/nome=Ondina 231,8 "In gioco"
deck Ferite/1 137.5,122 count=5
\`\`\`

## Il turno

1. Pesca una carta.
2. Gioca una creatura dalla mano.
3. Attacca con una creatura: la creatura con meno forza {pugno} riceve una ferita {sangue}.

Una creatura con tante ferite quanta è la sua forza è sconfitta.
`,
    `# Elements

A card game for two players: the creatures of fire, water, earth and air face each other. The first player to defeat 5 opposing creatures wins.

## Components

- 24 creature cards, 6 per element
- 20 wound tokens {blood}

## The card

\`\`\`anatomy
card: Creatures/name=Phoenix?width=50
- name: Name of the creature
- strength: Strength {fist}
- text: Effect
- symbol (left): Element
\`\`\`

## Setup

Shuffle the cards and give 12 to each player: that is their deck. Each player draws 4 cards. The wounds go in the middle of the table.

\`\`\`setup
size 300x150
zone 0,0 145x118 "Player 1"
zone 155,0 145x118 "Player 2"
deck Creatures/1?side=back 8,8 count=6 "Deck"
deck Creatures/1?side=back 163,8 count=6 "Deck"
card Creatures/name=Golem 76,8 "In play"
card Creatures/name=Undine 231,8 "In play"
deck Wounds/1 137.5,122 count=5
\`\`\`

## The turn

1. Draw a card.
2. Play a creature from your hand.
3. Attack with a creature: the creature with less strength {fist} gets a wound {blood}.

A creature with as many wounds as its strength is defeated.
`
  )

  return {
    name,
    cards,
    wounds,
    creature,
    wound,
    E,
    F,
    EL,
    S,
    X,
    iconNames,
    template,
    token,
    rows,
    tokenRows: [{ amount: 20 }],
    doc,
    docName: t('Regolamento', 'Rules'),
    variables: { [fist]: { type: 'image', src: fist } },
    styles: {},
    profiles: [
      { name: t('Stampa', 'Print'), kind: 'pdf', options: { sides: 'both', duplex: 'long' } },
      {
        name: 'Tabletop',
        kind: 'tts',
        options: { destination: 'project', objects: { [wounds]: { type: 'token', thickness: 2 } } }
      }
    ]
  }
}
