import { createContext } from 'react'
import type { Template } from '../../../shared/model/template'

/**
 * La carta mostrata nell'editor (con i dati scelti in "Dati", o i soli valori del template) e i
 * fogli dei set: servono a trovare un'immagine da ritagliare quando il livello la prende da una
 * colonna
 */
export const DisplayContext = createContext<{
  template: Template | null
  sheets: { headers: string[]; rows: string[][] }[]
}>({ template: null, sheets: [] })
