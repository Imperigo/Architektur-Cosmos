import { describe, expect, it } from 'vitest';
import { pruefeGolden } from './golden-helfer';
import {
  KosmoDoc,
  execute,
  blattverzeichnisZeilen,
  sammellegende,
  blattverzeichnisSvg,
  type PublikationsSet,
  type Sheet,
} from '../src';

/**
 * Blattverzeichnis + Sammellegende (v0.8.9 E3/PB3,
 * `docs/SUBSPEZ-BLATTVERZEICHNIS-089.md`) — Kernel-Tests für
 * `derive/publikation.ts`s drei neue, additive Funktionen: die Daten-Ebene
 * (`blattverzeichnisZeilen`/`sammellegende`, ohne SVG-String-Parsing prüfbar)
 * und das Export-Artefakt (`blattverzeichnisSvg`, Golden-SVG-fähig).
 *
 * `GOLDEN_UPDATE=1 npx vitest run blattverzeichnis` regeneriert die beiden
 * Goldens unter `test/golden/` (Muster `golden-helfer.ts`s Kopfkommentar) —
 * NUR nach bewusster, dokumentierter Prüfung (Subspez §6/§8): Erwartungsliste
 * VOR der Regeneration, danach `git diff` Zeile für Zeile reviewen, svg-qa,
 * volle Suite.
 */

/** Ein Geschoss + eine Wand (Etiketten-Anker für den Keynote-Test) + zwei
 * Blätter (Grundriss 1:50 mit Revision, Schnitt 1:100 ohne Revision) in
 * einem Set «Werkplansatz» — die gemeinsame Grundlage beider Goldens
 * (Subspez §6-Fixturtabelle). Ohne Themen/Keynotes/Plankopf-Stammdaten
 * (golden 1); golden 2 baut mit denselben IDs zusätzlich Stammdaten/Thema/
 * Keynotes obendrauf (eigener frischer Doc-Aufbau, s. dortiger Test).
 */
function baueGrundfixture() {
  const doc = new KosmoDoc();
  const eg = execute(doc, 'design.geschossErstellen', { name: 'EG', index: 0, elevation: 0, height: 3000 });
  const storeyId = (eg.patches[0] as { id: string }).id;
  const aufbau = execute(doc, 'design.aufbauErstellen', {
    name: 'AW Beton 20',
    target: 'wall',
    layers: [{ material: 'beton', thickness: 200, function: 'tragend' }],
  });
  const assemblyId = (aufbau.patches[0] as { id: string }).id;
  const wand = execute(doc, 'design.wandZeichnen', {
    storeyId,
    assemblyId,
    a: { x: 0, y: 0 },
    b: { x: 8000, y: 0 },
  });
  const wallId = (wand.patches[0] as { id: string }).id;

  const b1 = execute(doc, 'publish.blattErstellen', { name: 'Grundriss EG', format: 'A1', orientation: 'quer' });
  const sheet1Id = (b1.patches[0] as { id: string }).id;
  execute(doc, 'publish.ansichtPlatzieren', {
    sheetId: sheet1Id,
    view: 'grundriss',
    storeyId,
    scale: 50,
    x: 200,
    y: 200,
  });
  execute(doc, 'publish.revisionErfassen', { sheetId: sheet1Id, text: 'Fenster Küche angepasst', datum: '12.03.2026' });

  const b2 = execute(doc, 'publish.blattErstellen', { name: 'Schnitt A-A', format: 'A3', orientation: 'hoch' });
  const sheet2Id = (b2.patches[0] as { id: string }).id;
  execute(doc, 'publish.ansichtPlatzieren', {
    sheetId: sheet2Id,
    view: 'schnitt',
    a: { x: 0, y: 0 },
    b: { x: 8000, y: 0 },
    scale: 100,
    x: 100,
    y: 100,
  });

  execute(doc, 'publish.setSpeichern', { name: 'Werkplansatz', sheetIds: [sheet1Id, sheet2Id] });
  const set = doc.settings.publikationsSets![0]!;
  return { doc, storeyId, wallId, sheet1Id, sheet2Id, set };
}

