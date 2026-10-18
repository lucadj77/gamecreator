import { useEffect, useMemo, useRef, useState } from 'react'
import { bindCard, rowToCard } from '../../../shared/model/bind'
import { findLayer, findParent, resizeTemplate } from '../../../shared/model/edit'
import type { LoadedSet } from '../../../shared/project'
import type { ShapeKind, Side, Template } from '../../../shared/model/template'
import { useI18n } from '../i18n/context'
import Segmented from '../components/Segmented'
import Resizer from '../components/Resizer'
import { usePanelWidth } from '../components/usePanelWidth'
import Canvas from './Canvas'
import LayersPanel from './LayersPanel'
import PropertiesPanel from './PropertiesPanel'
import { commands } from './commands'
import { ResizeDialog } from './dialogs'
import { useEditor } from './useEditor'

interface Props {
  template: Template
  /** Set che usano questo template: servono per l'anteprima con i dati */
  sets: LoadedSet[]
  dirty: boolean
  onChange(template: Template): void
  onSave(template: Template): Promise<void>
}

const NUDGE = 0.5

export default function TemplateEditor({
  template,
  sets,
  dirty,
  onChange,
  onSave
}: Props): React.JSX.Element {
  const { t } = useI18n()
  const [state, dispatch] = useEditor(template)
  const [resizing, setResizing] = useState<[number, number] | null>(null)
  const [preview, setPreview] = useState<{ set: number; row: number } | null>(null)
  const [saving, setSaving] = useState(false)
  const cmd = commands(state, dispatch)
  const [layersWidth, setLayersWidth] = usePanelWidth('layers', 230)
  const [propsWidth, setPropsWidth] = usePanelWidth('properties', 320)

  // le modifiche risalgono subito all'app: le anteprime dei set le mostrano prima del salvataggio
  const initial = useRef(template)
  useEffect(() => {
    if (state.template !== initial.current) onChange(state.template)
  }, [state.template, onChange])

  const save = async (): Promise<void> => {
    setSaving(true)
    try {
      await onSave(state.template)
    } finally {
      setSaving(false)
    }
  }

  // la tastiera: le scorciatoie usano Cmd su macOS e Ctrl altrove
  const onKey = (e: KeyboardEvent): void => {
    const mod = e.metaKey || e.ctrlKey
    const k = e.key.toLowerCase()
    if (mod && k === 's') {
      e.preventDefault()
      save()
      return
    }
    const target = e.target as HTMLElement
    if (target.closest('input, textarea, select, [role="dialog"]')) return
    const layers = state.template[state.side]
    if (mod && k === 'z') dispatch({ type: e.shiftKey ? 'redo' : 'undo' })
    else if (mod && k === 'y') dispatch({ type: 'redo' })
    else if (mod && k === 'd') cmd.duplicate()
    else if (mod && k === 'g') {
      if (e.shiftKey) cmd.ungroup()
      else cmd.group()
    } else if (mod && k === 'a') {
      const scope = state.scope ? findLayer(layers, state.scope) : null
      const list = scope?.type === 'group' ? scope.children : layers
      dispatch({ type: 'select', ids: list.map((l) => l.id) })
    } else if (k === 'delete' || k === 'backspace') cmd.remove()
    else if (k === 'escape') {
      if (state.scope) {
        const parent = findParent(layers, state.scope)?.id ?? null
        dispatch({ type: 'select', ids: [state.scope], scope: parent })
      } else dispatch({ type: 'select', ids: [] })
    } else if (k.startsWith('arrow')) {
      const d = e.shiftKey ? NUDGE * 10 : NUDGE
      const [dx, dy] = {
        arrowleft: [-d, 0],
        arrowright: [d, 0],
        arrowup: [0, -d],
        arrowdown: [0, d]
      }[k] ?? [0, 0]
      cmd.nudge(dx, dy)
    } else if (!mod && k === 't') cmd.add('text')
    else if (!mod && k === 'r') cmd.add('shape', 'rect')
    else if (!mod && k === 'e') cmd.add('shape', 'ellipse')
    else return
    e.preventDefault()
  }
  // si riregistra a ogni render per leggere lo stato corrente
  useEffect(() => {
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const previewSet = preview ? sets[preview.set] : null
  const display = useMemo(() => {
    const data = previewSet?.data
    const row = data?.rows[preview?.row ?? -1]
    if (!data || !row) return null
    return bindCard(state.template, rowToCard(data.headers, row))
  }, [state.template, previewSet, preview?.row])

  const tools: [string, () => void, string][] = [
    ['T', () => cmd.add('text'), t('tool.text')],
    ['▣', () => cmd.add('image'), t('tool.image')],
    ...(['rect', 'ellipse', 'polygon', 'star', 'line'] as ShapeKind[]).map<
      [string, () => void, string]
    >((s) => [SHAPE_ICONS[s], () => cmd.add('shape', s), t(`tool.${s}` as Parameters<typeof t>[0])])
  ]

  return (
    <div className="editor">
      <div className="editor-toolbar">
        <h1>{state.template.name}</h1>
        <div className="tool-group">
          {tools.map(([icon, run, label]) => (
            <button key={label} className="tool" title={label} onClick={run}>
              {icon}
            </button>
          ))}
        </div>
        <Segmented<Side>
          value={state.side}
          options={[
            ['front', t('preview.front')],
            ['back', t('preview.back')]
          ]}
          onChange={(side) => dispatch({ type: 'side', side })}
        />
        <div className="tool-group">
          <button
            className="tool"
            title={t('editor.undo')}
            disabled={!state.past.length}
            onClick={() => dispatch({ type: 'undo' })}
          >
            ↶
          </button>
          <button
            className="tool"
            title={t('editor.redo')}
            disabled={!state.future.length}
            onClick={() => dispatch({ type: 'redo' })}
          >
            ↷
          </button>
        </div>
        <span className="spacer" />
        <label className="muted preview-data">
          {t('editor.previewData')}{' '}
          <select
            value={preview ? String(preview.set) : ''}
            onChange={(e) =>
              setPreview(e.target.value === '' ? null : { set: Number(e.target.value), row: 0 })
            }
          >
            <option value="">{t('editor.previewNone')}</option>
            {sets.map((s, i) => (
              <option key={s.name} value={i} disabled={!s.data?.rows.length}>
                {s.name}
              </option>
            ))}
          </select>
          {preview && previewSet?.data && (
            <select
              value={preview.row}
              onChange={(e) => setPreview({ ...preview, row: Number(e.target.value) })}
            >
              {previewSet.data.rows.map((r, i) => (
                <option key={i} value={i}>
                  {rowLabel(previewSet.data!.headers, r, i)}
                </option>
              ))}
            </select>
          )}
        </label>
        <button className="primary" disabled={!dirty || saving} onClick={save}>
          {dirty ? t('editor.save') : t('editor.saved')}
        </button>
      </div>
      <div className="editor-body">
        <LayersPanel state={state} dispatch={dispatch} cmd={cmd} width={layersWidth} />
        <Resizer width={layersWidth} onChange={setLayersWidth} edge="left" />
        <div className="editor-center">
          <Canvas state={state} display={display?.template ?? state.template} dispatch={dispatch} />
          {display && display.problems.length > 0 && (
            <div className="canvas-problems">
              {display.problems.map((p, i) => (
                <div key={i}>{t(p)}</div>
              ))}
            </div>
          )}
        </div>
        <Resizer width={propsWidth} onChange={setPropsWidth} edge="right" min={260} />
        <PropertiesPanel
          width={propsWidth}
          state={state}
          dispatch={dispatch}
          cmd={cmd}
          sheets={sets.flatMap((s) =>
            s.data ? [{ set: s.name, headers: s.data.headers, rows: s.data.rows }] : []
          )}
          onResize={(w, h) => setResizing([w, h])}
        />
      </div>
      {resizing && (
        <ResizeDialog
          from={[state.template.width, state.template.height]}
          to={resizing}
          onClose={() => setResizing(null)}
          onChoose={(mode) => {
            dispatch({
              type: 'change',
              template: resizeTemplate(state.template, resizing[0], resizing[1], mode)
            })
            setResizing(null)
          }}
        />
      )}
    </div>
  )
}

const SHAPE_ICONS: Record<string, string> = {
  rect: '■',
  ellipse: '●',
  polygon: '⬢',
  star: '★',
  line: '╱'
}

/** Etichetta di una riga: il primo campo non vuoto oltre a amount */
function rowLabel(headers: string[], row: string[], i: number): string {
  const idx = headers.findIndex((h, j) => h !== 'amount' && !h.includes('.') && row[j]?.trim())
  return `${i + 1}. ${idx >= 0 ? row[idx].slice(0, 30) : ''}`
}
