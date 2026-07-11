import { describe, expect, it } from 'vitest';
import {
  kennzahlMatrix,
  segmentVariantenMatrix,
  variantenMatrix,
  type MatrixEintrag,
  type MatrixSpalte,
} from '../src/derive/variantenmatrix';
import { generiereVolumenstudien } from '../src/derive/volumenstudie';
import { variantenSuche, type SegmentVariante, type VariantenGewichte } from '../src/derive/variantensuche';

/**
 * v0.7.0 E5-iii (Stream 5A) — `variantenmatrix.ts` verallgemeinert:
 * `kennzahlMatrix(eintraege, spalten)` ist jetzt der quellenunabhängige
 * Kern; `variantenMatrix()` (Volumenstudien) bleibt ein BYTE-IDENTISCHER
 * dünner Adapter (siehe kernel.test.ts «Varianten-Matrix (V2-V3/F4)» —
 * dortige Assertions unverändert, laufen weiter grün); `segmentVariantenMatrix()`
 * ist der neue Adapter für `derive/variantensuche.ts`-Ergebnisse.
 */

const FOOTPRINT = [
  { x: 0, y: 0 },
  { x: 30000, y: 0 },
  { x: 30000, y: 14000 },
  { x: 0, y: 14000 },
];
const KORRIDOR = [
  { x: 0, y: 6000 },
  { x: 30000, y: 6000 },
  { x: 30000, y: 8000 },
  { x: 0, y: 8000 },
];
const GEWICHTE: VariantenGewichte = { programmErfuellung: 1, kompaktheit: 1, mixTreue: 1, flaechenNutzung: 1 };

describe('kennzahlMatrix() — generischer Kern (E5-iii)', () => {
  it('baut Zeilen aus benannten Rohwerten; fehlender Schlüssel je Zeile wird zu null', () => {
    const eintraege: MatrixEintrag[] = [
      { id: 'a', name: 'A', passt: true, werte: { x: 10, y: 5 } },
      { id: 'b', name: 'B', passt: false, werte: { x: 20 } }, // y fehlt bewusst
    ];
    const spalten: MatrixSpalte[] = [
      { key: 'x', label: 'X' },
      { key: 'y', label: 'Y', kleinerBesser: true },
    ];
    const m = kennzahlMatrix(eintraege, spalten);
    expect(m.achsen).toEqual(spalten);
    expect(m.zeilen).toEqual([
      { id: 'a', name: 'A', passt: true, werte: [10, 5] },
      { id: 'b', name: 'B', passt: false, werte: [20, null] },
    ]);
    // Bereich X: min 10, max 20. Bereich Y: nur ein Wert (5) -> min=max -> max+1.
    expect(m.bereiche).toEqual([
      { min: 10, max: 20 },
      { min: 5, max: 6 },
    ]);
  });

  it('leere Eintragsliste: jede Spalte bekommt den Default-Bereich [0,1]', () => {
    const spalten: MatrixSpalte[] = [{ key: 'x', label: 'X' }];
    const m = kennzahlMatrix([], spalten);
    expect(m.zeilen).toEqual([]);
    expect(m.bereiche).toEqual([{ min: 0, max: 1 }]);
  });
});

describe('variantenMatrix() — Volumenstudien-Adapter bleibt byte-identisch (Regressionsnetz zu kernel.test.ts)', () => {
  it('gleiche Achsen/Zeilen/Bereiche-Form wie vor der Verallgemeinerung', () => {
    const parzelle = [{ x: 0, y: 0 }, { x: 40000, y: 0 }, { x: 40000, y: 30000 }, { x: 0, y: 30000 }];
    const varianten = generiereVolumenstudien(parzelle, { zielGf: 2000, maxHoehe: 14000, nutzung: 'wohnen' });
    expect(varianten.length).toBeGreaterThanOrEqual(2);
    const mitZiel = variantenMatrix(varianten, 2000);
    expect(mitZiel.achsen.map((a) => a.key)).toEqual(['gf', 'delta', 'geschosse', 'hoehe', 'fussabdruck', 'besonnung']);
    expect(mitZiel.zeilen).toHaveLength(varianten.length);
    for (const z of mitZiel.zeilen) expect(z.werte).toHaveLength(mitZiel.achsen.length);
    for (const b of mitZiel.bereiche) expect(b.max).toBeGreaterThan(b.min);

    const ohneZiel = variantenMatrix(varianten, null);
    expect(ohneZiel.achsen.map((a) => a.key)).toEqual(['gf', 'geschosse', 'hoehe', 'fussabdruck', 'besonnung']);
  });
});

describe('segmentVariantenMatrix() — neuer Adapter für die Variantensuche (E5-iii)', () => {
  function ziehe(seed: number, n: number): SegmentVariante[] {
    const gen = variantenSuche({ footprint: FOOTPRINT, korridor: KORRIDOR, mix: [
      { typ: 'marktgerecht', groesse: 95, anzahl: 2 },
      { typ: 'preisguenstig', groesse: 75, anzahl: 2 },
    ] }, GEWICHTE, seed);
    const out: SegmentVariante[] = [];
    for (let i = 0; i < n; i++) out.push(gen.next().value);
    return out;
  }

  it('liefert Score + die vier Teilscores als Spalten, eine Zeile je Variante', () => {
    const varianten = ziehe(1, 12);
    const top = [...varianten].sort((a, b) => b.score - a.score).slice(0, 8);
    const m = segmentVariantenMatrix(top);
    expect(m.achsen.map((a) => a.key)).toEqual(['score', 'programmErfuellung', 'kompaktheit', 'mixTreue', 'flaechenNutzung']);
    expect(m.zeilen).toHaveLength(top.length);
    for (const z of m.zeilen) {
      expect(z.werte).toHaveLength(5);
      for (const w of z.werte) {
        expect(w).not.toBeNull();
        expect(w as number).toBeGreaterThanOrEqual(0);
        expect(w as number).toBeLessThanOrEqual(1);
      }
    }
    for (const b of m.bereiche) expect(b.max).toBeGreaterThanOrEqual(b.min);
  });

  it('leere Top-Liste (z.B. degenerierte Eingabe ohne jeden Zug) → leere Matrix, kein Crash', () => {
    const m = segmentVariantenMatrix([]);
    expect(m.zeilen).toEqual([]);
    expect(m.bereiche).toHaveLength(5);
  });
});
