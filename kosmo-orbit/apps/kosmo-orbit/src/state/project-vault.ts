import { History, KosmoDoc, parseDocJson, type DocJson } from '@kosmo/kernel';
import { useProject } from './project-store';

/**
 * Projekt-Tresor — Autosave + Projektverwaltung in IndexedDB.
 * Jede Mutation sichert (entprellt) den lebenden Doc unter dem aktiven
 * Projekt; die Zentrale listet alle Stände. .kosmo bleibt das
 * Austauschformat, der Tresor ist das «nie wieder etwas verlieren».
 */

export interface VaultEintrag {
  id: string;
  name: string;
  updatedAt: string;
  elemente: number;
  json: DocJson;
}

const DB = 'kosmo-projekte';
// v2 (Vision A5): zweiter Store «varianten» fürs Varianten-Archiv.
// v3 (V1-P3): «auftraege» (KosmoDev-Auftragsbuch), «objekte» (GLB-Bibliothek),
// «lernjournal» (Journal-Spiegel). keyPath-Stores sind additiv —
// bestehende Tresore migrieren verlustfrei.
// v4 (Codex-Übernahme Batch 3): «objekte» wächst vom reinen GLB-Blob
// ({id,name,createdAt,bytes,daten}) zum reichen KosmoAsset-Manifest
// (title/asset_type/category/tags/formats[]/rights_status/…, siehe
// state/asset-bibliothek.ts). Alt-Records werden per Cursor IN DER
// Upgrade-Transaktion verlustfrei umgeformt — der Blob (`daten`) bleibt
// unangetastet.
// v5 (v0.6.3/B4, Owner-Befund K21 — Materialbibliothek Stufe 1): «objekte»
// bekommt additive Herkunfts-/Klassifikationsfelder (`quelle`/`materialArt`/
// `materialDimensionen`/`region`, siehe state/asset-bibliothek.ts). Alt-
// Records ohne `quelle` bekommen per Default-Spread (Muster `siaPhase`,
// packages/kosmo-kernel/src/model/doc.ts) ehrlich «Quelle unbelegt
// (Altbestand)» statt eine erfundene Herkunft — `materialArt`/`region`/
// `materialDimensionen` bleiben optional und unangetastet.
const DB_VERSION = 5;
const AKTIV_KEY = 'kosmo.projekt.aktiv';

/**
 * Migriert «objekte» in EINEM Cursor-Durchlauf auf den aktuellen Stand —
 * bewusst NICHT zwei getrennte Cursor-Durchläufe (v3→v4, v4→v5) auf demselben
 * Store in derselben Upgrade-Transaktion: zwei unabhängige `openCursor()`-
 * Läufe könnten sich beim Update desselben Records überholen und einander
 * überschreiben (`cursor.update()` ersetzt den ganzen Record). Ein
 * kombinierter Pass pro Record ist deterministisch.
 *
 * - v3→v4 (Codex-Übernahme Batch 3): alte GLB-Records
 *   ({id,name,createdAt,bytes,daten}) auf die reiche KosmoAsset-Shape heben.
 *   Erkennungsmerkmal: kein `asset_type`-Feld.
 * - v4→v5 (v0.6.3/B4, Owner-Befund K21): Default-Spread fürs Herkunfts-Feld
 *   (Muster `siaPhase`) — Records ohne `quelle` bekommen ehrlich «Quelle
 *   unbelegt (Altbestand)» statt eine erfundene Herkunft.
 *
 * Bereits migrierte/neu angelegte Records werden je Schritt unverändert
 * übersprungen — sicher auch bei leerem/gemischtem Store.
 */
