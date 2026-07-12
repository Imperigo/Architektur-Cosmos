import { describe, expect, it } from 'vitest';
import { pruefeGolden } from './golden-helfer';
import { KosmoDoc, invertPatches } from '../src/model/doc';
import { execute } from '../src/commands/core';
import '../src/commands/design';
import '../src/commands/publish';
import type { Opening, Storey } from '../src/model/entities';
import { derivePlan } from '../src/derive/plan';
import { planToSvg, A3_QUER } from '../src/derive/plansvg';
import { planToDxf } from '../src/dxf/export';
import { exportIfc } from '../src/ifc/export';
import { testhausBeschlagS2 } from './fixtures';

/**
 * Beschlag-Katalog S2 (v0.7.5 Welle 1 A1): Beschläge einer Öffnung zuweisen
 * (`design.beschlaegeSetzen`, additives Feld `Opening.beschlaege`, KEINE
 * eigene Entity — opening-gehostet), Werkplan-Piktogramme (Pfad B,
 * `derive/plansvg.ts`) + DXF-Text auf Layer BESCHLAG (Pfad A,
 * `derive/plan.ts`) + je Beschlag ein `IFCDISCRETEACCESSORY` (`ifc/
 * export.ts`) + Inspector-Mehrfachauswahl aus BESCHLAG_KATALOG.
 */

function grundgeruest(): { doc: KosmoDoc; storeyId: string; wallId: string } {
  const doc = new KosmoDoc();
  const eg = execute(doc, 'design.geschossErstellen', { name: 'EG', index: 0, elevation: 0, height: 3000 });
  const storeyId = (eg.patches[0] as { id: string }).id;
  const aufbau = execute(doc, 'design.aufbauErstellen', {
    name: 'AW Beton 36',
    target: 'wall',
    layers: [
      { material: 'beton', thickness: 250, function: 'tragend' },
      { material: 'daemmung', thickness: 160, function: 'daemmung' },
    ],
  });
  const assemblyId = (aufbau.patches[0] as { id: string }).id;
  const wand = execute(doc, 'design.wandZeichnen', { storeyId, a: { x: 0, y: 0 }, b: { x: 8000, y: 0 }, assemblyId });
  return { doc, storeyId, wallId: (wand.patches[0] as { id: string }).id };
}

function tuerSetzen(doc: KosmoDoc, wallId: string): string {
  const r = execute(doc, 'design.oeffnungSetzen', {
    wallId,
    openingType: 'tuer',
    center: 4000,
    width: 1000,
    height: 2100,
    sill: 0,
  });
  return (r.patches[0] as { id: string }).id;
}

describe('design.beschlaegeSetzen', () => {
  it('setzt/überschreibt additiv (volle Liste ersetzt die vorherige) + Undo', () => {
    const { doc, wallId } = grundgeruest();
    const openingId = tuerSetzen(doc, wallId);
    execute(doc, 'design.beschlaegeSetzen', { openingId, beschlaege: ['tuerdruecker-garnitur'] });
    expect(doc.get<Opening>(openingId)!.beschlaege).toEqual(['tuerdruecker-garnitur']);

    const r2 = execute(doc, 'design.beschlaegeSetzen', {
      openingId,
      beschlaege: ['tuerband-scharnier', 'einsteckschloss'],
    });
    expect(doc.get<Opening>(openingId)!.beschlaege).toEqual(['tuerband-scharnier', 'einsteckschloss']);

    doc.apply(invertPatches(r2.patches));
    expect(doc.get<Opening>(openingId)!.beschlaege).toEqual(['tuerdruecker-garnitur']);
  });

  it('leere Liste entfernt die Zuweisung (kein beschlaege-Feld mehr)', () => {
    const { doc, wallId } = grundgeruest();
    const openingId = tuerSetzen(doc, wallId);
    execute(doc, 'design.beschlaegeSetzen', { openingId, beschlaege: ['profilzylinder'] });
    execute(doc, 'design.beschlaegeSetzen', { openingId, beschlaege: [] });
    expect(doc.get<Opening>(openingId)!.beschlaege).toBeUndefined();
  });

  it('wirft bei unbekanntem Katalog-Key', () => {
    const { doc, wallId } = grundgeruest();
    const openingId = tuerSetzen(doc, wallId);
    expect(() =>
      execute(doc, 'design.beschlaegeSetzen', { openingId, beschlaege: ['nicht-im-katalog'] }),
    ).toThrowError(/Unbekannter Beschlag-Katalog-Key/);
    // Die ungültige Zuweisung darf nicht teilweise durchgeschlagen sein.
    expect(doc.get<Opening>(openingId)!.beschlaege).toBeUndefined();
  });

  it('lehnt Leibungen ab (kein Beschlag ohne Flügel)', () => {
    const { doc, wallId } = grundgeruest();
    const leibungId = 'leibung-test-s2';
    const leibung: Opening = {
      id: leibungId,
      kind: 'opening',
      wallId,
      openingType: 'leibung',
      center: 2000,
      width: 900,
      height: 2100,
      sill: 0,
    };
    doc.apply([{ id: leibungId, before: null, after: leibung }]);
    expect(() =>
      execute(doc, 'design.beschlaegeSetzen', { openingId: leibungId, beschlaege: ['tuerdruecker-garnitur'] }),
    ).toThrowError(/Leibung/);
  });
});

