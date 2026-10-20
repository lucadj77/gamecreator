import { describe, expect, it } from 'vitest'
import { patchLayer, removeLayers, insertLayer, moveLayer, newLayer } from '../edit'
import {
  detach,
  diffTemplate,
  layerStatus,
  newDerived,
  rebase,
  resolveTemplates,
  syncDerived,
  wouldCycle
} from '../inherit'
import { denormalizeTemplate, normalizeTemplate, walkLayers } from '../normalize'
import type { GroupLayer, Template, TextLayer } from '../template'

const base = normalizeTemplate({
  name: 'carta',
  cornerRadius: 3,
  front: [
    { type: 'text', name: 'nome', x: 10, y: 10, w: 20, h: 10, size: 10, color: '#000000' },
    {
      type: 'group',
      name: 'stemma',
      children: [
        { type: 'shape', name: 'cerchio', x: 40, y: 5, w: 10, h: 10 },
        { type: 'image', name: 'icona', x: 42, y: 7, w: 6, h: 6 }
      ]
    },
    { type: 'shape', name: 'sfondo', x: 0, y: 0, w: 63, h: 88 }
  ],
  back: [{ type: 'shape', name: 'retro', x: 0, y: 0, w: 63, h: 88 }]
})

const names = (t: Template, side: 'front' | 'back' = 'front'): string[] =>
  walkLayers(t[side]).map((l) => l.name)
const layer = (t: Template, name: string): TextLayer =>
  walkLayers([...t.front, ...t.back]).find((l) => l.name === name) as TextLayer

/** Come si legge un derivato dal file: solo le differenze, poi si risolve */
function fromFile(
  raw: Parameters<typeof normalizeTemplate>[0],
  list: Template[] = [base]
): ReturnType<typeof resolveTemplates> {
  return resolveTemplates([...list, normalizeTemplate(raw)])
}

describe('risoluzione', () => {
  it('un derivato senza differenze è uguale al base, con gli stessi id', () => {
    const d = newDerived(base, 'fuoco')
    expect(d.extends).toBe('carta')
    expect(d.width).toBe(base.width)
    expect(names(d)).toEqual(names(base))
    expect(d.front[0].id).toBe(base.front[0].id)
    expect(diffTemplate(base, d)).toEqual({})
  })

  it('applica le proprietà cambiate e le misure del base', () => {
    const { templates, problems } = fromFile({
      name: 'fuoco',
      extends: 'carta',
      changes: {
        template: { cornerRadius: 5 },
        layers: { nome: { color: '#FF0000' }, sfondo: { visible: false } }
      }
    })
    const d = templates[1]
    expect(problems).toEqual([])
    expect(d.cornerRadius).toBe(5)
    expect(d.width).toBe(63)
    expect(layer(d, 'nome').color).toBe('#FF0000')
    expect(layer(d, 'nome').size).toBe(10)
    expect(layer(d, 'sfondo').visible).toBe(false)
  })

  it('inserisce i livelli aggiunti al loro posto, anche dentro un gruppo ereditato', () => {
    const { templates } = fromFile({
      name: 'fuoco',
      extends: 'carta',
      changes: {
        added: [
          { side: 'front', layer: { type: 'text', name: 'cima' } },
          { side: 'front', after: 'nome', layer: { type: 'text', name: 'sotto' } },
          { side: 'front', parent: 'stemma', after: 'cerchio', layer: { type: 'text', name: 'x' } }
        ]
      }
    })
    expect(names(templates[1])).toEqual([
      'cima',
      'nome',
      'sotto',
      'stemma',
      'cerchio',
      'x',
      'icona',
      'sfondo'
    ])
  })

  it('una modifica al base arriva ai derivati che non la cambiano', () => {
    const d = rebase(
      base,
      patchLayer(newDerived(base, 'fuoco'), 'front', base.front[0].id, {
        color: '#FF0000'
      })
    )
    const b2 = patchLayer(base, 'front', base.front[0].id, { size: 14, color: '#00FF00' })
    const { templates } = syncDerived([base, d], [b2, d])
    expect(layer(templates[1], 'nome').size).toBe(14)
    expect(layer(templates[1], 'nome').color).toBe('#FF0000')
  })

  it('segue i derivati dei derivati e segnala base mancanti e giri', () => {
    const chain = resolveTemplates([
      normalizeTemplate({ name: 'rara', extends: 'fuoco', changes: { template: { bleed: 1 } } }),
      normalizeTemplate({
        name: 'fuoco',
        extends: 'carta',
        changes: { layers: { nome: { size: 20 } } }
      }),
      base
    ]).templates
    expect(layer(chain[0], 'nome').size).toBe(20)
    expect(chain[0].bleed).toBe(1)

    const lost = resolveTemplates([normalizeTemplate({ name: 'a', extends: 'nessuno' })])
    expect(lost.problems[0].key).toBe('inherit.missingBase')
    const loop = resolveTemplates([
      normalizeTemplate({ name: 'a', extends: 'b' }),
      normalizeTemplate({ name: 'b', extends: 'a' })
    ])
    expect(loop.problems.some((p) => p.key === 'inherit.cycle')).toBe(true)
  })

  it('segnala le modifiche a livelli che il base non ha più', () => {
    const { problems } = fromFile({
      name: 'fuoco',
      extends: 'carta',
      changes: { layers: { vecchio: { size: 3 } } }
    })
    expect(problems.map((p) => p.key)).toEqual(['inherit.lostLayer'])
  })
})

