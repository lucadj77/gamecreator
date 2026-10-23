/* eslint-disable @typescript-eslint/explicit-function-return-type -- script JavaScript, senza tipi */
// Quali versioni pubblicare sul sito: la stabile all'indirizzo principale, la beta in beta/. Legge
// i tag v* del repository (serve un checkout con i tag) e stampa per GITHUB_ENV
//   STABLE=v1.2.0   l'ultima ufficiale che ha la versione web, altrimenti la beta
//   BETA=v1.3.0-beta.2   la più recente in assoluto, ufficiale o beta
// Uso: node scripts/web-versions.mjs >> "$GITHUB_ENV"
import { execFileSync } from 'child_process'

const git = (...args) =>
  execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })

function parse(tag) {
  const [main, ...rest] = tag.replace(/^v/, '').split('-')
  return { nums: main.split('.').map((n) => parseInt(n, 10) || 0), pre: rest.join('-') }
}

/** Come compareVersions in src/shared/update.ts: una beta viene prima della sua ufficiale */
function compare(a, b) {
  const pa = parse(a)
  const pb = parse(b)
  for (let i = 0; i < 3; i++)
    if ((pa.nums[i] ?? 0) !== (pb.nums[i] ?? 0)) return pa.nums[i] - pb.nums[i]
  if (!pa.pre || !pb.pre) return (pb.pre ? 1 : 0) - (pa.pre ? 1 : 0)
  const xa = pa.pre.split('.')
  const xb = pb.pre.split('.')
  for (let i = 0; i < Math.max(xa.length, xb.length); i++) {
    if (xa[i] === undefined || xb[i] === undefined) return xa[i] === undefined ? -1 : 1
    const na = Number(xa[i])
    const nb = Number(xb[i])
    if (!isNaN(na) && !isNaN(nb) && na !== nb) return na - nb
    if (isNaN(na) || isNaN(nb)) if (xa[i] !== xb[i]) return xa[i] < xb[i] ? -1 : 1
  }
  return 0
}

/** La versione web c'è dalle beta della 1.2: un tag senza vite.web.config.mts non la ha */
function hasWeb(tag) {
  try {
    git('cat-file', '-e', `${tag}:vite.web.config.mts`)
    return true
  } catch {
    return false
  }
}

const tags = git('tag', '--list', 'v*')
  .split('\n')
  .map((t) => t.trim())
  .filter((t) => /^v\d+\.\d+\.\d+(-[\w.]+)?$/.test(t))
  .sort(compare)
  .reverse()
const beta = tags.find(hasWeb)
if (!beta) {
  console.error('No tag with the web version')
  process.exit(1)
}
const stable = tags.find((t) => !t.includes('-') && hasWeb(t)) ?? beta
console.log(`STABLE=${stable}`)
console.log(`BETA=${beta}`)
