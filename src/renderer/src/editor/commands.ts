import {
  duplicateLayer,
  findLayer,
  findParent,
  groupLayers,
  insertLayer,
  moveLayer,
  newLayer,
  patchLayer,
  removeLayers,
  translateLayer,
  ungroupLayer,
  updateLayers
} from '../../../shared/model/edit'
import type { Layer, LayerType, ShapeKind } from '../../../shared/model/template'
import type { EditorAction, EditorState } from './useEditor'

// Comandi dell'editor, condivisi tra pannello livelli, barra degli strumenti e tastiera.

export interface Commands {
  add(type: LayerType, shape?: ShapeKind): void
  remove(): void
  duplicate(): void
  group(): void
  ungroup(): void
  move(direction: 'up' | 'down'): void
  nudge(dx: number, dy: number): void
  toggle(id: string, prop: 'visible' | 'locked'): void
  /** Tutti i selezionati stanno nello stesso contenitore */
  canGroup: boolean
  canUngroup: boolean
}

export function commands(state: EditorState, dispatch: React.Dispatch<EditorAction>): Commands {
  const { template: tpl, side, selection } = state
  const layers = tpl[side]
  const selected = selection.map((id) => findLayer(layers, id)).filter((l): l is Layer => !!l)
  const parentId = (id: string): string | null => findParent(layers, id)?.id ?? null
  const siblings =
    selection.length > 0 && selection.every((id) => parentId(id) === parentId(selection[0]))
  const change = (template: typeof tpl, sel?: string[], key?: string): void =>
    dispatch({ type: 'change', template, selection: sel, key })

  return {
    canGroup: siblings,
    canUngroup: selected.some((l) => l.type === 'group'),

    add(type, shape) {
      const layer = newLayer(tpl, type, shape)
      // dentro il gruppo in cui si è entrati, sopra al livello selezionato
      const scopeGroup = state.scope ? findLayer(layers, state.scope) : null
      const above =
        selection[0] ?? (scopeGroup?.type === 'group' ? scopeGroup.children[0]?.id : undefined)
      change(insertLayer(tpl, side, layer, above), [layer.id])
    },

    remove() {
      if (!selection.length) return
      change(removeLayers(tpl, side, selection), [])
    },

    duplicate() {
      let t = tpl
      const ids: string[] = []
      for (const l of selected) {
        const copy = duplicateLayer(t, l)
        t = insertLayer(t, side, copy, l.id)
        ids.push(copy.id)
      }
      if (ids.length) change(t, ids)
    },

    group() {
      if (!siblings) return
      // l'ordine del gruppo segue quello dei livelli, non quello della selezione
      const { template, groupId } = groupLayers(tpl, side, selection)
      if (groupId) change(template, [groupId])
    },

    ungroup() {
      let t = tpl
      const ids: string[] = []
      for (const l of selected) {
        if (l.type !== 'group') {
          ids.push(l.id)
          continue
        }
        const r = ungroupLayer(t, side, l.id)
        t = r.template
        ids.push(...r.childIds)
      }
      change(t, ids)
    },

    move(direction) {
      let t = tpl
      // spostando verso l'alto si parte dal primo, verso il basso dall'ultimo
      const order = direction === 'up' ? selection : [...selection].reverse()
      for (const id of order) t = moveLayer(t, side, id, direction)
      change(t)
    },

    nudge(dx, dy) {
      const ids = selected.filter((l) => !l.locked).map((l) => l.id)
      if (!ids.length) return
      change(
        updateLayers(tpl, side, (l) => (ids.includes(l.id) ? translateLayer(l, dx, dy) : l)),
        undefined,
        `nudge.${ids.join(',')}`
      )
    },

    toggle(id, prop) {
      const l = findLayer(layers, id)
      if (l) change(patchLayer(tpl, side, id, { [prop]: !l[prop] }))
    }
  }
}
