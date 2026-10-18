// Rigenera resources/catalogs/game-icons-tags.json: i tag di game-icons.net e le loro icone.
// Uso: node scripts/fetch-icon-tags.mjs            legge le pagine dei tag dal sito
//      node scripts/fetch-icon-tags.mjs <cartella>  legge <cartella>/<tag>.txt, una riga
//                                                   "autore/nome" per icona
// Il sito non offre un file con i tag: si leggono le pagine game-icons.net/tags/<tag>.html.
// Gruppi ed etichette sono quelli di game-icons.net/tags.html; un tag nuovo va aggiunto qui.
import { existsSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'

const GROUPS = [
  ['Abstract', 'abstract:Abstract cross:Cross gui:GUI star:Star & Sun symbol:Symbol & Emblem'],
  [
    'Animal',
    'animal:Animal bird:Bird claw:Claw fish:Fish insect:Insect & Spider mammal:Mammal ' +
      'reptile:Reptile shell:Shell tentacle:Tentacle wing:Wing'
  ],
  [
    'Board & Card',
    'board:Board & Card arimaa:Arimaa cluedo:Cluedo dice:Dice catan:Settlers of Catan ' +
      'tarot:Tarot toy:Toy'
  ],
  [
    'Body',
    'body:Body anatomy:Anatomy blood:Blood & Wound bone:Bone eye:Eye hand:Hand ' +
      'head:Head & Face heart:Heart mouth:Mouth & Jaw skull:Skull'
  ],
  ['Building & Place', 'building:Building & Place bridge:Bridge door:Door & Gate tower:Tower'],
  ['Chemical', 'chemical:Chemical liquid:Liquid poison:Poison smoke:Smoke'],
  [
    'Cinema',
    'cinema:Cinema circus:Circus game-of-thrones:Game of Thrones ninja:Ninja pirate:Pirate ' +
      'police:Police & Crime science-fiction:Science fiction steampunk:Steampunk'
  ],
  [
    'Civilization',
    'civilization:Civilization egypt:Ancient Egypt greek-roman:Ancient Greece & Roman Empire ' +
      'celtic:Celtic statue:Statue stone-age:Stone Age viking:Viking western:Western ' +
      'world-wars:World wars'
  ],
  [
    'Clothing',
    'clothing:Clothing armor:Armor boot:Boot & Shoe hat:Hat, Helmet & Crown mask:Mask ' +
      'jewellery:Ring & Jewellery'
  ],
  [
    'Creature & Monster',
    'creature:Creature & Monster death:Death medieval-fantasy:Medieval fantasy characters ' +
      'vampire:Vampire zombie:Zombie'
  ],
  [
    'Food',
    'food:Food bottle:Bottle egg:Egg fruit:Fruit & Vegetable glass:Glass ' +
      'kitchenware:Kitchenware meat:Meat'
  ],
  [
    'Machine',
    'machine:Machine boat:Boat electronic:Electronic device energy:Energy robot:Robot ' +
      'tool:Tool vehicle:Vehicle'
  ],
  ['Map & Country', 'map:Map & Country australia:Australia france:France mexico:Mexico'],
  [
    'Nature',
    'nature:Nature fire:Fire ice:Ice lightning:Lightning metal:Metal mineral:Mineral ' +
      'mushroom:Mushroom plant:Plant sea:Sea sky:Sky & Weather space:Space stone:Stone ' +
      'wood:Wood & Tree'
  ],
  ['Office', 'office:Office book:Book'],
  ['Sound & Music', 'sound:Sound & Music musical-instrument:Musical instrument'],
  ['Video game', 'video-game:Video game super-mario:Super Mario zelda:Zelda'],
  [
    'Weapon',
    'weapon:Weapon arrow:Arrow & Spear axe:Axe blade:Blade, Sword & Knife bomb:Bomb ' +
      'explosion:Explosion & Projectile gun:Gun & Firearm shield:Shield target:Target'
  ],
  [
    'Miscellaneous',
    'action:Action bag:Bag ball:Ball block:Block container:Container farm:Farm flag:Flag ' +
      'household:Household life:Life, Health & Medicine light:Light lock:Lock & Key ' +
      'money:Money rank:Rank spike:Spike, Slash & Crack sport:Sport state:State & mood ' +
      'string:String time:Time trap:Trap'
  ]
].map(([label, list]) => ({
  label,
  tags: list.split(/ (?=[a-z-]+:)/).map((t) => {
    const i = t.indexOf(':')
    return { slug: t.slice(0, i), label: t.slice(i + 1) }
  })
}))

const from = process.argv[2]
const catalog = JSON.parse(readFileSync('resources/catalogs/game-icons.json', 'utf8'))
const known = new Set(catalog.icons.map(([id]) => id))

const icons = {}
let unknown = 0
for (const g of GROUPS)
  for (const t of g.tags) {
    let list = []
    if (from) {
      const file = join(from, `${t.slug}.txt`)
      if (existsSync(file)) list = readFileSync(file, 'utf8').split(/\s+/)
    } else {
      const res = await fetch(`https://game-icons.net/tags/${t.slug}.html`)
      if (!res.ok) throw new Error(`${t.slug}: HTTP ${res.status}`)
      const html = await res.text()
      list = [...html.matchAll(/\/1x1\/([a-z0-9-]+\/[a-z0-9-]+)\.html/g)].map((m) => m[1])
    }
    const ids = new Set(list)
    let n = 0
    for (const id of ids) {
      // si tengono solo le icone del catalogo: scarta link ad altre pagine e nomi sbagliati
      if (!known.has(id)) {
        if (id) unknown++
        continue
      }
      ;(icons[id] ??= []).push(t.slug)
      n++
    }
    console.log(`${t.slug} ${n}`)
  }

const sorted = Object.fromEntries(Object.entries(icons).sort(([a], [b]) => a.localeCompare(b)))
writeFileSync(
  'resources/catalogs/game-icons-tags.json',
  JSON.stringify({ groups: GROUPS, icons: sorted })
)
console.log(`${Object.keys(sorted).length} icone con tag su ${known.size}; scartati ${unknown}`)
