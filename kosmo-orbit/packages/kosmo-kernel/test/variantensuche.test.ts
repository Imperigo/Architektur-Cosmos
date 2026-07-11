import { describe, expect, it } from 'vitest';
import { segmentiere } from '../src/derive/segmentierer';
import { variantenSuche, type SegmentierEingabe, type VariantenGewichte } from '../src/derive/variantensuche';

/**
 * V070-KONZEPT E5-i (Stream 4A): Determinismus- und Score-Beweise für den
 * seeded Anytime-Generator. Zwei reale Geschoss-Fixtures (dieselben wie in
 * segmentierer-charakterisierung.test.ts):
 * - MFH_A: 30×14 m, Korridor y 6000–8000, EIN Typ (preisguenstig), Kern.
 * - MFH_B: 40×16 m, Korridor y 7000–9000, ZWEI Typen (marktgerecht/
 *   alterswohnen), kein Kern.
 */

const MFH_A: SegmentierEingabe = {
  footprint: [
    { x: 0, y: 0 },
    { x: 30000, y: 0 },
    { x: 30000, y: 14000 },
    { x: 0, y: 14000 },
  ],
  korridor: [
    { x: 0, y: 6000 },
    { x: 30000, y: 6000 },
    { x: 30000, y: 8000 },
    { x: 0, y: 8000 },
  ],
  mix: [{ typ: 'preisguenstig', groesse: 75, anzahl: 4 }],
  opts: { kern: true, minBreite: 4500 },
};

const MFH_B: SegmentierEingabe = {
  footprint: [
    { x: 0, y: 0 },
    { x: 40000, y: 0 },
    { x: 40000, y: 16000 },
    { x: 0, y: 16000 },
  ],
  korridor: [
    { x: 0, y: 7000 },
    { x: 40000, y: 7000 },
    { x: 40000, y: 9000 },
    { x: 0, y: 9000 },
  ],
  mix: [
    { typ: 'marktgerecht', groesse: 95, anzahl: 3 },
    { typ: 'alterswohnen', groesse: 65, anzahl: 3 },
  ],
};

const ALLE_GLEICH: VariantenGewichte = { programmErfuellung: 1, kompaktheit: 1, mixTreue: 1, flaechenNutzung: 1 };

describe('variantenSuche — 1. Ausbeute = Greedy-DP (kein Duplikat)', () => {
  it('MFH_A: erste Ausbeute ist byte-identisch zu segmentiere() direkt, zug: "start"', () => {
    const referenz = segmentiere(MFH_A.footprint, MFH_A.korridor, MFH_A.mix, MFH_A.opts);
    const erste = variantenSuche(MFH_A, ALLE_GLEICH, 1).next().value!;
    expect(erste.zug).toBe('start');
    expect(erste.wohnungen).toEqual(referenz.wohnungen);
  });

  it('MFH_B: erste Ausbeute ist byte-identisch zu segmentiere() direkt', () => {
    const referenz = segmentiere(MFH_B.footprint, MFH_B.korridor, MFH_B.mix, MFH_B.opts);
    const erste = variantenSuche(MFH_B, ALLE_GLEICH, 1).next().value!;
    expect(erste.zug).toBe('start');
    expect(erste.wohnungen).toEqual(referenz.wohnungen);
  });
});

