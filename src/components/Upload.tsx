import { type ChangeEvent, useRef, useState } from "react";
import type { TableData } from "../types";
import { parseCsv } from "../utils/parseCsv";
import { decodeCsvFile } from "../utils/decodeCsvFile";

interface UploadProps {
  onData: (data: TableData) => void;
  onError?: (message: string) => void;
}

export default function Upload({ onData, onError }: UploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleTextToData = (text: string) => {
    const data = parseCsv(text);
    if (data.headers.length === 0) {
      onError?.("Fichier CSV vide ou invalide.");
      return;
    }
    onData(data);
  };

  const handleFile = async (file: File) => {
    const isCsv = file.type === "text/csv" || file.name.toLowerCase().endsWith(".csv");
    if (!isCsv) return onError?.("Veuillez sélectionner un fichier .csv");
    try {
      const text = await decodeCsvFile(file);
      handleTextToData(text);
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
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) await handleFile(file);
  };

  const onDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
  };

  const onDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  };

  return (
    <div
      className={`dropzone ${dragOver ? "is-dragover" : ""}`}
      onClick={() => inputRef.current?.click()}
      onDrop={onDrop}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
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

      <input
        ref={inputRef}
        className="file-input"
        id="csv-input"
        type="file"
        accept=".csv,text/csv"
        onChange={onInputChange}
      />
    </div>
  );
}
