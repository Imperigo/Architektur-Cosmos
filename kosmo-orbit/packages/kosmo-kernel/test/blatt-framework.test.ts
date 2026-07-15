import { describe, expect, it } from 'vitest';
import { execute, KosmoDoc, sheetToSvg, type Sheet } from '../src';
import { pruefeGolden } from './golden-helfer';

/**
 * v0.8.0 P4 (docs/V080-PLANKOPF-SPEZ.md §6, «+2 additive Goldens») — Golden
 * `blatt-framework.svg`: ein Demo-Blatt MIT `sheet.plankopf`/`sheet.layout`-
 * Daten, ALLE fünf `SheetLayout`-Booleans EXPLIZIT auf `true`, ein
 * platzierter Grundriss (macht den Nordpfeil sichtbar, Spez §1.6), Phase
 * Bauprojekt (BP — hat ein Wasserzeichen, anders als AF), lange Musterwerte
 * (Ellipsen-Kürzung wie im Schwesterngolden `plankopf-framework.svg`).
 * Format A1 quer (Plan-Vorgabe §6: «A1 quer,
 * Heftrand+Faltmarken+Wasserzeichen BP+Plankopf»).
 *
 * Bei P4 entstand dieses Golden noch HINTER dem Daten-Guard (P1–P6): ohne
 * `sheet.plankopf`/`sheet.layout` fiel ein Blatt auf den alten kompakten
 * Fusskopf zurück. Seit dem Golden-Sammelwechsel 080 (P7, Spez §5.1) ist der
 * Guard aufgelöst — das volle Framework ist jetzt IMMER aktiv, fehlende
 * `SheetLayout`-Booleans bedeuten die fixierten Post-Wechsel-Defaults statt
 * des alten Fusskopfs. Dieses Demo-Blatt selbst bleibt davon unberührt: alle
 * fünf Booleans stehen hier bereits explizit auf `true` — identisch zum
 * neuen Default —, darum ist `blatt-framework.svg` NICHT Teil der
 * Sammelwechsel-Goldens (byte-identisch, s. docs/GOLDEN-WECHSEL-080.md). Nur
 * der letzte Test unten («Guard-Beweis») prüfte den inzwischen aufgelösten
 * Guard und ist mit P7 entsprechend durch einen «Default-Beweis» ersetzt.
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

  // v0.8.0 P7 (Golden-Sammelwechsel 080, Spez §5.1): löst den früheren
  // «Guard-Beweis» ab — ein Blatt OHNE `plankopf`/`layout` zeigt seit dem
  // Sammelwechsel trotzdem das volle Framework (Post-Wechsel-Default), der
  // alte kompakte Fusskopf (`<g font-size="3">`) ist nicht mehr erreichbar.
  it('Default-Beweis: ein Blatt ohne plankopf/layout zeigt trotzdem das volle Framework (Post-Sammelwechsel-Default, kein Alt-Kopf mehr erreichbar)', () => {
    const doc = new KosmoDoc();
    const blatt = execute(doc, 'publish.blattErstellen', { name: 'Blatt ohne Framework-Daten', format: 'A1', orientation: 'quer' });
    const sheetId = (blatt.patches[0] as { id: string }).id;
    const svg = sheetToSvg(doc, sheetId, { projectName: doc.settings.projectName, date: '15.07.2026' });
    expect(svg).toContain('data-teil="plankopf"');
    expect(svg).toContain('data-teil="blattlayout"');
    expect(svg).not.toContain('<g font-size="3">');
    const sheet = doc.get<Sheet>(sheetId)!;
    expect(sheet.plankopf).toBeUndefined();
    expect(sheet.layout).toBeUndefined();
  });

  // Explizite `false`-Werte bleiben respektiert (P2-Lösch-Semantik) — auch
  // nach dem Default-Flip überschreibt ein bewusst gesetztes `false` den
  // Post-Wechsel-Default (Spez §5.1).
  it('explizites layout:{heftrand:false, faltmarken:false} schaltet Heftrand/Lochung/Faltmarken trotz Default AN gezielt ab', () => {
    const doc = new KosmoDoc();
    const blatt = execute(doc, 'publish.blattErstellen', {
      name: 'Plakat-artig',
      format: 'A0',
      orientation: 'hoch',
      layout: { heftrand: false, faltmarken: false },
    });
    const sheetId = (blatt.patches[0] as { id: string }).id;
    const svg = sheetToSvg(doc, sheetId, { projectName: doc.settings.projectName, date: '15.07.2026' });
    // Framework bleibt aktiv (Plankopf immer da), nur Heftrand/Faltmarken weg.
    expect(svg).toContain('data-teil="plankopf"');
    // Uniform-10mm-Rahmen (keine Heftrand-Asymmetrie) statt `rahmenRect()`.
    expect(svg).toMatch(/<rect x="10" y="10" width="[\d.]+" height="[\d.]+" fill="none"/);
    // Wasserzeichen/Massstabsbalken bleiben Default AN (nicht Teil des Patches).
    expect(svg).toContain('data-teil="wasserzeichen"');
  });
});
