import { describe, expect, it } from 'vitest';
import {
  KosmoDoc,
  execute,
  invertPatches,
  CommandError,
  type Beam,
  type Boundary,
  type Etikett,
  type Furniture,
  type Kommentar,
  type MassKette,
  type Zone,
  type Column,
  type Opening,
} from '../src';

/**
 * PA1-088 (V088-SPEZ §3 E1/E2) — Kernel-Symmetrie:
 *  - E1: `design.verschieben` kennt jetzt masskette/kommentar/furniture/
 *    beam/boundary/etikett, alle in-place (Identität, targetId,
 *    rotationGrad und alle Nicht-Punkt-Felder bleiben; Undo byte-symmetrisch
 *    via invertPatches — Sanktion 2).
 *  - E2: `design.eigenschaftSetzen`/`editableFields` bekommt Zone.number/
 *    raumTyp, Furniture.rotationGrad, Column.material/b/t/rotationGrad,
 *    Beam.breite/hoehe/material, Opening-Detailfelder (typeId, fensterTyp,
 *    rahmenbreite, band, griffseite) — jedes Feld mit Wert-Validierung VOR
 *    dem Patch (Sanktion 3).
 */

function grundgeruest(): { doc: KosmoDoc; storeyId: string; assemblyId: string; wallId: string } {
  const doc = new KosmoDoc();
  const eg = execute(doc, 'design.geschossErstellen', { name: 'EG', index: 0, elevation: 0, height: 3000 });
  const storeyId = (eg.patches[0] as { id: string }).id;
  const aufbau = execute(doc, 'design.aufbauErstellen', {
    name: 'AW Beton 36',
    target: 'wall',
    layers: [{ material: 'beton', thickness: 250, function: 'tragend' }],
  });
  const assemblyId = (aufbau.patches[0] as { id: string }).id;
  const wand = execute(doc, 'design.wandZeichnen', {
    storeyId,
    a: { x: 0, y: 0 },
    b: { x: 8000, y: 0 },
    assemblyId,
  });
  const wallId = (wand.patches[0] as { id: string }).id;
  return { doc, storeyId, assemblyId, wallId };
}

