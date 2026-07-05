/**
 * HomePC-Archiv (KosmoData-Dach, D5) — die sechste Sammlung.
 *
 * Owner-Mandat (`docs/EIN-SYSTEM-KOSMODATA.md`, D5): KosmoData ist am HomePC
 * faktisch «alles, was auf der HDD liegt». Diese Sammlung führt darüber NUR
 * ein Manifest (was liegt wo, Kategorie, geschätzte Grösse, Notiz) — die
 * grossen Bestände selbst werden NIE in den Browser/IndexedDB kopiert, sie
 * bleiben auf der HDD. `visibility` ist darum immer `'private'`, nie in die
 * Website (Ehrlichkeit ist Pflicht).
 *
 * Das echte Voll-Indexieren/Einbetten der HDD (Ordner scannen, Dateilisten,
 * Embedding via bge-m3) ist ein HomeStation-Auftrag — die Bridge hat heute
 * keinen HDD-Endpunkt (nur `/health`, `/jobs`, `/stt`, `/tts`, `/embed`).
 *
 * Eigene IndexedDB (`kosmo-archiv`, Store `bestaende`) — bewusst NICHT der
 * Projekt-Tresor `kosmo-projekte`, dasselbe `openDb`/`reqResult`/`txDone`-
 * Muster wie in `modules/prepare/knowledge.ts` (`kosmo-wissen`).
 */

export type ArchivKategorie = 'projekte' | 'referenzen' | 'assets' | 'wissen' | 'fotos' | 'sonstiges';

export interface ArchivEintrag {
  id: string;
  name: string;
  /** HDD-Pfad/Beschreibung, z.B. 'D:\\Archiv\\Projekte 2010-2020' — kein Datei-Handle, nur Text. */
  pfad: string;
  kategorie: ArchivKategorie;
  /** Geschätzt/gemeldet — die Bytes selbst liegen NICHT hier. */
  groesseBytes?: number;
  /** Anzahl Dateien, falls bekannt (z.B. aus dem Ordner-Register). */
  dateien?: number;
  notiz?: string;
  /** manuell erfasst oder per Browser-Ordner-Register (`webkitdirectory`). */
  quelle: 'manuell' | 'ordner';
  /** Archiv ist IMMER privat — nie in die Website. */
  visibility: 'private';
  addedAt: string;
}

const DB_NAME = 'kosmo-archiv';
const DB_VERSION = 1;
const STORE = 'bestaende';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'id' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function txDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

function reqResult<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/** Alle Bestände, neueste zuerst (`addedAt` absteigend). */
export async function listeArchiv(): Promise<ArchivEintrag[]> {
  const db = await openDb();
  const tx = db.transaction(STORE, 'readonly');
  const all = await reqResult(tx.objectStore(STORE).getAll() as IDBRequest<ArchivEintrag[]>);
  db.close();
  return all.sort((a, b) => b.addedAt.localeCompare(a.addedAt));
}

/**
 * Bestand anlegen oder aktualisieren (upsert über `id`). Neue Einträge
 * bekommen eine frische `id`/`addedAt`; `visibility` ist immer `'private'`.
 * Ein vorhandener Eintrag (id trifft) behält sein ursprüngliches `addedAt`.
 */
export async function speichereArchiv(
  eintrag: Omit<ArchivEintrag, 'id' | 'addedAt' | 'visibility'> & { id?: string },
): Promise<ArchivEintrag> {
  const db = await openDb();
  const tx = db.transaction(STORE, 'readwrite');
  const store = tx.objectStore(STORE);
  const vorhanden = eintrag.id
    ? await reqResult(store.get(eintrag.id) as IDBRequest<ArchivEintrag | undefined>)
    : undefined;

  const naechster: ArchivEintrag = {
    id: vorhanden?.id ?? eintrag.id ?? `archiv-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    name: eintrag.name,
    pfad: eintrag.pfad,
    kategorie: eintrag.kategorie,
    ...(eintrag.groesseBytes !== undefined ? { groesseBytes: eintrag.groesseBytes } : {}),
    ...(eintrag.dateien !== undefined ? { dateien: eintrag.dateien } : {}),
    ...(eintrag.notiz !== undefined ? { notiz: eintrag.notiz } : {}),
    quelle: eintrag.quelle,
    visibility: 'private',
    addedAt: vorhanden?.addedAt ?? new Date().toISOString(),
  };
  store.put(naechster);
  await txDone(tx);
  db.close();
  return naechster;
}

export async function entferneArchiv(id: string): Promise<void> {
  const db = await openDb();
  const tx = db.transaction(STORE, 'readwrite');
  tx.objectStore(STORE).delete(id);
  await txDone(tx);
  db.close();
}

/** Stichwort-Suche über name/pfad/kategorie/notiz — pur, ohne IndexedDB, testbar. */
export function sucheArchiv(eintraege: ArchivEintrag[], query: string): ArchivEintrag[] {
  const q = query.toLowerCase().trim();
  if (!q) return eintraege;
  return eintraege.filter((e) => {
    const hay = [e.name, e.pfad, e.kategorie, e.notiz].filter(Boolean).join(' ').toLowerCase();
    return hay.includes(q);
  });
}

/** Menschlich lesbare Grösse (B/KB/MB/GB/TB); '—' wenn unbekannt. */
export function formatGroesse(bytes?: number): string {
  if (bytes === undefined || Number.isNaN(bytes)) return '—';
  if (bytes < 1024) return `${bytes} B`;
  const einheiten = ['KB', 'MB', 'GB', 'TB'];
  let wert = bytes / 1024;
  let i = 0;
  while (wert >= 1024 && i < einheiten.length - 1) {
    wert /= 1024;
    i++;
  }
  return `${wert.toFixed(wert < 10 ? 1 : 0)} ${einheiten[i]}`;
}