function migriereObjekte(store: IDBObjectStore, altVersion: number): void {
  const cursorReq = store.openCursor();
  cursorReq.onsuccess = () => {
    const cursor = cursorReq.result;
    if (!cursor) return;
    let wert = cursor.value as Record<string, unknown>;
    let geaendert = false;
    if (altVersion < 4 && !('asset_type' in wert)) {
      wert = {
        id: wert['id'],
        title: (wert['name'] as string | undefined) ?? 'Objekt',
        asset_type: 'glb_model',
        category: 'component',
        tags: [],
        formats: [{ format: 'glb', bytes: (wert['bytes'] as number | undefined) ?? 0, status: 'ready' }],
        rights_status: 'generated_needs_review',
        public_use_allowed: false,
        visibility: 'private',
        kosmodata_refs: [],
        createdAt: (wert['createdAt'] as string | undefined) ?? new Date().toISOString(),
        daten: wert['daten'],
      };
      geaendert = true;
    }
    if (altVersion < 5 && !('quelle' in wert)) {
      wert = { ...wert, quelle: 'Quelle unbelegt (Altbestand)' };
      geaendert = true;
    }
    if (geaendert) cursor.update(wert);
    cursor.continue();
  };
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, DB_VERSION);
    req.onupgradeneeded = (event) => {
      if (!req.result.objectStoreNames.contains('projekte')) {
        req.result.createObjectStore('projekte', { keyPath: 'id' });
      }
      if (!req.result.objectStoreNames.contains('varianten')) {
        req.result.createObjectStore('varianten', { keyPath: 'id' });
      }
      for (const store of ['auftraege', 'objekte', 'lernjournal'] as const) {
        if (!req.result.objectStoreNames.contains(store)) {
          req.result.createObjectStore(store, { keyPath: 'id' });
        }
      }
      if (event.oldVersion < 5) {
        migriereObjekte(req.transaction!.objectStore('objekte'), event.oldVersion);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/** Generische Transaktion auf einem Tresor-Store (auch fürs Varianten-Archiv). */
export function vaultTx<T>(
  store: 'projekte' | 'varianten' | 'auftraege' | 'objekte' | 'lernjournal',
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const t = db.transaction(store, mode);
        const req = fn(t.objectStore(store));
        // P6-Review #8: Schreib-Erfolg erst melden, wenn die Transaktion
        // wirklich committet ist — ein Quota-Abort nach onsuccess wäre
        // sonst stiller Datenverlust. Die Verbindung schliesst in jedem Pfad.
        req.onerror = () => reject(req.error);
        if (mode === 'readwrite') {
          t.oncomplete = () => {
            db.close();
            resolve(req.result);
          };
        } else {
          req.onsuccess = () => resolve(req.result);
          t.oncomplete = () => db.close();
        }
        t.onabort = () => {
          db.close();
          reject(t.error ?? new Error('Tresor-Transaktion abgebrochen (Speicherplatz?)'));
        };
        t.onerror = () => db.close();
      }),
  );
}

function tx<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return vaultTx('projekte', mode, fn);
}

// localStorage fehlt im Node-Testlauf (vitest) — defensiv zugreifen
const speicher = typeof localStorage !== 'undefined' ? localStorage : null;
let aktivId = speicher?.getItem(AKTIV_KEY) ?? `projekt-${Date.now().toString(36)}`;
let timer: ReturnType<typeof setTimeout> | null = null;

export function aktivesProjektId(): string {
  return aktivId;
}

async function sichern(): Promise<void> {
  const { doc } = useProject.getState();
  const eintrag: VaultEintrag = {
    id: aktivId,
    name: doc.settings.projectName,
    updatedAt: new Date().toISOString(),
    elemente: doc.entities.size,
    json: doc.toJSON(),
  };
  speicher?.setItem(AKTIV_KEY, aktivId);
  await tx('readwrite', (s) => s.put(eintrag));
}

