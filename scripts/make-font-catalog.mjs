// Rigenera resources/catalogs/google-fonts.json, l'elenco dei font Google usato per la ricerca.
// Uso: node scripts/make-font-catalog.mjs
// I dati vengono dal pacchetto npm google-font-metadata, scaricato in una cartella temporanea.
// Ogni famiglia: [nome, categoria, pesi, corsivo (0/1), alfabeti, licenza, copyright]
import { execFileSync } from 'child_process'
import { mkdtempSync, readFileSync, readdirSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'

const dir = mkdtempSync(join(tmpdir(), 'gfm-'))
execFileSync('npm', ['pack', 'google-font-metadata', '--silent'], { cwd: dir, stdio: 'inherit' })
const tgz = readdirSync(dir).find((f) => f.endsWith('.tgz'))
execFileSync('tar', ['xzf', tgz], { cwd: dir })
const [fonts, licenses] = ['google-fonts-v1.json', 'licenses.json'].map((f) =>
  JSON.parse(readFileSync(join(dir, 'package', 'data', f), 'utf8'))
)
const LICENSES = {
  'SIL Open Font License, 1.1': 'OFL-1.1',
  'Apache License, Version 2.0': 'Apache-2.0',
  'Ubuntu Font License, 1.0': 'UFL-1.0'
}

const families = Object.entries(fonts)
  .map(([id, f]) => {
    const lic = licenses[id]?.license?.type ?? ''
    return [
      f.family,
      f.category,
      f.weights,
      f.styles.includes('italic') ? 1 : 0,
      f.subsets,
      LICENSES[lic] ?? lic,
      licenses[id]?.authors?.copyright ?? ''
    ]
  })
  .sort((a, b) => a[0].localeCompare(b[0]))

writeFileSync(
  'resources/catalogs/google-fonts.json',
  JSON.stringify({ source: 'https://fonts.google.com', families })
)
console.log(`${families.length} famiglie`)
