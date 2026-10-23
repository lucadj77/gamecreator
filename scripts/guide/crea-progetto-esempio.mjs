// Crea il progetto di esempio usato per gli screenshot della guida, in italiano o in inglese.
// Uso: node crea-progetto-esempio.mjs <repo stella> <cartella di destinazione> <it|en>
import { createRequire } from 'node:module'
import { mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'

const [repo, dest, lang = 'it'] = process.argv.slice(2)
const require = createRequire(join(repo, 'package.json'))
const ExcelJS = require('exceljs')
const catalog = JSON.parse(readFileSync(join(repo, 'resources/catalogs/game-icons.json'), 'utf8'))
const paths = new Map(catalog.icons.map((i) => [i[0], i[1]]))

const L = (it, en) => (lang === 'it' ? it : en)

rmSync(dest, { recursive: true, force: true })
for (const d of ['data', 'templates', 'assets/icons']) mkdirSync(join(dest, d), { recursive: true })

// icone: nome del file -> id di game-icons.net
const icons = {
  [L('cavaliere', 'knight')]: 'lorc/visored-helm',
  [L('arciere', 'archer')]: 'delapouite/archer',
  [L('strega', 'witch')]: 'cathelineau/witch-face',
  [L('drago', 'dragon')]: 'lorc/dragon-head',
  [L('monaco', 'monk')]: 'delapouite/monk-face',
  [L('ladro', 'thief')]: 'darkzaitzev/hooded-figure',
  [L('spada', 'sword')]: 'lorc/broadsword',
  [L('scudo', 'shield')]: 'delapouite/cross-shield',
  [L('pozione', 'potion')]: 'delapouite/health-potion',
  [L('moneta', 'coin')]: 'delapouite/two-coins',
  [L('legno', 'wood')]: 'delapouite/log',
  [L('pietra', 'stone')]: 'delapouite/stone-pile',
  [L('grano', 'wheat')]: 'lorc/wheat',
  [L('lanterna', 'lantern')]: 'lorc/lantern-flame',
  [L('chiave', 'key')]: 'delapouite/boss-key'
}
const sources = {}
for (const [name, id] of Object.entries(icons)) {
  const d = paths.get(id)
  if (!d) throw new Error('icona mancante: ' + id)
  writeFileSync(
    join(dest, 'assets/icons', name + '.svg'),
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path d="${d}"/></svg>`
  )
  const author = catalog.authors[id.split('/')[0]]
  sources[`icons/${name}.svg`] = {
    kind: 'icon',
    source: 'game-icons.net',
    id,
    title: id.split('/')[1],
    author: author.name,
    license: author.license,
    url: `https://game-icons.net/1x1/${id}.html`,
    imported: '2026-10-19'
  }
}
writeFileSync(join(dest, 'assets/sources.json'), JSON.stringify(sources, null, 2))

const S = {
  chars: L('Personaggi', 'Characters'),
  items: L('Oggetti', 'Items'),
  market: L('Mercato', 'Market'),
  tChar: L('personaggio', 'character'),
  tItem: L('oggetto', 'item'),
  tMarket: L('mercato', 'market')
}
const v = {
  sword: L('spada', 'sword'),
  shield: L('scudo', 'shield'),
  red: L('rosso', 'ruby'),
  hand: L('mano', 'hand'),
  quick: L('rapida', 'quick'),
  wood: L('legno', 'wood'),
  stone: L('pietra', 'stone'),
  wheat: L('grano', 'wheat'),
  coin: L('moneta', 'coin')
}

writeFileSync(
  join(dest, 'stella.json'),
  JSON.stringify(
    {
      formatVersion: 1,
      name: L('Esempio', 'Example'),
      dataFile: L('data/carte.xlsx', 'data/cards.xlsx'),
      sets: [
        { name: S.chars, template: S.tChar },
        { name: S.items, template: S.tItem },
        { name: S.market, template: S.tMarket }
      ],
      styles: {
        keyword: 'weight=800 color=#7A3FA0 smallcaps',
        flavor: 'italic size=90% color=#6B6255 center'
      },
      variables: {
        [v.sword]: { type: 'image', src: v.sword, tint: v.red },
        [v.shield]: { type: 'image', src: v.shield, tint: '#2F5DA8', scale: 1.2 },
        [v.wood]: { type: 'image', src: v.wood, tint: '#8A5A2B', scale: 1.2 },
        [v.stone]: { type: 'image', src: v.stone, tint: '#6E6A64', scale: 1.2 },
        [v.wheat]: { type: 'image', src: v.wheat, tint: '#C49A1E', scale: 1.2 },
        [v.coin]: { type: 'image', src: v.coin, tint: '#B07A1E' },
        [v.red]: { type: 'color', color: '#A33A2A' },
        [v.hand]: { type: 'value', value: '7' },
        [v.quick]: {
          type: 'text',
          text: `[${L('Rapida', 'Quick')}]{border=#7A3FA0/0.3 radius=round color=#7A3FA0}`
        }
      }
    },
    null,
    2
  )
)

const C = {
  name: L('nome', 'name'),
  band: L('banda', 'band'),
  str: L('forza', 'strength'),
  portrait: L('ritratto', 'portrait'),
  text: L('testo', 'text'),
  rank: L('rango', 'rank'),
  cost: L('costo', 'cost'),
  icon: L('icona', 'icon'),
  effect: L('effetto', 'effect'),
  res: L('risorse', 'resources'),
  pts: L('punti', 'points')
}

const charTemplate = {
  name: S.tChar,
  width: 63,
  height: 88,
  bleed: 3,
  safeMargin: 3,
  cornerRadius: 3,
  front: [
    {
      type: 'text',
      name: C.name,
      x: 6,
      y: 4.5,
      w: 51,
      h: 9.5,
      text: L('Nome', 'Name'),
      weight: 800,
      size: 14,
      color: '#FFFFFF',
      valign: 'middle',
      fit: 'shrink'
    },
    {
      type: 'text',
      name: C.str,
      x: 7,
      y: 48.5,
      w: 10,
      h: 10,
      text: '1',
      weight: 800,
      size: 13,
      color: '#FFFFFF',
      align: 'center',
      valign: 'middle'
    },
    {
      type: 'shape',
      name: C.str + '_bg',
      shape: 'ellipse',
      x: 7,
      y: 48.5,
      w: 10,
      h: 10,
      fill: v.red,
      stroke: { color: '#FFFFFF', width: 0.5 }
    },
    {
      type: 'text',
      name: C.rank,
      x: 19,
      y: 48.5,
      w: 38,
      h: 10,
      text: '',
      weight: 700,
      size: 8,
      color: '#5E5446',
      valign: 'middle',
      transform: 'upper',
      letterSpacing: 80,
      source: {
        kind: 'formula',
        expr: L('=IF({forza}>=4; "Eroe"; "Gregario")', '=IF({strength}>=4; "Hero"; "Follower")')
      }
    },
    {
      type: 'text',
      name: C.text,
      x: 6,
      y: 61,
      w: 51,
      h: 21,
      text: '',
      weight: 600,
      size: 8.5,
      color: '#2A241C',
      lineHeight: 1.3,
      fit: 'shrink'
    },
    {
      type: 'shape',
      name: L('separatore', 'divider'),
      shape: 'rect',
      x: 6,
      y: 59.6,
      w: 51,
      h: 0.3,
      fill: '#CFC4B0'
    },
    {
      type: 'image',
      name: C.portrait,
      x: 19,
      y: 17,
      w: 25,
      h: 28,
      src: '',
      fit: 'contain',
      tint: '#FFFFFF'
    },
    {
      type: 'shape',
      name: L('riquadro', 'panel'),
      x: 4,
      y: 15.5,
      w: 55,
      h: 31,
      radius: 1.5,
      fill: '#3A3226',
      source: { kind: 'formula', expr: `{${C.band}}` }
    },
    { type: 'shape', name: C.band, x: 4, y: 4, w: 55, h: 10.5, radius: 2, fill: '#2F5DA8' },
    {
      type: 'shape',
      name: L('sfondo', 'background'),
      x: -3,
      y: -3,
      w: 69,
      h: 94,
      fill: '#F4EFE4',
      locked: true
    }
  ],
  back: [
    {
      type: 'text',
      name: L('retro_titolo', 'back_title'),
      x: 4,
      y: 62,
      w: 55,
      h: 10,
      text: 'STELLA',
      weight: 800,
      size: 16,
      color: '#E8C26A',
      align: 'center',
      valign: 'middle',
      letterSpacing: 300
    },
    {
      type: 'shape',
      name: L('retro_stella', 'back_star'),
      shape: 'star',
      sides: 8,
      innerRatio: 0.55,
      x: 16.5,
      y: 24,
      w: 30,
      h: 30,
      fill: '#E8C26A'
    },
    {
      type: 'shape',
      name: L('retro_cornice', 'back_frame'),
      x: 4,
      y: 4,
      w: 55,
      h: 80,
      radius: 2,
      fill: null,
      stroke: { color: '#E8C26A', width: 0.6 }
    },
    {
      type: 'shape',
      name: L('retro_sfondo', 'back_background'),
      x: -3,
      y: -3,
      w: 69,
      h: 94,
      fill: '#2A3550'
    }
  ]
}

const itemTemplate = {
  name: S.tItem,
  width: 63,
  height: 88,
  bleed: 3,
  safeMargin: 3,
  cornerRadius: 3,
  front: [
    {
      type: 'text',
      name: C.cost,
      x: 47,
      y: 4,
      w: 12,
      h: 12,
      text: '0',
      weight: 800,
      size: 13,
      color: '#FFFFFF',
      align: 'center',
      valign: 'middle'
    },
    {
      type: 'shape',
      name: C.cost + '_bg',
      shape: 'polygon',
      sides: 4,
      x: 46,
      y: 3,
      w: 14,
      h: 14,
      fill: '#B07A1E',
      stroke: { color: '#FFFFFF', width: 0.5 }
    },
    {
      type: 'text',
      name: C.name,
      x: 6,
      y: 6,
      w: 40,
      h: 8,
      text: L('Oggetto', 'Item'),
      weight: 800,
      size: 13,
      color: '#2A241C',
      valign: 'middle',
      fit: 'shrink'
    },
    {
      type: 'image',
      name: C.icon,
      x: 16.5,
      y: 20,
      w: 30,
      h: 30,
      src: '',
      fit: 'contain',
      tint: '#5E5446'
    },
    {
      type: 'text',
      name: C.effect,
      x: 6,
      y: 56,
      w: 51,
      h: 26,
      text: '',
      weight: 600,
      size: 9,
      color: '#2A241C',
      align: 'center',
      valign: 'middle',
      lineHeight: 1.3,
      fit: 'shrink'
    },
    {
      type: 'shape',
      name: L('riquadro', 'panel'),
      x: 4,
      y: 53,
      w: 55,
      h: 31,
      radius: 2,
      fill: '#EDE4D3'
    },
    {
      type: 'shape',
      name: L('sfondo', 'background'),
      x: -3,
      y: -3,
      w: 69,
      h: 94,
      fill: '#F4EFE4',
      locked: true
    }
  ],
  back: [
    {
      type: 'image',
      name: L('retro_icona', 'back_icon'),
      x: 16.5,
      y: 29,
      w: 30,
      h: 30,
      src: L('moneta', 'coin'),
      fit: 'contain',
      tint: '#E8C26A'
    },
    {
      type: 'shape',
      name: L('retro_sfondo', 'back_background'),
      x: -3,
      y: -3,
      w: 69,
      h: 94,
      fill: '#5E4421'
    }
  ]
}

const marketTemplate = {
  name: S.tMarket,
  width: 44,
  height: 63,
  bleed: 3,
  safeMargin: 2.5,
  cornerRadius: 3,
  front: [
    {
      type: 'value',
      name: C.pts,
      value: '0',
      source: {
        kind: 'formula',
        expr: L(
          '=COUNTIN({risorse}; "pietra")*2 + COUNTIN({risorse}; "legno") + COUNTIN({risorse}; "grano")',
          '=COUNTIN({resources}; "stone")*2 + COUNTIN({resources}; "wood") + COUNTIN({resources}; "wheat")'
        )
      }
    },
    {
      type: 'text',
      name: L('punti_testo', 'points_text'),
      x: 14,
      y: 40,
      w: 16,
      h: 16,
      text: '',
      weight: 900,
      size: 20,
      color: '#FFFFFF',
      align: 'center',
      valign: 'middle',
      source: { kind: 'formula', expr: `{${C.pts}}` }
    },
    {
      type: 'shape',
      name: L('punti_bg', 'points_bg'),
      shape: 'polygon',
      sides: 6,
      x: 13,
      y: 39,
      w: 18,
      h: 18,
      fill: '#3C7A3E',
      stroke: { color: '#FFFFFF', width: 0.6 }
    },
    {
      type: 'text',
      name: C.res,
      x: 3,
      y: 12,
      w: 38,
      h: 22,
      text: '',
      size: 22,
      color: '#2A241C',
      align: 'center',
      valign: 'middle',
      lineHeight: 1
    },
    {
      type: 'text',
      name: L('titolo', 'title'),
      x: 3,
      y: 3.5,
      w: 38,
      h: 6,
      text: L('Mercato', 'Market'),
      weight: 800,
      size: 9,
      color: '#5E5446',
      align: 'center',
      valign: 'middle',
      transform: 'upper',
      letterSpacing: 150
    },
    {
      type: 'shape',
      name: L('sfondo', 'background'),
      x: -3,
      y: -3,
      w: 50,
      h: 69,
      fill: '#EDE4D3',
      locked: true
    }
  ],
  back: [
    {
      type: 'shape',
      name: L('retro_sfondo', 'back_background'),
      x: -3,
      y: -3,
      w: 50,
      h: 69,
      fill: '#3C7A3E'
    }
  ]
}

writeFileSync(join(dest, 'templates', S.tChar + '.json'), JSON.stringify(charTemplate, null, 2))
writeFileSync(join(dest, 'templates', S.tItem + '.json'), JSON.stringify(itemTemplate, null, 2))
writeFileSync(join(dest, 'templates', S.tMarket + '.json'), JSON.stringify(marketTemplate, null, 2))

const wb = new ExcelJS.Workbook()
const chars = wb.addWorksheet(S.chars)
chars.addRows([
  ['amount', C.name, C.band, C.str, C.portrait, C.text],
  [
    1,
    L('Cavaliere', 'Knight'),
    '#2F5DA8',
    4,
    L('cavaliere', 'knight'),
    L(
      'Quando attacchi, pesca **una carta**.\n{.flavor} Il castello non cadrà stanotte.',
      'When you attack, draw **one card**.\n{.flavor} The castle will not fall tonight.'
    )
  ],
  [
    2,
    L('Arciere', 'Archer'),
    '#3C7A3E',
    2,
    L('arciere', 'archer'),
    L(
      'Può colpire un [nemico]{.keyword} a distanza [2]{bg=circle bg-color=#3C7A3E color=white weight=800}.',
      'Can hit an [enemy]{.keyword} at range [2]{bg=circle bg-color=#3C7A3E color=white weight=800}.'
    )
  ],
  [
    1,
    L('Strega', 'Witch'),
    '#7A3FA0',
    3,
    L('strega', 'witch'),
    L(
      'Scambia due carte sul tavolo.\n- Se una è un [Cavaliere]{.keyword}, guadagna {spada*forza}\n- Altrimenti {rapida} fino a fine turno.',
      'Swap two cards on the table.\n- If one is a [Knight]{.keyword}, gain {sword*strength}\n- Otherwise {quick} until end of turn.'
    )
  ],
  [
    1,
    L('Drago', 'Dragon'),
    '#A33A2A',
    6,
    L('drago', 'dragon'),
    L(
      '# Immune\nNon può essere bersaglio di ==magie==.\n---\n[Fuoco]{stroke=#A33A2A/12% color=#FFD27A size=+3 weight=900}',
      '# Immune\nCannot be targeted by ==spells==.\n---\n[Fire]{stroke=#A33A2A/12% color=#FFD27A size=+3 weight=900}'
    )
  ],
  [
    2,
    L('Monaco', 'Monk'),
    '#B07A1E',
    1,
    L('monaco', 'monk'),
    L(
      'Recupera {scudo} quando un alleato viene sconfitto.',
      'Regain {shield} when an ally is defeated.'
    )
  ],
  [
    1,
    L('Ladro', 'Thief'),
    '#3D3D3D',
    2,
    L('ladro', 'thief'),
    L(
      'Ruba {moneta*2} a un altro giocatore. Puoi tenere fino a {mano} carte.',
      'Steal {coin*2} from another player. You may keep up to {hand} cards.'
    )
  ]
])
const items = wb.addWorksheet(S.items)
items.addRows([
  ['amount', C.name, C.cost, C.icon, C.icon + '.tint', C.effect],
  [
    3,
    L('Pozione', 'Potion'),
    1,
    L('pozione', 'potion'),
    '#3C7A3E',
    L(
      'Recupera [2]{bg=hexagon bg-color=#3C7A3E color=white weight=800} punti vita.',
      'Regain [2]{bg=hexagon bg-color=#3C7A3E color=white weight=800} health.'
    )
  ],
  [1, L('Spada', 'Sword'), 3, L('spada', 'sword'), '#A33A2A', L('+2 {spada}', '+2 {sword}')],
  [
    2,
    L('Scudo', 'Shield'),
    2,
    L('scudo', 'shield'),
    '#2F5DA8',
    L('Annulla il prossimo attacco.', 'Cancel the next attack.')
  ],
  [
    1,
    L('Lanterna', 'Lantern'),
    2,
    L('lanterna', 'lantern'),
    '#B07A1E',
    L('Guarda le prime **3** carte del mazzo.', 'Look at the top **3** cards of the deck.')
  ],
  [
    1,
    L('Chiave', 'Key'),
    4,
    L('chiave', 'key'),
    '#5E5446',
    L(
      'Apre una porta chiusa.\n{.flavor} Nessuno sa da dove venga.',
      'Opens a locked door.\n{.flavor} Nobody knows where it came from.'
    )
  ]
])
const market = wb.addWorksheet(S.market)
market.addRow(['amount', C.res])
const res = [v.wood, v.stone, v.wheat]
for (let i = 0; i < res.length; i++)
  for (let j = i; j < res.length; j++) market.addRow([1, `{${res[i]}}{${res[j]}}`])
await wb.xlsx.writeFile(join(dest, L('data/carte.xlsx', 'data/cards.xlsx')))
console.log('ok', dest)
