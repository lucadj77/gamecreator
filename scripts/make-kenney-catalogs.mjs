/* eslint-disable @typescript-eslint/explicit-function-return-type -- script in JavaScript */
// Rigenera i cataloghi Kenney (resources/catalogs/kenney-*.json) dai pacchetti scaricati da
// kenney.nl, tutti CC0. Uso: node scripts/make-kenney-catalogs.mjs <cartella>
// La cartella contiene i pacchetti estratti, ognuno nella sua sottocartella:
//   kenney_board-game-icons/  (Board Game Icons: icone SVG a un colore)
//   kenney_pattern-pack/, kenney_pattern-pack-extra/  (motivi SVG ripetibili)
//   kenney_boardgame-pack/  (Boardgame Pack: carte, fiches, dadi e pedine in PNG)
// Le icone e i motivi diventano tracciati in un riquadro 512 × 512, come quelli di game-icons.net;
// le immagini PNG restano tali e si includono nel catalogo come data URL.
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'fs'
import { basename, join } from 'path'

const root = process.argv[2]
if (!root) {
  console.error('Uso: node scripts/make-kenney-catalogs.mjs <cartella con i pacchetti estratti>')
  process.exit(1)
}

const AUTHOR = { name: 'Kenney', url: 'https://kenney.nl', license: 'CC0-1.0' }
const svgFiles = (dir) =>
  readdirSync(dir)
    .filter((f) => f.endsWith('.svg'))
    .sort()

/** Tracciati del file con il loro riempimento */
const paths = (svg) =>
  [...svg.matchAll(/<path\b[^>]*\bfill="([^"]+)"[^>]*\bd="([^"]+)"/g)].map((m) => ({
    fill: m[1].toUpperCase(),
    d: m[2]
  }))

/** Nei motivi il bianco è lo sfondo: restano le parti scure */
const darkPaths = (svg) =>
  paths(svg)
    .filter((p) => p.fill !== '#FFFFFF')
    .map((p) => p.d)

/** Applica x' = x·k + dx, y' = y·k + dy alle coordinate: i pacchetti usano solo M, L e Q assoluti */
function transform(d, k, dx, dy) {
  if (/[^MLQ\d\s.,-]/.test(d))
    throw new Error(`Comando non previsto nel tracciato: ${d.slice(0, 60)}`)
  let i = 0
  return d.replace(/-?\d*\.?\d+(?:e-?\d+)?/g, (n) => {
    const v = i++ % 2 === 0 ? Number(n) * k + dx : Number(n) * k + dy
    return String(Math.round(v * 100) / 100)
  })
}

function bbox(d) {
  const n = (d.match(/-?\d*\.?\d+(?:e-?\d+)?/g) ?? []).map(Number)
  const xs = n.filter((_, i) => i % 2 === 0)
  const ys = n.filter((_, i) => i % 2 === 1)
  return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)]
}

// Categorie delle icone, dal prefisso del nome; la prima che corrisponde vince
const CATEGORIES = [
  ['k-cards', 'Cards', /^(cards?|suit|hand_card)(_|$)/],
  ['k-dice', 'Dice', /^(d\d+|dice|exploding)(_|$)/],
  ['k-pawns', 'Pawns & characters', /^(pawns?|character|chess)(_|$)/],
  ['k-tokens', 'Tokens & coins', /^(tokens?|hand_token|hand_cube|hand_hexagon|flip|spinner)(_|$)/],
  ['k-shapes', 'Shapes & tiles', /^(hexagon|pentagon|rhombus|puzzle)(_|$)/],
  ['k-arrows', 'Arrows & directions', /^(arrow|direction)(_|$)/],
  ['k-numbers', 'Tags & numbers', /^tag(_|$)/],
  ['k-time', 'Time', /^(hourglass|timer)(_|$)/],
  ['k-resources', 'Resources & buildings', /^(resource|structure)(_|$)/],
  ['k-objects', 'Objects', /./]
]

