import { useSyncExternalStore } from 'react'

// Lucchetto delle proporzioni di larghezza e altezza: una preferenza dell'interfaccia per tipo di
// livello e per il formato del template, ricordata tra una sessione e l'altra. Lo leggono i campi
// del pannello proprietà e le maniglie sulla carta.

export type LockKind = 'text' | 'image' | 'shape' | 'group' | 'template'

const KEY = 'ratioLock'
const listeners = new Set<() => void>()

function read(): Record<string, boolean> {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '{}')
  } catch {
    return {}
  }
}

let state = read()

export function setRatioLock(kind: LockKind, on: boolean): void {
  state = { ...state, [kind]: on }
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
  } catch {
    // senza archivio locale vale solo per questa sessione
  }
  listeners.forEach((l) => l())
}

export function useRatioLock(kind: LockKind): [boolean, (on: boolean) => void] {
  const on = useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => !!state[kind]
  )
  return [on, (v) => setRatioLock(kind, v)]
}

/** Per i gestori degli eventi, che non passano dal rendering */
export const isRatioLocked = (kind: string): boolean => !!state[kind]
