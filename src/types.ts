// Une ligne du tableau : clé = nom de colonne, valeur = texte de la cellule
export type Row = Record<string, string>;

// Données tabulaires complètes
export interface TableData {
  headers: string[]; // intitulés de colonnes (première ligne du CSV)
  rows: Row[];       // lignes de données
}

export type SortDirection = "asc" | "desc";

export interface SortState {
  key: string | null;       // nom de colonne (header)
  direction: SortDirection; // 'asc' | 'desc'
}

export interface UploadEntry {
  id: string;            // ex: `${Date.now()}-${name}`
  name: string;          // nom du fichier
  size: number;          // en octets
  date: number;          // timestamp d'upload
  data: TableData;       // données (avec modifications persistées)
}