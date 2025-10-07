// src/components/Toolbar.tsx
interface Props {
  total: number;
  filtered?: number | null;
  sep: string;
  setSep: (v: string) => void;
  withBom: boolean;
  setWithBom: (v: boolean) => void;
  query: string;
  setQuery: (v: string) => void;
  clearQuery: () => void;
  onExportView: () => void;
  onExportAll: () => void;
}

export default function Toolbar({
  total, filtered,
  sep, setSep, withBom, setWithBom,
  query, setQuery, clearQuery,
  onExportView, onExportAll,
}: Props) {
  return (
    <div className="toolbar">
      <div className="counter">
        Total: {total.toLocaleString()}
        {typeof filtered === "number" ? <> — Filtrées: {filtered.toLocaleString()}</> : null}
      </div>

      <div className="export">
        <label>
          Séparateur&nbsp;
          <select value={sep} onChange={(e) => setSep(e.target.value)}>
            <option value=";">Point-virgule (;)</option>
            <option value=",">Virgule (,)</option>
            <option value="\\t">Tabulation (\\t)</option>
          </select>
        </label>
        <label className="export-bom">
          <input type="checkbox" checked={withBom} onChange={(e) => setWithBom(e.target.checked)} />
          UTF-8 BOM (Excel)
        </label>
        <button className="btn-secondary" onClick={onExportView}>Exporter (vue courante)</button>
        <button className="btn-secondary" onClick={onExportAll}>Exporter (toutes données)</button>
      </div>

      <div className="search">
        <input
          type="text"
          placeholder="Filtrer (toutes colonnes)…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Filtrer les lignes du tableau"
        />
        {query && <button className="btn-secondary" onClick={clearQuery}>Effacer</button>}
      </div>
    </div>
  );
}
