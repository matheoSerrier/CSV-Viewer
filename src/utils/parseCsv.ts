import type { TableData } from "../types";

export function parseCsv(text: string): TableData {
  // Normaliser toutes les fins de lignes
  text = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  // Détection du séparateur
  const firstLine = (text.split("\n")[0] ?? "");
  const sep =
    ((firstLine.match(/;/g)?.length || 0) > (firstLine.match(/,/g)?.length || 0))
      ? ";"
      : ",";

  const rows: string[][] = [];
  let field = "";
  let row: string[] = [];
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];

    if (ch === '"') {
      if (inQuotes && next === '"') {
        field += '"'; i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === sep && !inQuotes) {
      row.push(field); field = "";
    } else if (ch === "\n" && !inQuotes) {
      row.push(field); rows.push(row); row = []; field = "";
    } else {
      field += ch;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field); rows.push(row);
  }

  if (rows.length === 0) return { headers: [], rows: [] };

  let headers = rows[0].map((h) => h.trim());

  const maxCols = rows.reduce((m, r) => Math.max(m, r.length), headers.length);

  if (headers.length < maxCols) {
    for (let i = headers.length; i < maxCols; i++) {
      headers.push(`Colonne ${i + 1}`);
    }
  }

  const used = new Map<string, number>();
  headers = headers.map((h, i) => {
    const name = h || `Colonne ${i + 1}`;
    const base = name;

    if (!used.has(base)) {
      used.set(base, 1);
      return base;
    }

    let n = used.get(base)! + 1;
    let candidate = `${base} (${n})`;

    while (used.has(candidate)) {
      n++;
      candidate = `${base} (${n})`;
    }

    used.set(base, n);
    used.set(candidate, 1);

    return candidate;
  });

  const dataRows = rows.slice(1).map((r) => {
    const copy = [...r];
    while (copy.length < maxCols) copy.push("");
    return copy.slice(0, maxCols);
  });

  return {
    headers,
    rows: dataRows.map((cells) => {
      const obj: Record<string, string> = {};
      headers.forEach((h, i) => {
        obj[h] = (cells[i] ?? "").trim();
      });
      return obj;
    }),
  };
}