describe('blattverzeichnisZeilen', () => {
  it('je Blatt eine Zeile in Set-Reihenfolge, Format/Massstab/Revision wie transmittalCsv, kein Plancode ohne Stammdaten', () => {
    const { doc, set } = baueGrundfixture();
    const zeilen = blattverzeichnisZeilen(doc, set);
    expect(zeilen).toHaveLength(2);
    expect(zeilen[0]).toEqual({
      nr: 1,
      name: 'Grundriss EG',
      format: 'A1 quer (841×594)',
      massstaebe: '1:50',
      revision: 'A · 12.03.2026',
    });
    expect(zeilen[1]).toEqual({
      nr: 2,
      name: 'Schnitt A-A',
      format: 'A3 hoch (297×420)',
      massstaebe: '1:100',
      revision: '—',
    });
    expect(zeilen.some((z) => 'plancode' in z)).toBe(false);
  });

  it('ohne `set`: alle Blätter in Plansatz-Reihenfolge (a.index - b.index)', () => {
    const { doc } = baueGrundfixture();
    const zeilen = blattverzeichnisZeilen(doc);
    expect(zeilen.map((z) => z.name)).toEqual(['Grundriss EG', 'Schnitt A-A']);
  });

  it('Set-Reihenfolge zählt, nicht die Erstellungsreihenfolge', () => {
    const { doc, sheet1Id, sheet2Id } = baueGrundfixture();
    execute(doc, 'publish.setEntfernen', { name: 'Werkplansatz' });
    execute(doc, 'publish.setSpeichern', { name: 'Versand', sheetIds: [sheet2Id, sheet1Id] });
    const zeilen = blattverzeichnisZeilen(doc, doc.settings.publikationsSets![0]!);
    expect(zeilen.map((z) => z.name)).toEqual(['Schnitt A-A', 'Grundriss EG']);
  });

  it('gelöschte Set-Blätter fallen ehrlich raus (setBlaetter-Semantik)', () => {
    const { doc, sheet1Id, set } = baueGrundfixture();
    execute(doc, 'publish.blattEntfernen', { sheetId: sheet1Id });
    const zeilen = blattverzeichnisZeilen(doc, set);
    expect(zeilen.map((z) => z.name)).toEqual(['Schnitt A-A']);
  });

  it('Plancode-Feld (Daten-Guard): gesetzt nur bei Blättern mit vollständigen Plankopf-Stammdaten', () => {
    const { doc, sheet1Id, set } = baueGrundfixture();
    execute(doc, 'publish.bueroSetzen', { kuerzel: 'MAA' });
    execute(doc, 'design.projektInfoSetzen', { projektCode: 'SEE' });
    execute(doc, 'publish.plankopfSetzen', { sheetId: sheet1Id, patch: { disziplin: 'A', geschossCode: 'EG', planNummer: '101' } });
    const zeilen = blattverzeichnisZeilen(doc, set);
    expect(zeilen[0]!.plancode).toBe('MAA-SEE-VS-A-EG-101');
    expect(zeilen[1]!.plancode).toBeUndefined(); // zweites Blatt bleibt ohne Plankopf-Stammdaten ehrlich leer
  });
});

