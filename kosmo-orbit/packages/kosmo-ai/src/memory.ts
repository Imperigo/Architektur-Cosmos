/**
 * Kosmo-Lernjournal — das V1-Gedächtnis (Owner-Q8: Journal + Memory +
 * Trainings-Rezepte). Jedes Feedback des Architekten wird festgehalten und
 * fliesst in künftige Systemprompts ein («das System lernt DICH»).
 * Dasselbe Journal ist später der Trainingsdatensatz für die LoRA-Rezepte
 * auf der HomeStation.
 */

/** D1 (KosmoData-Dach): Sichtbarkeits-Konzept wie bei Referenzen/Assets — Bürodaten bleiben privat. */
export type LearningVisibility = 'public' | 'private';

export interface Learning {
  ts: string;
  /** 'gut' = so weitermachen, 'schlecht' = vermeiden. */
  sentiment: 'gut' | 'schlecht';
  /** Worum ging es (Kosmo-Aussage oder Aktion). */
  context: string;
  /** Optionale Notiz des Architekten. */
  note?: string;
  /**
   * D1 (KosmoData-Dach): 'public' darf über die Dach-Suche/Übersicht hinaus
   * geteilt werden, 'private' bleibt Büro-intern. Alteinträge ohne dieses
   * Feld gelten beim Lesen (`LearningJournal.all`) als 'private' — keine
   * Migration nötig, der Default greift beim Zugriff.
   */
  visibility?: LearningVisibility;
}

export interface MemoryStore {
  load(): Learning[];
  save(entries: Learning[]): void;
}

/** localStorage-Persistenz (Desktop/PWA); Tauri/SQLite folgt über dieselbe Schnittstelle. */
export function localStorageMemory(key = 'kosmo.lernjournal'): MemoryStore {
  return {
    load() {
      try {
        return JSON.parse(localStorage.getItem(key) ?? '[]') as Learning[];
      } catch {
        return [];
      }
    },
    save(entries) {
      localStorage.setItem(key, JSON.stringify(entries.slice(-200)));
    },
  };
}

export class LearningJournal {
  private entries: Learning[];

  constructor(private store: MemoryStore) {
    this.entries = store.load();
  }

  /** Nach asynchroner Hydration (IndexedDB-Spiegel) neu einlesen. */
  reload(): void {
    this.entries = this.store.load();
  }

  add(l: Omit<Learning, 'ts'>): void {
    this.entries.push({ ...l, ts: new Date().toISOString() });
    this.store.save(this.entries);
  }

  /** Alteinträge ohne `visibility` erscheinen hier als 'private' (Default beim Lesen, keine Migration). */
  get all(): readonly Learning[] {
    return this.entries.map((e) => (e.visibility === undefined ? { ...e, visibility: 'private' } : e));
  }

  /** Kuration: Eintrag entfernen (vor dem Training aussortieren). */
  entfernen(ts: string): void {
    this.entries = this.entries.filter((e) => e.ts !== ts);
    this.store.save(this.entries);
  }

  /** Kuration: Notiz nachschärfen — die Notiz ist der Trainings-Kern. */
  notieren(ts: string, note: string): void {
    this.entries = this.entries.map((e) => (e.ts === ts ? { ...e, note } : e));
    this.store.save(this.entries);
  }

  /**
   * Kompakter Prompt-Block der jüngsten Lehren — bewusst klein (lokale
   * Modelle!): maximal 8 Einträge, Kritik zuerst.
   */
  toPromptBlock(): string {
    if (this.entries.length === 0) return '';
    const recent = [...this.entries]
      .slice(-24)
      .sort((a, b) => (a.sentiment === 'schlecht' ? -1 : 1) - (b.sentiment === 'schlecht' ? -1 : 1))
      .slice(0, 8);
    const lines = recent.map((l) => {
      const kern = l.note?.trim() ? l.note.trim() : l.context.slice(0, 140);
      return l.sentiment === 'schlecht' ? `- VERMEIDE: ${kern}` : `- BEIBEHALTEN: ${kern}`;
    });
    return `\n\nGelerntes aus dem Feedback dieses Büros (beachte es):\n${lines.join('\n')}`;
  }

  /** Export fürs LoRA-Training auf der HomeStation (JSONL). */
  toJsonl(): string {
    return this.entries.map((e) => JSON.stringify(e)).join('\n');
  }
}
