import { describe, expect, it } from 'vitest';
import {
  KosmoDoc,
  execute,
  invertPatches,
  CommandError,
  deriveEntity,
  columnOutline,
  profilOutline,
  extrudePolygon,
  type Profil,
  type Column,
  type Beam,
} from '../src';

/**
 * Profil-Manager Kern (v0.9.2 P-P1, `docs/V092-SPEZ.md` §P-P1) — Tests nach
 * demselben Muster wie `test/gelaender.test.ts`: reine Ableitung
 * (`profilOutline`), Command-Roundtrip/Undo, Referenz-Schutz beim Löschen,
 * dazu der GOLDEN-GUARD-Beweis: `deriveColumn`/`deriveBeam` bleiben OHNE
 * gesetzte `profilId` byte-identisch zum Rechteck-/Rund-Eigenbau.
 */

function geschoss(doc: KosmoDoc): string {
  const eg = execute(doc, 'design.geschossErstellen', { name: 'EG', index: 0, elevation: 0 });
  return (eg.patches[0] as { id: string }).id;
}

function profilErstellen(doc: KosmoDoc, overrides: Partial<Record<string, unknown>> = {}) {
  return execute(doc, 'design.profilErstellen', {
    name: 'Test-Profil',
    form: 'rechteck',
    b: 300,
    h: 200,
    ...overrides,
  });
}

describe('profilOutline — reine Ableitung (model/entities.ts)', () => {
  it('rechteck: 4 Ecken, CCW, zentriert um 0/0', () => {
    const p: Profil = { id: 'profil_1', kind: 'profil', name: 'R', form: 'rechteck', b: 300, h: 200 };
    const pts = profilOutline(p);
    expect(pts).toEqual([
      { x: -150, y: -100 },
      { x: 150, y: -100 },
      { x: 150, y: 100 },
      { x: -150, y: 100 },
    ]);
  });

  it('rund: 16-Eck (dieselbe Segmentzahl wie columnOutline), Radius = d/2', () => {
    const p: Profil = { id: 'profil_2', kind: 'profil', name: 'Rund', form: 'rund', d: 400 };
    const pts = profilOutline(p);
    expect(pts).toHaveLength(16);
    for (const pt of pts) {
      // Math.round auf jede Koordinate einzeln (wie bei columnOutline) kann
      // den Radius pro Punkt um bis zu ~√2×0.5mm verschieben — Toleranz 5mm.
      expect(Math.hypot(pt.x, pt.y)).toBeCloseTo(200, -1);
    }
    expect(pts[0]).toEqual({ x: 200, y: 0 });
  });

  it('rund: dieselbe Segmentzahl wie die Stützen-Eigenform columnOutline', () => {
    const spalte: Column = {
      id: 'stuetze_x', kind: 'column', storeyId: 's1', at: { x: 0, y: 0 },
      profil: 'rund', b: 400, material: 'beton',
    };
    const p: Profil = { id: 'profil_2b', kind: 'profil', name: 'Rund', form: 'rund', d: 400 };
    expect(profilOutline(p)).toHaveLength(columnOutline(spalte).length);
  });

  it('stahl-i: 12-Punkte-I-Profil, symmetrisch um 0/0, CCW (positive Fläche)', () => {
    const p: Profil = {
      id: 'profil_3', kind: 'profil', name: 'IPE', form: 'stahl-i', h: 300, b: 150, steg: 8, flansch: 12,
    };
    const pts = profilOutline(p);
    expect(pts).toHaveLength(12);
    // Bounding Box entspricht genau h/b
    const xs = pts.map((pt) => pt.x);
    const ys = pts.map((pt) => pt.y);
    expect(Math.max(...xs) - Math.min(...xs)).toBe(150);
    expect(Math.max(...ys) - Math.min(...ys)).toBe(300);
    // CCW = positive Shoelace-Fläche
    let flaeche = 0;
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i]!;
      const b = pts[(i + 1) % pts.length]!;
      flaeche += a.x * b.y - b.x * a.y;
    }
    expect(flaeche).toBeGreaterThan(0);
  });

  it('stahl-u: 8-Punkte-Kanalprofil, Steg links, Öffnung nach rechts, CCW', () => {
    const p: Profil = {
      id: 'profil_4', kind: 'profil', name: 'UPN', form: 'stahl-u', h: 200, b: 80, steg: 6, flansch: 10,
    };
    const pts = profilOutline(p);
    expect(pts).toHaveLength(8);
    const xs = pts.map((pt) => pt.x);
    const ys = pts.map((pt) => pt.y);
    expect(Math.max(...xs) - Math.min(...xs)).toBe(80);
    expect(Math.max(...ys) - Math.min(...ys)).toBe(200);
    // Öffnung liegt rechts: die inneren Punkte (Notch) liegen bei x = -hb+steg = -40+6 = -34
    expect(pts.some((pt) => pt.x === -34)).toBe(true);
    let flaeche = 0;
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i]!;
      const b = pts[(i + 1) % pts.length]!;
      flaeche += a.x * b.y - b.x * a.y;
    }
    expect(flaeche).toBeGreaterThan(0);
  });
});

