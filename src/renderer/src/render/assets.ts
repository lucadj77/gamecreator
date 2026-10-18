import type { AssetsUpdate } from '../../../shared/library'
import { createContext } from 'react'

/** File sotto assets/ del progetto aperto, per risolvere i nomi delle immagini */
export const AssetsContext = createContext<string[]>([])

export function assetUrl(path: string): string {
  return `gc-asset://project/${path.split('/').map(encodeURIComponent).join('/')}`
}

/** Stili di testo del progetto (nome → attributi), usati con .nome nel markup */
export const StylesContext = createContext<Record<string, string>>({})

/** Salva uno stile del progetto (def null lo elimina); null se non c'è un progetto aperto */
export const SaveStyleContext = createContext<
  ((name: string, def: string | null, oldName?: string) => void) | null
>(null)

/** Nell'editor i livelli vuoti si mostrano comunque, per poterli vedere e prendere */
export const ShowEmptyContext = createContext(false)

const assetListeners = new Set<(u: AssetsUpdate) => void>()

/** Avvisa il progetto aperto che gli asset sono cambiati, per esempio dopo un'importazione */
export function publishAssetsUpdate(u: AssetsUpdate): void {
  assetListeners.forEach((l) => l(u))
}

export function onAssetsUpdate(cb: (u: AssetsUpdate) => void): () => void {
  assetListeners.add(cb)
  return () => assetListeners.delete(cb)
}