describe('differenze', () => {
  const d = newDerived(base, 'fuoco')
  const nome = d.front[0].id

  it('registra solo le proprietà cambiate, sostituite per intero', () => {
    const edited = patchLayer(d, 'front', nome, {
      size: 12,
      stroke: { color: '#FFFFFF', width: 0.2 }
    })
    expect(diffTemplate(base, edited)).toEqual({
      layers: { nome: { size: 12, stroke: { color: '#FFFFFF', width: 0.2 } } }
    })
  })

  it("un livello ereditato eliminato resta nascosto; l'ordine resta quello del base", () => {
    const removed = rebase(base, removeLayers(d, 'front', [nome]))
    expect(names(removed)).toEqual(names(base))
    expect(layer(removed, 'nome').visible).toBe(false)
    const moved = rebase(base, moveLayer(d, 'front', nome, 'down'))
    expect(names(moved)).toEqual(names(base))
  })

  it('i livelli aggiunti si salvano con il loro posto e si rileggono uguali', () => {
    const extra = newLayer(d, 'text')
    const edited = rebase(base, insertLayer(d, 'front', extra, base.front[1].id))
    const c = diffTemplate(base, edited)
    expect(c.added).toHaveLength(1)
    expect(c.added![0]).toMatchObject({ side: 'front', after: 'nome' })
    const raw = denormalizeTemplate(edited)
    expect(raw).toEqual({ name: 'fuoco', extends: 'carta', changes: expect.any(Object) })
    expect(raw.front).toBeUndefined()
    const again = resolveTemplates([base, normalizeTemplate(raw)]).templates[1]
    expect(names(again)).toEqual(names(edited))
  })

  it("stato dei livelli per l'editor", () => {
    const edited = rebase(base, patchLayer(d, 'front', nome, { size: 12 }))
    expect(layerStatus(base, edited.front[0])).toEqual({ status: 'changed', keys: ['size'] })
    expect(layerStatus(base, edited.front[2]).status).toBe('inherited')
    const g = edited.front[1] as GroupLayer
    const inner = rebase(base, patchLayer(edited, 'front', g.children[0].id, { fill: '#FF0000' }))
    expect(layerStatus(base, inner.front[1]).status).toBe('changed')
    const extra = newLayer(d, 'text')
    expect(layerStatus(base, extra).status).toBe('added')
  })
})

describe('rinomine e indipendenza', () => {
  it('rinominare un livello nel base rinomina le differenze del derivato', () => {
    const d = rebase(
      base,
      patchLayer(newDerived(base, 'fuoco'), 'front', base.front[0].id, {
        size: 30
      })
    )
    const b2 = patchLayer(base, 'front', base.front[0].id, { name: 'titolo' })
    const r = syncDerived([base, d], [b2, d])
    expect(r.changed).toEqual(['fuoco'])
    expect(r.templates[1].changes?.layers).toEqual({ titolo: { size: 30 } })
    expect(layer(r.templates[1], 'titolo').size).toBe(30)
  })

  it('rende indipendente e impedisce i giri', () => {
    const d = newDerived(base, 'fuoco')
    const plain = detach(d)
    expect(plain.extends).toBeUndefined()
    expect(denormalizeTemplate(plain).front?.length).toBe(3)
    expect(wouldCycle([base, d], 'carta', 'fuoco')).toBe(true)
    expect(wouldCycle([base, d], 'fuoco', 'carta')).toBe(false)
  })
})
