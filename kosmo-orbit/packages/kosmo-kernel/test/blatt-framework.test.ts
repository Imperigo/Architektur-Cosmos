import { describe, expect, it } from 'vitest';
import { execute, KosmoDoc, sheetToSvg, type Sheet } from '../src';
import { pruefeGolden } from './golden-helfer';

/**
 * v0.8.0 P4 (docs/V080-PLANKOPF-SPEZ.md §6, «+2 additive Goldens») — Golden
 * `blatt-framework.svg`: ein Demo-Blatt MIT `sheet.plankopf`/`sheet.layout`-
 * Daten (Daten-Guard aktiv, s. `derive/sheet.ts` `rahmenGuard`-Kommentar),
 * ALLE fünf `SheetLayout`-Booleans an, ein platzierter Grundriss (macht den
 * Nordpfeil sichtbar, Spez §1.6), Phase Bauprojekt (BP — hat ein
 * Wasserzeichen, anders als AF), lange Musterwerte (Ellipsen-Kürzung wie im
 * Schwesterngolden `plankopf-framework.svg`). Format A1 quer (Plan-Vorgabe
 * §6: «A1 quer, Heftrand+Faltmarken+Wasserzeichen BP+Plankopf»).
 *
 * Dies ist NICHT der Golden-Sammelwechsel 080 (P7) — dieses Blatt trägt die
 * neuen Felder nur, weil es EXTRA für dieses Golden mit ihnen ausgestattet
 * wird (Daten-Guard, kein Default-Flip). Alle 32 Bestands-Goldens bleiben
 * unberührt, s. Abschlussbericht.
 */

function baueDemoDoc(): { doc: KosmoDoc; sheetId: string } {
  const doc = new KosmoDoc();

  // Ein Geschoss mit einem einfachen Rechteck-Grundriss, damit die
  // Grundriss-Platzierung echte Geometrie liefert (Nordpfeil-Bedingung
  // «Grundriss platziert», Spez §1.6, UND ein sinnvoller `primaryScale` für
  // den Massstabsbalken, s. `derive/sheet.ts`).
  const eg = execute(doc, 'design.geschossErstellen', { name: 'EG', index: 0, elevation: 0, height: 3000 });
  const storeyEg = (eg.patches[0] as { id: string }).id;
  const aufbau = execute(doc, 'design.aufbauErstellen', {
    name: 'AW Beton 36',
    target: 'wall',
    layers: [{ material: 'beton', thickness: 250, function: 'tragend' }],
  });
  const assemblyId = (aufbau.patches[0] as { id: string }).id;
  const w = (a: { x: number; y: number }, b: { x: number; y: number }) =>
    execute(doc, 'design.wandZeichnen', { storeyId: storeyEg, a, b, assemblyId });
  w({ x: 0, y: 0 }, { x: 12000, y: 0 });
  w({ x: 12000, y: 0 }, { x: 12000, y: 8000 });
  w({ x: 12000, y: 8000 }, { x: 0, y: 8000 });
  w({ x: 0, y: 8000 }, { x: 0, y: 0 });

  // Projekt-/Büro-Stammdaten — bewusst lange Musterwerte (Ellipsen-Kürzung
  // wie im Schwesterngolden `plankopf-framework.svg`, s. dessen
  // `langeMusterdaten()`-Kommentar).
  execute(doc, 'design.projektInfoSetzen', {
    bauherr: 'Eine sehr lange Bauherrschaftsbezeichnung mit vielen Wörtern und Zusätzen GmbH',
    adresse: 'Eine ziemlich lange Standortadresse mit Hausnummer 4711',
    parzelleNr: 'Parzelle-Nr-9988776655',
    verfasser: 'Baubüro Andrin AG',
    projektCode: 'SEE',
  });
  execute(doc, 'publish.bueroSetzen', {
    name: 'Musterbüro für Architektur und Städtebau Andrin AG',
    adresse: 'Sehr lange Musterstrasse 123456789, 8000 Zürich, Schweiz',
    kuerzel: 'MAA',
  });
  execute(doc, 'design.siaPhaseSetzen', { siaPhase: 'bauprojekt' }); // → Matrix-Stufe BP (hat ein Wasserzeichen)
  execute(doc, 'design.projektNameSetzen', { name: 'Ein ausserordentlich langer Projektname zur Prüfung der Ellipsen-Kürzung' });

  // Blatt A1 quer (Spez §6 Vorgabe), Grundriss + Plankopf-Felder + Layout-
  // Schalter ALLE an.
  const blatt = execute(doc, 'publish.blattErstellen', { name: 'Grundriss EG', format: 'A1', orientation: 'quer' });
  const sheetId = (blatt.patches[0] as { id: string }).id;
  execute(doc, 'publish.ansichtPlatzieren', {
    sheetId,
    view: 'grundriss',
    storeyId: storeyEg,
    scale: 100,
    x: 300,
    y: 260,
    title: 'Grundriss EG',
  });
  execute(doc, 'publish.plankopfSetzen', {
    sheetId,
    patch: {
      inhalt: 'Grundriss Erdgeschoss mit sehr langem Planinhalts-Titeltext zur Überlänge-Prüfung',
      planNummer: '101',
      disziplin: 'A',
      geschossCode: 'EG',
      gezeichnet: 'Ein sehr langes Zeichner-Kürzel-Beispiel',
      geprueft: 'Ein sehr langes Prüfer-Kürzel-Beispiel',
      datum: '15.07.2026',
    },
  });
  execute(doc, 'publish.blattLayoutSetzen', {
    sheetId,
    patch: { heftrand: true, faltmarken: true, wasserzeichen: true, massstabsbalken: true, nordpfeil: true },
  });
  execute(doc, 'publish.revisionErfassen', { sheetId, text: 'Eine sehr lange Revisionstext-Beschreibung', datum: '15.07.2026' });

  return { doc, sheetId };
}

