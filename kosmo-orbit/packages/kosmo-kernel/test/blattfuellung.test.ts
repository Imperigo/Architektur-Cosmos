import { describe, expect, it } from 'vitest';
import { pruefeGolden } from './golden-helfer';
import { readFileSync } from 'node:fs';
import {
  BLATT_PACK_DEFAULTS,
  CommandError,
  History,
  KosmoDoc,
  execute,
  formatBelegungsBericht,
  schlageBlattBelegungVor,
  sheetToSvg,
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

/**
 * v0.8.1 P12 (Auto-Pack-Layout-Editor, `docs/V081-SPEZ.md` §7(b)/C-26) —
 * `BlattPackOptions` sind additiv: der dritte, optionale Parameter von
 * `schlageBlattBelegungVor`. Neutralitätstests (P5a-Muster): weggelassen
 * ODER explizit auf `BLATT_PACK_DEFAULTS` gesetzt liefert byte-identische
 * Ergebnisse zum Alt-Stand; jede einzelne Option verändert das Ergebnis nur,
 * wenn sie tatsächlich vom Default abweicht.
 */
describe('P12 Auto-Pack-Optionen (additiv, Alt-Default bleibt byte-gleich)', () => {
  it('Neutralität: weggelassene `optionen` === explizit BLATT_PACK_DEFAULTS', () => {
    const { doc, sheetId } = setupZweiGeschosse();
    const sheet = doc.get<Sheet>(sheetId)!;
    const ohneOptionen = schlageBlattBelegungVor(doc, sheet);
    const mitDefaults = schlageBlattBelegungVor(doc, sheet, { ...BLATT_PACK_DEFAULTS });
    expect(mitDefaults).toEqual(ohneOptionen);
  });

  it('Neutralität: leeres `{}` verhält sich wie weggelassen', () => {
    const { doc, sheetId } = setupZweiGeschosse();
    const sheet = doc.get<Sheet>(sheetId)!;
    const ohneOptionen = schlageBlattBelegungVor(doc, sheet);
    const mitLeeremObjekt = schlageBlattBelegungVor(doc, sheet, {});
    expect(mitLeeremObjekt).toEqual(ohneOptionen);
  });

  it('Neutralität: Golden-Fixtur bleibt mit BLATT_PACK_DEFAULTS byte-gleich zur Golden-Referenz', () => {
    const { doc, sheetId } = autofuellungFixtureDoc();
    execute(doc, 'publish.blattFuellen', { sheetId, optionen: { ...BLATT_PACK_DEFAULTS } });
    const svg = sheetToSvg(doc, sheetId, { projectName: doc.settings.projectName, date: '11.07.2026' });
    pruefeGolden(svg, new URL('./golden/blatt-autofuellung.svg', import.meta.url));
  });

  it('`reihenfolge` reiht die genannte Art nach vorn — Axo vor Grundriss statt umgekehrt', () => {
    const { doc, sheetId } = setupZweiGeschosse();
    const sheet = doc.get<Sheet>(sheetId)!;
    const vorschlag = schlageBlattBelegungVor(doc, sheet, { reihenfolge: ['axo', 'grundriss'] });
    const artenReihenfolge = vorschlag.vorschlaege.map((v) => v.art);
    const idxAxo = artenReihenfolge.indexOf('axo');
    const idxGrundriss = artenReihenfolge.indexOf('grundriss');
    expect(idxAxo).toBeGreaterThanOrEqual(0);
    expect(idxGrundriss).toBeGreaterThanOrEqual(0);
    expect(idxAxo).toBeLessThan(idxGrundriss);
  });

  it('`reihenfolge` lässt nicht genannte Arten in ihrer relativen Standard-Reihenfolge, hinten angehängt', () => {
    const { doc, storeyEg, storeyOg, sheetId } = setupZweiGeschosse();
    const sheet = doc.get<Sheet>(sheetId)!;
    const alt = schlageBlattBelegungVor(doc, sheet);
    const neu = schlageBlattBelegungVor(doc, sheet, { reihenfolge: ['axo'] });
    // Axo zuerst, danach exakt dieselbe relative Reihenfolge wie im Alt-Stand
    expect(neu.vorschlaege[0]!.art).toBe('axo');
    const altOhneAxo = alt.vorschlaege.filter((v) => v.art !== 'axo').map((v) => v.art);
    const neuOhneAxo = neu.vorschlaege.slice(1).map((v) => v.art);
    expect(neuOhneAxo).toEqual(altOhneAxo);
    // Geschoss-Zuordnung unangetastet — reine Reihenfolge, keine Dateninhalte geändert
    const grundrisse = neu.vorschlaege.filter((v) => v.art === 'grundriss') as Array<{ storeyId: string }>;
    expect(grundrisse.map((g) => g.storeyId).sort()).toEqual([storeyEg, storeyOg].sort());
  });

  it('`zeilenHoeheMm` kleiner als Default: mehr Rasterzeilen passen aufs Blatt, weniger «kein freier Platz»-Hinweise', () => {
    const doc = new KosmoDoc();
    const aufbau = execute(doc, 'design.aufbauErstellen', {
      name: 'AW', target: 'wall', layers: [{ material: 'beton', thickness: 250, function: 'tragend' }],
    });
    const assemblyId = (aufbau.patches[0] as { id: string }).id;
    for (let i = 0; i < 6; i++) {
      const g = execute(doc, 'design.geschossErstellen', { name: `G${i}`, index: i, elevation: i * 3000, height: 3000 });
      const storeyId = (g.patches[0] as { id: string }).id;
      const w = (a: { x: number; y: number }, b: { x: number; y: number }) =>
        execute(doc, 'design.wandZeichnen', { storeyId, a, b, assemblyId });
      w({ x: 0, y: 0 }, { x: 4000, y: 0 });
      w({ x: 4000, y: 0 }, { x: 4000, y: 3000 });
      w({ x: 4000, y: 3000 }, { x: 0, y: 3000 });
      w({ x: 0, y: 3000 }, { x: 0, y: 0 });
    }
    const blatt = execute(doc, 'publish.blattErstellen', { name: 'Kleines Blatt', format: 'A4', orientation: 'quer' });
    const sheetId = (blatt.patches[0] as { id: string }).id;
    const sheet = doc.get<Sheet>(sheetId)!;

    const altVorschlag = schlageBlattBelegungVor(doc, sheet);
    const neuVorschlag = schlageBlattBelegungVor(doc, sheet, { zeilenHoeheMm: 30 });
    expect(neuVorschlag.vorschlaege.length).toBeGreaterThan(altVorschlag.vorschlaege.length);
  });

  it('`gutterMm`/`randMm` verändern die Platzierungskoordinaten, gleiche Arten-Auswahl (reine Geometrie-Stellschrauben)', () => {
    const { doc, sheetId } = setupZweiGeschosse();
    const sheet = doc.get<Sheet>(sheetId)!;
    const alt = schlageBlattBelegungVor(doc, sheet);
    const neu = schlageBlattBelegungVor(doc, sheet, { gutterMm: 20, randMm: 30 });
    expect(neu.vorschlaege).not.toEqual(alt.vorschlaege);
    // Gleiche Arten-Auswahl in gleicher Zahl (moderate Abstandsänderung auf dem
    // grossen A1-Blatt kostet keine Kapazität) — nur die x/y-Koordinaten weichen ab
    expect(neu.vorschlaege.map((v) => v.art)).toEqual(alt.vorschlaege.map((v) => v.art));
  });

  it('`maxSpalten` reduziert die Spaltenzahl: weniger Rasterzellen, überzählige Kandidaten werden ehrlich als Hinweis gemeldet statt verschwunden', () => {
    const { doc, sheetId } = setupZweiGeschosse();
    const sheet = doc.get<Sheet>(sheetId)!;
    const alt = schlageBlattBelegungVor(doc, sheet);
    const neu = schlageBlattBelegungVor(doc, sheet, { maxSpalten: 1 });
    expect(neu.vorschlaege.length).toBeLessThanOrEqual(alt.vorschlaege.length);
    if (neu.vorschlaege.length < alt.vorschlaege.length) {
      expect(neu.hinweise.some((h) => h.includes('kein freier Platz im Raster'))).toBe(true);
    }
  });

  it('Determinismus bleibt mit `optionen`: zweimalige Ableitung mit denselben Optionen liefert dasselbe Ergebnis', () => {
    const { doc, sheetId } = setupZweiGeschosse();
    const sheet = doc.get<Sheet>(sheetId)!;
    const optionen = { reihenfolge: ['axo', 'text'] as Array<'axo' | 'text'>, zeilenHoeheMm: 120 };
    const a = schlageBlattBelegungVor(doc, sheet, optionen);
    const b = schlageBlattBelegungVor(doc, sheet, optionen);
    expect(a).toEqual(b);
  });

  it('Command publish.blattFuellen mit `optionen`: bleibt EIN atomarer Patch, Undo macht ihn vollständig rückgängig', () => {
    const { doc, sheetId } = setupZweiGeschosse();
    const history = new History();
    const vorher = doc.get<Sheet>(sheetId)!;

    const res = execute(doc, 'publish.blattFuellen', { sheetId, optionen: { reihenfolge: ['axo'], gutterMm: 10 } });
    history.record(res.patches);
    expect(res.patches).toHaveLength(1);

    const nachher = doc.get<Sheet>(sheetId)!;
    expect(nachher.placements.some((p) => p.view === 'axo')).toBe(true);

    history.undo(doc);
    const zurueck = doc.get<Sheet>(sheetId)!;
    expect(zurueck).toEqual(vorher);
  });
});

/** Parzelle als Zone mit `sia:'KF'` (dieselbe Erkennung wie `schwarzplan.ts`
 * — s. dortigen Modul-Kommentar; hier eine kleinere Testkontur). */
const PARZELLE_OUTLINE = [
  { x: -6000, y: -5000 },
  { x: 14000, y: -5000 },
  { x: 14000, y: 11000 },
  { x: -6000, y: 11000 },
];

function baueParzelle(doc: KosmoDoc, storeyId: string): void {
  execute(doc, 'design.zoneErstellen', { storeyId, outline: PARZELLE_OUTLINE, name: 'Parzelle Test', sia: 'KF' });
}

describe('Situationsplan (Owner-Befund K10 + v0.7.0 E4) — Verdrahtung in die Auto-Befüllung', () => {
  it('mit erkennbarer Parzelle: Situationsplan wird vorgeschlagen, kein Lücken-Hinweis', () => {
    const { doc, storeyEg, sheetId } = setupZweiGeschosse();
    baueParzelle(doc, storeyEg);
    const vorschlag = schlageBlattBelegungVor(doc, doc.get<Sheet>(sheetId)!);
    expect(vorschlag.vorschlaege.some((v) => v.art === 'situationsplan')).toBe(true);
    expect(vorschlag.hinweise.some((h) => h.includes('Keine Parzelle erkennbar'))).toBe(false);
  });

  it('ohne Parzelle: ehrlicher Hinweis statt eines erfundenen Situationsplans', () => {
    const { doc, sheetId } = setupZweiGeschosse();
    const vorschlag = schlageBlattBelegungVor(doc, doc.get<Sheet>(sheetId)!);
    expect(vorschlag.vorschlaege.some((v) => v.art === 'situationsplan')).toBe(false);
    expect(vorschlag.hinweise.some((h) => h.includes('Keine Parzelle erkennbar'))).toBe(true);
  });

  it('bereits platzierter Situationsplan wird nicht doppelt vorgeschlagen (No-op)', () => {
    const { doc, storeyEg, sheetId } = setupZweiGeschosse();
    baueParzelle(doc, storeyEg);
    execute(doc, 'publish.ansichtPlatzieren', { sheetId, view: 'situationsplan', scale: 500, x: 200, y: 200 });
    const vorschlag = schlageBlattBelegungVor(doc, doc.get<Sheet>(sheetId)!);
    expect(vorschlag.vorschlaege.some((v) => v.art === 'situationsplan')).toBe(false);
  });

  it('Ansichten (Fassaden) bleiben ein ehrlicher, konstanter Hinweis — SheetPlacement kennt keinen Ansichts-Typ', () => {
    const { doc, sheetId } = setupZweiGeschosse();
    const vorschlag = schlageBlattBelegungVor(doc, doc.get<Sheet>(sheetId)!);
    expect(vorschlag.hinweise.some((h) => h.includes('Ansichten (Fassaden)'))).toBe(true);
  });

  it('formatBelegungsBericht nennt «Situationsplan», wenn platziert', () => {
    expect(
      formatBelegungsBericht({
        vorschlaege: [{ art: 'situationsplan', title: 'Situationsplan', x: 0, y: 0, scale: 500 }],
        hinweise: [],
      }),
    ).toContain('Situationsplan');
  });

  it('publish.blattFuellen platziert den Situationsplan-Slot; sheetToSvg zeigt Parzellengrenze + Footprint', () => {
    const { doc, storeyEg, sheetId } = setupZweiGeschosse();
    baueParzelle(doc, storeyEg);
    execute(doc, 'design.volumenErstellen', {
      storeyId: storeyEg,
      outline: [{ x: 0, y: 0 }, { x: 8000, y: 0 }, { x: 8000, y: 6000 }, { x: 0, y: 6000 }],
      height: 6000,
    });

    const res = execute(doc, 'publish.blattFuellen', { sheetId });
    expect(res.patches).toHaveLength(1);
    expect(res.summary).toContain('Situationsplan');

    const sheet = doc.get<Sheet>(sheetId)!;
    const platzierung = sheet.placements.find((p) => p.view === 'situationsplan');
    expect(platzierung).toBeDefined();
    expect(platzierung!.storeyId).toBeUndefined();
    expect(platzierung!.section).toBeUndefined();

    const svg = sheetToSvg(doc, sheetId, { projectName: 'Test', date: '11.07.2026' });
    expect(svg).toContain('stroke-dasharray'); // Parzellengrenze strichpunktiert
    expect(svg).toContain('#1a1a1a'); // Footprint schwarz gefüllt
  });

  it('publish.ansichtPlatzieren view=situationsplan: Default-Titel «Situationsplan», kein storeyId/section nötig', () => {
    const { doc, sheetId } = setupZweiGeschosse();
    execute(doc, 'publish.ansichtPlatzieren', { sheetId, view: 'situationsplan', scale: 500, x: 200, y: 200 });
    const sheet = doc.get<Sheet>(sheetId)!;
    const pl = sheet.placements.find((p) => p.view === 'situationsplan')!;
    expect(pl.title).toBe('Situationsplan');
    expect(pl.storeyId).toBeUndefined();
    expect(pl.section).toBeUndefined();
  });

  it('Determinismus: mit Parzelle+Footprint liefert schlageBlattBelegungVor zweimal dasselbe Ergebnis', () => {
    const { doc, storeyEg, sheetId } = setupZweiGeschosse();
    baueParzelle(doc, storeyEg);
    execute(doc, 'design.volumenErstellen', {
      storeyId: storeyEg,
      outline: [{ x: 0, y: 0 }, { x: 8000, y: 0 }, { x: 8000, y: 6000 }, { x: 0, y: 6000 }],
      height: 6000,
    });
    const sheet = doc.get<Sheet>(sheetId)!;
    const a = schlageBlattBelegungVor(doc, sheet);
    const b = schlageBlattBelegungVor(doc, sheet);
    expect(a).toEqual(b);
  });
});

const AUTOFUELLUNG_TESTHAUS_OUTLINE = [
  { x: 0, y: 0 },
  { x: 8000, y: 0 },
  { x: 8000, y: 6000 },
  { x: 0, y: 6000 },
];

/**
 * Volles Blatt: Testhaus (Wände + Decke, für Grundriss + Kennzahlen) +
 * anderswo bereits platzierte Schnittlinie (für Schnitt) + Parzelle +
 * MassBody-Footprint (für Situationsplan) — jeder Kandidat der Priorität
 * ausser den ehrlichen Lücken (Ansichten/Render) hat hier echte Geometrie.
 */
function autofuellungFixtureDoc(): { doc: KosmoDoc; sheetId: string } {
  const doc = new KosmoDoc();
  doc.settings.projectName = 'Golden-Blatt-Autofuellung';
  const eg = execute(doc, 'design.geschossErstellen', { name: 'EG', index: 0, elevation: 0, height: 3000 });
  const storeyId = (eg.patches[0] as { id: string }).id;
  const aufbau = execute(doc, 'design.aufbauErstellen', {
    name: 'AW Beton 36',
    target: 'wall',
    layers: [{ material: 'beton', thickness: 250, function: 'tragend' }],
  });
  const assemblyId = (aufbau.patches[0] as { id: string }).id;
  const wand = (a: { x: number; y: number }, b: { x: number; y: number }) =>
    execute(doc, 'design.wandZeichnen', { storeyId, a, b, assemblyId });
  wand({ x: 0, y: 0 }, { x: 8000, y: 0 });
  wand({ x: 8000, y: 0 }, { x: 8000, y: 6000 });
  wand({ x: 8000, y: 6000 }, { x: 0, y: 6000 });
  wand({ x: 0, y: 6000 }, { x: 0, y: 0 });
  execute(doc, 'design.deckeZeichnen', { storeyId, outline: AUTOFUELLUNG_TESTHAUS_OUTLINE });

  // Schnittlinie bereits anderswo im Plansatz platziert (Auto-Befüllung
  // erfindet nie eine eigene Linie, s. Modul-Kommentar blattfuellung.ts).
  const hilfsblatt = execute(doc, 'publish.blattErstellen', { name: 'Hilfsblatt', format: 'A3' });
  const hilfsblattId = (hilfsblatt.patches[0] as { id: string }).id;
  execute(doc, 'publish.ansichtPlatzieren', {
    sheetId: hilfsblattId,
    view: 'schnitt',
    a: { x: -1000, y: 3000 },
    b: { x: 9000, y: 3000 },
    scale: 100,
    x: 150,
    y: 100,
    title: 'Schnitt A-A',
  });

  // Parzelle (KF-Zone) + Footprint-Volumen — für den Situationsplan.
  execute(doc, 'design.zoneErstellen', {
    storeyId,
    outline: [
      { x: -6000, y: -5000 },
      { x: 14000, y: -5000 },
      { x: 14000, y: 11000 },
      { x: -6000, y: 11000 },
    ],
    name: 'Parzelle Golden',
    sia: 'KF',
  });
  execute(doc, 'design.volumenErstellen', {
    storeyId,
    outline: AUTOFUELLUNG_TESTHAUS_OUTLINE,
    height: 6000,
    program: 'wohnen',
  });

  const blatt = execute(doc, 'publish.blattErstellen', { name: 'Blatt Golden', format: 'A1', orientation: 'quer' });
  const sheetId = (blatt.patches[0] as { id: string }).id;
  return { doc, sheetId };
}

describe('Golden-SVG (Blatt-Autofuellung, K10) — Vektor-Qualität des vollen Blatts', () => {
  it('publish.blattFuellen füllt jeden ableitbaren Slot (Grundriss, Schnitt, Situationsplan, Axo, Kennzahlen, Render-Platzhalter)', () => {
    const { doc, sheetId } = autofuellungFixtureDoc();
    const res = execute(doc, 'publish.blattFuellen', { sheetId });
    expect(res.patches).toHaveLength(1);

    const sheet = doc.get<Sheet>(sheetId)!;
    const views = new Set(sheet.placements.map((p) => p.view));
    expect(views.has('grundriss')).toBe(true);
    expect(views.has('schnitt')).toBe(true);
    expect(views.has('situationsplan')).toBe(true);
    expect(views.has('axo')).toBe(true);
    expect(sheet.texte?.length ?? 0).toBeGreaterThan(0);
    expect(sheet.bilder).toHaveLength(1);

    expect(res.summary).toContain('Grundriss');
    expect(res.summary).toContain('Schnitt');
    expect(res.summary).toContain('Situationsplan');
    expect(res.summary).toContain('Axonometrie');
    expect(res.summary).toContain('Kennzahlen');
    // Honestly-remaining gaps: no render asset yet, and elevations stay a documented gap
    expect(res.summary).toContain('Kein Render im Modell');
  });

  it('das befüllte Blatt ist byte-identisch zur committeten Golden-Referenz', () => {
    const { doc, sheetId } = autofuellungFixtureDoc();
    execute(doc, 'publish.blattFuellen', { sheetId });
    const svg = sheetToSvg(doc, sheetId, { projectName: doc.settings.projectName, date: '11.07.2026' });
    pruefeGolden(svg, new URL('./golden/blatt-autofuellung.svg', import.meta.url));
  });
});