describe('design.profilErstellen — Roundtrip/Validierung', () => {
  it('legt ein rechteck-Profil mit den übergebenen Massen an', () => {
    const doc = new KosmoDoc();
    const res = profilErstellen(doc);
    const id = (res.patches[0] as { id: string }).id;
    const p = doc.get<Profil>(id)!;
    expect(p.kind).toBe('profil');
    expect(p.form).toBe('rechteck');
    expect(p.b).toBe(300);
    expect(p.h).toBe(200);
    expect(res.summary).toBe('Profil «Test-Profil» (rechteck)');
  });

  it('legt ein rund-Profil an (nur d)', () => {
    const doc = new KosmoDoc();
    const res = profilErstellen(doc, { form: 'rund', b: undefined, h: undefined, d: 350 });
    const id = (res.patches[0] as { id: string }).id;
    const p = doc.get<Profil>(id)!;
    expect(p.form).toBe('rund');
    expect(p.d).toBe(350);
    expect(p.b).toBeUndefined();
  });

  it('legt ein stahl-i-Profil an (h/b/steg/flansch)', () => {
    const doc = new KosmoDoc();
    const res = profilErstellen(doc, { form: 'stahl-i', b: 150, h: 300, steg: 8, flansch: 12 });
    const id = (res.patches[0] as { id: string }).id;
    const p = doc.get<Profil>(id)!;
    expect(p.form).toBe('stahl-i');
    expect(p.steg).toBe(8);
    expect(p.flansch).toBe(12);
  });

  it('lehnt rechteck ohne h ab', () => {
    const doc = new KosmoDoc();
    expect(() => profilErstellen(doc, { h: undefined })).toThrow(CommandError);
  });

  it('lehnt rund ohne d ab', () => {
    const doc = new KosmoDoc();
    expect(() => profilErstellen(doc, { form: 'rund', b: undefined, h: undefined })).toThrow(CommandError);
  });

  it('lehnt stahl-i ohne steg/flansch ab', () => {
    const doc = new KosmoDoc();
    expect(() =>
      profilErstellen(doc, { form: 'stahl-i', b: 150, h: 300, steg: undefined, flansch: undefined }),
    ).toThrow(CommandError);
  });

  it('lehnt stahl-u ab, wenn steg >= b (sich selbst schneidendes Polygon)', () => {
    const doc = new KosmoDoc();
    expect(() =>
      profilErstellen(doc, { form: 'stahl-u', b: 80, h: 200, steg: 80, flansch: 10 }),
    ).toThrow(CommandError);
  });

  it('lehnt stahl-i ab, wenn flansch*2 >= h (überlappende Flansche)', () => {
    const doc = new KosmoDoc();
    expect(() =>
      profilErstellen(doc, { form: 'stahl-i', b: 150, h: 300, steg: 8, flansch: 160 }),
    ).toThrow(CommandError);
  });

  it('Zod lehnt Masse <= 0 schon vor dem Command-Gate ab', () => {
    const doc = new KosmoDoc();
    expect(() => profilErstellen(doc, { b: -10 })).toThrow();
    expect(() => profilErstellen(doc, { b: 0 })).toThrow();
  });
});

