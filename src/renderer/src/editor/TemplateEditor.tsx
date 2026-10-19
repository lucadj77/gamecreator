import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import { useBindContext } from '../render/assets'
import { bindCard, rowToCard } from '../../../shared/model/bind'
import { findLayer, findParent, resizeTemplate } from '../../../shared/model/edit'
import type { LoadedSet } from '../../../shared/project'
import type { ShapeKind, Side, Template } from '../../../shared/model/template'
import { useI18n } from '../i18n/context'
import Segmented from '../components/Segmented'
import Resizer from '../components/Resizer'
import { usePanelSide, usePanelWidth } from '../components/usePanelWidth'
import { ImageIcon } from '../components/icons'
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
  onChange(template: Template): void
}

const NUDGE = 0.5

export default function TemplateEditor({ template, sets, onChange }: Props): React.JSX.Element {
  const { t } = useI18n()
  const [state, dispatch] = useEditor(template)
  const [resizing, setResizing] = useState<[number, number] | null>(null)
  const [preview, setPreview] = useState<{ set: number; row: number } | null>(null)
  const cmd = commands(state, dispatch)
  const [layersWidth, setLayersWidth] = usePanelWidth('layers', 230)
  const [propsWidth, setPropsWidth] = usePanelWidth('properties', 320)
  const [layersSide, toggleLayersSide] = usePanelSide('layers', 'left')
  const [propsSide, togglePropsSide] = usePanelSide('properties', 'right')

  // le modifiche risalgono subito all'app: le anteprime dei set le mostrano prima del salvataggio
  const initial = useRef(template)
  useEffect(() => {
    if (state.template !== initial.current) onChange(state.template)
  }, [state.template, onChange])

  // la tastiera: le scorciatoie usano Cmd su macOS e Ctrl altrove
  const onKey = (e: KeyboardEvent): void => {
    const mod = e.metaKey || e.ctrlKey
    const k = e.key.toLowerCase()
    // ⌘S lo gestisce l'app: salva tutto
    if (mod && k === 's') return
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
  // copia, taglia e incolla passano dagli appunti del sistema: i livelli si incollano anche in un
  // altro template o in un'altra finestra. Gli eventi arrivano sia dalla tastiera sia dal menu Modifica
  const onClipboard = (e: ClipboardEvent): void => {
    const target = e.target as HTMLElement
    if (target.closest?.('input, textarea, select, [role="dialog"]')) return
    if (e.type === 'paste') {
      if (cmd.paste(e.clipboardData?.getData('text/plain') ?? '')) e.preventDefault()
      return
    }
    // con del testo selezionato nella pagina vale la copia normale
    if (window.getSelection()?.toString()) return
    const text = cmd.copy()
    if (!text) return
    e.clipboardData?.setData('text/plain', text)
    e.preventDefault()
    if (e.type === 'cut') cmd.remove()
  }
  // si riregistrano a ogni render per leggere lo stato corrente
  useEffect(() => {
    window.addEventListener('keydown', onKey)
    document.addEventListener('copy', onClipboard)
    document.addEventListener('cut', onClipboard)
    document.addEventListener('paste', onClipboard)
    return () => {
      window.removeEventListener('keydown', onKey)
      document.removeEventListener('copy', onClipboard)
      document.removeEventListener('cut', onClipboard)
      document.removeEventListener('paste', onClipboard)
    }
  })

  const previewSet = preview ? sets[preview.set] : null
  const bindCtx = useBindContext()
  const display = useMemo(() => {
    const data = previewSet?.data
    const row = data?.rows[preview?.row ?? -1]
    // senza riga si applicano i soli valori del template: le formule mostrano il risultato
    const card = data && row ? rowToCard(data.headers, row) : { fields: {}, amount: 1 }
    return bindCard(state.template, card, bindCtx)
  }, [state.template, previewSet, preview?.row, bindCtx])

  const tools: [React.ReactNode, () => void, string][] = [
    ['T', () => cmd.add('text'), t('tool.text')],
    [<ImageIcon key="image" />, () => cmd.add('image'), t('tool.image')],
    ...(['rect', 'ellipse', 'polygon', 'star', 'line'] as ShapeKind[]).map<
      [React.ReactNode, () => void, string]
    >((s) => [
      SHAPE_ICONS[s],
      () => cmd.add('shape', s),
      t(`tool.${s}` as Parameters<typeof t>[0])
    ]),
    ['#', () => cmd.add('value'), t('tool.value')]
  ]

  // i pannelli stanno a sinistra o a destra della tela, anche entrambi sullo stesso lato
  const layersPanel = (
    <LayersPanel
      state={state}
      dispatch={dispatch}
      cmd={cmd}
      width={layersWidth}
      side={layersSide}
      onToggleSide={toggleLayersSide}
    />
  )
  const propsPanel = (
    <PropertiesPanel
      width={propsWidth}
      state={state}
      dispatch={dispatch}
      cmd={cmd}
      sheets={sets.flatMap((s) =>
        s.data ? [{ set: s.name, headers: s.data.headers, rows: s.data.rows }] : []
      )}
      onResize={(w, h) => setResizing([w, h])}
      side={propsSide}
      onToggleSide={togglePropsSide}
    />
  )
  const panels = [
    {
      key: 'layers',
      side: layersSide,
      el: layersPanel,
      width: layersWidth,
      setWidth: setLayersWidth,
      min: 160
    },
    {
      key: 'properties',
      side: propsSide,
      el: propsPanel,
      width: propsWidth,
      setWidth: setPropsWidth,
      min: 260
    }
  ]
  const withResizer = (p: (typeof panels)[number]): React.JSX.Element[] => {
    const resizer = (
      <Resizer
        key={`${p.key}-resizer`}
        width={p.width}
        onChange={p.setWidth}
        edge={p.side}
        min={p.min}
      />
    )
    const panel = <Fragment key={p.key}>{p.el}</Fragment>
    return p.side === 'left' ? [panel, resizer] : [resizer, panel]
  }
  const left = panels.filter((p) => p.side === 'left').flatMap(withResizer)
  const right = panels.filter((p) => p.side === 'right').flatMap(withResizer)

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
            ['front', t('preview.front'), t('tip.front')],
            ['back', t('preview.back'), t('tip.back')]
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
      </div>
      <div className="editor-body">
        {left}
        <div className="editor-center">
          <Canvas state={state} display={display.template} dispatch={dispatch} />
          {display.problems.length > 0 && (
            <div className="canvas-problems">
              {display.problems.map((p, i) => (
                <div key={i}>{t(p)}</div>
              ))}
            </div>
          )}
        </div>
        {right}
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
