import { describe, expect, it } from 'vitest';
import {
  CommandError,
  History,
  KosmoDoc,
  execute,
  formatBelegungsBericht,
  schlageBlattBelegungVor,
  type Sheet,
} from '../src';

/**
 * Blatt-Auto-Befüllung (Owner-Befund K10) — Kernel-Units für die pure
 * Ableitung `schlageBlattBelegungVor` und den Command `publish.blattFuellen`.
 */

function setupZweiGeschosse() {
  const doc = new KosmoDoc();
  const eg = execute(doc, 'design.geschossErstellen', { name: 'EG', index: 0, elevation: 0, height: 3000 });
  const storeyEg = (eg.patches[0] as { id: string }).id;
  const og = execute(doc, 'design.geschossErstellen', { name: 'OG', index: 1, elevation: 3000, height: 3000 });
  const storeyOg = (og.patches[0] as { id: string }).id;
  const aufbau = execute(doc, 'design.aufbauErstellen', {
    name: 'AW Beton 36',
    target: 'wall',
    layers: [{ material: 'beton', thickness: 250, function: 'tragend' }],
  });
  const assemblyId = (aufbau.patches[0] as { id: string }).id;
  const rechteck = (storeyId: string) => {
    const w = (a: { x: number; y: number }, b: { x: number; y: number }) =>
      execute(doc, 'design.wandZeichnen', { storeyId, a, b, assemblyId });
    w({ x: 0, y: 0 }, { x: 8000, y: 0 });
    w({ x: 8000, y: 0 }, { x: 8000, y: 6000 });
    w({ x: 8000, y: 6000 }, { x: 0, y: 6000 });
    w({ x: 0, y: 6000 }, { x: 0, y: 0 });
  };
  rechteck(storeyEg);
  rechteck(storeyOg);
  // Decke fürs GF — ohne Decke/Volumen bleibt totalGf=0 und die Kennzahlen-
  // Ableitung meldet ehrlich «keine Kennzahlen ableitbar».
  execute(doc, 'design.deckeZeichnen', {
    storeyId: storeyEg,
    outline: [{ x: 0, y: 0 }, { x: 8000, y: 0 }, { x: 8000, y: 6000 }, { x: 0, y: 6000 }],
  });
  const blatt = execute(doc, 'publish.blattErstellen', { name: 'Blatt 1', format: 'A1', orientation: 'quer' });
  const sheetId = (blatt.patches[0] as { id: string }).id;
  return { doc, storeyEg, storeyOg, sheetId };
}

