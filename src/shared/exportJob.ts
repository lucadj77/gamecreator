import type { ExportSet } from './export'
import type { LoadedProject } from './project'
import { bindCard, cardFields, rowToCard } from './model/bind'
import { cardTemplate } from './model/inherit'
import { systemOfSet, usesCopy } from './model/system'

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
      const info = systemOfSet(project.file.name, s)
      const cards = rows.map((row, i) => {
        const card = rowToCard(headers, row)
        const own = cardTemplate(headers, row, tpl, project.templates).template
        const system = { ...info, number: i + 1 }
        const bound = bindCard(own, card, { ...ctx, system })
        // con {card.copy} ogni copia è una carta diversa
        const perCopy =
          card.amount > 1 && usesCopy(own, card.fields)
            ? Array.from(
                { length: card.amount },
                (_, k) =>
                  bindCard(own, card, { ...ctx, system: { ...system, copy: k + 1 } }).template
              )
            : undefined
        return {
          n: i + 1,
          amount: card.amount,
          label: bound.label,
          fields: cardFields(own, card, ctx.variables, system),
          template: bound.template,
          ...(perCopy ? { perCopy } : {})
        }
      })
      return [{ name: s.name, cards }]
    })
}
