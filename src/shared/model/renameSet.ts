import type { ExportProfiles } from '../export'
import type { LoadedSet, ProjectFile } from '../project'

// Rinomina di un set: il nome nel file di progetto, il foglio dei dati (che cambia nome al
// salvataggio, vedi Sheet.origin) e i profili di esportazione che lo scelgono. Funzione pura.

function renameInProfiles(
  profiles: ExportProfiles | undefined,
  from: string,
  to: string
): ExportProfiles | undefined {
  if (!profiles) return profiles
  const fix = <T extends { sets?: string[]; objects?: Record<string, unknown> }>(
    o: T | undefined
  ): T | undefined => {
    if (!o) return o
    let out = o
    if (o.sets?.includes(from)) out = { ...out, sets: o.sets.map((s) => (s === from ? to : s)) }
    // oggetti di Tabletop Simulator scelti per set (segnalini, tessere)
    if (o.objects && from in o.objects) {
      const objects = { ...o.objects, [to]: o.objects[from] }
      delete objects[from]
      out = { ...out, objects }
    }
    return out
  }
  return {
    ...profiles,
    images: fix(profiles.images),
    pdf: fix(profiles.pdf),
    tts: fix(profiles.tts),
    ...(profiles.named
      ? {
          named: profiles.named.map(
            (p) => ({ ...p, options: fix(p.options) ?? p.options }) as typeof p
          )
        }
      : {})
  }
}

/**
 * Il set `index` con il nome `to`. Se il foglio ha lo stesso nome del set lo segue; un foglio con
 * un nome suo, o il file .csv (che ha un solo foglio con il nome del file), resta com'è.
 */
export function renameSet(
  file: ProjectFile,
  sets: LoadedSet[],
  index: number,
  to: string,
  csv: boolean
): { file: ProjectFile; sets: LoadedSet[] } {
  const set = sets[index]
  const from = set.name
  const follows = !csv && !set.sheet && !!set.data
  const def = { ...file.sets[index], name: to }
  if (follows) delete def.sheet
  else def.sheet = set.sheet ?? set.name
  let data = set.data
  if (follows && data) {
    data = { ...data, name: to, origin: data.origin ?? data.name }
    // un foglio rinominato e poi riportato al nome di prima non va più rinominato
    if (data.origin === to) delete data.origin
  }
  return {
    file: {
      ...file,
      sets: file.sets.map((d, i) => (i === index ? def : d)),
      export: renameInProfiles(file.export, from, to)
    },
    sets: sets.map((s, i) => (i === index ? { ...def, data } : s))
  }
}
