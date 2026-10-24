// Video 2: il primo componente da zero (circa 4-5 minuti, senza voce). Progetto vuoto, template con
// testo, immagine e icone nel testo, colore dello sfondo calcolato con una formula, set con tre
// colonne, esportazione in PDF; in chiusura lo stesso metodo per un segnalino.
// Uso: xvfb-run -a -s "-screen 0 1600x1100x24" node --experimental-strip-types --no-warnings scripts/video/primo-componente.mjs it|en
// FAST=1 accorcia attese e scrittura, per provare il percorso senza badare al ritmo.
import { launch, mockOpen } from './lib.mjs'
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
// riquadro e testo spariscono prima di ogni clic: il clic apre finestre o cambia vista
const click0 = r.click.bind(r)
r.click = async (loc, opts) => {
  await r.clear(150)
  return click0(loc, opts)
}
const S = it
  ? {
      project: 'Il mio gioco',
      template: 'carta',
      set: 'Personaggi',
      token: 'segnalino',
      fire: 'Fuoco',
      water: 'Acqua',
      cards: [
        ['Drago', 'Fuoco', 'Attacco: 3 {flame}'],
        ['Fenice', 'Fuoco', 'Attacco: 2 {flame}'],
        ['Sirena', 'Acqua', 'Cura: 2 {drop}']
      ],
      name: 'nome',
      type: 'tipo',
      text: 'testo',
      emblem: 'emblema'
    }
  : {
      project: 'My game',
      template: 'card',
      set: 'Characters',
      token: 'token',
      fire: 'Fire',
      water: 'Water',
      cards: [
        ['Dragon', 'Fire', 'Attack: 3 {flame}'],
        ['Phoenix', 'Fire', 'Attack: 2 {flame}'],
        ['Mermaid', 'Water', 'Heal: 2 {drop}']
      ],
      name: 'name',
      type: 'type',
      text: 'text',
      emblem: 'emblem'
    }
// il progetto si crea nella cartella proposta dall'app: deve essere nuova
rmSync(`${docs(lang)}/Stella/${S.project}`, { recursive: true, force: true })

const dialog = () => win.locator('[role="dialog"]').last()
const props = win.locator('aside.properties')
const field = (label, scope = props) =>
  scope
    .locator('.field')
    .filter({ has: win.locator('.field-label', { hasText: new RegExp(`^${label}$`) }) })
    .locator('input, textarea, select')
    .first()
const layer = (n) => win.locator('.layers .layer-name', { hasText: new RegExp(`^${n}$`) }).first()
// il suggerimento dell'app sposta il title in data-tip al passaggio del mouse
const tool = (key) =>
  win.locator(`button.tool[title="${T[key]}"], button.tool[data-tip="${T[key]}"]`).first()
/** campo di una finestra di dialogo: un label con il testo e il controllo dentro */
const dlgField = (label) =>
  dialog()
    .locator('label')
    .filter({ hasText: new RegExp(`^\\s*${label}`) })
    .locator('input, select')
    .first()
const saveButton = () =>
  win
    .locator('header.toolbar button')
    .filter({ hasText: new RegExp(`^(${T['app.save']}|${T['app.saved']})$`) })
    .first()

/** scrive in un campo: clic, seleziona tutto, scrive, Tab per confermare */
async function fill(loc, text, { tab = true } = {}) {
  await loc.scrollIntoViewIfNeeded()
  await r.click(loc, { after: 250, before: 200, ms: 450 })
  await win.keyboard.press('Control+A')
  await r.type(text)
  if (tab) await win.keyboard.press('Tab')
  await r.wait(250)
}
async function choose(loc, value) {
  await loc.scrollIntoViewIfNeeded()
  await r.click(loc, { after: 200, before: 200, ms: 450 })
  await win.keyboard.press('Escape')
  await loc.selectOption(value)
  await r.wait(500)
}
/** posizione e dimensioni in millimetri */
async function place(x, y, w, h) {
  await fill(field('X'), String(x))
  await fill(field('Y'), String(y))
  await fill(field(T['prop.w']), String(w))
  await fill(field(T['prop.h']), String(h))
}

