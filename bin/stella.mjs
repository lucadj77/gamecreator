#!/usr/bin/env node
// Avvia il comando stella: lo stesso programma dell'app, con --cli e senza finestre.
// Si usa dalla cartella del codice (npm run stella -- info <progetto>) o, dopo `npm link`,
// come `stella` da qualsiasi cartella. Vedi docs/cli.md.
import { spawn } from 'child_process'
import { existsSync } from 'fs'
import { createRequire } from 'module'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
if (!existsSync(join(root, 'out', 'renderer', 'index.html'))) {
  console.error('stella: the app is not built yet. Run `npm run build` in ' + root)
  process.exit(2)
}
// in Node, require('electron') restituisce il percorso del programma Electron
const electron = createRequire(import.meta.url)('electron')
const extra = process.platform === 'linux' && process.getuid?.() === 0 ? ['--no-sandbox'] : []
const child = spawn(electron, [root, ...extra, '--cli', ...process.argv.slice(2)], {
  stdio: 'inherit',
  env: { ...process.env, ELECTRON_ENABLE_LOGGING: '' }
})
child.on('exit', (code) => process.exit(code ?? 1))
