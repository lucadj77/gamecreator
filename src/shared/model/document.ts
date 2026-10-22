import type { LoadedSet } from '../project'
import { msg, type Message } from '../messages'
import { markupProblems, markupRefs } from './markup'
import { substituteFields } from './bind'
import { imageVariable, variableFields, type Variables } from './variables'
import { resolveAsset } from './assets'
import { today } from './system'
import type { HAlign, Side } from './template'

// Documenti del progetto (docs/<nome>.md): regolamento, sell sheet, appendici. Sono Markdown con
// il markup di Naibi nel testo ({icona}, [testo]{.stile}) e le carte del progetto come immagini:
// ![Mago](card:Personaggi/nome=Mago) disegna la carta dal progetto, quindi si aggiorna da sola.

export const DOCUMENTS_DIR = 'docs'

/** Un'immagine scritta come ![testo](sorgente), con la posizione nel documento */
export interface DocImage {
  alt: string
  src: string
  from: number
  to: number
}

export interface DocListItem {
  text: string
  /** Livello di rientro, da 0 */
  depth: number
  ordered: boolean
  /** Numero della voce negli elenchi numerati */
  number: number
}

export type DocBlock = { from: number } & (
  | { kind: 'heading'; level: 1 | 2 | 3; text: string }
  | { kind: 'paragraph'; text: string }
  | { kind: 'list'; items: DocListItem[] }
  | { kind: 'quote'; text: string }
  | {
      kind: 'table'
      header: string[]
      align: (HAlign | null)[]
      rows: string[][]
      /** Fine dell'ultima riga della tabella nel testo: lo strumento tabella la riscrive */
      to: number
    }
  | { kind: 'rule' }
  | { kind: 'code'; text: string }
  /** Una riga con sole immagini: una o più carte (o immagini) affiancate */
  | { kind: 'figure'; images: DocImage[] }
)

const IMAGE = /!\[([^\]]*)\]\(([^)]*)\)/g
const ONLY_IMAGES = /^\s*(?:!\[[^\]]*\]\([^)]*\)\s*)+$/
const LIST_ITEM = /^(\s*)([-*+]|\d+[.)])\s+(.*)$/
const TABLE_SEPARATOR = /^\s*\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)*\|?\s*$/

