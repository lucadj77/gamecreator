import { BLOCK_STYLE, parseMarkup, resolveStyles, type Attrs, type Inline } from './markup'
import { resolveFont, type Variables } from './variables'

// Font richiamati dai testi: quello del livello e quelli del markup (font= e stili)

/** Famiglie generiche del CSS: ci sono sempre */
export const GENERIC_FONTS = [
  'serif',
  'sans-serif',
  'monospace',
  'cursive',
  'fantasy',
  'system-ui',
  'ui-serif',
  'ui-sans-serif',
  'ui-monospace',
  'ui-rounded'
]

export function isGenericFont(family: string): boolean {
  return GENERIC_FONTS.includes(family.trim().toLowerCase())
}

/** Famiglie scritte nel markup di un testo, direttamente o attraverso gli stili */
export function markupFonts(
  src: string,
  styles: Record<string, string> = {},
  variables?: Variables
): string[] {
  const out = new Set<string>()
  const add = (a: Attrs): void => {
    const font = resolveStyles(a, styles).font
    // negli stili il font può essere una variabile: font={titoli}
    if (font) out.add(resolveFont(font, variables))
  }
  const walk = (list: Inline[]): void =>
    list.forEach((n) => {
      if (n.t !== 'span') return
      add(n.attrs)
      walk(n.children)
    })
  for (const b of parseMarkup(src).blocks) {
    const style = BLOCK_STYLE[b.kind]
    if (style) add({ styles: [style] })
    add(b.attrs)
    walk(b.children)
  }
  return [...out]
}