await r.overlay()
await r.title(it ? 'Il tuo primo componente da zero' : 'Your first component from scratch')
await r.title(
  it
    ? 'Una carta con nome, immagine, icone nel testo e un colore che cambia con il tipo'
    : 'A card with a name, an image, icons in the text and a color that follows the type'
)
await r.clear()

// progetto vuoto
await r.focus(
  win.getByText(T['start.newProject']),
  it ? 'Si parte da un progetto nuovo' : 'We start from a new project',
  'right'
)
await r.click(win.getByText(T['start.newProject']))
await r.clear(400)
await r.type(S.project)
await r.wait(400)
await r.focus(
  dialog(),
  it
    ? 'Nome e cartella; i dati delle carte vanno in un file Excel'
    : 'Name and folder; the card data goes into an Excel file',
  'right',
  { pad: 0 }
)
await r.click(dialog().locator('button[type=submit]'))
await r.clear(1800)
await r.overlay()
await r.focus(
  win.getByRole('button', { name: T['sidebar.newTemplate'], exact: true }).last(),
  it ? 'Prima il template: il disegno della carta' : 'First the template: the drawing of the card',
  'below'
)
await r.click(win.getByRole('button', { name: T['sidebar.newTemplate'], exact: true }).last())
await r.clear(400)
await r.type(S.template)
await r.wait(400)
await r.focus(
  dlgField(T['newTemplate.format']),
  it
    ? 'Il formato: poker, bridge, tarocchi, quadrato o su misura'
    : 'The size: poker, bridge, tarot, square or custom',
  'right'
)
await r.click(dialog().locator('button[type=submit]'))
await r.clear(1500)
await r.overlay()

// l'editor
await r.focus(
  win.locator('.canvas-stage').first(),
  it
    ? 'Linea rossa: il taglio con l’abbondanza. Azzurra: il margine di sicurezza'
    : 'Red line: the cut with the bleed. Blue: the safe area',
  'left',
  { pad: 0 }
)
await r.focus(
  win.locator('.editor-toolbar').first(),
  it
    ? 'Gli strumenti: testo, immagine, forme, griglia, valore'
    : 'The tools: text, image, shapes, grid, value',
  'below',
  { pad: 4 }
)

// il nome
await r.title(it ? 'Il nome' : 'The name')
await r.clear()
await r.click(tool('tool.text'))
await r.clear(400)
await r.focus(
  field(T['prop.name']),
  it
    ? 'Il nome del livello è anche la colonna del foglio'
    : 'The layer name is also the sheet column',
  'left'
)
await fill(field(T['prop.name']), S.name)
await r.focus(
  props.locator('.value-source').first(),
  it
    ? 'Valore sulle carte: dalla colonna «' + S.name + '». Ogni carta mostra il suo'
    : 'Value on cards: from the “' + S.name + '” column. Each card shows its own',
  'left',
  { pad: 4 }
)
await r.clear(300)
await fill(field(T['prop.size']), '16')
await choose(field(T['prop.weight']), '700')
await choose(field(T['prop.align']), 'center')
await r.focus(
  field('X'),
  it ? 'Posizione e dimensioni, in millimetri' : 'Position and size, in millimeters',
  'left',
  { ms: 2400 }
)
await r.clear(200)
await place(6, 8, 51, 10)
await r.wait(600)

