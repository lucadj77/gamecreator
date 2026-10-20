import { useCallback, useReducer } from 'react'
import { findLayer } from '../../../shared/model/edit'
import type { Side, Template } from '../../../shared/model/template'

// Stato dell'editor con la cronologia per annulla/ripeti.

const HISTORY_LIMIT = 100
/** Modifiche con la stessa chiave entro questo intervallo diventano un solo passo */
const COALESCE_MS = 1200

interface Snapshot {
  template: Template
  selection: string[]
}

export interface EditorState {
  template: Template
  side: Side
  selection: string[]
  /** Gruppo in cui si è entrati con il doppio clic: la tela seleziona i suoi figli */
  scope: string | null
  past: Snapshot[]
  future: Snapshot[]
  lastKey: string | null
  lastTime: number
  /** Stato all'inizio di un trascinamento, finché il gesto non finisce */
  gesture: Snapshot | null
}

export type EditorAction =
  | { type: 'change'; template: Template; selection?: string[]; key?: string }
  | { type: 'gestureStart' }
  | { type: 'gestureUpdate'; template: Template }
  | { type: 'gestureEnd' }
  | { type: 'select'; ids: string[]; scope?: string | null }
  | { type: 'side'; side: Side }
  | { type: 'undo' }
  | { type: 'redo' }

function snapshot(s: EditorState): Snapshot {
  return { template: s.template, selection: s.selection }
}

function push(past: Snapshot[], snap: Snapshot): Snapshot[] {
  return [...past, snap].slice(-HISTORY_LIMIT)
}

/** Tiene solo gli id ancora presenti sul lato visibile */
function existing(t: Template, side: Side, ids: string[]): string[] {
  return ids.filter((id) => findLayer(t[side], id))
}

function reducer(s: EditorState, a: EditorAction): EditorState {
  switch (a.type) {
    case 'change': {
      const now = Date.now()
      const coalesce = a.key !== undefined && a.key === s.lastKey && now - s.lastTime < COALESCE_MS
      return {
        ...s,
        template: a.template,
        selection: existing(a.template, s.side, a.selection ?? s.selection),
        past: coalesce ? s.past : push(s.past, snapshot(s)),
        future: [],
        lastKey: a.key ?? null,
        lastTime: now
      }
    }
    case 'gestureStart':
      return { ...s, gesture: snapshot(s), lastKey: null }
    case 'gestureUpdate':
      return { ...s, template: a.template }
    case 'gestureEnd': {
      if (!s.gesture) return s
      const changed = s.gesture.template !== s.template
      return {
        ...s,
        gesture: null,
        past: changed ? push(s.past, s.gesture) : s.past,
        future: changed ? [] : s.future
      }
    }
    case 'select':
      return {
        ...s,
        selection: a.ids,
        scope: a.scope === undefined ? s.scope : a.scope,
        lastKey: null
      }
    case 'side':
      return { ...s, side: a.side, selection: [], scope: null }
    case 'undo': {
      const prev = s.past[s.past.length - 1]
      if (!prev) return s
      return {
        ...s,
        template: prev.template,
        selection: existing(prev.template, s.side, prev.selection),
        past: s.past.slice(0, -1),
        future: [snapshot(s), ...s.future],
        lastKey: null
      }
    }
    case 'redo': {
      const next = s.future[0]
      if (!next) return s
      return {
        ...s,
        template: next.template,
        selection: existing(next.template, s.side, next.selection),
        past: push(s.past, snapshot(s)),
        future: s.future.slice(1),
        lastKey: null
      }
    }
  }
}

/**
 * `normalize` passa ogni modifica per le regole del template, per esempio quelle di un derivato
 * (vedi rebase): l'editor mostra e annulla sempre il template come si salverà.
 */
export function useEditor(
  initial: Template,
  normalize?: (t: Template) => Template
): [EditorState, React.Dispatch<EditorAction>] {
  const run = useCallback(
    (s: EditorState, a: EditorAction): EditorState =>
      normalize && (a.type === 'change' || a.type === 'gestureUpdate')
        ? reducer(s, { ...a, template: normalize(a.template) })
        : reducer(s, a),
    [normalize]
  )
  return useReducer(run, initial, (template) => ({
    template,
    side: 'front' as Side,
    selection: [],
    scope: null,
    past: [],
    future: [],
    lastKey: null,
    lastTime: 0,
    gesture: null
  }))
}
