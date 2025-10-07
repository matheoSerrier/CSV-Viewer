// src/components/History.tsx
import type { UploadEntry } from "../types";

interface Props {
  entries: UploadEntry[];
  currentId: string | null;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
}

export default function History({ entries, currentId, onSelect, onDelete }: Props) {
  if (!entries.length) return null;

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation(); // ne pas déclencher le select
    if (confirm("Voulez-vous vraiment supprimer ce fichier de l'historique ?")) {
      onDelete(id);
    }
  };

  const handleKey = (e: React.KeyboardEvent, id: string) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onSelect(id);
    }
  };

  return (
    <div className="history">
      <div className="history-title">Historique</div>
      <div className="history-list">
        {entries.map((e) => (
          <div
            key={e.id}
            className={`history-chip ${currentId === e.id}`}
            title={`${e.name} — ${new Date(e.date).toLocaleString()}`}
            role="button"
            tabIndex={0}
            onClick={() => onSelect(e.id)}
            onKeyDown={(ev) => handleKey(ev, e.id)}
          >
            <span className="history-name">{e.name}</span>
            <span className="history-meta">{e.data.rows.length.toLocaleString()} lignes</span>

            <button
              type="button"
              className="history-delete"
              onClick={(ev) => handleDelete(ev, e.id)}
              title="Supprimer de l'historique"
              aria-label="Supprimer"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
