// src/components/Table.tsx
import { useState } from "react";
import type { TableData } from "../types";

interface TableProps {
  data: TableData;
  sortKey?: string | null;
  sortDirection?: "asc" | "desc";
  onSort?: (key: string) => void;
  rowIndexMap?: number[];
  onEdit?: (globalIndex: number, key: string, newValue: string) => void;
}

export default function Table({
  data,
  sortKey,
  sortDirection,
  onSort,
  rowIndexMap,
  onEdit,
}: TableProps) {
  const [editing, setEditing] = useState<{ r: number; c: number } | null>(null);
  const [draft, setDraft] = useState("");

  const { headers, rows } = data;

  if (headers.length === 0) return null;

  const isActive = (h: string) => sortKey === h;
  const arrow = (h: string) => (isActive(h) ? (sortDirection === "asc" ? "▲" : "▼") : "↕");

  const startEdit = (rIdx: number, cIdx: number, initial: string) => {
    setEditing({ r: rIdx, c: cIdx });
    setDraft(initial ?? "");
  };

  const commitEdit = () => {
    if (!editing) return;
    const { r, c } = editing;
    const key = headers[c] ?? `Colonne ${c + 1}`;
    const globalIndex = rowIndexMap ? rowIndexMap[r] : r;
    onEdit?.(globalIndex, key, draft);
    setEditing(null);
    setDraft("");
  };

  const cancelEdit = () => {
    setEditing(null);
    setDraft("");
  };

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
                {headers.map((h, cIdx) => {
                  const value = row[h] ?? "";
                  const isEditing = editing?.r === rIdx && editing?.c === cIdx;
                  return (
                    <td
                      key={`${rIdx}-${cIdx}`}
                      onDoubleClick={() => startEdit(rIdx, cIdx, value)}
                      className={isEditing ? "cell-editing" : undefined}
                    >
                      {isEditing ? (
                        <textarea
                          className="cell-editor"
                          value={draft}
                          autoFocus
                          onChange={(e) => setDraft(e.target.value)}
                          onBlur={commitEdit}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                              e.preventDefault();
                              commitEdit();
                            } else if (e.key === "Escape") {
                              e.preventDefault();
                              cancelEdit();
                            }
                          }}
                        />
                      ) : (
                        <div className="cell-value">{value}</div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
