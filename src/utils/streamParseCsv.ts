// src/utils/streamParseCsv.ts
// Parsing CSV en streaming, sans lib, avec gestion guillemets / séparateur / retours à la ligne.
// Envoie des "batches" de lignes pour garder l'app réactive.

export type OnHeaders = (headers: string[]) => void;
export type OnBatch = (rows: string[][]) => void;
export type OnProgress = (loaded: number, total: number) => void;

function detectBom(u8: Uint8Array): { label: string | null; offset: number } {
  if (u8.length >= 3 && u8[0] === 0xEF && u8[1] === 0xBB && u8[2] === 0xBF) return { label: "utf-8", offset: 3 };
  if (u8.length >= 2 && u8[0] === 0xFF && u8[1] === 0xFE) return { label: "utf-16le", offset: 2 };
  if (u8.length >= 2 && u8[0] === 0xFE && u8[1] === 0xFF) return { label: "utf-16be", offset: 2 };
  return { label: null, offset: 0 };
}

function countReplacementChars(text: string): number {
  const m = text.match(/\uFFFD/g);
  return m ? m.length : 0;
}

async function chooseEncoding(file: File): Promise<string> {
  // On lit les ~64 Ko du début pour décider
  const head = new Uint8Array(await file.slice(0, 65536).arrayBuffer());
  const bom = detectBom(head);
  if (bom.label) return bom.label;

  const candidates = ["utf-8", "windows-1252", "iso-8859-1", "utf-16le", "utf-16be"] as const;
  let best = "utf-8";
  let bestScore = Number.POSITIVE_INFINITY;

  for (const enc of candidates) {
    try {
      const dec = new TextDecoder(enc as string, { fatal: false });
      const txt = dec.decode(head);
      const score = countReplacementChars(txt);
      if (score < bestScore) { bestScore = score; best = enc as string; if (score === 0) break; }
    } catch { /* ignore */ }
  }
  return best;
}

function parseLine(line: string, sep: string): string[] {
  const out: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    const next = line[i + 1];

    if (ch === '"') {
      if (inQuotes && next === '"') { field += '"'; i++; }
      else { inQuotes = !inQuotes; }
    } else if (ch === sep && !inQuotes) {
      out.push(field); field = "";
    } else {
      field += ch;
    }
  }
  out.push(field);
  return out;
}

function detectSepOutsideQuotes(line: string): string {
  let inQuotes = false, sc = 0, cc = 0;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i], next = line[i + 1];
    if (ch === '"') {
      if (inQuotes && next === '"') { i++; continue; }
      inQuotes = !inQuotes;
    } else if (!inQuotes) {
      if (ch === ';') sc++;
      else if (ch === ',') cc++;
    }
  }
  return sc > cc ? ";" : ",";
}

export async function streamParseCsv(
  file: File,
  opts: {
    batchSize?: number;      
    maxRows?: number;         
    onHeaders: OnHeaders;
    onBatch: OnBatch;
    onProgress?: OnProgress;
  }
): Promise<void> {
  const { batchSize = 25, maxRows = 50000, onHeaders, onBatch, onProgress } = opts;

  const encoding = await chooseEncoding(file);
  const decoder = new TextDecoder(encoding);
  const reader = file.stream().getReader();

  const total = file.size;
  let loaded = 0;

  let buffer = "";
  let sep: string | null = null;
  let headers: string[] | null = null;
  let batch: string[][] = [];
  let produced = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      buffer += decoder.decode();
    } else {
      loaded += value.byteLength;
      onProgress?.(loaded, total);
      buffer += decoder.decode(value, { stream: true });
    }

    buffer = buffer.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

    if (!headers) {
      let inQuotes = false;
      let cutAt = -1;
      for (let i = 0; i < buffer.length; i++) {
        const ch = buffer[i], next = buffer[i + 1];
        if (ch === '"') {
          if (inQuotes && next === '"') { i++; continue; }
          inQuotes = !inQuotes;
        } else if (ch === "\n" && !inQuotes) {
          cutAt = i;
          break;
        }
      }
      if (cutAt === -1) {
        if (done) {
          const first = buffer;
          sep = detectSepOutsideQuotes(first);
          headers = parseLine(first, sep).map(h => h.trim());
          onHeaders(headers);
          buffer = "";
        }
        if (!done) continue;
      } else {
        const first = buffer.slice(0, cutAt);
        sep = detectSepOutsideQuotes(first);
        headers = parseLine(first, sep).map(h => h.trim());
        onHeaders(headers);
        buffer = buffer.slice(cutAt + 1);
      }
    }

    if (headers && sep) {
      let start = 0;
      let inQuotes = false;
      for (let i = 0; i < buffer.length; i++) {
        const ch = buffer[i], next = buffer[i + 1];
        if (ch === '"') {
          if (inQuotes && next === '"') { i++; continue; }
          inQuotes = !inQuotes;
        } else if (ch === "\n" && !inQuotes) {
          const line = buffer.slice(start, i);
          const cells = parseLine(line, sep);
          batch.push(cells);
          start = i + 1;

          if (batch.length >= batchSize) {
            onBatch(batch);
            produced += batch.length;
            batch = [];
            if (produced >= maxRows) {
              try { await reader.cancel(); } catch { /* ignore */ }
              return;
            }
          }
        }
      }
      buffer = buffer.slice(start);
    }

    if (done) break;
  }

  if (buffer.length > 0 && headers && sep) {
    const cells = parseLine(buffer, sep);
    if (cells.some(c => c.length > 0)) {
      batch.push(cells);
    }
  }
  if (batch.length) onBatch(batch);
}
