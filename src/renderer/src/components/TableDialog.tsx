import { useState } from 'react'
import type { HAlign } from '../../../shared/model/template'
import { tableSource } from '../../../shared/model/document'
import { Dialog } from '../editor/dialogs'
import { useI18n } from '../i18n/context'

// Tabella di un documento compilata in una griglia, senza scrivere il Markdown a mano. Apre
// anche la tabella su cui sta il cursore, per modificarla. Si può incollare da un foglio di
// calcolo: le celle copiate riempiono la griglia a partire da quella scelta.

export interface TableValue {
  header: string[]
  align: (HAlign | null)[]
  rows: string[][]
}

const EMPTY: TableValue = {
  header: ['', '', ''],
  align: [null, null, null],
  rows: [
    ['', '', ''],
    ['', '', '']
  ]
}

export default function TableDialog({
  initial,
  onSave,
  onClose
}: {
  /** La tabella da modificare; senza, una nuova */
  initial?: TableValue
  /** Il Markdown della tabella */
  onSave(text: string): void
  onClose(): void
}): React.JSX.Element {
  const { t } = useI18n()
  const [table, setTable] = useState<TableValue>(initial ?? EMPTY)
  const cols = table.header.length
  /** Righe della griglia: la prima è l'intestazione */
  const grid = [table.header, ...table.rows]

  const setGrid = (g: string[][], align = table.align): void =>
    setTable({ header: g[0], rows: g.slice(1), align })
  const setCell = (r: number, c: number, value: string): void =>
    setGrid(grid.map((row, i) => (i === r ? row.map((x, k) => (k === c ? value : x)) : row)))
  const addColumn = (): void =>
    setGrid(
      grid.map((row) => [...row, '']),
      [...table.align, null]
    )
  const removeColumn = (c: number): void =>
    setGrid(
      grid.map((row) => row.filter((_, k) => k !== c)),
      table.align.filter((_, k) => k !== c)
    )
  const addRow = (): void => setGrid([...grid, Array<string>(cols).fill('')])
  const removeRow = (r: number): void => setGrid(grid.filter((_, i) => i !== r))
  const setAlign = (c: number, a: HAlign | null): void =>
    setTable({ ...table, align: table.align.map((x, k) => (k === c ? a : x)) })

  /** Incolla celle copiate da un foglio di calcolo (separate da tabulazioni e a capo) */
  const paste = (r: number, c: number, e: React.ClipboardEvent<HTMLInputElement>): void => {
    const text = e.clipboardData.getData('text/plain').replace(/\r\n?/g, '\n').replace(/\n$/, '')
    if (!text.includes('\t') && !text.includes('\n')) return
    e.preventDefault()
    const cells = text.split('\n').map((l) => l.split('\t'))
    const width = Math.max(cols, c + Math.max(...cells.map((l) => l.length)))
    const height = Math.max(grid.length, r + cells.length)
    const next = Array.from({ length: height }, (_, i) =>
      Array.from({ length: width }, (_, k) => cells[i - r]?.[k - c] ?? grid[i]?.[k] ?? '')
    )
    const align = Array.from({ length: width }, (_, k) => table.align[k] ?? null)
    setGrid(next, align)
  }

  const ok = cols > 0 && grid.some((row) => row.some((c) => c.trim()))
  return (
    <Dialog
      title={initial ? t('documents.editTable') : t('documents.insertTable')}
      onClose={onClose}
    >
      <div className="dialog-form table-dialog">
        <div className="table-dialog-scroll">
          <table className="table-dialog-grid">
            <thead>
              <tr>
                {table.align.map((a, c) => (
                  <th key={c}>
                    <select
                      value={a ?? ''}
                      title={t('documents.tableAlign')}
                      onChange={(e) => setAlign(c, (e.target.value || null) as HAlign | null)}
                    >
                      <option value="">{t('documents.tableAlignAuto')}</option>
                      <option value="left">{t('documents.alignLeft')}</option>
                      <option value="center">{t('documents.tableAlignCenter')}</option>
                      <option value="right">{t('documents.tableAlignRight')}</option>
                    </select>
                    <button
                      className="icon-btn"
                      title={t('documents.removeColumn')}
                      disabled={cols <= 1}
                      onClick={() => removeColumn(c)}
                    >
                      ×
                    </button>
                  </th>
                ))}
                <th />
              </tr>
            </thead>
            <tbody>
              {grid.map((row, r) => (
                <tr key={r} className={r === 0 ? 'table-dialog-header' : undefined}>
                  {row.map((value, c) => (
                    <td key={c}>
                      <input
                        value={value}
                        autoFocus={r === 0 && c === 0}
                        placeholder={r === 0 ? t('documents.tableHeading') : ''}
                        onChange={(e) => setCell(r, c, e.target.value)}
                        onPaste={(e) => paste(r, c, e)}
                        style={{ textAlign: table.align[c] ?? undefined }}
                      />
                    </td>
                  ))}
                  <td>
                    {r > 0 && (
                      <button
                        className="icon-btn"
                        title={t('documents.removeRow')}
                        onClick={() => removeRow(r)}
                      >
                        ×
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="dialog-row">
          <button onClick={addRow}>{t('documents.addRow')}</button>
          <button onClick={addColumn}>{t('documents.addColumn')}</button>
        </div>
        <p className="muted small">{t('documents.tableHint')}</p>
        <div className="dialog-buttons">
          <button onClick={onClose}>{t('dialog.cancel')}</button>
          <button
            className="primary"
            disabled={!ok}
            onClick={() =>
              // le righe rimaste vuote non si scrivono
              onSave(
                tableSource(
                  table.header,
                  table.align,
                  table.rows.filter((r) => r.some((c) => c.trim()))
                )
              )
            }
          >
            {initial ? t('documents.saveTable') : t('documents.insert')}
          </button>
        </div>
      </div>
    </Dialog>
  )
}
