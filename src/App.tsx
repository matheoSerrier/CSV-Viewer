// src/App.tsx
import { useEffect, useMemo, useState } from "react";
import type { TableData, SortState  } from "./types";
import Upload from "./components/Upload";
import Table from "./components/Table";
import Pagination from "./components/Pagination";

import "./styles/main.css";

const initialData: TableData = { headers: [], rows: [] };
const PAGE_SIZE = 25;


export default function App() {
  const [data, setData] = useState<TableData>(initialData);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<SortState>({ key: null, direction: "asc" });

  // Collator FR pour tri texte (accents, sensible aux chiffres)
  const collator = useMemo(
    () => new Intl.Collator("fr", { sensitivity: "base", numeric: true }),
    []
  );

  // Helpers de détection nombre / date
  const tryParseNumber = (raw: string | undefined | null): number | null => {
    if (!raw) return null;
    let s = raw.trim().replace(/\u00A0/g, " "); // nbsp -> espace
    if (!s) return null;

    // formats FR: "1 234,56" / "1.234,56"
    if (/^-?\d{1,3}([ .]\d{3})*(,\d+)?$/.test(s)) {
      s = s.replace(/[ .]/g, "").replace(",", ".");
      const n = Number(s);
      return Number.isFinite(n) ? n : null;
    }
    // formats US: "1,234.56"
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
    // décimal simple avec point
    if (/^-?\d+\.\d+$/.test(s) || /^-?\d+$/.test(s)) {
      const n = Number(s);
      return Number.isFinite(n) ? n : null;
    }
    return null;
  };

  const tryParseDate = (raw: string | undefined | null): number | null => {
    if (!raw) return null;
    const s = raw.trim();
    // ISO ou ISO-like en tête
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
      const t = Date.parse(s);
      return Number.isFinite(t) ? t : null;
    }
    // DD/MM/YYYY (FR)
    const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (m) {
      const dd = Number(m[1]), mm = Number(m[2]) - 1, yyyy = Number(m[3]);
      const d = new Date(yyyy, mm, dd).getTime();
      return Number.isFinite(d) ? d : null;
    }
    return null;
  };

  const compareCells = (a: string, b: string): number => {
    // ordre: nombres > dates > texte
    const an = tryParseNumber(a);
    const bn = tryParseNumber(b);
    if (an !== null && bn !== null) return an - bn;

    const ad = tryParseDate(a);
    const bd = tryParseDate(b);
    if (ad !== null && bd !== null) return ad - bd;

    // placer vides en bas
    const aEmpty = !a || a.trim() === "";
    const bEmpty = !b || b.trim() === "";
    if (aEmpty && !bEmpty) return 1;
    if (!aEmpty && bEmpty) return -1;

    return collator.compare(a ?? "", b ?? "");
  };

  // Tri global des lignes (stable)
  const sortedRows = useMemo(() => {
    if (!sort.key) return data.rows;

    const key = sort.key;
    const dir = sort.direction === "asc" ? 1 : -1;

    return data.rows
      .map((row, idx) => ({ row, idx }))
      .sort((A, B) => {
        const cmp = compareCells(A.row[key] ?? "", B.row[key] ?? "");
        return cmp !== 0 ? dir * cmp : A.idx - B.idx; // stabilité
      })
      .map((x) => x.row);
  }, [data.rows, sort.key, sort.direction]);

  // reset page au changement de dataset ou de tri
  useEffect(() => { setPage(1); }, [data.headers.join("|"), sort.key, sort.direction]);

  const totalItems = sortedRows.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [totalItems, totalPages, page]);

  const pageRows = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return sortedRows.slice(start, start + PAGE_SIZE);
  }, [sortedRows, page]);

  const handleSort = (key: string) => {
    setSort((prev) =>
      prev.key === key
        ? { key, direction: prev.direction === "asc" ? "desc" : "asc" }
        : { key, direction: "asc" }
    );
  };

  return (
    <main className="container">
      <header className="hero">
        <h1>Visualiseur CSV</h1>
        <p>Importez et explorez vos fichiers CSV facilement</p>
      </header>

      <div className="divider" />

      <Upload
        onData={(d) => { setError(null); setData(d); }}
        onError={(msg) => setError(msg)}
      />
      {error && <p style={{ color: "crimson", marginTop: 12 }}>{error}</p>}

      {data.headers.length > 0 && (
        <section style={{ marginTop: 24 }}>
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
