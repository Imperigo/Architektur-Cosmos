import { describe, expect, it } from 'vitest';
import { LearningJournal, localStorageMemory, type Learning, type MemoryStore } from '../src';

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