describe('Blatt-Auto-Befüllung (K10) — Ableitung schlageBlattBelegungVor', () => {
  it('leeres Blatt: schlägt beide Grundrisse, Axo, Kennzahlen und einen Render-Platzhalter vor', () => {
    const { doc, storeyEg, storeyOg, sheetId } = setupZweiGeschosse();
    const sheet = doc.get<Sheet>(sheetId)!;
    const vorschlag = schlageBlattBelegungVor(doc, sheet);

    const grundrisse = vorschlag.vorschlaege.filter((v) => v.art === 'grundriss');
    expect(grundrisse.map((v) => (v as { storeyId: string }).storeyId).sort()).toEqual(
      [storeyEg, storeyOg].sort(),
    );
    expect(vorschlag.vorschlaege.some((v) => v.art === 'axo')).toBe(true);
    expect(vorschlag.vorschlaege.some((v) => v.art === 'text')).toBe(true);
    const bild = vorschlag.vorschlaege.find((v) => v.art === 'bild');
    expect(bild).toBeDefined();
    expect((bild as { assetId: string | null }).assetId).toBeNull();

    // Ehrliche Hinweise: kein Schnitt im Modell definiert, kein Render vorhanden
    expect(vorschlag.hinweise.some((h) => h.includes('Kein Schnitt im Modell definiert'))).toBe(true);
    expect(vorschlag.hinweise.some((h) => h.includes('Kein Render im Modell'))).toBe(true);
  });

  it('teilbelegtes Blatt: bereits platzierter Grundriss wird nicht doppelt vorgeschlagen', () => {
    const { doc, storeyEg, storeyOg, sheetId } = setupZweiGeschosse();
    execute(doc, 'publish.ansichtPlatzieren', {
      sheetId, view: 'grundriss', storeyId: storeyEg, scale: 100, x: 200, y: 200,
    });
    const sheet = doc.get<Sheet>(sheetId)!;
    const vorschlag = schlageBlattBelegungVor(doc, sheet);

    const grundrisse = vorschlag.vorschlaege.filter((v) => v.art === 'grundriss');
    expect(grundrisse).toHaveLength(1);
    expect((grundrisse[0] as { storeyId: string }).storeyId).toBe(storeyOg);
  });

  it('Schnitt aus SectionSpec: schon anderswo im Plansatz definierter Schnitt wird übernommen, kein Hinweis mehr', () => {
    const { doc, sheetId } = setupZweiGeschosse();
    const anderesBlatt = execute(doc, 'publish.blattErstellen', { name: 'Blatt 2', format: 'A2' });
    const anderesBlattId = (anderesBlatt.patches[0] as { id: string }).id;
    execute(doc, 'publish.ansichtPlatzieren', {
      sheetId: anderesBlattId,
      view: 'schnitt',
      a: { x: -1000, y: 3000 },
      b: { x: 9000, y: 3000 },
      scale: 100,
      x: 300,
      y: 200,
      title: 'Schnitt A-A',
    });

    const sheet = doc.get<Sheet>(sheetId)!;
    const vorschlag = schlageBlattBelegungVor(doc, sheet);
    const schnitte = vorschlag.vorschlaege.filter((v) => v.art === 'schnitt');
    expect(schnitte).toHaveLength(1);
    expect((schnitte[0] as { title: string }).title).toBe('Schnitt A-A');
    expect(vorschlag.hinweise.some((h) => h.includes('Kein Schnitt im Modell definiert'))).toBe(false);
  });

  it('Modell ohne Decken/Volumen: Kennzahlen-Hinweis statt erfundener Zahlen', () => {
    const doc = new KosmoDoc();
    const eg = execute(doc, 'design.geschossErstellen', { name: 'EG', index: 0, elevation: 0, height: 3000 });
    const storeyId = (eg.patches[0] as { id: string }).id;
    const aufbau = execute(doc, 'design.aufbauErstellen', {
      name: 'AW', target: 'wall', layers: [{ material: 'beton', thickness: 250, function: 'tragend' }],
    });
    const assemblyId = (aufbau.patches[0] as { id: string }).id;
    const w = (a: { x: number; y: number }, b: { x: number; y: number }) =>
      execute(doc, 'design.wandZeichnen', { storeyId, a, b, assemblyId });
    w({ x: 0, y: 0 }, { x: 5000, y: 0 });
    w({ x: 5000, y: 0 }, { x: 5000, y: 4000 });
    w({ x: 5000, y: 4000 }, { x: 0, y: 4000 });
    w({ x: 0, y: 4000 }, { x: 0, y: 0 });
    const blatt = execute(doc, 'publish.blattErstellen', { name: 'B', format: 'A2' });
    const sheetId = (blatt.patches[0] as { id: string }).id;

    const vorschlag = schlageBlattBelegungVor(doc, doc.get<Sheet>(sheetId)!);
    expect(vorschlag.vorschlaege.some((v) => v.art === 'text')).toBe(false);
    expect(
      vorschlag.hinweise.some((h) => h.includes('Keine Kennzahlen ableitbar')),
    ).toBe(true);
  });

  it('Determinismus: zweimalige Ableitung auf demselben Doc-Stand liefert dasselbe Ergebnis', () => {
    const { doc, sheetId } = setupZweiGeschosse();
    const sheet = doc.get<Sheet>(sheetId)!;
    const a = schlageBlattBelegungVor(doc, sheet);
    const b = schlageBlattBelegungVor(doc, sheet);
    expect(a).toEqual(b);
  });

  it('Platzmangel: mehr Kandidaten als freie Rasterzellen — Rest als ehrlicher Hinweis, nicht verschwunden', () => {
    const doc = new KosmoDoc();
    const aufbau = execute(doc, 'design.aufbauErstellen', {
      name: 'AW', target: 'wall', layers: [{ material: 'beton', thickness: 250, function: 'tragend' }],
    });
    const assemblyId = (aufbau.patches[0] as { id: string }).id;
    for (let i = 0; i < 6; i++) {
      const g = execute(doc, 'design.geschossErstellen', {
        name: `G${i}`, index: i, elevation: i * 3000, height: 3000,
      });
      const storeyId = (g.patches[0] as { id: string }).id;
      const w = (a: { x: number; y: number }, b: { x: number; y: number }) =>
        execute(doc, 'design.wandZeichnen', { storeyId, a, b, assemblyId });
      w({ x: 0, y: 0 }, { x: 4000, y: 0 });
      w({ x: 4000, y: 0 }, { x: 4000, y: 3000 });
      w({ x: 4000, y: 3000 }, { x: 0, y: 3000 });
      w({ x: 0, y: 3000 }, { x: 0, y: 0 });
    }
    // A4: klein genug, dass nicht alle 6 Grundrisse + Axo + Render aufs Raster passen
    const blatt = execute(doc, 'publish.blattErstellen', { name: 'Kleines Blatt', format: 'A4', orientation: 'quer' });
    const sheetId = (blatt.patches[0] as { id: string }).id;

    const vorschlag = schlageBlattBelegungVor(doc, doc.get<Sheet>(sheetId)!);
    expect(vorschlag.vorschlaege.length).toBeGreaterThan(0);
    expect(vorschlag.vorschlaege.length).toBeLessThan(6);
    expect(vorschlag.hinweise.some((h) => h.includes('kein freier Platz im Raster'))).toBe(true);
  });
});