// l'immagine e le icone
await r.title(it ? 'L’immagine' : 'The image')
await r.clear()
// un livello nuovo va sopra a quello selezionato: sopra lo sfondo, sotto il nome, così nel foglio
// la colonna del nome resta la prima
await r.click(layer('background'), { after: 400 })
await r.click(tool('tool.image'))
await r.clear(400)
await fill(field(T['prop.name']), S.emblem)
await r.focus(
  field(T['source.label']),
  it
    ? 'Questa immagine è uguale su tutte le carte: valore fisso'
    : 'This image is the same on every card: a fixed value',
  'left'
)
await choose(field(T['source.label']), 'fixed')
await r.click(props.locator('.pick-btn').first())
await r.clear(800)
await r.focus(
  dialog().getByRole('button', { name: T['assetPicker.importIcons'] }),
  it
    ? 'Le icone di game-icons.net sono già nell’app'
    : 'The game-icons.net icons are already in the app',
  'below'
)
await r.click(dialog().getByRole('button', { name: T['assetPicker.importIcons'] }))
await r.clear(1500)
for (const [q, name] of [
  ['swords', 'crossed-swords'],
  ['flame', 'flame'],
  ['drop', 'drop']
]) {
  await fill(dialog().getByPlaceholder(T['icons.search']), q, { tab: false })
  await r.wait(900)
  await r.click(dialog().getByText(name, { exact: true }), { after: 500 })
}
await r.focus(
  dialog().locator('button.primary'),
  it
    ? 'Tre icone: l’emblema, la fiamma e la goccia. La licenza viene annotata'
    : 'Three icons: the emblem, the flame and the drop. The license is recorded',
  'above'
)
await r.click(dialog().locator('button.primary'))
await r.clear(1500)
await r.click(dialog().locator('[title*="crossed-swords"]').first())
await r.clear(1000)
await place(16, 22, 31, 31)
await r.wait(600)

// il testo con le icone
await r.title(it ? 'Il testo, con le icone' : 'The text, with icons')
await r.clear()
await r.click(tool('tool.text'))
await r.clear(400)
await fill(field(T['prop.name']), S.text)
await r.focus(
  field(T['prop.text']),
  it
    ? 'Un testo di prova. {flame} è l’icona fiamma, nel testo'
    : 'A sample text. {flame} is the flame icon, inside the text',
  'left'
)
await fill(field(T['prop.text']), S.cards[0][2], { tab: false })
await win.keyboard.press('Tab')
await fill(field(T['prop.size']), '13')
await choose(field(T['prop.align']), 'center')
await place(6, 62, 51, 16)
await r.focus(
  win.locator('.canvas-stage').first(),
  it ? 'L’icona segue la dimensione del testo' : 'The icon follows the text size',
  'left',
  { pad: 0 }
)

// la formula
await r.title(it ? 'Il colore, con una formula' : 'The color, with a formula')
await r.clear()
await r.click(layer('background'))
await r.clear(400)
await r.focus(
  field(T['source.label']),
  it
    ? 'Lo sfondo cambia colore con il tipo: una formula, come in Excel'
    : 'The background changes color with the type: a formula, as in Excel',
  'left'
)
await choose(field(T['source.label']), 'formula')
await fill(field(T['source.formula']), `=IF({${S.type}}="${S.fire}"; "#F4B9A4"; "#B8CCEC")`, {
  tab: false
})
await win.keyboard.press('Tab')
await r.focus(
  props.locator('.value-source').first(),
  it
    ? 'Se il tipo è ' + S.fire + ' il rosso, altrimenti l’azzurro'
    : 'If the type is ' + S.fire + ', red; otherwise blue',
  'left',
  { pad: 4 }
)
await r.clear(300)
await r.click(saveButton())
await r.clear(800)

// il set
await r.title(it ? 'Le carte' : 'The cards')
await r.clear()
await r.focus(
  win.locator('.sidebar button', { hasText: /^\+$/ }).first(),
  it ? 'Un set: le carte che usano il template' : 'A set: the cards that use the template',
  'right'
)
await r.click(win.locator('.sidebar button', { hasText: /^\+$/ }).first())
await r.clear(400)
await r.type(S.set)
await r.wait(400)
await r.focus(
  dialog(),
  it
    ? 'Il foglio nuovo ha già le colonne del template: ' + S.name + ' e ' + S.text
    : 'The new sheet already has the template columns: ' + S.name + ' and ' + S.text,
  'right',
  { pad: 0 }
)
await r.click(dialog().locator('button[type=submit]'))
await r.clear(1800)
await r.overlay()
await r.focus(
  win.getByRole('button', { name: T['set.addColumn'] }),
  it
    ? 'Manca la colonna «' + S.type + '», quella della formula'
    : 'The “' + S.type + '” column, used by the formula, is missing',
  'below'
)
await r.click(win.getByRole('button', { name: T['set.addColumn'] }))
await r.clear(500)
await fill(dialog().locator('input').last(), S.type, { tab: false })
await win.keyboard.press('Enter')
await r.wait(1000)

