// Icone di altre collezioni attraverso l'API pubblica di Iconify (api.iconify.design): elenco delle
// collezioni con la loro licenza, ricerca e SVG delle icone. Funziona solo con la rete; le icone
// importate restano nel progetto. Vedi docs/specifica.md, sezione 10.1.

export const ICONIFY_API = 'https://api.iconify.design'

/** Una collezione di Iconify, come la descrive /collections */
export interface IconifySet {
  prefix: string
  name: string
  total: number
  author: { name: string; url?: string }
  license: { title: string; spdx?: string; url?: string }
  /** Alcune icone di esempio, per l'anteprima nell'elenco */
  samples: string[]
  category?: string
  /** Icone a più colori: non si tingono e vanno in assets/images */
  palette: boolean
}

/**
 * Licenza di una collezione rispetto a un gioco pubblicato: libera, con obbligo di citare
 * l'autore, o con condizioni che per un gioco in vendita pongono problemi (condivisione allo
 * stesso modo, uso non commerciale, GPL). È un'informazione, non un divieto.
 */
export type LicenseClass = 'free' | 'attribution' | 'restricted'

export function licenseClass(spdx: string | undefined): LicenseClass {
  const s = (spdx ?? '').toUpperCase()
  if (!s || /(^|-)(SA|NC|ND)(-|$)/.test(s) || s.startsWith('GPL') || s.startsWith('AGPL'))
    return 'restricted'
  if (s.startsWith('CC-BY')) return 'attribution'
  return 'free'
}

/** Elenco delle collezioni dalla risposta di /collections, ordinato per nome */
export function parseCollections(data: unknown): IconifySet[] {
  if (!data || typeof data !== 'object') return []
  const out: IconifySet[] = []
  for (const [prefix, raw] of Object.entries(data as Record<string, unknown>)) {
    if (!raw || typeof raw !== 'object') continue
    const c = raw as Record<string, unknown>
    if (c.hidden) continue
    const author = (c.author ?? {}) as Record<string, unknown>
    const license = (c.license ?? {}) as Record<string, unknown>
    out.push({
      prefix,
      name: String(c.name ?? prefix),
      total: Number(c.total) || 0,
      author: {
        name: String(author.name ?? ''),
        ...(typeof author.url === 'string' ? { url: author.url } : {})
      },
      license: {
        title: String(license.title ?? ''),
        ...(typeof license.spdx === 'string' ? { spdx: license.spdx } : {}),
        ...(typeof license.url === 'string' ? { url: license.url } : {})
      },
      samples: Array.isArray(c.samples) ? c.samples.map(String) : [],
      ...(typeof c.category === 'string' ? { category: c.category } : {}),
      palette: !!c.palette
    })
  }
  return out.sort((a, b) => a.name.localeCompare(b.name))
}

/** Nomi delle icone di una collezione dalla risposta di /collection, con le categorie */
export function parseCollectionIcons(data: unknown): {
  icons: string[]
  categories: Record<string, string[]>
} {
  const d = (data ?? {}) as Record<string, unknown>
  const categories: Record<string, string[]> = {}
  const all = new Set<string>()
  if (d.categories && typeof d.categories === 'object')
    for (const [name, list] of Object.entries(d.categories as Record<string, unknown>))
      if (Array.isArray(list)) {
        categories[name] = list.map(String)
        for (const n of categories[name]) all.add(n)
      }
  if (Array.isArray(d.uncategorized)) for (const n of d.uncategorized) all.add(String(n))
  return { icons: [...all].sort(), categories }
}

/** Id "prefisso:nome" della risposta di /search */
export function parseSearch(data: unknown): string[] {
  const d = (data ?? {}) as Record<string, unknown>
  return Array.isArray(d.icons) ? d.icons.map(String).filter((s) => s.includes(':')) : []
}

interface IconData {
  body: string
  left?: number
  top?: number
  width?: number
  height?: number
  rotate?: number
  hFlip?: boolean
  vFlip?: boolean
}

/**
 * SVG completi delle icone nella risposta di /<prefisso>.json?icons=..., per nome. Gli alias
 * prendono il disegno dell'icona da cui derivano, con rotazioni e ribaltamenti.
 */
