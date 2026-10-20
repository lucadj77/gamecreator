import type { LoadedSet, ProjectFile } from '../project'
import { renameInOrder } from './order'
import type { Template } from './template'

// Rinomina di un template: il template (il file cambia nome al salvataggio, vedi
// Template.origin), i derivati che lo usano come base, i set e la colonna `template` delle carte.
// Funzione pura.

export interface TemplateRename {
  templates: Template[]
  sets: LoadedSet[]
  file: ProjectFile
}

export function renameTemplate(p: TemplateRename, from: string, to: string): TemplateRename {
  const templates = p.templates.map((t) => {
    if (t.name === from) {
      const origin = t.origin ?? t.file ?? t.name
      const renamed: Template = { ...t, name: to, origin }
      delete renamed.file
      // tornando al nome del file sul disco non c'è più nulla da rinominare
      if (origin === to) delete renamed.origin
      return renamed
    }
    return t.extends === from ? { ...t, extends: to } : t
  })
  const sets = p.sets.map((s) => {
    const col = s.data?.headers.indexOf('template') ?? -1
    const data =
      s.data && col >= 0 && s.data.rows.some((r) => r[col]?.trim() === from)
        ? {
            ...s.data,
            rows: s.data.rows.map((r) =>
              r[col]?.trim() === from ? r.map((v, i) => (i === col ? to : v)) : r
            )
          }
        : s.data
    if (s.template !== from && data === s.data) return s
    return { ...s, template: s.template === from ? to : s.template, data }
  })
  return {
    templates,
    sets,
    file: {
      ...p.file,
      sets: p.file.sets.map((d) => (d.template === from ? { ...d, template: to } : d)),
      order: renameInOrder(p.file.order, 'templates', from, to)
    }
  }
}
