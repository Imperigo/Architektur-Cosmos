/**
 * Live-Sync von architekturkosmos.ch (Vision E2) — read-only.
 * Reihenfolge der Wahrheit: Live-API → IndexedDB-Cache (letzter guter Stand)
 * → null (der Aufrufer bleibt auf dem Offline-Seed). Der Status sagt ehrlich,
 * woher die Daten kommen. Schreiben Richtung Website braucht einen
 * Auth-Entscheid des Owners und ist bewusst NICHT gebaut.
 */

export interface RefEintrag {
  id: string;
  title: string;
  year_start?: number | null;
  year_end?: number | null;
  authors?: string[];
  city?: string | null;
  country?: string | null;
  style_sector?: string | null;
  themes?: string[];
  materials?: string[];
  program?: string | null;
  one_sentence?: string | null;
  short_description?: string | null;
  hero?: string | null;
  has_3d?: boolean;
}

export interface LiveErgebnis {
  quelle: 'live' | 'cache';
  eintraege: RefEintrag[];
  /** ISO-Zeitpunkt des Stands (Cache: wann er geholt wurde). */
  stand: string;
}

const API_URL = 'https://architekturkosmos.ch/api/entries.json';
const DB = 'kosmo-data-cache';
const STORE = 'referenzen';

function cacheDb(): Promise<IDBDatabase> | null {
  if (typeof indexedDB === 'undefined') return null;
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) {
        req.result.createObjectStore(STORE, { keyPath: 'key' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

interface CacheSatz {
  key: 'live';
  stand: string;
  eintraege: RefEintrag[];
}

async function cacheLesen(): Promise<CacheSatz | null> {
  const dbp = cacheDb();
  if (!dbp) return null;
  const db = await dbp;
  return new Promise((resolve) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).get('live');
    req.onsuccess = () => resolve((req.result as CacheSatz | undefined) ?? null);
    req.onerror = () => resolve(null);
    tx.oncomplete = () => db.close();
  });
}

async function cacheSchreiben(satz: CacheSatz): Promise<void> {
  const dbp = cacheDb();
  if (!dbp) return;
  const db = await dbp;
  await new Promise<void>((resolve) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(satz);
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => resolve();
  });
}

/**
 * Referenzen live holen; scheitert das Netz, kommt der letzte gute Stand aus
 * dem Cache; gibt es auch den nicht, null (Aufrufer bleibt beim Seed).
 */
export async function ladeReferenzenLive(fetcher: typeof fetch = fetch): Promise<LiveErgebnis | null> {
  try {
    const res = await fetcher(API_URL, { mode: 'cors' });
    if (!res.ok) throw new Error(String(res.status));
    const daten = (await res.json()) as RefEintrag[];
    if (!Array.isArray(daten) || daten.length === 0) throw new Error('leere Antwort');
    const stand = new Date().toISOString();
    await cacheSchreiben({ key: 'live', stand, eintraege: daten });
    return { quelle: 'live', eintraege: daten, stand };
  } catch {
    const cache = await cacheLesen();
    if (cache) return { quelle: 'cache', eintraege: cache.eintraege, stand: cache.stand };
    return null;
  }
}
