// Video 6: Stella con un agente IA (circa 4 minuti, senza voce). Due registrazioni insieme: un
// terminale (pagina Chromium) dove l'agente lavora con la skill e il comando stella, e l'app. I
// comandi stella sono veri e lavorano sul progetto aperto nell'app (begin blocca l'app, end la
// sblocca e la fa ricaricare); i file che l'agente scrive vengono da progetto-ia.mjs. Il montaggio
// alterna le due registrazioni e taglia le attese: lo script scrive l'elenco dei pezzi (EDL) e
// componi.sh lo trasforma in un video.
// Uso: xvfb-run -a -s "-screen 0 2000x1300x24" node --experimental-strip-types --no-warnings scripts/video/agente.mjs it|en
// FAST=1 accorcia attese e scrittura, per provare il percorso senza badare al ritmo.
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs'
import { execFileSync } from 'node:child_process'
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { launch, mockOpen, OUT } from './lib.mjs'
import { docs, home } from '../guide/lib.mjs'
import { game, ICONS } from './progetto-ia.mjs'

const lang = process.argv[2] || 'it'
const it = lang === 'it'
const t = (a, b) => (it ? a : b)
const FAST = !!process.env.FAST
const REPO = new URL('../..', import.meta.url).pathname.replace(/\/$/, '')
const H = home(lang)
const g = game(lang)
const base = `${docs(lang)}/Stella`
const P = `${base}/${g.name}`
const tilde = (s) => s.split(H).join('~')
rmSync(P, { recursive: true, force: true })
mkdirSync(base, { recursive: true })
const tmp = `/tmp/stella-agente-${lang}`
rmSync(tmp, { recursive: true, force: true })
mkdirSync(tmp, { recursive: true })

// ---- le due registrazioni e l'elenco dei pezzi
const r = await launch({ lang, ...(process.env.UD ? { ud: process.env.UD } : {}) })
const { win, T, app } = r
if (FAST) {
  const wait = r.wait.bind(r)
  r.wait = (ms) => wait(Math.min(ms, 120))
}
const click0 = r.click.bind(r)
r.click = async (loc, opts) => {
  await r.clear(150)
  return click0(loc, opts)
}
const browser = await chromium.launch()
const ctx = await browser.newContext({
  // la registrazione di Chromium non tiene conto di deviceScaleFactor: pagina a 1728×1080 con zoom 1,2
  viewport: { width: 1728, height: 1080 },
  recordVideo: { dir: `${OUT}/raw`, size: { width: 1728, height: 1080 } }
})
const page = await ctx.newPage()
await page.setContent(terminalHtml())

const edl = []
let cur = null
/** da qui in poi il video mostra src ('app' o 'term'); null taglia (attese) */
function show(src) {
  const now = Date.now()
  if (cur && cur.src) edl.push({ src: cur.src, from: cur.at, to: now })
  cur = { src, at: now }
}
/** segnale di sincronia: un lampo magenta a tutto schermo in entrambe le registrazioni. componi.sh
 * lo ritrova nei due video, all'inizio e alla fine, e da lì calcola dove cade ogni pezzo */
const marks = { app: [], term: [] }
const FLASH = `(() => { const d = document.createElement('div'); d.id = 'v-sync'; d.style.cssText = 'position:fixed;inset:0;background:#f0f;z-index:2147483647'; document.body.appendChild(d) })()`
async function sync() {
  await Promise.all([
    win.evaluate(FLASH).then(() => marks.app.push(Date.now())),
    page.evaluate(FLASH).then(() => marks.term.push(Date.now()))
  ])
  await new Promise((ok) => setTimeout(ok, 700))
  const off = `document.getElementById('v-sync').remove()`
  await Promise.all([win.evaluate(off), page.evaluate(off)])
  await new Promise((ok) => setTimeout(ok, 400))
}
const pause = (ms) => new Promise((ok) => setTimeout(ok, FAST ? Math.min(ms, 100) : ms))