export function iconSvgs(data: unknown): Record<string, string> {
  const d = (data ?? {}) as Record<string, unknown>
  const icons = (d.icons ?? {}) as Record<string, IconData>
  const aliases = (d.aliases ?? {}) as Record<string, Partial<IconData> & { parent: string }>
  const base = { left: Number(d.left) || 0, top: Number(d.top) || 0 }
  const size = { width: Number(d.width) || 16, height: Number(d.height) || 16 }

  const resolve = (name: string, depth = 0): IconData | null => {
    const icon = icons[name]
    if (icon && typeof icon.body === 'string') return icon
    const alias = aliases[name]
    if (!alias || depth > 5) return null
    const parent = resolve(alias.parent, depth + 1)
    if (!parent) return null
    const { parent: _p, ...own } = alias
    void _p
    return {
      ...parent,
      ...own,
      // le trasformazioni dell'alias si sommano a quelle dell'icona
      rotate: ((parent.rotate ?? 0) + (own.rotate ?? 0)) % 4,
      hFlip: !!parent.hFlip !== !!own.hFlip,
      vFlip: !!parent.vFlip !== !!own.vFlip
    }
  }

  const out: Record<string, string> = {}
  for (const name of [...Object.keys(icons), ...Object.keys(aliases)]) {
    const icon = resolve(name)
    if (icon) out[name] = toSvg({ ...base, ...size, ...icon })
  }
  return out
}

/** SVG di un'icona con le sue trasformazioni, come le applica Iconify */
function toSvg(
  i: Required<Pick<IconData, 'left' | 'top' | 'width' | 'height'>> & IconData
): string {
  const box = { left: i.left, top: i.top, width: i.width, height: i.height }
  const transforms: string[] = []
  let rotation = i.rotate ?? 0
  if (i.hFlip) {
    if (i.vFlip) rotation += 2
    else {
      transforms.push(`translate(${box.width + box.left} ${-box.top})`, 'scale(-1 1)')
      box.top = box.left = 0
    }
  } else if (i.vFlip) {
    transforms.push(`translate(${-box.left} ${box.height + box.top})`, 'scale(1 -1)')
    box.top = box.left = 0
  }
  rotation = ((rotation % 4) + 4) % 4
  if (rotation === 1) {
    const c = box.height / 2 + box.top
    transforms.unshift(`rotate(90 ${c} ${c})`)
  } else if (rotation === 2)
    transforms.unshift(`rotate(180 ${box.width / 2 + box.left} ${box.height / 2 + box.top})`)
  else if (rotation === 3) {
    const c = box.width / 2 + box.left
    transforms.unshift(`rotate(-90 ${c} ${c})`)
  }
  if (rotation % 2 === 1) {
    ;[box.left, box.top] = [box.top, box.left]
    ;[box.width, box.height] = [box.height, box.width]
  }
  const body = cleanBody(i.body)
  const content = transforms.length ? `<g transform="${transforms.join(' ')}">${body}</g>` : body
  // senza larghezza e altezza, come le altre icone della libreria: conta solo il viewBox
  const viewBox = `${box.left} ${box.top} ${box.width} ${box.height}`
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}">${content}</svg>`
}

/** Toglie dal disegno script e attributi di evento: il contenuto arriva dalla rete */
export function cleanBody(body: string): string {
  return body
    .replace(/<script\b[\s\S]*?<\/script\s*>/gi, '')
    .replace(/<script\b[^>]*\/>/gi, '')
    .replace(/\s+on[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/(href\s*=\s*["'])\s*javascript:[^"']*/gi, '$1#')
}

/**
 * SVG da scrivere nel progetto: le icone a un colore usano currentColor, che diventa nero come
 * per le altre icone della libreria (la tinta del livello le ricolora).
 */
export function svgForFile(svg: string, palette: boolean): string {
  return (palette ? svg : svg.replace(/currentColor/g, '#000')) + '\n'
}

/** SVG con la tinta al posto di currentColor, per le anteprime */
export function tintSvg(svg: string, tint: string): string {
  return svg.replace(/currentColor/g, tint)
}

/** Separa "prefisso:nome"; null se l'id non è valido */
export function splitIconId(id: string): { prefix: string; name: string } | null {
  const m = id.match(/^([a-z0-9]+(?:-[a-z0-9]+)*):([a-z0-9]+(?:[-_][a-z0-9]+)*)$/)
  return m ? { prefix: m[1], name: m[2] } : null
}

/** Pagina della collezione sul sito di Iconify, con l'icona */
export const iconifyPage = (prefix: string, name: string): string =>
  `https://icon-sets.iconify.design/${prefix}/?icon-filter=${encodeURIComponent(name)}`
