import { createContext, useContext, useMemo } from 'react'
import type { BindContext } from '../../../shared/model/bind'
import type { Variables } from '../../../shared/model/variables'

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

/** Variabili del progetto aperto (docs/specifica.md, 6.1) */
export const VariablesContext = createContext<Variables>({})

/** Ciò che serve per applicare una riga a un template: immagini, stili e variabili */
export function useBindContext(): BindContext {
  const assets = useContext(AssetsContext)
  const styles = useContext(StylesContext)
  const variables = useContext(VariablesContext)
  return useMemo(() => ({ assets, styles, variables }), [assets, styles, variables])
}
