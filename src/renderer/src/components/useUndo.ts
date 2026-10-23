import { useEffect, useRef } from 'react'

/** Cambiamenti più vicini di così (un trascinamento, una serie di clic) si annullano insieme */
const MERGE_MS = 600

/**
 * ⌘Z / Ctrl+Z e ⇧⌘Z / Ctrl+Y nelle finestre che modificano qualcosa (schema del tavolo, anatomia,
 * tabella...): `state` sono i valori da ricordare, `restore` li rimette. Dentro un campo di testo
 * vale l'annulla del campo. `enabled` è falso quando sopra c'è un'altra finestra.
 */
export function useUndo<T extends unknown[]>(
  state: [...T],
  restore: (state: T) => void,
  enabled = true
): void {
  const past = useRef<T[]>([])
  const future = useRef<T[]>([])
  const last = useRef<T>(state)
  const lastAt = useRef(0)
  const restoring = useRef(false)
  const restoreRef = useRef(restore)

  useEffect(() => {
    restoreRef.current = restore
  })

  useEffect(() => {
    if (same(state, last.current)) return
    if (restoring.current) restoring.current = false
    else {
      const now = Date.now()
      if (now - lastAt.current > MERGE_MS || !past.current.length) past.current.push(last.current)
      lastAt.current = now
      future.current = []
    }
    last.current = state
  })

  useEffect(() => {
    if (!enabled) return undefined
    const onKey = (e: KeyboardEvent): void => {
      if (!(e.metaKey || e.ctrlKey) || e.altKey || e.defaultPrevented) return
      const key = e.key.toLowerCase()
      const redo = (key === 'z' && e.shiftKey) || (key === 'y' && !e.shiftKey)
      if (!redo && !(key === 'z' && !e.shiftKey)) return
      if (typing(e.target)) return
      const from = redo ? future.current : past.current
      const to = redo ? past.current : future.current
      const next = from.pop()
      e.preventDefault()
      if (!next) return
      to.push(last.current)
      // il prossimo cambiamento è il ripristino: non entra nella cronologia
      restoring.current = true
      lastAt.current = 0
      restoreRef.current(next)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [enabled])
}

const same = (a: unknown[], b: unknown[]): boolean =>
  a.length === b.length && a.every((x, k) => x === b[k])

/** Un campo dove si scrive testo: lì ⌘Z annulla quello che si è scritto */
function typing(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  if (target.isContentEditable || target instanceof HTMLTextAreaElement) return true
  return (
    target instanceof HTMLInputElement &&
    !['checkbox', 'radio', 'range', 'button', 'color'].includes(target.type)
  )
}