describe('formatBelegungsBericht', () => {
  it('meldet Vollständigkeit ohne Hinweise', () => {
    expect(formatBelegungsBericht({ vorschlaege: [], hinweise: [] })).toBe(
      'Blatt bereits vollständig — nichts zu ergänzen',
    );
  });

  it('hängt Hinweise an, auch wenn nichts platziert wurde', () => {
    expect(formatBelegungsBericht({ vorschlaege: [], hinweise: ['x fehlt'] })).toBe(
      'Blatt bereits vollständig — nichts zu ergänzen · Fehlt im Modell: x fehlt',
    );
  });
});

describe('Command publish.blattFuellen', () => {
  it('platziert die Ableitung in EINEM atomaren Patch — Undo macht alles auf einmal rückgängig', () => {
    const { doc, storeyEg, storeyOg, sheetId } = setupZweiGeschosse();
    const history = new History();
    const vorher = doc.get<Sheet>(sheetId)!;
    expect(vorher.placements).toHaveLength(0);

    const res = execute(doc, 'publish.blattFuellen', { sheetId });
    history.record(res.patches);
    expect(res.patches).toHaveLength(1); // ein Patch = ein atomarer Undo-Schritt

    const nachher = doc.get<Sheet>(sheetId)!;
    const storeyIds = nachher.placements.filter((p) => p.view === 'grundriss').map((p) => p.storeyId);
    expect(storeyIds.sort()).toEqual([storeyEg, storeyOg].sort());
    expect(nachher.placements.some((p) => p.view === 'axo')).toBe(true);
    expect(nachher.texte?.length ?? 0).toBeGreaterThan(0);
    expect(nachher.bilder).toHaveLength(1);
    expect(nachher.bilder![0]!.assetId).toBeNull();

    expect(res.summary).toContain('Platziert:');
    expect(res.summary).toContain('Fehlt im Modell');

    history.undo(doc);
    const zurueck = doc.get<Sheet>(sheetId)!;
    expect(zurueck).toEqual(vorher);
  });

  it('zweiter Aufruf auf demselben Blatt: bereits Platziertes wird nicht erneut vorgeschlagen', () => {
    const { doc, sheetId } = setupZweiGeschosse();
    execute(doc, 'publish.blattFuellen', { sheetId });
    const zweitesResultat = execute(doc, 'publish.blattFuellen', { sheetId });
    // Nichts mehr zu tun ausser dem weiterhin fehlenden Schnitt
    expect(zweitesResultat.patches).toHaveLength(0);
    expect(zweitesResultat.summary).toContain('Blatt bereits vollständig');
    expect(zweitesResultat.summary).toContain('Kein Schnitt im Modell definiert');
  });

  it('unbekanntes Blatt wirft CommandError', () => {
    const doc = new KosmoDoc();
    expect(() => execute(doc, 'publish.blattFuellen', { sheetId: 'gibt-es-nicht' })).toThrow(CommandError);
  });
});
