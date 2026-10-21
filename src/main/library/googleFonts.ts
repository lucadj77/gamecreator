import { net } from 'electron'
import { mkdir, writeFile } from 'fs/promises'
import { join } from 'path'
import {
  FONTS_FOLDER,
  today,
  type AssetsUpdate,
  type FontVariant,
  type Sources
} from '../../shared/library'
import { MessageError, msg } from '../../shared/messages'
import { fontCatalog } from './catalogs'
import { cssUrl, parseFontCss } from './fontCss'
import { assetsUpdate, updateSources } from './sources'

// Scarica un font Google in assets/fonts/<famiglia>/: un file TTF completo per peso e stile.
// Con un user agent generico il servizio CSS di Google restituisce TTF interi invece dei WOFF2
// divisi per alfabeto: un file per variante, con tutti i caratteri, statico (nel PDF resta un
// font TrueType, mentre i font variabili diventano Type 3).

const LICENSE_URL = 'https://raw.githubusercontent.com/google/fonts/main'
const USER_AGENT = 'Mozilla/5.0'

async function get(url: string): Promise<Response> {
  let res: Response
  try {
    res = await net.fetch(url, { headers: { 'User-Agent': USER_AGENT } })
  } catch (e) {
    throw new MessageError(msg('fonts.network', { error: String((e as Error).message ?? e) }))
  }
  if (!res.ok) throw new MessageError(msg('fonts.httpError', { status: res.status, url }))
  return res
}

const LICENSE_FILES: Record<string, [string, string]> = {
  'OFL-1.1': ['ofl', 'OFL.txt'],
  'Apache-2.0': ['apache', 'LICENSE.txt'],
  'UFL-1.0': ['ufl', 'UFL.txt']
}

/**
 * Testo della licenza dal repository dei font Google; prova tutte le cartelle se non è nota.
 * La usa anche la versione web (src/web/library.ts).
 */
export async function fetchLicense(
  family: string,
  license: string
): Promise<{ file: string; text: string; license: string } | null> {
  const dir = family.toLowerCase().replace(/[^a-z0-9]/g, '')
  const order = Object.entries(LICENSE_FILES).sort(([a], [b]) =>
    a === license ? -1 : b === license ? 1 : 0
  )
  for (const [spdx, [folder, file]] of order) {
    try {
      const res = await net.fetch(`${LICENSE_URL}/${folder}/${dir}/${file}`)
      if (res.ok) return { file, text: await res.text(), license: spdx }
    } catch {
      // senza rete o file assente: si prova la cartella successiva
    }
  }
  return null
}

export async function downloadGoogleFont(
  folder: string,
  family: string,
  variants: FontVariant[]
): Promise<AssetsUpdate> {
  const entry = (await fontCatalog()).families.find((f) => f[0] === family)
  if (!entry) throw new MessageError(msg('fonts.unknown', { family }))
  if (!variants.length) throw new MessageError(msg('fonts.noVariant'))
  const faces = parseFontCss(await (await get(cssUrl(family, variants))).text())
  if (!faces.length) throw new MessageError(msg('fonts.noFiles', { family }))

  const dir = join(folder, 'assets', FONTS_FOLDER, family)
  await mkdir(dir, { recursive: true })
  const lic = await fetchLicense(family, entry[5])
  const license = lic?.license ?? (entry[5] || 'OFL-1.1')
  if (lic) await writeFile(join(dir, lic.file), lic.text)

  const base = family.replace(/[^\p{L}\p{N}]/gu, '')
  const entries: Sources = {}
  for (const f of faces) {
    const file = `${base}-${f.weight}${f.italic ? '-italic' : ''}.ttf`
    const data = Buffer.from(await (await get(f.url)).arrayBuffer())
    await writeFile(join(dir, file), data)
    entries[`${FONTS_FOLDER}/${family}/${file}`] = {
      kind: 'font',
      source: 'Google Fonts',
      id: family,
      title: `${family} ${f.weight}${f.italic ? ' italic' : ''}`,
      ...(entry[6] ? { author: entry[6] } : {}),
      license,
      url: `https://fonts.google.com/specimen/${family.replace(/ /g, '+')}`,
      imported: today()
    }
  }
  return assetsUpdate(folder, await updateSources(folder, entries))
}