describe('derivePlan — Beschlag-Katalog S2 (Daten-Guard, DXF-Text-Pfad)', () => {
  it('ohne beschlaege bleibt der Grundriss ohne beschlag-s2-Text (Byte-Identität)', () => {
    const { doc, wallId } = grundgeruest();
    tuerSetzen(doc, wallId);
    const plan = derivePlan(doc, doc.byKind<Storey>('storey')[0]!.id);
    expect(plan.texte.filter((t) => t.classes.includes('beschlag-s2'))).toHaveLength(0);
  });

  it('mit beschlaege erscheint GENAU EIN Text-Primitive (Klasse beschlag-s2) mit den Namen', () => {
    const { doc, wallId } = grundgeruest();
    const openingId = tuerSetzen(doc, wallId);
    execute(doc, 'design.beschlaegeSetzen', {
      openingId,
      beschlaege: ['tuerdruecker-garnitur', 'einsteckschloss'],
    });
    const storeyId = doc.byKind<Storey>('storey')[0]!.id;
    const plan = derivePlan(doc, storeyId);
    const texte = plan.texte.filter((t) => t.classes.includes('beschlag-s2'));
    expect(texte).toHaveLength(1);
    expect(texte[0]!.text).toBe('Türdrücker (Garnitur) · Einsteckschloss');
    expect(texte[0]!.classes).toEqual(expect.arrayContaining(['symbol', 'beschlag']));
  });

  it('S2-Text erscheint NUR im Werkplan (wie das gesamte Beschlag-Katalog)', () => {
    const { doc, wallId } = grundgeruest();
    const openingId = tuerSetzen(doc, wallId);
    execute(doc, 'design.beschlaegeSetzen', { openingId, beschlaege: ['profilzylinder'] });
    const storeyId = doc.byKind<Storey>('storey')[0]!.id;
    execute(doc, 'design.phaseSetzen', { phase: 'baueingabe' });
    expect(derivePlan(doc, storeyId).texte.filter((t) => t.classes.includes('beschlag-s2'))).toHaveLength(0);
    execute(doc, 'design.phaseSetzen', { phase: 'werkplan' });
    expect(derivePlan(doc, storeyId).texte.filter((t) => t.classes.includes('beschlag-s2')).length).toBe(1);
  });

  it('bestehender S0-Beschlag-Katalog bleibt unberührt, wenn nur beschlaege gesetzt ist', () => {
    const { doc, wallId } = grundgeruest();
    const openingId = tuerSetzen(doc, wallId);
    execute(doc, 'design.beschlaegeSetzen', { openingId, beschlaege: ['tuerband-scharnier'] });
    const storeyId = doc.byKind<Storey>('storey')[0]!.id;
    const plan = derivePlan(doc, storeyId);
    expect(plan.lines.filter((l) => l.classes.includes('beschlag'))).toHaveLength(0);
  });
});

describe('IFC-Export — IFCDISCRETEACCESSORY je zugewiesenem Beschlag', () => {
  it('N zugewiesene Beschläge → N IFCDISCRETEACCESSORY-Elemente', () => {
    const { doc } = testhausBeschlagS2();
    const ifc = exportIfc(doc);
    const treffer = ifc.match(/IFCDISCRETEACCESSORY/g) ?? [];
    // 3 Beschläge an der ersten Tür, 0 an der zweiten (Guard-Beweis).
    expect(treffer.length).toBe(3);
  });

  it('ohne beschlaege entstehen keine IFCDISCRETEACCESSORY-Elemente', () => {
    const { doc, wallId } = grundgeruest();
    tuerSetzen(doc, wallId);
    const ifc = exportIfc(doc);
    expect(ifc).not.toContain('IFCDISCRETEACCESSORY');
  });
});

describe('DXF-Export — Beschlag-Katalog S2 bleibt crash-frei, Layer BESCHLAG vorhanden', () => {
  it('bleibt crash-frei und enthält den bestehenden Layer BESCHLAG', () => {
    const { doc, storeyId } = testhausBeschlagS2();
    expect(() => planToDxf(doc, storeyId)).not.toThrow();
    const dxf = planToDxf(doc, storeyId);
    expect(dxf).toContain('BESCHLAG');
  });
});

describe('Neues Golden (v0.7.5 Welle 1 A1 Beschlag-Katalog S2)', () => {
  it('Golden: Werkplan-Grundriss mit Beschlag-Katalog S2 (Piktogramme + Text, eine Tür ohne Zuweisung als Guard-Beweis)', () => {
    const { doc, storeyId } = testhausBeschlagS2();
    const svg = planToSvg(doc, storeyId, {
      scale: 50,
      paper: A3_QUER,
      projectName: 'Golden-Beschlag-S2',
      planTitle: 'Werkplan Beschlag-Katalog S2',
      date: '12.07.2026',
    });
    pruefeGolden(svg, new URL('./golden/werkplan-beschlag-s2.svg', import.meta.url));
  });
});
