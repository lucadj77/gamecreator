// Con npm run dev su macOS l'app gira dentro Electron.app, e la barra dei menu e il Dock
// prendono il nome dal suo Info.plist: senza questa correzione mostrano "Electron".
// Si cambia il nome nella copia di Electron dentro node_modules e la si firma di nuovo
// (firma locale), perché la modifica invalida quella originale. L'app pacchettizzata ha già
// il nome giusto, da electron-builder.yml.
import { execFileSync } from 'child_process'
import { existsSync } from 'fs'
import { createRequire } from 'module'
import { dirname, join } from 'path'

const NAME = 'Naibi'

if (process.platform === 'darwin') {
  try {
    const require = createRequire(import.meta.url)
    const app = join(dirname(require.resolve('electron')), 'dist', 'Electron.app')
    const plist = join(app, 'Contents', 'Info.plist')
    if (existsSync(plist)) {
      // plutil -extract esce con errore se la chiave manca: allora va scritta
      const keys = ['CFBundleName', 'CFBundleDisplayName']
      const current = keys.map((key) => {
        try {
          return execFileSync('plutil', ['-extract', key, 'raw', plist], { encoding: 'utf8' })
        } catch {
          return ''
        }
      })
      if (current.some((v) => v.trim() !== NAME)) {
        for (const key of keys) execFileSync('plutil', ['-replace', key, '-string', NAME, plist])
        execFileSync('codesign', ['--force', '--deep', '--sign', '-', app], { stdio: 'ignore' })
        console.log(`Nome dell'app di sviluppo impostato a ${NAME}`)
      }
    }
  } catch (e) {
    // senza la correzione l'app parte comunque, con il nome Electron nella barra dei menu
    console.warn(`Nome dell'app di sviluppo non cambiato: ${e.message}`)
  }
}