describe('Golden — blatt-framework.svg (A1 quer, volles Plankopf-Framework unter Daten-Guard)', () => {
  it('das Demo-Blatt ist byte-identisch zur committeten Golden-Referenz', () => {
    const { doc, sheetId } = baueDemoDoc();
    const svg = sheetToSvg(doc, sheetId, { projectName: doc.settings.projectName, date: '15.07.2026' });
    pruefeGolden(svg, new URL('./golden/blatt-framework.svg', import.meta.url));
  });

  it('rendert genau eine <g data-teil="plankopf">-Gruppe (180×55mm-Framework, kein Alt-Kopf daneben)', () => {
    const { doc, sheetId } = baueDemoDoc();
    const svg = sheetToSvg(doc, sheetId, { projectName: doc.settings.projectName, date: '15.07.2026' });
    expect(svg.match(/<g data-teil="plankopf">/g)).toHaveLength(1);
    // Alt-Kopf-Erkennungsmerkmal (font-size="3"-Gruppe des kompakten
    // Fusskopfs) darf NICHT gleichzeitig auftreten (Ersetzungslogik).
    expect(svg).not.toContain('<g font-size="3">');
  });

  it('rendert mindestens eine <g data-teil="blattlayout">-Gruppe (Rahmen/Faltmarken/Lochung + Wasserzeichen/Massstabsbalken/Nordpfeil)', () => {
    const { doc, sheetId } = baueDemoDoc();
    const svg = sheetToSvg(doc, sheetId, { projectName: doc.settings.projectName, date: '15.07.2026' });
    const treffer = svg.match(/<g data-teil="blattlayout">/g);
    expect(treffer).not.toBeNull();
    expect(treffer!.length).toBeGreaterThanOrEqual(2);
  });

  it('zeigt ein Wasserzeichen (Phase BP hat eines) statt eines AF-Stempels', () => {
    const { doc, sheetId } = baueDemoDoc();
    const svg = sheetToSvg(doc, sheetId, { projectName: doc.settings.projectName, date: '15.07.2026' });
    expect(svg).toContain('data-teil="wasserzeichen"');
    expect(svg).not.toContain('data-teil="af-stempel"');
  });

  it('zeigt einen Nordpfeil (Grundriss ist platziert)', () => {
    const { doc, sheetId } = baueDemoDoc();
    const svg = sheetToSvg(doc, sheetId, { projectName: doc.settings.projectName, date: '15.07.2026' });
    expect(svg).toContain('data-teil="nordpfeil"');
  });

  it('zeigt einen Massstabsbalken (Massstab der grössten platzierten Ansicht)', () => {
    const { doc, sheetId } = baueDemoDoc();
    const svg = sheetToSvg(doc, sheetId, { projectName: doc.settings.projectName, date: '15.07.2026' });
    expect(svg).toContain('data-teil="massstabsbalken"');
    expect(svg).toContain('M 1:100');
  });

  it('lange Musterwerte erscheinen gekürzt (Ellipse), nicht im Volltext, wie im Schwesterngolden', () => {
    const { doc, sheetId } = baueDemoDoc();
    const svg = sheetToSvg(doc, sheetId, { projectName: doc.settings.projectName, date: '15.07.2026' });
    expect(svg).toContain('…');
    expect(svg).not.toContain('Musterbüro für Architektur und Städtebau Andrin AG');
  });

  it('Guard-Beweis: ein Blatt ohne plankopf/layout bleibt beim kompakten Alt-Kopf (kein data-teil="plankopf"/"blattlayout")', () => {
    const doc = new KosmoDoc();
    const blatt = execute(doc, 'publish.blattErstellen', { name: 'Blatt ohne Framework-Daten', format: 'A1', orientation: 'quer' });
    const sheetId = (blatt.patches[0] as { id: string }).id;
    const svg = sheetToSvg(doc, sheetId, { projectName: doc.settings.projectName, date: '15.07.2026' });
    expect(svg).not.toContain('data-teil="plankopf"');
    expect(svg).not.toContain('data-teil="blattlayout"');
    expect(svg).toContain('<g font-size="3">');
    const sheet = doc.get<Sheet>(sheetId)!;
    expect(sheet.plankopf).toBeUndefined();
    expect(sheet.layout).toBeUndefined();
  });
});
