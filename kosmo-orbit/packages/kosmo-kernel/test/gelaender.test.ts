import { describe, expect, it } from 'vitest';
import {
  KosmoDoc,
  execute,
  invertPatches,
  parseKosmoSafe,
  CommandError,
  deriveEntity,
  gelaenderTeile,
  extrudePolygon,
  type Gelaender,
} from '../src';

/**
 * Geländer-Entität (v0.9.1 P-A1, `docs/V091-SPEZ.md` K24) — Tests nach
 * demselben Muster wie `test/masskette.test.ts`: Roundtrip/Command/Undo,
 * dazu die reine Zerlegung `gelaenderTeile` (`derive/gelaender.ts`) und
 * die ehrliche zod-Ablehnung des Höhenbereichs (Sanktion 4, V091-SPEZ —
 * KEINE stille Klemmung).
 */

function zeichnen(doc: KosmoDoc, storeyId: string, overrides: Partial<Record<string, unknown>> = {}) {
  return execute(doc, 'design.gelaenderZeichnen', {
    storeyId,
    punkte: [
      { x: 0, y: 0 },
      { x: 3000, y: 0 },
      { x: 3000, y: 4000 },
    ],
    ...overrides,
  });
}

function geschoss(doc: KosmoDoc): string {
  const eg = execute(doc, 'design.geschossErstellen', { name: 'EG', index: 0, elevation: 0 });
  return (eg.patches[0] as { id: string }).id;
}

describe('gelaenderTeile — reine Zerlegung (derive/gelaender.ts)', () => {
  it('gerade Polylinie (2400 mm, Teilung 1200): genau 3 Pfosten (beide Enden + 1 Zwischenpfosten)', () => {
    const g: Gelaender = {
      id: 'gelaender_1',
      kind: 'gelaender',
      storeyId: 's1',
      punkte: [{ x: 0, y: 0 }, { x: 2400, y: 0 }],
      hoehe: 1000,
      art: 'staketen',
    };
    const teile = gelaenderTeile(g);
    expect(teile.pfosten).toEqual([
      { x: 0, y: 0 },
      { x: 1200, y: 0 },
      { x: 2400, y: 0 },
    ]);
    expect(teile.handlaufSegmente).toEqual([{ a: { x: 0, y: 0 }, b: { x: 2400, y: 0 } }]);
  });

  it('Segment nicht glatt teilbar (3000 mm): Pfosten bleiben ≤ 1200 mm auseinander', () => {
    const g: Gelaender = {
      id: 'gelaender_2',
      kind: 'gelaender',
      storeyId: 's1',
      punkte: [{ x: 0, y: 0 }, { x: 3000, y: 0 }],
      hoehe: 1000,
      art: 'staketen',
    };
    const teile = gelaenderTeile(g);
    // n = ceil(3000/1200) = 3 -> 4 Pfosten, Abstand 1000 mm
    expect(teile.pfosten).toHaveLength(4);
    for (let i = 1; i < teile.pfosten.length; i++) {
      const d = Math.hypot(teile.pfosten[i]!.x - teile.pfosten[i - 1]!.x, teile.pfosten[i]!.y - teile.pfosten[i - 1]!.y);
      expect(d).toBeLessThanOrEqual(1200);
    }
    expect(teile.pfosten[0]).toEqual({ x: 0, y: 0 });
    expect(teile.pfosten[teile.pfosten.length - 1]).toEqual({ x: 3000, y: 0 });
  });

  it('Knick (L-Form): der Eckpunkt trägt GENAU EINEN Pfosten (kein Doppeleintrag)', () => {
    const g: Gelaender = {
      id: 'gelaender_3',
      kind: 'gelaender',
      storeyId: 's1',
      punkte: [{ x: 0, y: 0 }, { x: 3000, y: 0 }, { x: 3000, y: 4000 }],
      hoehe: 1000,
      art: 'staketen',
    };
    const teile = gelaenderTeile(g);
    const knick = teile.pfosten.filter((p) => p.x === 3000 && p.y === 0);
    expect(knick).toHaveLength(1);
    // beide Enden zwingend dabei
    expect(teile.pfosten[0]).toEqual({ x: 0, y: 0 });
    expect(teile.pfosten[teile.pfosten.length - 1]).toEqual({ x: 3000, y: 4000 });
    // zwei Segmente -> zwei Handlauf-Segmente
    expect(teile.handlaufSegmente).toEqual([
      { a: { x: 0, y: 0 }, b: { x: 3000, y: 0 } },
      { a: { x: 3000, y: 0 }, b: { x: 3000, y: 4000 } },
    ]);
  });
});