/** Divide il documento in blocchi: titoli, paragrafi, elenchi, citazioni, tabelle, immagini */
export function parseDocument(src: string): DocBlock[] {
  const lines = src.replace(/\r\n?/g, '\n').split('\n')
  const starts: number[] = []
  let pos = 0
  for (const l of lines) {
    starts.push(pos)
    pos += l.length + 1
  }
  const blocks: DocBlock[] = []
  // le impostazioni della pagina in testa non sono testo
  let i = frontMatterLines(lines)
  const blank = (l: string | undefined): boolean => l === undefined || l.trim() === ''
  while (i < lines.length) {
    const line = lines[i]
    const from = starts[i]
    if (blank(line)) {
      i++
      continue
    }
    const fence = /^\s*(```|~~~)/.exec(line)
    if (fence) {
      const body: string[] = []
      i++
      while (i < lines.length && !lines[i].trimStart().startsWith(fence[1])) body.push(lines[i++])
      i++
      blocks.push({ kind: 'code', text: body.join('\n'), from })
      continue
    }
    const heading = /^\s{0,3}(#{1,6})\s+(.*?)\s*#*\s*$/.exec(line)
    if (heading) {
      const level = Math.min(3, heading[1].length) as 1 | 2 | 3
      blocks.push({ kind: 'heading', level, text: heading[2], from })
      i++
      continue
    }
    if (/^\s{0,3}([-*_])(\s*\1){2,}\s*$/.test(line)) {
      blocks.push({ kind: 'rule', from })
      i++
      continue
    }
    if (/^\s{0,3}>/.test(line)) {
      const body: string[] = []
      while (i < lines.length && /^\s{0,3}>/.test(lines[i]))
        body.push(lines[i++].replace(/^\s{0,3}> ?/, ''))
      blocks.push({ kind: 'quote', text: joinLines(body), from })
      continue
    }
    if (LIST_ITEM.test(line)) {
      const items: DocListItem[] = []
      // rientri delle voci aperte: una voce più rientrata della precedente scende di livello
      const indents: number[] = []
      /** Righe di ogni voce */
      const parts: string[][] = []
      while (i < lines.length) {
        const l = lines[i]
        const m = LIST_ITEM.exec(l)
        if (m) {
          const indent = m[1].replace(/\t/g, '    ').length
          while (indents.length && indent < indents[indents.length - 1]) indents.pop()
          if (!indents.length || indent > indents[indents.length - 1]) indents.push(indent)
          const ordered = /\d/.test(m[2])
          // il numero scritto: conta solo quello della prima voce (numberItems)
          items.push({
            text: '',
            depth: indents.length - 1,
            ordered,
            number: parseInt(m[2], 10) || 0
          })
          parts.push([m[3]])
          i++
          continue
        }
        if (blank(l)) {
          // una riga vuota chiude l'elenco, a meno che dopo non venga un'altra voce dello stesso
          // tipo (puntato o numerato)
          let j = i
          while (j < lines.length && blank(lines[j])) j++
          const after = LIST_ITEM.exec(lines[j] ?? '')
          if (after && /\d/.test(after[2]) === items[0].ordered) {
            i = j
            continue
          }
          break
        }
        // riga che continua la voce: rientrata, o subito dopo senza riga vuota
        if (!startsBlock(l)) {
          parts[parts.length - 1].push(l.trim())
          i++
          continue
        }
        break
      }
      items.forEach((it, k) => (it.text = joinLines(parts[k])))
      blocks.push({ kind: 'list', items: numberItems(items), from })
      continue
    }
    if (line.includes('|') && TABLE_SEPARATOR.test(lines[i + 1] ?? '')) {
      const header = splitRow(line)
      const align = splitRow(lines[i + 1]).map((c): HAlign | null => {
        const left = c.startsWith(':')
        const right = c.endsWith(':')
        return left && right ? 'center' : right ? 'right' : left ? 'left' : null
      })
      i += 2
      const rows: string[][] = []
      while (i < lines.length && !blank(lines[i]) && lines[i].includes('|')) {
        const cells = splitRow(lines[i++])
        rows.push(header.map((_, k) => cells[k] ?? ''))
      }
      blocks.push({
        kind: 'table',
        header,
        align: header.map((_, k) => align[k] ?? null),
        rows,
        from,
        to: starts[i - 1] + lines[i - 1].length
      })
      continue
    }
    // paragrafo: fino a una riga vuota o all'inizio di un altro blocco
    const body: string[] = []
    while (i < lines.length && !blank(lines[i]) && (body.length === 0 || !startsBlock(lines[i])))
      body.push(lines[i++])
    const text = body.join('\n')
    if (ONLY_IMAGES.test(text)) {
      const images: DocImage[] = []
      for (const m of text.matchAll(IMAGE)) {
        const at = from + (m.index ?? 0)
        images.push({ alt: m[1], src: m[2].trim(), from: at, to: at + m[0].length })
      }
      blocks.push({ kind: 'figure', images, from })
    } else blocks.push({ kind: 'paragraph', text: joinLines(body), from })
  }
  return blocks
}

/** Una riga che apre un blocco nuovo anche senza una riga vuota prima */
function startsBlock(l: string): boolean {
  return (
    /^\s{0,3}(#{1,6}\s|>|```|~~~)/.test(l) ||
    LIST_ITEM.test(l) ||
    /^\s{0,3}([-*_])(\s*\1){2,}\s*$/.test(l)
  )
}

