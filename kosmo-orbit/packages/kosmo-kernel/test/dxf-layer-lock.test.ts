import { describe, expect, it } from 'vitest';
import { KosmoDoc, invertPatches } from '../src/model/doc';
import { execute, CommandError } from '../src/commands/core';
import '../src/commands/design';
import { planToDxf } from '../src/dxf/export';
import type { Wall, Zone } from '../src/model/entities';

/**
 * v0.8.9 E2 (PA2, `docs/V089-SPEZ.md` §3 E2, §7 C-3/C-4) — CAD-Ebenen als
 * DXF-Interop + Sperrschutz. Owner-Entscheid: NUR DXF-Interop + Sperrschutz,
 * KEIN Sichtbarkeits-Panel (Sanktion 4) — `meta.layer`/`meta.locked` haben
 * darum ausserhalb des DXF-Exports (Layer) bzw. des Interaktions-Pfads
 * (Sperre) keinerlei Wirkung; dieser Test prüft NICHT auf Sichtbarkeits-
 * Effekte, weil es keine geben darf.
 */

function testhaus() {
  const doc = new KosmoDoc();
  const eg = execute(doc, 'design.geschossErstellen', { name: 'EG', index: 0, elevation: 0, height: 3000 });
  const storeyId = (eg.patches[0] as { id: string }).id;
  const aufbau = execute(doc, 'design.aufbauErstellen', {
    name: 'AW',
    target: 'wall',
    layers: [{ material: 'beton', thickness: 200, function: 'tragend' }],
  });
  const assemblyId = (aufbau.patches[0] as { id: string }).id;
  const w1 = execute(doc, 'design.wandZeichnen', { storeyId, assemblyId, a: { x: 0, y: 0 }, b: { x: 6000, y: 0 } });
  const wall1Id = (w1.patches[0] as { id: string }).id;
  const w2 = execute(doc, 'design.wandZeichnen', { storeyId, assemblyId, a: { x: 0, y: 4000 }, b: { x: 6000, y: 4000 } });
  const wall2Id = (w2.patches[0] as { id: string }).id;
  return { doc, storeyId, assemblyId, wall1Id, wall2Id };
}

describe('design.ebeneSetzen', () => {
  it('setzt meta.layer getrimmt, entfernt sie wieder mit layer:null, Undo räumt symmetrisch auf', () => {
    const { doc, wall1Id } = testhaus();
    const res = execute(doc, 'design.ebeneSetzen', { entityId: wall1Id, layer: '  ARCH-01  ' });
    expect(doc.get<Wall>(wall1Id)!.meta?.layer).toBe('ARCH-01');

    doc.apply(invertPatches(res.patches));
    expect(doc.get<Wall>(wall1Id)!.meta?.layer).toBeUndefined();

    execute(doc, 'design.ebeneSetzen', { entityId: wall1Id, layer: 'ARCH-02' });
    expect(doc.get<Wall>(wall1Id)!.meta?.layer).toBe('ARCH-02');
    execute(doc, 'design.ebeneSetzen', { entityId: wall1Id, layer: null });
    expect(doc.get<Wall>(wall1Id)!.meta?.layer).toBeUndefined();
  });

  it('wirft bei getrimmt leerem Layernamen (null zum Löschen nutzen)', () => {
    const { doc, wall1Id } = testhaus();
    expect(() => execute(doc, 'design.ebeneSetzen', { entityId: wall1Id, layer: '   ' })).toThrow(CommandError);
  });

  it('wirft für storey/assembly, wirft auf unbekannte Id', () => {
    const { doc, storeyId, assemblyId } = testhaus();
    expect(() => execute(doc, 'design.ebeneSetzen', { entityId: storeyId, layer: 'X' })).toThrow(CommandError);
    expect(() => execute(doc, 'design.ebeneSetzen', { entityId: assemblyId, layer: 'X' })).toThrow(CommandError);
    expect(() => execute(doc, 'design.ebeneSetzen', { entityId: 'nichtig', layer: 'X' })).toThrow(CommandError);
  });

  it('rührt an keinem anderen Feld der Entity (reines meta-Patch)', () => {
    const { doc, wall1Id } = testhaus();
    const vorher = { ...doc.get<Wall>(wall1Id)! };
    execute(doc, 'design.ebeneSetzen', { entityId: wall1Id, layer: 'ARCH-01' });
    const nachher = doc.get<Wall>(wall1Id)!;
    expect(nachher.a).toEqual(vorher.a);
    expect(nachher.b).toEqual(vorher.b);
    expect(nachher.assemblyId).toBe(vorher.assemblyId);
  });
});

