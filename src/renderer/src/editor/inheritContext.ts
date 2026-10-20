import { createContext } from 'react'

export interface InheritCtx {
  /** Stato della proprietà nel derivato; null se non c'è nulla da mostrare */
  status(prop: string): 'inherited' | 'changed' | null
  /** Torna al valore del base */
  revert(props: string[]): void
}

export const InheritContext = createContext<InheritCtx | null>(null)

/** Proprietà del livello che corrisponde a una voce del pannello, quando il nome è diverso */
const KEYS: Record<string, string[]> = {
  constraintH: ['constraints'],
  constraintV: ['constraints']
}

export const propKeys = (id: string): string[] => KEYS[id] ?? [id]
