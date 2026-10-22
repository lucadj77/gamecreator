import { useRef } from 'react'
import type { LoadedProject, ProjectNote } from '../../../shared/project'
import { messageFromError, type Message } from '../../../shared/messages'

// Documenti del progetto (docs/*.md): come le note si scrivono subito su disco, poco dopo l'ultima
// modifica, senza passare dal salvataggio del progetto né dall'annulla.

export interface DocumentActions {
  change(name: string, text: string): void
  /** Crea un documento vuoto con un nome libero a partire da `base` e lo restituisce */
  create(base: string): Promise<string | null>
  rename(from: string, to: string): Promise<boolean>
  remove(name: string): Promise<void>
  /** Scrive subito le modifiche in attesa di un documento */
  flush(name: string): void
  /** Rimette un documento (dal cestino) con un nome libero e lo restituisce */
  restore(name: string, text: string): Promise<string>
}

export function useDocuments(
  project: LoadedProject | null,
  setProject: (u: (p: LoadedProject | null) => LoadedProject | null) => void,
  setError: (m: Message) => void
): DocumentActions {
  const timers = useRef(new Map<string, { timer: number; text: string }>())
  const set = (change: (docs: ProjectNote[]) => ProjectNote[]): void =>
    setProject((p) => p && { ...p, documents: change(p.documents ?? []) })
  const sorted = (docs: ProjectNote[]): ProjectNote[] =>
    [...docs].sort((a, b) => a.name.localeCompare(b.name))
  const write = (name: string, text: string): Promise<boolean> =>
    window.api.saveDocument(name, text).then(
      () => true,
      (e) => {
        setError(messageFromError(e))
        return false
      }
    )
  const cancel = (name: string): string | undefined => {
    const pending = timers.current.get(name)
    if (pending) window.clearTimeout(pending.timer)
    timers.current.delete(name)
    return pending?.text
  }
  const free = (base: string): string => {
    const names = new Set((project?.documents ?? []).map((d) => d.name))
    let name = base
    for (let i = 2; names.has(name); i++) name = `${base} ${i}`
    return name
  }

  const flush = (name: string): void => {
    const text = cancel(name)
    if (text !== undefined) void write(name, text)
  }

  return {
    flush,
    change(name, text) {
      set((docs) => docs.map((d) => (d.name === name ? { ...d, text } : d)))
      cancel(name)
      timers.current.set(name, { text, timer: window.setTimeout(() => flush(name), 600) })
    },
    async create(base) {
      const name = free(base)
      if (!(await write(name, ''))) return null
      set((docs) => sorted([...docs, { name, text: '' }]))
      return name
    },
    async rename(from, to) {
      const text = cancel(from) ?? project?.documents?.find((d) => d.name === from)?.text ?? ''
      try {
        await window.api.saveDocument(to, text, from)
      } catch (e) {
        setError(messageFromError(e))
        return false
      }
      set((docs) => sorted(docs.map((d) => (d.name === from ? { name: to, text } : d))))
      return true
    },
    async remove(name) {
      cancel(name)
      await window.api.deleteDocument(name).catch((e) => setError(messageFromError(e)))
      set((docs) => docs.filter((d) => d.name !== name))
    },
    async restore(base, text) {
      const name = free(base)
      await window.api.saveDocument(name, text)
      set((docs) => sorted([...docs, { name, text }]))
      return name
    }
  }
}
