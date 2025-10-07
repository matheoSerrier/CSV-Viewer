import type { TableData } from "../types";

interface TableProps { data: TableData; }

export default function Table({ data }: TableProps) {
  const { headers, rows } = data;
  if (headers.length === 0) return null;

  return (
    <div className="table-wrap" role="region" aria-label="Tableau des données CSV">
      <table className="data-table">
        <thead>
          <tr>
            {headers.map((h, cIdx) => (
              <th key={`header-${cIdx}`}>{h || `Colonne ${cIdx + 1}`}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr className="no-data">
              <td colSpan={headers.length}>Aucune donnée</td>
            </tr>
          ) : (
            rows.map((row, rIdx) => (
              <tr key={rIdx}>
                {headers.map((h, cIdx) => (
                  <td key={`${rIdx}-${cIdx}`}>{row[h] ?? ""}</td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
