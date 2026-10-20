import { app } from 'electron'
import { readFile } from 'fs/promises'
import { join } from 'path'
import iconsPath from '../../../resources/catalogs/game-icons.json?asset'
import tagsPath from '../../../resources/catalogs/game-icons-tags.json?asset'
import kenneyIconsPath from '../../../resources/catalogs/kenney-icons.json?asset'
import kenneyImagesPath from '../../../resources/catalogs/kenney-images.json?asset'
import fontsPath from '../../../resources/catalogs/google-fonts.json?asset'
import type { FontCatalog, IconCatalog, IconCollection } from '../../shared/library'

// Cataloghi inclusi nell'app (resources/catalogs), letti alla prima richiesta. Si rigenerano con
// scripts/make-icon-catalog.mjs, fetch-icon-tags.mjs, make-kenney-catalogs.mjs e make-font-catalog.mjs.
// Quelli di game-icons.net e dei font Google si aggiornano anche dall'app (catalogUpdate.ts): la
// copia aggiornata sta nella cartella dei dati dell'utente e vale finché non ne ha meno voci di
// quella inclusa, cioè finché una versione nuova dell'app non porta un catalogo più recente.

const icons = new Map<IconCollection, Promise<IconCatalog>>()
let fonts: Promise<FontCatalog> | null = null

const json = async <T>(path: string): Promise<T> => JSON.parse(await readFile(path, 'utf8'))

/** Cartella dei cataloghi aggiornati dall'app */
export const userCatalogDir = (): string => join(app.getPath('userData'), 'catalogs')

/** Il catalogo aggiornato dall'utente se c'è e non è più piccolo di quello incluso */
async function newest<T>(base: T, file: string, size: (c: T) => number): Promise<T> {
  try {
    const user = await json<T>(join(userCatalogDir(), file))
    return size(user) >= size(base) ? user : base
  } catch {
    return base
  }
}

function readIconCatalog(collection: IconCollection): Promise<IconCatalog> {
  switch (collection) {
    case 'kenney-icons':
      return json<IconCatalog>(kenneyIconsPath)
    case 'kenney-images':
      return json<IconCatalog>(kenneyImagesPath)
    default:
      return Promise.all([
        json<Omit<IconCatalog, 'tags'>>(iconsPath),
        json<IconCatalog['tags']>(tagsPath)
      ]).then(([c, tags]) => newest({ ...c, tags }, 'game-icons.json', (x) => x.icons.length))
  }
}

export function iconCatalog(collection: IconCollection = 'game-icons'): Promise<IconCatalog> {
  let p = icons.get(collection)
  if (!p) {
    p = readIconCatalog(collection)
    p.catch(() => icons.delete(collection))
    icons.set(collection, p)
  }
  return p
}

export function fontCatalog(): Promise<FontCatalog> {
  fonts ??= json<FontCatalog>(fontsPath).then((base) =>
    newest(base, 'google-fonts.json', (c) => c.families.length)
  )
  fonts.catch(() => (fonts = null))
  return fonts
}

/** Dimentica i cataloghi letti, dopo un aggiornamento */
export function forgetCatalogs(): void {
  icons.clear()
  fonts = null
}
