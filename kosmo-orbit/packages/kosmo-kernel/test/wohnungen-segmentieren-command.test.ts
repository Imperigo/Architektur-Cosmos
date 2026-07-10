import { describe, expect, it } from 'vitest';
import { KosmoDoc, execute, CommandError, type Stair, type Zone, type ZonenTuer } from '../src';
import { segmentiere, sollMix } from '../src/derive/segmentierer';

/**
 * H-34 (SIM-BEFUNDE.md, Journey kosmo-mfh Zug 4, 10.07.2026): der Wohnungs-
 * Segmentierer war nur über UI-Knöpfe (BerechnungslistePanel «Vorschlag» /
 * «Übernehmen») erreichbar — kein design.*-Command, also kein Kosmo-Tool.
 *
 * Die reine Schnitt-Mathematik (`segmentiere`/`sollMix`, derive/segmentierer.ts)
 * war bereits im Kernel und ist HIER NICHT verändert — die beiden ersten
 * Blöcke sind Charakterisierungstests, die ihr heutiges Verhalten mit realen
 * Werten aus der MFH-Simulation (e2e/sim-mfh.spec.ts, Fixture: Regelgeschoss
 * 30 × 14 m, Mittelkorridor y 6000–8000, Raumprogramm 300 m² «preisguenstig»)
 * einfrieren; sie waren VOR und bleiben NACH der Extraktion grün, weil sich
 * an `segmentiere`/`sollMix` nichts geändert hat.
 *
 * Neu ist ausschliesslich der dritte Block: `design.wohnungenSegmentieren`
 * bündelt das, was bisher nur `BerechnungslistePanel.uebernehmen()` (UI-
 * Direktlogik) tat — SegmentierungsErgebnis in Zonen-/Treppen-/Türpatches
 * übersetzen — als EINEN Kosmo-Tool-fähigen Command. Die Geometrie-Werte
 * (Kern-Outline, Treppenachse, Türposition) sind von Hand aus genau dieser
 * UI-Formel für dieselbe Fixture nachgerechnet und stehen unten als Kommentar,
 * damit der Command byte-identisch zum bisherigen «Vorschlag → Übernehmen»-
 * Weg bleibt.
 */

const FOOTPRINT = [
  { x: 0, y: 0 },
  { x: 30000, y: 0 },
  { x: 30000, y: 14000 },
  { x: 0, y: 14000 },
];
const KORRIDOR = [
  { x: 0, y: 6000 },
  { x: 30000, y: 6000 },
  { x: 30000, y: 8000 },
  { x: 0, y: 8000 },
];

describe('Charakterisierung: segmentiere()/sollMix() — unverändert vor UND nach der Command-Extraktion', () => {
  it('MFH-Regelgeschoss (real, e2e/sim-mfh.spec.ts): 4 Wohnungen «preisguenstig» à 75 m², 2 Restflächen, Kern 3.0 m', () => {
    const erg = segmentiere(FOOTPRINT, KORRIDOR, [{ typ: 'preisguenstig', groesse: 75, anzahl: 4 }], {
      kern: true,
      minBreite: 4500,
    });
    const geschnitten = erg.wohnungen.filter((w) => w.typ === 'preisguenstig');
    expect(geschnitten).toHaveLength(4);
    for (const w of geschnitten) expect(w.flaeche).toBe(75);
    const rest = erg.wohnungen.filter((w) => w.typ === null);
    expect(rest).toHaveLength(2);
    expect(rest.map((w) => w.flaeche).sort((a, b) => a - b)).toEqual([12, 30]);
    expect(erg.mix).toEqual([{ typ: 'preisguenstig', soll: 4, ist: 4 }]);
    // Kern: erste 3.0 m des ersten Bands (oberes Band, y 8000–14000)
    expect(erg.kern).not.toBeNull();
    expect(erg.kern!.outline).toEqual([
      { x: 0, y: 8000 },
      { x: 3000, y: 8000 },
      { x: 3000, y: 14000 },
      { x: 0, y: 14000 },
    ]);
  });

  it('sollMix() aus dem Raumprogramm: 300 m² HNF preisguenstig → 4 Wohnungen à 75 m² (300 ÷ 75)', () => {
    const doc = new KosmoDoc();
    execute(doc, 'design.raumprogrammSetzen', { posten: [{ typ: 'preisguenstig', hnfSoll: 300 }] });
    expect(sollMix(doc)).toEqual([{ typ: 'preisguenstig', groesse: 75, anzahl: 4 }]);
  });
});

