import { describe, expect, it } from 'vitest';
import { KosmoDoc } from '../src/model/doc';
import { execute } from '../src/commands/core';
import '../src/commands/design';
import { planGraphicToDxf, planToDxf } from '../src/dxf/export';
import { parseDxf, semantikFuerLayer } from '../src/dxf/import';
import type { PlanGraphic } from '../src/derive/plan';

/**
 * V1.6 Block C / C2 — DXF-Import. Abnahmekern nach C-E1: der Roundtrip
 * `planGraphicToDxf → parseDxf` ist geometrisch identisch (±0.001 mm =
 * Export-Rundung). Dazu: tolerantes LWPOLYLINE (R2000-Praxis), ehrlicher
 * Bericht (INSERT/unbekannte Entities/unklassierte Layer — nie stilles
 * Verwerfen), und die Layer-Semantik als Daten-Tabelle (C-E2).
 */

const TOL = 1e-3;
const nah = (a: number, b: number) => Math.abs(a - b) <= TOL;
const punktNah = (a: { x: number; y: number }, b: { x: number; y: number }) => nah(a.x, b.x) && nah(a.y, b.y);
/** Segment-Gleichheit ungerichtet (a→b oder b→a). */
const segmentNah = (s: { a: { x: number; y: number }; b: { x: number; y: number } }, t: { a: { x: number; y: number }; b: { x: number; y: number } }) =>
  (punktNah(s.a, t.a) && punktNah(s.b, t.b)) || (punktNah(s.a, t.b) && punktNah(s.b, t.a));