describe('design.verschieben — E1 (V088-SPEZ §3, PA1-088): neue Kind-Zweige', () => {
  it('masskette: alle punkte um dx/dy verschoben, Identität bleibt, Undo byte-symmetrisch', () => {
    const { doc, storeyId } = grundgeruest();
    const r0 = execute(doc, 'design.massKetteSetzen', {
      storeyId,
      punkte: [
        { x: 0, y: 0 },
        { x: 3000, y: 0 },
        { x: 3000, y: 4000 },
      ],
    });
    const id = (r0.patches[0] as { id: string }).id;
    const vorSnapshot = JSON.stringify(doc.toJSON());
    const vorher = doc.get<MassKette>(id)!;

    const r = execute(doc, 'design.verschieben', { entityId: id, dx: 500, dy: -200 });

    const nachher = doc.get<MassKette>(id)!;
    expect(nachher.id).toBe(vorher.id);
    expect(nachher.storeyId).toBe(vorher.storeyId);
    expect(nachher.punkte).toEqual([
      { x: 500, y: -200 },
      { x: 3500, y: -200 },
      { x: 3500, y: 3800 },
    ]);
    expect(r.patches).toHaveLength(1);

    doc.apply(invertPatches(r.patches));
    expect(doc.get<MassKette>(id)).toEqual(vorher);
    expect(JSON.stringify(doc.toJSON())).toBe(vorSnapshot);
  });

  it('kommentar: at verschoben, text/autor/status/erstelltAm/storeyId byte-gleich, Undo byte-symmetrisch', () => {
    const { doc, storeyId } = grundgeruest();
    const r0 = execute(doc, 'design.kommentarSetzen', {
      text: 'Bitte prüfen',
      autor: 'Andrin',
      at: { x: 1000, y: 1000 },
      storeyId,
      erstelltAm: '19.07.2026',
    });
    const id = (r0.patches[0] as { id: string }).id;
    const vorSnapshot = JSON.stringify(doc.toJSON());
    const vorher = doc.get<Kommentar>(id)!;

    const r = execute(doc, 'design.verschieben', { entityId: id, dx: -300, dy: 700 });

    const nachher = doc.get<Kommentar>(id)!;
    expect(nachher.id).toBe(vorher.id);
    expect(nachher.at).toEqual({ x: 700, y: 1700 });
    expect(nachher.text).toBe(vorher.text);
    expect(nachher.autor).toBe(vorher.autor);
    expect(nachher.status).toBe(vorher.status);
    expect(nachher.erstelltAm).toBe(vorher.erstelltAm);
    expect(nachher.storeyId).toBe(vorher.storeyId);
    expect(r.patches).toHaveLength(1);

    doc.apply(invertPatches(r.patches));
    expect(doc.get<Kommentar>(id)).toEqual(vorher);
    expect(JSON.stringify(doc.toJSON())).toBe(vorSnapshot);
  });

  it('furniture: at verschoben, rotationGrad UNBERÜHRT, typ/storeyId byte-gleich, Undo byte-symmetrisch', () => {
    const { doc, storeyId } = grundgeruest();
    const r0 = execute(doc, 'design.moebelSetzen', {
      storeyId,
      typ: 'bett-doppel',
      at: { x: 2000, y: 2000 },
      rotationGrad: 45,
    });
    const id = (r0.patches[0] as { id: string }).id;
    const vorSnapshot = JSON.stringify(doc.toJSON());
    const vorher = doc.get<Furniture>(id)!;

    const r = execute(doc, 'design.verschieben', { entityId: id, dx: 400, dy: 400 });

    const nachher = doc.get<Furniture>(id)!;
    expect(nachher.id).toBe(vorher.id);
    expect(nachher.at).toEqual({ x: 2400, y: 2400 });
    expect(nachher.rotationGrad).toBe(45); // unberührt (E1-Vertrag)
    expect(nachher.typ).toBe(vorher.typ);
    expect(nachher.storeyId).toBe(vorher.storeyId);
    expect(r.patches).toHaveLength(1);

    doc.apply(invertPatches(r.patches));
    expect(doc.get<Furniture>(id)).toEqual(vorher);
    expect(JSON.stringify(doc.toJSON())).toBe(vorSnapshot);
  });

  it('beam: a UND b verschoben, breite/hoehe/material/storeyId byte-gleich, Undo byte-symmetrisch', () => {
    const { doc, storeyId } = grundgeruest();
    const r0 = execute(doc, 'design.unterzugZeichnen', {
      storeyId,
      a: { x: 0, y: 3000 },
      b: { x: 5000, y: 3000 },
      breite: 300,
      hoehe: 450,
      material: 'holz-bsh',
    });
    const id = (r0.patches[0] as { id: string }).id;
    const vorSnapshot = JSON.stringify(doc.toJSON());
    const vorher = doc.get<Beam>(id)!;

    const r = execute(doc, 'design.verschieben', { entityId: id, dx: 100, dy: -100 });

    const nachher = doc.get<Beam>(id)!;
    expect(nachher.id).toBe(vorher.id);
    expect(nachher.a).toEqual({ x: 100, y: 2900 });
    expect(nachher.b).toEqual({ x: 5100, y: 2900 });
    expect(nachher.breite).toBe(vorher.breite);
    expect(nachher.hoehe).toBe(vorher.hoehe);
    expect(nachher.material).toBe(vorher.material);
    expect(nachher.storeyId).toBe(vorher.storeyId);
    expect(r.patches).toHaveLength(1);

    doc.apply(invertPatches(r.patches));
    expect(doc.get<Beam>(id)).toEqual(vorher);
    expect(JSON.stringify(doc.toJSON())).toBe(vorSnapshot);
  });

  it('boundary: alle outline-Punkte verschoben, maxHoehe/name/grenzabstand/storeyId byte-gleich, Undo byte-symmetrisch', () => {
    const { doc, storeyId } = grundgeruest();
    const r0 = execute(doc, 'design.baugrenzeSetzen', {
      storeyId,
      outline: [
        { x: -1000, y: -1000 },
        { x: 9000, y: -1000 },
        { x: 9000, y: 7000 },
        { x: -1000, y: 7000 },
      ],
      maxHoehe: 12000,
      name: 'Baugrenze West',
      grenzabstand: 4000,
    });
    const id = (r0.patches[0] as { id: string }).id;
    const vorSnapshot = JSON.stringify(doc.toJSON());
    const vorher = doc.get<Boundary>(id)!;

    const r = execute(doc, 'design.verschieben', { entityId: id, dx: 1000, dy: 1000 });

    const nachher = doc.get<Boundary>(id)!;
    expect(nachher.id).toBe(vorher.id);
    expect(nachher.outline).toEqual([
      { x: 0, y: 0 },
      { x: 10000, y: 0 },
      { x: 10000, y: 8000 },
      { x: 0, y: 8000 },
    ]);
    expect(nachher.maxHoehe).toBe(vorher.maxHoehe);
    expect(nachher.name).toBe(vorher.name);
    expect(nachher.grenzabstand).toBe(vorher.grenzabstand);
    expect(nachher.storeyId).toBe(vorher.storeyId);
    expect(r.patches).toHaveLength(1);

    doc.apply(invertPatches(r.patches));
    expect(doc.get<Boundary>(id)).toEqual(vorher);
    expect(JSON.stringify(doc.toJSON())).toBe(vorSnapshot);
  });

  it('etikett: at verschoben, targetId bleibt EXAKT erhalten (Sanktion 2), inhalt/keynote/storeyId byte-gleich, Undo byte-symmetrisch', () => {
    const { doc, wallId } = grundgeruest();
    const r0 = execute(doc, 'design.keynoteSetzen', { nr: 'K3', text: 'Aufbau AW 36' });
    expect(r0.patches).toHaveLength(1);
    const r1 = execute(doc, 'design.etikettSetzen', {
      targetId: wallId,
      at: { x: 4000, y: -500 },
      inhalt: 'keynote',
      keynote: 'K3',
    });
    const id = (r1.patches[0] as { id: string }).id;
    const vorSnapshot = JSON.stringify(doc.toJSON());
    const vorher = doc.get<Etikett>(id)!;
    expect(vorher.targetId).toBe(wallId); // Ausgangslage bestätigen

    const r = execute(doc, 'design.verschieben', { entityId: id, dx: 200, dy: 300 });

    const nachher = doc.get<Etikett>(id)!;
    expect(nachher.id).toBe(vorher.id);
    expect(nachher.at).toEqual({ x: 4200, y: -200 });
    // Der Beweis: targetId bleibt exakt derselbe Wert, nicht nur "irgendein Wall".
    expect(nachher.targetId).toBe(wallId);
    expect(nachher.targetId).toBe(vorher.targetId);
    expect(nachher.inhalt).toBe(vorher.inhalt);
    expect(nachher.keynote).toBe(vorher.keynote);
    expect(nachher.storeyId).toBe(vorher.storeyId);
    expect(r.patches).toHaveLength(1);

    doc.apply(invertPatches(r.patches));
    expect(doc.get<Etikett>(id)).toEqual(vorher);
    expect(doc.get<Etikett>(id)!.targetId).toBe(wallId);
    expect(JSON.stringify(doc.toJSON())).toBe(vorSnapshot);
  });

  it('unbekannte Kinds werfen weiterhin wie zuvor (Bestandsverhalten unangetastet)', () => {
    const { doc } = grundgeruest();
    expect(() => execute(doc, 'design.verschieben', { entityId: 'nichts-existiert', dx: 1, dy: 1 })).toThrow(
      /existiert nicht/,
    );
  });
});