describe('design.profilAendern — nur übergebene Felder', () => {
  it('ändert nur den Namen, Masse bleiben', () => {
    const doc = new KosmoDoc();
    const res = profilErstellen(doc);
    const id = (res.patches[0] as { id: string }).id;
    execute(doc, 'design.profilAendern', { profilId: id, name: 'Umbenannt' });
    const p = doc.get<Profil>(id)!;
    expect(p.name).toBe('Umbenannt');
    expect(p.b).toBe(300);
    expect(p.h).toBe(200);
  });

  it('ändert nur ein Mass, Rest bleibt', () => {
    const doc = new KosmoDoc();
    const res = profilErstellen(doc);
    const id = (res.patches[0] as { id: string }).id;
    execute(doc, 'design.profilAendern', { profilId: id, b: 400 });
    const p = doc.get<Profil>(id)!;
    expect(p.b).toBe(400);
    expect(p.h).toBe(200);
    expect(p.name).toBe('Test-Profil');
  });

  it('lehnt eine Änderung ab, die die (unveränderte) Form ungültig machen würde', () => {
    const doc = new KosmoDoc();
    const res = profilErstellen(doc);
    const id = (res.patches[0] as { id: string }).id;
    expect(() => execute(doc, 'design.profilAendern', { profilId: id, b: -1 })).toThrow();
  });

  it('Formwechsel rechteck -> rund braucht d (sonst ehrliche Ablehnung)', () => {
    const doc = new KosmoDoc();
    const res = profilErstellen(doc);
    const id = (res.patches[0] as { id: string }).id;
    expect(() => execute(doc, 'design.profilAendern', { profilId: id, form: 'rund' })).toThrow(CommandError);
    execute(doc, 'design.profilAendern', { profilId: id, form: 'rund', d: 250 });
    expect(doc.get<Profil>(id)!.form).toBe('rund');
    expect(doc.get<Profil>(id)!.d).toBe(250);
  });

  it('lehnt eine unbekannte profilId ab', () => {
    const doc = new KosmoDoc();
    expect(() => execute(doc, 'design.profilAendern', { profilId: 'profil_unbekannt', name: 'x' })).toThrow(
      CommandError,
    );
  });
});

describe('design.profilLoeschen — Referenz-Schutz', () => {
  it('löscht ein unreferenziertes Profil', () => {
    const doc = new KosmoDoc();
    const res = profilErstellen(doc);
    const id = (res.patches[0] as { id: string }).id;
    execute(doc, 'design.profilLoeschen', { profilId: id });
    expect(doc.get<Profil>(id)).toBeUndefined();
  });

  it('lehnt das Löschen ab, wenn eine Stütze referenziert — Referenzliste im Fehlertext', () => {
    const doc = new KosmoDoc();
    const storeyId = geschoss(doc);
    const pRes = profilErstellen(doc);
    const profilId = (pRes.patches[0] as { id: string }).id;
    const cRes = execute(doc, 'design.stuetzeSetzen', { storeyId, at: { x: 0, y: 0 } });
    const columnId = (cRes.patches[0] as { id: string }).id;
    execute(doc, 'design.eigenschaftSetzen', { entityId: columnId, feld: 'profilId', wert: profilId });
    expect(() => execute(doc, 'design.profilLoeschen', { profilId })).toThrow(CommandError);
    try {
      execute(doc, 'design.profilLoeschen', { profilId });
      expect.unreachable();
    } catch (err) {
      expect(err).toBeInstanceOf(CommandError);
      expect((err as CommandError).message).toContain(columnId);
    }
  });

  it('lehnt das Löschen ab, wenn ein Unterzug referenziert — Referenzliste im Fehlertext', () => {
    const doc = new KosmoDoc();
    const storeyId = geschoss(doc);
    const pRes = profilErstellen(doc);
    const profilId = (pRes.patches[0] as { id: string }).id;
    const bRes = execute(doc, 'design.unterzugZeichnen', {
      storeyId, a: { x: 0, y: 0 }, b: { x: 3000, y: 0 },
    });
    const beamId = (bRes.patches[0] as { id: string }).id;
    execute(doc, 'design.eigenschaftSetzen', { entityId: beamId, feld: 'profilId', wert: profilId });
    try {
      execute(doc, 'design.profilLoeschen', { profilId });
      expect.unreachable();
    } catch (err) {
      expect(err).toBeInstanceOf(CommandError);
      expect((err as CommandError).message).toContain(beamId);
    }
  });

  it('löscht wieder erfolgreich, sobald die Referenz entfernt wurde (profilId = "")', () => {
    const doc = new KosmoDoc();
    const storeyId = geschoss(doc);
    const pRes = profilErstellen(doc);
    const profilId = (pRes.patches[0] as { id: string }).id;
    const cRes = execute(doc, 'design.stuetzeSetzen', { storeyId, at: { x: 0, y: 0 } });
    const columnId = (cRes.patches[0] as { id: string }).id;
    execute(doc, 'design.eigenschaftSetzen', { entityId: columnId, feld: 'profilId', wert: profilId });
    expect(() => execute(doc, 'design.profilLoeschen', { profilId })).toThrow(CommandError);
    execute(doc, 'design.eigenschaftSetzen', { entityId: columnId, feld: 'profilId', wert: '' });
    expect(doc.get<Column>(columnId)!.profilId).toBeUndefined();
    execute(doc, 'design.profilLoeschen', { profilId });
    expect(doc.get<Profil>(profilId)).toBeUndefined();
  });
});

