// src/utils/csvExport.ts
export const quoteCell = (val: string, separator: string): string => {
  let s = val ?? "";
  const needsQuotes = s.includes('"') || s.includes(separator) || s.includes("\n") || s.includes("\r");
  if (s.includes('"')) s = s.replace(/"/g, '""');
  return needsQuotes ? `"${s}"` : s;
};

export const buildCsv = (
  headers: string[],
  rows: Record<string, string>[],
  separator: string,
  crlf = true
): string => {
  const sepStr = separator === "\\t" ? "\t" : separator;
  const EOL = crlf ? "\r\n" : "\n";
  const head = headers.map((h) => quoteCell(h, sepStr)).join(sepStr);
  const lines = rows.map((r) => headers.map((h) => quoteCell(r[h] ?? "", sepStr)).join(sepStr));
  return [head, ...lines].join(EOL) + EOL;
};

export const downloadCsv = (csv: string, filename = "export.csv", withBom = true) => {
  const content = (withBom ? "\uFEFF" : "") + csv;
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
};
