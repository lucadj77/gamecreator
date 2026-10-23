import { ROOTS, getAll, put } from './idb'

// Cartelle che l'utente ha scelto nel browser. Il browser non dà percorsi veri: ogni cartella
// scelta diventa /<nome>, e i file sotto di essa /<nome>/sotto/file. Così il codice del progetto
// (src/main/project) lavora con percorsi come nell'app desktop, attraverso shims/fs.ts.

const roots = new Map<string, FileSystemDirectoryHandle>()

/**
 * Dati dell'app (impostazioni dei backup, cataloghi): nello spazio privato del sito, che il
 * browser non mostra e non chiede di autorizzare. Il punto all'inizio lo separa dalle cartelle
 * scelte, che non possono chiamarsi così.
 */
const DATA_KEY = '.stella'
export const DATA_ROOT = '/' + DATA_KEY

/** Le cartelle già autorizzate in passato, da leggere prima di avviare l'app */
export async function loadRoots(): Promise<void> {
  try {
    roots.set(DATA_KEY, await navigator.storage.getDirectory())
  } catch (e) {
    console.error(e)
  }
  try {
    for (const { key, value } of await getAll<FileSystemDirectoryHandle>(ROOTS))
      roots.set(key, value)
  } catch (e) {
    console.error(e)
  }
}

/** Percorso virtuale di una cartella scelta; la stessa cartella scelta di nuovo ha lo stesso */
export async function addRoot(handle: FileSystemDirectoryHandle): Promise<string> {
  for (const [key, h] of roots) if (await h.isSameEntry(handle)) return '/' + key
  const base = handle.name.replace(/[/\\]/g, '_').replace(/^\./, '_') || 'folder'
  let key = base
  for (let n = 2; roots.has(key); n++) key = `${base} (${n})`
  roots.set(key, handle)
  await put(ROOTS, key, handle).catch((e) => console.error(e))
  return '/' + key
}

export function rootOf(path: string): { handle: FileSystemDirectoryHandle; parts: string[] } {
  const parts = path.split('/').filter((p) => p && p !== '.')
  const handle = parts.length ? roots.get(parts[0]) : undefined
  if (!handle) throw fsError('ENOENT', path)
  return { handle, parts: parts.slice(1) }
}

/**
 * Chiede il permesso di lettura e scrittura sulla cartella del percorso. Il browser lo chiede
 * di nuovo a ogni sessione, e solo dopo un clic: va chiamata subito dopo il gesto dell'utente.
 */
export async function ensurePermission(path: string): Promise<boolean> {
  const { handle } = rootOf(path)
  if (path === DATA_ROOT || path.startsWith(DATA_ROOT + '/')) return true
  const opts = { mode: 'readwrite' as const }
  if ((await handle.queryPermission(opts)) === 'granted') return true
  return (await handle.requestPermission(opts)) === 'granted'
}

/** Il permesso c'è già, senza chiederlo: per ciò che parte da solo, come il backup automatico */
export async function hasPermission(path: string): Promise<boolean> {
  if (path === DATA_ROOT || path.startsWith(DATA_ROOT + '/')) return true
  try {
    return (await rootOf(path).handle.queryPermission({ mode: 'readwrite' })) === 'granted'
  } catch {
    return false
  }
}

export function fsError(code: string, path: string): Error {
  const e = new Error(`${code}: ${path}`) as Error & { code: string; path: string }
  e.code = code
  e.path = path
  return e
}

/** Sceglie una cartella con la finestra del browser; null se l'utente annulla */
export async function pickFolder(id = 'stella'): Promise<string | null> {
  try {
    const handle = await window.showDirectoryPicker({ id, mode: 'readwrite' })
    return await addRoot(handle)
  } catch (e) {
    if ((e as DOMException).name === 'AbortError') return null
    throw e
  }
}
