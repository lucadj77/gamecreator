// Testo formattato di Tabletop Creator (tag in stile TextMeshPro: <b>, <color=#..>, <size=..>,
// <align=..>, <br>...) convertito nel markup di Naibi (docs/specifica.md, 2.1).

/** Da mm (unità delle dimensioni di testo di Tabletop Creator) a punti */
export const MM_TO_PT = 72 / 25.4

interface Node {
  tag: string
  value: string
  children: (Node | string)[]
}

interface Line {
  text: string
  align?: string
}

export interface RichTextResult {
  text: string
  /** Tag non convertiti, senza ripetizioni */
  unsupported: string[]
}

const TAG = /<\/?([a-zA-Z-]+)(?:\s*=\s*("[^"]*"|'[^']*'|[^>]*))?\s*>/g

/** Tag con apertura e chiusura che si convertono in formattazione */
const PAIRED = new Set([
  'b',
  'i',
  'u',
  's',
  'sup',
  'sub',
  'color',
  'size',
  'font',
  'mark',
  'align',
  'uppercase',
  'lowercase',
  'allcaps',
  'smallcaps',
  'cspace',
  'voffset'
])

export function convertRichText(src: string): RichTextResult {
  const unsupported = new Set<string>()
  const root: Node = { tag: '', value: '', children: [] }
  const stack: Node[] = [root]
  let last = 0
  const pushText = (t: string): void => {
    if (t) stack[stack.length - 1].children.push(t)
  }
  for (const m of src.matchAll(TAG)) {
    const name = m[1].toLowerCase()
    const closing = m[0].startsWith('</')
    pushText(src.slice(last, m.index))
    last = m.index! + m[0].length
    if (name === 'br') {
      pushText('\n')
      continue
    }
    if (!PAIRED.has(name)) {
      unsupported.add(name)
      continue
    }
    if (closing) {
      // chiude il tag aperto più vicino con lo stesso nome, e quelli rimasti aperti dentro
      const at = stack.map((n) => n.tag).lastIndexOf(name)
      if (at > 0) stack.length = at
      continue
    }
    const value = (m[2] ?? '').trim().replace(/^["']|["']$/g, '')
    const node: Node = { tag: name, value, children: [] }
    stack[stack.length - 1].children.push(node)
    stack.push(node)
  }
  pushText(src.slice(last))
  const lines = render(root, unsupported)
  return {
    text: lines.map((l) => (l.align ? `{${l.align}} ` : '') + escapeLineStart(l.text)).join('\n'),
    unsupported: [...unsupported]
  }
}

function render(node: Node, unsupported: Set<string>): Line[] {
  const lines: Line[] = [{ text: '' }]
  for (const c of node.children) {
    const part = typeof c === 'string' ? textLines(c) : render(c, unsupported)
    lines[lines.length - 1].text += part[0].text
    lines[lines.length - 1].align ??= part[0].align
    lines.push(...part.slice(1))
  }
  if (!node.tag) return lines
  if (node.tag === 'align') {
    const a = node.value.toLowerCase()
    const align = a === 'center' || a === 'right' || a === 'justified' || a === 'left' ? a : null
    if (align) for (const l of lines) l.align = align === 'justified' ? 'justify' : align
    return lines
  }
  const wrap = wrapper(node, unsupported)
  return lines.map((l) => ({ ...l, text: wrap ? wrapText(l.text, wrap) : l.text }))
}

type Wrap = { open: string; close: string } | { attrs: string }

function wrapper(node: Node, unsupported: Set<string>): Wrap | null {
  const v = node.value
  switch (node.tag) {
    case 'b':
      return { open: '**', close: '**' }
    case 'i':
      return { open: '*', close: '*' }
    case 'u':
      return { open: '++', close: '++' }
    case 's':
      return { open: '~~', close: '~~' }
    case 'sup':
      return { open: '^', close: '^' }
    case 'sub':
      return { open: '~', close: '~' }
    case 'uppercase':
    case 'allcaps':
      return { attrs: 'upper' }
    case 'lowercase':
      return { attrs: 'lower' }
    case 'smallcaps':
      return { attrs: 'smallcaps' }
    case 'color':
      return v ? { attrs: `color=${v}` } : null
    case 'mark':
      return v ? { attrs: `highlight=${v}` } : null
    case 'font':
      // nel markup gli spazi del nome si scrivono come _
      return v ? { attrs: `font=${v.replace(/\s+/g, '_')}` } : null
    case 'size': {
      const size = convertSize(v)
      if (size) return { attrs: `size=${size}` }
      unsupported.add('size')
      return null
    }
    case 'cspace': {
      // in em: 0.1em = 100‰
      const n = parseFloat(v)
      return Number.isFinite(n) && v.endsWith('em') ? { attrs: `spacing=${round(n * 1000)}` } : null
    }
    case 'voffset': {
      const n = parseFloat(v)
      return Number.isFinite(n) ? { attrs: `raise=${round(n * MM_TO_PT)}` } : null
    }
    default:
      return null
  }
}

/** <size=140%>, <size=5> (mm come le dimensioni del pannello), <size=+1> */
function convertSize(v: string): string | null {
  const m = v.match(/^([+-]?)(\d+(?:\.\d+)?)(%|em|px|pt)?$/)
  if (!m) return null
  const n = Number(m[2])
  if (m[3] === '%') return m[1] ? null : `${round(n)}%`
  if (m[3] === 'em') return m[1] ? null : `${round(n * 100)}%`
  return `${m[1]}${round(n * MM_TO_PT)}`
}

const round = (n: number): number => Math.round(n * 100) / 100

/**
 * Avvolge il testo di una riga: gli spazi ai bordi restano fuori dai delimitatori, perché
 * `** testo**` non sarebbe un grassetto.
 */
function wrapText(text: string, w: Wrap): string {
  const m = text.match(/^(\s*)([\s\S]*?)(\s*)$/)!
  if (!m[2]) return text
  if ('attrs' in w) {
    // un riquadro che contiene solo un altro riquadro ne prende gli attributi
    const inner = m[2].match(/^\[([^[\]]*)\]\{([^{}]*)\}$/)
    if (inner) return `${m[1]}[${inner[1]}]{${w.attrs} ${inner[2]}}${m[3]}`
    return `${m[1]}[${m[2]}]{${w.attrs}}${m[3]}`
  }
  return `${m[1]}${w.open}${m[2]}${w.close}${m[3]}`
}

/** Testo semplice: i caratteri che nel markup hanno un significato diventano letterali */
function textLines(s: string): Line[] {
  return s.split(/\r?\n/).map((line) => ({ text: escapeInline(line) }))
}

function escapeInline(s: string): string {
  return (
    s
      .replace(/\\/g, '\\\\')
      .replace(/([*~^[\]])/g, '\\$1')
      // ++ e == solo in coppia
      .replace(/\+\+/g, '\\++')
      .replace(/==/g, '\\==')
  )
}

/** A inizio riga #, > e --- avrebbero un significato; gli elenchi si tengono */
function escapeLineStart(s: string): string {
  if (/^#/.test(s) || /^>/.test(s) || /^-{3,}\s*$/.test(s)) return '\\' + s
  return s
}
