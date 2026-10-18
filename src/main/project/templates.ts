import { access, mkdir, rename, writeFile } from 'fs/promises'
import { join } from 'path'
import { shell } from 'electron'
import {
  denormalizeTemplate,
  isValidTemplateName,
  type RawTemplate
} from '../../shared/model/normalize'
import type { Template } from '../../shared/model/template'
import { MessageError, msg } from '../../shared/messages'

/** Scrive templates/<file>.json con le sole proprietà diverse dai default */
export async function saveTemplate(folder: string, template: Template): Promise<void> {
  const file = template.file ?? template.name
  if (!isValidTemplateName(file))
    throw new MessageError(msg('template.invalidName', { name: file }))
  const dir = join(folder, 'templates')
  await mkdir(dir, { recursive: true })
  const target = join(dir, `${file}.json`)
  // con file diverso dal nome il nome va scritto, altrimenti si ricava dal file
  const content: Partial<RawTemplate> = denormalizeTemplate(template)
  if (!template.file) delete content.name
  // scrittura in un file temporaneo e rinomina: un errore a metà non tronca il template
  const tmp = `${target}.tmp`
  await writeFile(tmp, formatTemplate(content) + '\n', 'utf8')
  await rename(tmp, target)
}

/** Sposta templates/<file>.json nel cestino del sistema, così si può ancora recuperare */
export async function trashTemplate(folder: string, file: string): Promise<void> {
  if (!isValidTemplateName(file))
    throw new MessageError(msg('template.invalidName', { name: file }))
  const target = join(folder, 'templates', `${file}.json`)
  try {
    await access(target)
  } catch {
    // mai salvato: non c'è nulla da spostare
    return
  }
  await shell.trashItem(target)
}

/**
 * JSON con un livello per riga, come i file scritti a mano: le differenze in git restano
 * leggibili. I gruppi vanno a capo per mostrare i figli.
 */
export function formatTemplate(value: unknown, indent = ''): string {
  const inner = indent + '  '
  if (Array.isArray(value)) {
    if (!value.length) return '[]'
    return `[\n${value.map((v) => inner + formatTemplate(v, inner)).join(',\n')}\n${indent}]`
  }
  if (value && typeof value === 'object') {
    const entries = Object.entries(value)
    const isLayer = 'type' in value
    if (isLayer && !('children' in value)) return oneLine(value)
    return `{\n${entries
      .map(([k, v]) => `${inner}${JSON.stringify(k)}: ${formatTemplate(v, inner)}`)
      .join(',\n')}\n${indent}}`
  }
  return JSON.stringify(value)
}

function oneLine(value: object): string {
  const body = Object.entries(value)
    .map(([k, v]) => `${JSON.stringify(k)}: ${inline(v)}`)
    .join(', ')
  return `{ ${body} }`
}

/** Valori annidati su una riga, con spazi dopo : e , solo fuori dalle stringhe */
function inline(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(inline).join(', ')}]`
  if (v && typeof v === 'object')
    return `{${Object.entries(v)
      .map(([k, x]) => `${JSON.stringify(k)}: ${inline(x)}`)
      .join(', ')}}`
  return JSON.stringify(v)
}