/** Beim App-Start rufen: Autosave anhängen + letzten Stand wiederherstellen. */
export async function initVault(): Promise<void> {
  // Wiederherstellen, wenn der lebende Doc noch leer ist
  const { doc } = useProject.getState();
  if (doc.entities.size === 0) {
    try {
      const rec = await tx<VaultEintrag | undefined>('readonly', (s) => s.get(aktivId));
      if (rec && rec.json.entities.length > 0) {
        ladeJson(rec.json);
        console.info(`Projekt «${rec.name}» wiederhergestellt (Autosave).`);
      }
    } catch {
      /* Tresor leer/kaputt → frisch starten */
    }
  }
  // Entprelltes Sichern bei jeder Revision
  useProject.subscribe((state, prev) => {
    if (state.revision === prev.revision) return;
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => void sichern().catch(() => undefined), 1200);
  });
}

/**
 * Serie I / B7: auch Tresor-Records (IndexedDB) laufen nie durch
 * `JSON.parse` — trotzdem durch dieselbe Struktur-/Prototype-Pollution-
 * Schranke wie ein `.kosmo`-Datei-Import, bevor sie den lebenden State
 * erreichen. Wirft einen sprechenden Fehler statt still Müll zu laden oder
 * auf einer kaputten Form zu crashen; die Aufrufer (`initVault`,
 * `oeffneProjekt`, `oeffneJsonAlsNeuesProjekt`) schreiben dann keinen State.
 */
function ladeJson(json: DocJson): void {
  const geprueft = parseDocJson(json);
  if (!geprueft.ok) {
    throw new Error(`Projekt-Daten beschädigt: ${geprueft.fehler}`);
  }
  const doc = KosmoDoc.fromJSON(geprueft.value);
  const storeys = doc.storeysOrdered();
  useProject.setState({
    doc,
    revision: useProject.getState().revision + 1,
    activeStoreyId: storeys.find((s) => s.index === 0)?.id ?? storeys[0]?.id ?? null,
    selection: [],
    history: new History(),
  });
}

export async function listeProjekte(): Promise<Omit<VaultEintrag, 'json'>[]> {
  const alle = await tx<VaultEintrag[]>('readonly', (s) => s.getAll() as IDBRequest<VaultEintrag[]>);
  return alle
    .map(({ json: _json, ...rest }) => rest)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function oeffneProjekt(id: string): Promise<void> {
  const rec = await tx<VaultEintrag | undefined>('readonly', (s) => s.get(id));
  if (!rec) throw new Error('Projekt nicht gefunden');
  // B7-Härtung: ERST laden (wirft bei beschädigten Daten, schreibt dann
  // nichts), DANACH den aktiven Zeiger umstellen — sonst zeigt aktivId nach
  // einem abgelehnten Laden auf ein Projekt, dessen State nie geschrieben wurde.
  ladeJson(rec.json);
  aktivId = id;
  speicher?.setItem(AKTIV_KEY, id);
}

export async function loescheProjekt(id: string): Promise<void> {
  await tx('readwrite', (s) => s.delete(id));
}

/** Doc-JSON als NEUES Projekt öffnen (A5: Variante aus dem Archiv holen). */
export function oeffneJsonAlsNeuesProjekt(json: DocJson): void {
  // B7-Härtung: gleiche Reihenfolge wie oeffneProjekt — erst laden (wirft bei
  // beschädigten Daten), erst danach den neuen aktiven Zeiger setzen.
  ladeJson(json);
  aktivId = `projekt-${Date.now().toString(36)}`;
  speicher?.setItem(AKTIV_KEY, aktivId);
}

/** Neues, leeres Projekt (Bootstrap macht die Werkstatt beim Öffnen). */
export function neuesProjekt(name: string): void {
  aktivId = `projekt-${Date.now().toString(36)}`;
  speicher?.setItem(AKTIV_KEY, aktivId);
  const doc = new KosmoDoc();
  doc.settings = { ...doc.settings, projectName: name || 'Unbenannt' };
  useProject.setState({
    doc,
    revision: 0,
    activeStoreyId: null,
    selection: [],
    history: new History(),
  });
}
