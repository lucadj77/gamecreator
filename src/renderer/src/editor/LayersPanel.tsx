import { useState } from 'react'
import { findParent, isNameTaken, moveLayerTo, patchLayer } from '../../../shared/model/edit'
import type { Layer } from '../../../shared/model/template'
import { useI18n } from '../i18n/context'
import { ImageIcon } from '../components/icons'
import type { Commands } from './commands'
import type { EditorAction, EditorState } from './useEditor'

interface Props {
  state: EditorState
  dispatch: React.Dispatch<EditorAction>
  cmd: Commands
  width: number
}

type DropWhere = 'before' | 'after' | 'inside'

const ICONS: Record<string, React.ReactNode> = {
  text: 'T',
  image: <ImageIcon />,
  group: '▤',
  rect: '■',
  ellipse: '●',
  polygon: '⬢',
  star: '★',
  line: '╱',
  path: '✎',
  value: '#'
}

export default function LayersPanel({ state, dispatch, cmd, width }: Props): React.JSX.Element {
  const { t } = useI18n()
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const [renaming, setRenaming] = useState<string | null>(null)
  const [dragging, setDragging] = useState<string | null>(null)
  const [drop, setDrop] = useState<{ id: string; where: DropWhere } | null>(null)
  const { template: tpl, side, selection } = state
  const layers = tpl[side]

  const select = (l: Layer, e: React.MouseEvent): void => {
    const parent = findParent(layers, l.id)?.id ?? null
    const additive = e.shiftKey || e.metaKey || e.ctrlKey
    const sameParent = selection.every((id) => (findParent(layers, id)?.id ?? null) === parent)
    let ids = [l.id]
    if (additive && sameParent)
      ids = selection.includes(l.id) ? selection.filter((id) => id !== l.id) : [...selection, l.id]
    dispatch({ type: 'select', ids, scope: parent })
  }

  const rename = (l: Layer, name: string): void => {
    setRenaming(null)
    const clean = name.trim()
    if (!clean || clean === l.name || /[.{}[\]]/.test(clean) || isNameTaken(tpl, clean, l.id))
      return
    dispatch({ type: 'change', template: patchLayer(tpl, side, l.id, { name: clean }) })
  }

  const rows = (list: Layer[], depth: number): React.ReactNode =>
    list.map((l) => {
      const open = l.type === 'group' && !collapsed.has(l.id)
      return (
        <li key={l.id}>
          <div
            className={[
              'layer-row',
              selection.includes(l.id) && 'selected',
              !l.visible && 'hidden',
              dragging === l.id && 'dragging',
              drop?.id === l.id && `drop-${drop.where}`
            ]
              .filter(Boolean)
              .join(' ')}
            style={{ paddingLeft: 6 + depth * 14 }}
            onClick={(e) => select(l, e)}
            onDoubleClick={() => setRenaming(l.id)}
            draggable={renaming !== l.id}
            onDragStart={(e) => {
              e.dataTransfer.effectAllowed = 'move'
              e.dataTransfer.setData('text/plain', l.name)
              setDragging(l.id)
            }}
            onDragEnd={() => {
              setDragging(null)
              setDrop(null)
            }}
            onDragOver={(e) => {
              if (!dragging || dragging === l.id) return
              e.preventDefault()
              const r = e.currentTarget.getBoundingClientRect()
              const f = (e.clientY - r.top) / r.height
              // al centro di un gruppo si entra nel gruppo, ai bordi si va sopra o sotto
              const where: DropWhere =
                l.type === 'group' && f > 0.25 && f < 0.75 ? 'inside' : f < 0.5 ? 'before' : 'after'
              if (drop?.id !== l.id || drop.where !== where) setDrop({ id: l.id, where })
            }}
            onDrop={(e) => {
              e.preventDefault()
              if (dragging && drop) {
                const moved = moveLayerTo(tpl, side, dragging, drop.id, drop.where)
                if (moved !== tpl)
                  dispatch({ type: 'change', template: moved, selection: [dragging] })
              }
              setDragging(null)
              setDrop(null)
            }}
          >
            <span
              className="layer-twisty"
              onClick={(e) => {
                if (l.type !== 'group') return
                e.stopPropagation()
                const next = new Set(collapsed)
                if (open) next.add(l.id)
                else next.delete(l.id)
                setCollapsed(next)
              }}
            >
              {l.type === 'group' ? (open ? '▾' : '▸') : ''}
            </span>
            <span className="layer-icon">{ICONS[l.type === 'shape' ? l.shape : l.type]}</span>
            {renaming === l.id ? (
              <input
                className="layer-rename"
                autoFocus
                defaultValue={l.name}
                onClick={(e) => e.stopPropagation()}
                onBlur={(e) => rename(l, e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') rename(l, e.currentTarget.value)
                  if (e.key === 'Escape') setRenaming(null)
                }}
              />
            ) : (
              <span className="layer-name">{l.name}</span>
            )}
            <button
              className={`icon-btn${l.locked ? ' on' : ''}`}
              title={l.locked ? t('layers.unlock') : t('layers.lock')}
              onClick={(e) => {
                e.stopPropagation()
                cmd.toggle(l.id, 'locked')
              }}
            >
              {l.locked ? '🔒' : '🔓'}
            </button>
            <button
              className={`icon-btn${l.visible ? '' : ' on'}`}
              title={l.visible ? t('layers.hide') : t('layers.show')}
              onClick={(e) => {
                e.stopPropagation()
                cmd.toggle(l.id, 'visible')
              }}
            >
              {l.visible ? '👁' : '–'}
            </button>
          </div>
          {open && l.type === 'group' && <ul>{rows(l.children, depth + 1)}</ul>}
        </li>
      )
    })

  const none = selection.length === 0
  return (
    <aside className="layers" style={{ width }}>
      <h2>{t('layers.title')}</h2>
      <div className="layers-list">
        {layers.length ? (
          <ul>{rows(layers, 0)}</ul>
        ) : (
          <p className="muted small">{t('layers.empty')}</p>
        )}
      </div>
      <p className="muted small layers-hint">{t('layers.hint')}</p>
      <div className="layers-actions">
        <button disabled={none} title={t('layers.up')} onClick={() => cmd.move('up')}>
          ↑
        </button>
        <button disabled={none} title={t('layers.down')} onClick={() => cmd.move('down')}>
          ↓
        </button>
        <button disabled={!cmd.canGroup} title={t('layers.group')} onClick={cmd.group}>
          ⊞
        </button>
        <button disabled={!cmd.canUngroup} title={t('layers.ungroup')} onClick={cmd.ungroup}>
          ⊟
        </button>
        <button disabled={none} title={t('layers.duplicate')} onClick={cmd.duplicate}>
          ⧉
        </button>
        <button disabled={none} title={t('layers.delete')} onClick={cmd.remove}>
          🗑
        </button>
      </div>
    </aside>
  )
}
