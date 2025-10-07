// src/hooks/useCsvView.ts
import { useEffect, useMemo, useState } from "react";
import type { TableData, SortState } from "../types";
import { type CellComparator, normalize } from "../utils/cellCompare";

export function useCsvView(data: TableData, pageSize: number, compareCells: CellComparator) {
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<SortState>({ key: null, direction: "asc" });
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  // debounce
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 250);
    return () => clearTimeout(t);
  }, [query]);

  // 1) Filtrage (avec index global)
  const filteredEntries = useMemo(() => {
    const q = normalize(debouncedQuery);
    const withIndex = data.rows.map((row, idx) => ({ row, idx }));
    if (!q) return withIndex;
    const keys = data.headers;
    return withIndex.filter(({ row }) =>
      keys.some((k) => normalize(row[k] ?? "").includes(q))
    );
  }, [data.rows, data.headers, debouncedQuery]);

  // 2) Tri stable
  const sortedEntries = useMemo(() => {
    if (!sort.key) return filteredEntries;
    const key = sort.key;
    const dir = sort.direction === "asc" ? 1 : -1;
    return [...filteredEntries].sort((A, B) => {
      const cmp = compareCells(A.row[key] ?? "", B.row[key] ?? "");
      return cmp !== 0 ? dir * cmp : A.idx - B.idx;
    });
  }, [filteredEntries, sort.key, sort.direction, compareCells]);

  // reset page si dataset/tri/filtre change
  useEffect(() => {
    setPage(1);
  }, [data.headers.join("|"), sort.key, sort.direction, debouncedQuery]);

  const totalItems = sortedEntries.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  useEffect(() => { if (page > totalPages) setPage(totalPages); }, [totalPages, page]);

  // 3) Pagination
  const pageEntries = useMemo(() => {
    const start = (page - 1) * pageSize;
    return sortedEntries.slice(start, start + pageSize);
  }, [sortedEntries, page, pageSize]);

  const pageRows = useMemo(() => pageEntries.map((e) => e.row), [pageEntries]);
  const rowIndexMap = useMemo(() => pageEntries.map((e) => e.idx), [pageEntries]);

  const handleSort = (key: string) => {
    setSort((prev) =>
      prev.key === key
        ? { key, direction: prev.direction === "asc" ? "desc" : "asc" }
        : { key, direction: "asc" }
    );
  };

  const clearQuery = () => setQuery("");

  // Pour l'export “vue courante” (filtrée + triée, non paginée)
  const sortedRows = useMemo(() => sortedEntries.map((e) => e.row), [sortedEntries]);

  return {
    // state
    page, sort, query, debouncedQuery,
    // derived
    totalItems, totalPages, pageRows, rowIndexMap, sortedRows,
    // actions
    setPage, handleSort, setQuery, clearQuery,
  };
}
