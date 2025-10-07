import { useState } from "react";
import type { TableData } from "./types";
import Upload from "./components/Upload";
import Table from "./components/Table";

import "./styles/main.css";

const initialData: TableData = { headers: [], rows: [] };

export default function App() {
  const [data, setData] = useState<TableData>(initialData);
  const [error, setError] = useState<string | null>(null);

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
        <section style={{ marginTop: 28 }}>
          <Table data={data} />
        </section>
      )}
    </main>
  );
}