/** Numeri delle voci: ogni elenco numerato riparte dal numero scritto nella sua prima voce */
function numberItems(items: DocListItem[]): DocListItem[] {
  /** Prossimo numero per livello; si azzera quando si torna a un livello più esterno */
  const next: (number | undefined)[] = []
  return items.map((it) => {
    next.length = it.depth + 1
    if (!it.ordered) {
      next[it.depth] = undefined
      return { ...it, number: 0 }
    }
    const number = next[it.depth] ?? (it.number || 1)
    next[it.depth] = number + 1
    return { ...it, number }
  })
}

/**
 * Righe di un paragrafo unite come nel Markdown: un a capo semplice è uno spazio; due spazi o
 * "\" a fine riga vanno a capo
 */
function joinLines(lines: string[]): string {
  let out = ''
  lines.forEach((l, k) => {
    if (k === lines.length - 1) {
      out += l.trim()
      return
    }
    if (/ {2,}$/.test(l) || /(^|[^\\])\\$/.test(l.trimEnd())) {
      out += l.trimEnd().replace(/\\$/, '') + '\n'
      return
    }
    out += l.trim() + ' '
  })
  return out.trim()
}

/** Testo Markdown di una tabella, con le colonne allineate perché si legga anche così */
export function tableSource(header: string[], align: (HAlign | null)[], rows: string[][]): string {
  const cell = (s: string): string => s.replace(/\r?\n/g, ' ').replace(/\\?\|/g, '\\|').trim()
  const all = [header, ...rows].map((r) => header.map((_, k) => cell(r[k] ?? '')))
  const width = header.map((_, k) => Math.max(3, ...all.map((r) => r[k].length)))
  const line = (r: string[]): string => `| ${r.map((c, k) => c.padEnd(width[k])).join(' | ')} |`
  const sep = header.map((_, k) => {
    const a = align[k]
    const dashes = '-'.repeat(width[k] - (a === 'center' ? 2 : a ? 1 : 0))
    return a === 'center'
      ? `:${dashes}:`
      : a === 'right'
        ? `${dashes}:`
        : a === 'left'
          ? `:${dashes}`
          : dashes
  })
  return [line(all[0]), `| ${sep.join(' | ')} |`, ...all.slice(1).map(line)].join('\n')
}

/** Celle di una riga di tabella; \| è una barra nel testo */
function splitRow(line: string): string[] {
  let l = line.trim()
  if (l.startsWith('|')) l = l.slice(1)
  if (l.endsWith('|') && !l.endsWith('\\|')) l = l.slice(0, -1)
  const cells: string[] = []
  let cell = ''
  for (let k = 0; k < l.length; k++) {
    if (l[k] === '\\' && l[k + 1] === '|') {
      cell += '|'
      k++
    } else if (l[k] === '|') {
      cells.push(cell.trim())
      cell = ''
    } else cell += l[k]
  }
  cells.push(cell.trim())
  return cells
}

// ——— Pagina ———

/** Aspetto della pagina, scritto in testa al documento tra due righe --- */
export interface DocSettings {
  page: DocPage
  /** Margini in mm */
  margin: number
  /** Famiglia del testo; vuota per quella di base */
  font: string
  /** Famiglia dei titoli; vuota per quella del testo */
  headingFont: string
  /** Corpo del testo in punti */
  size: number
  /** Interlinea, in multipli del corpo */
  lineHeight: number
  /** Spazio dopo ogni paragrafo, in punti */
  paragraphSpacing: number
  align: 'left' | 'justify'
  color: string
  /** Colore dei titoli; vuoto per quello del testo */
  headingColor: string
}

export type DocPage = 'A4' | 'A5' | 'Letter'

/** Larghezza e altezza delle pagine in mm */
export const DOC_PAGES: Record<DocPage, [number, number]> = {
  A4: [210, 297],
  A5: [148, 210],
  Letter: [215.9, 279.4]
}

export const DEFAULT_DOC_SETTINGS: DocSettings = {
  page: 'A4',
  margin: 18,
  font: '',
  headingFont: '',
  size: 11,
  lineHeight: 1.4,
  paragraphSpacing: 6,
  align: 'left',
  color: '#1d1d1f',
  headingColor: ''
}

