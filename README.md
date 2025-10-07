# CSV Viewer — React + TypeScript

Une application web légère pour **ouvrir, explorer et exporter** des fichiers CSV, même volumineux.  
Démo en ligne : **https://csv-viewer-flax.vercel.app/**

---

## ✨ Fonctionnalités

- **Import par clic / glisser‑déposer** (`.csv`)
- **Compatibilité CSV** robuste :
  - Normalisation des fins de ligne (CRLF/CR → LF)
  - Détection automatique du **séparateur** `;` ou `,` (tabulation optionnelle à l’export)
  - Gestion des champs **entre guillemets** (avec `""` échappés) et **retours à la ligne** internes
  - Tolérance d’**en‑têtes manquants / dupliqués** (génère `Colonne N`, rend les noms uniques)
- **Encodage** : lecture UTF‑8 (BOM ou non), avec **fallback ISO‑8859‑1** pour les CSV Windows courants
- **Très gros fichiers** :
  - **Prévisualisation** en streaming (par *batch*), configurable
  - Bouton **« Charger tout le fichier »** pour aller au‑delà de la prévisualisation
- **Suppression des doublons** stricte (lignes identiques, après `trim`)
- **Pagination** (100 lignes/page par défaut)
- **Tri** par colonne (stable), **détection nombres/dates**, **vides en bas**
- **Filtre global** insensible à la casse et aux accents
- **Édition inline** (double‑clic) :
  - **Entrée** : valider, **Shift+Entrée** : retour à la ligne, **Échap** : annuler, **blur** : valider
- **Export CSV** :
  - **Vue courante** (filtre + tri appliqués) ou **toutes les données**
  - Séparateur `;`, `,` ou `\t`, option **BOM UTF‑8** (meilleure compatibilité Excel)
- **Historique des fichiers** (persisté en **localStorage**) :
  - Navigation rapide entre fichiers
  - Restauration au rechargement
  - **Suppression** d’entrées
  - Résilient au **React StrictMode** (pas d’écrasement du storage au démarrage)

---

## 🧰 Stack technique

- **React + TypeScript**
- **Vite** (dev server ultra‑rapide)
- **CSS** minimaliste sans framework (fichier `src/styles/main.css`)
- Aucune dépendance lourde côté parsing (parser CSV maison, streaming File API)

---

## 🗂️ Structure du projet

```text
src/
  App.tsx
  types.ts
  styles/
    main.css
  components/
    Upload.tsx          # import CSV (petits / gros fichiers), streaming + préview + "charger tout"
    Table.tsx           # rendu du tableau (tri, édition inline)
    Pagination.tsx
    History.tsx         # historique (sélection & suppression)
    Toolbar.tsx         # compteurs, filtre, options d'export
  hooks/
    useHistoryStore.ts  # historique + persistance localStorage, synchronisation par id de session
    useCsvView.ts       # filtre → tri → pagination, états UI de la vue
  utils/
    cellCompare.ts      # normalisation, parsing nombres/dates, comparateur de cellules
    csvExport.ts        # génération et téléchargement CSV
    parseCsv.ts
    streamParseCsv.ts
    decodeCsvFile.ts
```

---

## 🚀 Lancer le projet en local

### Prérequis
- **Node.js** ≥ 18 (recommandé)
- Un gestionnaire de paquets : **pnpm**, **npm** ou **yarn**

### Installation

```bash
# clone
git clone https://github.com/matheoSerrier/CSV-Viewer.git
cd CSV-Viewer

# install
pnpm install     # ou: npm install / yarn
```

### Démarrage en développement

```bash
pnpm dev         # ou: npm run dev / yarn dev
# Ouvrir http://localhost:5173
```

### Build de production

```bash
pnpm build       # ou: npm run build / yarn build
pnpm preview     # ou: npm run preview / yarn preview
```

---

## 🌐 Déploiement

Le projet est déjà déployé sur **Vercel** :  
👉 **https://csv-viewer-flax.vercel.app/**


---

## ⚙️ Réglages utiles

- **Pagination** : `PAGE_SIZE` (défaut `100`) — dans `App.tsx` ou via `useCsvView`.
- **Prévisualisation gros fichiers** : `PREVIEW_MAX_ROWS` et `BATCH_SIZE` — `Upload.tsx`.
- **Export** : options dans `Toolbar` (`;`, `,`, `\t`, **BOM**).
- **Historique (localStorage)** :
  - Clé utilisée : `csv_viewer_history_v1`
  - Persistance protégée contre les doubles montages de **React StrictMode**
  - Supprimer une entrée via l’UI la retire **aussi** du localStorage

---

## 🗺️ Roadmap (idées)

- Export **sélection/colonnes** spécifiques
- **Indexation** pour recherche ultra‑rapide sur gros CSV
- **Undo/Redo** des éditions

