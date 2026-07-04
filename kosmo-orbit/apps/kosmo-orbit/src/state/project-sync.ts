import { SyncClient, type SyncStatus } from '@kosmo/sync';
import type { AnyPatch } from '@kosmo/kernel';
import { setPatchListener, useProject } from './project-store';

/**
 * Live-Sync-Verdrahtung (Owner-Q16) — die CRDT-Mechanik lebt seit E1 im
 * Paket `@kosmo/sync` (host-agnostisch); hier bleibt nur die Bindung an den
 * Projekt-Store: Patches rein, Remote-Änderungen in den KosmoDoc, Status an
 * die Kopfleiste. Öffentliche API unverändert.
 */

export type { SyncStatus } from '@kosmo/sync';

let statusListener: ((s: SyncStatus, peers: number, wartend?: number) => void) | null = null;

export function onSyncStatus(cb: (s: SyncStatus, peers: number, wartend?: number) => void): void {
  statusListener = cb;
}

const client = new SyncClient({
  alleEntities: () => useProject.getState().doc.entities.values(),
  raumUebernehmen: (entities) => {
    const { doc } = useProject.getState();
    doc.entities.clear();
    for (const [id, e] of entities) doc.entities.set(id, e);
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
  },
  remoteAnwenden: (aenderungen) => {
    const { doc } = useProject.getState();
    for (const a of aenderungen) {
      if (a.entity === null) doc.entities.delete(a.id);
      else doc.entities.set(a.id, a.entity);
    }
    doc.revision++;
    useProject.setState((s) => ({ revision: s.revision + 1 }));
  },
  status: (s, peers, wartend) => statusListener?.(s, peers, wartend),
});

export function syncActive(): boolean {
  return client.verbunden;
}

/** Nach jedem lokalen Command aufrufen. */
export function pushPatches(patches: readonly AnyPatch[]): void {
  client.pushPatches(patches);
}

export function connectSync(url: string, room: string, token?: string): void {
  setPatchListener(pushPatches);
  client.connect(url, room, token);
}

export function disconnectSync(): void {
  setPatchListener(null);
  client.disconnect();
}
