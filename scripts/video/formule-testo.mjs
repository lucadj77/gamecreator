// Video 4: testo formattato, icone, stili e formule (circa 6 minuti, senza voce), sul progetto di
// esempio che chi guarda può aprire dalla schermata di ingresso e seguire passo passo.
// Uso: xvfb-run -a -s "-screen 0 2000x1300x24" node --experimental-strip-types --no-warnings scripts/video/formule-testo.mjs it|en
// FAST=1 accorcia attese e scrittura, per provare il percorso senza badare al ritmo.
import { launch } from './lib.mjs'
import { docs } from '../guide/lib.mjs'
import { rmSync } from 'node:fs'
const lang = process.argv[2] || 'it'
const it = lang === 'it'
const r = await launch({ lang, ...(process.env.UD ? { ud: process.env.UD } : {}) })
const { win, T } = r
if (process.env.FAST) {
  const wait = r.wait.bind(r)
  r.wait = (ms) => wait(Math.min(ms, 120))
  r.type = (text) => win.keyboard.type(text, { delay: 2 })
}
if (process.env.SHOT) {
  // in prova: una schermata quando un elemento non si trova
  for (const k of ['focus', 'click']) {
    const f = r[k].bind(r)
    r[k] = async (...a) => {
      try {
        return await f(...a)
      } catch (e) {
        await win.screenshot({ path: process.env.SHOT })
        throw e
      }
    }
  }
}
const click0 = r.click.bind(r)
r.click = async (loc, opts) => {
  await r.clear(150)
  return click0(loc, opts)
}
const S = it
  ? {
      sets: ['Personaggi', 'Oggetti', 'Mercato'],
      monk: 'Monaco',
      witch: 'Strega',
      text: 'testo',
      rank: 'rango',
      frame: 'riquadro',
      points: 'punti',
      footer: 'piede',
      light: 'luce',
      templates: ['personaggio', 'mercato'],
      // il testo del Monaco, scritto in tre tempi
      t1: 'Recupera {sc',
      t2: ' quando un **alleato** viene sconfitto.',
      t3: ' Poi pesca [due carte]{color=rosso weight=800}.',
      bad: ' {scuro}',
      word: 'alleato',
      rankFormula: '=IF({forza}>=5; "Leggenda"; IF({forza}>=3; "Eroe"; "Gregario"))'
    }
  : {
      sets: ['Characters', 'Items', 'Market'],
      monk: 'Monk',
      witch: 'Witch',
      text: 'text',
      rank: 'rank',
      frame: 'panel',
      points: 'points',
      footer: 'footer',
      light: 'light',
      templates: ['character', 'market'],
      t1: 'Regain {sh',
      t2: ' when an **ally** is defeated.',
      t3: ' Then draw [two cards]{color=red weight=800}.',
      bad: ' {shied}',
      word: 'ally',
      rankFormula: '=IF({strength}>=5; "Legend"; IF({strength}>=3; "Hero"; "Follower"))'
    }
rmSync(`${docs(lang)}/Stella/${it ? 'Esempio' : 'Example'}`, { recursive: true, force: true })

const dialog = () => win.locator('[role="dialog"]').last()
const props = win.locator('aside.properties')
const row = (label, scope = props) =>
  scope
    .locator('.field')
    .filter({ has: win.locator('.field-label', { hasText: new RegExp(`^${label}$`) }) })
    .first()
const field = (label, scope = props) =>
  row(label, scope).locator('input:not([type=range]):not([type=checkbox]), textarea, select').first()
const layer = (n) => win.locator('.layers .layer-name', { hasText: new RegExp(`^${n}$`) }).first()
const tool = (key) =>
  win.locator(`button.tool[title="${T[key]}"], button.tool[data-tip="${T[key]}"]`).first()
const titled = (key) => win.locator(`[title="${T[key]}"], [data-tip="${T[key]}"]`).first()
const side = (name) => win.locator('.sidebar').getByText(name, { exact: true }).first()
const saveButton = () =>
  win
    .locator('header.toolbar button')
    .filter({ hasText: new RegExp(`^(${T['app.save']}|${T['app.saved']})$`) })
    .first()
