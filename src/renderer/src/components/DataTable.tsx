import type { Sheet } from '../../../shared/project'

interface Props {
  sheet: Sheet
}

function DataTable({ sheet }: Props): React.JSX.Element {
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
            <tr key={i}>
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
