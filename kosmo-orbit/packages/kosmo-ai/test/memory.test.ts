import { describe, expect, it } from 'vitest';
import { LearningJournal, localStorageMemory, type ArchivStore, type Learning, type MemoryStore } from '../src';

/**
 * D4 (KosmoData-Dach): setzeVisibility spiegelt notieren() — Kuration der
 * Sichtbarkeit ohne Migration (Alteinträge normalisieren beim Lesen auf
 * 'private', siehe `all`-Getter). Kein Browser im Test: ein einfacher
 * In-Memory-Store steht für localStorage ein.
 */
function memoryStore(): MemoryStore {
  let saved: Learning[] = [];
  return {
    load: () => saved,
    save: (entries) => {
      saved = entries;
    },
  };
}

describe('LearningJournal.setzeVisibility', () => {
  it('setzt die Sichtbarkeit eines Eintrags, andere Einträge bleiben unberührt', () => {
    // Bewusst mit explizit unterschiedlichen ts über den Store gesät (statt
    // zweimal add() hintereinander): add() vergibt ts über
    // `new Date().toISOString()` (Millisekunden-Auflösung) — zwei add()-
    // Aufrufe in derselben Test-Millisekunde könnten sonst denselben ts
    // erzeugen und den Test verfälschen (setzeVisibility trifft dann beide).
    const store = memoryStore();
    store.save([
      { ts: '2026-07-01T08:00:00.000Z', sentiment: 'gut', context: 'Erster Eintrag' },
      { ts: '2026-07-01T09:00:00.000Z', sentiment: 'schlecht', context: 'Zweiter Eintrag' },
    ]);
    const journal = new LearningJournal(store);

    journal.setzeVisibility('2026-07-01T08:00:00.000Z', 'public');

    const [erster2, zweiter2] = journal.all;
    expect(erster2!.visibility).toBe('public');
    // Alteintrag ohne explizites Setzen bleibt beim Default 'private'.
    expect(zweiter2!.visibility).toBe('private');
    expect(zweiter2!.context).toBe('Zweiter Eintrag');
  });

  it('persistiert über den Store — ein neu geladenes Journal sieht den Wert', () => {
    const store = memoryStore();
    const journal = new LearningJournal(store);
    journal.add({ sentiment: 'gut', context: 'Persistenz-Test' });
    const [eintrag] = journal.all;

    journal.setzeVisibility(eintrag!.ts, 'public');

    const neuGeladen = new LearningJournal(store);
    expect(neuGeladen.all[0]?.visibility).toBe('public');
  });

  it('kann wieder auf private zurückgeschaltet werden (Umschalten, kein Einbahnweg)', () => {
    const journal = new LearningJournal(memoryStore());
    journal.add({ sentiment: 'gut', context: 'Umschalt-Test' });
    const [eintrag] = journal.all;

    journal.setzeVisibility(eintrag!.ts, 'public');
    expect(journal.all[0]?.visibility).toBe('public');

    journal.setzeVisibility(eintrag!.ts, 'private');
    expect(journal.all[0]?.visibility).toBe('private');
  });

  it('unbekannter ts ändert keinen Eintrag', () => {
    const journal = new LearningJournal(memoryStore());
    journal.add({ sentiment: 'gut', context: 'Unangetastet' });

    journal.setzeVisibility('2000-01-01T00:00:00.000Z', 'public');

    expect(journal.all[0]?.visibility).toBe('private');
  });
});

describe('LearningJournal.add — refId (v0.6.9, Stream B «Wissen antwortet»)', () => {
  it('additiv: ein Eintrag ohne refId bleibt wie bisher (kein Feld im gespeicherten Objekt)', () => {
    const journal = new LearningJournal(memoryStore());
    journal.add({ sentiment: 'gut', context: 'Ohne Referenz-Kontext' });

    const [eintrag] = journal.all;
    expect(eintrag!.refId).toBeUndefined();
    expect('refId' in eintrag!).toBe(false);
  });

  it('speichert die aktive Referenz-Id mit, wenn im Referenz-Kontext gefeuert', () => {
    const journal = new LearningJournal(memoryStore());
    journal.add({ sentiment: 'gut', context: 'Referenz als gut bewertet', refId: 'ref-pantheon' });

    const [eintrag] = journal.all;
    expect(eintrag!.refId).toBe('ref-pantheon');
  });

  it('persistiert refId über den Store — ein neu geladenes Journal sieht sie', () => {
    const store = memoryStore();
    const journal = new LearningJournal(store);
    journal.add({ sentiment: 'schlecht', context: 'Nicht passend', refId: 'ref-parthenon' });

    const neuGeladen = new LearningJournal(store);
    expect(neuGeladen.all[0]?.refId).toBe('ref-parthenon');
  });

  it('mischt Einträge mit und ohne refId im selben Journal, ohne sich zu beeinflussen', () => {
    const journal = new LearningJournal(memoryStore());
    journal.add({ sentiment: 'gut', context: 'Mit Referenz', refId: 'ref-a' });
    journal.add({ sentiment: 'gut', context: 'Ohne Referenz' });

    const mitRef = journal.all.find((e) => e.context === 'Mit Referenz');
    const ohneRef = journal.all.find((e) => e.context === 'Ohne Referenz');
    expect(mitRef?.refId).toBe('ref-a');
    expect(ohneRef?.refId).toBeUndefined();
  });
});

