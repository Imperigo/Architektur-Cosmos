import { describe, expect, it } from 'vitest';
import { KosmoDoc, invertPatches } from '../src/model/doc';
import { execute } from '../src/commands/core';
import '../src/commands/design';
import type { Rampe } from '../src/model/entities';
import { rampenTeile, rampSteigungProzent } from '../src/derive/rampe';

/**
 * `design.rampeZeichnen` (v0.9.1 P-A2, `docs/V091-SPEZ.md` §P-A2) —
 * ehrliches Steigungs-Gate (Sanktion 4: nie still klemmen), die
 * `rampenTeile`-Zerlegung (3D-Platte + Plan-Bausteine als reine Daten) und
 * der Undo-Vertrag. Grenzwerte exakt bei 5.9/6.1/14.9/15.1 %, Muster
 * `treppe-geometrie-setzen.test.ts`.
 */

function grundgeruest(height = 3000): { doc: KosmoDoc; storeyId: string } {
  const doc = new KosmoDoc();
  const eg = execute(doc, 'design.geschossErstellen', { name: 'EG', index: 0, elevation: 0, height });
  const storeyId = (eg.patches[0] as { id: string }).id;
  return { doc, storeyId };
}

describe('rampSteigungProzent — reine Steigungsrechnung', () => {
  it('rechnet Steigung aus hoehenDelta/Lauflänge', () => {
    expect(rampSteigungProzent({ x: 0, y: 0 }, { x: 1000, y: 0 }, 100)).toBeCloseTo(10, 6);
    expect(rampSteigungProzent({ x: 0, y: 0 }, { x: 2000, y: 0 }, 100)).toBeCloseTo(5, 6);
  });

  it('zieht ein Podest von der Steigungsstrecke ab (kürzere Reststrecke = strengere Annahme)', () => {
    const ohnePodest = rampSteigungProzent({ x: 0, y: 0 }, { x: 1000, y: 0 }, 100);
    const mitPodest = rampSteigungProzent({ x: 0, y: 0 }, { x: 1000, y: 0 }, 100, 200);
    expect(mitPodest).toBeGreaterThan(ohnePodest);
    expect(mitPodest).toBeCloseTo((100 / 800) * 100, 6);
  });

  it('klemmt bei einem Podest ≥ Lauflänge nicht still, sondern treibt die Steigung hoch (Sanktion 4)', () => {
    const steigung = rampSteigungProzent({ x: 0, y: 0 }, { x: 1000, y: 0 }, 100, 5000);
    // Reststrecke wird auf 1 mm geklemmt (nur die Division-durch-0-Wache),
    // NICHT die Steigung selbst — das Ergebnis wird bewusst riesig.
    expect(steigung).toBeCloseTo((100 / 1) * 100, 0);
  });
});

