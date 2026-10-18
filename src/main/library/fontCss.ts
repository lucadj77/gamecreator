import type { FontVariant } from '../../shared/library'

// Indirizzo e lettura del CSS di Google Fonts, separati per poterli provare senza Electron

const CSS_URL = 'https://fonts.googleapis.com/css2'

export function cssUrl(family: string, variants: FontVariant[]): string {
  const sorted = [...variants].sort((a, b) => +a.italic - +b.italic || a.weight - b.weight)
  const name = family.replace(/ /g, '+')
  const axes = sorted.some((v) => v.italic)
    ? `ital,wght@${sorted.map((v) => `${+v.italic},${v.weight}`).join(';')}`
    : `wght@${sorted.map((v) => v.weight).join(';')}`
  return `${CSS_URL}?family=${name}:${axes}`
}

/** Blocchi @font-face del CSS di Google: stile, peso e indirizzo del file */
export function parseFontCss(css: string): { italic: boolean; weight: number; url: string }[] {
  const out: { italic: boolean; weight: number; url: string }[] = []
  for (const block of css.match(/@font-face\s*{[^}]*}/g) ?? []) {
    const style = block.match(/font-style:\s*(\w+)/)?.[1]
    const weight = Number(block.match(/font-weight:\s*(\d+)/)?.[1])
    const url = block.match(/src:\s*url\(([^)]+)\)/)?.[1]
    if (url && weight) out.push({ italic: style === 'italic', weight, url })
  }
  return out
}
