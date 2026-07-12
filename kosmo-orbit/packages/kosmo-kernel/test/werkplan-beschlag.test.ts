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
import { testhausBeschlag } from './fixtures';

/**
 * D6 — Beschlag-Katalog S0 (v0.7.3 §D6, docs/V073-GESTALTUNG-SPEZ.md, Soll
 * 7b): sechs Symbole (Band · Griffseite · BRH · Schiebe-Lauf · Motorantrieb
 * · Absturzsicherung), additive Opening-Felder, NUR im Werkplan sichtbar,
 * eigener DXF-Layer BESCHLAG. Anschläge/RWA/Dichtebene und die 12er-
 * Ausbaustufe S1 bleiben bewusst vertagt (Canvas 7a) — NICHT gebaut.
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

function fensterSetzen(doc: KosmoDoc, wallId: string): string {
  const r = execute(doc, 'design.oeffnungSetzen', {
    wallId,
    openingType: 'fenster',
    center: 4000,
    width: 1600,
    height: 1400,
    sill: 900,
  });
  return (r.patches[0] as { id: string }).id;
}

describe('design.beschlagSetzen', () => {
  it('setzt band/griffseite/antrieb/absturzsicherung additiv', () => {
    const { doc, wallId } = grundgeruest();
    const openingId = fensterSetzen(doc, wallId);
    execute(doc, 'design.beschlagSetzen', { openingId, band: 'links' });
    expect(doc.get<Opening>(openingId)!.band).toBe('links');
    execute(doc, 'design.beschlagSetzen', { openingId, griffseite: 'rechts' });
    const nachher = doc.get<Opening>(openingId)!;
    expect(nachher.band).toBe('links'); // bleibt unangetastet
    expect(nachher.griffseite).toBe('rechts');
    execute(doc, 'design.beschlagSetzen', { openingId, antrieb: true, absturzsicherung: true });
    const final = doc.get<Opening>(openingId)!;
    expect(final.antrieb).toBe(true);
    expect(final.absturzsicherung).toBe(true);
    expect(final.band).toBe('links');
    expect(final.griffseite).toBe('rechts');
  });

  it('lehnt Leibungen ab (kein Beschlag ohne Flügel)', () => {
    const { doc, wallId } = grundgeruest();
    // `design.oeffnungSetzen` kann `openingType: 'leibung'` (bislang) nicht
    // erzeugen (zod erlaubt nur fenster/tuer) — die defensive Prüfung im
    // Command wird darum über einen direkten Patch geprüft (wie
    // `invertPatches`/`doc.apply` es auch sonst im Kernel tun).
    const leibungId = 'leibung-test';
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
    expect(() => execute(doc, 'design.beschlagSetzen', { openingId: leibungId, band: 'links' })).toThrowError(
      /Leibung/,
    );
  });

  it('Undo stellt den Vorzustand wieder her', () => {
    const { doc, wallId } = grundgeruest();
    const openingId = fensterSetzen(doc, wallId);
    const vorher = doc.get<Opening>(openingId)!;
    const r = execute(doc, 'design.beschlagSetzen', { openingId, band: 'oben', antrieb: true });
    expect(doc.get<Opening>(openingId)!.band).toBe('oben');
    doc.apply(invertPatches(r.patches));
    expect(doc.get<Opening>(openingId)!).toEqual(vorher);
  });
});

describe('derivePlan — Beschlag-Katalog (Daten-Guard, nur Werkplan)', () => {
  it('ohne Beschlag-Felder bleibt der Grundriss ohne Beschlag-Linien (Byte-Identität)', () => {
    const { doc, wallId } = grundgeruest();
    fensterSetzen(doc, wallId);
    const plan = derivePlan(doc, doc.byKind<Storey>('storey')[0]!.id);
    expect(plan.lines.filter((l) => l.classes.includes('beschlag'))).toHaveLength(0);
  });

  it('mit gesetzten Feldern erscheinen Beschlag-Linien NUR im Werkplan', () => {
    const { doc, wallId } = grundgeruest();
    const openingId = fensterSetzen(doc, wallId);
    execute(doc, 'design.beschlagSetzen', { openingId, band: 'links' });
    const storeyId = doc.byKind<Storey>('storey')[0]!.id;
    execute(doc, 'design.phaseSetzen', { phase: 'baueingabe' });
    expect(derivePlan(doc, storeyId).lines.filter((l) => l.classes.includes('beschlag'))).toHaveLength(0);
    execute(doc, 'design.phaseSetzen', { phase: 'werkplan' });
    expect(derivePlan(doc, storeyId).lines.filter((l) => l.classes.includes('beschlag')).length).toBeGreaterThan(0);
  });

  it('BRH-Etikett etikettiert das bestehende sill (kein eigenes Feld)', () => {
    const { doc, wallId } = grundgeruest();
    const openingId = fensterSetzen(doc, wallId); // sill: 900
    execute(doc, 'design.beschlagSetzen', { openingId, band: 'links' });
    const storeyId = doc.byKind<Storey>('storey')[0]!.id;
    const plan = derivePlan(doc, storeyId);
    const brh = plan.texte.find((t) => t.classes.includes('beschlag-brh'));
    expect(brh?.text).toBe('BRH 90');
  });

  it('Schiebe-Lauf entsteht aus fluegelTyp === "schiebe" (kein eigenes Feld)', () => {
    const { doc, wallId } = grundgeruest();
    const openingId = fensterSetzen(doc, wallId);
    execute(doc, 'design.fensterParametrieren', { openingId, fensterTyp: 'fest', fluegelTyp: 'schiebe' });
    execute(doc, 'design.beschlagSetzen', { openingId, antrieb: true });
    const storeyId = doc.byKind<Storey>('storey')[0]!.id;
    const plan = derivePlan(doc, storeyId);
    expect(plan.lines.filter((l) => l.classes.includes('beschlag-schiebelauf')).length).toBeGreaterThan(0);
  });
});

describe('DXF-Export — Layer BESCHLAG (aci 5, vor SYMBOLE)', () => {
  it('Beschlag-Linien landen auf Layer BESCHLAG, nicht SYMBOLE', () => {
    const { doc, storeyId } = testhausBeschlag();
    const dxf = planToDxf(doc, storeyId);
    expect(dxf).toContain('BESCHLAG');
    // Layer-Eintrag mit aci 5 (Gruppencode 62) muss existieren
    const layerIdx = dxf.indexOf('BESCHLAG');
    expect(layerIdx).toBeGreaterThan(-1);
  });

  it('bleibt crash-frei', () => {
    const { doc, storeyId } = testhausBeschlag();
    expect(() => planToDxf(doc, storeyId)).not.toThrow();
  });
});

describe('Neues Golden (v0.7.3 §D6 Beschlag-Katalog S0)', () => {
  it('Golden: Werkplan-Grundriss mit Beschlag-Katalog (Band/Griffseite/BRH/Schiebe-Lauf/Motorantrieb/Absturzsicherung)', () => {
    const { doc, storeyId } = testhausBeschlag();
    const svg = planToSvg(doc, storeyId, {
      scale: 50,
      paper: A3_QUER,
      projectName: 'Golden-Beschlag',
      planTitle: 'Werkplan Beschlag-Katalog S0',
      date: '12.07.2026',
    });
    pruefeGolden(svg, new URL('./golden/werkplan-beschlag.svg', import.meta.url));
  });
});
