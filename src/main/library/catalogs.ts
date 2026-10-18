import { readFile } from 'fs/promises'
import iconsPath from '../../../resources/catalogs/game-icons.json?asset'
import tagsPath from '../../../resources/catalogs/game-icons-tags.json?asset'
import fontsPath from '../../../resources/catalogs/google-fonts.json?asset'
import type { FontCatalog, IconCatalog } from '../../shared/library'

// Cataloghi inclusi nell'app (resources/catalogs), letti alla prima richiesta.
// Si rigenerano con scripts/make-icon-catalog.mjs, fetch-icon-tags.mjs e make-font-catalog.mjs.

let icons: Promise<IconCatalog> | null = null
let fonts: Promise<FontCatalog> | null = null

const json = async <T>(path: string): Promise<T> => JSON.parse(await readFile(path, 'utf8'))

export function iconCatalog(): Promise<IconCatalog> {
  icons ??= Promise.all([
    json<Omit<IconCatalog, 'tags'>>(iconsPath),
    json<IconCatalog['tags']>(tagsPath)
  ]).then(([c, tags]) => ({ ...c, tags }))
  icons.catch(() => (icons = null))
  return icons
}

export function fontCatalog(): Promise<FontCatalog> {
  fonts ??= json<FontCatalog>(fontsPath)
  fonts.catch(() => (fonts = null))
  return fonts
}