describe('localStorageMemory (Sanity — bestehendes Verhalten unverändert)', () => {
  it('liefert einen MemoryStore, der leer startet, wenn kein localStorage da ist', () => {
    // Node-Umgebung ohne DOM: localStorage ist nicht global — load() fängt
    // den Fehler defensiv ab und liefert [].
    const store = localStorageMemory('kosmo.test.nichtvorhanden');
    expect(store.load()).toEqual([]);
  });
});

/** In-Memory-`ArchivStore` fürs Testen — Muster `memoryStore()` oben. */
function archivStore(): ArchivStore & { bestand: Learning[] } {
  const bestand: Learning[] = [];
  return {
    bestand,
    laden: () => bestand,
    anhaengen: (e) => bestand.push(e),
  };
}

describe('LearningJournal — Archiv-Store (v0.8.2/P3, §4.3, additiv)', () => {
  it('ohne Archiv-Store fällt archivAll ehrlich auf `all` zurück (kein Bruch für bestehende Aufrufer)', () => {
    const journal = new LearningJournal(memoryStore());
    journal.add({ sentiment: 'gut', context: 'Ohne Archiv' });
    expect(journal.archivAll).toEqual(journal.all);
  });

  it('mit Archiv-Store: jeder add()-Aufruf spiegelt zusätzlich ins Archiv', () => {
    const archiv = archivStore();
    const journal = new LearningJournal(memoryStore(), archiv);
    journal.add({ sentiment: 'gut', context: 'Eins' });
    journal.add({ sentiment: 'schlecht', context: 'Zwei' });
    expect(archiv.bestand).toHaveLength(2);
    expect(archiv.bestand.map((e) => e.context)).toEqual(['Eins', 'Zwei']);
  });

  it('archivAll normalisiert Alteinträge ohne visibility auf private, wie `all`', () => {
    const archiv = archivStore();
    archiv.bestand.push({ ts: '2026-01-01T00:00:00.000Z', sentiment: 'gut', context: 'Alt, ohne visibility' });
    const journal = new LearningJournal(memoryStore(), archiv);
    expect(journal.archivAll[0]?.visibility).toBe('private');
  });

  it('das 200er-Fenster (`store.save`) bleibt unverändert, auch wenn ein Archiv-Store injiziert ist', () => {
    const store = memoryStore();
    const archiv = archivStore();
    const journal = new LearningJournal(store, archiv);
    for (let i = 0; i < 5; i++) journal.add({ sentiment: 'gut', context: `Eintrag ${i}` });
    // Der capped Store bekommt weiterhin ALLE (< 200) Einträge — das Fenster
    // selbst wird nur in `localStorageMemory`/`journalStore` gekappt, hier
    // testen wir nur: der Archiv-Zweig verändert `store.save()` nicht.
    expect(journal.all).toHaveLength(5);
    expect(archiv.bestand).toHaveLength(5);
  });
});

describe('LearningJournal.toKosmoSignalJsonl (v0.8.2/P3, §4.4 C-17-Fix + §5)', () => {
  it('Default public: nur öffentliche Einträge, als kosmo-signal/v1 (art: journal)', () => {
    const journal = new LearningJournal(memoryStore());
    journal.add({ sentiment: 'gut', context: 'Öffentlich' });
    const [eintrag] = journal.all;
    journal.setzeVisibility(eintrag!.ts, 'public');
    journal.add({ sentiment: 'schlecht', context: 'Privat (Default)' });

    const zeilen = journal.toKosmoSignalJsonl().split('\n').map((l) => JSON.parse(l) as Record<string, unknown>);
    expect(zeilen).toHaveLength(1);
    expect(zeilen[0]).toMatchObject({ art: 'journal', visibility: 'public' });
    expect((zeilen[0]!['payload'] as Record<string, unknown>)['context']).toBe('Öffentlich');
  });

  it('"alle" liefert auch private Einträge (explizit, nie Default)', () => {
    const journal = new LearningJournal(memoryStore());
    journal.add({ sentiment: 'gut', context: 'Privat' });
    const zeilen = journal.toKosmoSignalJsonl('alle').split('\n').filter(Boolean);
    expect(zeilen).toHaveLength(1);
  });

  it('leerer Bestand → leerer String (kein Crash, keine Fantasiezeile)', () => {
    const journal = new LearningJournal(memoryStore());
    expect(journal.toKosmoSignalJsonl()).toBe('');
  });

  it('bestehendes toJsonl() bleibt unverändert (roh, ungefiltert, kein art-Feld)', () => {
    const journal = new LearningJournal(memoryStore());
    journal.add({ sentiment: 'gut', context: 'Roh' });
    const [zeile] = journal.toJsonl().split('\n');
    const parsed = JSON.parse(zeile!) as Record<string, unknown>;
    expect(parsed['art']).toBeUndefined();
    expect(parsed['context']).toBe('Roh');
  });
});
