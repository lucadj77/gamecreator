// Note di una release: la sezione di CHANGELOG.md per la versione del tag. Controlla anche che
// package.json abbia la stessa versione. Uso: node scripts/release-notes.mjs v1.1.0 > notes.md
import { readFileSync } from 'fs'

const tag = process.argv[2] ?? ''
const version = tag.replace(/^v/, '')
const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'))
if (pkg.version !== version) {
  console.error(`The tag ${tag} does not match the version in package.json (${pkg.version})`)
  process.exit(1)
}
const lines = readFileSync(new URL('../CHANGELOG.md', import.meta.url), 'utf8')
  .replace(/\r\n/g, '\n')
  .split('\n')
const start = lines.findIndex((l) => l.replace(/^##\s+v?/, '') === version && l.startsWith('## '))
if (start < 0) {
  console.error(`CHANGELOG.md has no "## ${version}" section`)
  process.exit(1)
}
const end = lines.findIndex((l, i) => i > start && /^##\s/.test(l))
console.log(
  lines
    .slice(start + 1, end < 0 ? undefined : end)
    .join('\n')
    .trim()
)
