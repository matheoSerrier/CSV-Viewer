import type { TableData } from "../types";

interface TableProps {
  data: TableData;
  sortKey?: string | null;
  sortDirection?: "asc" | "desc";
  onSort?: (key: string) => void; // appelé quand on clique un header
}

export default function Table({ data, sortKey, sortDirection, onSort }: TableProps) {
  const { headers, rows } = data;
  if (headers.length === 0) return null;

  const isActive = (h: string) => sortKey === h;
  const arrow = (h: string) =>
    isActive(h) ? (sortDirection === "asc" ? "▲" : "▼") : "↕";

  return (
    <div className="table-wrap" role="region" aria-label="Tableau des données CSV">
      <table className="data-table">
        <thead>
          <tr>
            {headers.map((h, cIdx) => (
              <th key={`header-${cIdx}`}>
                <button
                  className={`th-sort ${isActive(h) ? "th-active" : ""}`}
                  onClick={() => onSort?.(h)}
                  title={`Trier par "${h || `Colonne ${cIdx + 1}`}"`}
                >
                  <span className="th-label">{h || `Colonne ${cIdx + 1}`}</span>
                  <span className="th-arrow" aria-hidden="true">{arrow(h)}</span>
                </button>
              </th>
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
