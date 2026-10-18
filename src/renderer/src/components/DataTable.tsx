import { useEffect, useRef, useState } from 'react'
import type { Sheet } from '../../../shared/project'
import { moveRow, removeColumn, setCell } from '../../../shared/model/sheet'
import { useI18n } from '../i18n/context'

interface Props {
  sheet: Sheet
  /** Righe selezionate; la prima è quella mostrata nell'anteprima */
  selected: number[]
  onSelect(rows: number[]): void
  /** `key` raggruppa le modifiche consecutive della stessa cella in un solo annullamento */
  onChange(sheet: Sheet, key?: string): void
}

interface Cell {
  row: number
  col: number
}

/**
 * Tabella del set modificabile come un foglio di calcolo: clic per scegliere la cella, doppio
 * clic, Invio o una lettera per scriverci. Le colonne delle proprietà (`nome.color`) restano
 * nascoste finché non si apre il loro livello con il +.
 */
function DataTable({ sheet, selected, onSelect, onChange }: Props): React.JSX.Element {
  const { t } = useI18n()
  const [active, setActive] = useState<Cell | null>(null)
  const [editing, setEditing] = useState<{ cell: Cell; original: string } | null>(null)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [dragRow, setDragRow] = useState<number | null>(null)
  const [dropRow, setDropRow] = useState<number | null>(null)
  const wrapRef = useRef<HTMLDivElement>(null)

  const base = (h: string): string => (h.includes('.') ? h.slice(0, h.indexOf('.')) : h)
  const hasProps = (h: string): boolean => sheet.headers.some((x) => x.startsWith(h + '.'))
  const visible = sheet.headers
    .map((h, i) => ({ h, i }))
    .filter(
      ({ h }) => !h.includes('.') || expanded.has(base(h)) || !sheet.headers.includes(base(h))
    )

  const value = (c: Cell): string => sheet.rows[c.row]?.[c.col] ?? ''
  const write = (c: Cell, v: string): void =>
    onChange(setCell(sheet, c.row, c.col, v), `cell:${c.row}:${c.col}`)

  const activate = (c: Cell): void => {
    setActive(c)
    if (!selected.includes(c.row) || selected.length > 1) onSelect([c.row])
  }

  const startEdit = (c: Cell, replaceWith?: string): void => {
    setEditing({ cell: c, original: value(c) })
    if (replaceWith !== undefined) write(c, replaceWith)
  }

  const move = (dr: number, dc: number): void => {
    if (!active) return
    const vi = visible.findIndex((v) => v.i === active.col)
    const col = visible[Math.max(0, Math.min(visible.length - 1, vi + dc))]?.i ?? active.col
    const row = Math.max(0, Math.min(sheet.rows.length - 1, active.row + dr))
    activate({ row, col })
  }

  // la cella attiva resta visibile spostandosi con le frecce
  useEffect(() => {
    if (!active) return
    wrapRef.current
      ?.querySelector(`[data-cell="${active.row}:${active.col}"]`)
      ?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
  }, [active])

  const onKeyDown = (e: React.KeyboardEvent): void => {
    if (editing || !active || e.metaKey || e.ctrlKey) return
    const k = e.key
    if (k === 'ArrowUp') move(-1, 0)
    else if (k === 'ArrowDown') move(1, 0)
    else if (k === 'ArrowLeft') move(0, -1)
    else if (k === 'ArrowRight' || k === 'Tab') move(0, e.shiftKey && k === 'Tab' ? -1 : 1)
    else if (k === 'Enter' || k === 'F2') startEdit(active)
    else if (k === 'Delete' || k === 'Backspace') write(active, '')
    else if (k.length === 1 && !e.altKey) startEdit(active, k)
    else return
    e.preventDefault()
  }

  const selectRow = (i: number, e: React.MouseEvent): void => {
    if (e.shiftKey && selected.length) {
      const from = selected[0]
      const [a, b] = from < i ? [from, i] : [i, from]
      onSelect([
        from,
        ...Array.from({ length: b - a + 1 }, (_, k) => a + k).filter((r) => r !== from)
      ])
    } else if (e.metaKey || e.ctrlKey) {
      onSelect(selected.includes(i) ? selected.filter((r) => r !== i) : [...selected, i])
    } else onSelect([i])
    setActive(null)
    wrapRef.current?.focus()
  }

  return (
    <div className="table-wrap" ref={wrapRef} tabIndex={0} onKeyDown={onKeyDown}>
      <table className="data-table">
        <thead>
          <tr>
            <th className="row-num">#</th>
            {visible.map(({ h, i }) => (
              <th key={h} className={h.includes('.') ? 'prop-col' : undefined}>
                <span className="th-inner">
                  <span title={h}>{h.includes('.') ? h.slice(h.indexOf('.')) : h}</span>
                  {!h.includes('.') && hasProps(h) && (
                    <button
                      className="icon-btn"
                      title={expanded.has(h) ? t('table.collapse') : t('table.expand')}
                      onClick={() => {
                        const next = new Set(expanded)
                        if (next.has(h)) next.delete(h)
                        else next.add(h)
                        setExpanded(next)
                      }}
                    >
                      {expanded.has(h) ? '−' : '+'}
                    </button>
                  )}
                  <button
                    className="icon-btn th-remove"
                    title={t('table.removeColumn')}
                    onClick={() => {
                      if (window.confirm(t('table.removeColumnConfirm', { column: h })))
                        onChange(removeColumn(sheet, i))
                    }}
                  >
                    ×
                  </button>
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sheet.rows.map((row, r) => (
            <tr
              key={r}
              className={[
                selected.includes(r) && 'selected',
                dropRow === r && dragRow !== null && (dragRow < r ? 'drop-after' : 'drop-before')
              ]
                .filter(Boolean)
                .join(' ')}
              onDragOver={(e) => {
                if (dragRow === null) return
                e.preventDefault()
                if (dropRow !== r) setDropRow(r)
              }}
              onDrop={(e) => {
                e.preventDefault()
                if (dragRow !== null && dropRow !== null && dragRow !== dropRow) {
                  onChange(moveRow(sheet, dragRow, dropRow))
                  onSelect([dropRow])
                }
                setDragRow(null)
                setDropRow(null)
              }}
            >
              <td
                className="row-num"
                draggable
                title={t('table.rowHint')}
                onClick={(e) => selectRow(r, e)}
                onDragStart={(e) => {
                  e.dataTransfer.effectAllowed = 'move'
                  e.dataTransfer.setData('text/plain', String(r + 1))
                  setDragRow(r)
                }}
                onDragEnd={() => {
                  setDragRow(null)
                  setDropRow(null)
                }}
              >
                {r + 1}
              </td>
              {visible.map(({ h, i }) => {
                const c = { row: r, col: i }
                const isActive = active?.row === r && active.col === i
                const isEditing = editing?.cell.row === r && editing.cell.col === i
                return (
                  <td
                    key={h}
                    data-cell={`${r}:${i}`}
                    className={isActive ? 'active-cell' : undefined}
                    onClick={() => activate(c)}
                    onDoubleClick={() => startEdit(c)}
                  >
                    {isEditing ? (
                      <CellEditor
                        value={row[i] ?? ''}
                        onChange={(v) => write(c, v)}
                        onDone={(how) => {
                          if (how === 'cancel') write(c, editing.original)
                          setEditing(null)
                          wrapRef.current?.focus()
                          if (how === 'down') move(1, 0)
                          if (how === 'right') move(0, 1)
                          if (how === 'left') move(0, -1)
                        }}
                      />
                    ) : (
                      row[i]
                    )}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
      {sheet.rows.length === 0 && <p className="muted table-empty">{t('table.empty')}</p>}
    </div>
  )
}

/** Campo di una cella: le modifiche arrivano subito alla carta, Esc le annulla */
function CellEditor({
  value,
  onChange,
  onDone
}: {
  value: string
  onChange(v: string): void
  onDone(how: 'down' | 'right' | 'left' | 'cancel' | 'blur'): void
}): React.JSX.Element {
  const ref = useRef<HTMLTextAreaElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.focus()
    el.setSelectionRange(el.value.length, el.value.length)
  }, [])
  return (
    <textarea
      ref={ref}
      className="cell-editor"
      value={value}
      rows={Math.max(1, value.split('\n').length)}
      onChange={(e) => onChange(e.target.value)}
      onBlur={() => onDone('blur')}
      onKeyDown={(e) => {
        e.stopPropagation()
        // Alt+Invio va a capo dentro la cella, come in Excel
        if (e.key === 'Enter' && e.altKey) {
          e.preventDefault()
          const el = e.currentTarget
          const pos = el.selectionStart
          onChange(el.value.slice(0, pos) + '\n' + el.value.slice(el.selectionEnd))
          requestAnimationFrame(() => el.setSelectionRange(pos + 1, pos + 1))
        } else if (e.key === 'Enter') {
          e.preventDefault()
          onDone('down')
        } else if (e.key === 'Tab') {
          e.preventDefault()
          onDone(e.shiftKey ? 'left' : 'right')
        } else if (e.key === 'Escape') {
          e.preventDefault()
          onDone('cancel')
        }
      }}
    />
  )
}

export default DataTable