describe('sammellegende', () => {
  function themaAnlegen(doc: KosmoDoc) {
    execute(doc, 'design.themenPlanSpeichern', {
      name: 'Materialplan',
      regeln: [
        { kriterium: 'material', wert: 'beton', farbe: '#8a8a8a', label: 'Beton' },
        { kriterium: 'material', wert: 'daemmung-mw', farbe: '#e0c060' },
      ],
    });
  }

  it('leer ohne Themen/Keynotes auf den Verzeichnis-Blättern', () => {
    const { doc, set } = baueGrundfixture();
    expect(sammellegende(doc, set)).toEqual({ themen: [], keynotes: [] });
  });

  it('Thema erscheint nur, wenn es auf einer Platzierung aktiv ist; Regeln in settings-Reihenfolge, label ?? wert', () => {
    const { doc, sheet1Id, set } = baueGrundfixture();
    themaAnlegen(doc);
    const sheet1 = doc.get<Sheet>(sheet1Id)!;
    const placementId = sheet1.placements[0]!.id;
    execute(doc, 'publish.ansichtAnpassen', { sheetId: sheet1Id, placementId, thema: 'Materialplan' });
    const daten = sammellegende(doc, set);
    expect(daten.themen).toEqual([
      {
        name: 'Materialplan',
        regeln: [
          { label: 'Beton', farbe: '#8a8a8a' },
          { label: 'daemmung-mw', farbe: '#e0c060' }, // fehlendes label → wert
        ],
      },
    ]);
  });

  it('Themen in Erst-Vorkommens-Reihenfolge, ohne Duplikate bei mehreren Platzierungen desselben Themas', () => {
    const { doc, storeyId, sheet1Id, sheet2Id, set } = baueGrundfixture();
    themaAnlegen(doc);
    execute(doc, 'design.themenPlanSpeichern', {
      name: 'Brandschutzplan',
      regeln: [{ kriterium: 'raumTyp', wert: 'treppenhaus', farbe: '#b3261e' }],
    });
    const sheet1 = doc.get<Sheet>(sheet1Id)!;
    execute(doc, 'publish.ansichtAnpassen', { sheetId: sheet1Id, placementId: sheet1.placements[0]!.id, thema: 'Brandschutzplan' });
    // Zweite Grundriss-Platzierung auf demselben Blatt: dasselbe Thema erscheint kein zweites Mal.
    execute(doc, 'publish.ansichtPlatzieren', { sheetId: sheet1Id, view: 'grundriss', storeyId, scale: 100, x: 500, y: 200 });
    const zweitePlacement = doc.get<Sheet>(sheet1Id)!.placements[1]!.id;
    execute(doc, 'publish.ansichtAnpassen', { sheetId: sheet1Id, placementId: zweitePlacement, thema: 'Brandschutzplan' });
    const sheet2 = doc.get<Sheet>(sheet2Id)!;
    execute(doc, 'publish.ansichtAnpassen', { sheetId: sheet2Id, placementId: sheet2.placements[0]!.id, thema: 'Materialplan' });
    const daten = sammellegende(doc, set);
    expect(daten.themen.map((t) => t.name)).toEqual(['Brandschutzplan', 'Materialplan']);
  });

  it('Keynotes: EXAKT der sheet.ts:331-339-Filter (Grundriss + storeyId, dedupliziert, numeric-sortiert)', () => {
    const { doc, storeyId, wallId, sheet1Id, set } = baueGrundfixture();
    execute(doc, 'design.keynoteSetzen', { nr: 'K10', text: 'Trittschalldämmung 20 mm' });
    execute(doc, 'design.keynoteSetzen', { nr: 'K1', text: 'Sockelleiste Eiche geölt' });
    execute(doc, 'design.keynoteSetzen', { nr: 'K2', text: 'Fensterbank Alu eloxiert' });
    execute(doc, 'design.etikettSetzen', { targetId: wallId, at: { x: 1000, y: 1000 }, inhalt: 'keynote', keynote: 'K10' });
    execute(doc, 'design.etikettSetzen', { targetId: wallId, at: { x: 2000, y: 1000 }, inhalt: 'keynote', keynote: 'K1' });
    execute(doc, 'design.etikettSetzen', { targetId: wallId, at: { x: 3000, y: 1000 }, inhalt: 'keynote', keynote: 'K1' }); // Duplikat
    // Aufbau-Etikett (kein keynote) zählt nicht.
    execute(doc, 'design.etikettSetzen', { targetId: wallId, at: { x: 4000, y: 1000 }, inhalt: 'aufbau' });
    const daten = sammellegende(doc, set);
    // numerisch sortiert: K1 vor K10 (nicht lexikografisch K1, K10, K2 wäre auch numerisch — hier zählt: K1 < K2 < K10)
    expect(daten.keynotes).toEqual([
      { nr: 'K1', text: 'Sockelleiste Eiche geölt' },
      { nr: 'K10', text: 'Trittschalldämmung 20 mm' },
    ]);
    void storeyId;
    void sheet1Id;
  });

  it('Keynote auf einem Geschoss, das NICHT auf dem Verzeichnis-Set liegt, erscheint nicht', () => {
    const { doc, wallId, set } = baueGrundfixture();
    // Zweites Geschoss + Wand, dessen Keynote-Etikett NICHT über eine
    // Grundriss-Platzierung der Set-Blätter erreichbar ist.
    const og = execute(doc, 'design.geschossErstellen', { name: '1.OG', index: 1, elevation: 3000, height: 3000 });
    const ogId = (og.patches[0] as { id: string }).id;
    const aufbau = execute(doc, 'design.aufbauErstellen', {
      name: 'AW OG',
      target: 'wall',
      layers: [{ material: 'beton', thickness: 200, function: 'tragend' }],
    });
    const wandOg = execute(doc, 'design.wandZeichnen', {
      storeyId: ogId,
      assemblyId: (aufbau.patches[0] as { id: string }).id,
      a: { x: 0, y: 0 },
      b: { x: 5000, y: 0 },
    });
    execute(doc, 'design.keynoteSetzen', { nr: 'K5', text: 'Nicht im Verzeichnis-Set' });
    execute(doc, 'design.etikettSetzen', {
      targetId: (wandOg.patches[0] as { id: string }).id,
      at: { x: 1000, y: 1000 },
      inhalt: 'keynote',
      keynote: 'K5',
    });
    void wallId;
    expect(sammellegende(doc, set).keynotes).toEqual([]);
  });
});

