import { describe, expect, it } from 'vitest';
import { execute, KosmoDoc, leporelloFaltung, sheetToSvg, type Sheet } from '../src';
import { pruefeGolden } from './golden-helfer';

/**
 * Golden `rolle-leer.svg` / `rolle-plankopf.svg` (v0.8.1/P13, `docs/
 * V081-SPEZ.md` §7(d), C-27, «Rolle 1600×594 / Leporello-Faltung») —
 * ADDITIVE Goldens, byte-identisch zu KEINER Bestandsdatei: das Rolle-
 * Format (`derive/blattlayout.ts` `BLATT_FORMATE.Rolle`) existierte vor
 * dieser Runde nicht, darum kann kein Bestandsgolden kollidieren.
 *
 * ERWARTUNGSLISTE (vor der Erzeugung dokumentiert, GOLDEN-WECHSEL-Muster
 * ohne bestehende Dateien anzufassen):
 *
 *  - `rolle-leer.svg`: neu erstelltes Blatt `format:'Rolle', orientation:
 *    'quer'` OHNE eigene `plankopf`/`layout`-Daten — Post-Sammelwechsel-
 *    Default (v0.8.0 P7) zeigt trotzdem das volle 180×55-Plankopf-Framework
 *    (leerer Inhalt) UND die neuen Leporello-Knicklinien (Default
 *    `faltmarken !== false`). Papier 1600×594mm, Rahmen bei (20,10)/
 *    1570×574 (Heftrand aktiv), 8 volle Knicklinien (dieselben x-Positionen
 *    wie `faltmarken(1600,594).vertikal`: 1390,1200,1010,820,630,440,250,60).
 *    Default-Doc-Phase ist `wettbewerb` → Matrix-Stufe VS, UND VS hat ein
 *    Wasserzeichen (`PHASEN_MATRIX.VS.wasserzeichenText`, `derive/
 *    plankopf.ts`) — anders als im ersten Entwurf dieser Liste angenommen
 *    erscheint darum «STUDIE — NICHT FÜR AUS…» (Ellipsen-Kürzung wie im
 *    Schwesterngolden) TROTZ fehlender `plankopf`/`layout`-Daten; nur AF
 *    (Ausführung) hat `wasserzeichenText: null`. KEIN Nordpfeil (kein
 *    Grundriss platziert), KEIN Massstabsbalken (keine Platzierung).
 *  - `rolle-plankopf.svg`: dieselbe Rolle, MIT gesetzten Plankopf-/
 *    Projekt-Stammdaten (analog `blatt-framework.svg`s Demo-Doc, aber ohne
 *    Geschoss/Platzierung — Fokus liegt auf Plankopf+Leporello-Koexistenz
 *    auf der langen Fläche) — Plankopf-Text sichtbar, Plancode gesetzt,
 *    dieselben 8 Knicklinien wie oben (Leporello-Guard hängt nicht von
 *    Plankopf-Daten ab), Deckfläche (rechtes 210mm-Feld) überlappt den
 *    Plankopf NICHT (Plankopf liegt bei x=1410..1590, Deckfläche-Feld bei
 *    x=1390..1600 — Knicklinie bei x=1390 liegt links vom Plankopf, das
 *    Feld dazwischen enthält den ganzen Plankopf, wie von der DIN-824-Logik
 *    vorgesehen: das 210mm-Feld ist die «Deckfläche», die den Plankopf trägt).
 */

function baueLeeresRolleBlatt(): { doc: KosmoDoc; sheetId: string } {
  const doc = new KosmoDoc();
  const blatt = execute(doc, 'publish.blattErstellen', { name: 'Rolle leer', format: 'Rolle', orientation: 'quer' });
  const sheetId = (blatt.patches[0] as { id: string }).id;
  return { doc, sheetId };
}

function baueRolleMitPlankopf(): { doc: KosmoDoc; sheetId: string } {
  const doc = new KosmoDoc();
  execute(doc, 'design.projektInfoSetzen', {
    bauherr: 'Bauherrschaft Rolle-Demo AG',
    adresse: 'Musterstrasse 1, 8000 Zürich',
    parzelleNr: 'Parzelle-1234',
    verfasser: 'Baubüro Andrin AG',
    projektCode: 'ROL',
  });
  execute(doc, 'publish.bueroSetzen', { name: 'Baubüro Andrin AG', adresse: 'Musterstrasse 1, 8000 Zürich', kuerzel: 'BAA' });
  execute(doc, 'design.siaPhaseSetzen', { siaPhase: 'bauprojekt' });
  execute(doc, 'design.projektNameSetzen', { name: 'Leporello-Rolle Demoprojekt' });

  const blatt = execute(doc, 'publish.blattErstellen', { name: 'Fassadenabwicklung Rolle', format: 'Rolle', orientation: 'quer' });
  const sheetId = (blatt.patches[0] as { id: string }).id;
  execute(doc, 'publish.plankopfSetzen', {
    sheetId,
    patch: {
      inhalt: 'Fassadenabwicklung Süd–West (Leporello-Rolle)',
      planNummer: '201',
      disziplin: 'A',
      geschossCode: 'ALLE',
      gezeichnet: 'AB',
      geprueft: 'CD',
      datum: '15.07.2026',
    },
  });
  execute(doc, 'publish.blattLayoutSetzen', {
    sheetId,
    patch: { heftrand: true, faltmarken: true, wasserzeichen: true, massstabsbalken: false, nordpfeil: false },
  });
  return { doc, sheetId };
}

