// Rigenera resources/catalogs/game-icons.json dal repository ufficiale di game-icons.net.
// Uso: node scripts/make-icon-catalog.mjs [cartella del repository]
// Senza cartella clona github.com/game-icons/icons in una cartella temporanea.
// Ogni icona: id "autore/nome" e tracciato SVG (viewBox 0 0 512 512) senza lo sfondo nero.
// I tag (resources/catalogs/game-icons-tags.json) si aggiornano a parte: fetch-icon-tags.mjs
import { execFileSync } from 'child_process'
import { mkdtempSync, readFileSync, readdirSync, statSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'

let repo = process.argv[2]
if (!repo) {
  repo = join(mkdtempSync(join(tmpdir(), 'game-icons-')), 'icons')
  execFileSync('git', ['clone', '--depth', '1', 'https://github.com/game-icons/icons', repo], {
    stdio: 'inherit'
  })
}

// license.txt: "- Nome, sito - CC0", un autore per riga; la cartella è il nome senza spazi
const authors = {}
for (const line of readFileSync(join(repo, 'license.txt'), 'utf8').split('\n')) {
  const m = line.match(/^- ([^,]+?)(?:, (\S+))?(?: - (CC0))?\s*$/)
  if (!m) continue
  const [, name, url, cc0] = m
  authors[name.toLowerCase().replace(/[^a-z0-9]/g, '')] = {
    name,
    ...(url ? { url } : {}),
    license: cc0 ? 'CC0-1.0' : 'CC-BY-3.0'
  }
}

const icons = []
const folders = {}
for (const dir of readdirSync(repo).sort()) {
  // badges sono elementi d'interfaccia del sito, non icone
  if (dir.startsWith('.') || dir === 'badges' || !statSync(join(repo, dir)).isDirectory()) continue
  const key = dir.replace(/[^a-z0-9]/g, '')
  const known =
    authors[key] ??
    Object.entries(authors).find(([k]) => k.startsWith(key) || key.startsWith(k))?.[1]
  folders[dir] = known ?? {
    name: dir.replace(/(^|-)(\w)/g, (_, s, c) => (s ? ' ' : '') + c.toUpperCase()),
    license: 'CC-BY-3.0'
  }
  for (const file of readdirSync(join(repo, dir)).sort()) {
    if (!file.endsWith('.svg')) continue
    const svg = readFileSync(join(repo, dir, file), 'utf8')
    const paths = [...svg.matchAll(/<path\b[^>]*\bd="([^"]+)"/g)]
      .map((m) => m[1])
      .filter((d) => d !== 'M0 0h512v512H0z')
    if (paths.length) icons.push([`${dir}/${file.slice(0, -4)}`, paths.join(' ')])
  }
}

const out = { source: 'https://game-icons.net', authors: folders, icons }
writeFileSync('resources/catalogs/game-icons.json', JSON.stringify(out))
console.log(`${icons.length} icone di ${Object.keys(folders).length} autori`)
