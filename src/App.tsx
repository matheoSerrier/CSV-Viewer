// src/App.tsx
import { useEffect, useMemo, useState } from "react";
import type { TableData, SortState } from "./types";
import Upload from "./components/Upload";
import Table from "./components/Table";
import Pagination from "./components/Pagination";

import "./styles/main.css";

const initialData: TableData = { headers: [], rows: [] };
const PAGE_SIZE = 100;

export default function App() {
  // --- Dataset & erreurs
  const [data, setData] = useState<TableData>(initialData);
  const [error, setError] = useState<string | null>(null);

  // --- Pagination & Tri
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<SortState>({ key: null, direction: "asc" });

  // --- Filtre global (avec debounce)
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 250);
    return () => clearTimeout(t);
  }, [query]);

  // --- Options d'export
  const [sep, setSep] = useState<string>(";");   // ';' | ',' | '\t' (via '\\t' dans le select)
  const [withBom, setWithBom] = useState<boolean>(true);

  // --- Collator FR pour tri texte (accents, chiffres)
  const collator = useMemo(
    () => new Intl.Collator("fr", { sensitivity: "base", numeric: true }),
    []
  );

  // --- Helpers
  const normalize = (s: string) =>
    s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""); // retire les accents

  const tryParseNumber = (raw?: string | null): number | null => {
    if (!raw) return null;
    let s = raw.trim().replace(/\u00A0/g, " "); // nbsp -> espace
    if (!s) return null;

    // FR: "1 234,56" ou "1.234,56"
    if (/^-?\d{1,3}([ .]\d{3})*(,\d+)?$/.test(s)) {
      s = s.replace(/[ .]/g, "").replace(",", ".");
      const n = Number(s);
      return Number.isFinite(n) ? n : null;
    }
    // US: "1,234.56"
    if (/^-?\d{1,3}(,\d{3})*(\.\d+)?$/.test(s)) {
      s = s.replace(/,/g, "");
      const n = Number(s);
      return Number.isFinite(n) ? n : null;
    }
    // décimal simple avec virgule
    if (/^-?\d+,\d+$/.test(s)) {
      const n = Number(s.replace(",", "."));
      return Number.isFinite(n) ? n : null;
    }
    // décimal simple avec point ou entier
    if (/^-?\d+(\.\d+)?$/.test(s)) {
      const n = Number(s);
      return Number.isFinite(n) ? n : null;
    }
    return null;
  };

  const tryParseDate = (raw?: string | null): number | null => {
    if (!raw) return null;
    const s = raw.trim();

    // ISO / ISO-like
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
      const t = Date.parse(s);
      return Number.isFinite(t) ? t : null;
    }
    // FR: DD/MM/YYYY
    const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (m) {
      const dd = Number(m[1]), mm = Number(m[2]) - 1, yyyy = Number(m[3]);
      const d = new Date(yyyy, mm, dd).getTime();
      return Number.isFinite(d) ? d : null;
    }
    return null;
  };

  const compareCells = (a: string, b: string): number => {
    const an = tryParseNumber(a);
    const bn = tryParseNumber(b);
    if (an !== null && bn !== null) return an - bn;

    const ad = tryParseDate(a);
    const bd = tryParseDate(b);
    if (ad !== null && bd !== null) return ad - bd;

    // vides en bas
    const aEmpty = !a || a.trim() === "";
    const bEmpty = !b || b.trim() === "";
    if (aEmpty && !bEmpty) return 1;
    if (!aEmpty && bEmpty) return -1;

    return collator.compare(a ?? "", b ?? "");
  };

  // --- 1) Filtrage -> entries avec index global
  const filteredEntries = useMemo(() => {
    const q = normalize(debouncedQuery);
    const withIndex = data.rows.map((row, idx) => ({ row, idx }));
    if (!q) return withIndex;
    const keys = data.headers;
    return withIndex.filter(({ row }) =>
      keys.some((k) => normalize(row[k] ?? "").includes(q))
    );
  }, [data.rows, data.headers, debouncedQuery]);

  // --- 2) Tri (stable) sur les entries filtrées
  const sortedEntries = useMemo(() => {
    if (!sort.key) return filteredEntries;
    const key = sort.key;
    const dir = sort.direction === "asc" ? 1 : -1;
    return [...filteredEntries].sort((A, B) => {
      const cmp = compareCells(A.row[key] ?? "", B.row[key] ?? "");
      return cmp !== 0 ? dir * cmp : A.idx - B.idx; // stabilité via index initial
    });
  }, [filteredEntries, sort.key, sort.direction]);

  // reset page si dataset / tri / filtre change
  useEffect(() => {
    setPage(1);
  }, [data.headers.join("|"), sort.key, sort.direction, debouncedQuery]);

  // --- 3) Pagination
  const totalItems = sortedEntries.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [totalItems, totalPages, page]);

  const pageEntries = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return sortedEntries.slice(start, start + PAGE_SIZE);
  }, [sortedEntries, page]);

  const pageRows = useMemo(() => pageEntries.map((e) => e.row), [pageEntries]);
  const rowIndexMap = useMemo(() => pageEntries.map((e) => e.idx), [pageEntries]);

  // --- Edition inline: mise à jour de la ligne "globale"
  const handleEdit = (globalIndex: number, key: string, newValue: string) => {
    setData((prev) => {
      const nextRows = prev.rows.slice();
      nextRows[globalIndex] = { ...nextRows[globalIndex], [key]: newValue };
      return { ...prev, rows: nextRows };
    });
  };

  const handleSort = (key: string) => {
    setSort((prev) =>
      prev.key === key
        ? { key, direction: prev.direction === "asc" ? "desc" : "asc" }
        : { key, direction: "asc" }
    );
  };

  const clearQuery = () => setQuery("");

  // --- EXPORT CSV
  const quoteCell = (val: string, separator: string): string => {
    let s = val ?? "";
    const needsQuotes =
      s.includes('"') || s.includes(separator) || s.includes("\n") || s.includes("\r");
    if (s.includes('"')) s = s.replace(/"/g, '""'); // escape ""
    return needsQuotes ? `"${s}"` : s;
  };

  const buildCsv = (
    headers: string[],
    rows: Record<string, string>[],
    separator: string,
    crlf = true
  ): string => {
    const sepStr = separator === "\\t" ? "\t" : separator;
    const EOL = crlf ? "\r\n" : "\n";
    const head = headers.map((h) => quoteCell(h, sepStr)).join(sepStr);
    const lines = rows.map((r) =>
      headers.map((h) => quoteCell(r[h] ?? "", sepStr)).join(sepStr)
    );
    return [head, ...lines].join(EOL) + EOL;
  };

  const downloadCsv = (csv: string, filename = "export.csv") => {
    const content = (withBom ? "\uFEFF" : "") + csv; // BOM UTF-8 optionnel pour Excel
    const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const exportCurrentView = () => {
    const rows = sortedEntries.map((e) => e.row);
    const csv = buildCsv(data.headers, rows, sep, true);
    downloadCsv(csv, "export_vue_courante.csv");
  };

  const exportAllData = () => {
    const csv = buildCsv(data.headers, data.rows, sep, true);
    downloadCsv(csv, "export_toutes_donnees.csv");
  };

  return (
    <main className="container">
      <header className="hero">
        <h1>Visualiseur CSV</h1>
        <p>Importez et explorez vos fichiers CSV facilement</p>
      </header>

      <div className="divider" />

      <Upload
        onData={(d) => {
          setError(null);
          setData(d);
        }}
        onError={(msg) => setError(msg)}
      />

      {error && <p style={{ color: "crimson", marginTop: 12 }}>{error}</p>}

      {data.headers.length > 0 && (
        <section style={{ marginTop: 24 }}>
          {/* Toolbar: compteurs + export + filtre */}
          <div className="toolbar">
            <div className="counter">
              Total: {data.rows.length.toLocaleString()}
              {debouncedQuery ? <> — Filtrées: {totalItems.toLocaleString()}</> : null}
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
                <input
                  type="checkbox"
                  checked={withBom}
                  onChange={(e) => setWithBom(e.target.checked)}
                />
                UTF-8 BOM (Excel)
              </label>
              <button className="btn-secondary" onClick={exportCurrentView}>
                Exporter (vue courante)
              </button>
              <button className="btn-secondary" onClick={exportAllData}>
                Exporter (toutes données)
              </button>
            </div>

            <div className="search">
              <input
                type="text"
                placeholder="Filtrer (toutes colonnes)…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                aria-label="Filtrer les lignes du tableau"
              />
              {query && (
                <button className="btn-secondary" onClick={clearQuery}>
                  Effacer
                </button>
              )}
            </div>
          </div>

          <Pagination
            page={page}
            totalItems={totalItems}
            pageSize={PAGE_SIZE}
            onPageChange={setPage}
          />

          <Table
            data={{ headers: data.headers, rows: pageRows }}
            sortKey={sort.key ?? undefined}
            sortDirection={sort.direction}
            onSort={handleSort}
            onEdit={handleEdit}
            rowIndexMap={rowIndexMap}
          />

          <Pagination
            page={page}
            totalItems={totalItems}
            pageSize={PAGE_SIZE}
            onPageChange={setPage}
          />
        </section>
      )}
    </main>
  );
}
