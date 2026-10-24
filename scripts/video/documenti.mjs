// Video 5: il regolamento e gli altri documenti (circa 6 minuti, senza voce), sul progetto di
// esempio: testo in Markdown, carte vere, tabella, riquadro, anatomia della carta, schema del tavolo,
// impostazioni della pagina ed esportazione.
// Uso: xvfb-run -a -s "-screen 0 2000x1300x24" node --experimental-strip-types --no-warnings scripts/video/documenti.mjs it|en
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
      intro: [
        '# Regolamento',
        '',
        '## Materiale',
        '',
        'Ogni giocatore riceve {mano} carte personaggio e 3 {moneta}.',
        ''
      ],
      bold: '{mano} carte personaggio',
      dragon: 'Drago',
      caption: 'Il drago',
      tableTitle: ['', '## Le carte', ''],
      table: [
        ['Personaggio', 'Forza', 'Effetto'],
        ['Cavaliere', '4', 'pesca una carta'],
        ['Ladro', '2', 'ruba {moneta*2}']
      ],
      turn: ['', '## Il turno', '', '1. Pesca una carta.', '2. Gioca un personaggio.', '3. Attacca con {spada} o difendi.'],
      tip: ['', 'Suggerimento: tieni sempre una carta per difenderti.'],
      layers: [
        ['nome', 'Nome del personaggio'],
        ['forza', 'Forza: si somma al tiro del dado'],
        ['testo', 'Abilità del personaggio']
      ],
      setupTitle: ['', '## Preparazione', ''],
      zone: 'Giocatore 1',
      deck: 'Cavaliere'
    }
  : {
      intro: [
        '# Rulebook',
        '',
        '## Components',
        '',
        'Each player gets {hand} character cards and 3 {coin}.',
        ''
      ],
      bold: '{hand} character cards',
      dragon: 'Dragon',
      caption: 'The dragon',
      tableTitle: ['', '## The cards', ''],
      table: [
        ['Character', 'Strength', 'Effect'],
        ['Knight', '4', 'draw a card'],
        ['Thief', '2', 'steal {coin*2}']
      ],
      turn: ['', '## The turn', '', '1. Draw a card.', '2. Play a character.', '3. Attack with {sword} or defend.'],
      tip: ['', 'Tip: always keep a card to defend yourself.'],
      layers: [
        ['name', 'Character name'],
        ['strength', 'Strength: added to the die roll'],
        ['text', 'Character ability']
      ],
      setupTitle: ['', '## Setup', ''],
      zone: 'Player 1',
      deck: 'Knight'
    }
rmSync(`${docs(lang)}/Stella/${it ? 'Esempio' : 'Example'}`, { recursive: true, force: true })

const dialog = () => win.locator('[role="dialog"]').last()
const titled = (key) => win.locator(`[title="${T[key]}"], [data-tip="${T[key]}"]`).first()
const editor = () => win.locator('.document-editor .markup-field textarea').first()
const preview = () => win.locator('.document-preview').first()
const tb = (key) =>
  win.locator('.document-toolbar button', { hasText: new RegExp(`^${T[key]}$`) }).first()
const toolTitle = (title) => win.locator(`.document-toolbar button[title^="${title}"]`).first()
const sideSection = (key) =>
  win.locator('.sidebar section').filter({ hasText: T[key] }).first()
/** etichetta di una finestra con il controllo dentro */
const dlgField = (label) =>
  dialog()
    .locator('label')
    .filter({ hasText: new RegExp(`^\\s*${label.replace(/[()]/g, '\\$&')}`) })
    .locator('input, select')
    .first()

