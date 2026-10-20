import { net } from 'electron'
import { mkdir, writeFile } from 'fs/promises'
import { join } from 'path'
import {
  ICONIFY_API,
  iconSvgs,
  iconifyPage,
  parseCollectionIcons,
  parseCollections,
  parseSearch,
  splitIconId,
  svgForFile,
  type IconifySet
} from '../../shared/iconify'
import {
  ICONS_FOLDER,
  IMAGES_FOLDER,
  isValidAssetName,
  today,
  type AssetsUpdate,
  type IconImport,
  type Sources
} from '../../shared/library'
import { MessageError, msg } from '../../shared/messages'
import { assetsUpdate, updateSources } from './sources'

// Collezioni di Iconify lette dall'API pubblica, senza chiave. Le richieste passano dal processo
// principale (la Content-Security-Policy del renderer non ammette altri indirizzi).

async function getJson(path: string): Promise<unknown> {
  let res: Response
  try {
    res = await net.fetch(ICONIFY_API + path)
  } catch (e) {
    throw new MessageError(msg('iconify.network', { error: String((e as Error).message ?? e) }))
  }
  if (!res.ok) throw new MessageError(msg('iconify.httpError', { status: res.status }))
  return res.json()
}

let collections: Promise<IconifySet[]> | null = null

export function iconifyCollections(): Promise<IconifySet[]> {
  collections ??= getJson('/collections').then(parseCollections)
  collections.catch(() => (collections = null))
  return collections
}

export async function iconifyCollection(
  prefix: string
): Promise<{ icons: string[]; categories: Record<string, string[]> }> {
  return parseCollectionIcons(await getJson(`/collection?prefix=${encodeURIComponent(prefix)}`))
}

/** Id "prefisso:nome" delle icone trovate, al massimo 999 */
export async function iconifySearch(query: string, prefix?: string): Promise<string[]> {
  const q = new URLSearchParams({ query, limit: '999' })
  if (prefix) q.set('prefix', prefix)
  return parseSearch(await getJson(`/search?${q}`))
}

/** SVG delle icone chieste, per id "prefisso:nome"; quelle che non esistono mancano */
export async function iconifySvgs(ids: string[]): Promise<Record<string, string>> {
  const byPrefix = new Map<string, string[]>()
  for (const id of ids) {
    const p = splitIconId(id)
    if (p) byPrefix.set(p.prefix, [...(byPrefix.get(p.prefix) ?? []), p.name])
  }
  const out: Record<string, string> = {}
  for (const [prefix, names] of byPrefix)
    // l'indirizzo resta corto: un gruppo di nomi per richiesta
    for (let i = 0; i < names.length; i += 100) {
      const part = names.slice(i, i + 100)
      const data = await getJson(`/${prefix}.json?icons=${part.map(encodeURIComponent).join(',')}`)
      const svgs = iconSvgs(data)
      for (const n of part) if (svgs[n]) out[`${prefix}:${n}`] = svgs[n]
    }
  return out
}

/**
 * Scrive le icone scelte in assets/icons/<nome>.svg (o in assets/images/ quelle a più colori) e
 * ne registra collezione, autore e licenza in assets/sources.json. Il disegno si richiede di
 * nuovo qui, invece di usare quello mostrato nell'anteprima.
 */
export async function importIconifyIcons(
  folder: string,
  items: IconImport[]
): Promise<AssetsUpdate> {
  const sets = new Map((await iconifyCollections()).map((s) => [s.prefix, s]))
  const svgs = await iconifySvgs(items.map((i) => i.id))
  const entries: Sources = {}
  for (const { id, name } of items) {
    const parts = splitIconId(id)
    const svg = svgs[id]
    if (!parts || !svg) throw new MessageError(msg('icons.unknown', { id }))
    if (!isValidAssetName(name)) throw new MessageError(msg('icons.invalidName', { name }))
    const set = sets.get(parts.prefix)
    const palette = !!set?.palette
    const sub = palette ? IMAGES_FOLDER : ICONS_FOLDER
    await mkdir(join(folder, 'assets', sub), { recursive: true })
    await writeFile(join(folder, 'assets', sub, `${name}.svg`), svgForFile(svg, palette))
    entries[`${sub}/${name}.svg`] = {
      kind: 'icon',
      source: `Iconify: ${set?.name ?? parts.prefix}`,
      id,
      title: parts.name,
      ...(set?.author.name ? { author: set.author.name } : {}),
      license: set?.license.spdx || set?.license.title || '',
      url: iconifyPage(parts.prefix, parts.name),
      imported: today()
    }
  }
  return assetsUpdate(folder, await updateSources(folder, entries))
}
