import { describe, expect, it } from 'vitest';
import { KosmoDoc, execute } from '@kosmo/kernel';
import { distToSegment, outlineOf, pickEntityAt, pointInPolygon, VERSCHIEBBAR } from '../src/modules/design/plan-hit-test';

/**
 * plan-hit-test.ts trägt die reine Geometrie hinter «Anwählen» und «Ziehen»
 * im 2D-Plan (T1) — unabhängig von derivePlan/den Poché-Regionen, damit die
 * Golden-SVGs unberührt bleiben. Dieser Test deckt die Trefferzonen und den
 * Anzeige-Umriss je Bauteilart ab.
 */

function setupDoc() {
  const doc = new KosmoDoc();
  const storeyId = (execute(doc, 'design.geschossErstellen', {
    name: 'EG',
    index: 0,
    elevation: 0,
    height: 3000,
  }).patches[0] as { id: string }).id;
  const assemblyId = (execute(doc, 'design.aufbauErstellen', {
    name: 'AW',
    target: 'wall',
    layers: [{ material: 'beton', thickness: 200, function: 'tragend' }],
  }).patches[0] as { id: string }).id;
  const wallId = (execute(doc, 'design.wandZeichnen', {
    storeyId,
    a: { x: 0, y: 0 },
    b: { x: 6000, y: 0 },
    assemblyId,
  }).patches[0] as { id: string }).id;
  const columnId = (execute(doc, 'design.stuetzeSetzen', {
    storeyId,
    at: { x: 3000, y: 3000 },
    profil: 'rechteck',
    b: 400,
  }).patches[0] as { id: string }).id;
  const stairId = (execute(doc, 'design.treppeErstellen', {
    storeyId,
    a: { x: 0, y: 5000 },
    b: { x: 0, y: 8000 },
    width: 1200,
  }).patches[0] as { id: string }).id;
  const zoneId = (execute(doc, 'design.zoneErstellen', {
    storeyId,
    outline: [
      { x: 2000, y: 2000 },
      { x: 8000, y: 2000 },
      { x: 8000, y: 8000 },
      { x: 2000, y: 8000 },
    ],
    name: 'Raum 1',
    sia: 'HNF',
  }).patches[0] as { id: string }).id;
  return { doc, storeyId, wallId, columnId, stairId, zoneId };
}

describe('pointInPolygon / distToSegment', () => {
  it('erkennt innen/aussen eines einfachen Rechtecks', () => {
    const quadrat = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 100 },
      { x: 0, y: 100 },
    ];
    expect(pointInPolygon(quadrat, { x: 50, y: 50 })).toBe(true);
    expect(pointInPolygon(quadrat, { x: 150, y: 50 })).toBe(false);
  });

  it('misst die kürzeste Distanz zu einem Segment', () => {
    expect(distToSegment({ x: 50, y: 10 }, { x: 0, y: 0 }, { x: 100, y: 0 })).toBe(10);
    // ausserhalb des Segments: Distanz zum nächsten Endpunkt
    expect(distToSegment({ x: 150, y: 0 }, { x: 0, y: 0 }, { x: 100, y: 0 })).toBe(50);
  });
});