const grid = () => win.locator('.card-grid').first()
const cell = (i) => win.locator('.card-grid .card-cell').nth(i)
const form = win.locator('.card-form')
const cardField = (col) =>
  form
    .locator('label')
    .filter({ has: win.locator('.field-label', { hasText: new RegExp(`^${col}$`) }) })
    .locator('input, textarea')
    .first()

async function fill(loc, text, { tab = true } = {}) {
  await loc.scrollIntoViewIfNeeded()
  await r.click(loc, { after: 250, before: 200, ms: 450 })
  await win.keyboard.press('Control+A')
  await r.type(text)
  if (tab) await win.keyboard.press('Tab')
  await r.wait(250)
}
/** un colore che può mancare: prima la casella che lo attiva, poi il codice */
async function color(label, scope, value) {
  const box = row(label, scope).locator('input[type=checkbox]')
  if ((await box.count()) && !(await box.isChecked())) await r.click(box, { after: 300, ms: 450 })
  await fill(field(label, scope), value)
}
async function choose(loc, value) {
  await loc.scrollIntoViewIfNeeded()
  await r.click(loc, { after: 200, before: 200, ms: 450 })
  await win.keyboard.press('Escape')
  await loc.selectOption(value)
  await r.wait(500)
}
async function place(x, y, w, h) {
  await fill(field('X'), String(x))
  await fill(field('Y'), String(y))
  await fill(field(T['prop.w']), String(w))
  await fill(field(T['prop.h']), String(h))
}
/** apre un set dalla barra laterale, nella vista a griglia */
async function openSet(name) {
  await r.click(side(name))
  await r.clear(1000)
  await r.overlay()
  const g = win.getByRole('button', { name: T['set.grid'], exact: true }).first()
  if (await g.count()) await g.click()
  await r.wait(400)
}

await r.overlay()
await r.title(it ? 'Testo, icone, stili e formule' : 'Text, icons, styles and formulas')
await r.title(
  it
    ? 'Sul progetto di esempio: aprilo anche tu e segui passo passo'
    : 'On the example project: open it too and follow along'
)
await r.clear()

const example = win.getByRole('button', { name: T['start.example'], exact: true })
await r.focus(
  example,
  it ? 'Il progetto di esempio è sempre a portata di clic' : 'The example project is one click away',
  'below'
)
await r.click(example)
await r.clear(2200)
await r.overlay()
await r.focus(
  win.locator('.sidebar').first(),
  it
    ? 'Tre set di carte, con icone, stili e formule già pronti'
    : 'Three card sets, with icons, styles and formulas ready',
  'right',
  { pad: 0 }
)
await openSet(S.sets[0])

// il testo formattato
await r.title(it ? 'Il testo formattato' : 'Formatted text')
await r.clear()
await r.click(cell(4))
await r.clear(500)
const text = cardField(S.text)
await r.focus(
  text,
  it
    ? 'Il testo della carta: si scrive qui o nella cella del foglio Excel'
    : 'The card text: write it here or in the Excel sheet cell',
  'left'
)
await r.click(text, { after: 250 })
await win.keyboard.press('Control+A')
await r.type(S.t1)
await r.wait(700)
await r.focus(
  win.locator('.markup-help').first(),
  it
    ? 'Con { compaiono campi e variabili, con l’anteprima delle icone'
    : 'Typing { lists fields and variables, with icon previews',
  'left',
  { pad: 4 }
)
await r.clear(150)
await win.keyboard.press('Enter')
await r.wait(500)
await r.type(S.t2)
await r.wait(500)
await r.focus(
  win.locator('aside.preview .preview-card').first(),
  it
    ? '**grassetto**, *corsivo*, ==evidenziato==: è Markdown'
    : '**bold**, *italic*, ==highlight==: it is Markdown',
  'left',
  { pad: 0 }
)
await r.clear(150)
await win.keyboard.press('End')
await r.type(S.t3)
await r.wait(600)
await r.focus(
  text,
  it
    ? 'Tra quadre il testo, tra graffe come formattarlo: colore, peso, dimensione…'
    : 'The text in brackets, how to format it in braces: color, weight, size…',
  'left'
)
await r.clear(150)
await win.keyboard.press('End')
await r.type(S.bad)
await r.wait(700)
await r.focus(
  win.locator('.markup-problems, aside.preview .problems').first(),
  it
    ? 'Un nome sbagliato è sottolineato in rosso, con la spiegazione'
    : 'A wrong name is underlined in red, with an explanation',
  'left',
  { pad: 4 }
)
await r.clear(150)
await text.focus()
for (let i = 0; i < S.bad.length; i++) {
  await win.keyboard.press('Backspace')
  await r.wait(60)
}
await r.wait(500)

