import { describe, expect, it } from 'vitest'
import { arrangeGroup, parseRepeat } from '../arrange'
import { bindCard } from '../bind'
import { patchLayer, transformInto } from '../edit'
import { denormalizeLayer, normalizeLayer, normalizeTemplate, type RawLayer } from '../normalize'
import type { GroupLayer } from '../template'

const icon = (id: string, w = 5, h = 5, extra = {}): RawLayer =>
  ({ type: 'shape', id, name: id, x: 0, y: 0, w, h, ...extra }) as RawLayer

function group(extra: Partial<GroupLayer>, children: RawLayer[]): GroupLayer {
  return normalizeLayer(
    {
      type: 'group',
      id: 'g',
      name: 'g',
      x: 10,
      y: 20,
      w: 40,
      h: 10,
      children,
      ...extra
    } as RawLayer,
    0
  ) as GroupLayer
}

const pos = (g: GroupLayer): [string, number, number][] => g.children.map((c) => [c.id, c.x, c.y])

describe('disposizione automatica dei gruppi', () => {
  it('mette i figli in riga con spaziatura e allineamento', () => {
    const g = group({ layout: 'row', gap: 2 }, [icon('a'), icon('b', 5, 9)])
    // allineamento verticale predefinito: al centro
    expect(pos(arrangeGroup(g))).toEqual([
      ['a', 10, 22.5],
      ['b', 17, 20.5]
    ])
    const centered = arrangeGroup({ ...g, justify: 'center', alignItems: 'start' })
    expect(pos(centered)).toEqual([
      ['a', 10 + (40 - 12) / 2, 20],
      ['b', 10 + (40 - 12) / 2 + 7, 20]
    ])
  })

  it('in colonna e in griglia', () => {
    const col = group({ layout: 'column', gap: 1, alignItems: 'end' }, [icon('a'), icon('b')])
    expect(pos(arrangeGroup(col))).toEqual([
      ['a', 45, 20],
      ['b', 45, 26]
    ])
    const grid = group({ layout: 'grid', gap: 0, columns: 2, alignItems: 'start' }, [
      icon('a'),
      icon('b'),
      icon('c')
    ])
    expect(pos(arrangeGroup(grid))).toEqual([
      ['a', 10, 20],
      ['b', 15, 20],
      ['c', 10, 25]
    ])
  })

  it('i figli nascosti non occupano spazio', () => {
    const g = group({ layout: 'row', gap: 0, alignItems: 'start' }, [
      icon('a', 5, 5, { visible: false }),
      icon('b')
    ])
    expect(arrangeGroup(g).children[1]).toMatchObject({ id: 'b', x: 10 })
  })

  it('ripete i figli N volte, con le copie dopo gli originali', () => {
    const g = group({ layout: 'row', gap: 1, repeat: '3', alignItems: 'start' }, [icon('a')])
    expect(pos(arrangeGroup(g))).toEqual([
      ['a', 10, 20],
      ['a~1', 16, 20],
      ['a~2', 22, 20]
    ])
    expect(arrangeGroup(g, 0).children).toEqual([])
  })

  it('senza disposizione ripete il blocco in riga', () => {
    const g = group({ repeat: '2', gap: 0, alignItems: 'start' }, [
      icon('a', 5, 5, { x: 0, y: 0 }),
      icon('b', 5, 5, { x: 0, y: 6 })
    ])
    expect(pos(arrangeGroup(g))).toEqual([
      ['a', 10, 20],
      ['b', 10, 26],
      ['a~1', 15, 20],
      ['b~1', 15, 26]
    ])
  })

  it('con ritaglia la maschera resta ferma e non si ripete', () => {
    const g = group({ layout: 'row', repeat: '2', clip: true }, [
      icon('a'),
      icon('m', 40, 10, { x: 10, y: 20 })
    ])
    const ids = arrangeGroup(g).children.map((c) => c.id)
    expect(ids).toEqual(['a', 'a~1', 'm'])
  })

  it('legge le ripetizioni', () => {
    expect(parseRepeat(' 4 ')).toBe(4)
    expect(parseRepeat('2.7')).toBe(2)
    expect(parseRepeat('-1')).toBe(0)
    expect(parseRepeat('{forza}')).toBeNull()
    expect(parseRepeat('9999')).toBe(200)
  })
})

describe('gruppi disposti nel template', () => {
  const t = normalizeTemplate({
    name: 't',
    front: [
      {
        type: 'group',
        id: 'g',
        name: 'icone',
        x: 10,
        y: 20,
        w: 40,
        h: 10,
        layout: 'row',
        repeat: '{forza}',
        children: [icon('a')]
      } as RawLayer
    ]
  })

  it('salva e rilegge il riquadro', () => {
    const g = t.front[0] as GroupLayer
    expect(g).toMatchObject({ x: 10, y: 20, w: 40, h: 10 })
    const raw = denormalizeLayer(g)
    expect(raw).toMatchObject({ x: 10, y: 20, w: 40, h: 10, layout: 'row', repeat: '{forza}' })
    expect(normalizeLayer(raw, 0)).toMatchObject({ x: 10, y: 20, w: 40, h: 10 })
  })

  it('il modello tiene i figli disposti e senza copie', () => {
    const moved = patchLayer(t, 'front', 'g', { x: 0 })
    const g = moved.front[0] as GroupLayer
    expect(g.x).toBe(0)
    expect(g.children.map((c) => [c.id, c.x])).toEqual([['a', 0]])
    // ridimensionare il riquadro non scala i figli
    const r = transformInto(g, { x: 0, y: 0, w: 80, h: 20 }) as GroupLayer
    expect(r.children[0]).toMatchObject({ w: 5, h: 5, y: 7.5 })
  })

  it('la carta prende le ripetizioni dal campo', () => {
    const bound = bindCard(t, { fields: { forza: '3' }, amount: 1 })
    const g = bound.template.front[0] as GroupLayer
    expect(g.repeat).toBe('3')
    expect(arrangeGroup(g).children).toHaveLength(3)
    const bad = bindCard(t, { fields: { forza: 'tre' }, amount: 1 })
    expect(bad.problems).toHaveLength(1)
    // senza dati il campo resta e vale 1, un campo vuoto vale 0
    expect(bindCard(t, { fields: {}, amount: 1 }).problems).toEqual([])
    const empty = bindCard(t, { fields: { forza: ' ' }, amount: 1 }).template.front[0]
    expect(arrangeGroup(empty as GroupLayer).children).toHaveLength(0)
  })
})
