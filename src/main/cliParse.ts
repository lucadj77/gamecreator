import Papa from 'papaparse'
import { en } from '../renderer/src/i18n/en'
import type { Message } from '../shared/messages'
import type { Sheet } from '../shared/project'

// Parti del comando naibi che non usano Electron: argomenti, messaggi, file di righe.

export class CliError extends Error {}

/** Testo inglese di un messaggio dell'app */
export function messageText(m: Message): string {
  const text = (en as Record<string, string>)[m.key] ?? m.key
  return text.replace(/\{(\w+)\}/g, (s, name: string) => {
    const p = m.params?.[name]
    return p === undefined ? s : typeof p === 'object' ? messageText(p) : String(p)
  })
}

export interface Parsed {
  positional: string[]
  flags: Record<string, string | true>
}

export function parseArgs(args: string[]): Parsed {
  const positional: string[] = []
  const flags: Record<string, string | true> = {}
  for (let i = 0; i < args.length; i++) {
    const a = args[i]
    if (!a.startsWith('--')) {
      positional.push(a)
      continue
    }
    const [name, value] = a.slice(2).split(/=(.*)/s)
    if (value !== undefined) flags[name] = value
    else if (args[i + 1] !== undefined && !args[i + 1].startsWith('--')) {
      // i flag senza valore
      if (['json', 'csv'].includes(name)) flags[name] = true
      else flags[name] = args[++i]
    } else flags[name] = true
  }
  return { positional, flags }
}

/** "1,3,5-7" → [1, 3, 5, 6, 7] */
export function parseCardList(spec: string): number[] {
  const out: number[] = []
  for (const part of spec.split(',')) {
    const m = /^\s*(\d+)\s*(?:-\s*(\d+))?\s*$/.exec(part)
    if (!m) throw new CliError(`invalid card list "${spec}"`)
    const a = Number(m[1])
    const b = m[2] ? Number(m[2]) : a
    for (let n = Math.min(a, b); n <= Math.max(a, b); n++) out.push(n)
  }
  return [...new Set(out)]
}

/** Righe da un file .csv (prima riga intestazioni) o .json (oggetti o matrice) */
export function parseRowsFile(text: string, json: boolean): Pick<Sheet, 'headers' | 'rows'> {
  if (json) {
    const data = JSON.parse(text)
    if (!Array.isArray(data)) throw new CliError('the JSON file must contain an array')
    if (data.every((r) => Array.isArray(r))) {
      const [headers = [], ...rest] = data as unknown[][]
      return { headers: headers.map(String), rows: rest.map((r) => r.map((c) => String(c ?? ''))) }
    }
    const headers: string[] = []
    for (const r of data as Record<string, unknown>[])
      for (const k of Object.keys(r ?? {})) if (!headers.includes(k)) headers.push(k)
    return {
      headers,
      rows: (data as Record<string, unknown>[]).map((r) =>
        headers.map((h) => (r?.[h] === undefined || r[h] === null ? '' : String(r[h])))
      )
    }
  }
  const parsed = Papa.parse<string[]>(text.replace(/^\uFEFF/, ''), { skipEmptyLines: true })
  const [headers = [], ...rest] = parsed.data
  return { headers, rows: rest.map((r) => headers.map((_, i) => r[i] ?? '')) }
}