describe('pickEntityAt — Trefferzonen im Grundriss (T1: Anwählen)', () => {
  it('trifft eine Wand entlang der Achse innerhalb der halben Dicke + Toleranz', () => {
    const { doc, storeyId, wallId } = setupDoc();
    expect(pickEntityAt(doc, storeyId, { x: 3000, y: 0 })).toBe(wallId);
    expect(pickEntityAt(doc, storeyId, { x: 3000, y: 90 })).toBe(wallId); // halbe Dicke 100 + Toleranz
    expect(pickEntityAt(doc, storeyId, { x: 3000, y: 400 })).toBeNull();
  });

  it('trifft eine Stütze auf ihrem (ggf. gedrehten) Profil', () => {
    const { doc, storeyId, columnId } = setupDoc();
    expect(pickEntityAt(doc, storeyId, { x: 3000, y: 3000 })).toBe(columnId);
    expect(pickEntityAt(doc, storeyId, { x: 3190, y: 3000 })).toBe(columnId); // b=400 → halbe Breite 200
    expect(pickEntityAt(doc, storeyId, { x: 4000, y: 3000 })).not.toBe(columnId);
  });

  it('trifft eine Treppe entlang der Lauflinie innerhalb der halben Breite', () => {
    const { doc, storeyId, stairId } = setupDoc();
    expect(pickEntityAt(doc, storeyId, { x: 0, y: 6500 })).toBe(stairId);
    expect(pickEntityAt(doc, storeyId, { x: 590, y: 6500 })).toBe(stairId); // width 1200 → halbe 600
  });

  it('trifft eine Zone per Punkt-in-Polygon, aber erst hinter Wand/Stütze/Treppe', () => {
    const { doc, storeyId, zoneId, wallId } = setupDoc();
    expect(pickEntityAt(doc, storeyId, { x: 5000, y: 5000 })).toBe(zoneId);
    // Die Wand liegt ausserhalb der Zone (y=0 < 2000) — kein Widerspruch, separater Fall:
    expect(pickEntityAt(doc, storeyId, { x: 3000, y: 0 })).toBe(wallId);
  });

  it('liefert null, wenn nichts getroffen wird', () => {
    const { doc, storeyId } = setupDoc();
    expect(pickEntityAt(doc, storeyId, { x: -5000, y: -5000 })).toBeNull();
  });
});

describe('outlineOf — Anzeige-Umriss für Auswahl-Highlight/Zieh-Vorschau', () => {
  it('liefert für die Wand ein Rechteck um die Achse (Wanddicke)', () => {
    const { doc, wallId } = setupDoc();
    const outline = outlineOf(doc, wallId)!;
    expect(outline).not.toBeNull();
    const ys = outline.map((p) => p.y);
    expect(Math.max(...ys) - Math.min(...ys)).toBe(200); // Aufbau-Dicke
  });

  it('liefert für die Zone ihren eigenen Umriss', () => {
    const { doc, zoneId } = setupDoc();
    const outline = outlineOf(doc, zoneId)!;
    expect(outline).toEqual([
      { x: 2000, y: 2000 },
      { x: 8000, y: 2000 },
      { x: 8000, y: 8000 },
      { x: 2000, y: 8000 },
    ]);
  });

  it('liefert für die Stütze ihr Profil-Polygon', () => {
    const { doc, columnId } = setupDoc();
    const outline = outlineOf(doc, columnId)!;
    expect(outline).toHaveLength(4); // rechteckiges Profil
  });

  it('liefert null für eine unbekannte Id', () => {
    const { doc } = setupDoc();
    expect(outlineOf(doc, 'nichts-da')).toBeNull();
  });
});

describe('VERSCHIEBBAR — Deckung mit design.verschieben (Kernel)', () => {
  it('enthält genau die vom Kernel-Command unterstützten Bauteilarten', () => {
    for (const kind of ['wall', 'slab', 'mass', 'zone', 'column', 'stair', 'roof']) {
      expect(VERSCHIEBBAR.has(kind)).toBe(true);
    }
    expect(VERSCHIEBBAR.has('storey')).toBe(false);
  });

  it('design.verschieben verschiebt eine Stütze und eine Treppe (Kernel-Erweiterung)', () => {
    const { doc, columnId, stairId } = setupDoc();
    execute(doc, 'design.verschieben', { entityId: columnId, dx: 100, dy: -50 });
    const column = doc.get(columnId) as { at: { x: number; y: number } };
    expect(column.at).toEqual({ x: 3100, y: 2950 });

    execute(doc, 'design.verschieben', { entityId: stairId, dx: 100, dy: -50 });
    const stair = doc.get(stairId) as { a: { x: number; y: number }; b: { x: number; y: number } };
    expect(stair.a).toEqual({ x: 100, y: 4950 });
    expect(stair.b).toEqual({ x: 100, y: 7950 });
  });
});
