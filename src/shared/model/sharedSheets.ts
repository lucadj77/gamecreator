import type { LoadedSet } from '../project'

// Più set possono usare lo stesso foglio del file dati, ognuno col suo template (per esempio
// truppe rosse e truppe gialle): i dati sono uno solo, e una modifica fatta da un set vale per
// tutti quelli che condividono il foglio.

/** Altri set che usano il foglio del set `index` */
export function sharingSets(sets: LoadedSet[], index: number): LoadedSet[] {
  const name = sets[index]?.data?.name
  return name ? sets.filter((s, i) => i !== index && s.data?.name === name) : []
}

/**
 * I set di `next` con i dati condivisi allineati: i dati di un set cambiati rispetto a `prev`
 * passano agli altri set che avevano lo stesso foglio. Se nello stesso passo cambiano più set
 * dello stesso foglio vale il primo.
 */
export function syncSharedSheets(prev: LoadedSet[], next: LoadedSet[]): LoadedSet[] {
  let out = next
  for (let i = 0; i < next.length; i++) {
    const after = out[i].data
    // già allineato a un set precedente
    if (after !== next[i].data || !after) continue
    const before = prev.find((p) => p.name === next[i].name)?.data
    if (!before || before === after) continue
    if (!out.some((s, j) => j !== i && s.data?.name === before.name && s.data !== after)) continue
    out = out.map((s, j) =>
      j !== i && s.data && s.data.name === before.name && s.data !== after
        ? { ...s, data: after }
        : s
    )
  }
  return out
}
