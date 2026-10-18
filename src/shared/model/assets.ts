// Risoluzione dei nomi di file: vedi docs/specifica.md, sezione 3.1.

export const IMAGE_EXTENSIONS = ['.svg', '.png', '.webp', '.jpg', '.jpeg']

export type AssetResolution =
  | { ok: true; path: string }
  | { ok: false; reason: 'empty' | 'missing' | 'ambiguous'; candidates: string[] }

/**
 * @param name nome scritto dall'utente: "spada", "spada.png", "icone/spada"
 * @param assets percorsi relativi a assets/, con "/" come separatore
 */
export function resolveAsset(name: string, assets: string[]): AssetResolution {
  const wanted = name
    .trim()
    .replace(/\\/g, '/')
    .replace(/^assets\//, '')
  if (!wanted) return { ok: false, reason: 'empty', candidates: [] }
  const lower = wanted.toLowerCase()
  const hasExt = IMAGE_EXTENSIONS.some((e) => lower.endsWith(e))
  const hasDir = wanted.includes('/')

  const matches = assets.filter((a) => {
    const al = a.toLowerCase()
    const candidate = hasDir ? al : al.slice(al.lastIndexOf('/') + 1)
    if (hasExt) return candidate === lower || (hasDir && al.endsWith('/' + lower))
    const dot = candidate.lastIndexOf('.')
    if (dot < 0 || !IMAGE_EXTENSIONS.includes(candidate.slice(dot))) return false
    const stem = candidate.slice(0, dot)
    return stem === lower || (hasDir && al.slice(0, al.lastIndexOf('.')).endsWith('/' + lower))
  })

  if (matches.length === 1) return { ok: true, path: matches[0] }
  return { ok: false, reason: matches.length ? 'ambiguous' : 'missing', candidates: matches }
}
