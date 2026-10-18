import { createContext } from 'react'

/** File sotto assets/ del progetto aperto, per risolvere i nomi delle immagini */
export const AssetsContext = createContext<string[]>([])

export function assetUrl(path: string): string {
  return `gc-asset://project/${path.split('/').map(encodeURIComponent).join('/')}`
}
