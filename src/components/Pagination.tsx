import { useState } from "react";

interface Props {
  page: number;                 // page courante (1-based)
  totalItems: number;           // nb total de lignes
  pageSize: number;             // nb lignes/page (25)
  onPageChange: (page: number) => void;
}

export default function Pagination({ page, totalItems, pageSize, onPageChange }: Props) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const [jump, setJump] = useState<string>("");

  const go = (p: number) => onPageChange(Math.min(totalPages, Math.max(1, p)));

  return (
    <div className="pagination">
      <button onClick={() => go(1)} disabled={page <= 1} aria-label="Première page">⏮</button>
      <button onClick={() => go(page - 1)} disabled={page <= 1} aria-label="Page précédente">◀</button>

      <span className="status">Page {page} / {totalPages} • {totalItems.toLocaleString()} lignes</span>

      <input
        className="page-input"
        type="number"
        min={1}
        max={totalPages}
        placeholder="Aller à…"
        value={jump}
        onChange={(e) => setJump(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && jump) { go(parseInt(jump, 10)); setJump(""); }
        }}
      />
      <button onClick={() => { if (jump) { go(parseInt(jump, 10)); setJump(""); }}}>Aller</button>

      <button onClick={() => go(page + 1)} disabled={page >= totalPages} aria-label="Page suivante">▶</button>
      <button onClick={() => go(totalPages)} disabled={page >= totalPages} aria-label="Dernière page">⏭</button>
    </div>
  );
}
