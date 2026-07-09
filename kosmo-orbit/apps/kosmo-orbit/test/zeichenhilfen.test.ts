import { describe, expect, it } from 'vitest';
import type { ElementFangKandidaten, FangKandidaten } from '@kosmo/kernel';
import { fluchtFang, ortho45, zeichenSnap } from '../src/modules/design/zeichenhilfen';

/**
 * Zeichenhilfen (T3): Ortho-Sperre (Shift), Fluchtlinien an bestehenden
 * Punkten und die Gesamt-Komposition fürs Werkzeug-Gummiband — rein und ohne
 * DOM, damit die ArchiCAD-Geste unabhängig vom Rendering geprüft werden kann.
 */

describe('ortho45 — Shift fixiert den Winkel auf 45°-Vielfache', () => {
  it('rastet eine fast-horizontale Linie auf exakt horizontal', () => {
    const ref = { x: 0, y: 0 };
    const p = ortho45(ref, { x: 4000, y: 120 });
    expect(p.y).toBe(0);
    expect(p.x).toBeGreaterThan(3900); // Distanz bleibt (fast) erhalten
  });

  it('rastet eine fast-vertikale Linie auf exakt vertikal', () => {
    const p = ortho45({ x: 0, y: 0 }, { x: 80, y: 3000 });
    expect(p.x).toBe(0);
  });

  it('rastet eine Diagonale auf exakt 45°', () => {
    const p = ortho45({ x: 0, y: 0 }, { x: 1000, y: 1050 });
    expect(Math.abs(p.x - p.y)).toBeLessThanOrEqual(1); // Rundungstoleranz
  });

  it('erhält die Distanz zum Referenzpunkt (nur der Winkel wird fixiert)', () => {
    const ref = { x: 1000, y: 1000 };
    const roh = { x: 5000, y: 1080 };
    const distRoh = Math.hypot(roh.x - ref.x, roh.y - ref.y);
    const p = ortho45(ref, roh);
    const distFixiert = Math.hypot(p.x - ref.x, p.y - ref.y);
    expect(Math.abs(distFixiert - distRoh)).toBeLessThan(5);
  });

  it('liefert den Referenzpunkt zurück, wenn Cursor und Referenz zusammenfallen', () => {
    const ref = { x: 500, y: 500 };
    expect(ortho45(ref, { x: 500, y: 500 })).toEqual(ref);
  });
});

describe('fluchtFang — Ausrichtung an bestehenden Punkten', () => {
  const kandidaten = [
    { x: 3000, y: 0 },
    { x: 3000, y: 6000 },
    { x: 9000, y: 2500 },
  ];

  it('zieht x heran, wenn ein Kandidat in Toleranz liegt', () => {
    const { p, fluchtlinien } = fluchtFang({ x: 3040, y: 4000 }, kandidaten, 150);
    expect(p.x).toBe(3000);
    expect(p.y).toBe(4000); // y bleibt frei — kein Kandidat in der Nähe
    expect(fluchtlinien).toEqual([{ achse: 'x', wert: 3000 }]);
  });

  it('zieht x und y gleichzeitig heran, wenn beide treffen', () => {
    const { p, fluchtlinien } = fluchtFang({ x: 3030, y: 2470 }, kandidaten, 150);
    expect(p).toEqual({ x: 3000, y: 2500 });
    expect(fluchtlinien).toHaveLength(2);
  });

  it('liefert den Rohpunkt unverändert, wenn nichts in Toleranz liegt', () => {
    const { p, fluchtlinien } = fluchtFang({ x: 100, y: 1000 }, kandidaten, 150);
    expect(p).toEqual({ x: 100, y: 1000 });
    expect(fluchtlinien).toEqual([]);
  });

  it('wählt bei mehreren Treffern den nächstliegenden Kandidaten je Achse', () => {
    const { p } = fluchtFang({ x: 3010, y: 3000 }, [{ x: 3000, y: 0 }, { x: 3005, y: 0 }], 20);
    expect(p.x).toBe(3005); // 3005 liegt näher an 3010 als 3000
  });
});