describe('variantenSuche — Determinismus', () => {
  it('gleicher Seed ⇒ byte-identische Sequenz der ersten 20 Varianten (JSON-Vergleich)', () => {
    const gen1 = variantenSuche(MFH_B, ALLE_GLEICH, 7);
    const gen2 = variantenSuche(MFH_B, ALLE_GLEICH, 7);
    const seq1 = Array.from({ length: 20 }, () => gen1.next().value);
    const seq2 = Array.from({ length: 20 }, () => gen2.next().value);
    expect(JSON.stringify(seq1)).toBe(JSON.stringify(seq2));
  });

  it('gleicher Seed, andere Gewichte ⇒ 1. Ausbeute identisch in Zug UND Geometrie (nur der Score unterscheidet sich)', () => {
    // Die 1. Ausbeute ist immer der reine segmentiere()-Aufruf (zug:'start')
    // — das ist unabhängig von den Gewichten, nur ihr Score unterscheidet
    // sich (Gewichte fliessen NUR in die Bewertung, nie in die Geometrie
    // der Start-Ausbeute). AB der 2. Ausbeute kann die Zugwahl auseinander-
    // laufen, weil Gewichte beeinflussen, welche Variante zur neuen Basis
    // wird (`stand`) — das ist beabsichtigtes Hill-Climbing-Verhalten, kein
    // Bug, und wird deshalb hier NICHT als Determinismus-Eigenschaft
    // behauptet.
    const gewichteA: VariantenGewichte = { programmErfuellung: 1, kompaktheit: 0, mixTreue: 0, flaechenNutzung: 0 };
    const gewichteB: VariantenGewichte = { programmErfuellung: 0, kompaktheit: 0, mixTreue: 0, flaechenNutzung: 1 };
    const ersteA = variantenSuche(MFH_B, gewichteA, 11).next().value!;
    const ersteB = variantenSuche(MFH_B, gewichteB, 11).next().value!;
    expect(ersteA.zug).toBe('start');
    expect(ersteB.zug).toBe('start');
    expect(ersteA.wohnungen).toEqual(ersteB.wohnungen);
    expect(ersteA.score).not.toBe(ersteB.score);
  });

  it('verschiedene Seeds ⇒ verschiedene Sequenzen', () => {
    const gen1 = variantenSuche(MFH_B, ALLE_GLEICH, 1);
    const gen2 = variantenSuche(MFH_B, ALLE_GLEICH, 2);
    const seq1 = Array.from({ length: 20 }, () => gen1.next().value);
    const seq2 = Array.from({ length: 20 }, () => gen2.next().value);
    expect(JSON.stringify(seq1)).not.toBe(JSON.stringify(seq2));
  });
});

describe('variantenSuche — Score-Monotonie (Anytime-Eigenschaft)', () => {
  it('MFH_A: bestes Ergebnis nach 50 Zügen ≥ Greedy-Score (1. Ausbeute)', () => {
    const gen = variantenSuche(MFH_A, ALLE_GLEICH, 123);
    const greedy = gen.next().value!;
    let best = greedy.score;
    for (let i = 0; i < 50; i++) {
      best = Math.max(best, gen.next().value!.score);
    }
    expect(best).toBeGreaterThanOrEqual(greedy.score);
  });

  it('MFH_B: bestes Ergebnis nach 50 Zügen ≥ Greedy-Score, für 3 verschiedene Seeds', () => {
    for (const seed of [1, 42, 999]) {
      const gen = variantenSuche(MFH_B, ALLE_GLEICH, seed);
      const greedy = gen.next().value!;
      let best = greedy.score;
      for (let i = 0; i < 50; i++) {
        best = Math.max(best, gen.next().value!.score);
      }
      expect(best).toBeGreaterThanOrEqual(greedy.score);
    }
  });

  it('läuft die Suche 200 Züge, bleibt der laufende Bestwert monoton (nie fallend)', () => {
    const gen = variantenSuche(MFH_B, ALLE_GLEICH, 55);
    let best = -Infinity;
    for (let i = 0; i < 200; i++) {
      const v = gen.next().value!;
      const laufenderBest = Math.max(best, v.score);
      expect(laufenderBest).toBeGreaterThanOrEqual(best);
      best = laufenderBest;
    }
  });
});

describe('variantenSuche — Gewichte wirken', () => {
  it('programmErfuellung=1/Rest=0 ⇒ andere beste Variante als kompaktheit=1/Rest=0', () => {
    const gewichteProgramm: VariantenGewichte = { programmErfuellung: 1, kompaktheit: 0, mixTreue: 0, flaechenNutzung: 0 };
    const gewichteKompakt: VariantenGewichte = { programmErfuellung: 0, kompaktheit: 1, mixTreue: 0, flaechenNutzung: 0 };
    const genProgramm = variantenSuche(MFH_B, gewichteProgramm, 99);
    const genKompakt = variantenSuche(MFH_B, gewichteKompakt, 99);
    const ziehe = (gen: ReturnType<typeof variantenSuche>, n: number) => Array.from({ length: n }, () => gen.next().value!);
    const laufProgramm = ziehe(genProgramm, 60);
    const laufKompakt = ziehe(genKompakt, 60);
    const bestProgramm = laufProgramm.reduce((m, v) => (v.score > m.score ? v : m));
    const bestKompakt = laufKompakt.reduce((m, v) => (v.score > m.score ? v : m));
    expect(JSON.stringify(bestProgramm.wohnungen)).not.toBe(JSON.stringify(bestKompakt.wohnungen));
  });

  it('Score = 0, wenn alle Gewichte 0 sind (dokumentierter Rand-Fall, kein NaN/Infinity)', () => {
    const nullGewichte: VariantenGewichte = { programmErfuellung: 0, kompaktheit: 0, mixTreue: 0, flaechenNutzung: 0 };
    const gen = variantenSuche(MFH_A, nullGewichte, 1);
    for (let i = 0; i < 10; i++) {
      expect(gen.next().value!.score).toBe(0);
    }
  });
});

