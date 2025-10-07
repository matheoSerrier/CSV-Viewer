// src/components/Upload.tsx
import { type ChangeEvent, useRef, useState } from "react";
import type { TableData, Row } from "../types";
import { parseCsv } from "../utils/parseCsv";
import { decodeCsvFile } from "../utils/decodeCsvFile";
import { streamParseCsv } from "../utils/streamParseCsv";

interface UploadProps {
  onData: (data: TableData) => void;
  onError?: (message: string) => void;
}

const LARGE_THRESHOLD = 20 * 1024 * 1024; // 20 Mo
const PREVIEW_MAX_ROWS = 50000;           // tu peux monter/descendre

export default function Upload({ onData, onError }: UploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [progress, setProgress] = useState<{loaded: number; total: number} | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const sanitizeHeaders = (headers: string[]) => {
    // même logique que le parseur "non vide + unique"
    const used = new Map<string, number>();
    return headers.map((h, i) => {
      const name = (h || `Colonne ${i + 1}`).trim();
      const base = name;
      if (!used.has(base)) { used.set(base, 1); return base; }
      let n = used.get(base)! + 1;
      let cand = `${base} (${n})`;
      while (used.has(cand)) { n++; cand = `${base} (${n})`; }
      used.set(base, n); used.set(cand, 1);
      return cand;
    });
  };

  const toRowsObjects = (headers: string[], rows: string[][]): Row[] => {
    const out: Row[] = [];
    for (const cells of rows) {
      const r: Row = {};
      const len = Math.max(headers.length, cells.length);
      for (let i = 0; i < len; i++) {
        const key = headers[i] ?? `Colonne ${i + 1}`;
        r[key] = (cells[i] ?? "").trim();
      }
      out.push(r);
    }
    return out;
  };

  const handleSmallFile = async (file: File) => {
    const text = await decodeCsvFile(file);
    const data = parseCsv(text);
    if (data.headers.length === 0) return onError?.("Fichier CSV vide ou invalide.");
    onData(data);
  };

  const handleLargeFile = async (file: File) => {
    setNotice(`Fichier volumineux (${(file.size/1024/1024).toFixed(1)} Mo) : prévisualisation des ${PREVIEW_MAX_ROWS.toLocaleString()} premières lignes.`);
    const table: TableData = { headers: [], rows: [] };

    await streamParseCsv(file, {
      maxRows: PREVIEW_MAX_ROWS,
      batchSize: 1000,
      onProgress: (loaded, total) => setProgress({loaded, total}),
      onHeaders: (h) => { table.headers = sanitizeHeaders(h); },
      onBatch: (batch) => {
        // convertir et accumuler
        const objs = toRowsObjects(table.headers, batch);
        table.rows.push(...objs);
        onData({ ...table }); // maj "live"
      },
    });

    setNotice((prev) => prev ? prev + " (prévisualisation terminée)" : null);
    setProgress(null);
  };

  const handleFile = async (file: File) => {
    const isCsv = file.type === "text/csv" || file.name.toLowerCase().endsWith(".csv");
    if (!isCsv) return onError?.("Veuillez sélectionner un fichier .csv");
    setProgress(null);
    setNotice(null);

    try {
      if (file.size > LARGE_THRESHOLD) {
        await handleLargeFile(file);
      } else {
        await handleSmallFile(file);
      }
    } catch (e) {
      console.error(e);
      onError?.("Erreur lors de la lecture du fichier.");
    }
  };

  const onInputChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) await handleFile(file);
    e.target.value = "";
  };

  const onDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault(); e.stopPropagation(); setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) await handleFile(file);
  };

  return (
    <>
      <div
        className={`dropzone ${dragOver ? "is-dragover" : ""}`}
        onClick={() => inputRef.current?.click()}
        onDrop={onDrop}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={(e) => { e.preventDefault(); setDragOver(false); }}
        role="button"
        aria-label="Cliquez ou glissez-déposez un fichier CSV"
        tabIndex={0}
      >
        <svg className="dropzone-icon" viewBox="0 0 64 64" aria-hidden="true">
          <rect x="6" y="22" width="52" height="34" rx="8" fill="#FBBF24" stroke="#F59E0B" />
          <rect x="6" y="16" width="26" height="12" rx="4" fill="#FCD34D" stroke="#F59E0B" />
        </svg>
        <p className="dropzone-title">Cliquez ou glissez-déposez votre fichier CSV ici</p>
        <p className="dropzone-hint">Format accepté : <code>.csv</code></p>
        <input ref={inputRef} className="file-input" type="file" accept=".csv,text/csv" onChange={onInputChange} />
      </div>

      {progress && (
        <div style={{maxWidth:820, margin:"12px auto 0"}}>
          <div style={{height:8, background:"#e5e7eb", borderRadius:999}}>
            <div style={{
              height:"100%",
              width: `${(progress.loaded / progress.total) * 100}%`,
              background:"#3b82f6",
              borderRadius:999,
              transition:"width .2s ease"
            }} />
          </div>
          <div style={{marginTop:6, fontSize:12, color:"#64748b", textAlign:"right"}}>
            {(progress.loaded/1024/1024).toFixed(1)} Mo / {(progress.total/1024/1024).toFixed(1)} Mo
          </div>
        </div>
      )}

      {notice && (
        <p style={{maxWidth:820, margin:"8px auto 0", color:"#64748b", fontSize:14}}>
          {notice}
        </p>
      )}
    </>
  );
}
