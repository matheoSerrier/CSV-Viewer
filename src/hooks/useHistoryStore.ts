// src/hooks/useHistoryStore.ts
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { TableData, UploadEntry } from "../types";

const initialData: TableData = { headers: [], rows: [] };
const LS_KEY = "csv_viewer_history_v1";

export function useHistoryStore() {
  const [history, setHistory] = useState<UploadEntry[]>([]);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [data, setData] = useState<TableData>(initialData);
  const [error, setError] = useState<string | null>(null);

  const currentIdRef = useRef<string | null>(null);
  useEffect(() => { currentIdRef.current = currentId; }, [currentId]);

  const hasHydratedRef = useRef(false);
  const loadedSnapshotRef = useRef<string | null>(null);

  // Hydratation avant paint
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

  const persistHistory = useCallback((updated: UploadEntry[]) => {
    if (!hasHydratedRef.current) return;
    const next = JSON.stringify(updated);
    if (loadedSnapshotRef.current === next) return;
    try {
      localStorage.setItem(LS_KEY, next);
      loadedSnapshotRef.current = next;
    } catch (e) {
      console.warn("Écriture localStorage impossible:", e);
    }
  }, []);

  const beginNewFileSession = (meta: { id: string; name: string; size: number; date: number }) => {
    const entry: UploadEntry = {
      id: meta.id, name: meta.name, size: meta.size, date: meta.date,
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
  };

  const handleDataFor = useCallback((id: string, d: TableData) => {
    setHistory((prev) => {
      const updated = prev.map((e) => (e.id === id ? { ...e, data: d } : e));
      persistHistory(updated);
      return updated;
    });
    if (currentIdRef.current === id) setData(d);
  }, [persistHistory]);

  const selectHistory = (id: string) => {
    const entry = history.find((e) => e.id === id);
    if (!entry) return;
    setCurrentId(id);
    setData(entry.data);
  };

  const deleteHistoryEntry = useCallback((id: string) => {
    setHistory((prev) => {
      const idx = prev.findIndex((e) => e.id === id);
      if (idx === -1) return prev;

      const next = prev.filter((e) => e.id !== id);

      if (hasHydratedRef.current) {
        try {
          const snap = JSON.stringify(next);
          localStorage.setItem(LS_KEY, snap);
          loadedSnapshotRef.current = snap;
        } catch (e) {
          console.warn("Écriture localStorage impossible:", e);
        }
      }

      if (currentIdRef.current === id) {
        const fallback = next[idx] ?? next[idx - 1] ?? next[0] ?? null;
        if (fallback) {
          setCurrentId(fallback.id);
          setData(fallback.data);
        } else {
          setCurrentId(null);
          setData(initialData);
        }
      }

      return next;
    });
  }, []);

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

  return {
    // state
    history, currentId, data, error,
    // actions
    setError, beginNewFileSession, handleDataFor, selectHistory, deleteHistoryEntry, handleEdit,
  };
}