const SETTING_KEYS = Object.keys(DEFAULT_DOC_SETTINGS) as (keyof DocSettings)[]
const FRONT_LINE = /^\s*([A-Za-z][\w-]*)\s*:(.*)$/

/** Righe occupate dalle impostazioni in testa (--- chiave: valore ---), 0 se non ci sono */
function frontMatterLines(lines: string[]): number {
  if (lines[0]?.trim() !== '---') return 0
  for (let k = 1; k < lines.length; k++) {
    const l = lines[k]
    if (l.trim() === '---') return k + 1
    if (l.trim() && !l.trim().startsWith('#') && !FRONT_LINE.test(l)) return 0
  }
  return 0
}

/** Un valore valido per l'impostazione, o null */
function settingValue<K extends keyof DocSettings>(key: K, raw: string): DocSettings[K] | null {
  const v = raw
    .trim()
    .replace(/^(["'])(.*)\1$/, '$2')
    .trim()
  const num = (min: number, max: number): number | null => {
    const n = Number(v.replace(',', '.'))
    return v !== '' && Number.isFinite(n) && n >= min && n <= max ? n : null
  }
  let out: unknown
  switch (key) {
    case 'page':
      out = (Object.keys(DOC_PAGES) as DocPage[]).find((p) => p.toLowerCase() === v.toLowerCase())
      break
    case 'margin':
      out = num(0, 60)
      break
    case 'size':
      out = num(5, 30)
      break
    case 'lineHeight':
      out = num(0.8, 3)
      break
    case 'paragraphSpacing':
      out = num(0, 40)
      break
    case 'align':
      out = v === 'left' || v === 'justify' ? v : null
      break
    default:
      out = v
  }
  return (out ?? null) as DocSettings[K] | null
}

/** Impostazioni della pagina scritte in testa al documento, con quelle scritte male */
export function documentSettings(src: string): {
  settings: DocSettings
  problems: DocumentProblem[]
} {
  const settings = { ...DEFAULT_DOC_SETTINGS }
  const problems: DocumentProblem[] = []
  const lines = src.replace(/\r\n?/g, '\n').split('\n')
  const end = frontMatterLines(lines)
  let pos = lines[0].length + 1
  for (let k = 1; k < end - 1; k++) {
    const l = lines[k]
    const at = { from: pos, to: pos + l.length }
    pos += l.length + 1
    const m = FRONT_LINE.exec(l)
    if (!m || l.trim().startsWith('#')) continue
    const key = SETTING_KEYS.find((x) => x.toLowerCase() === m[1].toLowerCase())
    if (!key) {
      problems.push({ message: msg('doc.setting.unknown', { name: m[1] }), ...at })
      continue
    }
    const value = settingValue(key, m[2])
    if (value === null)
      problems.push({ message: msg('doc.setting.bad', { name: key, value: m[2].trim() }), ...at })
    else (settings as Record<string, unknown>)[key] = value
  }
  return { settings, problems }
}

/**
 * Il documento con le impostazioni cambiate: si riscrive solo la testa; quelle tornate al valore
 * di base si tolgono, e senza impostazioni la testa sparisce
 */
export function withDocumentSettings(src: string, change: Partial<DocSettings>): string {
  const lines = src.replace(/\r\n?/g, '\n').split('\n')
  const end = frontMatterLines(lines)
  const head = end ? lines.slice(1, end - 1) : []
  let body = lines.slice(end).join('\n')
  for (const key of Object.keys(change) as (keyof DocSettings)[]) {
    const value = change[key]
    const at = head.findIndex((l) => FRONT_LINE.exec(l)?.[1].toLowerCase() === key.toLowerCase())
    const keep = value !== undefined && value !== DEFAULT_DOC_SETTINGS[key]
    const line = `${key}: ${value}`
    if (at >= 0) {
      if (keep) head[at] = line
      else head.splice(at, 1)
    } else if (keep) head.push(line)
  }
  if (!head.some((l) => l.trim())) return end ? body.replace(/^\n+/, '') : body
  if (!end) body = '\n' + body
  return ['---', ...head, '---', body].join('\n')
}

// ——— Testo ———

/** Ciò che il testo di un documento richiama del progetto */
export interface DocumentContext {
  project?: string
  sets?: LoadedSet[]
  assets?: string[]
  styles?: Record<string, string>
  variables?: Variables
}

/**
 * Testo di un blocco pronto per il markup: variabili di testo e valore e {project.name} e {date}
 * sostituite; un collegamento [testo](indirizzo) diventa testo sottolineato
 */
export function documentText(text: string, ctx: DocumentContext): string {
  const fields = {
    ...variableFields(ctx.variables),
    'project.name': ctx.project ?? '',
    date: today()
  }
  return substituteFields(text, fields).replace(
    /(?<![!\\])\[([^\]]+)\]\(([^)\s]+)\)/g,
    (_, label: string) => `[${label}]{underline}`
  )
}

// ——— Carte ———

/** Una carta richiamata con card:Set/3 o card:Set/campo=valore, con le opzioni dopo ? */
export interface CardRef {
  set: string
  /** Riga del set, da 1 */
  row?: number
  field?: string
  value?: string
  side: Side
  /** Larghezza in mm; di base la misura vera della carta */
  width?: number
}

export const CARD_PREFIX = 'card:'

export const isCardSource = (src: string): boolean =>
  src.trim().toLowerCase().startsWith(CARD_PREFIX)

const decode = (s: string): string => {
  try {
    return decodeURIComponent(s)
  } catch {
    return s
  }
}

/** Legge card:Set/3?side=back&width=40; un errore se è scritto male */
export function parseCardRef(src: string): CardRef | Message {
  const raw = src.trim()
  const bad = msg('doc.card.badRef', { ref: raw })
  if (!isCardSource(raw)) return bad
  const body = raw.slice(CARD_PREFIX.length)
  const q = body.indexOf('?')
  const path = q < 0 ? body : body.slice(0, q)
  const slash = path.indexOf('/')
  if (slash <= 0) return bad
  const set = decode(path.slice(0, slash)).trim()
  const selector = decode(path.slice(slash + 1)).trim()
  if (!set || !selector) return bad
  const ref: CardRef = { set, side: 'front' }
  const eq = selector.indexOf('=')
  if (eq > 0) {
    ref.field = selector.slice(0, eq).trim()
    ref.value = selector.slice(eq + 1).trim()
  } else if (/^\d+$/.test(selector) && Number(selector) > 0) ref.row = Number(selector)
  else return bad
  if (q >= 0)
    for (const part of body.slice(q + 1).split('&')) {
      if (!part.trim()) continue
      const [k, v = ''] = part.split('=').map((x) => decode(x).trim())
      if (k === 'side' && (v === 'front' || v === 'back')) ref.side = v
      else if (k === 'width' && Number(v) > 0) ref.width = Number(v)
      else return msg('doc.card.badOption', { option: part, ref: raw })
    }
  return ref
}

/** Testo da scrivere per richiamare una carta, come lo legge parseCardRef */
export function cardRefSource(ref: CardRef): string {
  // una parentesi chiusa o un ? finirebbero il riferimento: si scrivono codificati
  const enc = (s: string): string =>
    s.replace(/[%)?&]/g, (c) => '%' + c.charCodeAt(0).toString(16).toUpperCase())
  const selector = ref.field ? `${enc(ref.field)}=${enc(ref.value ?? '')}` : String(ref.row ?? 1)
  const opts = [
    ref.side === 'back' ? 'side=back' : '',
    ref.width ? `width=${ref.width}` : ''
  ].filter(Boolean)
  return `${CARD_PREFIX}${enc(ref.set)}/${selector}${opts.length ? `?${opts.join('&')}` : ''}`
}

