import { useEffect, useSyncExternalStore } from 'react'
import type { ProjectFont } from '../../../shared/project'
import { isGenericFont } from '../../../shared/model/fonts'
import { assetUrl } from './assets'

// Font del progetto (assets/fonts/) registrati nel documento con l'API FontFace: valgono per
// l'anteprima, l'editor e la finestra di esportazione. Il browser scarica il file solo quando
// un testo usa quella famiglia.

/** Font inclusi nell'app (src/renderer/src/assets/fonts, dichiarati in main.css) */
export const APP_FONTS = ['Nunito']

export type FontCheck = (family: string) => boolean

export interface ProjectFonts {
  /** Famiglie del progetto, senza doppioni, in ordine alfabetico */
  families: string[]
  /** Il font è nel progetto, nell'app o installato sul computer */
  has: FontCheck
}

let registered: FontFace[] = []
let current: ProjectFonts = snapshot([])
const listeners = new Set<() => void>()

function snapshot(fonts: ProjectFont[]): ProjectFonts {
  const own = new Set([...APP_FONTS, ...fonts.map((f) => f.family)].map((f) => f.toLowerCase()))
  return {
    families: [...new Set(fonts.map((f) => f.family))].sort((a, b) => a.localeCompare(b)),
    has: (family) => {
      const f = family.trim()
      return !f || isGenericFont(f) || own.has(f.toLowerCase()) || isInstalled(f)
    }
  }
}

export function setProjectFonts(fonts: ProjectFont[]): void {
  for (const f of registered) document.fonts.delete(f)
  registered = fonts.map(
    (f) =>
      new FontFace(f.family, `url("${assetUrl(f.path)}")`, { weight: f.weight, style: f.style })
  )
  for (const f of registered) document.fonts.add(f)
  current = snapshot(fonts)
  listeners.forEach((l) => l())
}

/** Registra i font del progetto quando cambiano */
export function useRegisterFonts(fonts: ProjectFont[] | undefined): void {
  useEffect(() => setProjectFonts(fonts ?? []), [fonts])
}

export function useProjectFonts(): ProjectFonts {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => current
  )
}

const installed = new Map<string, boolean>()
let probe: CanvasRenderingContext2D | null = null

/**
 * Un font installato sul computer cambia la larghezza del testo rispetto alle famiglie
 * generiche: se con entrambe le generiche come riserva la larghezza non cambia, il font manca.
 */
function isInstalled(family: string): boolean {
  const key = family.toLowerCase()
  const known = installed.get(key)
  if (known !== undefined) return known
  probe ??= document.createElement('canvas').getContext('2d')
  if (!probe) return true
  const sample = 'mmmmmmmmmmlli WQ@#0123'
  const width = (font: string): number => {
    probe!.font = `72px ${font}`
    return probe!.measureText(sample).width
  }
  const quoted = `"${family.replace(/"/g, '')}"`
  const found = ['monospace', 'serif'].some((g) => width(`${quoted}, ${g}`) !== width(g))
  installed.set(key, found)
  return found
}
