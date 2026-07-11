import { describe, expect, it } from 'vitest';
import { KosmoDoc, History, execute, type Zone } from '../src';
import { segmentiere, variantenSuche, type VariantenGewichte } from '../src';

/**
 * v0.7.0 (Stream 5A, E5-iii-Anschluss an E5-i): `design.wohnungenSegmentieren`
 * additiv um `vorberechneteWohnungen` erweitert — der «Übernehmen»-Weg der
 * neuen `VariantenPanel.tsx` (apps/kosmo-orbit) für eine Top-Variante aus
 * `derive/variantensuche.ts`. Additiv/zod-optional: alle bestehenden Tests
 * in `wohnungen-segmentieren-command.test.ts` bleiben unverändert grün
 * (kein Feld wird Pflicht, kein Verhalten ohne das neue Feld ändert sich).
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
const GEWICHTE: VariantenGewichte = { programmErfuellung: 1, kompaktheit: 1, mixTreue: 1, flaechenNutzung: 1 };

function setupMfhGeschoss() {
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
  return { doc, storeyId };
}

describe('design.wohnungenSegmentieren mit vorberechneteWohnungen (v0.7.0 Stream 5A)', () => {
  it('übernimmt eine vorberechnete Variante bytegenau (keine erneute segmentiere()-Rechnung)', () => {
    const { doc, storeyId } = setupMfhGeschoss();
    const mix = [
      { typ: 'marktgerecht', groesse: 95, anzahl: 2 },
      { typ: 'preisguenstig', groesse: 75, anzahl: 2 },
    ];
    const gen = variantenSuche({ footprint: FOOTPRINT, korridor: KORRIDOR, mix }, GEWICHTE, 7);
    // Ein paar Ruin-&-Recreate-Züge ziehen, damit die Variante nicht mehr
    // 1:1 der 'start'-Ausbeute entspricht.
    let variante = gen.next().value;
    for (let i = 0; i < 8; i++) variante = gen.next().value;

    const vorherZonen = doc.byKind<Zone>('zone').length;
    const r = execute(doc, 'design.wohnungenSegmentieren', {
      storeyId,
      vorberechneteWohnungen: variante.wohnungen,
    });
    const neueZonen = doc.byKind<Zone>('zone').filter((z) => z.raumTyp !== 'korridor' && z.sia !== 'KF');
    expect(neueZonen).toHaveLength(variante.wohnungen.length);
    expect(doc.byKind<Zone>('zone').length).toBe(vorherZonen + variante.wohnungen.length);
    // Geometrie bytegenau übernommen — jede Zonen-Outline entspricht exakt
    // der Wohnungs-Outline aus der Variante (gleiche Reihenfolge).
    const outlines = neueZonen.map((z) => z.outline);
    expect(outlines).toEqual(variante.wohnungen.map((w) => w.outline));
    expect(r.summary).toBe('Wohnungen segmentieren');
  });

  it('ist ein einziger Undo-Schritt wie der bestehende Weg', () => {
    const { doc, storeyId } = setupMfhGeschoss();
    const mix = [{ typ: 'preisguenstig', groesse: 75, anzahl: 4 }];
    const gen = variantenSuche({ footprint: FOOTPRINT, korridor: KORRIDOR, mix }, GEWICHTE, 3);
    const variante = gen.next().value;
    const history = new History();
    const vorher = doc.byKind<Zone>('zone').length;
    const r = execute(doc, 'design.wohnungenSegmentieren', { storeyId, vorberechneteWohnungen: variante.wohnungen });
    history.record(r.patches);
    expect(doc.byKind<Zone>('zone').length).toBeGreaterThan(vorher);
    expect(r.patches.length).toBeGreaterThan(0);
    expect(history.depth).toBe(1); // ein Undo-Schritt für den ganzen Aufruf
    // Ein Undo macht die GESAMTE Gruppe rückgängig.
    history.undo(doc);
    expect(doc.byKind<Zone>('zone').length).toBe(vorher);
  });

  it('kern:true zusammen mit vorberechneteWohnungen → ehrlicher CommandError statt stiller Falsch-Kombination', () => {
    const { doc, storeyId } = setupMfhGeschoss();
    const mix = [{ typ: 'preisguenstig', groesse: 75, anzahl: 4 }];
    const gen = variantenSuche({ footprint: FOOTPRINT, korridor: KORRIDOR, mix }, GEWICHTE, 5);
    const variante = gen.next().value;
    expect(() =>
      execute(doc, 'design.wohnungenSegmentieren', { storeyId, kern: true, vorberechneteWohnungen: variante.wohnungen }),
    ).toThrow(/Kern-Reservierung ist mit einer vorberechneten Variante nicht unterstützt/);
  });

  it('leere vorberechneteWohnungen → ehrlicher CommandError (kein leises Nichtstun)', () => {
    const { doc, storeyId } = setupMfhGeschoss();
    expect(() => execute(doc, 'design.wohnungenSegmentieren', { storeyId, vorberechneteWohnungen: [] })).toThrow(
      /enthält keine Wohnungen/,
    );
  });

  it('ohne vorberechneteWohnungen bleibt der bisherige Weg (segmentiere() direkt) unverändert', () => {
    const { doc, storeyId } = setupMfhGeschoss();
    execute(doc, 'design.raumprogrammSetzen', { posten: [{ typ: 'preisguenstig', hnfSoll: 300 }] });
    const r = execute(doc, 'design.wohnungenSegmentieren', { storeyId });
    const referenz = segmentiere(FOOTPRINT, KORRIDOR, [{ typ: 'preisguenstig', groesse: 75, anzahl: 4 }]);
    const neueZonen = doc.byKind<Zone>('zone').filter((z) => z.raumTyp !== 'korridor' && z.sia !== 'KF');
    expect(neueZonen).toHaveLength(referenz.wohnungen.length);
    expect(r.summary).toBe('Wohnungen segmentieren');
  });

  it('ohne Korridor-Zone bleibt der Kontext-Check auch mit vorberechneteWohnungen aktiv', () => {
    const doc = new KosmoDoc();
    const eg = execute(doc, 'design.geschossErstellen', { name: 'EG', index: 0, elevation: 0, height: 3000 });
    const storeyId = (eg.patches[0] as { id: string }).id;
    execute(doc, 'design.zoneErstellen', { storeyId, name: 'Regelgeschoss', sia: 'KF', outline: FOOTPRINT });
    expect(() =>
      execute(doc, 'design.wohnungenSegmentieren', {
        storeyId,
        vorberechneteWohnungen: [{ outline: FOOTPRINT, flaeche: 10, typ: 'marktgerecht', abweichung: 0 }],
      }),
    ).toThrow(/Raumtyp «korridor»/);
  });
});
