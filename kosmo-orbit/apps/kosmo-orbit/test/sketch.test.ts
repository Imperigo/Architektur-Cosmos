import { describe, expect, it } from 'vitest';
import { fitStroke, fitStrokes, type Stroke } from '../src/modules/design/sketch';

/**
 * KosmoSketch — Strich-Fitting (sketch.ts): rein, ohne DOM. T5 (Owner-Laptop-
 * test) fügt den Batch-Weg hinzu — mehrere frei gezeichnete Striche werden
 * ERST auf «Übergeben» gemeinsam gefittet, statt jeder Strich einzeln sofort.
 */

function gerade(a: { x: number; y: number }, b: { x: number; y: number }, n = 8): Stroke {
  const points = Array.from({ length: n }, (_, i) => {
    const t = i / (n - 1);
    return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, pressure: 0.5 };
  });
  return { points };
}

describe('fitStroke — Einzelstrich (bestehendes Verhalten unverändert)', () => {
  it('fittet einen geraden Strich auf ein Wandsegment', () => {
    const segs = fitStroke(gerade({ x: 0, y: 0 }, { x: 4000, y: 0 }));
    expect(segs).toHaveLength(1);
    expect(segs[0]!.a.y).toBe(0);
    expect(segs[0]!.b.y).toBe(0);
  });

  it('verwirft zu kurze Striche (Zitter-Klick)', () => {
    const segs = fitStroke(gerade({ x: 0, y: 0 }, { x: 100, y: 0 }));
    expect(segs).toHaveLength(0);
  });
});

describe('fitStrokes — Batch-Commit (T5): mehrere Striche in einem Aufruf', () => {
  it('fittet mehrere unabhängige Striche zu einer gemeinsamen Segmentliste', () => {
    const a = gerade({ x: 0, y: 0 }, { x: 4000, y: 0 });
    const b = gerade({ x: 0, y: 4000 }, { x: 4000, y: 4000 });
    const segs = fitStrokes([a, b]);
    expect(segs).toHaveLength(2);
    expect(segs[0]!.a.y).toBe(0);
    expect(segs[1]!.a.y).toBe(4000);
  });

  it('liefert dasselbe Ergebnis wie das manuelle Aneinanderreihen von fitStroke-Aufrufen', () => {
    const strokes = [
      gerade({ x: 0, y: 0 }, { x: 3000, y: 0 }),
      gerade({ x: 3000, y: 0 }, { x: 3000, y: 3000 }),
      gerade({ x: 3000, y: 3000 }, { x: 0, y: 3000 }),
    ];
    const combined = fitStrokes(strokes);
    const manual = strokes.flatMap((s) => fitStroke(s));
    expect(combined).toEqual(manual);
    expect(combined.length).toBeGreaterThan(0);
  });

  it('leere Strichliste ergibt leere Segmentliste (kein Crash)', () => {
    expect(fitStrokes([])).toEqual([]);
  });

  it('ignoriert innerhalb des Batches weiterhin zu kurze Einzelstriche', () => {
    const lang = gerade({ x: 0, y: 0 }, { x: 4000, y: 0 });
    const kurz = gerade({ x: 8000, y: 0 }, { x: 8100, y: 0 });
    const segs = fitStrokes([lang, kurz]);
    expect(segs).toHaveLength(1);
  });

  it('reicht Fit-Optionen (tolerance/grid/minLength) an jeden Strich weiter', () => {
    const a = gerade({ x: 0, y: 0 }, { x: 1000, y: 0 });
    // minLength Standard ist 600mm — mit niedrigerem minLength bleibt der Strich erhalten
    const segsDefault = fitStrokes([a], { minLength: 2000 });
    const segsNiedrig = fitStrokes([a], { minLength: 100 });
    expect(segsDefault).toHaveLength(0);
    expect(segsNiedrig).toHaveLength(1);
  });
});