const form = win.locator('.card-form')
const cardField = (col) =>
  form
    .locator('label')
    .filter({ has: win.locator('.field-label', { hasText: new RegExp(`^${col}$`) }) })
    .locator('input, textarea')
    .first()
for (const [i, [name, type, text]] of S.cards.entries()) {
  if (i > 0 || !(await form.count())) {
    await r.click(win.getByRole('button', { name: T['set.addCard'], exact: true }))
    await r.clear(600)
  }
  if (i === 0)
    await r.focus(
      form.first(),
      it ? 'Il modulo della carta: un campo per colonna' : 'The card form: one field per column',
      'left',
      { pad: 4 }
    )
  await r.clear(200)
  await fill(cardField(S.name), name)
  await fill(cardField(S.type), type)
  await fill(cardField(S.text), text)
  await r.wait(700)
}
await r.focus(
  win.locator('.card-grid').first(),
  it
    ? 'Tre carte, tre righe del foglio. Il colore segue il tipo'
    : 'Three cards, three rows of the sheet. The color follows the type',
  'above',
  { pad: 4 }
)
await r.click(saveButton())
await r.clear(800)

// esportare
await r.title(it ? 'Il PDF per la stampa' : 'The PDF for printing')
await r.clear()
await r.click(win.locator('header.toolbar').getByText(T['app.export'], { exact: true }).first())
await r.clear(800)
await r.focus(
  dialog(),
  it
    ? 'Immagini, PDF o oggetti per Tabletop Simulator. Scegliamo il PDF'
    : 'Images, PDF or Tabletop Simulator objects. Let’s pick the PDF',
  'none',
  { pad: 0, dim: false }
)
await r.click(dialog().getByRole('button', { name: T['export.pdf'], exact: true }))
await r.wait(600)
await r.focus(
  dialog(),
  it
    ? 'Le carte disposte sul foglio, con i segni di taglio'
    : 'The cards laid out on the page, with crop marks',
  'none',
  { pad: 0, dim: false }
)
await r.focus(
  dialog().locator('select').first(),
  it
    ? 'I profili pronti per tipografie e stampa in casa'
    : 'Ready profiles for print shops and home printing',
  'below'
)
await r.click(dialog().getByRole('button', { name: T['export.run'], exact: true }))
await r.wait(3000)
await r.focus(
  dialog(),
  it ? 'Il PDF è nella cartella export del progetto' : 'The PDF is in the project’s export folder',
  'left',
  { pad: 0, dim: false }
)
await r.clear(300)
await r.click(dialog().getByRole('button', { name: T['export.close'], exact: true }))
await r.wait(600)

// stesso metodo, altro formato
await r.title(
  it
    ? 'Segnalini, tessere e plance: stesso metodo, cambia il formato'
    : 'Tokens, tiles and boards: same method, different size'
)
await r.clear()
await r.click(win.getByTitle(T['sidebar.newTemplate']).first())
await r.clear(400)
await r.type(S.token)
await choose(dlgField(T['newTemplate.format']), 'custom')
await fill(dlgField(T['prop.width']), '25')
await fill(dlgField(T['prop.height']), '25')
await r.focus(dialog(), it ? 'Un segnalino rotondo da 25 mm' : 'A round 25 mm token', 'right', {
  pad: 0
})
await r.click(dialog().locator('button[type=submit]'))
await r.clear(1500)
await r.overlay()
await choose(field(T['prop.cardShape']), 'ellipse')
await r.focus(
  win.locator('.canvas-stage').first(),
  it
    ? 'Forma rotonda; poi livelli, set ed export come per la carta'
    : 'Round shape; then layers, sets and export as for the card',
  'left',
  { pad: 0 }
)
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