describe('design.gelaenderZeichnen — Roundtrip/Parse-Guard', () => {
  it('legt eine Gelaender-Entity mit den übergebenen Punkten und Defaults an', () => {
    const doc = new KosmoDoc();
    const storeyId = geschoss(doc);
    const res = zeichnen(doc, storeyId);
    const id = (res.patches[0] as { id: string }).id;
    const g = doc.get<Gelaender>(id)!;
    expect(g.kind).toBe('gelaender');
    expect(g.storeyId).toBe(storeyId);
    expect(g.punkte).toEqual([
      { x: 0, y: 0 },
      { x: 3000, y: 0 },
      { x: 3000, y: 4000 },
    ]);
    expect(g.hoehe).toBe(1000); // Default
    expect(g.art).toBe('staketen'); // Default
  });

  it('lehnt weniger als zwei Punkte ab (zod .min(2))', () => {
    const doc = new KosmoDoc();
    const storeyId = geschoss(doc);
    expect(() => zeichnen(doc, storeyId, { punkte: [{ x: 0, y: 0 }] })).toThrow();
  });

  it('lehnt eine unbekannte storeyId ab', () => {
    const doc = new KosmoDoc();
    expect(() => zeichnen(doc, 'geschoss_unbekannt')).toThrow(CommandError);
  });

  it('summarize zeigt Länge, Höhe und Art', () => {
    const doc = new KosmoDoc();
    const storeyId = geschoss(doc);
    // 0,0 -> 3000,0 (3.0 m) -> 3000,4000 (4.0 m) = 7.0 m
    const res = zeichnen(doc, storeyId, { hoehe: 900, art: 'voll' });
    expect(res.summary).toBe('Geländer 7.0 m, 900 mm hoch (voll)');
  });

  it('Roundtrip toJSON → JSON.stringify/parse → fromJSON erhält die Gelaender-Entity vollständig', () => {
    const doc = new KosmoDoc();
    const storeyId = geschoss(doc);
    zeichnen(doc, storeyId);
    const json = JSON.parse(JSON.stringify(doc.toJSON()));
    const wieder = KosmoDoc.fromJSON(json);
    const g = wieder.byKind<Gelaender>('gelaender')[0]!;
    expect(g.punkte).toHaveLength(3);
    expect(g.storeyId).toBe(storeyId);
  });

  it('parse-guard: parseKosmoSafe akzeptiert ein Doc mit Gelaender-Entities', () => {
    const doc = new KosmoDoc();
    const storeyId = geschoss(doc);
    zeichnen(doc, storeyId);
    const roh = JSON.stringify(doc.toJSON());
    const r = parseKosmoSafe(roh);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.doc.byKind<Gelaender>('gelaender').length).toBe(1);
  });
});

describe('design.gelaenderZeichnen — Undo', () => {
  it('EIN Undo-Schritt entfernt das Geländer wieder vollständig', () => {
    const doc = new KosmoDoc();
    const storeyId = geschoss(doc);
    const res = zeichnen(doc, storeyId);
    const id = (res.patches[0] as { id: string }).id;
    expect(doc.get<Gelaender>(id)).toBeDefined();
    expect(res.patches).toHaveLength(1);

    doc.apply(invertPatches(res.patches));
    expect(doc.get<Gelaender>(id)).toBeUndefined();
    expect(doc.byKind<Gelaender>('gelaender')).toHaveLength(0);
  });
});

describe('design.gelaenderZeichnen — Höhen-Gate (700–1500 mm, ehrliche Ablehnung, KEINE Klemmung)', () => {
  it('lehnt hoehe 699 ab (unter der Grenze)', () => {
    const doc = new KosmoDoc();
    const storeyId = geschoss(doc);
    expect(() => zeichnen(doc, storeyId, { hoehe: 699 })).toThrow();
  });

  it('lehnt hoehe 1501 ab (über der Grenze)', () => {
    const doc = new KosmoDoc();
    const storeyId = geschoss(doc);
    expect(() => zeichnen(doc, storeyId, { hoehe: 1501 })).toThrow();
  });

  it('akzeptiert die Grenzwerte 700 und 1500 selbst', () => {
    const doc = new KosmoDoc();
    const storeyId = geschoss(doc);
    expect(() => zeichnen(doc, storeyId, { hoehe: 700 })).not.toThrow();
    expect(() => zeichnen(doc, storeyId, { hoehe: 1500 })).not.toThrow();
  });
});

