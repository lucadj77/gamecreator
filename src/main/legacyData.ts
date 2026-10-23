import { cpSync, existsSync } from 'fs'
import { join } from 'path'
import { app } from 'electron'

// Prima di Stella l'app si chiamava Naibi e, ancora prima, GameCreator: i suoi dati (progetti
// recenti con le miniature, preferenze dell'interfaccia, canale degli aggiornamenti) stanno in
// una cartella con quel nome. Al primo avvio di Stella si copiano nella cartella nuova; quella
// vecchia resta com'è. Le cartelle in minuscolo valgono per le versioni in cui il nome dell'app
// non aveva la maiuscola (conta solo su Linux).

const OLD_NAMES = ['Naibi', 'naibi', 'GameCreator', 'gamecreator']
const ITEMS = [
  'recent-projects.json',
  'thumbnails',
  'Local Storage',
  'backup-settings.json',
  'update.json'
]

/** Da chiamare prima che l'app sia pronta, quando nessuno ha ancora aperto i dati */
export function adoptLegacyData(): void {
  try {
    const target = app.getPath('userData')
    if (existsSync(join(target, 'recent-projects.json'))) return
    const appData = app.getPath('appData')
    const source = OLD_NAMES.map((n) => join(appData, n)).find(
      (dir) => dir !== target && existsSync(join(dir, 'recent-projects.json'))
    )
    if (!source) return
    for (const item of ITEMS) {
      const from = join(source, item)
      if (existsSync(from) && !existsSync(join(target, item)))
        cpSync(from, join(target, item), { recursive: true })
    }
  } catch (e) {
    // senza i dati vecchi l'app parte comunque, con l'elenco dei recenti vuoto
    console.error('Copia dei dati della versione precedente non riuscita', e)
  }
}
