import { createContext } from 'react'

/** File sotto assets/ del progetto aperto, per risolvere i nomi delle immagini */
export const AssetsContext = createContext<string[]>([])

export function assetUrl(path: string): string {
  return `gc-asset://project/${path.split('/').map(encodeURIComponent).join('/')}`
}

/** Stili di testo del progetto (nome → attributi), usati con .nome nel markup */
export const StylesContext = createContext<Record<string, string>>({})

/** Nell'editor i livelli vuoti si mostrano comunque, per poterli vedere e prendere */
export const ShowEmptyContext = createContext(false)