// --- icone e motivi: tracciati ---
const icons = []
const tagOf = {}
const iconsDir = join(root, 'kenney_board-game-icons', 'Vector', 'Icons')
for (const file of svgFiles(iconsDir)) {
  const name = file.slice(0, -4)
  // le icone sono disegnate in bianco, con un solo tracciato
  const d = paths(readFileSync(join(iconsDir, file), 'utf8'))
    .map((p) => p.d)
    .join(' ')
  if (!d) continue
  // le icone sono centrate sull'origine: si portano nel riquadro con un piccolo margine
  const [x0, y0, x1, y1] = bbox(d)
  const k = 496 / Math.max(x1 - x0, y1 - y0)
  const id = `icons/${name}`
  icons.push([id, transform(d, k, 256 - ((x0 + x1) / 2) * k, 256 - ((y0 + y1) / 2) * k)])
  tagOf[id] = [CATEGORIES.find(([, , re]) => re.test(name))[0]]
}
const nIcons = icons.length

// i motivi riempiono tutto il riquadro, senza margine, perché si possano ripetere senza giunture
for (const [pack, slug] of [
  ['kenney_pattern-pack', 'k-patterns'],
  ['kenney_pattern-pack-extra', 'k-patterns-extra']
]) {
  const dir = join(root, pack, 'Vector')
  if (!existsSync(dir)) continue
  for (const file of svgFiles(dir)) {
    const svg = readFileSync(join(dir, file), 'utf8')
    const size = Number(svg.match(/<svg\b[^>]*\bwidth="(\d+(?:\.\d+)?)"/)?.[1] ?? 64)
    const dark = darkPaths(svg)
    if (!dark.length) continue
    const id = `${slug === 'k-patterns' ? 'patterns' : 'patterns-extra'}/${file.slice(0, -4)}`
    icons.push([id, transform(dark.join(' '), 512 / size, 0, 0)])
    tagOf[id] = [slug]
  }
}

const iconCatalog = {
  source: 'https://kenney.nl',
  author: AUTHOR,
  authors: {},
  icons,
  tags: {
    groups: [
      {
        label: 'Kenney',
        tags: [
          ...CATEGORIES.map(([slug, label]) => ({ slug, label })),
          { slug: 'k-patterns', label: 'Patterns' },
          { slug: 'k-patterns-extra', label: 'Patterns (extra)' }
        ]
      }
    ],
    icons: tagOf
  }
}
writeFileSync('resources/catalogs/kenney-icons.json', JSON.stringify(iconCatalog))
console.log(`kenney-icons: ${nIcons} icone, ${icons.length - nIcons} motivi`)

// --- Boardgame Pack: immagini PNG ---
const images = []
const imageTags = {}
const pngDir = join(root, 'kenney_boardgame-pack', 'PNG')
if (existsSync(pngDir)) {
  for (const folder of readdirSync(pngDir).sort()) {
    const slug = folder.startsWith('Pieces') ? 'k-pieces' : `k-${folder.toLowerCase()}`
    for (const file of readdirSync(join(pngDir, folder)).sort()) {
      if (!file.endsWith('.png')) continue
      const data = readFileSync(join(pngDir, folder, file)).toString('base64')
      const id = `boardgame/${basename(file, '.png')}`
      images.push([id, `data:image/png;base64,${data}`])
      imageTags[id] = [slug]
    }
  }
  const imageCatalog = {
    source: 'https://kenney.nl/assets/boardgame-pack',
    kind: 'image',
    author: AUTHOR,
    authors: {},
    icons: images,
    tags: {
      groups: [
        {
          label: 'Kenney',
          tags: [
            { slug: 'k-cards-png', label: 'Playing cards' },
            { slug: 'k-chips', label: 'Chips' },
            { slug: 'k-dice-png', label: 'Dice' },
            { slug: 'k-pieces', label: 'Pieces' }
          ]
        }
      ],
      icons: Object.fromEntries(
        Object.entries(imageTags).map(([id, [s]]) => [
          id,
          [s === 'k-cards' ? 'k-cards-png' : s === 'k-dice' ? 'k-dice-png' : s]
        ])
      )
    }
  }
  writeFileSync('resources/catalogs/kenney-images.json', JSON.stringify(imageCatalog))
  console.log(`kenney-images: ${images.length} immagini`)
}