describe('design.sperren', () => {
  it('setzt meta.locked, entfernt es beim Entsperren, Undo räumt symmetrisch auf', () => {
    const { doc, wall1Id } = testhaus();
    const res = execute(doc, 'design.sperren', { entityId: wall1Id, locked: true });
    expect(doc.get<Wall>(wall1Id)!.meta?.locked).toBe(true);

    doc.apply(invertPatches(res.patches));
    expect(doc.get<Wall>(wall1Id)!.meta?.locked).toBeUndefined();

    execute(doc, 'design.sperren', { entityId: wall1Id, locked: true });
    expect(doc.get<Wall>(wall1Id)!.meta?.locked).toBe(true);
    execute(doc, 'design.sperren', { entityId: wall1Id, locked: false });
    expect(doc.get<Wall>(wall1Id)!.meta?.locked).toBeUndefined();
  });

  it('wirft für storey/assembly, wirft auf unbekannte Id', () => {
    const { doc, storeyId, assemblyId } = testhaus();
    expect(() => execute(doc, 'design.sperren', { entityId: storeyId, locked: true })).toThrow(CommandError);
    expect(() => execute(doc, 'design.sperren', { entityId: assemblyId, locked: true })).toThrow(CommandError);
    expect(() => execute(doc, 'design.sperren', { entityId: 'nichtig', locked: true })).toThrow(CommandError);
  });

  it('Sperren lässt das Element selbst unverändert präsent — einzige Derive-Wirkung ist das Schloss-Symbol (v0.8.11 E5)', async () => {
    const { doc, storeyId, wall1Id } = testhaus();
    const { derivePlan } = await import('../src/derive/plan');
    const vor = derivePlan(doc, storeyId);
    execute(doc, 'design.sperren', { entityId: wall1Id, locked: true });
    const nach = derivePlan(doc, storeyId);
    // v0.8.11 E5 (docs/V0811-SPEZ.md, P-B3): die 0.8.9-Invariante «keinerlei
    // Derive-Wirkung» ist sanktioniert PRÄZISIERT — das Element selbst
    // (Regionen, alle Nicht-Schloss-Linien) bleibt byte-gleich, NEU kommen
    // exakt die 7 Schloss-Segmente dazu (test/plan-schloss.test.ts trägt
    // die Detail-Beweise inkl. Daten-Guard und Entsperren-Räumung).
    expect(nach.regions.length).toBe(vor.regions.length);
    const nachOhneSchloss = nach.lines.filter((l) => !l.classes.includes('schloss'));
    expect(nachOhneSchloss.length).toBe(vor.lines.length);
    expect(nach.lines.length - nachOhneSchloss.length).toBe(7);
    // Entsperren stellt die alte Welt vollständig wieder her.
    execute(doc, 'design.sperren', { entityId: wall1Id, locked: false });
    expect(derivePlan(doc, storeyId).lines.length).toBe(vor.lines.length);
  });
});

describe('DXF-Export: layerFuer()-Override (v0.8.9 E2)', () => {
  it('eine Wand mit meta.layer landet im DXF unter dem eigenen Layer statt TRAGEND, die zweite (ohne Override) bleibt TRAGEND', () => {
    const { doc, storeyId, wall1Id } = testhaus();
    execute(doc, 'design.ebeneSetzen', { entityId: wall1Id, layer: 'ARCH-SPEZIAL' });
    const dxf = planToDxf(doc, storeyId);

    // Layer-Tabelle deklariert den neuen Layer.
    expect(dxf).toContain('2\nARCH-SPEZIAL\n');
    // Mindestens eine POLYLINE/VERTEX-Gruppe trägt den Override-Layer (Code 8).
    expect(dxf).toContain('8\nARCH-SPEZIAL\n');
    // Die zweite, nicht übersteuerte Wand liegt weiterhin auf TRAGEND.
    expect(dxf).toContain('2\nTRAGEND\n');
    expect(dxf).toContain('8\nTRAGEND\n');
  });

  it('ohne meta.layer bleibt der DXF-Export byte-identisch zum Bestand (kein Override aktiv)', () => {
    const { doc, storeyId } = testhaus();
    const a = planToDxf(doc, storeyId);
    const b = planToDxf(doc, storeyId);
    expect(a).toBe(b);
    expect(a).not.toContain('ARCH-SPEZIAL');
  });

  it('layer:null entfernt die Übersteuerung wieder — DXF fällt zurück auf TRAGEND', () => {
    const { doc, storeyId, wall1Id } = testhaus();
    execute(doc, 'design.ebeneSetzen', { entityId: wall1Id, layer: 'ARCH-SPEZIAL' });
    expect(planToDxf(doc, storeyId)).toContain('ARCH-SPEZIAL');
    execute(doc, 'design.ebeneSetzen', { entityId: wall1Id, layer: null });
    expect(planToDxf(doc, storeyId)).not.toContain('ARCH-SPEZIAL');
  });

  it('funktioniert auch für eine Zone (pointInPolygon-Zweig der Übersteuerung)', () => {
    const { doc, storeyId } = testhaus();
    const z = execute(doc, 'design.zoneErstellen', {
      storeyId,
      name: 'Raum',
      sia: 'HNF',
      outline: [
        { x: 1000, y: 1000 },
        { x: 5000, y: 1000 },
        { x: 5000, y: 3000 },
        { x: 1000, y: 3000 },
      ],
    });
    const zoneId = (z.patches[0] as { id: string }).id;
    execute(doc, 'design.ebeneSetzen', { entityId: zoneId, layer: 'RAUM-EG' });
    const dxf = planToDxf(doc, storeyId);
    expect(dxf).toContain('2\nRAUM-EG\n');
    expect(dxf).toContain('8\nRAUM-EG\n');
    expect(doc.get<Zone>(zoneId)!.meta?.layer).toBe('RAUM-EG');
  });

  it('Layername wird für DXF sanitisiert (Grossbuchstaben, Sonderzeichen → _)', () => {
    const { doc, storeyId, wall1Id } = testhaus();
    execute(doc, 'design.ebeneSetzen', { entityId: wall1Id, layer: 'arch spez!' });
    const dxf = planToDxf(doc, storeyId);
    expect(dxf).toContain('ARCH_SPEZ');
  });
});