describe('zeichenSnap — Rangfolge Ortho > Stützenraster-Magnet > Fluchtlinie > Raster', () => {
  const rasterRunden = (p: { x: number; y: number }) => ({
    x: Math.round(p.x / 250) * 250,
    y: Math.round(p.y / 250) * 250,
  });

  it('fixiert den Winkel per Shift, auch wenn eine Fluchtlinie in der Nähe läge', () => {
    const ref = { x: 0, y: 0 };
    const ergebnis = zeichenSnap(
      { x: 4000, y: 90 },
      ref,
      true,
      undefined,
      [{ x: 3990, y: 500 }], // läge in Fluchtfang-Reichweite, wird von Ortho übergangen
      150,
      rasterRunden,
    );
    expect(ergebnis.orthoAktiv).toBe(true);
    expect(ergebnis.p.y).toBe(0);
    expect(ergebnis.fluchtlinien).toEqual([]);
  });

  it('ohne Shift und ohne Magnet greift die Fluchtlinie an einem bestehenden Punkt', () => {
    const ergebnis = zeichenSnap(
      { x: 3040, y: 4013 },
      null,
      false,
      undefined,
      [{ x: 3000, y: 9000 }],
      150,
      rasterRunden,
    );
    expect(ergebnis.orthoAktiv).toBe(false);
    expect(ergebnis.p.x).toBe(3000); // Fluchtlinie zieht x heran …
    expect(ergebnis.p.y).toBe(4013); // … y bleibt roh, NICHT auf 250 gerastert
    expect(ergebnis.fluchtlinien).toEqual([{ achse: 'x', wert: 3000 }]);
  });

  it('ohne Ortho/Magnet/Fluchtlinie greift das 250er-Raster (unverändertes Verhalten)', () => {
    const ergebnis = zeichenSnap({ x: 3110, y: 3110 }, null, false, undefined, [], 150, rasterRunden);
    expect(ergebnis.p).toEqual({ x: 3000, y: 3000 });
    expect(ergebnis.fluchtlinien).toEqual([]);
    expect(ergebnis.orthoAktiv).toBe(false);
  });

  it('der Stützenraster-Magnet gewinnt vor der Fluchtlinie', () => {
    const magnet: FangKandidaten = { kreuzungen: [{ x: 5000, y: 5000 }], achsen: [] };
    const ergebnis = zeichenSnap(
      { x: 5040, y: 4990 },
      null,
      false,
      magnet,
      [{ x: 5300, y: 9000 }], // läge ausserhalb der Fluchtfang-Toleranz — Magnet gewinnt ohnehin
      150,
      rasterRunden,
    );
    expect(ergebnis.p).toEqual({ x: 5000, y: 5000 });
    expect(ergebnis.fluchtlinien).toEqual([]);
  });

  it('ohne Referenzpunkt bleibt Shift wirkungslos (kein Winkel zum Fixieren)', () => {
    const ergebnis = zeichenSnap({ x: 3110, y: 3110 }, null, true, undefined, [], 150, rasterRunden);
    expect(ergebnis.orthoAktiv).toBe(false);
    expect(ergebnis.p).toEqual({ x: 3000, y: 3000 });
  });

  // F4 (v0.6.4): Element-Fang auf gezeichnete Bauteile — gewinnt vor dem
  // Stützenraster-Magnet und liefert den Treffer fürs sichtbare Marker-Overlay.
  const elemente: ElementFangKandidaten = {
    punkte: [
      { p: { x: 5000, y: 5100 }, typ: 'endpunkt', entityId: 'wand-1' },
      { p: { x: 2500, y: 5100 }, typ: 'mitte', entityId: 'wand-1' },
    ],
    kanten: [{ a: { x: 0, y: 5100 }, b: { x: 5000, y: 5100 }, entityId: 'wand-1' }],
  };

  it('F4: der Element-Fang (Wandende) gewinnt vor dem Stützenraster-Magnet', () => {
    const magnet: FangKandidaten = { kreuzungen: [{ x: 5000, y: 5000 }], achsen: [] };
    const ergebnis = zeichenSnap({ x: 5040, y: 5060 }, null, false, magnet, [], 150, rasterRunden, elemente);
    expect(ergebnis.p).toEqual({ x: 5000, y: 5100 }); // Wandende, NICHT die Rasterkreuzung
    expect(ergebnis.fang).toEqual({ p: { x: 5000, y: 5100 }, typ: 'endpunkt', entityId: 'wand-1' });
  });

  it('F4: ohne Element in Reichweite bleibt fang null und die alte Kette greift', () => {
    const ergebnis = zeichenSnap({ x: 12_110, y: 110 }, null, false, undefined, [], 150, rasterRunden, elemente);
    expect(ergebnis.fang).toBeNull();
    expect(ergebnis.p).toEqual({ x: 12_000, y: 0 }); // 250er-Raster wie bisher
  });

  it('F4: bei aktiver Ortho-Sperre bleibt der Element-Fang aus (der Winkel gewinnt)', () => {
    const ergebnis = zeichenSnap({ x: 4000, y: 5050 }, { x: 0, y: 5100 }, true, undefined, [], 150, rasterRunden, elemente);
    expect(ergebnis.orthoAktiv).toBe(true);
    expect(ergebnis.fang).toBeNull();
  });

  it('F4: Kanten-Fusspunkt fängt, wenn kein Punkt-Kandidat in Reichweite liegt', () => {
    const ergebnis = zeichenSnap({ x: 1200, y: 5300 }, null, false, undefined, [], 150, rasterRunden, elemente);
    expect(ergebnis.p).toEqual({ x: 1200, y: 5100 });
    expect(ergebnis.fang?.typ).toBe('kante');
  });
});
