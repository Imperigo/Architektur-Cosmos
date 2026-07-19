import { describe, expect, it } from 'vitest';
import { KosmoDoc, invertPatches } from '../src/model/doc';
import { execute } from '../src/commands/core';
import { CommandError } from '../src/commands/core';
import '../src/commands/design';
import type { Opening, Wall, Zone } from '../src/model/entities';

/**
 * `design.wandGeometrieSetzen` (E1, `docs/V086-SPEZ.md` §3) — verlustfreies
 * Endpunkt-Setzen einer Wand ohne Identitätswechsel, plus die
 * Öffnungs-Regel bei kürzerer Wand. Und `design.zoneErstellen`s
 * `zonenArt`-Erweiterung um `'nachbar'` (E2).
 */

function grundgeruest(): { doc: KosmoDoc; storeyId: string; assemblyId: string; wallId: string } {
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
  const wallId = (wand.patches[0] as { id: string }).id;
  return { doc, storeyId, assemblyId, wallId };
}

describe('design.wandGeometrieSetzen (E1, V086-SPEZ)', () => {
  it('Endpunkt-Verschiebung (Wand wird kürzer, Öffnung passt weiterhin): Identität, height, Umbau-Status, assemblyId, alignment und die Öffnung bleiben byte-gleich', () => {
    const { doc, wallId } = grundgeruest();
    execute(doc, 'design.eigenschaftSetzen', { entityId: wallId, feld: 'height', wert: 3200 });
    execute(doc, 'design.renovationSetzen', { ids: [wallId], status: 'bestand' });

    const oeffnung = execute(doc, 'design.oeffnungSetzen', {
      wallId,
      openingType: 'fenster',
      center: 2000,
      width: 1200,
      height: 1400,
      sill: 900,
      swing: 'links',
    });
    const openingId = (oeffnung.patches[0] as { id: string }).id;
    execute(doc, 'design.fensterParametrieren', {
      openingId,
      fensterTyp: 'zweifluegel',
      teilungN: 2,
      teilungM: 1,
      rahmenbreite: 80,
      fluegelTyp: 'dreh',
    });
    // typeId (model/entities.ts:182) hat keinen eigenen Setter-Command —
    // direkt gepatcht, wie leibungId in beschlag-s2.test.ts:100.
    const vorOeffnung = doc.get<Opening>(openingId)!;
    doc.apply([{ id: openingId, before: vorOeffnung, after: { ...vorOeffnung, typeId: 'FT-KAT-01' } }]);
    const oeffnungVorher = doc.get<Opening>(openingId)!;
    const wallVorher = doc.get<Wall>(wallId)!;
    expect(oeffnungVorher.fensterTyp).toBe('zweifluegel');
    expect(oeffnungVorher.teilung).toEqual({ n: 2, m: 1 });
    expect(oeffnungVorher.typeId).toBe('FT-KAT-01');

    // Wand 8000mm → 6000mm (b rückt näher an a). Öffnung liegt bei 1400–2600,
    // passt weiterhin in [0, 6000] → Fall (1), unverändert, KEIN Patch.
    const r = execute(doc, 'design.wandGeometrieSetzen', { entityId: wallId, b: { x: 6000, y: 0 } });

    const wallNachher = doc.get<Wall>(wallId)!;
    expect(wallNachher.id).toBe(wallVorher.id); // Identität
    expect(wallNachher.a).toEqual({ x: 0, y: 0 });
    expect(wallNachher.b).toEqual({ x: 6000, y: 0 });
    expect(wallNachher.height).toBe(3200); // height bleibt
    expect(wallNachher.meta?.renovation).toBe('bestand'); // Umbau-Status bleibt
    expect(wallNachher.assemblyId).toBe(wallVorher.assemblyId);
    expect(wallNachher.alignment).toBe(wallVorher.alignment);
    expect(wallNachher.heightMode).toBe(wallVorher.heightMode);
    expect(wallNachher.baseOffset).toBe(wallVorher.baseOffset);

    // Öffnung byte-gleich (kein Patch nötig — Fall 1)
    const oeffnungNachher = doc.get<Opening>(openingId)!;
    expect(oeffnungNachher).toEqual(oeffnungVorher);

    expect(r.patches).toHaveLength(1); // NUR der Wand-Patch — die Öffnung bekam keinen
    expect(r.summary).toBe('Wand-Geometrie 6.0 m');
  });

  it('Clamp-Fall: Öffnung, die nicht mehr passt aber selbst schmaler als die neue Wand ist, rutscht bündig an die nähere Wandkante — Breite bleibt', () => {
    const { doc, wallId } = grundgeruest(); // 8000mm lang
    const oeffnung = execute(doc, 'design.oeffnungSetzen', {
      wallId,
      openingType: 'fenster',
      center: 7400,
      width: 1200,
      height: 1400,
      sill: 900,
    });
    const openingId = (oeffnung.patches[0] as { id: string }).id;

    // Wand 8000mm → 7000mm (b rückt näher). Öffnung 6800–8000 passt nicht
    // mehr (hi 8000 > 7000), Breite 1200 ≤ 7000 → clampbar: bündig ans
    // fernere Ende b, center = 7000 − 600 = 6400.
    const r = execute(doc, 'design.wandGeometrieSetzen', { entityId: wallId, b: { x: 7000, y: 0 } });

    const nach = doc.get<Opening>(openingId)!;
    expect(nach.center).toBe(6400);
    expect(nach.width).toBe(1200); // Breite unverändert
    expect(nach.height).toBe(1400);
    expect(nach.sill).toBe(900);
    expect(r.patches).toHaveLength(2); // Wand + eine geclampte Öffnung
    expect(r.summary).toContain('1 Öffnung angepasst');
    expect(r.summary).not.toContain('entfernt');
  });

  it('Entfern-Fall: eine Öffnung breiter als die neue Wandlänge wird im selben Command entfernt und im summarize genannt', () => {
    const { doc, wallId } = grundgeruest(); // 8000mm lang
    const oeffnung = execute(doc, 'design.oeffnungSetzen', {
      wallId,
      openingType: 'fenster',
      center: 4000,
      width: 6000,
      height: 1400,
      sill: 900,
    });
    const openingId = (oeffnung.patches[0] as { id: string }).id;

    // Wand 8000mm → 3000mm: Öffnung (Breite 6000) passt in keiner Lage
    // mehr hinein → entfernt.
    const r = execute(doc, 'design.wandGeometrieSetzen', { entityId: wallId, b: { x: 3000, y: 0 } });

    expect(doc.get<Opening>(openingId)).toBeUndefined();
    expect(r.patches).toHaveLength(2); // Wand + Lösch-Patch der Öffnung
    expect(r.summary).toBe('Wand-Geometrie 3.0 m — 1 Öffnung entfernt');
  });

  it('Null-Länge (a≈b, exakte Ganzzahl-Gleichheit wie design.wandZeichnen) wirft VOR jedem Patch — Wand und Öffnungen bleiben unangetastet', () => {
    const { doc, wallId } = grundgeruest();
    execute(doc, 'design.oeffnungSetzen', {
      wallId,
      openingType: 'fenster',
      center: 2000,
      width: 1200,
      height: 1400,
      sill: 900,
    });
    const vorher = JSON.stringify(doc.toJSON());

    // b auf a's aktuellen Wert gesetzt → neue a === neue b (Wand bleibt bei
    // a=(0,0), b würde ebenfalls (0,0) — Länge 0).
    expect(() => execute(doc, 'design.wandGeometrieSetzen', { entityId: wallId, b: { x: 0, y: 0 } })).toThrow(
      CommandError,
    );
    expect(() => execute(doc, 'design.wandGeometrieSetzen', { entityId: wallId, b: { x: 0, y: 0 } })).toThrow(
      'Wand hat Länge 0',
    );
    expect(JSON.stringify(doc.toJSON())).toBe(vorher); // kein Patch angewendet
  });

  it('mindestens einer der Punkte a/b ist Pflicht', () => {
    const { doc, wallId } = grundgeruest();
    expect(() => execute(doc, 'design.wandGeometrieSetzen', { entityId: wallId })).toThrow(CommandError);
  });

  it('unbekannte oder Nicht-Wand-entityId wird ehrlich abgewiesen', () => {
    const { doc } = grundgeruest();
    expect(() =>
      execute(doc, 'design.wandGeometrieSetzen', { entityId: 'wand-existiert-nicht', b: { x: 1000, y: 0 } }),
    ).toThrow(/existiert nicht/);
  });

  it('Undo (invertPatches) stellt die alte Wand-Geometrie UND eine geclampte sowie eine entfernte Öffnung vollständig wieder her — ein Undo-Schritt für alles', () => {
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
      b: { x: 10000, y: 0 },
      assemblyId,
    });
    const wallId = (wand.patches[0] as { id: string }).id;

    // Öffnung A: wird geclampt (9200 ± 500, passt in 10000, nicht mehr in 4000)
    const a = execute(doc, 'design.oeffnungSetzen', {
      wallId,
      openingType: 'fenster',
      center: 9200,
      width: 1000,
      height: 1400,
      sill: 900,
    });
    const openingA = (a.patches[0] as { id: string }).id;
    // Öffnung B: wird entfernt (Breite 8000 passt in keine 4000mm-Wand)
    const b = execute(doc, 'design.oeffnungSetzen', {
      wallId,
      openingType: 'fenster',
      center: 5000,
      width: 8000,
      height: 1400,
      sill: 900,
    });
    const openingB = (b.patches[0] as { id: string }).id;

    const vorSnapshot = JSON.stringify(doc.toJSON());

    const r = execute(doc, 'design.wandGeometrieSetzen', { entityId: wallId, b: { x: 4000, y: 0 } });
    expect(r.summary).toBe('Wand-Geometrie 4.0 m — 1 Öffnung angepasst, 1 Öffnung entfernt');
    expect(doc.get<Wall>(wallId)!.b).toEqual({ x: 4000, y: 0 });
    expect(doc.get<Opening>(openingA)!.center).toBe(3500); // 4000 − 500
    expect(doc.get<Opening>(openingB)).toBeUndefined();
    expect(r.patches).toHaveLength(3); // Wand + Clamp + Entfernen — EIN Bündel

    doc.apply(invertPatches(r.patches));

    expect(doc.get<Wall>(wallId)!.b).toEqual({ x: 10000, y: 0 });
    expect(doc.get<Opening>(openingA)!.center).toBe(9200);
    expect(doc.get<Opening>(openingB)).toBeDefined();
    expect(doc.get<Opening>(openingB)!.center).toBe(5000);
    expect(doc.get<Opening>(openingB)!.width).toBe(8000);
    expect(JSON.stringify(doc.toJSON())).toBe(vorSnapshot); // vollständige Wiederherstellung
  });

  it('Wand-Verlängerung (a bleibt, b wächst): keine Öffnung betroffen, height/assemblyId/alignment bleiben', () => {
    const { doc, wallId } = grundgeruest();
    execute(doc, 'design.eigenschaftSetzen', { entityId: wallId, feld: 'height', wert: 2900 });
    const vorher = doc.get<Wall>(wallId)!;

    const r = execute(doc, 'design.wandGeometrieSetzen', { entityId: wallId, b: { x: 12000, y: 0 } });

    const nachher = doc.get<Wall>(wallId)!;
    expect(nachher.id).toBe(vorher.id);
    expect(nachher.a).toEqual({ x: 0, y: 0 });
    expect(nachher.b).toEqual({ x: 12000, y: 0 });
    expect(nachher.height).toBe(2900);
    expect(nachher.assemblyId).toBe(vorher.assemblyId);
    expect(nachher.alignment).toBe(vorher.alignment);
    expect(r.summary).toBe('Wand-Geometrie 12.0 m');
    expect(r.patches).toHaveLength(1);
  });
});

