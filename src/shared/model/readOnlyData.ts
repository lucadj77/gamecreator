import type { LoadedProject, Sheet } from '../project'

// Con il file dati in sola lettura (ProjectFile.dataReadOnly) i set possono solo usare fogli che
// esistono già: ogni modifica ai dati crea un oggetto Sheet nuovo, e si riconosce da questo.

/** Vero se `next` ha nei set dati che non vengono dal file letto (`prev`) */
export function changesData(prev: LoadedProject, next: LoadedProject): boolean {
  const known = new Set<Sheet>([
    ...prev.sets.flatMap((s) => (s.data ? [s.data] : [])),
    ...(prev.unusedData ?? [])
  ])
  return next.sets.some((s) => s.data && !known.has(s.data))
}