async function fill(loc, text, { tab = true } = {}) {
  await loc.scrollIntoViewIfNeeded()
  await r.click(loc, { after: 250, before: 200, ms: 450 })
  await win.keyboard.press('Control+A')
  await r.type(text)
  if (tab) await win.keyboard.press('Tab')
  await r.wait(250)
}
/** scrive righe nel documento; Esc chiude i suggerimenti prima dell'a capo */
async function lines(rows) {
  for (const [i, row] of rows.entries()) {
    if (row) await r.type(row)
    await win.keyboard.press('Escape')
    if (i < rows.length - 1) await win.keyboard.press('Enter')
    await r.wait(150)
  }
  await r.wait(400)
}
async function toEnd() {
  await editor().focus()
  await win.keyboard.press('Control+End')
}
/** seleziona un pezzo di testo del documento */
async function select(text) {
  await editor().evaluate((el, w) => {
    el.focus()
    const a = el.value.indexOf(w)
    el.setSelectionRange(a, a + w.length)
  }, text)
  await r.wait(400)
}
/** fa scorrere l'anteprima fino in fondo */
async function previewBottom() {
  await preview().evaluate((el) => el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' }))
  await r.wait(900)
}

await r.overlay()
await r.title(it ? 'Il regolamento e gli altri documenti' : 'The rulebook and other documents')
await r.title(
  it
    ? 'Si scrivono nell’app, con le carte vere del gioco dentro'
    : 'Written in the app, with the real game cards inside'
)
await r.clear()

const example = win.getByRole('button', { name: T['start.example'], exact: true })
await r.click(example)
await r.clear(2200)
await r.overlay()
await r.focus(
  sideSection('sidebar.documents'),
  it
    ? 'I documenti: regolamento, sell sheet, domande frequenti…'
    : 'Documents: rulebook, sell sheet, FAQ…',
  'right',
  { pad: 0 }
)
await r.click(titled('sidebar.newDocument'))
await r.clear(1200)
await r.overlay()
await r.focus(
  win.locator('.document-editor').first(),
  it
    ? 'A sinistra si scrive in Markdown; si salva da solo'
    : 'On the left you write in Markdown; it saves by itself',
  'right',
  { pad: 0 }
)
await r.focus(
  preview(),
  it ? 'A destra la pagina, mentre si scrive' : 'On the right the page, as you write',
  'left',
  { pad: 0 }
)

// il testo
await r.title(it ? 'Il testo' : 'The text')
await r.clear()
await r.click(editor(), { after: 300 })
await lines(S.intro)
await r.focus(
  preview(),
  it
    ? 'Titoli, paragrafi e le icone del gioco, come sulle carte'
    : 'Headings, paragraphs and the game icons, as on the cards',
  'left',
  { pad: 0 }
)
await select(S.bold)
await r.focus(
  win.locator('.document-toolbar').first(),
  it
    ? 'La barra mette grassetto, corsivo, elenchi, stili…'
    : 'The bar adds bold, italic, lists, styles…',
  'below',
  { pad: 4 }
)
await r.click(toolTitle(T['docTools.bold']))
await r.wait(600)
await r.focus(
  editor(),
  it
    ? 'e scrive nel testo il markup che si scriverebbe a mano'
    : 'and writes in the text the markup you would type by hand',
  'right',
  { pad: 4, ms: 2800 }
)

// la carta
await r.title(it ? 'Le carte del gioco' : 'The game cards')
await r.clear()
await toEnd()
await win.keyboard.press('Enter')
await r.click(tb('documents.insertCard'))
await r.clear(900)
await r.click(dialog().getByText(S.dragon, { exact: true }).first(), { after: 500 })
await fill(dlgField(T['documents.width']), '40')
await fill(dlgField(T['documents.caption']), S.caption)
await r.focus(
  dialog(),
  it
    ? 'Si sceglie la carta, il lato, la larghezza e la didascalia'
    : 'Choose the card, the side, the width and the caption',
  'none',
  { pad: 0, dim: false }
)
await r.click(dialog().locator('button.primary').last())
await r.clear(1000)
await previewBottom()
await r.focus(
  preview(),
  it
    ? 'La carta non è una copia: se cambiano i dati, cambia anche qui'
    : 'The card is not a copy: if the data changes, it changes here too',
  'left',
  { pad: 0 }
)

// la tabella
await r.title(it ? 'Tabelle e riquadri' : 'Tables and boxes')
await r.clear()
await toEnd()
await lines(S.tableTitle)
await r.click(tb('documents.table'))
await r.clear(900)
const cellAt = (row, col) =>
  dialog().locator('.table-dialog-grid tbody tr').nth(row).locator('textarea').nth(col)
for (const [i, row] of S.table.entries())
  for (const [j, value] of row.entries()) await fill(cellAt(i, j), value, { tab: false })
await r.focus(
  dialog().locator('.table-dialog-look').first(),
  it
    ? 'Si scrive cella per cella, o si incollano celle da Excel. Sotto, l’aspetto'
    : 'Type cell by cell, or paste cells from Excel. Below, the look',
  'above',
  { pad: 4 }
)
await r.click(dialog().locator('button.primary').last())
await r.clear(1000)
await previewBottom()
await r.focus(
  preview(),
  it ? 'Nelle celle valgono icone e stili' : 'Icons and styles work in the cells',
  'left',
  { pad: 0 }
)
await toEnd()
await lines(S.turn)
await lines(S.tip)
await select(S.tip[1])
await r.click(tb('documents.box'))
await r.clear(900)
await r.focus(
  dialog(),
  it
    ? 'Un riquadro colorato per dare risalto a una parte del testo'
    : 'A colored box to make part of the text stand out',
  'none',
  { pad: 0, dim: false }
)
await r.click(dialog().locator('button.primary').last())
await r.clear(1000)
await previewBottom()
await r.focus(
  preview(),
  it ? 'Elenchi numerati, icone e il riquadro' : 'Numbered lists, icons and the box',
  'left',
  { pad: 0 }
)

// l'anatomia
await r.title(it ? 'L’anatomia della carta' : 'The card anatomy')
await r.clear()
await toEnd()
await win.keyboard.press('Enter')
await win.keyboard.press('Enter')
await r.click(tb('documents.anatomy'))
await r.clear(900)
await r.click(dialog().getByText(S.dragon, { exact: true }).first(), { after: 500 })
const layerRow = (n) => dialog().locator('.anatomy-layer').filter({ has: win.locator('label', { hasText: new RegExp(`^\\s*${n}\\s*$`) }) }).first()
for (const [n, label] of S.layers) {
  await r.click(layerRow(n).locator('input[type=checkbox]'), { after: 300, ms: 450 })
  await fill(layerRow(n).locator('textarea'), label, { tab: false })
}
await r.focus(
  dialog().locator('.anatomy-layers').first(),
  it
    ? 'Si spuntano le parti della carta e si scrivono le etichette'
    : 'Tick the parts of the card and write the labels',
  'left',
  { pad: 4 }
)
await r.click(dialog().locator('button.primary').last())
await r.clear(1000)
await previewBottom()
await r.focus(
  preview(),
  it
    ? 'Le etichette sono collegate ai livelli del template'
    : 'The labels are linked to the template layers',
  'left',
  { pad: 0 }
)

// lo schema del tavolo
await r.title(it ? 'Lo schema del tavolo' : 'The table setup')
await r.clear()
await toEnd()
await lines(S.setupTitle)
await r.click(tb('documents.setup'))
await r.clear(900)
const add = (key) => dialog().getByRole('button', { name: key, exact: true })
await r.click(add(it ? 'Zona' : 'Zone'))
await fill(dialog().locator('textarea').last(), S.zone, { tab: false })
await r.click(add(it ? 'Mazzo' : 'Deck'))
await r.clear(800)
await r.click(dialog().getByText(S.deck, { exact: true }).first(), { after: 500 })
await r.click(dialog().locator('button.primary').last())
await r.clear(800)
// il mazzo arriva sopra la zona: lo si mette accanto, in millimetri
await fill(dialog().locator('.setup-props input').nth(0), '100')
await fill(dialog().locator('.setup-props input').nth(1), '0')
await r.wait(600)
await r.focus(
  dialog().locator('.setup-canvas, svg').first(),
  it
    ? 'Zone, carte, mazzi, testi e frecce: si trascinano o si posizionano in millimetri'
    : 'Zones, cards, decks, texts and arrows: drag them or place them in millimeters',
  'right',
  { pad: 0 }
)
await r.click(dialog().locator('button.primary').last())
await r.clear(1000)
await previewBottom()
await r.focus(
  preview(),
  it ? 'Il tavolo pronto, con le carte vere' : 'The table ready, with the real cards',
  'left',
  { pad: 0 }
)

// la pagina e l'esportazione
await r.title(it ? 'Pagina ed esportazione' : 'Page and export')
await r.clear()
const page = win.getByRole('button', { name: T['documents.page'], exact: true })
await r.click(page)
await r.clear(800)
await r.focus(
  win.locator('.document-settings').first(),
  it
    ? 'Formato, margini, caratteri e colori della pagina'
    : 'Page size, margins, fonts and colors',
  'left',
  { pad: 0 }
)
await r.click(page)
const exportBtn = win.getByRole('button', { name: new RegExp(`^${T['documents.exportButton'] ?? (it ? 'Esporta documento' : 'Export document')}`) }).first()
await r.click(exportBtn)
await r.clear(800)
await r.focus(
  dialog(),
  it
    ? 'PDF da stampare, pagina web, Word da modificare o Markdown'
    : 'PDF for printing, web page, editable Word or Markdown',
  'none',
  { pad: 0, dim: false }
)
await r.click(dialog().locator('.document-export-kinds button').first())
await r.wait(3500)
await r.focus(
  dialog(),
  it ? 'Il PDF è nella cartella export del progetto' : 'The PDF is in the project’s export folder',
  'none',
  { pad: 0, dim: false }
)
await r.click(dialog().getByRole('button', { name: T['dialog.close'], exact: true }))
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
