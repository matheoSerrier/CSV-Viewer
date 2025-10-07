// src/utils/cellCompare.ts
export const normalize = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

export const tryParseNumber = (raw?: string | null): number | null => {
  if (!raw) return null;
  let s = raw.trim().replace(/\u00A0/g, " ");
  if (!s) return null;
  if (/^-?\d{1,3}([ .]\d{3})*(,\d+)?$/.test(s)) { // FR 1 234,56
    s = s.replace(/[ .]/g, "").replace(",", ".");
    const n = Number(s);
    return Number.isFinite(n) ? n : null;
  }
  if (/^-?\d{1,3}(,\d{3})*(\.\d+)?$/.test(s)) { // US 1,234.56
    s = s.replace(/,/g, "");
    const n = Number(s);
    return Number.isFinite(n) ? n : null;
  }
  if (/^-?\d+,\d+$/.test(s)) { // 12,34
    const n = Number(s.replace(",", "."));
    return Number.isFinite(n) ? n : null;
  }
  if (/^-?\d+(\.\d+)?$/.test(s)) { // 12 or 12.34
    const n = Number(s);
    return Number.isFinite(n) ? n : null;
  }
  return null;
};

export const tryParseDate = (raw?: string | null): number | null => {
  if (!raw) return null;
  const s = raw.trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) { // ISO
    const t = Date.parse(s);
    return Number.isFinite(t) ? t : null;
  }
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/); // DD/MM/YYYY
  if (m) {
    const d = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1])).getTime();
    return Number.isFinite(d) ? d : null;
  }
  return null;
};

export type CellComparator = (a: string, b: string) => number;

export const makeCellComparator = (locale = "fr"): CellComparator => {
  const collator = new Intl.Collator(locale, { sensitivity: "base", numeric: true });
  return (a, b) => {
    const an = tryParseNumber(a);
    const bn = tryParseNumber(b);
    if (an !== null && bn !== null) return an - bn;
    const ad = tryParseDate(a);
    const bd = tryParseDate(b);
    if (ad !== null && bd !== null) return ad - bd;
    const aEmpty = !a || a.trim() === "";
    const bEmpty = !b || b.trim() === "";
    if (aEmpty && !bEmpty) return 1;
    if (!aEmpty && bEmpty) return -1;
    return collator.compare(a ?? "", b ?? "");
  };
};