describe('blattverzeichnisSvg — Guards (Subspez §5)', () => {
  it('leeres Doc: gültiges Kopf-SVG mit Zeile «Keine Blätter», kein Wurf, kein leerer String', () => {
    const doc = new KosmoDoc();
    const svg = blattverzeichnisSvg(doc, undefined, { projectName: 'Leerprojekt' });
    expect(svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg"')).toBe(true);
    expect(svg.endsWith('</svg>')).toBe(true);
    expect(svg).toContain('viewBox="0 0 210 297"');
    expect(svg).toContain('BLATTVERZEICHNIS');
    expect(svg).toContain('Keine Blätter');
  });

  it('Set ohne Blätter (alle gelöscht): dieselbe ehrliche Leerzeile', () => {
    const { doc, sheet1Id, sheet2Id, set } = baueGrundfixture();
    execute(doc, 'publish.blattEntfernen', { sheetId: sheet1Id });
    execute(doc, 'publish.blattEntfernen', { sheetId: sheet2Id });
    const svg = blattverzeichnisSvg(doc, set, { projectName: 'T' });
    expect(svg).toContain('Keine Blätter');
  });

  it('Sammellegende fehlt komplett (auch die Überschrift) ohne Themen UND Keynotes', () => {
    const { doc, set } = baueGrundfixture();
    const svg = blattverzeichnisSvg(doc, set, { projectName: 'T' });
    expect(svg).not.toContain('LEGENDE');
    expect(svg).not.toContain('data-teil="sammellegende"');
  });

  it('Untertitel: projectName · setName · datum — setName-Fallback «Alle Blätter», Datum entfällt ohne opts.datum', () => {
    const { doc, set } = baueGrundfixture();
    // `setName` ist ein eigenes Options-Feld (Subspez §3) — NICHT automatisch
    // aus `set.name` hergeleitet (dieselbe Trennung wie bei `kvBlattSvg`s
    // `titel`/`datum`: die Ableitung bleibt pur, die App entscheidet den Text).
    const mitSet = blattverzeichnisSvg(doc, set, { projectName: 'Testprojekt', datum: '12.03.2026', setName: set.name });
    // Exakte Text-Element-Grenze geprüft (nicht nur Teilstring) — die Tabelle
    // darunter trägt selbst ein Revisionsdatum (12.03.2026, aus der Fixtur),
    // ein loser Teilstring-Match würde das Untertitel-Segment nicht wirklich
    // isolieren.
    expect(mitSet).toContain('>Testprojekt · Werkplansatz · 12.03.2026</text>');
    const ohneSet = blattverzeichnisSvg(doc, undefined, { projectName: 'Testprojekt' });
    expect(ohneSet).toContain('>Testprojekt · Alle Blätter</text>'); // kein erfundenes Datum-Segment
  });

  it('Plancode-Zweitzeile (v0.8.10 E5): Sekundärzeile am Blatt-x-Anker nur bei Blättern MIT Plancode, Tabellenkopf bleibt 5-spaltig', () => {
    const { doc, sheet1Id, set } = baueGrundfixture();
    execute(doc, 'publish.bueroSetzen', { kuerzel: 'MAA' });
    execute(doc, 'design.projektInfoSetzen', { projektCode: 'SEE' });
    execute(doc, 'publish.plankopfSetzen', { sheetId: sheet1Id, patch: { disziplin: 'A', geschossCode: 'EG', planNummer: '101' } });
    const svg = blattverzeichnisSvg(doc, set, { projectName: 'T' });
    // Kein sechster Spaltenkopf mehr — die 5 Köpfe bleiben, «Plancode» fehlt.
    expect(svg).not.toContain('>Plancode<');
    // Die Zweitzeile hängt am Blatt-x-Anker (24 mm, unter dem Blattnamen),
    // nicht an einer eigenen Spalte rechts.
    expect(svg).toMatch(/<text x="24" y="[\d.]+"[^>]*>MAA-SEE-VS-A-EG-101<\/text>/);
    // Blatt 2 hat keine Plankopf-Stammdaten → exakt EINE Zweitzeile im SVG.
    expect(svg.match(/MAA-SEE-VS-A-EG-101/g)).toHaveLength(1);
  });

  it('Determinismus: zweimaliger Aufruf mit identischen Eingaben liefert byte-identisches SVG', () => {
    const { doc, set } = baueGrundfixture();
    const opts = { projectName: 'T', datum: '12.03.2026', setName: 'Werkplansatz' } as const;
    expect(blattverzeichnisSvg(doc, set, opts)).toBe(blattverzeichnisSvg(doc, set, opts));
  });

  it('Überlauf: viele Blätter enden in EINER Schlusszeile «… +M weitere Blätter» statt stillem Abschneiden', () => {
    const doc = new KosmoDoc();
    const ids: string[] = [];
    for (let i = 0; i < 60; i++) {
      const b = execute(doc, 'publish.blattErstellen', { name: `Blatt ${String(i + 1).padStart(2, '0')}`, format: 'A3' });
      ids.push((b.patches[0] as { id: string }).id);
    }
    execute(doc, 'publish.setSpeichern', { name: 'Riesensatz', sheetIds: ids });
    const set = doc.settings.publikationsSets![0]!;
    const svg = blattverzeichnisSvg(doc, set, { projectName: 'T' });
    expect(svg).toMatch(/… \+\d+ weitere Blätter/);
    expect(svg).toContain('Blatt 01'); // erste Zeilen bleiben real
    expect(svg).not.toContain('Blatt 60'); // das letzte Blatt fällt hinter den Überlauf-Schnitt
  });
});

describe('Golden-SVG (Blattverzeichnis)', () => {
  it('ohne Stammdaten/Themen/Keynotes: 5 Spalten, keine Plancode-Zweitzeile, «—»-Platzhalter, KEINE Legende', () => {
    const { doc, set } = baueGrundfixture();
    const svg = blattverzeichnisSvg(doc, set, { projectName: 'Testprojekt', datum: '12.03.2026', setName: set.name });
    expect(svg).not.toContain('Plancode');
    expect(svg).not.toContain('data-teil="sammellegende"');
    pruefeGolden(svg, new URL('./golden/blattverzeichnis.svg', import.meta.url));
  });

  it('mit Büro/Projekt/Plankopf-Stammdaten + einem Thema (2 Regeln) + 2 Keynotes: Plancode als zweite Zeile + Sammellegende', () => {
    const { doc, storeyId, wallId, sheet1Id, set } = baueGrundfixture();
    void storeyId;
    execute(doc, 'publish.bueroSetzen', { kuerzel: 'MAA' });
    execute(doc, 'design.projektInfoSetzen', { projektCode: 'SEE' });
    execute(doc, 'publish.plankopfSetzen', { sheetId: sheet1Id, patch: { disziplin: 'A', geschossCode: 'EG', planNummer: '101' } });
    execute(doc, 'design.themenPlanSpeichern', {
      name: 'Materialplan',
      regeln: [
        { kriterium: 'material', wert: 'beton', farbe: '#8a8a8a', label: 'Beton' },
        { kriterium: 'material', wert: 'daemmung-mw', farbe: '#e0c060', label: 'Dämmung' },
      ],
    });
    const sheet1 = doc.get<Sheet>(sheet1Id)!;
    execute(doc, 'publish.ansichtAnpassen', { sheetId: sheet1Id, placementId: sheet1.placements[0]!.id, thema: 'Materialplan' });
    execute(doc, 'design.keynoteSetzen', { nr: 'K1', text: 'Sockelleiste Eiche geölt' });
    execute(doc, 'design.keynoteSetzen', { nr: 'K2', text: 'Fensterbank Alu eloxiert' });
    execute(doc, 'design.etikettSetzen', { targetId: wallId, at: { x: 1000, y: 1000 }, inhalt: 'keynote', keynote: 'K1' });
    execute(doc, 'design.etikettSetzen', { targetId: wallId, at: { x: 2000, y: 1000 }, inhalt: 'keynote', keynote: 'K2' });

    const svg = blattverzeichnisSvg(doc, set, { projectName: 'Testprojekt', datum: '12.03.2026', setName: set.name });
    // v0.8.10 E5 (Owner-Wahl «zweite Zeile»): der Plancode steht als kleine
    // Sekundärzeile unter dem Blattnamen — die frühere Spalte (x=182) samt
    // «Plancode»-Spaltenkopf ist weg.
    expect(svg).not.toContain('>Plancode<');
    expect(svg).toContain('MAA-SEE-VS-A-EG-101');
    expect(svg).toContain('data-teil="sammellegende"');
    pruefeGolden(svg, new URL('./golden/blattverzeichnis-legende.svg', import.meta.url));
  });
});

// Typ-Only-Referenz, damit `PublikationsSet` als expliziter Re-Export aus
// `../src` bewiesen bleibt (Subspez §2: Dateikreis nennt keinen neuen
// Typ-Export-Test, dieser hier ist ein Nebenprodukt der Fixtur-Signatur oben).
function _typCheck(s: PublikationsSet): string {
  return s.name;
}
void _typCheck;
