import { describe, expect, it } from 'vitest';
import { KosmoDoc, execute, invertPatches, type Aussparung, type Beam, type Slab } from '../src';

/**
 * v0.8.11 P-A3 (`docs/V0811-SPEZ.md` §2 E3) — die zwei neuen In-Place-Setter
 * `design.deckeGeometrieSetzen` und `design.unterzugGeometrieSetzen`
 * (Muster `wandGeometrieSetzen`/`massKetteGeometrieSetzen`, Linie 0.8.6 E1 /
 * 0.8.9 E8). Der eigentliche Grund für in place statt Löschen+Neusetzen wird
 * hier BEWIESEN, nicht nur behauptet: die Aussparung der Decke bzw. das
 * Etikett des Unterzugs überleben den Ecken-/Achsen-Zug.
 */

function baueGeschoss(doc: KosmoDoc): string {
  const eg = execute(doc, 'design.geschossErstellen', { name: 'EG', index: 0, elevation: 0, height: 3000 });
  return (eg.patches[0] as { id: string }).id;
}

function baueDecke(doc: KosmoDoc, storeyId: string): string {
  const r = execute(doc, 'design.deckeZeichnen', {
    storeyId,
    outline: [
      { x: 0, y: 0 },
      { x: 8000, y: 0 },
      { x: 8000, y: 6000 },
      { x: 0, y: 6000 },
    ],
  });
  return (r.patches[0] as { id: string }).id;
}

function baueUnterzug(doc: KosmoDoc, storeyId: string): string {
  const r = execute(doc, 'design.unterzugZeichnen', {
    storeyId,
    a: { x: 0, y: 3000 },
    b: { x: 8000, y: 3000 },
    breite: 300,
    hoehe: 400,
  });
  return (r.patches[0] as { id: string }).id;
}

describe('design.deckeGeometrieSetzen — Ecken-Zug in place (v0.8.11 P-A3)', () => {
  it('setzt genau die eine Ecke neu — Identität, thickness und übrige Ecken bleiben', () => {
    const doc = new KosmoDoc();
    const storeyId = baueGeschoss(doc);
    const id = baueDecke(doc, storeyId);
    const vorher = doc.get<Slab>(id)!;
    execute(doc, 'design.deckeGeometrieSetzen', { entityId: id, punktIndex: 2, punkt: { x: 9000, y: 7000 } });
    const nachher = doc.get<Slab>(id)!;
    expect(nachher.id).toBe(id);
    expect(nachher.thickness).toBe(vorher.thickness);
    expect(nachher.outline).toEqual([vorher.outline[0], vorher.outline[1], { x: 9000, y: 7000 }, vorher.outline[3]]);
  });

  it('DER Beweis für in place: die Aussparung der Decke überlebt den Ecken-Zug', () => {
    const doc = new KosmoDoc();
    const storeyId = baueGeschoss(doc);
    const id = baueDecke(doc, storeyId);
    const a = execute(doc, 'design.aussparungSetzen', {
      hostId: id,
      at: { x: 4000, y: 3000 },
      breite: 800,
      hoehe: 800,
    });
    const aussparungId = (a.patches[0] as { id: string }).id;
    execute(doc, 'design.deckeGeometrieSetzen', { entityId: id, punktIndex: 0, punkt: { x: -500, y: -500 } });
    const aussparung = doc.get<Aussparung>(aussparungId);
    expect(aussparung).toBeDefined();
    expect(aussparung!.hostId).toBe(id);
  });

  it('EIN Undo-Schritt stellt die alte Ecke wieder her; punktIndex ausserhalb wirft ohne Patch', () => {
    const doc = new KosmoDoc();
    const storeyId = baueGeschoss(doc);
    const id = baueDecke(doc, storeyId);
    const vorher = doc.get<Slab>(id)!;
    const res = execute(doc, 'design.deckeGeometrieSetzen', { entityId: id, punktIndex: 1, punkt: { x: 12000, y: -1000 } });
    doc.apply(invertPatches(res.patches));
    expect(doc.get<Slab>(id)!.outline).toEqual(vorher.outline);

    const snapshot = JSON.stringify(doc.toJSON());
    expect(() =>
      execute(doc, 'design.deckeGeometrieSetzen', { entityId: id, punktIndex: 99, punkt: { x: 0, y: 0 } }),
    ).toThrow(/ausserhalb des Umrisses/);
    expect(JSON.stringify(doc.toJSON())).toBe(snapshot);
  });
});

describe('design.unterzugGeometrieSetzen — Achsen-Zug in place (v0.8.11 P-A3)', () => {
  it('setzt a und/oder b — Identität, breite/hoehe/material bleiben', () => {
    const doc = new KosmoDoc();
    const storeyId = baueGeschoss(doc);
    const id = baueUnterzug(doc, storeyId);
    const vorher = doc.get<Beam>(id)!;
    execute(doc, 'design.unterzugGeometrieSetzen', { entityId: id, b: { x: 6000, y: 4000 } });
    const nachher = doc.get<Beam>(id)!;
    expect(nachher.id).toBe(id);
    expect(nachher.a).toEqual(vorher.a);
    expect(nachher.b).toEqual({ x: 6000, y: 4000 });
    expect(nachher.breite).toBe(vorher.breite);
    expect(nachher.hoehe).toBe(vorher.hoehe);
    expect(nachher.material).toBe(vorher.material);
  });

  it('DER Beweis für in place: das Etikett am Unterzug überlebt den Achsen-Zug', () => {
    const doc = new KosmoDoc();
    const storeyId = baueGeschoss(doc);
    const id = baueUnterzug(doc, storeyId);
    const et = execute(doc, 'design.etikettSetzen', { targetId: id, at: { x: 4000, y: 2500 }, inhalt: 'aufbau' });
    const etikettId = (et.patches[0] as { id: string }).id;
    execute(doc, 'design.unterzugGeometrieSetzen', { entityId: id, a: { x: 500, y: 3200 } });
    expect(doc.get(etikettId)).toBeDefined();
  });

  it('wirft ohne a UND b, wirft unter 10 cm Ziel-Achse — Doc bleibt byte-gleich', () => {
    const doc = new KosmoDoc();
    const storeyId = baueGeschoss(doc);
    const id = baueUnterzug(doc, storeyId);
    const snapshot = JSON.stringify(doc.toJSON());
    expect(() => execute(doc, 'design.unterzugGeometrieSetzen', { entityId: id })).toThrow(/mindestens einen Punkt/);
    expect(() =>
      execute(doc, 'design.unterzugGeometrieSetzen', { entityId: id, a: { x: 7950, y: 3000 } }),
    ).toThrow(/mindestens 10 cm/);
    expect(JSON.stringify(doc.toJSON())).toBe(snapshot);
  });

  it('EIN Undo-Schritt stellt die alte Achse wieder her', () => {
    const doc = new KosmoDoc();
    const storeyId = baueGeschoss(doc);
    const id = baueUnterzug(doc, storeyId);
    const vorher = doc.get<Beam>(id)!;
    const res = execute(doc, 'design.unterzugGeometrieSetzen', { entityId: id, a: { x: 100, y: 100 }, b: { x: 5000, y: 5000 } });
    doc.apply(invertPatches(res.patches));
    expect(doc.get<Beam>(id)).toEqual(vorher);
  });
});