describe('design.profilErstellen/-Loeschen — Undo', () => {
  it('EIN Undo-Schritt entfernt ein neu erstelltes Profil wieder vollständig', () => {
    const doc = new KosmoDoc();
    const res = profilErstellen(doc);
    const id = (res.patches[0] as { id: string }).id;
    expect(doc.get<Profil>(id)).toBeDefined();
    doc.apply(invertPatches(res.patches));
    expect(doc.get<Profil>(id)).toBeUndefined();
  });

  it('EIN Undo-Schritt stellt ein gelöschtes Profil wieder her', () => {
    const doc = new KosmoDoc();
    const res = profilErstellen(doc);
    const id = (res.patches[0] as { id: string }).id;
    const delRes = execute(doc, 'design.profilLoeschen', { profilId: id });
    expect(doc.get<Profil>(id)).toBeUndefined();
    doc.apply(invertPatches(delRes.patches));
    expect(doc.get<Profil>(id)).toBeDefined();
    expect(doc.get<Profil>(id)!.name).toBe('Test-Profil');
  });
});

describe('design.eigenschaftSetzen — profilId (column/beam)', () => {
  it('setzt profilId an einer Stütze auf eine gültige Id', () => {
    const doc = new KosmoDoc();
    const storeyId = geschoss(doc);
    const pRes = profilErstellen(doc);
    const profilId = (pRes.patches[0] as { id: string }).id;
    const cRes = execute(doc, 'design.stuetzeSetzen', { storeyId, at: { x: 0, y: 0 } });
    const columnId = (cRes.patches[0] as { id: string }).id;
    execute(doc, 'design.eigenschaftSetzen', { entityId: columnId, feld: 'profilId', wert: profilId });
    expect(doc.get<Column>(columnId)!.profilId).toBe(profilId);
  });

  it('lehnt eine unbekannte profilId ab', () => {
    const doc = new KosmoDoc();
    const storeyId = geschoss(doc);
    const cRes = execute(doc, 'design.stuetzeSetzen', { storeyId, at: { x: 0, y: 0 } });
    const columnId = (cRes.patches[0] as { id: string }).id;
    expect(() =>
      execute(doc, 'design.eigenschaftSetzen', { entityId: columnId, feld: 'profilId', wert: 'profil_nope' }),
    ).toThrow(CommandError);
  });

  it('leerer String entfernt eine gesetzte profilId wieder (Feld verschwindet ganz)', () => {
    const doc = new KosmoDoc();
    const storeyId = geschoss(doc);
    const pRes = profilErstellen(doc);
    const profilId = (pRes.patches[0] as { id: string }).id;
    const cRes = execute(doc, 'design.stuetzeSetzen', { storeyId, at: { x: 0, y: 0 } });
    const columnId = (cRes.patches[0] as { id: string }).id;
    execute(doc, 'design.eigenschaftSetzen', { entityId: columnId, feld: 'profilId', wert: profilId });
    execute(doc, 'design.eigenschaftSetzen', { entityId: columnId, feld: 'profilId', wert: '' });
    const column = doc.get<Column>(columnId)!;
    expect(column.profilId).toBeUndefined();
    expect(Object.prototype.hasOwnProperty.call(column, 'profilId')).toBe(false);
  });

  it('funktioniert ebenso für Unterzug (beam)', () => {
    const doc = new KosmoDoc();
    const storeyId = geschoss(doc);
    const pRes = profilErstellen(doc);
    const profilId = (pRes.patches[0] as { id: string }).id;
    const bRes = execute(doc, 'design.unterzugZeichnen', {
      storeyId, a: { x: 0, y: 0 }, b: { x: 3000, y: 0 },
    });
    const beamId = (bRes.patches[0] as { id: string }).id;
    execute(doc, 'design.eigenschaftSetzen', { entityId: beamId, feld: 'profilId', wert: profilId });
    expect(doc.get<Beam>(beamId)!.profilId).toBe(profilId);
  });
});

