// Détecte un BOM (Byte Order Mark) pour identifier l'encodage
function detectBom(u8: Uint8Array): { label: string | null; offset: number } {
  if (u8.length >= 3 && u8[0] === 0xEF && u8[1] === 0xBB && u8[2] === 0xBF) {
    return { label: "utf-8", offset: 3 }; // UTF-8 BOM
  }
  if (u8.length >= 2 && u8[0] === 0xFF && u8[1] === 0xFE) {
    return { label: "utf-16le", offset: 2 }; // UTF-16 LE
  }
  if (u8.length >= 2 && u8[0] === 0xFE && u8[1] === 0xFF) {
    return { label: "utf-16be", offset: 2 }; // UTF-16 BE
  }
  return { label: null, offset: 0 };
}

function countReplacementChars(text: string): number {
  const m = text.match(/\uFFFD/g);
  return m ? m.length : 0;
}

export async function decodeCsvFile(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  const u8 = new Uint8Array(buf);

  const { label: bomLabel, offset } = detectBom(u8);
  if (bomLabel) {
    const dec = new TextDecoder(bomLabel as string);
    return dec.decode(u8.subarray(offset));
  }

  const candidates = ["utf-8", "windows-1252", "iso-8859-1", "utf-16le", "utf-16be"] as const;

  let bestText = "";
  let bestScore = Number.POSITIVE_INFINITY;

  for (const enc of candidates) {
    try {
      const dec = new TextDecoder(enc as string, { fatal: false });
      const text = dec.decode(u8);
      const score = countReplacementChars(text);

      if (score < bestScore) {
        bestScore = score;
        bestText = text;
        if (score === 0) break;
      }
    } catch {
      // encodage non supporté par le navigateur : on ignore
    }
  }

  return bestText;
}
