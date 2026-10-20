import type { ExportSet } from './export'
import type { LoadedProject } from './project'
import { bindCard, cardFields, rowToCard } from './model/bind'
import { cardTemplate } from './model/inherit'

// Carte da esportare: le usano la finestra di esportazione e il comando naibi.

/** Le carte dei set scelti, con i valori della riga applicati al template */
export function buildSets(project: LoadedProject, names: string[]): ExportSet[] {
  const ctx = {
    assets: project.assets,
    styles: project.file.styles,
    variables: project.file.variables
  }
  return project.sets
    .filter((s) => !names.length || names.includes(s.name))
    .flatMap((s) => {
      const tpl = project.templates.find((x) => x.name === s.template)
      if (!tpl || !s.data) return []
      const { headers, rows } = s.data
      const cards = rows.map((row, i) => {
        const card = rowToCard(headers, row)
        const own = cardTemplate(headers, row, tpl, project.templates).template
        const bound = bindCard(own, card, ctx)
        return {
          n: i + 1,
          amount: card.amount,
          label: bound.label,
          fields: cardFields(own, card, ctx.variables),
          template: bound.template
        }
      })
      return [{ name: s.name, cards }]
    })
}