describe('Golden — rolle-leer.svg (Rolle 1600×594 quer, kein Plankopf-/Layout-Datensatz, Post-Sammelwechsel-Default)', () => {
  it('das leere Rolle-Blatt ist byte-identisch zur committeten Golden-Referenz', () => {
    const { doc, sheetId } = baueLeeresRolleBlatt();
    const svg = sheetToSvg(doc, sheetId, { projectName: doc.settings.projectName, date: '15.07.2026' });
    pruefeGolden(svg, new URL('./golden/rolle-leer.svg', import.meta.url));
  });

  it('Papierformat 1600×594mm', () => {
    const { doc, sheetId } = baueLeeresRolleBlatt();
    const svg = sheetToSvg(doc, sheetId, { projectName: doc.settings.projectName, date: '15.07.2026' });
    expect(svg).toContain('width="1600mm" height="594mm"');
    expect(svg).toContain('viewBox="0 0 1600 594"');
  });

  it('zeigt trotzdem das volle Plankopf-Framework (Post-Wechsel-Default, kein Alt-Kopf)', () => {
    const { doc, sheetId } = baueLeeresRolleBlatt();
    const svg = sheetToSvg(doc, sheetId, { projectName: doc.settings.projectName, date: '15.07.2026' });
    expect(svg).toContain('data-teil="plankopf"');
    expect(svg).not.toContain('<g font-size="3">');
  });

  it('zeigt das VS-Wasserzeichen (Default-Doc-Phase Wettbewerb hat eines, s. Erwartungsliste-Korrektur oben)', () => {
    const { doc, sheetId } = baueLeeresRolleBlatt();
    const svg = sheetToSvg(doc, sheetId, { projectName: doc.settings.projectName, date: '15.07.2026' });
    expect(svg).toContain('data-teil="wasserzeichen"');
    expect(svg).toContain('STUDIE');
  });

  it('zeigt genau eine <g data-teil="leporello">-Gruppe mit 8 vollen Knicklinien (identisch faltmarken(1600,594).vertikal)', () => {
    const { doc, sheetId } = baueLeeresRolleBlatt();
    const svg = sheetToSvg(doc, sheetId, { projectName: doc.settings.projectName, date: '15.07.2026' });
    const gruppen = svg.match(/<g data-teil="leporello">[\s\S]*?<\/g>/g);
    expect(gruppen).toHaveLength(1);
    const { knicklinien } = leporelloFaltung(1600, 594);
    expect(knicklinien).toEqual([1390, 1200, 1010, 820, 630, 440, 250, 60]);
    for (const x of knicklinien) {
      expect(gruppen![0]).toContain(`<line x1="${x}" y1="0" x2="${x}" y2="594"`);
    }
    expect((gruppen![0]!.match(/<line/g) ?? []).length).toBe(8);
  });

  it('Leporello-Linien sind gestrichelt (stroke-dasharray), unterscheidbar von den kurzen DIN-824-Eckstrichen im blattlayout-Teil', () => {
    const { doc, sheetId } = baueLeeresRolleBlatt();
    const svg = sheetToSvg(doc, sheetId, { projectName: doc.settings.projectName, date: '15.07.2026' });
    expect(svg).toContain('stroke-dasharray="6 3"');
  });
});

