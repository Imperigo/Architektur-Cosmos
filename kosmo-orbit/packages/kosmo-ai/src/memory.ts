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
  /**
   * v0.6.9 (Stream B, «Wissen antwortet») — die persistierte Referenz-Kante:
   * die Id der KosmoData-Referenz (`RefEntry.id`), die im Moment des
   * Feedbacks aktiv/betrachtet war. Additiv — Alteinträge ohne dieses Feld
   * bleiben gültig, `gedaechtnisQuerverweise` (K8, `modules/data/
   * data-runtime.ts`) fällt für sie auf den bisherigen Text-Match zurück.
   */
  refId?: string;
}

export interface MemoryStore {
  load(): Learning[];
  save(entries: Learning[]): void;
}

/**
 * v0.8.2/P3 («Signal-Erfassung», `docs/V082-SPEZ.md` §4.3, additiv) — der NIE
 * gekappte Journal-Bestand. `localStorageMemory`/`MemoryStore.save()` bleiben
 * unverändert bei ihrem 200er-Fenster (Prompt-Budget, `toPromptBlock()`
 * unten) — dieses zweite, optionale Depot hält daneben JEDEN je erfassten
 * Eintrag fest. App-seitige Umsetzung (IndexedDB-Spiegel, unbegrenzt):
 * `apps/kosmo-orbit/src/state/journal-store.ts` `journalArchivStore()`.
 */
export interface ArchivStore {
  laden(): Learning[];
  anhaengen(entry: Learning): void;
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

  /**
   * `archiv` (v0.8.2/P3, additiv) — zweiter, optionaler Konstruktor-
   * Parameter: ohne ihn verhält sich `LearningJournal` byte-gleich wie vor
   * P3 (alle bestehenden Aufrufer/Tests unverändert). Mit ihm spiegelt
   * `add()` JEDEN Eintrag zusätzlich ins unbegrenzte Archiv (§4.3).
   */
  constructor(
    private store: MemoryStore,
    private archiv?: ArchivStore,
  ) {
    this.entries = store.load();
  }

  /** Nach asynchroner Hydration (IndexedDB-Spiegel) neu einlesen. */
  reload(): void {
    this.entries = this.store.load();
  }

  add(l: Omit<Learning, 'ts'>): void {
    const eintrag: Learning = { ...l, ts: new Date().toISOString() };
    this.entries.push(eintrag);
    this.store.save(this.entries);
    this.archiv?.anhaengen(eintrag);
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

  /** Kuration/Dach: Sichtbarkeit eines Eintrags umschalten (Default beim Lesen bleibt 'private'). */
  setzeVisibility(ts: string, visibility: LearningVisibility): void {
    this.entries = this.entries.map((e) => (e.ts === ts ? { ...e, visibility } : e));
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

  /**
   * §4.3 (`docs/V082-SPEZ.md`, additiv) — der volle, NIE gekappte Bestand
   * (Default-Normalisierung wie `all`: Alteinträge ohne `visibility` gelten
   * als 'private'). Ohne injizierten Archiv-Store fällt das ehrlich auf
   * `this.all` zurück (kein Bruch für bestehende Aufrufer ohne zweiten
   * Konstruktor-Parameter) — dann ist der «Archiv»-Bestand identisch mit dem
   * 200er-Fenster, weil kein grösserer Bestand existiert.
   */
  get archivAll(): readonly Learning[] {
    const basis = this.archiv ? this.archiv.laden() : this.entries;
    return basis.map((e) => (e.visibility === undefined ? { ...e, visibility: 'private' as const } : e));
  }

  /**
   * §4.4 (`docs/V082-SPEZ.md`, schliesst C-17 — die bisherige Visibility-
   * Lücke von `toJsonl()`) + §5 (`kosmo-signal/v1`, `art: 'journal'`):
   * Owner-Entscheid 1 («nur `public` verlässt je das Repo») ist hier der
   * DEFAULT, nicht nur eine Option — `toJsonl()` bleibt daneben unverändert
   * (roh, ungefiltert) für bestehende Aufrufer/Tests. `'alle'` bleibt für
   * rein lokale Zwecke explizit anforderbar, ist aber nie der Default.
   */
  toKosmoSignalJsonl(visibility: LearningVisibility | 'alle' = 'public'): string {
    return this.archivAll
      .filter((e) => visibility === 'alle' || e.visibility === visibility)
      .map((e) =>
        JSON.stringify({
          art: 'journal',
          ts: e.ts,
          visibility: e.visibility,
          payload: {
            sentiment: e.sentiment,
            context: e.context,
            ...(e.note !== undefined ? { note: e.note } : {}),
            ...(e.refId !== undefined ? { refId: e.refId } : {}),
          },
          meta: { quelle: 'memory.ts#LearningJournal' },
        }),
      )
      .join('\n');
  }
}