// ---- il terminale
const term = {
  user: (text) => page.evaluate(([x, f]) => window.T.user(x, f), [text, FAST]),
  agent: (text) => page.evaluate(([x]) => window.T.agent(x), [text]),
  tool: (name, arg) => page.evaluate(([n, a]) => window.T.tool(n, a), [name, arg]),
  out: (lines, more) => page.evaluate(([l, m]) => window.T.out(l, m), [lines, more]),
  caption: (text) => page.evaluate(([x]) => window.T.caption(x), [text]),
  images: (srcs, label) => page.evaluate(([s, l]) => window.T.images(s, l), [srcs, label]),
  hideImages: () => page.evaluate(() => window.T.hideImages()),
  paste: (label) => page.evaluate(([x]) => window.T.paste(x), [label])
}
/** lettura di un testo: tempo in base alla lunghezza */
const read = (text, min = 1800) => pause(Math.max(min, 900 + 45 * text.length))

/** comando stella vero, mostrato come `stella …`; restituisce le righe dell'output */
function stella(...args) {
  try {
    return clean(
      execFileSync('node', [`${REPO}/bin/stella.mjs`, ...args], {
        encoding: 'utf8',
        env: { ...process.env, HOME: H },
        stdio: ['ignore', 'pipe', 'pipe']
      })
    )
  } catch (e) {
    return clean((e.stdout || '') + (e.stderr || ''))
  }
}
const clean = (s) =>
  s
    .split('\n')
    .filter((l) => l.trim() && !/^\[\d+:\d+\//.test(l) && !/^X connection|NODE_OPTION/.test(l))
    .map(tilde)

/** un comando nel terminale: riga del comando, attesa tagliata, output (al massimo n righe) */
async function run(display, fn, { n = 4, after = 1400 } = {}) {
  await term.tool('Bash', display)
  await pause(500)
  show(null)
  const lines = await fn()
  const shown = lines.slice(0, n)
  await term.out(shown, lines.length - shown.length)
  show('term')
  await pause(after)
  return lines
}
/** l'agente scrive un file: riga Write con le prime righe del contenuto */
async function write(file, content, { n = 3, label } = {}) {
  writeFileSync(file, content)
  await term.tool(it ? 'Scrive' : 'Write', tilde(file).replace(tilde(P) + '/', ''))
  const lines = label ? [label] : content.split('\n').slice(0, n)
  const total = content.split('\n').length
  await term.out(lines, label ? 0 : Math.max(0, total - lines.length))
  await pause(1300)
}
const proj = tilde(P)
const SKILL_LINES = readFileSync(`${REPO}/skill/stella/SKILL.md`, 'utf8').split('\n').length

await sync()

// ---- 1. Stella: gli strumenti IA
show('app')
await r.overlay()
await r.title(t('Stella con un agente IA', 'Stella with an AI agent'))
await r.title(
  t(
    'Chiedi a parole: l’agente lavora sui file del progetto, tu vedi il risultato in Stella',
    'Ask in plain words: the agent works on the project files, you see the result in Stella'
  )
)
await r.clear()
// l'avviso per chi lancia Stella dal codice senza averla compilata non riguarda l'app installata
await win.addStyleTag({ content: '.ai-tools .banner.warning { display: none !important }' })
await r.click(win.locator('button.settings-button').first())
await r.click(win.getByRole('button', { name: T['app.aiTools'], exact: true }))
await r.wait(800)
const aiDialog = win.locator('[role="dialog"]').last()
await r.focus(
  aiDialog,
  t(
    'Strumenti IA: la skill di Stella, con il comando di questo computer, da dare al tuo agente (Claude Code, Codex…)',
    'AI tools: the Stella skill, with this computer’s command, to give to your agent (Claude Code, Codex…)'
  ),
  'left',
  { pad: 4 }
)
const copyBtn = aiDialog.getByRole('button', { name: T['ai.copy'], exact: true })
await r.click(copyBtn)
await r.focus(
  copyBtn,
  t(
    'Per installarla: copiala e incollala nel tuo agente, chiedendogli di installarla',
    'To install it: copy it and paste it into your agent, asking it to install it'
  ),
  'below'
)
await r.focus(
  aiDialog.getByRole('button', { name: T['ai.save'], exact: true }),
  t(
    'Oppure salvala come file: Claude Code legge le skill da ~/.claude/skills',
    'Or save it as a file: Claude Code reads skills from ~/.claude/skills'
  ),
  'below'
)
await r.click(aiDialog.getByRole('button', { name: T['dialog.close'], exact: true }).last())
await r.wait(600)

// ---- 1b. il terminale: l'agente installa la skill
show('term')
await pause(600)
await term.caption(t('Una volta sola: installa la skill', 'Once only: install the skill'))
await term.user(t('Installa questa skill di Stella: ', 'Install this Stella skill: '))
await term.paste(
  t(`[testo incollato, ${SKILL_LINES} righe]`, `[pasted text, ${SKILL_LINES} lines]`)
)
await pause(1400)
const inst = t(
  'Installo la skill nella mia cartella delle skill, così la trovo in ogni progetto.',
  'I’m installing the skill in my skills folder, so I can find it in every project.'
)
await term.agent(inst)
await read(inst, 1600)
await term.tool(it ? 'Scrive' : 'Write', '~/.claude/skills/stella/SKILL.md')
await term.out([t(`${SKILL_LINES} righe scritte`, `${SKILL_LINES} lines written`)], 0)
await pause(1200)
const done0 = t(
  'Fatto. Quando mi chiedi qualcosa su Stella la uso da sola.',
  'Done. When you ask me something about Stella I’ll use it automatically.'
)
await term.agent(done0)
await read(done0, 1600)
await term.caption(
  t(
    'Quando aggiorni Stella, la skill si aggiorna da sola la prima volta che l’agente la usa',
    'When you update Stella, the skill updates itself the first time the agent uses it'
  )
)
await pause(FAST ? 100 : 4200)
show(null)
await page.evaluate(() => window.T.reset())
await pause(300)

// ---- 2. il terminale: l'agente crea il gioco
show('term')
await pause(800)
const ask1 = t(
  'Crea un gioco di carte in ~/Documenti/Stella: 24 creature di quattro elementi (fuoco, acqua, terra, aria), forza da 1 a 6 e un breve effetto. Uno sfondo colorato per elemento e un segnalino rotondo per le ferite.',
  'Create a card game in ~/Documents/Stella: 24 creatures of four elements (fire, water, earth, air), strength 1 to 6 and a short effect. A colored background for each element and a round token for wounds.'
)
await term.caption(t('Chiedi a parole quello che ti serve', 'Ask for what you need in plain words'))
await term.user(ask1)
await pause(1200)
await term.agent(
  t(
    'Uso la skill di Stella. Prima controllo il comando.',
    'I’m using the Stella skill. First I check the command.'
  )
)
await pause(900)
await term.caption(
  t(
    'L’agente usa il comando stella e scrive i file del progetto',
    'The agent uses the stella command and writes the project files'
  )
)
await run('stella version', () => stella('version'))
await run(`stella new ${g.name} ${tilde(base)}`, () => stella('new', g.name, base))
await run(`stella begin ${proj} --note "${t('Creazione del gioco', 'Creating the game')}"`, () =>
  stella('begin', P, '--note', t('Creazione del gioco', 'Creating the game'))
)
await term.agent(
  t(
    'Prendo sei icone da game-icons.net (licenza CC BY 3.0): i quattro elementi, il pugno della forza e il sangue delle ferite. Tolgo il fondo nero, così si possono colorare.',
    'I’m taking six icons from game-icons.net (CC BY 3.0 license): the four elements, a fist for strength and blood for wounds. I remove the black background so they can be tinted.'
  )
)
await pause(2600)
const icons = `${P}/assets/icons`
const script = [
  `mkdir -p ${tilde(icons)} && cd ${tilde(icons)}`,
  ...ICONS.map(
    ([id], i) =>
      `curl -s https://raw.githubusercontent.com/game-icons/icons/master/${id}.svg -o ${g.iconNames[i]}.svg`
  ),
  `sed -i 's|<path d="M0 0h512v512H0z"/>||; s| fill="#fff"||' *.svg && ls`
]
await run(
  script.join('\n'),
  () =>
    clean(
      execFileSync('bash', ['-c', script.join('\n')], {
        encoding: 'utf8',
        env: { ...process.env, HOME: H }
      }).replace(/\n/g, '  ')
    ),
  { n: 2 }
)
const today = new Date().toISOString().slice(0, 10)
const sources = Object.fromEntries(
  ICONS.map(([id, author], i) => [
    `icons/${g.iconNames[i]}.svg`,
    {
      kind: 'icon',
      source: 'game-icons.net',
      id,
      title: id.split('/')[1],
      author,
      license: 'CC-BY-3.0',
      url: `https://game-icons.net/1x1/${id}.html`,
      imported: today
    }
  ])
)
await write(`${P}/assets/sources.json`, JSON.stringify(sources, null, 2) + '\n', { n: 4 })
const pj = JSON.parse(readFileSync(`${P}/stella.json`, 'utf8'))
pj.sets = [
  { name: g.cards, template: g.creature },
  { name: g.wounds, template: g.wound }
]
pj.variables = g.variables
await write(`${P}/stella.json`, JSON.stringify(pj, null, 2) + '\n', { n: 6 })
await write(`${P}/templates/${g.creature}.json`, JSON.stringify(g.template, null, 2) + '\n', {
  n: 4
})
await write(`${P}/templates/${g.wound}.json`, JSON.stringify(g.token, null, 2) + '\n', { n: 4 })
await write(`${tmp}/${g.cards}.json`, JSON.stringify(g.rows, null, 2) + '\n', {
  label: t(
    `24 righe: ${g.rows
      .slice(0, 3)
      .map((x) => x[g.F])
      .join(', ')}…`,
    `24 rows: ${g.rows
      .slice(0, 3)
      .map((x) => x[g.F])
      .join(', ')}…`
  )
})
await run(`stella set-rows ${proj} ${g.cards} ${tmp}/${g.cards}.json`, () =>
  stella('set-rows', P, g.cards, `${tmp}/${g.cards}.json`)
)
writeFileSync(`${tmp}/${g.wounds}.json`, JSON.stringify(g.tokenRows) + '\n')
await run(`stella set-rows ${proj} ${g.wounds} ${tmp}/${g.wounds}.json`, () =>
  stella('set-rows', P, g.wounds, `${tmp}/${g.wounds}.json`)
)
await term.caption(
  t(
    'Poi controlla il lavoro: problemi e immagini delle carte',
    'Then it checks its work: problems and card images'
  )
)
await run(`stella check ${proj}`, () => stella('check', P))
await run(`stella render ${proj} --side both`, () =>
  stella('render', P, '--side', 'both', '--dpi', '120')
)
const rd = `${P}/export/stella-render`
const png = (f) => 'data:image/png;base64,' + readFileSync(f).toString('base64')
await term.images(
  [
    `${rd}/${g.cards}/02_front.png`,
    `${rd}/${g.cards}/07_front.png`,
    `${rd}/${g.cards}/13_front.png`,
    `${rd}/${g.cards}/20_front.png`,
    `${rd}/${g.cards}/01_back.png`
  ].map(png),
  t('Le immagini che l’agente guarda', 'The images the agent looks at')
)
await pause(4200)
await term.hideImages()
await run(`stella end ${proj}`, () => stella('end', P))
const done1 = t(
  `Fatto. Il progetto «${g.name}» ha 24 creature con il colore del loro elemento e il dorso, e 20 segnalini ferita. Le icone sono di game-icons.net (CC BY 3.0): i crediti sono in assets/sources.json. Puoi aprirlo in Stella.`,
  `Done. The “${g.name}” project has 24 creatures in the color of their element, with a back, and 20 wound tokens. The icons are from game-icons.net (CC BY 3.0): the credits are in assets/sources.json. You can open it in Stella.`
)
await term.agent(done1)
await read(done1)

// ---- 3. Stella: il progetto
show('app')
await mockOpen(app, P)
await r.click(win.getByText(T['start.openProject']))
show(null)
await r.clear(2500)
await r.overlay()
show('app')
await r.focus(
  win.locator('.card-grid').first(),
  t('Le 24 creature, con i colori per elemento', 'The 24 creatures, colored by element'),
  'left',
  { pad: 6 }
)
await r.click(win.locator('.sidebar').getByText(g.wounds, { exact: true }).first())
await r.wait(900)
await r.overlay()
await r.focus(
  win.locator('.card-grid').first(),
  t('Il segnalino delle ferite', 'The wound token'),
  'right',
  { pad: 6 }
)
await r.click(win.locator('.sidebar').getByText(g.cards, { exact: true }).first())
await r.wait(900)
await r.overlay()

// ---- 4. il terminale: bilanciamento
show('term')
await page.evaluate(() => window.T.reset())
await pause(600)
const ask2 = t(
  'Quante creature ci sono per elemento e che forza media hanno?',
  'How many creatures are there per element, and what is their average strength?'
)
await term.caption(t('Le domande sul gioco', 'Questions about the game'))
await term.user(ask2)
await pause(900)
await run(
  `stella stats ${proj} ${g.cards} --column ${g.EL}`,
  () => stella('stats', P, g.cards, '--column', g.EL),
  { n: 6 }
)
const avg = `stella rows ${proj} ${g.cards} --json | node -e "const r=JSON.parse(require('fs').readFileSync(0));const m={};for(const c of r)(m[c.${g.EL}]??=[]).push(+c.${g.S});for(const[k,v]of Object.entries(m))console.log(k, (v.reduce((a,b)=>a+b)/v.length).toFixed(1))"`
await run(
  avg,
  () => {
    const rows = JSON.parse(
      execFileSync('node', [`${REPO}/bin/stella.mjs`, 'rows', P, g.cards, '--json'], {
        encoding: 'utf8',
        env: { ...process.env, HOME: H },
        stdio: ['ignore', 'pipe', 'ignore']
      })
    )
    const m = {}
    for (const c of rows) (m[c[g.EL]] ??= []).push(+c[g.S])
    return Object.entries(m).map(
      ([k, v]) => `${k} ${(v.reduce((a, b) => a + b) / v.length).toFixed(1)}`
    )
  },
  { n: 4 }
)
const ans2 = t(
  'Sei creature per elemento. La forza media è 3,5 per fuoco, terra e aria, 4,5 per l’acqua: l’acqua è più forte degli altri elementi.',
  'Six creatures per element. The average strength is 3.5 for fire, earth and air, 4.5 for water: water is stronger than the other elements.'
)
await term.agent(ans2)
await read(ans2)
const ask3 = t(
  'Abbassa di 1 la forza delle creature d’acqua sopra il 3.',
  'Lower by 1 the strength of the water creatures above 3.'
)
await term.user(ask3)
await pause(900)
await run(
  `stella begin ${proj} --note "${t('Forza delle creature d’acqua', 'Strength of the water creatures')}"`,
  () =>
    stella(
      'begin',
      P,
      '--note',
      t('Forza delle creature d’acqua', 'Strength of the water creatures')
    )
)
// Stella si blocca
show(null)
await r.wait(1600)
await r.overlay()
show('app')
await r.focus(
  win.locator('.agent-lock .dialog').first(),
  t(
    'Intanto Stella resta bloccata: così l’agente e l’app non cancellano l’uno le modifiche dell’altro',
    'Meanwhile Stella stays locked, so the agent and the app never overwrite each other’s changes'
  ),
  'right',
  { pad: 6, dim: false }
)
await r.clear(300)
show('term')
const rows2 = g.rows.map((x) =>
  x[g.EL] === g.E.water && x[g.S] > 3 ? { ...x, [g.S]: x[g.S] - 1 } : x
)
await run(
  `stella rows ${proj} ${g.cards} --json > ${tmp}/${g.cards}.json`,
  () => {
    writeFileSync(
      `${tmp}/${g.cards}.json`,
      execFileSync('node', [`${REPO}/bin/stella.mjs`, 'rows', P, g.cards, '--json'], {
        encoding: 'utf8',
        env: { ...process.env, HOME: H },
        stdio: ['ignore', 'pipe', 'ignore']
      })
    )
    return []
  },
  { after: 600 }
)
const changed = g.rows
  .filter((x) => x[g.EL] === g.E.water && x[g.S] > 3)
  .map((x) => `${x[g.F]} ${x[g.S]} → ${x[g.S] - 1}`)
await write(`${tmp}/${g.cards}.json`, JSON.stringify(rows2, null, 2) + '\n', {
  label: changed.join(', ')
})
await run(`stella set-rows ${proj} ${g.cards} ${tmp}/${g.cards}.json`, () =>
  stella('set-rows', P, g.cards, `${tmp}/${g.cards}.json`)
)
await run(`stella check ${proj} --set ${g.cards}`, () => stella('check', P, '--set', g.cards))
await run(`stella end ${proj}`, () => stella('end', P))
const ans3 = t(
  'Fatto: cinque creature d’acqua hanno 1 di forza in meno, la Nebbia resta a 3. Ora la media dell’acqua è 3,7.',
  'Done: five water creatures have 1 less strength, the Mist stays at 3. Water now averages 3.7.'
)
await term.agent(ans3)
await read(ans3)

// ---- 5. Stella si sblocca e ricarica
show('app')
await r.wait(400)
await r.overlay()
await r.focus(
  win.locator('.card-grid').first(),
  t(
    'Alla fine Stella si sblocca e ricarica da sola: le creature d’acqua hanno la forza nuova',
    'When it’s done, Stella unlocks and reloads by itself: the water creatures have their new strength'
  ),
  'left',
  { pad: 6 }
)
await r.clear(300)

// ---- 6. il terminale: il regolamento
show('term')
await page.evaluate(() => window.T.reset())
await pause(600)
const ask4 = t(
  'Scrivi una bozza del regolamento, con l’anatomia di una carta e lo schema del tavolo.',
  'Write a draft of the rules, with a card anatomy and a table setup diagram.'
)
await term.caption(t('Anche i documenti del gioco', 'The game documents too'))
await term.user(ask4)
await pause(900)
await run(`stella begin ${proj} --note "${t('Bozza del regolamento', 'Draft of the rules')}"`, () =>
  stella('begin', P, '--note', t('Bozza del regolamento', 'Draft of the rules'))
)
await write(`${P}/docs/${g.docName}.md`, g.doc, { n: 4 })
await run(
  `stella docs ${proj} ${g.docName}`,
  () => {
    const out = stella('docs', P, g.docName)
    return [out[0], ...out.filter((l) => /problem|errore|not found|non trov/i.test(l))]
  },
  { n: 3 }
)
await run(`stella end ${proj}`, () => stella('end', P))
const ans4 = t(
  `Ho scritto docs/${g.docName}.md: il materiale, la carta con le sue parti, la preparazione con lo schema del tavolo e il turno. Le carte nel documento sono quelle vere del progetto.`,
  `I wrote docs/${g.docName}.md: components, the card and its parts, setup with the table diagram, and the turn. The cards in the document are the real ones from the project.`
)
await term.agent(ans4)
await read(ans4)

// ---- 7. Stella: il documento
show('app')
await r.wait(300)
await r.click(win.locator('.sidebar').getByText(g.docName, { exact: true }).first())
show(null)
await r.wait(1500)
await r.overlay()
show('app')
const preview = win.locator('.document-preview').first()
await r.focus(
  preview,
  t(
    'La bozza nei Documenti di Stella, con le carte vere',
    'The draft in Stella’s Documents, with the real cards'
  ),
  'left',
  { pad: 4 }
)
await r.clear(200)
await preview.evaluate((el) => el.scrollTo({ top: el.scrollHeight * 0.45, behavior: 'smooth' }))
await r.wait(1200)
await r.focus(
  preview,
  t('L’anatomia della carta e lo schema del tavolo', 'The card anatomy and the table setup'),
  'left',
  { pad: 4 }
)
await r.clear(300)

// ---- 8. il terminale: le esportazioni
show('term')
await page.evaluate(() => window.T.reset())
await pause(600)
const ask5 = t(
  'Prepara il PDF da stampare fronte e retro e gli oggetti per Tabletop Simulator: le creature come mazzo, le ferite come segnalini.',
  'Prepare the PDF to print double-sided and the objects for Tabletop Simulator: the creatures as a deck, the wounds as tokens.'
)
await term.caption(t('Stampa e tavolo virtuale', 'Print and virtual table'))
await term.user(ask5)
await pause(900)
await run(`stella begin ${proj} --note "${t('Profili di esportazione', 'Export profiles')}"`, () =>
  stella('begin', P, '--note', t('Profili di esportazione', 'Export profiles'))
)
const pj2 = JSON.parse(readFileSync(`${P}/stella.json`, 'utf8'))
pj2.export = { ...(pj2.export || {}), named: g.profiles }
writeFileSync(`${P}/stella.json`, JSON.stringify(pj2, null, 2) + '\n')
await term.tool(it ? 'Modifica' : 'Edit', 'stella.json')
await term.out(
  g.profiles.map((p) => `+ ${JSON.stringify(p)}`),
  0
)
await pause(2200)
await run(`stella end ${proj}`, () => stella('end', P), { after: 700 })
await run(`stella export ${proj} --profile ${g.profiles[0].name}`, () =>
  stella('export', P, '--profile', g.profiles[0].name)
)
await run(`stella export ${proj} --profile ${g.profiles[1].name}`, () =>
  stella('export', P, '--profile', g.profiles[1].name)
)
execFileSync('pdftoppm', [
  '-r',
  '40',
  '-png',
  '-f',
  '1',
  '-l',
  '2',
  `${P}/export/${g.name}.pdf`,
  `${tmp}/pdf`
])
const ttsImg = execFileSync('bash', ['-c', `ls ${P}/export/tts/*.png | head -2`], {
  encoding: 'utf8'
})
  .trim()
  .split('\n')
await term.images(
  [`${tmp}/pdf-1.png`, `${tmp}/pdf-2.png`, ...ttsImg].map(png),
  t('Il PDF e i fogli per Tabletop Simulator', 'The PDF and the Tabletop Simulator sheets')
)
await pause(4200)
await term.hideImages()
const ans5 = t(
  `Pronti: export/${g.name}.pdf con fronti e dorsi per la stampa fronte-retro, e in export/tts il mazzo delle creature e i segnalini ferita per Tabletop Simulator. I due profili restano nel progetto: puoi rilanciarli anche da Stella.`,
  `Ready: export/${g.name}.pdf with fronts and backs for double-sided printing, and in export/tts the creature deck and the wound tokens for Tabletop Simulator. Both profiles stay in the project: you can run them again from Stella too.`
)
await term.agent(ans5)
await read(ans5)

// ---- 9. chiusura
show('app')
await r.wait(300)
await r.title(
  t(
    'L’agente propone, tu decidi: tutto resta nei file del progetto, con i backup',
    'The agent proposes, you decide: everything stays in the project files, with backups'
  ),
  6500
)
show(null)
await r.clear(500)
await sync()

// ---- fine: chiude le registrazioni e scrive l'elenco dei pezzi
const termVideo = page.video()
await ctx.close()
const termEnd = Date.now()
await browser.close()
const appEnd = Date.now()
const appVideo = await r.finish()
const out = {
  term: { file: await termVideo.path(), end: termEnd, marks: marks.term },
  app: { file: appVideo, end: appEnd, marks: marks.app },
  edl
}
const edlFile = `${OUT}/agente-${lang}.json`
writeFileSync(edlFile, JSON.stringify(out, null, 2))
console.log('EDL', edlFile)

function terminalHtml() {
  return `<!doctype html><meta charset="utf-8"><style>
  :root { --bg: #1d1a16; --fg: #ece5d8; --dim: #a39a8b; --accent: #e4572e; --ok: #8fbf6a; --you: #f2c14e }
  * { box-sizing: border-box }
  html { zoom: 1.2; background: var(--bg) }
  body { margin: 0; background: var(--bg); color: var(--fg); font: 21px/1.45 'JetBrains Mono', 'DejaVu Sans Mono', monospace; height: calc(100vh / 1.2); overflow: hidden; position: relative }
  header { height: 44px; background: #2a251f; color: var(--dim); font: 600 17px system-ui, sans-serif; display: flex; align-items: center; gap: 10px; padding: 0 18px }
  header i { width: 13px; height: 13px; border-radius: 50%; display: inline-block }
  #log { position: absolute; top: 150px; bottom: 0; left: 0; right: 0; padding: 22px 34px; overflow: hidden; display: flex; flex-direction: column; justify-content: flex-end }
  .user { color: var(--you); margin: 18px 0 10px; white-space: pre-wrap }
  .user::before { content: '> '; color: var(--accent); font-weight: 700 }
  .pasted { color: var(--dim); background: #2f2a23; border-radius: 6px; padding: 1px 8px }
  .agent { margin: 10px 0; white-space: pre-wrap }
  .agent::before { content: '● '; color: var(--fg) }
  .tool { margin: 8px 0 0; white-space: pre-wrap }
  .tool::before { content: '● '; color: var(--ok) }
  .tool b { color: var(--ok) }
  .out { color: var(--dim); margin: 0 0 6px 26px; white-space: pre-wrap; font-size: 19px }
  .out div:first-child::before { content: '⎿  ' }
  .out div:not(:first-child) { padding-left: 34px }
  .cap { position: absolute; top: 70px; right: 34px; background: var(--accent); color: #fff; font: 700 30px/1.25 system-ui, sans-serif; padding: 14px 22px; border-radius: 12px; max-width: 520px; box-shadow: 0 6px 20px rgba(0,0,0,.35); opacity: 0; transition: opacity .3s; z-index: 5 }
  #imgs { position: absolute; inset: 44px 0 0 0; background: rgba(20,17,14,.92); display: none; flex-direction: column; align-items: center; justify-content: center; gap: 22px; z-index: 4 }
  #imgs .row { display: flex; gap: 22px; align-items: center }
  #imgs img { max-height: 520px; max-width: 300px; border-radius: 8px; box-shadow: 0 6px 24px rgba(0,0,0,.5); background: #fff }
  #imgs p { font: 700 30px system-ui, sans-serif; color: #fff; margin: 0 }
  </style>
  <header><i style="background:#e0605a"></i><i style="background:#e5b84c"></i><i style="background:#79b75e"></i><span style="margin-left:10px">${t('Agente IA (qui Claude Code)', 'AI agent (here Claude Code)')} — ${tilde(base)}</span></header>
  <div id="log"></div><div class="cap" id="cap"></div><div id="imgs"><p></p><div class="row"></div></div>
  <script>
  const log = document.getElementById('log')
  const add = (cls, html) => { const d = document.createElement('div'); d.className = cls; d.innerHTML = html; log.appendChild(d); while (log.scrollHeight > log.clientHeight && log.children.length > 1) log.removeChild(log.firstChild); return d }
  const esc = (s) => s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c])
  const sleep = (ms) => new Promise((ok) => setTimeout(ok, ms))
  window.T = {
    async user(text, fast) { const d = add('user', ''); for (const ch of text) { d.textContent += ch; if (!fast) await sleep(28) } },
    paste(label) { const s = document.createElement('span'); s.className = 'pasted'; s.textContent = label; log.lastElementChild.appendChild(s) },
    agent(text) { add('agent', esc(text)) },
    tool(name, arg) { const lines = arg.split('\\n'); const shown = lines.length > 3 ? [...lines.slice(0, 2), '… +' + (lines.length - 2) + ' ${t('righe', 'lines')}'] : lines; add('tool', '<b>' + esc(name) + '</b>(' + esc(shown.join('\\n')) + ')') },
    out(lines, more) { if (!lines.length && !more) lines = ['${t('fatto', 'done')}']; const d = add('out', lines.map((l) => '<div>' + esc(l.length > 110 ? l.slice(0, 107) + '…' : l) + '</div>').join('') + (more ? '<div>… +' + more + ' ${t('righe', 'lines')}</div>' : '')) },
    caption(text) { const c = document.getElementById('cap'); c.style.opacity = 0; setTimeout(() => { c.textContent = text; c.style.opacity = 1 }, 250) },
    images(srcs, label) { const b = document.getElementById('imgs'); b.querySelector('p').textContent = label; b.querySelector('.row').innerHTML = srcs.map((s) => '<img src="' + s + '">').join(''); b.style.display = 'flex' },
    hideImages() { document.getElementById('imgs').style.display = 'none' },
    reset() { log.innerHTML = ''; document.getElementById('cap').style.opacity = 0 }
  }
  </script>`
}
