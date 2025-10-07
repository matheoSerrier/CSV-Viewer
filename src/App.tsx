// src/App.tsx
import { useMemo, useState } from "react";
import type { TableData } from "./types";
import Upload from "./components/Upload";
import Table from "./components/Table";
import Pagination from "./components/Pagination";
import History from "./components/History";
import Toolbar from "./components/Toolbar";

import { useHistoryStore } from "./hooks/useHistoryStore";
import { useCsvView } from "./hooks/useCsvView";
import { makeCellComparator } from "./utils/cellCompare";
import { buildCsv, downloadCsv } from "./utils/csvExport";

import "./styles/main.css";

const PAGE_SIZE = 100;

export default function App() {
  // --- état & actions centralisés (LS + historique)
  const {
    history, currentId, data, error,
    setError, beginNewFileSession, handleDataFor,
    selectHistory, deleteHistoryEntry, handleEdit,
  } = useHistoryStore();

  // --- options export
  const [sep, setSep] = useState<string>(";");
  const [withBom, setWithBom] = useState<boolean>(true);

  // --- vue (tri/filtre/pagination)
  const compareCells = useMemo(() => makeCellComparator("fr"), []);
  const {
    page, sort, query, debouncedQuery,
    totalItems, pageRows, rowIndexMap, sortedRows,
    setPage, handleSort, setQuery, clearQuery,
  } = useCsvView(data, PAGE_SIZE, compareCells);

  // --- export
  const exportCurrentView = () => {
    const csv = buildCsv(data.headers, sortedRows, sep, true);
    downloadCsv(csv, "export_vue_courante.csv", withBom);
  };
  const exportAllData = () => {
    const csv = buildCsv(data.headers, data.rows, sep, true);
    downloadCsv(csv, "export_toutes_donnees.csv", withBom);
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
        onDataFor={(id: string, d: TableData) => handleDataFor(id, d)}
        onError={(msg) => setError(msg)}
      />
      {error && <p style={{ color: "crimson", marginTop: 12 }}>{error}</p>}

      <History
        entries={history}
        currentId={currentId}
        onSelect={selectHistory}
        onDelete={deleteHistoryEntry}
      />

      {data.headers.length > 0 && (
        <section style={{ marginTop: 12 }}>
          <Toolbar
            total={data.rows.length}
            filtered={debouncedQuery ? totalItems : null}
            sep={sep} setSep={setSep}
            withBom={withBom} setWithBom={setWithBom}
            query={query} setQuery={setQuery} clearQuery={clearQuery}
            onExportView={exportCurrentView}
            onExportAll={exportAllData}
          />

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
