import { describe, expect, it } from 'vitest';
import { KosmoDoc, execute, areaReport, flaechennachweisCsv } from '../src';

/**
 * `flaechennachweisCsv` (v0.8.8 PA2-088, E3/C-5, `docs/V088-SPEZ.md`) —
 * Matrix Geschoss × SIA-416-Klasse + NGF je Geschoss + Summenzeile +
 * aGF-Ziel/GF-Schätzung, reine Durchreichung von `areaReport` (D3,
 * `derive/sia416.ts:50`). Jede Zahl hier wird GEGEN `areaReport()` selbst
 * verglichen — die Funktion rechnet nichts neu, sie formatiert nur.
 */

function setupDoc() {
  const doc = new KosmoDoc();
  const eg = execute(doc, 'design.geschossErstellen', { name: 'EG', index: 0, elevation: 0, height: 3000 });
  const egId = (eg.patches[0] as { id: string }).id;
  const og = execute(doc, 'design.geschossErstellen', { name: 'OG', index: 1, elevation: 3000, height: 3000 });
  const ogId = (og.patches[0] as { id: string }).id;
  return { doc, egId, ogId };
}

/** Zwei Geschosse × gemischte Raumtypen (HNF/NNF/VF auf EG, HNF/FF/KF auf
 * OG) + parzelle/nachbar-Kontrast auf EG (grosse Flächen, die NICHT in die
 * Summe einfliessen dürfen — D8/H-1-Bestandsregel, hier zusätzlich für den
 * CSV-Export bewiesen). Alle Rechtecke achsparallel — die Fläche ist exakt
 * Breite × Höhe, ohne Rundungsrisiko. */
function bauMischDoc() {
  const { doc, egId, ogId } = setupDoc();

  // EG: HNF 100 m², NNF 20 m², VF 12 m² — NGF 132 m²
  execute(doc, 'design.zoneErstellen', {
    storeyId: egId,
    name: 'Wohnen EG',
    sia: 'HNF',
    outline: [{ x: 0, y: 0 }, { x: 10000, y: 0 }, { x: 10000, y: 10000 }, { x: 0, y: 10000 }],
  });
  execute(doc, 'design.zoneErstellen', {
    storeyId: egId,
    name: 'Nebenraum EG',
    sia: 'NNF',
    outline: [{ x: 12000, y: 0 }, { x: 16000, y: 0 }, { x: 16000, y: 5000 }, { x: 12000, y: 5000 }],
  });
  execute(doc, 'design.zoneErstellen', {
    storeyId: egId,
    name: 'Treppenhaus EG',
    sia: 'VF',
    outline: [{ x: 18000, y: 0 }, { x: 21000, y: 0 }, { x: 21000, y: 4000 }, { x: 18000, y: 4000 }],
  });
  // Kontrast: parzelle/nachbar — grosse Flächen, dürfen NGF/KF NICHT pollutieren.
  execute(doc, 'design.zoneErstellen', {
    storeyId: egId,
    name: 'Parzelle Musterweg 1',
    sia: 'KF',
    zonenArt: 'parzelle',
    outline: [{ x: 30000, y: 0 }, { x: 50000, y: 0 }, { x: 50000, y: 30000 }, { x: 30000, y: 30000 }], // 600 m²
  });
  execute(doc, 'design.zoneErstellen', {
    storeyId: egId,
    name: 'Nachbar 1',
    sia: 'KF',
    zonenArt: 'nachbar',
    outline: [{ x: -10000, y: 0 }, { x: -5000, y: 0 }, { x: -5000, y: 5000 }, { x: -10000, y: 5000 }], // 25 m²
  });

  // OG: HNF 48 m², FF 6 m², KF 10 m² — NGF 64 m²
  execute(doc, 'design.zoneErstellen', {
    storeyId: ogId,
    name: 'Wohnen OG',
    sia: 'HNF',
    outline: [{ x: 0, y: 0 }, { x: 8000, y: 0 }, { x: 8000, y: 6000 }, { x: 0, y: 6000 }],
  });
  execute(doc, 'design.zoneErstellen', {
    storeyId: ogId,
    name: 'Fassade OG',
    sia: 'FF',
    outline: [{ x: 10000, y: 0 }, { x: 12000, y: 0 }, { x: 12000, y: 3000 }, { x: 10000, y: 3000 }],
  });
  execute(doc, 'design.zoneErstellen', {
    storeyId: ogId,
    name: 'Konstruktion OG',
    sia: 'KF',
    outline: [{ x: 14000, y: 0 }, { x: 19000, y: 0 }, { x: 19000, y: 2000 }, { x: 14000, y: 2000 }],
  });

  return doc;
}

