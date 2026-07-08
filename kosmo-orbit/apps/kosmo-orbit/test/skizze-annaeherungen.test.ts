import { describe, expect, it } from 'vitest';
import {
  ANNAEHERUNG_RASTER_MM,
  begradigeUndRaster,
  orthogonalisiere,
  skizzeAnnaeherungen,
  skizzeMiniPfad,
} from '../src/modules/design/skizze-annaeherungen';
import type { FittedSegment } from '../src/modules/design/sketch';

/**
 * K16 A6 (Modus 2, «Skizzieren mit 3 Annäherungen»): die drei Annäherungen
 * sind pure Funktionen auf dem bestehenden Segmentierer-Ergebnis — Variante
 * (a) unverändert, (b) Winkel auf 0°/90°, (c) zusätzlich aufs Zeichenraster.
 */

describe('orthogonalisiere — Variante (b)', () => {
  it('lässt ein bereits achsenparalleles Segment unverändert (bis auf Rundung)', () => {
    const seg: FittedSegment = { a: { x: 0, y: 0 }, b: { x: 4000, y: 0 } };
    const [erg] = orthogonalisiere([seg]);
    expect(erg).toEqual(seg);
  });

  it('rundet eine fast-horizontale Richtung auf horizontal, Länge bleibt', () => {
    const seg: FittedSegment = { a: { x: 0, y: 0 }, b: { x: 4000, y: 300 } };
    const laenge = Math.hypot(4000, 300);
    const [erg] = orthogonalisiere([seg]);
    expect(erg!.a).toEqual({ x: 0, y: 0 });
    expect(erg!.b.y).toBe(0);
    expect(erg!.b.x).toBeCloseTo(laenge, 0);
  });

  it('rundet eine fast-vertikale Richtung auf vertikal', () => {
    const seg: FittedSegment = { a: { x: 0, y: 0 }, b: { x: 200, y: 3000 } };
    const [erg] = orthogonalisiere([seg]);
    expect(erg!.b.x).toBe(0);
    expect(erg!.b.y).toBeGreaterThan(2900);
  });

  it('hält eine verbundene Kette (Rechteck-Ecke) zusammen — b von Segment i == a von Segment i+1', () => {
    // Ein leicht schiefes "L": zwei Segmente, deren gemeinsamer Eckpunkt exakt geteilt wird.
    const kette: FittedSegment[] = [
      { a: { x: 0, y: 0 }, b: { x: 4000, y: 120 } },
      { a: { x: 4000, y: 120 }, b: { x: 4100, y: 3000 } },
    ];
    const erg = orthogonalisiere(kette);
    expect(erg[1]!.a).toEqual(erg[0]!.b); // Ecke bleibt geschlossen
  });

  it('lässt unabhängige (nicht verbundene) Striche unabhängig', () => {
    const striche: FittedSegment[] = [
      { a: { x: 0, y: 0 }, b: { x: 4000, y: 0 } },
      { a: { x: 0, y: 5000 }, b: { x: 4000, y: 5100 } },
    ];
    const erg = orthogonalisiere(striche);
    expect(erg[1]!.a).toEqual({ x: 0, y: 5000 }); // eigener Startpunkt, nicht an Segment 1 gehängt
  });

  it('leere Liste ergibt leere Liste (kein Crash)', () => {
    expect(orthogonalisiere([])).toEqual([]);
  });
});

describe('begradigeUndRaster — Variante (c)', () => {
  it('rastert beide Endpunkte auf Vielfache des Zeichenrasters', () => {
    const seg: FittedSegment = { a: { x: 130, y: 40 }, b: { x: 4080, y: 90 } };
    const [erg] = begradigeUndRaster([seg]);
    expect(erg!.a.x % ANNAEHERUNG_RASTER_MM).toBe(0);
    expect(erg!.a.y % ANNAEHERUNG_RASTER_MM).toBe(0);
    expect(erg!.b.x % ANNAEHERUNG_RASTER_MM).toBe(0);
    expect(erg!.b.y % ANNAEHERUNG_RASTER_MM).toBe(0);
  });

  it('hält eine verbundene Kette nach dem Rastern weiterhin zusammen', () => {
    const kette: FittedSegment[] = [
      { a: { x: 10, y: 10 }, b: { x: 3990, y: 130 } },
      { a: { x: 3990, y: 130 }, b: { x: 4110, y: 3005 } },
    ];
    const erg = begradigeUndRaster(kette);
    expect(erg[1]!.a).toEqual(erg[0]!.b);
  });

  it('akzeptiert ein eigenes Raster (Parameter)', () => {
    const seg: FittedSegment = { a: { x: 30, y: 10 }, b: { x: 480, y: 5 } };
    const [erg] = begradigeUndRaster([seg], 500);
    expect(erg!.a.x % 500).toBe(0);
    expect(erg!.b.x % 500).toBe(0);
  });
});

describe('skizzeAnnaeherungen — drei Varianten aus einem Segmentierer-Ergebnis', () => {
  const segs: FittedSegment[] = [
    { a: { x: 0, y: 0 }, b: { x: 4000, y: 150 } },
    { a: { x: 4000, y: 150 }, b: { x: 4200, y: 3100 } },
  ];

  it('liefert genau drei Varianten mit den erwarteten IDs, in Reihenfolge a/b/c', () => {
    const v = skizzeAnnaeherungen(segs);
    expect(v.map((x) => x.id)).toEqual(['exakt', 'orthogonal', 'raster']);
  });

  it('Variante «exakt» ist bit-identisch das Segmentierer-Ergebnis (heutiges Verhalten)', () => {
    const v = skizzeAnnaeherungen(segs);
    expect(v[0]!.segments).toBe(segs);
  });

  it('Variante «orthogonal» entspricht orthogonalisiere(segs)', () => {
    const v = skizzeAnnaeherungen(segs);
    expect(v[1]!.segments).toEqual(orthogonalisiere(segs));
  });

  it('Variante «raster» entspricht begradigeUndRaster(segs)', () => {
    const v = skizzeAnnaeherungen(segs);
    expect(v[2]!.segments).toEqual(begradigeUndRaster(segs));
  });
});

describe('skizzeMiniPfad — Vorschau-Pfad (reine SVG-Pfadberechnung)', () => {
  it('leere Segmentliste ergibt leeren Pfad', () => {
    expect(skizzeMiniPfad([])).toBe('');
  });

  it('erzeugt für jedes Segment einen M/L-Abschnitt', () => {
    const segs: FittedSegment[] = [
      { a: { x: 0, y: 0 }, b: { x: 4000, y: 0 } },
      { a: { x: 4000, y: 0 }, b: { x: 4000, y: 3000 } },
    ];
    const d = skizzeMiniPfad(segs);
    expect(d.match(/M /g)?.length).toBe(2);
    expect(d.match(/L /g)?.length).toBe(2);
  });

  it('ist deterministisch (gleiche Eingabe, gleiche Ausgabe)', () => {
    const segs: FittedSegment[] = [{ a: { x: 10, y: 20 }, b: { x: 3000, y: 1500 } }];
    expect(skizzeMiniPfad(segs)).toBe(skizzeMiniPfad(segs));
  });
});