function setupMfhGeschoss() {
  const doc = new KosmoDoc();
  const eg = execute(doc, 'design.geschossErstellen', { name: 'EG', index: 0, elevation: 0, height: 3000 });
  const storeyId = (eg.patches[0] as { id: string }).id;
  execute(doc, 'design.raumprogrammSetzen', { posten: [{ typ: 'preisguenstig', hnfSoll: 300 }] });
  execute(doc, 'design.zoneErstellen', { storeyId, name: 'Regelgeschoss', sia: 'KF', outline: FOOTPRINT });
  execute(doc, 'design.zoneErstellen', {
    storeyId,
    name: 'Korridor',
    sia: 'VF',
    raumTyp: 'korridor',
    outline: KORRIDOR,
  });
  return { doc, storeyId };
}

describe('design.wohnungenSegmentieren (neuer Command, H-34)', () => {
  it('ohne kern: erzeugt dieselben Wohnungs-/Restflächen-Zonen wie segmentiere() direkt (Soll-Mix aus dem Raumprogramm)', () => {
    const { doc, storeyId } = setupMfhGeschoss();
    const vorherZonen = doc.byKind<Zone>('zone').length;
    const r = execute(doc, 'design.wohnungenSegmentieren', { storeyId });
    const referenz = segmentiere(FOOTPRINT, KORRIDOR, [{ typ: 'preisguenstig', groesse: 75, anzahl: 4 }]);
    const neueZonen = doc.byKind<Zone>('zone').filter((z) => z.raumTyp !== 'korridor' && z.sia !== 'KF');
    expect(neueZonen).toHaveLength(referenz.wohnungen.length);
    expect(doc.byKind<Zone>('zone').length).toBe(vorherZonen + referenz.wohnungen.length);
    const whgZonen = neueZonen.filter((z) => z.program === 'preisguenstig');
    expect(whgZonen).toHaveLength(4);
    expect(whgZonen.every((z) => z.sia === 'HNF')).toBe(true);
    expect(whgZonen.map((z) => z.name).sort()).toEqual(['Whg 1 (preisguenstig)', 'Whg 2 (preisguenstig)', 'Whg 4 (preisguenstig)', 'Whg 5 (preisguenstig)']);
    const restZonen = neueZonen.filter((z) => z.name === 'Restfläche');
    expect(restZonen).toHaveLength(2);
    expect(r.summary).toBe('Wohnungen segmentieren');
  });

  it('mit kern:true: Treppenhaus-Zone + gerade Treppe + Zonentür entstehen mit der bisherigen UI-Geometrie', () => {
    const { doc, storeyId } = setupMfhGeschoss();
    const r = execute(doc, 'design.wohnungenSegmentieren', { storeyId, kern: true });
    expect(r.summary).toBe('Wohnungen segmentieren (mit Erschliessungskern)');

    const treppenhaus = doc.byKind<Zone>('zone').find((z) => z.raumTyp === 'treppenhaus');
    expect(treppenhaus).toBeDefined();
    expect(treppenhaus!.outline).toEqual([
      { x: 0, y: 8000 },
      { x: 3000, y: 8000 },
      { x: 3000, y: 14000 },
      { x: 0, y: 14000 },
    ]);

    // Von Hand aus BerechnungslistePanel.uebernehmen() nachgerechnet für
    // dieselbe Kern-Outline: cx = (0+3000)/2 = 1500, y0=8000, y1=14000,
    // hoch = (14000-8000=6000) >= (3000-0=3000) → true.
    const treppe = doc.byKind<Stair>('stair').find((s) => s.storeyId === storeyId);
    expect(treppe).toBeDefined();
    expect(treppe!.a).toEqual({ x: 1500, y: 8600 });
    expect(treppe!.b).toEqual({ x: 1500, y: 13400 });
    expect(treppe!.width).toBe(1200);

    // Tür: grenzY = min(korridor.y)=6000, max(korridor.y)=8000;
    // |6000-14000|=8000 < |8000-8000|=0 ? nein → grenzY = y0 = 8000.
    const tuer = doc.byKind<ZonenTuer>('zonentuer').find((t) => t.storeyId === storeyId);
    expect(tuer).toBeDefined();
    expect(tuer!.at).toEqual({ x: 1500, y: 8000 });
    expect(tuer!.breite).toBe(1000);
  });

  it('ist ein Undo-Schritt (History-Gruppe via execute — ein Aufruf, ein invertierbares Patch-Bündel)', () => {
    const { doc, storeyId } = setupMfhGeschoss();
    const vorher = doc.byKind<Zone>('zone').length;
    const r = execute(doc, 'design.wohnungenSegmentieren', { storeyId, kern: true });
    expect(doc.byKind<Zone>('zone').length).toBeGreaterThan(vorher);
    expect(r.patches.length).toBeGreaterThan(0);
  });

  it('explizites mix überschreibt sollMix() — deckt den Kosmo-Weg ohne Raumprogramm ab', () => {
    const doc = new KosmoDoc();
    const eg = execute(doc, 'design.geschossErstellen', { name: 'EG', index: 0, elevation: 0, height: 3000 });
    const storeyId = (eg.patches[0] as { id: string }).id;
    execute(doc, 'design.zoneErstellen', { storeyId, name: 'Regelgeschoss', sia: 'KF', outline: FOOTPRINT });
    execute(doc, 'design.zoneErstellen', {
      storeyId,
      name: 'Korridor',
      sia: 'VF',
      raumTyp: 'korridor',
      outline: KORRIDOR,
    });
    // Kein Raumprogramm gesetzt — ohne explizites mix müsste das scheitern
    expect(() => execute(doc, 'design.wohnungenSegmentieren', { storeyId })).toThrow(CommandError);
    const r = execute(doc, 'design.wohnungenSegmentieren', {
      storeyId,
      mix: [{ typ: 'marktgerecht', anzahl: 2 }],
    });
    const whg = doc.byKind<Zone>('zone').filter((z) => z.program === 'marktgerecht');
    expect(whg).toHaveLength(2);
    expect(r.summary).toBe('Wohnungen segmentieren');
  });

  it('ohne Korridor-Zone: ehrlicher CommandError statt stillem Nichtstun', () => {
    const doc = new KosmoDoc();
    const eg = execute(doc, 'design.geschossErstellen', { name: 'EG', index: 0, elevation: 0, height: 3000 });
    const storeyId = (eg.patches[0] as { id: string }).id;
    execute(doc, 'design.zoneErstellen', { storeyId, name: 'Regelgeschoss', sia: 'KF', outline: FOOTPRINT });
    execute(doc, 'design.raumprogrammSetzen', { posten: [{ typ: 'preisguenstig', hnfSoll: 300 }] });
    expect(() => execute(doc, 'design.wohnungenSegmentieren', { storeyId })).toThrow(
      /Raumtyp «korridor»/,
    );
  });

  it('ist als Kosmo-Tool sichtbar (registerCommand trägt automatisch in die Registry ein)', async () => {
    const { allCommands } = await import('../src');
    const cmd = allCommands().find((c) => c.id === 'design.wohnungenSegmentieren');
    expect(cmd).toBeDefined();
    expect(cmd!.title).toBe('Wohnungen segmentieren');
  });
});