describe('design.eigenschaftSetzen — E2 (V088-SPEZ §3, PA1-088): neue editableFields', () => {
  it('zone.number: string UND number-Eingabe werden als String übernommen (D2 — vorher ohne Setzweg)', () => {
    const { doc, storeyId } = grundgeruest();
    const rz = execute(doc, 'design.zoneErstellen', {
      storeyId,
      name: 'Wohnen',
      sia: 'HNF',
      outline: [
        { x: 0, y: 0 },
        { x: 4000, y: 0 },
        { x: 4000, y: 4000 },
        { x: 0, y: 4000 },
      ],
    });
    const zoneId = (rz.patches[0] as { id: string }).id;

    execute(doc, 'design.eigenschaftSetzen', { entityId: zoneId, feld: 'number', wert: '1.02' });
    expect(doc.get<Zone>(zoneId)!.number).toBe('1.02');

    // number als String erlaubt (E2-Vertrag) — numerische Eingabe wird
    // gecastet, kein Falschwert möglich (siehe Abschlussbericht §5).
    execute(doc, 'design.eigenschaftSetzen', { entityId: zoneId, feld: 'number', wert: 302 });
    expect(doc.get<Zone>(zoneId)!.number).toBe('302');
    expect(typeof doc.get<Zone>(zoneId)!.number).toBe('string');
  });

  it('zone.raumTyp: gültiger Wert wird gesetzt; ungültiger Wert wirft VOR jedem Patch, Doc bleibt byte-gleich', () => {
    const { doc, storeyId } = grundgeruest();
    const rz = execute(doc, 'design.zoneErstellen', {
      storeyId,
      name: 'Korridor',
      sia: 'VF',
      outline: [
        { x: 0, y: 0 },
        { x: 2000, y: 0 },
        { x: 2000, y: 4000 },
        { x: 0, y: 4000 },
      ],
    });
    const zoneId = (rz.patches[0] as { id: string }).id;

    execute(doc, 'design.eigenschaftSetzen', { entityId: zoneId, feld: 'raumTyp', wert: 'korridor' });
    expect(doc.get<Zone>(zoneId)!.raumTyp).toBe('korridor');

    const vorSnapshot = JSON.stringify(doc.toJSON());
    expect(() =>
      execute(doc, 'design.eigenschaftSetzen', { entityId: zoneId, feld: 'raumTyp', wert: 'garage' }),
    ).toThrow(CommandError);
    expect(() =>
      execute(doc, 'design.eigenschaftSetzen', { entityId: zoneId, feld: 'raumTyp', wert: 'garage' }),
    ).toThrow(/raumTyp muss eines von/);
    expect(JSON.stringify(doc.toJSON())).toBe(vorSnapshot);
  });

  it('furniture.rotationGrad: normalisiert auf [0, 360) statt zu werfen (Entscheid, kein Bestands-Bereich gefunden); nicht-numerischer Wert («schräg», E8-Anker) wirft, Doc byte-gleich', () => {
    const { doc, storeyId } = grundgeruest();
    const rm = execute(doc, 'design.moebelSetzen', { storeyId, typ: 'schrank', at: { x: 1000, y: 1000 }, rotationGrad: 0 });
    const id = (rm.patches[0] as { id: string }).id;

    execute(doc, 'design.eigenschaftSetzen', { entityId: id, feld: 'rotationGrad', wert: 400 });
    expect(doc.get<Furniture>(id)!.rotationGrad).toBe(40); // 400 % 360

    execute(doc, 'design.eigenschaftSetzen', { entityId: id, feld: 'rotationGrad', wert: -30 });
    expect(doc.get<Furniture>(id)!.rotationGrad).toBe(330); // −30 → 330, kein negativer Ablagewert

    const vorSnapshot = JSON.stringify(doc.toJSON());
    expect(() =>
      execute(doc, 'design.eigenschaftSetzen', { entityId: id, feld: 'rotationGrad', wert: 'schräg' }),
    ).toThrow(CommandError);
    expect(JSON.stringify(doc.toJSON())).toBe(vorSnapshot);
  });

  it('column.material: gesetzt; leerer String wirft, Doc byte-gleich', () => {
    const { doc, storeyId } = grundgeruest();
    const rc = execute(doc, 'design.stuetzeSetzen', { storeyId, at: { x: 500, y: 500 }, material: 'beton' });
    const id = (rc.patches[0] as { id: string }).id;

    execute(doc, 'design.eigenschaftSetzen', { entityId: id, feld: 'material', wert: 'stahl' });
    expect(doc.get<Column>(id)!.material).toBe('stahl');

    const vorSnapshot = JSON.stringify(doc.toJSON());
    expect(() => execute(doc, 'design.eigenschaftSetzen', { entityId: id, feld: 'material', wert: '' })).toThrow(
      CommandError,
    );
    expect(JSON.stringify(doc.toJSON())).toBe(vorSnapshot);
  });

  it('column.b/t: im Bestands-Bereich (design.stuetzeSetzen, 80–2000mm) gesetzt; ausserhalb wirft, Doc byte-gleich', () => {
    const { doc, storeyId } = grundgeruest();
    const rc = execute(doc, 'design.stuetzeSetzen', {
      storeyId,
      at: { x: 500, y: 500 },
      profil: 'rechteck',
      b: 300,
      t: 300,
    });
    const id = (rc.patches[0] as { id: string }).id;

    execute(doc, 'design.eigenschaftSetzen', { entityId: id, feld: 'b', wert: 400 });
    expect(doc.get<Column>(id)!.b).toBe(400);
    execute(doc, 'design.eigenschaftSetzen', { entityId: id, feld: 't', wert: 250 });
    expect(doc.get<Column>(id)!.t).toBe(250);

    const vorSnapshot = JSON.stringify(doc.toJSON());
    expect(() => execute(doc, 'design.eigenschaftSetzen', { entityId: id, feld: 'b', wert: 50 })).toThrow(
      CommandError,
    );
    expect(() => execute(doc, 'design.eigenschaftSetzen', { entityId: id, feld: 't', wert: 3000 })).toThrow(
      CommandError,
    );
    expect(JSON.stringify(doc.toJSON())).toBe(vorSnapshot);
  });

  it('column.rotationGrad: dieselbe Normalisierung wie furniture.rotationGrad (gemeinsamer Codepfad, Feld-, nicht Kind-gebunden)', () => {
    const { doc, storeyId } = grundgeruest();
    const rc = execute(doc, 'design.stuetzeSetzen', { storeyId, at: { x: 500, y: 500 } });
    const id = (rc.patches[0] as { id: string }).id;
    execute(doc, 'design.eigenschaftSetzen', { entityId: id, feld: 'rotationGrad', wert: 450 });
    expect(doc.get<Column>(id)!.rotationGrad).toBe(90); // 450 % 360
  });

  it('beam.breite/hoehe: im Bestands-Bereich (design.unterzugZeichnen) gesetzt; ausserhalb wirft, Doc byte-gleich', () => {
    const { doc, storeyId } = grundgeruest();
    const rb = execute(doc, 'design.unterzugZeichnen', {
      storeyId,
      a: { x: 0, y: 3000 },
      b: { x: 5000, y: 3000 },
    });
    const id = (rb.patches[0] as { id: string }).id;

    execute(doc, 'design.eigenschaftSetzen', { entityId: id, feld: 'breite', wert: 250 });
    expect(doc.get<Beam>(id)!.breite).toBe(250);
    execute(doc, 'design.eigenschaftSetzen', { entityId: id, feld: 'hoehe', wert: 500 });
    expect(doc.get<Beam>(id)!.hoehe).toBe(500);
    execute(doc, 'design.eigenschaftSetzen', { entityId: id, feld: 'material', wert: 'stahl' });
    expect(doc.get<Beam>(id)!.material).toBe('stahl');

    const vorSnapshot = JSON.stringify(doc.toJSON());
    expect(() => execute(doc, 'design.eigenschaftSetzen', { entityId: id, feld: 'breite', wert: 40 })).toThrow(
      CommandError,
    );
    expect(() => execute(doc, 'design.eigenschaftSetzen', { entityId: id, feld: 'hoehe', wert: 3500 })).toThrow(
      CommandError,
    );
    expect(JSON.stringify(doc.toJSON())).toBe(vorSnapshot);
  });

  it('opening.typeId: gesetzt; leerer String wirft, Doc byte-gleich', () => {
    const { doc, wallId } = grundgeruest();
    const ro = execute(doc, 'design.oeffnungSetzen', {
      wallId,
      openingType: 'fenster',
      center: 2000,
      width: 1200,
      height: 1400,
      sill: 900,
    });
    const id = (ro.patches[0] as { id: string }).id;

    execute(doc, 'design.eigenschaftSetzen', { entityId: id, feld: 'typeId', wert: 'FT-KAT-01' });
    expect(doc.get<Opening>(id)!.typeId).toBe('FT-KAT-01');

    const vorSnapshot = JSON.stringify(doc.toJSON());
    expect(() => execute(doc, 'design.eigenschaftSetzen', { entityId: id, feld: 'typeId', wert: '' })).toThrow(
      CommandError,
    );
    expect(JSON.stringify(doc.toJSON())).toBe(vorSnapshot);
  });

  it('opening.fensterTyp: gültiger Wert gesetzt; ungültiger wirft, Doc byte-gleich', () => {
    const { doc, wallId } = grundgeruest();
    const ro = execute(doc, 'design.oeffnungSetzen', {
      wallId,
      openingType: 'fenster',
      center: 2000,
      width: 1200,
      height: 1400,
      sill: 900,
    });
    const id = (ro.patches[0] as { id: string }).id;

    execute(doc, 'design.eigenschaftSetzen', { entityId: id, feld: 'fensterTyp', wert: 'zweifluegel' });
    expect(doc.get<Opening>(id)!.fensterTyp).toBe('zweifluegel');

    const vorSnapshot = JSON.stringify(doc.toJSON());
    expect(() =>
      execute(doc, 'design.eigenschaftSetzen', { entityId: id, feld: 'fensterTyp', wert: 'panorama' }),
    ).toThrow(CommandError);
    expect(JSON.stringify(doc.toJSON())).toBe(vorSnapshot);
  });

  it('opening.rahmenbreite: positiver Wert gesetzt; 0/negativ wirft, Doc byte-gleich', () => {
    const { doc, wallId } = grundgeruest();
    const ro = execute(doc, 'design.oeffnungSetzen', {
      wallId,
      openingType: 'fenster',
      center: 2000,
      width: 1200,
      height: 1400,
      sill: 900,
    });
    const id = (ro.patches[0] as { id: string }).id;

    execute(doc, 'design.eigenschaftSetzen', { entityId: id, feld: 'rahmenbreite', wert: 80 });
    expect(doc.get<Opening>(id)!.rahmenbreite).toBe(80);

    const vorSnapshot = JSON.stringify(doc.toJSON());
    expect(() => execute(doc, 'design.eigenschaftSetzen', { entityId: id, feld: 'rahmenbreite', wert: 0 })).toThrow(
      CommandError,
    );
    expect(JSON.stringify(doc.toJSON())).toBe(vorSnapshot);
  });

  it('opening.band: gültiger Wert gesetzt; ungültiger wirft, Doc byte-gleich', () => {
    const { doc, wallId } = grundgeruest();
    const ro = execute(doc, 'design.oeffnungSetzen', {
      wallId,
      openingType: 'tuer',
      center: 2000,
      width: 900,
      height: 2100,
      sill: 0,
    });
    const id = (ro.patches[0] as { id: string }).id;

    execute(doc, 'design.eigenschaftSetzen', { entityId: id, feld: 'band', wert: 'links' });
    expect(doc.get<Opening>(id)!.band).toBe('links');

    const vorSnapshot = JSON.stringify(doc.toJSON());
    expect(() => execute(doc, 'design.eigenschaftSetzen', { entityId: id, feld: 'band', wert: 'mitte' })).toThrow(
      CommandError,
    );
    expect(JSON.stringify(doc.toJSON())).toBe(vorSnapshot);
  });

  it('opening.griffseite: gültiger Wert gesetzt; ungültiger wirft, Doc byte-gleich', () => {
    const { doc, wallId } = grundgeruest();
    const ro = execute(doc, 'design.oeffnungSetzen', {
      wallId,
      openingType: 'tuer',
      center: 2000,
      width: 900,
      height: 2100,
      sill: 0,
    });
    const id = (ro.patches[0] as { id: string }).id;

    execute(doc, 'design.eigenschaftSetzen', { entityId: id, feld: 'griffseite', wert: 'rechts' });
    expect(doc.get<Opening>(id)!.griffseite).toBe('rechts');

    const vorSnapshot = JSON.stringify(doc.toJSON());
    expect(() =>
      execute(doc, 'design.eigenschaftSetzen', { entityId: id, feld: 'griffseite', wert: 'oben' }),
    ).toThrow(CommandError);
    expect(JSON.stringify(doc.toJSON())).toBe(vorSnapshot);
  });

  it('Sanktion 3 — Array-/Objekt-Felder (beschlaege, teilung) bleiben ausgeschlossen: unbekanntes feld wirft am zod-Schema, VOR jedem Patch', () => {
    const { doc, wallId } = grundgeruest();
    const ro = execute(doc, 'design.oeffnungSetzen', {
      wallId,
      openingType: 'fenster',
      center: 2000,
      width: 1200,
      height: 1400,
      sill: 900,
    });
    const id = (ro.patches[0] as { id: string }).id;
    const vorSnapshot = JSON.stringify(doc.toJSON());

    expect(() =>
      execute(doc, 'design.eigenschaftSetzen', { entityId: id, feld: 'beschlaege', wert: 'tuerdruecker' }),
    ).toThrow(CommandError);
    expect(() =>
      execute(doc, 'design.eigenschaftSetzen', { entityId: id, feld: 'teilung', wert: '2x1' }),
    ).toThrow(CommandError);
    expect(JSON.stringify(doc.toJSON())).toBe(vorSnapshot);
  });

  it('Fehlermeldung bei unbekanntem/unerlaubtem Feld je Kind nennt weiterhin die erlaubten Felder (Bestandsmuster :757)', () => {
    const { doc, storeyId } = grundgeruest();
    const rc = execute(doc, 'design.stuetzeSetzen', { storeyId, at: { x: 500, y: 500 } });
    const id = (rc.patches[0] as { id: string }).id;
    expect(() => execute(doc, 'design.eigenschaftSetzen', { entityId: id, feld: 'name', wert: 'x' })).toThrow(
      /möglich: material, b, t, rotationGrad/,
    );
  });
});
