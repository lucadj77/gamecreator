import { mkdir, writeFile } from 'fs/promises'
import { join } from 'path'
import {
  ICONS_FOLDER,
  isValidAssetName,
  today,
  type AssetsUpdate,
  type IconImport,
  type Sources
} from '../../shared/library'
import { MessageError, msg } from '../../shared/messages'
import { iconCatalog } from './catalogs'
import { assetsUpdate, updateSources } from './sources'

/**
 * Scrive le icone scelte in assets/icons/<nome>.svg, nere su fondo trasparente (la tinta del
 * livello le ricolora), e ne registra autore e licenza in assets/sources.json.
 */
export async function importIcons(folder: string, items: IconImport[]): Promise<AssetsUpdate> {
  const catalog = await iconCatalog()
  const byId = new Map(catalog.icons)
  const dir = join(folder, 'assets', ICONS_FOLDER)
  await mkdir(dir, { recursive: true })
  const entries: Sources = {}
  for (const { id, name } of items) {
    const d = byId.get(id)
    if (!d) throw new MessageError(msg('icons.unknown', { id }))
    if (!isValidAssetName(name)) throw new MessageError(msg('icons.invalidName', { name }))
    const svg =
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">' +
      `<path fill="#000" d="${d}"/></svg>\n`
    await writeFile(join(dir, `${name}.svg`), svg)
    const [authorKey, iconName] = id.split('/')
    const author = catalog.authors[authorKey]
    entries[`${ICONS_FOLDER}/${name}.svg`] = {
      kind: 'icon',
      source: 'game-icons.net',
      id,
      title: iconName,
      author: author?.name ?? authorKey,
      license: author?.license ?? 'CC-BY-3.0',
      url: `https://game-icons.net/1x1/${id}.html`,
      imported: today()
    }
  }
  return assetsUpdate(folder, await updateSources(folder, entries))
}
