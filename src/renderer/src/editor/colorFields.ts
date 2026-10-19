import { createContext } from 'react'

/** Campi della carta proposti nei colori come {nome}: di solito i livelli valore del template */
export const ColorFieldsContext = createContext<string[]>([])
