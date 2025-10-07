// src/App.tsx
import { useEffect, useMemo, useState, useRef, useCallback, useLayoutEffect } from "react";
import type { TableData, SortState, UploadEntry } from "./types";
import Upload from "./components/Upload";
import Table from "./components/Table";
import Pagination from "./components/Pagination";
import History from "./components/History";

import "./styles/main.css";

const initialData: TableData = { headers: [], rows: [] };
const PAGE_SIZE = 100;
const LS_KEY = "csv_viewer_history_v1";

export default function App() {
  // --- Historique
  const [history, setHistory] = useState<UploadEntry[]>([]);
  const [currentId, setCurrentId] = useState<string | null>(null);

  // Ref toujours synchro avec l'id courant (évite les closures obsolètes)
  const currentIdRef = useRef<string | null>(null);
  useEffect(() => {
    currentIdRef.current = currentId;
  }, [currentId]);

  // Flag d'hydratation pour ne pas écraser le localStorage avant lecture
  const hasHydratedRef = useRef(false);
  const loadedSnapshotRef = useRef<string | null>(null);

  // --- Dataset courant
  const [data, setData] = useState<TableData>(initialData);
  const [error, setError] = useState<string | null>(null);

  // --- Pagination / Tri / Filtre
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<SortState>({ key: null, direction: "asc" });
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  // --- Export options
  const [sep, setSep] = useState<string>(";");
  const [withBom, setWithBom] = useState<boolean>(true);

  // 🔹 Hydratation (avant paint) – évite toute fenêtre où on écrirait "[]"
  useLayoutEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      loadedSnapshotRef.current = raw ?? null;
      if (raw) {
        const parsed = JSON.parse(raw) as UploadEntry[];
        setHistory(parsed);
        if (parsed.length) {
          const last = parsed[parsed.length - 1];
          setCurrentId(last.id);
          setData(last.data);
        }
      }
    } catch (e) {
      console.warn("Lecture localStorage impossible:", e);
    } finally {
      hasHydratedRef.current = true;
    }
  }, []);

  // Helper pour persister dans localStorage
  const persistHistory = useCallback((updatedHistory: UploadEntry[]) => {
    if (!hasHydratedRef.current) return;
    const next = JSON.stringify(updatedHistory);
    if (loadedSnapshotRef.current === next) return;
    try {
      localStorage.setItem(LS_KEY, next);
      loadedSnapshotRef.current = next;
    } catch (e) {
      console.warn("Écriture localStorage impossible:", e);
    }
  }, []);

  // Debounce du filtre
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 250);
    return () => clearTimeout(t);
  }, [query]);

  // Collator FR pour tri texte (accents/chiffres)
  const collator = useMemo(
    () => new Intl.Collator("fr", { sensitivity: "base", numeric: true }),
    []
  );

  // Helpers
  const normalize = (s: string) =>
    s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  const tryParseNumber = (raw?: string | null): number | null => {
    if (!raw) return null;
    let s = raw.trim().replace(/\u00A0/g, " ");
    if (!s) return null;
    // FR "1 234,56" / "1.234,56"
    if (/^-?\d{1,3}([ .]\d{3})*(,\d+)?$/.test(s)) {
      s = s.replace(/[ .]/g, "").replace(",", ".");
      const n = Number(s);
      return Number.isFinite(n) ? n : null;
    }
    // US "1,234.56"
    if (/^-?\d{1,3}(,\d{3})*(\.\d+)?$/.test(s)) {
      s = s.replace(/,/g, "");
      const n = Number(s);
      return Number.isFinite(n) ? n : null;
    }
    // décimal simple virgule
    if (/^-?\d+,\d+$/.test(s)) {
      const n = Number(s.replace(",", "."));
      return Number.isFinite(n) ? n : null;
    }
    // décimal simple point / entier
    if (/^-?\d+(\.\d+)?$/.test(s)) {
      const n = Number(s);
      return Number.isFinite(n) ? n : null;
    }
    return null;
  };

  const tryParseDate = (raw?: string | null): number | null => {
    if (!raw) return null;
    const s = raw.trim();
    // ISO
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
      const t = Date.parse(s);
      return Number.isFinite(t) ? t : null;
    }
    // FR DD/MM/YYYY
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

    // vides en bas
    const aEmpty = !a || a.trim() === "";
    const bEmpty = !b || b.trim() === "";
    if (aEmpty && !bEmpty) return 1;
    if (!aEmpty && bEmpty) return -1;

    return collator.compare(a ?? "", b ?? "");
  };

  // ---- Historique: gestion
  const beginNewFileSession = (meta: { id: string; name: string; size: number; date: number }) => {
    const entry: UploadEntry = {
      id: meta.id,
      name: meta.name,
      size: meta.size,
      date: meta.date,
      data: { headers: [], rows: [] },
    };
    setHistory((prev) => {
      const updated = [...prev, entry];
      persistHistory(updated);
      return updated;
    });
    setCurrentId(entry.id);
    setData(entry.data);
    setError(null);
    setPage(1);
    setSort({ key: null, direction: "asc" });
    setQuery("");
  };

  const deleteHistoryEntry = useCallback((id: string) => {
    setHistory((prev) => {
      const idx = prev.findIndex((e) => e.id === id);
      if (idx === -1) return prev;

      const next = prev.filter((e) => e.id !== id);

      // 🔴 Persister immédiatement le nouvel historique
      if (hasHydratedRef.current) {
        try {
          const snap = JSON.stringify(next);
          localStorage.setItem(LS_KEY, snap);
          loadedSnapshotRef.current = snap; // garde le snapshot en phase -> évite que l'effet réécrive l'ancien
        } catch (e) {
          console.warn("Écriture localStorage impossible:", e);
        }
      }

      // Si on supprime l'élément affiché -> choisir un fallback
      if (currentIdRef.current === id) {
        const fallback =
          next[idx] ??        // l'élément qui suivait
          next[idx - 1] ??    // sinon le précédent
          next[0] ??          // sinon le premier
          null;

        if (fallback) {
          setCurrentId(fallback.id);
          setData(fallback.data);
        } else {
          setCurrentId(null);
          setData(initialData);
        }

        // reset UI
        setPage(1);
        setSort({ key: null, direction: "asc" });
        setQuery("");
      }

      return next;
    });
  }, []);


  // 🔴 Updates par ID (corrige décalage + affichage direct)
  const handleDataFor = useCallback((id: string, d: TableData) => {
    setHistory((prev) => {
      const updated = prev.map((e) => (e.id === id ? { ...e, data: d } : e));
      persistHistory(updated);
      return updated;
    });
    if (currentIdRef.current === id) {
      setData(d);
    }
  }, [persistHistory]);

  const selectHistory = (id: string) => {
    const entry = history.find((e) => e.id === id);
    if (!entry) return;
    setCurrentId(id);
    setData(entry.data);
    setPage(1);
    setSort({ key: null, direction: "asc" });
  };

  // ---- Filtrage -> tri -> pagination (sur dataset courant)
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

  // --- Edition inline (maj dataset + historique courant)
  const handleEdit = (globalIndex: number, key: string, newValue: string) => {
    setData((prev) => {
      const nextRows = prev.rows.slice();
      nextRows[globalIndex] = { ...nextRows[globalIndex], [key]: newValue };
      const next = { ...prev, rows: nextRows };
      const id = currentIdRef.current;
      if (id) {
        setHistory((hist) => {
          const updated = hist.map((e) => (e.id === id ? { ...e, data: next } : e));
          persistHistory(updated);
          return updated;
        });
      }
      return next;
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
    if (s.includes('"')) s = s.replace(/"/g, '""');
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
    const content = (withBom ? "\uFEFF" : "") + csv;
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
        onNewFile={beginNewFileSession}
        onDataFor={handleDataFor}
        onError={(msg) => setError(msg)}
      />
      {error && <p style={{ color: "crimson", marginTop: 12 }}>{error}</p>}

      {/* Historique */}
      <History
        entries={history}
        currentId={currentId}
        onSelect={selectHistory}
        onDelete={deleteHistoryEntry}
      />

      {data.headers.length > 0 && (
        <section style={{ marginTop: 12 }}>
          {/* Toolbar */}
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