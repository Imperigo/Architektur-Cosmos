import * as Y from 'yjs';
import { HocuspocusProvider } from '@hocuspocus/provider';
import type { AnyPatch, Entity } from '@kosmo/kernel';
import { isSettingsPatch } from '@kosmo/kernel';
import { setPatchListener, useProject } from './project-store';

/**
 * Live-Sync (Owner-Q16) — Yjs-CRDT über den Sync-Server der HomeStation.
 *
 * Ein Y.Map «entities» spiegelt den Entity-Store (Entity-genaues LWW).
 * Commands bleiben die einzigen lokalen Schreiber: nach jedem apply werden
 * die Patches in einer Y-Transaktion (origin 'lokal') gespiegelt; Remote-
 * Transaktionen fliessen direkt in den KosmoDoc (ohne Undo-History — fremde
 * Arbeit ist nicht rückgängig zu machen).
 */

export type SyncStatus = 'aus' | 'verbinde' | 'live' | 'getrennt';

interface SyncState {
  ydoc: Y.Doc;
  provider: HocuspocusProvider;
  entities: Y.Map<Entity>;
}

let active: SyncState | null = null;
let statusListener: ((s: SyncStatus, peers: number) => void) | null = null;

export function onSyncStatus(cb: (s: SyncStatus, peers: number) => void): void {
  statusListener = cb;
}

export function syncActive(): boolean {
  return active !== null;
}

/** Nach jedem lokalen Command aufrufen. */
export function pushPatches(patches: readonly AnyPatch[]): void {
  if (!active) return;
  const { ydoc, entities } = active;
  ydoc.transact(() => {
    for (const p of patches) {
      if (isSettingsPatch(p)) continue; // Settings-Sync folgt
      if (p.after === null) entities.delete(p.id);
      else entities.set(p.id, p.after);
    }
  }, 'lokal');
}

export function connectSync(url: string, room: string): void {
  disconnectSync();
  setPatchListener(pushPatches);
  const ydoc = new Y.Doc();
  const entities = ydoc.getMap<Entity>('entities');
  statusListener?.('verbinde', 0);

  const provider = new HocuspocusProvider({
    url,
    name: room,
    document: ydoc,
    onSynced: () => {
      const { doc } = useProject.getState();
      if (entities.size === 0) {
        // Raum leer → lokales Projekt hochspiegeln
        ydoc.transact(() => {
          for (const e of doc.entities.values()) entities.set(e.id, e);
        }, 'lokal');
      } else {
        // Raum hat Stand → lokal übernehmen (Server ist die Wahrheit beim Beitritt)
        doc.entities.clear();
        for (const [id, e] of entities.entries()) doc.entities.set(id, e);
        doc.revision++;
        const storeys = doc.storeysOrdered();
        // Raum-Übernahme: altes aktives Geschoss existiert nicht mehr → neu setzen
        const current = useProject.getState().activeStoreyId;
        const valid = current && doc.entities.has(current) ? current : null;
        useProject.setState({
          revision: useProject.getState().revision + 1,
          selection: [],
          activeStoreyId: valid ?? storeys.find((s) => s.index === 0)?.id ?? storeys[0]?.id ?? null,
        });
      }
      statusListener?.('live', provider.awareness?.getStates().size ?? 1);
    },
    onStatus: ({ status }) => {
      if (status === 'disconnected') statusListener?.('getrennt', 0);
    },
    onAwarenessUpdate: ({ states }) => {
      statusListener?.('live', states.length);
    },
  });

  // Remote-Änderungen → KosmoDoc (ohne History)
  entities.observe((event, tx) => {
    if (tx.origin === 'lokal') return;
    const { doc } = useProject.getState();
    for (const [id, change] of event.changes.keys) {
      if (change.action === 'delete') doc.entities.delete(id);
      else {
        const e = entities.get(id);
        if (e) doc.entities.set(id, e);
      }
    }
    doc.revision++;
    useProject.setState((s) => ({ revision: s.revision + 1 }));
  });

  active = { ydoc, provider, entities };
}

export function disconnectSync(): void {
  setPatchListener(null);
  if (!active) return;
  active.provider.destroy();
  active.ydoc.destroy();
  active = null;
  statusListener?.('aus', 0);
}
