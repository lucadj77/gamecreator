// Costruisce il sito di presentazione in una cartella: index.html (italiano), en/index.html, stile, script,
// immagini (logo e screenshot presi dalla guida). Uso: node site/build.mjs <cartella di uscita>
import { cpSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { texts, videos } from './texts.mjs'

const here = new URL('.', import.meta.url).pathname
const repo = new URL('..', import.meta.url).pathname
const out = process.argv[2] || `${repo}pages`
const template = readFileSync(`${here}template.html`, 'utf8')
const esc = (s) =>
  String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
// bandierine nel tasto della lingua, disegnate qui per non dipendere dalle emoji del sistema
const FLAGS = {
  it: '<svg class="flag" viewBox="0 0 3 2" width="21" height="14" aria-hidden="true"><rect width="1" height="2" fill="#009246"/><rect x="1" width="1" height="2" fill="#fff"/><rect x="2" width="1" height="2" fill="#ce2b37"/></svg>',
  en: '<svg class="flag" viewBox="0 0 60 30" width="21" height="14" aria-hidden="true"><clipPath id="f"><rect width="60" height="30"/></clipPath><g clip-path="url(#f)"><rect width="60" height="30" fill="#012169"/><path d="M0 0l60 30M60 0L0 30" stroke="#fff" stroke-width="6"/><path d="M0 0l60 30M60 0L0 30" stroke="#c8102e" stroke-width="2"/><path d="M30 0v30M0 15h60" stroke="#fff" stroke-width="10"/><path d="M30 0v30M0 15h60" stroke="#c8102e" stroke-width="6"/></g></svg>'
}
const shots = ['progetto.png', 'editor.png', 'documento.png', 'griglia-caselle.png']

mkdirSync(`${out}/img/it`, { recursive: true })
mkdirSync(`${out}/img/en`, { recursive: true })
mkdirSync(`${out}/it`, { recursive: true })
for (const f of ['style.css', 'site.js']) cpSync(`${here}${f}`, `${out}/${f}`)
for (const f of ['stella.svg', 'predigarama.png']) cpSync(`${here}img/${f}`, `${out}/img/${f}`)
for (const [lang, dir] of [
  ['it', 'guida'],
  ['en', 'guide']
])
  for (const f of shots) cpSync(`${repo}docs/${dir}/img/${f}`, `${out}/img/${lang}/${f}`)

for (const lang of ['it', 'en']) {
  const t = texts[lang]
  const data = {
    ...t,
    flag: FLAGS[t.otherLang],
    toTop: lang === 'it' ? 'Torna a inizio pagina' : 'Back to top',
    guideDir: lang === 'it' ? 'guida' : 'guide',
    guideDirOther: lang === 'it' ? 'guide' : 'guida',
    'features.items': t.features.items
      .map(([h, p]) => `<div class="feature"><h3>${esc(h)}</h3><p>${esc(p)}</p></div>`)
      .join('\n'),
    'shots.items': t.shots.items
      .map(
        ([f, c]) =>
          `<figure><img src="${t.img}${f}" alt="${esc(c)}" loading="lazy"><figcaption>${esc(c)}</figcaption></figure>`
      )
      .join('\n'),
    videos:
      videos.length && videos.some((v) => v.url[lang])
        ? videos
            .filter((v) => v.url[lang])
            .map((v) => {
              const id = (v.url[lang].match(/(?:v=|youtu\.be\/)([\w-]+)/) || [])[1]
              const thumb = id
                ? `<img src="https://i.ytimg.com/vi/${id}/hqdefault.jpg" alt="">`
                : esc(v[lang])
              return `<a class="video" href="${esc(v.url[lang])}"><div class="thumb">${thumb}</div><div class="meta"><h3>${esc(v[lang])}</h3><span>${v.minutes} min</span></div></a>`
            })
            .join('\n')
        : `<p>${esc(t.tutorial.soon)}</p>`,
    downloadJson: JSON.stringify({
      ...t.download,
      download: t.hero.download,
      downloadGeneric: t.hero.downloadGeneric,
      version: t.hero.version
    })
  }
  const get = (key) => {
    if (key in data) return typeof data[key] === 'string' ? data[key] : ''
    const v = key.split('.').reduce((o, k) => (o == null ? undefined : o[k]), data)
    if (typeof v !== 'string') throw new Error(`chiave mancante nel template: ${key}`)
    return v
  }
  const raw = new Set(['features.items', 'shots.items', 'videos', 'downloadJson', 'flag'])
  const html = template.replace(/\{\{([\w.]+)\}\}/g, (_, key) =>
    raw.has(key) ? get(key) : esc(get(key))
  )
  writeFileSync(lang === 'en' ? `${out}/index.html` : `${out}/it/index.html`, html)
}
console.log(`sito in ${out}`)