// formattare senza scrivere il markup
await r.title(
  it ? 'Si può anche formattare senza scrivere il markup' : 'You can also format without markup'
)
await r.clear()
await text.evaluate((el, w) => {
  el.focus()
  const a = el.value.indexOf(w)
  el.setSelectionRange(a, a + w.length)
}, S.word)
await r.wait(500)
const fmt = win.getByRole('button', { name: T['format.button'] }).first()
await r.focus(
  fmt,
  it
    ? 'Si seleziona una parola e si apre «Formatta»'
    : 'Select a word and open “Format”',
  'left'
)
await r.click(fmt)
await r.clear(800)
await r.focus(
  dialog(),
  it
    ? 'Colore, font, riquadri, forme di sfondo: l’app scrive il markup'
    : 'Color, font, boxes, background shapes: the app writes the markup',
  'none',
  { pad: 0, dim: false }
)
await color(T['format.color'], dialog(), '#2F5DA8')
await choose(field(T['format.transform'], dialog()), 'smallcaps')
await r.focus(
  dialog().locator('.format-raw, code').last(),
  it ? 'In fondo, come si scrive nel testo' : 'At the bottom, how it is written in the text',
  'above',
  { pad: 4 }
)
await r.click(dialog().getByRole('button', { name: T['format.apply'], exact: true }))
await r.clear(800)
await r.focus(
  text,
  it ? 'Il markup è nel testo, la carta è aggiornata' : 'The markup is in the text, the card is updated',
  'left'
)

// le variabili
await r.title(it ? 'Le icone e le variabili' : 'Icons and variables')
await r.clear()
const vars = win.locator('.sidebar section').filter({ hasText: T['sidebar.variables'] }).first()
await r.focus(
  vars,
  it
    ? 'Le variabili: icone, testi, colori e valori con un nome'
    : 'Variables: icons, texts, colors and values with a name',
  'right',
  { pad: 0 }
)
await r.click(titled('sidebar.newVariable'))
await r.clear(700)
await fill(field(T['variable.name'], dialog()), S.light)
await fill(field(T['variable.src'], dialog()), it ? 'lanterna' : 'lantern')
await color(T['variable.tint'], dialog(), '#B07A1E')
await r.focus(
  dialog().locator('.format-preview').first(),
  it
    ? 'Un’icona del progetto, colorata, alta quanto la riga di testo'
    : 'A project icon, tinted, as tall as the line of text',
  'below',
  { pad: 4 }
)
await r.click(dialog().getByRole('button', { name: T['variable.save'], exact: true }))
await r.clear(700)
await r.click(text, { after: 250 })
await win.keyboard.press('Control+End')
await r.type(' {' + S.light + '*3}')
await win.keyboard.press('Escape')
await r.wait(700)
await r.focus(
  win.locator('aside.preview .preview-card').first(),
  it
    ? '{' + S.light + '*3}: l’icona ripetuta tre volte'
    : '{' + S.light + '*3}: the icon repeated three times',
  'left',
  { pad: 0 }
)
await r.focus(
  cell(2),
  it
    ? 'La Strega usa {spada*forza}: tante spade quanto vale la forza'
    : 'The Witch uses {sword*strength}: as many swords as its strength',
  'right',
  { pad: 4 }
)

// gli stili
await r.title(it ? 'Gli stili' : 'Styles')
await r.clear()
const keyword = side('.keyword')
await r.focus(
  keyword,
  it
    ? 'Uno stile raccoglie attributi con un nome: [nemico]{.keyword}'
    : 'A style collects attributes under a name: [enemy]{.keyword}',
  'right'
)
await r.click(keyword)
await r.clear(800)
await color(T['format.color'], dialog(), '#A33A2A')
await r.focus(
  dialog().locator('.format-preview').first(),
  it ? 'Cambiamo il colore della parola chiave' : 'Let’s change the keyword color',
  'below',
  { pad: 4 }
)
await r.click(dialog().locator('button.primary').last())
await r.clear(800)
await r.focus(
  [cell(1), cell(2)],
  it
    ? 'Cambia su tutte le carte che usano lo stile'
    : 'It changes on every card that uses the style',
  'right',
  { pad: 4 }
)
await r.click(saveButton())

