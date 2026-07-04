import * as Y from 'yjs';
import { HocuspocusProvider } from '@hocuspocus/provider';
import { IndexeddbPersistence } from 'y-indexeddb';
import type { AnyPatch, Entity } from '@kosmo/kernel';
import { isSettingsPatch } from '@kosmo/kernel';

/**
 * KosmoSync-Client (Owner-Q16, Vision E1 als eigenes Paket) — Yjs-CRDT über
 * den Sync-Server, HOST-AGNOSTISCH: der Client kennt keinen Store und kein
 * React. Der Host (App, Test, künftig iPad-Shell) liefert drei Callbacks:
 * alle lokalen Entities, Raum-Übernahme, Remote-Änderungen.
 *
 * Ein Y.Map «entities» spiegelt den Entity-Store (Entity-genaues LWW).
 * Commands bleiben die einzigen lokalen Schreiber: nach jedem apply werden
 * die Patches in einer Y-Transaktion (origin 'lokal') gespiegelt; Remote-
 * Transaktionen fliessen über den Host direkt in den Doc (ohne Undo-History —
 * fremde Arbeit ist nicht rückgängig zu machen).
 *
 * Betriebshärte (D4): optionaler Token (Server prüft), Offline-Warteschlange
 * über y-indexeddb — Änderungen ohne Verbindung landen im lokal persistierten
 * Y.Doc und fliessen beim Reconnect als CRDT-Merge nach (auch nach Neustart).
 */

export type SyncStatus = 'aus' | 'verbinde' | 'live' | 'getrennt' | 'abgelehnt';

export interface SyncHost {
  /** Alle lokalen Entities — für den Beitritt in einen leeren Raum. */
  alleEntities(): Iterable<Entity>;
  /** Raum hat Stand → lokal übernehmen (Server ist die Wahrheit beim Beitritt). */
  raumUebernehmen(entities: [string, Entity][]): void;
  /** Remote-Änderungen anwenden (entity null = gelöscht), ohne Undo-History. */
  remoteAnwenden(aenderungen: { id: string; entity: Entity | null }[]): void;
  status(s: SyncStatus, peers: number, wartend?: number): void;
}

interface Verbindung {
  ydoc: Y.Doc;
  provider: HocuspocusProvider;
  entities: Y.Map<Entity>;
  persistence: IndexeddbPersistence;
  verbunden: boolean;
  wartend: number;
}

export class SyncClient {
  private aktiv: Verbindung | null = null;

  constructor(private readonly host: SyncHost) {}

  get verbunden(): boolean {
    return this.aktiv !== null;
  }

  /** Nach jedem lokalen Command aufrufen. */
  pushPatches(patches: readonly AnyPatch[]): void {
    const a = this.aktiv;
    if (!a) return;
    a.ydoc.transact(() => {
      for (const p of patches) {
        if (isSettingsPatch(p)) continue; // Settings-Sync folgt
        if (p.after === null) a.entities.delete(p.id);
        else a.entities.set(p.id, p.after);
      }
    }, 'lokal');
    // Offline: Änderung sitzt sicher im persistierten Y.Doc — zählen und melden
    if (!a.verbunden) {
      a.wartend++;
      this.host.status('getrennt', 0, a.wartend);
    }
  }

  connect(url: string, room: string, token?: string): void {
    this.disconnect();
    const ydoc = new Y.Doc();
    const entities = ydoc.getMap<Entity>('entities');
    // Offline-Warteschlange: Raum-Stand lokal persistieren (IndexedDB)
    const persistence = new IndexeddbPersistence(`kosmo-sync-${room}`, ydoc);
    this.host.status('verbinde', 0);

    const provider = new HocuspocusProvider({
      url,
      name: room,
      document: ydoc,
      ...(token ? { token } : {}),
      onAuthenticationFailed: () => {
        this.host.status('abgelehnt', 0);
      },
      onSynced: () => {
        if (entities.size === 0) {
          // Raum leer → lokales Projekt hochspiegeln
          ydoc.transact(() => {
            for (const e of this.host.alleEntities()) entities.set(e.id, e);
          }, 'lokal');
        } else {
          this.host.raumUebernehmen([...entities.entries()]);
        }
        if (this.aktiv) {
          this.aktiv.verbunden = true;
          this.aktiv.wartend = 0;
        }
        this.host.status('live', provider.awareness?.getStates().size ?? 1);
      },
      onStatus: ({ status }) => {
        if (status === 'connected' && this.aktiv) this.aktiv.verbunden = true;
        if (status === 'disconnected') {
          if (this.aktiv) this.aktiv.verbunden = false;
          this.host.status('getrennt', 0, this.aktiv?.wartend ?? 0);
        }
      },
      onAwarenessUpdate: ({ states }) => {
        this.host.status('live', states.length);
      },
    });

    // Remote-Änderungen → Host (ohne History)
    entities.observe((event, tx) => {
      if (tx.origin === 'lokal') return;
      const aenderungen: { id: string; entity: Entity | null }[] = [];
      for (const [id, change] of event.changes.keys) {
        aenderungen.push({ id, entity: change.action === 'delete' ? null : (entities.get(id) ?? null) });
      }
      this.host.remoteAnwenden(aenderungen);
    });

    this.aktiv = { ydoc, provider, entities, persistence, verbunden: false, wartend: 0 };
  }

  disconnect(): void {
    const a = this.aktiv;
    if (!a) return;
    a.provider.destroy();
    void a.persistence.destroy();
    a.ydoc.destroy();
    this.aktiv = null;
    this.host.status('aus', 0);
  }
}