describe('rampenTeile — Zerlegung als reine Daten (3D-Platte + Plan-Bausteine)', () => {
  it('liefert Platte, Kontur, Lauflinie, Pfeil und %-Text', () => {
    const ramp: Rampe = {
      id: 'rampe_test',
      kind: 'ramp',
      storeyId: 'geschoss_test',
      a: { x: 0, y: 0 },
      b: { x: 1000, y: 0 },
      width: 200,
      hoehenDelta: 100,
    };
    const teile = rampenTeile(ramp, 0);
    expect(teile.steigungProzent).toBeCloseTo(10, 6);
    expect(teile.platte).toEqual({ a: ramp.a, b: ramp.b, width: 200, z0: 0, z1: 100 });
    expect(teile.plan.lauflinie).toEqual({ a: ramp.a, b: ramp.b });
    expect(teile.plan.pfeil.schaft).toEqual(ramp.a);
    expect(teile.plan.pfeil.spitze).toEqual(ramp.b);
    expect(teile.plan.pfeil.text).toBe('10.0 %');
    // Rechteck a→b × width: Achse entlang x, Normale entlang y, half = 100
    expect(teile.plan.kontur[0]).toEqual({ x: 0, y: 100 });
    expect(teile.plan.kontur[1]).toEqual({ x: 1000, y: 100 });
    expect(teile.plan.kontur[2]).toEqual({ x: 1000, y: -100 });
    expect(teile.plan.kontur[3]).toEqual({ x: 0, y: -100 });
  });

  it('platziert die Platte relativ zur übergebenen Geschoss-Elevation', () => {
    const ramp: Rampe = {
      id: 'rampe_test_elev',
      kind: 'ramp',
      storeyId: 's',
      a: { x: 0, y: 0 },
      b: { x: 2000, y: 0 },
      width: 1200,
      hoehenDelta: 200,
    };
    const teile = rampenTeile(ramp, 3000);
    expect(teile.platte.z0).toBe(3000);
    expect(teile.platte.z1).toBe(3200);
  });

  it('Kontur dreht sich mit einer diagonalen Achse mit', () => {
    const ramp: Rampe = {
      id: 'rampe_test2',
      kind: 'ramp',
      storeyId: 'geschoss_test',
      a: { x: 0, y: 0 },
      b: { x: 3000, y: 4000 }, // Länge 5000, 3-4-5-Dreieck
      width: 1000,
      hoehenDelta: 250,
    };
    const teile = rampenTeile(ramp, 0);
    expect(teile.steigungProzent).toBeCloseTo(5, 6); // 250/5000*100
    // half = 500, Richtung (0.6, 0.8), Normale (-0.8, 0.6)
    expect(teile.plan.kontur[0].x).toBeCloseTo(0 + -0.8 * 500, 3);
    expect(teile.plan.kontur[0].y).toBeCloseTo(0 + 0.6 * 500, 3);
  });

  it('Podest verschärft die Steigungsrechnung auch in rampenTeile', () => {
    const ohnePodest = rampenTeile(
      { id: 'r1', kind: 'ramp', storeyId: 's', a: { x: 0, y: 0 }, b: { x: 1000, y: 0 }, width: 100, hoehenDelta: 100 },
      0,
    );
    const mitPodest = rampenTeile(
      {
        id: 'r2', kind: 'ramp', storeyId: 's', a: { x: 0, y: 0 }, b: { x: 1000, y: 0 }, width: 100, hoehenDelta: 100,
        podestLaenge: 200,
      },
      0,
    );
    expect(mitPodest.steigungProzent).toBeGreaterThan(ohnePodest.steigungProzent);
  });
});

describe('design.rampeZeichnen — ehrliches Steigungs-Gate (Sanktion 4: nie still klemmen)', () => {
  const zeichnen = (hoehenDelta: number) => {
    const { doc, storeyId } = grundgeruest();
    return execute(doc, 'design.rampeZeichnen', {
      storeyId,
      a: { x: 0, y: 0 },
      b: { x: 1000, y: 0 },
      hoehenDelta,
    });
  };

  it('5.9 % — läuft leise durch, kein Hindernisfrei-Hinweis', () => {
    const res = zeichnen(59);
    expect(res.summary).toContain('5.9 % Steigung');
    expect(res.summary).not.toMatch(/hindernisfrei/);
  });

  it('6.1 % — läuft durch, aber mit ehrlichem Hinweis (SIA 500: >6 %)', () => {
    const res = zeichnen(61);
    expect(res.summary).toContain('6.1 % Steigung');
    expect(res.summary).toContain('nicht hindernisfrei (SIA 500: >6 %)');
    // Command lief tatsächlich durch — der Hinweis klemmt nichts (Sanktion 4).
    expect(res.patches).toHaveLength(1);
  });

  it('14.9 % — läuft noch durch, mit Hinweis', () => {
    const res = zeichnen(149);
    expect(res.summary).toContain('14.9 % Steigung');
    expect(res.summary).toContain('nicht hindernisfrei');
    expect(res.patches).toHaveLength(1);
  });

  it('15.1 % — wirft mit deutschem Grund, keine stille Klemmung', () => {
    expect(() => zeichnen(151)).toThrow(
      /Rampensteigung 15\.1 ?% übersteigt die 15 ?%-Grenze \(Tiefgarage\)/,
    );
  });

  it('genau 6 % bleibt leise, genau 15 % läuft noch durch (Grenzwerte sind exklusiv)', () => {
    const res6 = zeichnen(60);
    expect(res6.summary).not.toMatch(/hindernisfrei/);
    expect(() => zeichnen(150)).not.toThrow();
  });
});

