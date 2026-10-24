// Il terminale dell'agente IA per i video che alternano app e terminale (come il video 6, agente.mjs): una
// pagina Chromium registrata insieme all'app, i comandi stella veri sul progetto aperto, l'elenco dei pezzi
// (EDL) per componi.sh e i lampi di sincronia.
// Uso: const k = await terminal(r, { lang, dir }); k.show('app' | 'term' | null); … ; await k.finish(nome)
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs'
import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { OUT } from './lib.mjs'
import { home } from '../guide/lib.mjs'

const REPO = new URL('../..', import.meta.url).pathname.replace(/\/$/, '')

export async function terminal(r, { lang, dir }) {
  const it = lang === 'it'
  const t = (a, b) => (it ? a : b)
  const FAST = !!process.env.FAST
  const H = home(lang)
  const tilde = (s) => s.split(H).join('~')
  const browser = await chromium.launch()
  const ctx = await browser.newContext({
    // la registrazione di Chromium non tiene conto di deviceScaleFactor: pagina a 1728×1080 con zoom 1,2
    viewport: { width: 1728, height: 1080 },
    recordVideo: { dir: `${OUT}/raw`, size: { width: 1728, height: 1080 } }
  })
  const page = await ctx.newPage()
  await page.setContent(terminalHtml(t, tilde(dir)))

  const edl = []
  let cur = null
  /** da qui in poi il video mostra src ('app' o 'term'); null taglia (attese) */
  function show(src) {
    const now = Date.now()
    if (cur && cur.src) edl.push({ src: cur.src, from: cur.at, to: now })
    cur = { src, at: now }
  }
  /** lampo magenta in entrambe le registrazioni, all'inizio e alla fine: componi.sh li ritrova */
  const marks = { app: [], term: [] }
  const FLASH = `(() => { const d = document.createElement('div'); d.id = 'v-sync'; d.style.cssText = 'position:fixed;inset:0;background:#f0f;z-index:2147483647'; document.body.appendChild(d) })()`
  async function sync() {
    await Promise.all([
      r.win.evaluate(FLASH).then(() => marks.app.push(Date.now())),
      page.evaluate(FLASH).then(() => marks.term.push(Date.now()))
    ])
    await new Promise((ok) => setTimeout(ok, 700))
    const off = `document.getElementById('v-sync').remove()`
    await Promise.all([r.win.evaluate(off), page.evaluate(off)])
    await new Promise((ok) => setTimeout(ok, 400))
  }
  const pause = (ms) => new Promise((ok) => setTimeout(ok, FAST ? Math.min(ms, 100) : ms))
  const term = {
    user: (text) => page.evaluate(([x, f]) => window.T.user(x, f), [text, FAST]),
    agent: (text) => page.evaluate(([x]) => window.T.agent(x), [text]),
    tool: (name, arg) => page.evaluate(([n, a]) => window.T.tool(n, a), [name, arg]),
    out: (lines, more) => page.evaluate(([l, m]) => window.T.out(l, m), [lines, more]),
    caption: (text) => page.evaluate(([x]) => window.T.caption(x), [text]),
    images: (srcs, label) => page.evaluate(([s, l]) => window.T.images(s, l), [srcs, label]),
    hideImages: () => page.evaluate(() => window.T.hideImages()),
    reset: () => page.evaluate(() => window.T.reset())
  }
  /** lettura di un testo: tempo in base alla lunghezza */
  const read = (text, min = 1800) => pause(Math.max(min, 900 + 45 * text.length))
  const clean = (s) =>
    s
      .split('\n')
      .filter((l) => l.trim() && !/^\[\d+:\d+\//.test(l) && !/^X connection|NODE_OPTION/.test(l))
      .map(tilde)
  /** comando stella vero; restituisce le righe dell'output */
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
  /** un comando nel terminale: riga del comando, attesa tagliata, output (al massimo n righe) */
  async function run(display, fn, { n = 4, after = 1400 } = {}) {
    await term.tool('Bash', display)
    await pause(500)
    const back = cur?.src
    show(null)
    const lines = await fn()
    const shown = lines.slice(0, n)
    await term.out(shown, lines.length - shown.length)
    show(back ?? 'term')
    await pause(after)
    return lines
  }
  /** l'agente scrive o modifica un file: riga Write/Edit con alcune righe */
  async function edit(file, content, { lines, verb } = {}) {
    if (content !== undefined) writeFileSync(file, content)
    await term.tool(verb ?? (it ? 'Modifica' : 'Edit'), tilde(file).replace(tilde(dir) + '/', ''))
    await term.out(lines ?? [], 0)
    await pause(1500)
  }
  const png = (f) => 'data:image/png;base64,' + readFileSync(f).toString('base64')

  /** chiude le registrazioni e scrive l'elenco dei pezzi; restituisce il percorso dell'EDL */
  async function finish(name) {
    show(null)
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
    const file = `${OUT}/${name}-${lang}.json`
    writeFileSync(file, JSON.stringify(out, null, 2))
    return file
  }
  return { page, show, sync, term, pause, read, stella, run, edit, png, tilde, finish }
}

function terminalHtml(t, where) {
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
  #imgs img { max-height: 560px; max-width: 1200px; border-radius: 8px; box-shadow: 0 6px 24px rgba(0,0,0,.5); background: #fff }
  #imgs p { font: 700 30px system-ui, sans-serif; color: #fff; margin: 0 }
  </style>
  <header><i style="background:#e0605a"></i><i style="background:#e5b84c"></i><i style="background:#79b75e"></i><span style="margin-left:10px">${t('Agente IA (qui Claude Code)', 'AI agent (here Claude Code)')} — ${where}</span></header>
  <div id="log"></div><div class="cap" id="cap"></div><div id="imgs"><p></p><div class="row"></div></div>
  <script>
  const log = document.getElementById('log')
  const add = (cls, html) => { const d = document.createElement('div'); d.className = cls; d.innerHTML = html; log.appendChild(d); while (log.scrollHeight > log.clientHeight && log.children.length > 1) log.removeChild(log.firstChild); return d }
  const esc = (s) => s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c])
  const sleep = (ms) => new Promise((ok) => setTimeout(ok, ms))
  window.T = {
    async user(text, fast) { const d = add('user', ''); for (const ch of text) { d.textContent += ch; if (!fast) await sleep(28) } },
    agent(text) { add('agent', esc(text)) },
    tool(name, arg) { const lines = arg.split('\\n'); const shown = lines.length > 3 ? [...lines.slice(0, 2), '… +' + (lines.length - 2) + ' ${t('righe', 'lines')}'] : lines; add('tool', '<b>' + esc(name) + '</b>(' + esc(shown.join('\\n')) + ')') },
    out(lines, more) { if (!lines.length && !more) lines = ['${t('fatto', 'done')}']; add('out', lines.map((l) => '<div>' + esc(l.length > 110 ? l.slice(0, 107) + '…' : l) + '</div>').join('') + (more ? '<div>… +' + more + ' ${t('righe', 'lines')}</div>' : '')) },
    caption(text) { const c = document.getElementById('cap'); c.style.opacity = 0; setTimeout(() => { c.textContent = text; c.style.opacity = 1 }, 250) },
    images(srcs, label) { const b = document.getElementById('imgs'); b.querySelector('p').textContent = label; b.querySelector('.row').innerHTML = srcs.map((s) => '<img src="' + s + '">').join(''); b.style.display = 'flex' },
    hideImages() { document.getElementById('imgs').style.display = 'none' },
    reset() { log.innerHTML = ''; document.getElementById('cap').style.opacity = 0 }
  }
  </script>`
}
