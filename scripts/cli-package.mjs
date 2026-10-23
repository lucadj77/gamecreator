#!/usr/bin/env node
// Pacchetto npm del solo comando naibi, per chi usa la versione web e vuole lavorare con un
// agente IA: lo stesso programma dell'app (Electron serve a disegnare le carte), senza finestre
// e senza installer. La release lo pubblica come naibi-cli-<versione>.tgz e la skill lo installa
// con `npm install -g <indirizzo del file>`. Va eseguito dopo `npx electron-vite build`.
// Uso: node scripts/cli-package.mjs [cartella di uscita, di base dist]
import { execFileSync } from 'child_process'
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'fs'
import { dirname, join, resolve } from 'path'
import { fileURLToPath } from 'url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const out = resolve(process.argv[2] ?? join(root, 'dist'))
if (!existsSync(join(root, 'out', 'renderer', 'index.html'))) {
  console.error('cli-package: run `npx electron-vite build` first')
  process.exit(1)
}

const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
const stage = join(root, 'dist-cli')
rmSync(stage, { recursive: true, force: true })
mkdirSync(stage, { recursive: true })
for (const p of ['out', 'resources', 'bin', 'LICENSE'])
  cpSync(join(root, p), join(stage, p), { recursive: true })

writeFileSync(
  join(stage, 'package.json'),
  JSON.stringify(
    {
      name: 'naibi-cli',
      // productName come l'app: le impostazioni (backup, cartelle) sono le stesse
      productName: pkg.productName,
      version: pkg.version,
      description: 'The naibi command, to work on Naibi projects from a terminal or an AI agent',
      license: pkg.license,
      homepage: pkg.homepage,
      main: './out/main/index.js',
      bin: { naibi: 'bin/naibi.mjs' },
      // il pacchetto electron non scarica più il programma da solo
      scripts: { postinstall: 'install-electron' },
      // Electron disegna le carte: si scarica all'installazione
      dependencies: { ...pkg.dependencies, electron: pkg.devDependencies.electron }
    },
    null,
    2
  ) + '\n'
)
writeFileSync(
  join(stage, 'README.md'),
  `# naibi-cli\n\nThe \`naibi\` command of [Naibi](${pkg.homepage}) ${pkg.version}, without the app.\nRun \`naibi help\`. See docs/cli.md in the repository.\n`
)

mkdirSync(out, { recursive: true })
execFileSync('npm', ['pack', '--pack-destination', out], {
  cwd: stage,
  stdio: 'inherit',
  shell: process.platform === 'win32'
})
rmSync(stage, { recursive: true, force: true })
console.log(join(out, `naibi-cli-${pkg.version}.tgz`))
