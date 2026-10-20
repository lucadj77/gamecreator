import type { LoadedProject } from '../project'
import type { Template } from './template'
import { bindCard, bindRow, rowToCard } from './bind'
import { systemOfSet } from './system'

/**
 * Template da disegnare come miniatura: la prima carta del primo set che ne ha, altrimenti il
 * primo template con i suoi valori predefiniti. null se il progetto non ha template.
 */
export function thumbnailTemplate(project: LoadedProject): Template | null {
  const ctx = {
    assets: project.assets,
    styles: project.file.styles,
    variables: project.file.variables
  }
  for (const s of project.sets) {
    const tpl = project.templates.find((x) => x.name === s.template)
    if (tpl && s.data?.rows.length)
      return bindRow(s.data.headers, s.data.rows[0], tpl, project.templates, {
        ...ctx,
        system: { ...systemOfSet(project.file.name, s), number: 1 }
      }).template
  }
  const first = project.templates[0]
  return first
    ? bindCard(first, rowToCard([], []), { ...ctx, system: { project: project.file.name } })
        .template
    : null
}
