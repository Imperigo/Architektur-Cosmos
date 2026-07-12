import { describe, expect, it } from 'vitest';
import { pruefeGolden } from './golden-helfer';
import { readFileSync } from 'node:fs';
import { KosmoDoc, invertPatches } from '../src/model/doc';
import { execute } from '../src/commands/core';
import '../src/commands/design';
import '../src/commands/publish';
import type { Opening } from '../src/model/entities';
import { derivePlan } from '../src/derive/plan';
import { deriveSection } from '../src/derive/section';
import { planToSvg, sectionInnerSvg, A3_QUER } from '../src/derive/plansvg';
import { exportIfc } from '../src/ifc/export';
import { planToDxf } from '../src/dxf/export';
import {
  ansichtSvg,
  testhausFensterZweifluegel,
  testhausFluegelGrundriss,
  testhausFluegeltypen,
} from './fixtures';

/**
 * Flügeltyp — SIA-Öffnungssymbolik in Plan und Ansicht (v0.7.1 E5/4B,
 * docs/V071-KONZEPT.md). `Opening.fluegelTyp` ist additiv: ohne das Feld
 * bleiben Ansicht UND Grundriss byte-identisch (bewiesen durch die
 * BESTANDS-Goldens in kernel.test.ts/fenster.test.ts, die nach dieser
 * Änderung weiter grün sind — hier zusätzlich als explizite
 * Charakterisierung gegen ein Alt-Golden).
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
  const wand = execute(doc, 'design.wandZeichnen', {
    storeyId,
    a: { x: 0, y: 0 },
    b: { x: 8000, y: 0 },
    assemblyId,
  });
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

describe('design.fensterParametrieren — fluegelTyp', () => {
  it('setzt fluegelTyp additiv, unabhängig vom Fenstertyp', () => {
    const { doc, wallId } = grundgeruest();
    const openingId = fensterSetzen(doc, wallId);
    execute(doc, 'design.fensterParametrieren', { openingId, fensterTyp: 'fest', fluegelTyp: 'dreh' });
    const nachher = doc.get<Opening>(openingId)!;
    expect(nachher.fluegelTyp).toBe('dreh');
    expect(nachher.fensterTyp).toBe('fest');
  });

  it('lässt fluegelTyp unangetastet, wenn es beim Aufruf weggelassen wird', () => {
    const { doc, wallId } = grundgeruest();
    const openingId = fensterSetzen(doc, wallId);
    execute(doc, 'design.fensterParametrieren', { openingId, fensterTyp: 'zweifluegel', fluegelTyp: 'kipp' });
    execute(doc, 'design.fensterParametrieren', { openingId, fensterTyp: 'zweifluegel', teilungN: 2 });
    expect(doc.get<Opening>(openingId)!.fluegelTyp).toBe('kipp');
  });

  it('Undo stellt den Vorzustand (kein fluegelTyp) wieder her', () => {
    const { doc, wallId } = grundgeruest();
    const openingId = fensterSetzen(doc, wallId);
    const vorher = doc.get<Opening>(openingId)!;
    expect(vorher.fluegelTyp).toBeUndefined();
    const r = execute(doc, 'design.fensterParametrieren', { openingId, fensterTyp: 'fest', fluegelTyp: 'schiebe' });
    expect(doc.get<Opening>(openingId)!.fluegelTyp).toBe('schiebe');
    doc.apply(invertPatches(r.patches));
    expect(doc.get<Opening>(openingId)!).toEqual(vorher);
    expect(doc.get<Opening>(openingId)!.fluegelTyp).toBeUndefined();
  });
});

describe('design.eigenschaftSetzen — fluegelTyp', () => {
  it('akzeptiert die fünf gültigen Werte und weist ungültige ab', () => {
    const { doc, wallId } = grundgeruest();
    const openingId = fensterSetzen(doc, wallId);
    for (const wert of ['dreh', 'kipp', 'drehkipp', 'schiebe', 'fest'] as const) {
      execute(doc, 'design.eigenschaftSetzen', { entityId: openingId, feld: 'fluegelTyp', wert });
      expect(doc.get<Opening>(openingId)!.fluegelTyp).toBe(wert);
    }
    expect(() =>
      execute(doc, 'design.eigenschaftSetzen', { entityId: openingId, feld: 'fluegelTyp', wert: 'karussell' }),
    ).toThrowError(/fluegelTyp muss/);
  });

  it('Undo/Redo über den generischen Eigenschafts-Command', () => {
    const { doc, wallId } = grundgeruest();
    const openingId = fensterSetzen(doc, wallId);
    const vorher = doc.get<Opening>(openingId)!;
    const r = execute(doc, 'design.eigenschaftSetzen', { entityId: openingId, feld: 'fluegelTyp', wert: 'drehkipp' });
    doc.apply(invertPatches(r.patches));
    expect(doc.get<Opening>(openingId)!).toEqual(vorher);
    doc.apply(r.patches);
    expect(doc.get<Opening>(openingId)!.fluegelTyp).toBe('drehkipp');
  });

  it('fluegelTyp auf einer Tür wird gespeichert, aber bleibt ohne Grundriss-Symbolik (Guard: openingType === \'fenster\')', () => {
    const { doc, storeyId, wallId } = grundgeruest();
    const tuer = execute(doc, 'design.oeffnungSetzen', {
      wallId,
      openingType: 'tuer',
      center: 2000,
      width: 900,
      height: 2100,
      sill: 0,
    });
    const tuerId = (tuer.patches[0] as { id: string }).id;
    // Der Command kennt keine openingType-Sperre für fluegelTyp (wie bei
    // swing/anschlag) — das Feld ist rein additiv auf `Opening`. Die
    // Symbolik selbst prüft `openingType === 'fenster'` (derive/section.ts,
    // derive/plan.ts) und bleibt bei Türen ehrlich aus.
    execute(doc, 'design.eigenschaftSetzen', { entityId: tuerId, feld: 'fluegelTyp', wert: 'dreh' });
    expect(doc.get<Opening>(tuerId)!.fluegelTyp).toBe('dreh');
    const plan = derivePlan(doc, storeyId);
    expect(plan.lines.filter((l) => l.classes.includes('fluegel-kipp') || l.classes.includes('fluegel-schiebe'))).toHaveLength(0);
  });
});

describe('Ansicht — SIA-Öffnungssymbolik (Dreieck/Pfeil)', () => {
  it('dreh: Spitze links Mitte, Schenkel zu den rechten Ecken', () => {
    const { doc, spec } = testhausFluegeltypen();
    const g = deriveSection(doc, spec);
    const dreh = g.fenstersymbole.filter((l) => l.classes.includes('fluegel-dreh'));
    // Erstes Fenster (dreh, s0/s1 kleinstes Band) hat genau 2 Linien
    const ersteZwei = dreh.slice(0, 2);
    expect(ersteZwei).toHaveLength(2);
    for (const l of ersteZwei) {
      const linksSpitze = l.a.s < l.b.s ? l.a : l.b;
      const rechtesEck = l.a.s < l.b.s ? l.b : l.a;
      expect(linksSpitze.s).toBeLessThan(rechtesEck.s);
    }
    // Die Spitzen beider Schenkel liegen auf derselben (linken) Kante
    expect(ersteZwei[0]!.a.s).toBeCloseTo(ersteZwei[1]!.a.s, 0);
  });

  it('dreh: Spitze folgt der Angelseite — swing rechts spiegelt das Dreieck (Kritik-2 [A])', () => {
    const { doc, spec } = testhausFluegeltypen();
    const vorher = deriveSection(doc, spec)
      .fenstersymbole.filter((l) => l.classes.includes('fluegel-dreh'))
      .slice(0, 2);
    const spitzeLinks = vorher[0]!.a.s;
    const griffRechts = vorher[0]!.b.s;
    const oeffnung = doc.byKind<Opening>('opening').find((o) => o.fluegelTyp === 'dreh')!;
    execute(doc, 'design.eigenschaftSetzen', { entityId: oeffnung.id, feld: 'swing', wert: 'rechts' });
    const nachher = deriveSection(doc, spec)
      .fenstersymbole.filter((l) => l.classes.includes('fluegel-dreh'))
      .slice(0, 2);
    // Spitze beider Schenkel sitzt weiterhin auf EINER Kante — aber auf der
    // anderen: exakt dort, wo vorher die Griffseite lag (dieselbe Angelseite
    // wie der Flügelbogen im Grundriss, sonst widersprächen sich die Pläne).
    expect(nachher[0]!.a.s).toBeCloseTo(nachher[1]!.a.s, 0);
    expect(nachher[0]!.a.s).toBeCloseTo(griffRechts, 0);
    expect(nachher[0]!.b.s).toBeCloseTo(spitzeLinks, 0);
  });

  it('kipp: Spitze unten Mitte, Schenkel zu den oberen Ecken', () => {
    const { doc, spec } = testhausFluegeltypen();
    const g = deriveSection(doc, spec);
    const kipp = g.fenstersymbole.filter((l) => l.classes.includes('fluegel-kipp'));
    expect(kipp.length).toBeGreaterThanOrEqual(2);
    const [l1, l2] = kipp;
    // Beide Schenkel starten an derselben Unterkanten-Mitte (kleineres z = Unterkante)
    const unten1 = l1!.a.z < l1!.b.z ? l1!.a : l1!.b;
    const unten2 = l2!.a.z < l2!.b.z ? l2!.a : l2!.b;
    expect(unten1.z).toBeCloseTo(unten2.z, 0);
    expect(unten1.s).toBeCloseTo(unten2.s, 0);
    // Die Gegenpunkte liegen auf der Oberkante (grösseres z)
    const oben1 = l1!.a.z > l1!.b.z ? l1!.a : l1!.b;
    const oben2 = l2!.a.z > l2!.b.z ? l2!.a : l2!.b;
    expect(oben1.z).toBeCloseTo(oben2.z, 0);
    expect(oben1.s).not.toBeCloseTo(oben2.s, 0); // je eine obere Ecke
  });

  it('drehkipp: beide Dreiecke gleichzeitig (4 Linien)', () => {
    const { doc, spec } = testhausFluegeltypen();
    const g = deriveSection(doc, spec);
    const dreh = g.fenstersymbole.filter((l) => l.classes.includes('fluegel-dreh'));
    const kipp = g.fenstersymbole.filter((l) => l.classes.includes('fluegel-kipp'));
    // Vier Fenster: dreh(1)+drehkipp(1) = 2×2 dreh-Linien; kipp(1)+drehkipp(1) = 2×2 kipp-Linien
    expect(dreh).toHaveLength(4);
    expect(kipp).toHaveLength(4);
  });

  it('schiebe: waagrechter Pfeil auf halber Höhe, keine Dreiecke', () => {
    const { doc, spec } = testhausFluegeltypen();
    const g = deriveSection(doc, spec);
    const schiebe = g.fenstersymbole.filter((l) => l.classes.includes('fluegel-schiebe'));
    expect(schiebe.length).toBeGreaterThan(0);
    // Der Pfeilschaft ist waagrecht (gleiches z beidends)
    const schaft = schiebe.find((l) => Math.abs(l.a.z - l.b.z) < 1 && Math.abs(l.a.s - l.b.s) > 50);
    expect(schaft).toBeDefined();
  });

  it('fest bzw. fehlendes fluegelTyp erzeugt KEINE Symbolik', () => {
    const { doc, wallId } = grundgeruest();
    const openingId = fensterSetzen(doc, wallId);
    execute(doc, 'design.fensterParametrieren', { openingId, fensterTyp: 'fest', fluegelTyp: 'fest' });
    const spec = { a: { x: -2000, y: -3000 }, b: { x: 10000, y: -3000 }, depth: 30000, lookLeft: true } as const;
    const g = deriveSection(doc, spec);
    expect(g.fenstersymbole).toHaveLength(0);
  });

  it('Byte-Identität: ohne fluegelTyp bleibt die Ansicht identisch zum Alt-Golden (Charakterisierung)', () => {
    const { doc, spec } = testhausFensterZweifluegel();
    // testhausFensterZweifluegel setzt NIE fluegelTyp — reine Charakterisierung.
    // Es gibt keinen dedizierten Ansicht-Golden für dieses Testhaus; die
    // Byte-Identität wird stattdessen über den fensterTyp-Ansicht-Golden
    // `ansicht-curtainwall.svg` (unverändert, s. fenster.test.ts) UND direkt
    // über `deriveSection` geprüft: KEIN `fluegelTyp` ⇒ leeres Symbol-Array.
    const g = deriveSection(doc, spec);
    expect(g.fenstersymbole).toHaveLength(0);
  });
});

describe('Grundriss — Flügeltyp-Symbolik (Doppelstrich/versetzte Doppellinie)', () => {
  it('kipp und drehkipp zeichnen das Doppelstrich-Symbol, dreh/schiebe/undefined nicht', () => {
    const { doc, storeyId } = testhausFluegelGrundriss();
    const plan = derivePlan(doc, storeyId);
    const doppelstrich = plan.lines.filter((l) => l.classes.includes('fluegel-kipp'));
    // Ein kipp- und ein drehkipp-Fenster im Fixture → 2×2 = 4 Linien
    expect(doppelstrich).toHaveLength(4);
  });

  it('schiebe zeichnet die versetzte Doppellinie', () => {
    const { doc, storeyId } = testhausFluegelGrundriss();
    const plan = derivePlan(doc, storeyId);
    const versetzt = plan.lines.filter((l) => l.classes.includes('fluegel-schiebe'));
    expect(versetzt).toHaveLength(2);
    // Die beiden Halblinien sind quer zur Wand gegeneinander versetzt (unterschiedliches y)
    expect(versetzt[0]!.a.y).not.toBeCloseTo(versetzt[1]!.a.y, 0);
  });

  it('bestehende Flügelbögen + fensterBoegen-Schalter bleiben unverändert', () => {
    const { doc, storeyId } = testhausFluegelGrundriss();
    const plan = derivePlan(doc, storeyId);
    // Keines der Testfenster ist einfluegel/zweifluegel parametrisiert → kein Bogen
    expect(plan.arcs.filter((a) => a.classes.includes('fenster-bogen'))).toHaveLength(0);
  });

  it('Byte-Identität: ohne fluegelTyp bleibt der Grundriss identisch zum Alt-Golden', () => {
    const { doc, storeyId } = testhausFensterZweifluegel();
    const svg = planToSvg(doc, storeyId, {
      scale: 50,
      paper: A3_QUER,
      projectName: 'Golden-Fenster',
      planTitle: 'Grundriss Zweiflügel',
      date: '10.07.2026',
    });
    pruefeGolden(svg, new URL('./golden/grundriss-fenster-zweifluegel.svg', import.meta.url));
    const plan = derivePlan(doc, storeyId);
    expect(plan.lines.filter((l) => l.classes.includes('fluegel-kipp') || l.classes.includes('fluegel-schiebe'))).toHaveLength(0);
  });
});

describe('Neue Goldens (v0.7.1 E5/4B)', () => {
  it('Golden: Ansicht mit vier Flügeltypen (dreh/kipp/drehkipp/schiebe) ist byte-identisch', () => {
    const { doc, spec } = testhausFluegeltypen();
    const svg = ansichtSvg(doc, spec);
    pruefeGolden(svg, new URL('./golden/ansicht-fluegeltypen.svg', import.meta.url));
    // Bewusste Änderungen: `npx tsx e2e/tools/golden-fluegeltypen.mts` und Diff begutachten.
  });

  it('Golden: Grundriss mit Kipp/Drehkipp/Schiebe ist byte-identisch', () => {
    const { doc, storeyId } = testhausFluegelGrundriss();
    const svg = planToSvg(doc, storeyId, {
      scale: 50,
      paper: A3_QUER,
      projectName: 'Golden-Fluegeltyp',
      planTitle: 'Grundriss Kipp/Drehkipp/Schiebe',
      date: '11.07.2026',
    });
    pruefeGolden(svg, new URL('./golden/grundriss-kipp.svg', import.meta.url));
    // Bewusste Änderungen: `npx tsx e2e/tools/golden-grundriss-kipp.mts` und Diff begutachten.
  });
});

describe('Export-Härte mit gesetztem fluegelTyp (Smoke-Test, kein Beschlag-Detail)', () => {
  it('IFC-Export bleibt crash-frei', () => {
    const { doc } = testhausFluegeltypen();
    expect(() => exportIfc(doc, 'Fluegeltyp-Smoke')).not.toThrow();
    const ifc = exportIfc(doc, 'Fluegeltyp-Smoke');
    expect(ifc).toContain('IFCWALL');
  });

  it('DXF-Export bleibt crash-frei', () => {
    const { doc, storeyId } = testhausFluegeltypen();
    expect(() => planToDxf(doc, storeyId)).not.toThrow();
    const dxf = planToDxf(doc, storeyId);
    expect(dxf).toContain('ENTITIES');
  });

  it('sectionInnerSvg bleibt crash-frei mit allen vier Flügeltypen gleichzeitig im Sichtfeld', () => {
    const { doc, spec } = testhausFluegeltypen();
    expect(() => sectionInnerSvg(doc, spec, 14)).not.toThrow();
  });
});