// le formule
await r.title(it ? 'Le formule' : 'Formulas')
await r.clear()
await r.click(win.getByRole('button', { name: T['preview.editTemplate'] }).first())
await r.clear(1200)
await r.overlay()
await r.click(layer(S.rank))
await r.clear(400)
const formula = field(T['source.formula'])
await r.focus(
  formula,
  it
    ? 'Il rango si calcola dalla forza, con una formula come in Excel'
    : 'The rank is computed from the strength, with an Excel-like formula',
  'left'
)
await fill(formula, S.rankFormula, { tab: false })
// i suggerimenti aperti prenderebbero il Tab
await win.keyboard.press('Escape')
await win.keyboard.press('Tab')
await r.wait(500)
await r.focus(
  props.locator('.value-source').first(),
  it
    ? 'Tre ranghi invece di due; sotto, il risultato sulla prima carta'
    : 'Three ranks instead of two; below, the result on the first card',
  'left',
  { pad: 4 }
)
await r.click(layer(S.frame))
await r.clear(400)
await r.focus(
  props.locator('.value-source').first(),
  it
    ? 'Anche i colori: il riquadro prende il colore della colonna «banda»'
    : 'Colors too: the frame takes the color of the “band” column',
  'left',
  { pad: 4 }
)

// le variabili di sistema
await r.click(layer(S.text), { after: 400 })
await r.click(tool('tool.text'))
await r.clear(400)
await fill(field(T['prop.name']), S.footer)
await choose(field(T['source.label']), 'fixed')
await fill(field(T['prop.text']), '{set.name} {card.number}/{set.rows}', { tab: false })
await win.keyboard.press('Escape')
await win.keyboard.press('Tab')
await fill(field(T['prop.size']), '6')
await choose(field(T['prop.align']), 'right')
await place(6, 82, 51, 3.5)
await r.focus(
  win.locator('.canvas-stage').first(),
  it
    ? 'Variabili di sistema: il nome del set e il numero della carta, da soli'
    : 'System variables: the set name and the card number, by themselves',
  'left',
  { pad: 0 }
)
await openSet(S.sets[0])
await r.focus(
  grid(),
  it
    ? 'Ranghi e numerazione aggiornati su tutte le carte'
    : 'Ranks and numbering updated on every card',
  'above',
  { pad: 4 }
)
await r.click(saveButton())

// il livello valore
await r.click(side(S.templates[1]))
await r.clear(1200)
await r.overlay()
await r.click(layer(S.points))
await r.clear(400)
await r.focus(
  props.locator('.value-source').first(),
  it
    ? 'Un livello valore non si disegna: qui conta le risorse con COUNTIN'
    : 'A value layer is not drawn: here it counts resources with COUNTIN',
  'left',
  { pad: 4 }
)
await openSet(S.sets[2])
await r.focus(
  grid(),
  it ? 'Il punteggio di ogni carta è calcolato' : 'Each card’s score is computed',
  'above',
  { pad: 4 }
)

// l'aiuto
await r.title(it ? 'Tutto a portata di mano: F1' : 'Everything at hand: F1')
await r.clear()
await win.keyboard.press('F1')
await r.wait(900)
await r.overlay()
await r.focus(
  dialog(),
  it
    ? 'Markup, campi, variabili e scorciatoie in un riepilogo'
    : 'Markup, fields, variables and shortcuts in one summary',
  'none',
  { pad: 0, dim: false }
)
await r.click(dialog().getByRole('button', { name: T['help.tab.formulas'], exact: true }))
await r.focus(
  dialog(),
  it
    ? 'Le funzioni delle formule, con il risultato sulle carte del progetto'
    : 'The formula functions, with the result on the project cards',
  'none',
  { pad: 0, dim: false }
)
await win.keyboard.press('Escape')
await r.wait(600)
await r.clear()
await r.title(
  it
    ? 'Tutto il resto è nella guida: stella.lucadj.eu'
    : 'Everything else is in the guide: stella.lucadj.eu',
  3800
)
await r.clear(600)
const p = await r.finish()
console.log('VIDEO', p)
