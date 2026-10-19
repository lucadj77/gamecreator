import { cpSync, existsSync } from 'fs'
import { join } from 'path'
import { app } from 'electron'

// Fino al cambio di nome l'app si chiamava GameCreator, e i suoi dati (progetti recenti con le
// miniature, preferenze dell'interfaccia) stanno in una cartella con quel nome. Al primo avvio
// di Naibi si copiano nella cartella nuova; quella vecchia resta com'è.

const OLD_NAMES = ['GameCreator', 'gamecreator']
const ITEMS = ['recent-projects.json', 'thumbnails', 'Local Storage']

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
    console.error('Copia dei dati di GameCreator non riuscita', e)
  }
}
