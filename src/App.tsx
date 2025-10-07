import { useEffect, useMemo, useState } from "react";
import type { TableData, SortState } from "./types";
import Upload from "./components/Upload";
import Table from "./components/Table";
import Pagination from "./components/Pagination";

import "./styles/main.css";

const initialData: TableData = { headers: [], rows: [] };
const PAGE_SIZE = 100;

export default function App() {
  const [data, setData] = useState<TableData>(initialData);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<SortState>({ key: null, direction: "asc" });

  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 250);
    return () => clearTimeout(t);
  }, [query]);

  const collator = useMemo(
    () => new Intl.Collator("fr", { sensitivity: "base", numeric: true }),
    []
  );

  const normalize = (s: string) =>
    s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  const tryParseNumber = (raw?: string | null): number | null => {
    if (!raw) return null;
    let s = raw.trim().replace(/\u00A0/g, " ");
    if (!s) return null;
    if (/^-?\d{1,3}([ .]\d{3})*(,\d+)?$/.test(s)) {
      s = s.replace(/[ .]/g, "").replace(",", ".");
      const n = Number(s);
      return Number.isFinite(n) ? n : null;
    }
    if (/^-?\d{1,3}(,\d{3})*(\.\d+)?$/.test(s)) {
      s = s.replace(/,/g, "");
      const n = Number(s);
      return Number.isFinite(n) ? n : null;
    }
    if (/^-?\d+,\d+$/.test(s)) return Number(s.replace(",", "."));
    if (/^-?\d+(\.\d+)?$/.test(s)) return Number(s);
    return null;
  };

  const tryParseDate = (raw?: string | null): number | null => {
    if (!raw) return null;
    const s = raw.trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
      const t = Date.parse(s);
      return Number.isFinite(t) ? t : null;
    }
    const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (m) {
      const d = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1])).getTime();
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

    const aEmpty = !a || a.trim() === "";
    const bEmpty = !b || b.trim() === "";
    if (aEmpty && !bEmpty) return 1;
    if (!aEmpty && bEmpty) return -1;

    return collator.compare(a ?? "", b ?? "");
  };

  const filteredEntries = useMemo(() => {
    const q = normalize(debouncedQuery);
    const withIndex = data.rows.map((row, idx) => ({ row, idx }));
    if (!q) return withIndex;
    const keys = data.headers;
    return withIndex.filter(({ row }) =>
      keys.some((k) => normalize(row[k] ?? "").includes(q))
    );
  }, [data.rows, data.headers, debouncedQuery]);

  const sortedEntries = useMemo(() => {
    if (!sort.key) return filteredEntries;
    const key = sort.key;
    const dir = sort.direction === "asc" ? 1 : -1;
    return [...filteredEntries].sort((A, B) => {
      const cmp = compareCells(A.row[key] ?? "", B.row[key] ?? "");
      return cmp !== 0 ? dir * cmp : A.idx - B.idx;
    });
  }, [filteredEntries, sort.key, sort.direction]);

  useEffect(() => {
    setPage(1);
  }, [data.headers.join("|"), sort.key, sort.direction, debouncedQuery]);

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

  return (
    <main className="container">
      <header className="hero">
        <h1>Visualiseur CSV</h1>
        <p>Importez et explorez vos fichiers CSV facilement</p>
      </header>

      <div className="divider" />

      <Upload onData={(d) => { setError(null); setData(d); }} onError={(msg) => setError(msg)} />
      {error && <p style={{ color: "crimson", marginTop: 12 }}>{error}</p>}

      {data.headers.length > 0 && (
        <section style={{ marginTop: 24 }}>
          <div className="toolbar">
            <div className="counter">
              Total: {data.rows.length.toLocaleString()}
              {debouncedQuery ? <> — Filtrées: {totalItems.toLocaleString()}</> : null}
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

          <Pagination page={page} totalItems={totalItems} pageSize={PAGE_SIZE} onPageChange={setPage} />

          <Table
            data={{ headers: data.headers, rows: pageRows }}
            sortKey={sort.key ?? undefined}
            sortDirection={sort.direction}
            onSort={handleSort}
            onEdit={handleEdit}
            rowIndexMap={rowIndexMap}     
          />

          <Pagination page={page} totalItems={totalItems} pageSize={PAGE_SIZE} onPageChange={setPage} />
        </section>
      )}
    </main>
  );
}
