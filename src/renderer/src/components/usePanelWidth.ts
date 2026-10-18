import { useState } from 'react'

/** Larghezza di un pannello (o altra misura) ricordata tra una sessione e l'altra */
export function usePanelWidth(key: string, initial: number): [number, (w: number) => void] {
  const [width, setWidth] = useState(() => {
    try {
      const saved = Number(localStorage.getItem(`panel.${key}`))
      return saved > 0 ? saved : initial
    } catch {
      return initial
    }
  })
  const update = (w: number): void => {
    setWidth(w)
    try {
      localStorage.setItem(`panel.${key}`, String(Math.round(w * 100) / 100))
    } catch {
      // preferenza non essenziale
    }
  }
  return [width, update]
}