describe('flaechennachweisCsv (SIA 416, PA2-088 E3/C-5)', () => {
  it('Kopfzeile: Geschoss;HNF;NNF;VF;FF;KF;NGF — Spaltenreihenfolge wie AreaReport.byClass', () => {
    const doc = bauMischDoc();
    const csv = flaechennachweisCsv(doc);
    const [kopf] = csv.split('\n');
    expect(kopf).toBe('Geschoss;HNF;NNF;VF;FF;KF;NGF');
  });

  it('Matrix-Zellen == areaReport-Zahlen, hart nachgerechnet (2 Geschosse × gemischte Klassen)', () => {
    const doc = bauMischDoc();
    const r = areaReport(doc);
    const csv = flaechennachweisCsv(doc);
    const zeilen = csv.split('\n');

    // Nachrechnung unabhängig von areaReport — die reinen Rechteckflächen.
    expect(r.storeys[0]!.storeyName).toBe('EG');
    expect(r.storeys[0]!.byClass.HNF).toBe(100);
    expect(r.storeys[0]!.byClass.NNF).toBe(20);
    expect(r.storeys[0]!.byClass.VF).toBe(12);
    expect(r.storeys[0]!.byClass.FF).toBe(0);
    expect(r.storeys[0]!.byClass.KF).toBe(0); // parzelle/nachbar zählen NICHT
    expect(r.storeys[0]!.ngf).toBe(132);

    expect(r.storeys[1]!.storeyName).toBe('OG');
    expect(r.storeys[1]!.byClass.HNF).toBe(48);
    expect(r.storeys[1]!.byClass.FF).toBe(6);
    expect(r.storeys[1]!.byClass.KF).toBe(10);
    expect(r.storeys[1]!.ngf).toBe(64);

    // CSV-Zeilen sind exakt dieselben Zahlen, nur `toFixed(2)`-formatiert.
    expect(zeilen[1]).toBe('EG;100.00;20.00;12.00;0.00;0.00;132.00');
    expect(zeilen[2]).toBe('OG;48.00;0.00;0.00;6.00;10.00;64.00');
  });

  it('Summenzeile + aGF-Ziel/GF-Schätzung == areaReport.total/agfZiel/gfSchaetzung (Owner-Methodik, Default-Faktoren)', () => {
    const doc = bauMischDoc();
    const r = areaReport(doc);
    const csv = flaechennachweisCsv(doc);
    const zeilen = csv.split('\n');

    // Totale hart nachgerechnet: 100+48=148 HNF, 20 NNF, 12 VF, 6 FF, 10 KF, 196 NGF.
    expect(r.total).toEqual({ HNF: 148, NNF: 20, VF: 12, FF: 6, KF: 10 });
    expect(r.totalNgf).toBe(196);
    // agfZiel = 148 × 1.28 (Default agfFactor) = 189.44
    expect(r.agfZiel).toBeCloseTo(189.44);
    // gfSchaetzung = 189.44 × 1.1 (Default facadeFactor) = 208.384
    expect(r.gfSchaetzung).toBeCloseTo(208.384);

    expect(zeilen[3]).toBe('Total;148.00;20.00;12.00;6.00;10.00;196.00');
    expect(zeilen[4]).toBe('aGF-Ziel;;;;;;189.44');
    expect(zeilen[5]).toBe('GF-Schätzung;;;;;;208.38'); // toFixed(2) von 208.384
    expect(zeilen).toHaveLength(6);
  });

  it('optionaler report-Parameter (Bestandsmuster kennzahlenAuswerten): vorgerechneter AreaReport ergibt dieselbe CSV', () => {
    const doc = bauMischDoc();
    const r = areaReport(doc);
    expect(flaechennachweisCsv(doc, r)).toBe(flaechennachweisCsv(doc));
  });

  it('Quoting exakt nach ausmassAlsCsv-Muster: Semikolon/Anführungszeichen im Geschossnamen wird RFC-4180-artig gequotet', () => {
    const { doc, egId } = setupDoc();
    // Geschossname trägt Semikolon UND Anführungszeichen — beides muss
    // gequotet werden (Zellinhalt sonst als mehrere Felder fehlinterpretiert).
    execute(doc, 'design.geschossErstellen', { name: 'Trakt A; Süd "Hof"', index: 2, elevation: 6000, height: 3000 });
    execute(doc, 'design.zoneErstellen', {
      storeyId: egId,
      name: 'Wohnen',
      sia: 'HNF',
      outline: [{ x: 0, y: 0 }, { x: 5000, y: 0 }, { x: 5000, y: 5000 }, { x: 0, y: 5000 }],
    });
    const csv = flaechennachweisCsv(doc);
    const zeilen = csv.split('\n');
    // Drittes Geschoss (index 2, gequoteter Name) liegt hinter EG (index 0) und
    // dem ungenutzten OG (index 1) aus setupDoc() — storeysOrdered() sortiert
    // nach index; welche genaue Zeilennummer es einnimmt ist hier egal, geprüft
    // wird nur der Zellinhalt selbst (per find, positionsunabhängig).
    const gequoteteZeile = zeilen.find((z) => z.startsWith('"Trakt A'));
    expect(gequoteteZeile).toBe('"Trakt A; Süd ""Hof""";0.00;0.00;0.00;0.00;0.00;0.00');
  });

  it('leeres Doc: ehrliche Kopfzeile + Total-Zeile mit expliziten Nullen (keine erfundene Geschosszeile)', () => {
    const doc = new KosmoDoc();
    const csv = flaechennachweisCsv(doc);
    const zeilen = csv.split('\n');
    expect(zeilen).toEqual([
      'Geschoss;HNF;NNF;VF;FF;KF;NGF',
      'Total;0.00;0.00;0.00;0.00;0.00;0.00',
      'aGF-Ziel;;;;;;0.00',
      'GF-Schätzung;;;;;;0.00',
    ]);
  });
});