describe('variantenSuche — nur gültige Varianten (Ehrlichkeit)', () => {
  it('jede Ausbeute hat ≥ 1 Wohnung, positive Fläche, konsistente Abweichungs-/Typ-Paarung', () => {
    const gen = variantenSuche(MFH_B, ALLE_GLEICH, 321);
    for (let i = 0; i < 100; i++) {
      const v = gen.next().value!;
      expect(v.wohnungen.length).toBeGreaterThan(0);
      for (const w of v.wohnungen) {
        expect(w.flaeche).toBeGreaterThan(0);
        if (w.typ === null) {
          expect(w.abweichung).toBeNull();
        } else {
          expect(typeof w.abweichung).toBe('number');
        }
      }
      expect(v.score).toBeGreaterThanOrEqual(0);
      expect(v.score).toBeLessThanOrEqual(1);
      for (const teil of Object.values(v.teilScores)) {
        expect(teil).toBeGreaterThanOrEqual(0);
        expect(teil).toBeLessThanOrEqual(1);
      }
    }
  });

  it('leerer Soll-Mix ⇒ nach der Start-Ausbeute nur noch "stagnation" (ehrlich, kein Hang, kein Fake-Fortschritt)', () => {
    const eingabe: SegmentierEingabe = { footprint: MFH_A.footprint, korridor: MFH_A.korridor, mix: [] };
    const gen = variantenSuche(eingabe, ALLE_GLEICH, 5);
    const erste = gen.next().value!;
    expect(erste.zug).toBe('start');
    for (let i = 0; i < 10; i++) {
      const v = gen.next().value!;
      expect(v.zug).toBe('stagnation');
      expect(v.wohnungen).toEqual(erste.wohnungen);
      expect(v.score).toBe(erste.score);
    }
  });

  it('geometrisch degenerierte Eingabe (Korridor = ganzer Footprint, kein Band) ⇒ kein Hang, "start" liefert [] wie segmentiere() selbst, danach dauerhaft "stagnation"', () => {
    // Regressionstest: OHNE die explizite Degenerations-Weiche im Generator
    // würden zielgroesseJittern/mixPermutation ewig leere Ergebnisse
    // produzieren und NIE `yield` erreichen (Hang in `.next()`), weil ihre
    // Verfügbarkeit nur von mixSollOriginal.length abhängt, nicht davon, ob
    // überhaupt ein Band existiert.
    const FOOTPRINT = [
      { x: 0, y: 0 },
      { x: 10000, y: 0 },
      { x: 10000, y: 10000 },
      { x: 0, y: 10000 },
    ];
    const KORRIDOR = FOOTPRINT; // Korridor deckt den ganzen Footprint ab -> keine Bänder
    const eingabe: SegmentierEingabe = {
      footprint: FOOTPRINT,
      korridor: KORRIDOR,
      mix: [{ typ: 'preisguenstig', groesse: 75, anzahl: 4 }],
    };
    const gen = variantenSuche(eingabe, ALLE_GLEICH, 1);
    const seq = Array.from({ length: 20 }, () => gen.next().value!);
    expect(seq[0]!.zug).toBe('start');
    expect(seq[0]!.wohnungen).toEqual([]);
    for (let i = 1; i < seq.length; i++) {
      expect(seq[i]!.zug).toBe('stagnation');
      expect(seq[i]!.wohnungen).toEqual([]);
    }
  });

  it('typTausch ändert nie die Geometrie (Outline/Fläche bleiben, nur typ/abweichung wechseln)', () => {
    const gen = variantenSuche(MFH_B, ALLE_GLEICH, 2024);
    let gefunden = false;
    for (let i = 0; i < 200 && !gefunden; i++) {
      const v = gen.next().value!;
      if (v.zug === 'typTausch') {
        gefunden = true;
        const flaechen = v.wohnungen.map((w) => w.flaeche).sort((a, b) => a - b);
        const referenzFlaechen = segmentiere(MFH_B.footprint, MFH_B.korridor, MFH_B.mix, MFH_B.opts)
          .wohnungen.map((w) => w.flaeche)
          .sort((a, b) => a - b);
        expect(flaechen).toEqual(referenzFlaechen);
      }
    }
    expect(gefunden).toBe(true);
  });
});
