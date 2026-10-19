import { useEffect, useRef, useState } from 'react'

// Anteprima delle voci della barra laterale: stato e attributi da dare alle voci dell'elenco.
// Il riquadro è in SidebarPreview.tsx.

const DELAY_MS = 450

export type PreviewTarget =
  | { kind: 'set'; index: number }
  | { kind: 'template'; name: string }
  | { kind: 'style'; name: string }
  | { kind: 'variable'; name: string }

export interface Hover {
  target: PreviewTarget
  rect: DOMRect
}

/** Stato dell'anteprima e attributi da dare alle voci dell'elenco */
export function useSidebarPreview(): {
  hover: Hover | null
  bind(target: PreviewTarget): {
    onPointerEnter(e: React.PointerEvent<HTMLElement>): void
    onPointerLeave(): void
  }
} {
  const [hover, setHover] = useState<Hover | null>(null)
  const timer = useRef<number | undefined>(undefined)
  useEffect(() => {
    // un clic, un tasto, lo scorrimento o un trascinamento chiudono l'anteprima
    const hide = (): void => {
      window.clearTimeout(timer.current)
      setHover(null)
    }
    window.addEventListener('pointerdown', hide, true)
    window.addEventListener('keydown', hide, true)
    window.addEventListener('scroll', hide, true)
    window.addEventListener('dragstart', hide, true)
    window.addEventListener('blur', hide)
    return () => {
      window.clearTimeout(timer.current)
      window.removeEventListener('pointerdown', hide, true)
      window.removeEventListener('keydown', hide, true)
      window.removeEventListener('scroll', hide, true)
      window.removeEventListener('dragstart', hide, true)
      window.removeEventListener('blur', hide)
    }
  }, [])
  return {
    hover,
    bind: (target) => ({
      onPointerEnter: (e) => {
        if (e.buttons) return
        const el = e.currentTarget
        window.clearTimeout(timer.current)
        timer.current = window.setTimeout(() => {
          if (el.isConnected) setHover({ target, rect: el.getBoundingClientRect() })
        }, DELAY_MS)
      },
      onPointerLeave: () => {
        window.clearTimeout(timer.current)
        setHover(null)
      }
    })
  }
}
