import type { Sheet } from '../../../shared/project'

interface Props {
  sheet: Sheet
  selected: number
  onSelect(index: number): void
}

function DataTable({ sheet, selected, onSelect }: Props): React.JSX.Element {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th className="row-num">#</th>
            {sheet.headers.map((h) => (
              <th key={h}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sheet.rows.map((row, i) => (
            <tr key={i} className={i === selected ? 'selected' : ''} onClick={() => onSelect(i)}>
              <td className="row-num">{i + 1}</td>
              {row.map((cell, j) => (
                <td key={j}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default DataTable