describe('GOLDEN-GUARD — derive/scene deriveColumn/deriveBeam OHNE profilId bleiben byte-identisch', () => {
  it('deriveColumn (rechteck, ohne profilId) entspricht exakt extrudePolygon(columnOutline(column), …)', () => {
    const doc = new KosmoDoc();
    const storeyId = geschoss(doc);
    const cRes = execute(doc, 'design.stuetzeSetzen', {
      storeyId, at: { x: 1000, y: 500 }, profil: 'rechteck', b: 300, t: 400, material: 'beton', rotationGrad: 30,
    });
    const columnId = (cRes.patches[0] as { id: string }).id;
    const column = doc.get<Column>(columnId)!;
    const storey = doc.get(storeyId)! as { elevation: number; height: number };
    const erwartet = extrudePolygon(column.id, column.material, columnOutline(column), [], storey.elevation, storey.elevation + storey.height);
    const artefakt = deriveEntity(doc, columnId)!;
    expect(Array.from(artefakt.positions)).toEqual(Array.from(erwartet.positions));
    expect(Array.from(artefakt.normals)).toEqual(Array.from(erwartet.normals));
    expect(Array.from(artefakt.indices)).toEqual(Array.from(erwartet.indices));
    expect(Array.from(artefakt.edges)).toEqual(Array.from(erwartet.edges));
  });

  it('deriveColumn (rund, ohne profilId) bleibt ebenso byte-identisch', () => {
    const doc = new KosmoDoc();
    const storeyId = geschoss(doc);
    const cRes = execute(doc, 'design.stuetzeSetzen', {
      storeyId, at: { x: 0, y: 0 }, profil: 'rund', b: 400, material: 'stahl',
    });
    const columnId = (cRes.patches[0] as { id: string }).id;
    const column = doc.get<Column>(columnId)!;
    const storey = doc.get(storeyId)! as { elevation: number; height: number };
    const erwartet = extrudePolygon(column.id, column.material, columnOutline(column), [], storey.elevation, storey.elevation + storey.height);
    const artefakt = deriveEntity(doc, columnId)!;
    expect(Array.from(artefakt.positions)).toEqual(Array.from(erwartet.positions));
    expect(Array.from(artefakt.indices)).toEqual(Array.from(erwartet.indices));
  });

  it('deriveBeam (ohne profilId) entspricht exakt dem bisherigen Rechteck-Eigenbau', () => {
    const doc = new KosmoDoc();
    const storeyId = geschoss(doc);
    const bRes = execute(doc, 'design.unterzugZeichnen', {
      storeyId, a: { x: 0, y: 0 }, b: { x: 4000, y: 1000 }, breite: 250, hoehe: 450, material: 'holz-bsh',
    });
    const beamId = (bRes.patches[0] as { id: string }).id;
    const beam = doc.get<Beam>(beamId)!;
    const storey = doc.get(storeyId)! as { elevation: number; height: number };
    const len = Math.hypot(beam.b.x - beam.a.x, beam.b.y - beam.a.y);
    const d = { x: (beam.b.x - beam.a.x) / len, y: (beam.b.y - beam.a.y) / len };
    const n = { x: -d.y, y: d.x };
    const h = beam.breite / 2;
    const P = (p: { x: number; y: number }, off: number) => ({ x: p.x + n.x * off, y: p.y + n.y * off });
    const zTop = storey.elevation + storey.height;
    const erwartet = extrudePolygon(
      beam.id, beam.material,
      [P(beam.a, -h), P(beam.b, -h), P(beam.b, h), P(beam.a, h)],
      [], zTop - beam.hoehe, zTop,
    );
    const artefakt = deriveEntity(doc, beamId)!;
    expect(Array.from(artefakt.positions)).toEqual(Array.from(erwartet.positions));
    expect(Array.from(artefakt.normals)).toEqual(Array.from(erwartet.normals));
    expect(Array.from(artefakt.indices)).toEqual(Array.from(erwartet.indices));
    expect(Array.from(artefakt.edges)).toEqual(Array.from(erwartet.edges));
  });
});