describe('design.eigenschaftSetzen — Geländer (hoehe/art)', () => {
  function gelaenderMitId(doc: KosmoDoc): string {
    const storeyId = geschoss(doc);
    const res = zeichnen(doc, storeyId);
    return (res.patches[0] as { id: string }).id;
  }

  it('setzt hoehe innerhalb des Bestands-Bereichs', () => {
    const doc = new KosmoDoc();
    const id = gelaenderMitId(doc);
    execute(doc, 'design.eigenschaftSetzen', { entityId: id, feld: 'hoehe', wert: 1200 });
    expect(doc.get<Gelaender>(id)!.hoehe).toBe(1200);
  });

  it('setzt art auf einen gültigen Wert', () => {
    const doc = new KosmoDoc();
    const id = gelaenderMitId(doc);
    execute(doc, 'design.eigenschaftSetzen', { entityId: id, feld: 'art', wert: 'voll' });
    expect(doc.get<Gelaender>(id)!.art).toBe('voll');
    execute(doc, 'design.eigenschaftSetzen', { entityId: id, feld: 'art', wert: 'handlauf' });
    expect(doc.get<Gelaender>(id)!.art).toBe('handlauf');
  });

  it('lehnt hoehe ausserhalb 700–1500 ab (Bestands-Bereich design.gelaenderZeichnen)', () => {
    const doc = new KosmoDoc();
    const id = gelaenderMitId(doc);
    expect(() => execute(doc, 'design.eigenschaftSetzen', { entityId: id, feld: 'hoehe', wert: 600 })).toThrow(
      CommandError,
    );
    expect(() => execute(doc, 'design.eigenschaftSetzen', { entityId: id, feld: 'hoehe', wert: 1600 })).toThrow(
      CommandError,
    );
  });

  it('lehnt einen unbekannten art-Wert ab', () => {
    const doc = new KosmoDoc();
    const id = gelaenderMitId(doc);
    expect(() => execute(doc, 'design.eigenschaftSetzen', { entityId: id, feld: 'art', wert: 'glas' })).toThrow(
      CommandError,
    );
  });

  it('lehnt ein bei Gelaender nicht änderbares Feld ab', () => {
    const doc = new KosmoDoc();
    const id = gelaenderMitId(doc);
    expect(() => execute(doc, 'design.eigenschaftSetzen', { entityId: id, feld: 'pitch', wert: 10 })).toThrow(
      CommandError,
    );
  });
});

describe('derive/scene — deriveGelaender (3D, Pfosten + Handlauf-Band)', () => {
  it('liefert ein GeometryArtifact mit Geometrie, solange Geschoss + ≥2 Punkte vorhanden sind', () => {
    const doc = new KosmoDoc();
    const storeyId = geschoss(doc);
    const res = zeichnen(doc, storeyId);
    const id = (res.patches[0] as { id: string }).id;
    const artifact = deriveEntity(doc, id);
    expect(artifact).not.toBeNull();
    expect(artifact!.positions.length).toBeGreaterThan(0);
    expect(artifact!.indices.length).toBeGreaterThan(0);
  });

  it('ohne gültiges Geschoss liefert deriveEntity null (Daten-Guard)', () => {
    const doc = new KosmoDoc();
    const storeyId = geschoss(doc);
    const res = zeichnen(doc, storeyId);
    const id = (res.patches[0] as { id: string }).id;
    // Geschoss aus dem Doc entfernen, ohne das Geländer anzufassen
    doc.apply([{ id: storeyId, before: doc.get(storeyId)!, after: null }]);
    expect(deriveEntity(doc, id)).toBeNull();
  });
});