const same = (a: string, b: string): boolean => a.trim().toLowerCase() === b.trim().toLowerCase()

/** Il set e la riga (da 0) della carta richiamata, o il motivo per cui non c'è */
export function findCard(
  ref: CardRef,
  sets: LoadedSet[]
): { set: LoadedSet; row: number } | Message {
  const set = sets.find((s) => s.name === ref.set) ?? sets.find((s) => same(s.name, ref.set))
  if (!set) return msg('doc.card.noSet', { set: ref.set })
  const rows = set.data?.rows ?? []
  if (ref.row !== undefined) {
    if (ref.row > rows.length) return msg('doc.card.noRow', { set: set.name, n: ref.row })
    return { set, row: ref.row - 1 }
  }
  const headers = set.data?.headers ?? []
  const field = ref.field ?? ''
  const col =
    headers.indexOf(field) >= 0 ? headers.indexOf(field) : headers.findIndex((h) => same(h, field))
  if (col < 0) return msg('doc.card.noField', { set: set.name, field })
  const value = ref.value ?? ''
  let row = rows.findIndex((r) => (r[col] ?? '').trim() === value)
  if (row < 0) row = rows.findIndex((r) => same(r[col] ?? '', value))
  if (row < 0) return msg('doc.card.noValue', { set: set.name, field: headers[col], value })
  return { set, row }
}

