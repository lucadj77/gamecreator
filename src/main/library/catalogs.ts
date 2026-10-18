import { readFile } from 'fs/promises'
import iconsPath from '../../../resources/catalogs/game-icons.json?asset'
import tagsPath from '../../../resources/catalogs/game-icons-tags.json?asset'
import kenneyIconsPath from '../../../resources/catalogs/kenney-icons.json?asset'
import kenneyImagesPath from '../../../resources/catalogs/kenney-images.json?asset'
import fontsPath from '../../../resources/catalogs/google-fonts.json?asset'
import type { FontCatalog, IconCatalog, IconCollection } from '../../shared/library'

// Cataloghi inclusi nell'app (resources/catalogs), letti alla prima richiesta. Si rigenerano con
// scripts/make-icon-catalog.mjs, fetch-icon-tags.mjs, make-kenney-catalogs.mjs e make-font-catalog.mjs.

const icons = new Map<IconCollection, Promise<IconCatalog>>()
let fonts: Promise<FontCatalog> | null = null

const json = async <T>(path: string): Promise<T> => JSON.parse(await readFile(path, 'utf8'))

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
      ]).then(([c, tags]) => ({ ...c, tags }))
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
  fonts ??= json<FontCatalog>(fontsPath)
  fonts.catch(() => (fonts = null))
  return fonts
}