describe('design.rampeZeichnen — Command-Roundtrip + Undo', () => {
  it('erstellt eine Rampe mit width/hoehenDelta/podestLaenge', () => {
    const { doc, storeyId } = grundgeruest();
    const res = execute(doc, 'design.rampeZeichnen', {
      storeyId,
      a: { x: 0, y: 0 },
      b: { x: 4000, y: 0 },
      width: 1500,
      hoehenDelta: 200,
      podestLaenge: 500,
    });
    expect(res.patches).toHaveLength(1);
    const ramps = doc.byKind<Rampe>('ramp');
    expect(ramps).toHaveLength(1);
    expect(ramps[0]!.kind).toBe('ramp');
    expect(ramps[0]!.width).toBe(1500);
    expect(ramps[0]!.hoehenDelta).toBe(200);
    expect(ramps[0]!.podestLaenge).toBe(500);
  });

  it('ohne podestLaenge bleibt das Feld ganz weg (exactOptionalPropertyTypes)', () => {
    const { doc, storeyId } = grundgeruest();
    execute(doc, 'design.rampeZeichnen', {
      storeyId,
      a: { x: 0, y: 0 },
      b: { x: 4000, y: 0 },
      hoehenDelta: 200,
    });
    const [ramp] = doc.byKind<Rampe>('ramp');
    expect('podestLaenge' in ramp!).toBe(false);
    expect(ramp!.width).toBe(1200); // Default
  });

  it('macht rückgängig und wiederholt (Undo/Redo über invertPatches)', () => {
    const { doc, storeyId } = grundgeruest();
    const res = execute(doc, 'design.rampeZeichnen', {
      storeyId,
      a: { x: 0, y: 0 },
      b: { x: 4000, y: 0 },
      hoehenDelta: 150,
    });
    expect(doc.byKind<Rampe>('ramp')).toHaveLength(1);

    doc.apply(invertPatches(res.patches));
    expect(doc.byKind<Rampe>('ramp')).toHaveLength(0);

    doc.apply(res.patches);
    expect(doc.byKind<Rampe>('ramp')).toHaveLength(1);
  });

  it('apply ∘ invert = Identität (Roundtrip über Serialisierung)', () => {
    const { doc, storeyId } = grundgeruest();
    const before = JSON.stringify(doc.toJSON());
    const res = execute(doc, 'design.rampeZeichnen', {
      storeyId,
      a: { x: 0, y: 0 },
      b: { x: 5000, y: 0 },
      hoehenDelta: 150,
    });
    doc.apply(invertPatches(res.patches));
    expect(JSON.stringify(doc.toJSON())).toBe(before);
  });

  it('lehnt zu kurzen Lauf ab (< 0.5 m), keine Entity entsteht', () => {
    const { doc, storeyId } = grundgeruest();
    expect(() =>
      execute(doc, 'design.rampeZeichnen', {
        storeyId,
        a: { x: 0, y: 0 },
        b: { x: 100, y: 0 },
        hoehenDelta: 10,
      }),
    ).toThrow(/zu kurz/);
    expect(doc.byKind<Rampe>('ramp')).toHaveLength(0);
  });

  it('lehnt ein unbekanntes Geschoss ab', () => {
    const doc = new KosmoDoc();
    expect(() =>
      execute(doc, 'design.rampeZeichnen', {
        storeyId: 'geschoss_unbekannt',
        a: { x: 0, y: 0 },
        b: { x: 1000, y: 0 },
        hoehenDelta: 100,
      }),
    ).toThrow(/existiert nicht/);
  });
});