export const isMessage = (x: object): x is Message => 'key' in x

// ——— Controllo ———

export interface DocumentProblem {
  message: Message
  /** Posizione nel documento */
  from: number
  to: number
}

/**
 * Problemi di un documento: carte e immagini che non si trovano, errori del markup, stili e
 * {nomi} sconosciuti
 */
export function documentProblems(src: string, ctx: DocumentContext): DocumentProblem[] {
  const out: DocumentProblem[] = [...documentSettings(src).problems]
  const texts: { text: string; from: number }[] = []
  for (const b of parseDocument(src)) {
    switch (b.kind) {
      case 'heading':
      case 'paragraph':
      case 'quote':
        texts.push({ text: b.text, from: b.from })
        break
      case 'list':
        b.items.forEach((it) => texts.push({ text: it.text, from: b.from }))
        break
      case 'table':
        ;[b.header, ...b.rows].forEach((r) =>
          r.forEach((c) => texts.push({ text: c, from: b.from }))
        )
        break
      case 'figure':
        for (const img of b.images) {
          const problem = imageProblem(img.src, ctx)
          if (problem) out.push({ message: problem, from: img.from, to: img.to })
        }
        break
    }
  }
  for (const { text, from } of texts) {
    const prepared = documentText(text, ctx)
    const at = { from, to: from + Math.max(1, text.length) }
    for (const p of markupProblems(prepared, ctx.styles ?? {}))
      out.push({ message: p.message, ...at })
    if (ctx.assets)
      for (const name of new Set(markupRefs(prepared))) {
        if (!name) continue
        const v = imageVariable(name, ctx.variables)
        const r = resolveAsset(v ? v.src : name, ctx.assets)
        if (r.ok) continue
        out.push({
          message: v
            ? msg('doc.missingVariableImage', { name, src: v.src })
            : msg(r.reason === 'ambiguous' ? 'doc.ambiguousRef' : 'doc.unknownRef', { name }),
          ...at
        })
      }
  }
  return out.sort((a, b) => a.from - b.from)
}

/** Perché un'immagine del documento non si può mostrare, o null se si trova */
export function imageProblem(src: string, ctx: DocumentContext): Message | null {
  if (isCardSource(src)) {
    const ref = parseCardRef(src)
    if (isMessage(ref)) return ref
    if (!ctx.sets) return null
    const found = findCard(ref, ctx.sets)
    return isMessage(found) ? found : null
  }
  if (!ctx.assets || /^https?:\/\//i.test(src)) return null
  const name = src.replace(/^\{(.*)\}$/, '$1')
  const v = imageVariable(name, ctx.variables)
  const r = resolveAsset(v ? v.src : name, ctx.assets)
  if (r.ok) return null
  return msg(r.reason === 'ambiguous' ? 'doc.ambiguousRef' : 'doc.missingImage', { name: src })
}
