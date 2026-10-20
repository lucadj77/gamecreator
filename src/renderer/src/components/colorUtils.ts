import { useEffect, useState } from 'react'
import { parseHex, parseRgbFunction, type Rgba } from '../../../shared/model/colorMath'

// Colori recenti (salvati nel browser, comuni a tutti i progetti) e lettura dei colori CSS, per
// il selettore colore (ColorPicker.tsx).

const RECENT_KEY = 'recentColors'
const RECENT_MAX = 12

const recentListeners = new Set<() => void>()

function readRecent(): string[] {
  try {
    const list = JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]')
    return Array.isArray(list) ? list.filter((c) => typeof c === 'string').slice(0, RECENT_MAX) : []
  } catch {
    return []
  }
}

/** Mette un colore in cima ai recenti */
export function rememberColor(color: string): void {
  const c = color.trim()
  if (!c) return
  const list = [c, ...readRecent().filter((x) => x.toUpperCase() !== c.toUpperCase())]
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(list.slice(0, RECENT_MAX)))
  } catch {
    // preferenza non essenziale
  }
  for (const l of recentListeners) l()
}

export function useRecent(): string[] {
  const [list, setList] = useState(readRecent)
  useEffect(() => {
    const update = (): void => setList(readRecent())
    recentListeners.add(update)
    return () => {
      recentListeners.delete(update)
    }
  }, [])
  return list
}

let probe: CanvasRenderingContext2D | null = null

/** Componenti di un colore CSS qualsiasi (nomi come "darkgreen" compresi); null se non è un colore */
export function cssColor(color: string): Rgba | null {
  const hex = parseHex(color)
  if (hex) return hex
  probe ??= document.createElement('canvas').getContext('2d')
  if (!probe || !color.trim()) return null
  // un valore non valido lascia quello di prima: si prova con due valori di partenza diversi
  probe.fillStyle = '#000'
  probe.fillStyle = color
  const a = probe.fillStyle
  probe.fillStyle = '#fff'
  probe.fillStyle = color
  if (a !== probe.fillStyle) return null
  return parseHex(a) ?? parseRgbFunction(a)
}

/** Il contagocce del browser, se c'è */
export const eyeDropper = (): { open(): Promise<{ sRGBHex: string }> } | null => {
  const Ctor = (
    window as unknown as { EyeDropper?: new () => { open(): Promise<{ sRGBHex: string }> } }
  ).EyeDropper
  return Ctor ? new Ctor() : null
}
