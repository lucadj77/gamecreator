import { app } from 'electron'
import { existsSync } from 'fs'
import { copyFile, mkdir, readdir } from 'fs/promises'
import { join } from 'path'

// Il progetto di esempio della guida e dei video, incluso nell'app in resources/examples/<lingua>
// (generato da scripts/guide/crea-progetto-esempio.mjs). Alla prima richiesta si copia in
// Documenti/Stella/Esempio, così l'utente lo può modificare; se c'è già si apre com'è.

/**
 * Cartella dell'esempio incluso nell'app, nella lingua dell'interfaccia (inglese se manca).
 * Il main sta in out/main, sia nel repository sia dentro app.asar: resources/ è due livelli sopra.
 */
function bundledExample(lang: string): string {
  const base = join(__dirname, '..', '..', 'resources', 'examples')
  const dir = join(base, lang)
  return existsSync(dir) ? dir : join(base, 'en')
}

/** Copia ricorsiva file per file: funziona anche da dentro app.asar */
async function copyTree(from: string, to: string): Promise<void> {
  await mkdir(to, { recursive: true })
  for (const entry of await readdir(from, { withFileTypes: true })) {
    const src = join(from, entry.name)
    const dest = join(to, entry.name)
    if (entry.isDirectory()) await copyTree(src, dest)
    else await copyFile(src, dest)
  }
}

/** Prepara il progetto di esempio nei documenti dell'utente e ne restituisce la cartella */
export async function prepareExample(lang: string): Promise<string> {
  const name = lang === 'it' ? 'Esempio' : 'Example'
  const dest = join(app.getPath('documents'), 'Stella', name)
  if (!existsSync(join(dest, 'stella.json'))) await copyTree(bundledExample(lang), dest)
  return dest
}