const winkelNorm = (w: number) => ((w % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);

function synthetischerPlan(): PlanGraphic {
  return {
    storeyId: 's',
    regions: [
      // Region mit Loch: Umriss + Innenring → zwei DXF-Ringe.
      {
        rings: [
          [{ x: 0, y: 0 }, { x: 4000, y: 0 }, { x: 4000, y: 3000 }, { x: 0, y: 3000 }],
          [{ x: 1000, y: 1000 }, { x: 2000, y: 1000 }, { x: 2000, y: 2000 }, { x: 1000, y: 2000 }],
        ],
        classes: ['cut', 'tragend'],
      },
    ],
    lines: [
      { a: { x: 100.5, y: 200.25 }, b: { x: 900, y: 200.25 }, classes: ['symbol', 'fenster'] },
      { a: { x: -500, y: -300 }, b: { x: -500, y: 700 }, classes: ['bemassung'] },
    ],
    arcs: [{ center: { x: 500, y: 500 }, radius: 250, startAngle: 0.3, endAngle: 1.9, classes: ['symbol', 'tuer'] }],
    axes: [],
    texte: [{ at: { x: 1234, y: 5678 }, text: 'D 300x300 UK 1200', classes: ['kote'] }],
    bounds: null,
  };
}

describe('Roundtrip planGraphicToDxf → parseDxf (Abnahmekern C-E1)', () => {
  const plan = synthetischerPlan();
  const zurueck = parseDxf(planGraphicToDxf(plan));

  it('Ringe kommen geometrisch identisch zurück (±0.001 mm), inkl. Loch', () => {
    expect(zurueck.regions.length).toBe(2); // Umriss + Loch = 2 DXF-Ringe
    for (const [ri, ring] of plan.regions[0]!.rings.entries()) {
      const r = zurueck.regions[ri]!;
      expect(r.ring.length).toBe(ring.length);
      for (const [k, p] of ring.entries()) {
        expect(punktNah(r.ring[k]!, p), `Ring ${ri} Punkt ${k}`).toBe(true);
      }
      expect(r.layer).toBe('TRAGEND');
    }
  });

  it('Linien identisch, y-Spiegelung exakt invertiert — ausser der Bemassungslinie ' +
    '(v0.7.1 3A: LAYER_BEMASSUNG wird beim Import bewusst NICHT zu Geometrie)', () => {
    const nichtBemassung = plan.lines.filter((l) => !l.classes.includes('bemassung'));
    expect(zurueck.lines.length).toBe(nichtBemassung.length);
    for (const l of nichtBemassung) {
      expect(zurueck.lines.some((z) => segmentNah(z, l)), `Linie ${JSON.stringify(l.a)}`).toBe(true);
    }
    // Die 'bemassung'-Linie landet beim Export zwar auf BEMASSUNG (Layer-
    // Routing bleibt generisch über die Klasse), kommt aber beim Import
    // nicht zurück — eine Masskette ist eine Ableitung, kein Entity.
    expect(zurueck.lines.some((l) => l.layer === 'BEMASSUNG')).toBe(false);
    // Layer-Zuordnung des Exports kommt mit (nur noch das, was übrig bleibt).
    expect(zurueck.lines.map((l) => l.layer).sort()).toEqual(['FENSTER']);
  });

  it('Bogen: Zentrum/Radius exakt, Winkel bis auf 2π-Normierung identisch', () => {
    expect(zurueck.arcs.length).toBe(1);
    const a = zurueck.arcs[0]!;
    const o = plan.arcs[0]!;
    expect(punktNah(a.center, o.center)).toBe(true);
    expect(nah(a.radius, o.radius)).toBe(true);
    expect(nah(winkelNorm(a.startAngle), winkelNorm(o.startAngle))).toBe(true);
    expect(nah(winkelNorm(a.endAngle), winkelNorm(o.endAngle))).toBe(true);
  });

  it('Texte: Position + Inhalt identisch (zeile 0)', () => {
    expect(zurueck.texte.length).toBe(1);
    expect(punktNah(zurueck.texte[0]!.at, plan.texte[0]!.at)).toBe(true);
    expect(zurueck.texte[0]!.text).toBe('D 300x300 UK 1200');
  });

  it('Bericht ist sauber: keine Blöcke, keine unbekannten Entities, alle Layer klassiert', () => {
    expect(zurueck.bericht.bloeckeNichtAufgeloest).toBe(0);
    expect(zurueck.bericht.unbekannteEntities).toEqual({});
    expect(zurueck.bericht.layerUnklassiert).toEqual([]);
  });
});

describe('Roundtrip am echten Testhaus (planToDxf → parseDxf)', () => {
  it('jede Wand-Poché und jedes Symbol hat einen geometrischen Zwilling', () => {
    const doc = new KosmoDoc();
    const eg = execute(doc, 'design.geschossErstellen', { name: 'EG', index: 0, elevation: 0, height: 3000 });
    const sid = (eg.patches[0] as { id: string }).id;
    const auf = execute(doc, 'design.aufbauErstellen', {
      name: 'AW', target: 'wall', layers: [{ material: 'beton', thickness: 200, function: 'tragend' }],
    });
    const aid = (auf.patches[0] as { id: string }).id;
    const w = (a: { x: number; y: number }, b: { x: number; y: number }) =>
      execute(doc, 'design.wandZeichnen', { storeyId: sid, a, b, assemblyId: aid });
    w({ x: 0, y: 0 }, { x: 6000, y: 0 });
    w({ x: 6000, y: 0 }, { x: 6000, y: 4000 });
    execute(doc, 'design.oeffnungSetzen', {
      wallId: doc.byKind('wall')[0]!.id, openingType: 'fenster', center: 3000, width: 1600, height: 1400, sill: 900,
    });

    const dxf = planToDxf(doc, sid);
    const zurueck = parseDxf(dxf);

    // Struktur: Poché-Ringe als Regionen, Symbole als Linien — nichts verloren.
    // Bemassungs-LINEs (v0.7.1 3A) zählen bewusst NICHT mit — sie werden
    // beim Import gefiltert (Bemassung ist Ableitung, kein Entity).
    const anzahlPolylines = (dxf.match(/0\nPOLYLINE\n/g) ?? []).length;
    const anzahlLines = (dxf.match(/0\nLINE\n8\n(?!BEMASSUNG\n)/g) ?? []).length;
    expect(zurueck.regions.length).toBe(anzahlPolylines);
    expect(zurueck.lines.length).toBe(anzahlLines);
    expect(zurueck.regions.length).toBeGreaterThan(0);
    expect(zurueck.bericht.layerUnklassiert).toEqual([]);
    expect(zurueck.bericht.unbekannteEntities).toEqual({});
    // Ein zweiter Export desselben Docs ist byte-identisch → der Parser hat
    // deterministisch gelesen (keine versteckte Mutation).
    expect(planToDxf(doc, sid)).toBe(dxf);
  });
});

describe('Toleranz gegen CAD-Praxis (nicht vom eigenen Export)', () => {
  const kopf = '0\nSECTION\n2\nENTITIES\n';
  const fuss = '0\nENDSEC\n0\nEOF\n';

  it('LWPOLYLINE (R2000) wird gelesen — geschlossen → Region', () => {
    const dxf = `${kopf}0\nLWPOLYLINE\n8\nA-WALL\n90\n3\n70\n1\n10\n0\n20\n0\n10\n1000\n20\n0\n10\n1000\n20\n-1000\n${fuss}`;
    const g = parseDxf(dxf);
    expect(g.regions.length).toBe(1);
    expect(g.regions[0]!.ring).toEqual([
      { x: 0, y: -0 },
      { x: 1000, y: -0 },
      { x: 1000, y: 1000 }, // weltY = -dxfY
    ]);
    expect(semantikFuerLayer(g.regions[0]!.layer)).toBe('tragend');
  });

  it('offene POLYLINE wird NICHT still geschlossen — Einzelsegmente', () => {
    const dxf = `${kopf}0\nPOLYLINE\n8\n0\n66\n1\n70\n0\n0\nVERTEX\n8\n0\n10\n0\n20\n0\n0\nVERTEX\n8\n0\n10\n500\n20\n0\n0\nVERTEX\n8\n0\n10\n500\n20\n500\n0\nSEQEND\n8\n0\n${fuss}`;
    const g = parseDxf(dxf);
    expect(g.regions.length).toBe(0);
    expect(g.lines.length).toBe(2);
  });

  it('INSERT + SPLINE + fremder Layer landen ehrlich im Bericht', () => {
    const dxf = `${kopf}0\nINSERT\n8\nMOEBEL-BLOCK\n2\nSTUHL\n10\n0\n20\n0\n0\nSPLINE\n8\nFREIFORM\n0\nLINE\n8\n200_ELEKTRO\n10\n0\n20\n0\n11\n100\n21\n0\n${fuss}`;
    const g = parseDxf(dxf);
    expect(g.bericht.bloeckeNichtAufgeloest).toBe(1);
    expect(g.bericht.unbekannteEntities).toEqual({ SPLINE: 1 });
    expect(g.bericht.layerUnklassiert).toEqual(expect.arrayContaining(['200_ELEKTRO', 'FREIFORM', 'MOEBEL-BLOCK']));
    expect(g.lines.length).toBe(1); // die LINE wurde trotzdem gelesen
  });

  it('strukturell unlesbares DXF wirft (kein Halbergebnis)', () => {
    expect(() => parseDxf('kein\ndxf\nGRUPPENCODE?\nx')).toThrow(/unlesbar/);
  });
});

describe('semantikFuerLayer (C-E2, Daten-Tabelle)', () => {
  it('kennt die eigenen Export-Layer und übliche Fremd-Konventionen', () => {
    expect(semantikFuerLayer('TRAGEND')).toBe('tragend');
    expect(semantikFuerLayer('A-WALL-FULL')).toBe('tragend');
    expect(semantikFuerLayer('MAUERWERK')).toBe('tragend');
    expect(semantikFuerLayer('DURCHBRUCH-HLKS')).toBe('aussparung');
    expect(semantikFuerLayer('IRGENDWAS-EXOTISCHES')).toBeNull();
  });
});
