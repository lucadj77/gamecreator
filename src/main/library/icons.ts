import { mkdir, writeFile } from 'fs/promises'
import { join } from 'path'
import {
  collectionFolder,
  iconExtension,
  isValidAssetName,
  today,
  type AssetsUpdate,
  type IconCatalog,
  type IconCollection,
  type IconImport,
  type SourceEntry,
  type Sources
} from '../../shared/library'
import { MessageError, msg } from '../../shared/messages'
import { iconCatalog } from './catalogs'
import { assetsUpdate, updateSources } from './sources'

/** Pagina del pacchetto Kenney da cui viene ogni cartella del catalogo */
const KENNEY_PACKS: Record<string, string> = {
  icons: 'https://kenney.nl/assets/board-game-icons',
  patterns: 'https://kenney.nl/assets/pattern-pack',
  'patterns-extra': 'https://kenney.nl/assets/pattern-pack-extra',
  boardgame: 'https://kenney.nl/assets/boardgame-pack'
}

/** Provenienza di un'icona per assets/sources.json */
function source(collection: IconCollection, catalog: IconCatalog, id: string): SourceEntry {
  const [folder, iconName] = id.split('/')
  const author = catalog.author ?? catalog.authors[folder]
  const entry = {
    kind: 'icon' as const,
    id,
    title: iconName,
    author: author?.name ?? folder,
    imported: today()
  }
  if (collection === 'game-icons')
    return {
      ...entry,
      source: 'game-icons.net',
      license: author?.license ?? 'CC-BY-3.0',
      url: `https://game-icons.net/1x1/${id}.html`
    }
  return {
    ...entry,
    source: 'kenney.nl',
    license: author?.license ?? 'CC0-1.0',
    url: KENNEY_PACKS[folder] ?? catalog.source
  }
}

/**
 * Scrive le icone scelte in assets/icons/<nome>.svg, nere su fondo trasparente (la tinta del
 * livello le ricolora), o le immagini in assets/images/, e ne registra autore e licenza in
 * assets/sources.json.
 */
export async function importIcons(
  folder: string,
  collection: IconCollection,
  items: IconImport[]
): Promise<AssetsUpdate> {
  const catalog = await iconCatalog(collection)
  const byId = new Map(catalog.icons)
  const sub = collectionFolder(collection)
  const dir = join(folder, 'assets', sub)
  await mkdir(dir, { recursive: true })
  const entries: Sources = {}
  for (const { id, name } of items) {
    const value = byId.get(id)
    if (!value) throw new MessageError(msg('icons.unknown', { id }))
    if (!isValidAssetName(name)) throw new MessageError(msg('icons.invalidName', { name }))
    const ext = iconExtension(value)
    const file = `${name}.${ext}`
    if (catalog.kind === 'image') {
      const data = value.slice(value.indexOf(',') + 1)
      const base64 = value.slice(0, value.indexOf(',')).endsWith(';base64')
      await writeFile(
        join(dir, file),
        base64 ? Buffer.from(data, 'base64') : decodeURIComponent(data)
      )
    } else {
      const svg =
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">' +
        `<path fill="#000" d="${value}"/></svg>\n`
      await writeFile(join(dir, file), svg)
    }
    entries[`${sub}/${file}`] = source(collection, catalog, id)
  }
  return assetsUpdate(folder, await updateSources(folder, entries))
}
