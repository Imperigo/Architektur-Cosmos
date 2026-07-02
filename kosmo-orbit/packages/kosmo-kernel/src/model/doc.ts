import type { Entity } from './entities';
import type { Mm } from './units';

/**
 * KosmoDoc — der Entity-Store des Projekts.
 *
 * Mutationen laufen ausschliesslich über Patches: { id, before, after }.
 * Ein Patch ist trivial invertierbar (before/after tauschen) — das trägt
 * Undo/Redo, das Journal und später die Yjs-Bindung (Commands sind die
 * einzigen Schreiber; CRDT und Journal werden daraus abgeleitet).
 */

export interface DocSettings {
  projectName: string;
  /** Faktor Raumprogramm→anrechenbare Geschossfläche (Owner-Wissen: 1.28 bzw. 1.22 je Büro). */
  agfFactor: number;
  /** Fassadenzuschlag auf aGF für GF-Volumenstudien (Owner: 10% Skelettbau). */
  facadeFactor: number;
}

export const defaultSettings: DocSettings = {
  projectName: 'Unbenannt',
  agfFactor: 1.28,
  facadeFactor: 1.1,
};

export interface Patch {
  readonly id: string;
  readonly before: Entity | null;
  readonly after: Entity | null;
}

export interface SettingsPatch {
  readonly settings: true;
  readonly before: Partial<DocSettings>;
  readonly after: Partial<DocSettings>;
}

export type AnyPatch = Patch | SettingsPatch;

export function isSettingsPatch(p: AnyPatch): p is SettingsPatch {
  return 'settings' in p;
}

export function invertPatches(patches: readonly AnyPatch[]): AnyPatch[] {
  return [...patches]
    .reverse()
    .map((p) =>
      isSettingsPatch(p)
        ? { settings: true as const, before: p.after, after: p.before }
        : { id: p.id, before: p.after, after: p.before },
    );
}

export class KosmoDoc {
  readonly entities = new Map<string, Entity>();
  settings: DocSettings = { ...defaultSettings };
  /** Monoton steigende Revisionsnummer — Cache-Invalidierung der Derive-Stufe. */
  revision = 0;

  get<T extends Entity = Entity>(id: string): T | undefined {
    return this.entities.get(id) as T | undefined;
  }

  byKind<T extends Entity>(kind: T['kind']): T[] {
    const out: T[] = [];
    for (const e of this.entities.values()) if (e.kind === kind) out.push(e as T);
    return out;
  }

  inStorey(storeyId: string): Entity[] {
    const out: Entity[] = [];
    for (const e of this.entities.values()) {
      if ('storeyId' in e && e.storeyId === storeyId) out.push(e);
    }
    return out;
  }

  openingsOf(wallId: string) {
    const out = [];
    for (const e of this.entities.values()) {
      if (e.kind === 'opening' && e.wallId === wallId) out.push(e);
    }
    return out;
  }

  storeysOrdered() {
    return this.byKind<import('./entities').Storey>('storey').sort((a, b) => a.index - b.index);
  }

  /** Oberkante eines Geschosses = elevation + height (für Wandhöhen 'geschoss'). */
  storeyTop(storeyId: string): Mm | undefined {
    const s = this.get<import('./entities').Storey>(storeyId);
    return s ? s.elevation + s.height : undefined;
  }

  apply(patches: readonly AnyPatch[]): void {
    for (const p of patches) {
      if (isSettingsPatch(p)) {
        this.settings = { ...this.settings, ...p.after };
      } else if (p.after === null) {
        this.entities.delete(p.id);
      } else {
        this.entities.set(p.id, p.after);
      }
    }
    this.revision++;
  }

  toJSON(): DocJson {
    return {
      schema: 'kosmo.model/v1',
      settings: this.settings,
      entities: [...this.entities.values()],
    };
  }

  static fromJSON(json: DocJson): KosmoDoc {
    const doc = new KosmoDoc();
    doc.settings = { ...defaultSettings, ...json.settings };
    for (const e of json.entities) doc.entities.set(e.id, e);
    return doc;
  }
}

export interface DocJson {
  schema: 'kosmo.model/v1';
  settings: DocSettings;
  entities: Entity[];
}
