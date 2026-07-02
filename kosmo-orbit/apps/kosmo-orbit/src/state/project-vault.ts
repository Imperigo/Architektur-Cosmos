import { History, KosmoDoc, type DocJson } from '@kosmo/kernel';
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
const AKTIV_KEY = 'kosmo.projekt.aktiv';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains('projekte')) {
        req.result.createObjectStore('projekte', { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function tx<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const t = db.transaction('projekte', mode);
        const req = fn(t.objectStore('projekte'));
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
        t.oncomplete = () => db.close();
      }),
  );
}

let aktivId = localStorage.getItem(AKTIV_KEY) ?? `projekt-${Date.now().toString(36)}`;
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
  localStorage.setItem(AKTIV_KEY, aktivId);
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

function ladeJson(json: DocJson): void {
  const doc = KosmoDoc.fromJSON(json);
  const storeys = doc.storeysOrdered();
  useProject.setState({
    doc,
    revision: doc.revision + 1,
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
  aktivId = id;
  localStorage.setItem(AKTIV_KEY, id);
  ladeJson(rec.json);
}

export async function loescheProjekt(id: string): Promise<void> {
  await tx('readwrite', (s) => s.delete(id));
}

/** Neues, leeres Projekt (Bootstrap macht die Werkstatt beim Öffnen). */
export function neuesProjekt(name: string): void {
  aktivId = `projekt-${Date.now().toString(36)}`;
  localStorage.setItem(AKTIV_KEY, aktivId);
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