describe('Golden — rolle-plankopf.svg (Rolle 1600×594 quer, Plankopf-/Projektdaten gesetzt)', () => {
  it('die Rolle MIT Plankopf-Daten ist byte-identisch zur committeten Golden-Referenz', () => {
    const { doc, sheetId } = baueRolleMitPlankopf();
    const svg = sheetToSvg(doc, sheetId, { projectName: doc.settings.projectName, date: '15.07.2026' });
    pruefeGolden(svg, new URL('./golden/rolle-plankopf.svg', import.meta.url));
  });

  it('zeigt den Plankopf-Inhalt UND den Plancode', () => {
    const { doc, sheetId } = baueRolleMitPlankopf();
    const svg = sheetToSvg(doc, sheetId, { projectName: doc.settings.projectName, date: '15.07.2026' });
    expect(svg).toContain('Fassadenabwicklung');
    expect(svg).toContain('BAA-ROL-BP-A-ALLE-201');
  });

  it('Deckfläche (rechtes 210mm-Feld, Knicklinie bei x=1390) enthält den gesamten Plankopf (x=1410..1590)', () => {
    const { doc, sheetId } = baueRolleMitPlankopf();
    const svg = sheetToSvg(doc, sheetId, { projectName: doc.settings.projectName, date: '15.07.2026' });
    const { felder } = leporelloFaltung(1600, 594);
    const deckflaeche = felder[0]!;
    expect(deckflaeche).toEqual({ x: 1390, y: 0, breite: 210, hoehe: 594 });
    // Plankopf: rechteKante=1590, x=1590-180=1410 -> vollständig in [1390,1600].
    expect(1410).toBeGreaterThanOrEqual(deckflaeche.x);
    expect(1410 + 180).toBeLessThanOrEqual(deckflaeche.x + deckflaeche.breite);
    expect(svg).toContain('data-teil="plankopf"');
  });

  it('Leporello bleibt auch mit Plankopf-Daten unverändert bei 8 Knicklinien (Guard hängt nur an sheet.format/layout.faltmarken, nicht an Plankopf-Feldern)', () => {
    const { doc, sheetId } = baueRolleMitPlankopf();
    const svg = sheetToSvg(doc, sheetId, { projectName: doc.settings.projectName, date: '15.07.2026' });
    const gruppen = svg.match(/<g data-teil="leporello">[\s\S]*?<\/g>/g);
    expect(gruppen).toHaveLength(1);
    expect((gruppen![0]!.match(/<line/g) ?? []).length).toBe(8);
  });
});

describe('Leporello-Guard — A0–A4 bleiben unberührt, explizites faltmarken:false schaltet auch Leporello ab', () => {
  it('A1 (Bestandsformat) rendert NIE eine <g data-teil="leporello">-Gruppe', () => {
    const doc = new KosmoDoc();
    const blatt = execute(doc, 'publish.blattErstellen', { name: 'A1 Kontrollblatt', format: 'A1', orientation: 'quer' });
    const sheetId = (blatt.patches[0] as { id: string }).id;
    const svg = sheetToSvg(doc, sheetId, { projectName: doc.settings.projectName, date: '15.07.2026' });
    expect(svg).not.toContain('data-teil="leporello"');
  });

  it('Rolle MIT explizitem layout.faltmarken:false zeigt weder DIN-824-Kurzmarken noch Leporello-Knicklinien', () => {
    const doc = new KosmoDoc();
    const blatt = execute(doc, 'publish.blattErstellen', {
      name: 'Rolle ohne Faltmarken',
      format: 'Rolle',
      orientation: 'quer',
      layout: { faltmarken: false },
    });
    const sheetId = (blatt.patches[0] as { id: string }).id;
    const svg = sheetToSvg(doc, sheetId, { projectName: doc.settings.projectName, date: '15.07.2026' });
    expect(svg).not.toContain('data-teil="leporello"');
    expect(svg).toContain('data-teil="plankopf"'); // Framework bleibt, nur die Faltmarken/Leporello-Linien fehlen.
  });

  it('Rolle hoch (594×1600): 2 Knicklinien statt 8 (w=594 numerisch identisch zu A1-hoch/A2-quer)', () => {
    const doc = new KosmoDoc();
    const blatt = execute(doc, 'publish.blattErstellen', { name: 'Rolle hoch', format: 'Rolle', orientation: 'hoch' });
    const sheetId = (blatt.patches[0] as { id: string }).id;
    const svg = sheetToSvg(doc, sheetId, { projectName: doc.settings.projectName, date: '15.07.2026' });
    const gruppen = svg.match(/<g data-teil="leporello">[\s\S]*?<\/g>/g);
    expect(gruppen).toHaveLength(1);
    expect((gruppen![0]!.match(/<line/g) ?? []).length).toBe(2);
  });

  it('SheetFormat-Typ akzeptiert "Rolle" auf dem Entity selbst (kein Cast nötig)', () => {
    const doc = new KosmoDoc();
    const blatt = execute(doc, 'publish.blattErstellen', { name: 'Typ-Probe', format: 'Rolle', orientation: 'quer' });
    const sheetId = (blatt.patches[0] as { id: string }).id;
    const sheet = doc.get<Sheet>(sheetId)!;
    expect(sheet.format).toBe('Rolle');
  });
});
