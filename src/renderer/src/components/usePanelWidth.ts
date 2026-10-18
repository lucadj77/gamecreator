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

export type PanelSide = 'left' | 'right'

/** Lato della finestra su cui sta un pannello, ricordato tra una sessione e l'altra */
export function usePanelSide(key: string, initial: PanelSide): [PanelSide, () => void] {
  const [side, setSide] = useState<PanelSide>(() => {
    try {
      const saved = localStorage.getItem(`panelSide.${key}`)
      return saved === 'left' || saved === 'right' ? saved : initial
    } catch {
      return initial
    }
  })
  const toggle = (): void => {
    const next = side === 'left' ? 'right' : 'left'
    setSide(next)
    try {
      localStorage.setItem(`panelSide.${key}`, next)
    } catch {
      // preferenza non essenziale
    }
  }
  return [side, toggle]
}