describe('derive/scene — deriveColumn/deriveBeam MIT gesetzter profilId', () => {
  it('Stütze mit profilId nutzt die Profil-Kontur statt des Rechteck-Eigenbaus', () => {
    const doc = new KosmoDoc();
    const storeyId = geschoss(doc);
    const pRes = profilErstellen(doc, { form: 'rund', b: undefined, h: undefined, d: 500 });
    const profilId = (pRes.patches[0] as { id: string }).id;
    const cRes = execute(doc, 'design.stuetzeSetzen', {
      storeyId, at: { x: 0, y: 0 }, profil: 'rechteck', b: 300, material: 'stahl',
    });
    const columnId = (cRes.patches[0] as { id: string }).id;
    const ohneProfil = deriveEntity(doc, columnId)!;
    execute(doc, 'design.eigenschaftSetzen', { entityId: columnId, feld: 'profilId', wert: profilId });
    const mitProfil = deriveEntity(doc, columnId)!;
    // Rund-Profil (d=500) hat mehr Eckpunkte als das rechteck-Eigenbau-Profil (b=300)
    expect(mitProfil.positions.length).not.toBe(ohneProfil.positions.length);
    // Bounding-Radius entspricht ~250mm (d/2), nicht dem 300er-Rechteck
    let maxDist = 0;
    for (let i = 0; i < mitProfil.positions.length; i += 3) {
      maxDist = Math.max(maxDist, Math.hypot(mitProfil.positions[i]!, mitProfil.positions[i + 1]!));
    }
    expect(maxDist).toBeCloseTo(250, -1);
  });

  it('Unterzug mit profilId (stahl-i) nutzt den echten Querschnitt: Höhe = Profil-h statt Beam.hoehe', () => {
    const doc = new KosmoDoc();
    const storeyId = geschoss(doc);
    const pRes = profilErstellen(doc, { form: 'stahl-i', b: 150, h: 300, steg: 8, flansch: 12 });
    const profilId = (pRes.patches[0] as { id: string }).id;
    const bRes = execute(doc, 'design.unterzugZeichnen', {
      storeyId, a: { x: 0, y: 0 }, b: { x: 4000, y: 0 }, breite: 250, hoehe: 450, material: 'stahl',
    });
    const beamId = (bRes.patches[0] as { id: string }).id;
    execute(doc, 'design.eigenschaftSetzen', { entityId: beamId, feld: 'profilId', wert: profilId });
    const artefakt = deriveEntity(doc, beamId)!;
    const storey = doc.get(storeyId)! as { elevation: number; height: number };
    const zTop = storey.elevation + storey.height;
    let zMin = Infinity;
    let zMax = -Infinity;
    for (let i = 2; i < artefakt.positions.length; i += 3) {
      zMin = Math.min(zMin, artefakt.positions[i]!);
      zMax = Math.max(zMax, artefakt.positions[i]!);
    }
    // Profil-Höhe (300mm), NICHT Beam.hoehe (450mm); Oberkante an OK Geschoss.
    expect(zMax).toBeCloseTo(zTop, 5);
    expect(zMax - zMin).toBeCloseTo(300, 0);
  });

  it('ohne existierendes Profil (hängende Referenz) fällt deriveColumn ehrlich auf den Eigenbau zurück statt zu werfen', () => {
    const doc = new KosmoDoc();
    const storeyId = geschoss(doc);
    const cRes = execute(doc, 'design.stuetzeSetzen', { storeyId, at: { x: 0, y: 0 } });
    const columnId = (cRes.patches[0] as { id: string }).id;
    // profilId manuell (ohne Command-Schutz) auf eine nicht existierende Id setzen,
    // um den Rückfallpfad in deriveColumn zu prüfen (Guard gegen kaputte Referenzen).
    const column = doc.get<Column>(columnId)!;
    doc.apply([{ id: columnId, before: column, after: { ...column, profilId: 'profil_verwaist' } }]);
    expect(() => deriveEntity(doc, columnId)).not.toThrow();
    expect(deriveEntity(doc, columnId)).not.toBeNull();
  });
});