describe('design.zoneErstellen — zonenArt «nachbar» (E2, V086-SPEZ)', () => {
  it('akzeptiert zonenArt «nachbar» und persistiert es', () => {
    const doc = new KosmoDoc();
    const eg = execute(doc, 'design.geschossErstellen', { name: 'EG', index: 0, elevation: 0, height: 3000 });
    const storeyId = (eg.patches[0] as { id: string }).id;

    const r = execute(doc, 'design.zoneErstellen', {
      storeyId,
      name: 'Nachbar Ost',
      sia: 'KF',
      zonenArt: 'nachbar',
      outline: [
        { x: 10000, y: 0 },
        { x: 14000, y: 0 },
        { x: 14000, y: 4000 },
        { x: 10000, y: 4000 },
      ],
    });
    const zoneId = (r.patches[0] as { id: string }).id;
    expect(doc.get<Zone>(zoneId)!.zonenArt).toBe('nachbar');
    expect(doc.byKind<Zone>('zone').filter((z) => z.zonenArt === 'nachbar')).toHaveLength(1);

    // Roundtrip über Serialisierung (Yjs-Sync/.kosmo-Pfad) — additiv, kein
    // Feldverlust.
    const json = JSON.parse(JSON.stringify(doc.toJSON()));
    const wieder = KosmoDoc.fromJSON(json);
    expect(wieder.get<Zone>(zoneId)!.zonenArt).toBe('nachbar');
  });

  it('«parzelle» bleibt weiterhin gültig (kein Bruch der bestehenden Nutzung)', () => {
    const doc = new KosmoDoc();
    const eg = execute(doc, 'design.geschossErstellen', { name: 'EG', index: 0, elevation: 0, height: 3000 });
    const storeyId = (eg.patches[0] as { id: string }).id;
    const r = execute(doc, 'design.zoneErstellen', {
      storeyId,
      name: 'Parzelle',
      sia: 'KF',
      zonenArt: 'parzelle',
      outline: [
        { x: -1000, y: -1000 },
        { x: 9000, y: -1000 },
        { x: 9000, y: 7000 },
        { x: -1000, y: 7000 },
      ],
    });
    const zoneId = (r.patches[0] as { id: string }).id;
    expect(doc.get<Zone>(zoneId)!.zonenArt).toBe('parzelle');
  });

  it('lehnt einen unbekannten zonenArt-Wert ab (zod-Schema)', () => {
    const doc = new KosmoDoc();
    const eg = execute(doc, 'design.geschossErstellen', { name: 'EG', index: 0, elevation: 0, height: 3000 });
    const storeyId = (eg.patches[0] as { id: string }).id;
    expect(() =>
      execute(doc, 'design.zoneErstellen', {
        storeyId,
        name: 'Unsinn',
        sia: 'KF',
        zonenArt: 'garten',
        outline: [
          { x: 0, y: 0 },
          { x: 1000, y: 0 },
          { x: 1000, y: 1000 },
        ],
      }),
    ).toThrow(CommandError);
  });
});