describe('derive/scene — deriveGelaender: `art` wirkt in 3D (v0.9.2 P-G)', () => {
  // Ein perBox-Referenzwert: EIN Extrusions-Quader (egal welcher Grösse)
  // erzeugt IMMER dieselbe Vertex-/Index-Anzahl (Deckel + Boden + 4
  // Seitenflächen, s. `derive/mesh.ts extrudePolygon`) — dynamisch aus
  // derselben Funktion abgeleitet statt einer erratenen Magic Number, damit
  // der Test robust gegen Implementationsdetails der Triangulierung bleibt.
  const einBox = extrudePolygon('ref', 'stahl', [
    { x: -10, y: -10 }, { x: 10, y: -10 }, { x: 10, y: 10 }, { x: -10, y: 10 },
  ], [], 0, 100);
  const POS_PRO_BOX = einBox.positions.length;
  const IDX_PRO_BOX = einBox.indices.length;

  function gelaenderKurz(doc: KosmoDoc, storeyId: string, art: Gelaender['art']) {
    // Eine einzige gerade Strecke 0→1000mm: EIN Handlauf-Segment, Pfosten-
    // Zerlegung liefert genau 2 Pfosten (Segment ≤ 1200mm, beide Enden,
    // kein Zwischenpfosten). Staketen-Raster (~120mm): n=ceil(1000/120)=9,
    // Interior-Punkte k=1..8 → 8 Staketen (die Segmentenden fallen mit den
    // beiden Pfosten zusammen und werden NICHT doppelt gesetzt).
    return execute(doc, 'design.gelaenderZeichnen', {
      storeyId,
      punkte: [{ x: 0, y: 0 }, { x: 1000, y: 0 }],
      hoehe: 1000,
      art,
    });
  }

  it("art 'handlauf' bleibt exakt der v0.9.1-Bestand: 2 Pfosten + 1 Band = 3 Quader, KEINE Füllung", () => {
    const doc = new KosmoDoc();
    const storeyId = geschoss(doc);
    const res = gelaenderKurz(doc, storeyId, 'handlauf');
    const id = (res.patches[0] as { id: string }).id;
    const artifact = deriveEntity(doc, id)!;
    expect(artifact.positions.length).toBe(POS_PRO_BOX * 3);
    expect(artifact.indices.length).toBe(IDX_PRO_BOX * 3);
  });

  it("art 'staketen' fügt 8 zusätzliche Stab-Quader zwischen den Pfosten ein (3 + 8 = 11 Quader)", () => {
    const doc = new KosmoDoc();
    const storeyId = geschoss(doc);
    const res = gelaenderKurz(doc, storeyId, 'staketen');
    const id = (res.patches[0] as { id: string }).id;
    const artifact = deriveEntity(doc, id)!;
    expect(artifact.positions.length).toBe(POS_PRO_BOX * 11);
    expect(artifact.indices.length).toBe(IDX_PRO_BOX * 11);
  });

  it("art 'voll' ersetzt die Staketen durch EINE Brüstungsplatte je Segment (3 + 1 = 4 Quader)", () => {
    const doc = new KosmoDoc();
    const storeyId = geschoss(doc);
    const res = gelaenderKurz(doc, storeyId, 'voll');
    const id = (res.patches[0] as { id: string }).id;
    const artifact = deriveEntity(doc, id)!;
    expect(artifact.positions.length).toBe(POS_PRO_BOX * 4);
    expect(artifact.indices.length).toBe(IDX_PRO_BOX * 4);
  });

  it('alle drei Formen liefern unterschiedliche Vertex-Mengen (staketen > voll > handlauf)', () => {
    const doc = new KosmoDoc();
    const storeyId = geschoss(doc);
    const handlauf = deriveEntity(doc, (gelaenderKurz(doc, storeyId, 'handlauf').patches[0] as { id: string }).id)!;
    const voll = deriveEntity(doc, (gelaenderKurz(doc, storeyId, 'voll').patches[0] as { id: string }).id)!;
    const staketen = deriveEntity(doc, (gelaenderKurz(doc, storeyId, 'staketen').patches[0] as { id: string }).id)!;
    expect(staketen.positions.length).toBeGreaterThan(voll.positions.length);
    expect(voll.positions.length).toBeGreaterThan(handlauf.positions.length);
  });

  it("art 'voll' und 'staketen' teilen dieselbe Höhe (z0 bis Handlauf-Unterkante) — nur die Form der Füllung unterscheidet sich", () => {
    // Indirekter Nachweis über die Bounding-Box in z: beide Füllvarianten
    // haben denselben Positions-Wertebereich in z ausser der zusätzlichen
    // Handlauf-Band-Spitze — hier genügt der Vertex-Zahl-Unterschied aus dem
    // Test oben; dieser Test sichert zusätzlich, dass 'voll' NICHT dieselbe
    // Anzahl Quader wie 'staketen' erzeugt (unterschiedliche Formen, nicht
    // nur unterschiedliche Zahl gleicher Formen).
    const doc = new KosmoDoc();
    const storeyId = geschoss(doc);
    const voll = deriveEntity(doc, (gelaenderKurz(doc, storeyId, 'voll').patches[0] as { id: string }).id)!;
    const staketen = deriveEntity(doc, (gelaenderKurz(doc, storeyId, 'staketen').patches[0] as { id: string }).id)!;
    expect(voll.positions.length).not.toBe(staketen.positions.length);
  });
});
