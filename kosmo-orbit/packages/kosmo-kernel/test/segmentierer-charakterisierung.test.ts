import { describe, expect, it } from 'vitest';
import { segmentiere } from '../src/derive/segmentierer';

/**
 * Charakterisierungstests (V070-KONZEPT E5-i, Stream 4A) — VOR dem Refactor
 * eingefroren, der `segmentiere()` in kleinere, exportierte Bausteine zerlegt
 * (`bilderBaender`, `schneideBand`, `reserviereKern`, `ergebnisAusWohnungen`),
 * damit `derive/variantensuche.ts` sie wiederverwenden kann, statt die
 * Greedy-DP-Logik zu duplizieren. Diese drei Fixtures MÜSSEN vor und nach dem
 * Refactor byte-identisch grün bleiben — sie sind die Beweislast für
 * «Verhalten identisch».
 *
 * Fixture A ist bewusst dieselbe reale Geometrie wie in
 * wohnungen-segmentieren-command.test.ts (MFH-Regelgeschoss aus
 * e2e/sim-mfh.spec.ts: Regelgeschoss 30×14 m, Mittelkorridor y 6000–8000,
 * Raumprogramm 300 m² «preisguenstig», hier zusätzlich mit `kern: true`) —
 * doppelte Absicherung derselben Kern-/Wohnungsgeometrie schadet nicht.
 * Fixture B und C sind neu (zwei-Typ-Mix, Kein-Kern-Diagnose-Pfad,
 * Kern-zu-kurz-Diagnose-Pfad) und decken die beiden extrahierten Helfer
 * (`reserviereKern`, `ergebnisAusWohnungen`) mit ihren Diagnose-Zweigen ab.
 */

describe('Charakterisierung: segmentiere() — eingefroren vor der Extraktion', () => {
  it('Fixture A — MFH-Regelgeschoss 30×14 m, Korridor y 6000–8000, kern:true (4× preisguenstig à 75 m²)', () => {
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
    const erg = segmentiere(FOOTPRINT, KORRIDOR, [{ typ: 'preisguenstig', groesse: 75, anzahl: 4 }], {
      kern: true,
      minBreite: 4500,
    });
    expect(erg).toEqual({
      wohnungen: [
        {
          outline: [
            { x: 3000, y: 8000 },
            { x: 15500, y: 8000 },
            { x: 15500, y: 14000 },
            { x: 3000, y: 14000 },
          ],
          flaeche: 75,
          typ: 'preisguenstig',
          abweichung: 0,
        },
        {
          outline: [
            { x: 15500, y: 8000 },
            { x: 28000, y: 8000 },
            { x: 28000, y: 14000 },
            { x: 15500, y: 14000 },
          ],
          flaeche: 75,
          typ: 'preisguenstig',
          abweichung: 0,
        },
        {
          outline: [
            { x: 28000, y: 8000 },
            { x: 30000, y: 8000 },
            { x: 30000, y: 14000 },
            { x: 28000, y: 14000 },
          ],
          flaeche: 12,
          typ: null,
          abweichung: null,
        },
        {
          outline: [
            { x: 0, y: 0 },
            { x: 12500, y: 0 },
            { x: 12500, y: 6000 },
            { x: 0, y: 6000 },
          ],
          flaeche: 75,
          typ: 'preisguenstig',
          abweichung: 0,
        },
        {
          outline: [
            { x: 12500, y: 0 },
            { x: 25000, y: 0 },
            { x: 25000, y: 6000 },
            { x: 12500, y: 6000 },
          ],
          flaeche: 75,
          typ: 'preisguenstig',
          abweichung: 0,
        },
        {
          outline: [
            { x: 25000, y: 0 },
            { x: 30000, y: 0 },
            { x: 30000, y: 6000 },
            { x: 25000, y: 6000 },
          ],
          flaeche: 30,
          typ: null,
          abweichung: null,
        },
      ],
      mix: [{ typ: 'preisguenstig', soll: 4, ist: 4 }],
      kern: {
        outline: [
          { x: 0, y: 8000 },
          { x: 3000, y: 8000 },
          { x: 3000, y: 14000 },
          { x: 0, y: 14000 },
        ],
      },
      diagnose: [
        'Erschliessungskern 3.0 m am Bandanfang reserviert (Treppenhaus).',
        'Restfläche 42.0 m² — als «Opfer-Wohnung» zusammenfassen oder Schnitt verschieben.',
      ],
    });
  });

  it('Fixture B — zwei Typen (marktgerecht/alterswohnen), kein Kern, zwei Bänder à 7 m Tiefe (Footprint 40×16 m, Korridor y 7000–9000)', () => {
    const FOOTPRINT = [
      { x: 0, y: 0 },
      { x: 40000, y: 0 },
      { x: 40000, y: 16000 },
      { x: 0, y: 16000 },
    ];
    const KORRIDOR = [
      { x: 0, y: 7000 },
      { x: 40000, y: 7000 },
      { x: 40000, y: 9000 },
      { x: 0, y: 9000 },
    ];
    const erg = segmentiere(
      FOOTPRINT,
      KORRIDOR,
      [
        { typ: 'marktgerecht', groesse: 95, anzahl: 3 },
        { typ: 'alterswohnen', groesse: 65, anzahl: 3 },
      ],
      { minBreite: 4500 },
    );
    expect(erg.kern).toBeNull();
    expect(erg.mix).toEqual([
      { typ: 'marktgerecht', soll: 3, ist: 3 },
      { typ: 'alterswohnen', soll: 3, ist: 3 },
    ]);
    expect(erg.diagnose).toEqual([
      'Restfläche 82.3 m² — als «Opfer-Wohnung» zusammenfassen oder Schnitt verschieben.',
    ]);
    expect(erg.wohnungen).toEqual([
      {
        outline: [
          { x: 0, y: 9000 },
          { x: 13500, y: 9000 },
          { x: 13500, y: 16000 },
          { x: 0, y: 16000 },
        ],
        flaeche: 94.5,
        typ: 'marktgerecht',
        abweichung: -0.5,
      },
      {
        outline: [
          { x: 13500, y: 9000 },
          { x: 22750, y: 9000 },
          { x: 22750, y: 16000 },
          { x: 13500, y: 16000 },
        ],
        flaeche: 64.8,
        typ: 'alterswohnen',
        abweichung: -0.2,
      },
      {
        outline: [
          { x: 22750, y: 9000 },
          { x: 36250, y: 9000 },
          { x: 36250, y: 16000 },
          { x: 22750, y: 16000 },
        ],
        flaeche: 94.5,
        typ: 'marktgerecht',
        abweichung: -0.5,
      },
      {
        outline: [
          { x: 36250, y: 9000 },
          { x: 40000, y: 9000 },
          { x: 40000, y: 16000 },
          { x: 36250, y: 16000 },
        ],
        flaeche: 26.3,
        typ: null,
        abweichung: null,
      },
      {
        outline: [
          { x: 0, y: 0 },
          { x: 9250, y: 0 },
          { x: 9250, y: 7000 },
          { x: 0, y: 7000 },
        ],
        flaeche: 64.8,
        typ: 'alterswohnen',
        abweichung: -0.2,
      },
      {
        outline: [
          { x: 9250, y: 0 },
          { x: 22750, y: 0 },
          { x: 22750, y: 7000 },
          { x: 9250, y: 7000 },
        ],
        flaeche: 94.5,
        typ: 'marktgerecht',
        abweichung: -0.5,
      },
      {
        outline: [
          { x: 22750, y: 0 },
          { x: 32000, y: 0 },
          { x: 32000, y: 7000 },
          { x: 22750, y: 7000 },
        ],
        flaeche: 64.8,
        typ: 'alterswohnen',
        abweichung: -0.2,
      },
      {
        outline: [
          { x: 32000, y: 0 },
          { x: 40000, y: 0 },
          { x: 40000, y: 7000 },
          { x: 32000, y: 7000 },
        ],
        flaeche: 56,
        typ: null,
        abweichung: null,
      },
    ]);
  });

  it('Fixture C — Band zu kurz für den Kern (Footprint 7×14 m, Korridor y 6000–8000): beide Diagnose-Zweige (Kern + Mix-Verfehlung + Restfläche)', () => {
    const FOOTPRINT = [
      { x: 0, y: 0 },
      { x: 7000, y: 0 },
      { x: 7000, y: 14000 },
      { x: 0, y: 14000 },
    ];
    const KORRIDOR = [
      { x: 0, y: 6000 },
      { x: 7000, y: 6000 },
      { x: 7000, y: 8000 },
      { x: 0, y: 8000 },
    ];
    const erg = segmentiere(FOOTPRINT, KORRIDOR, [{ typ: 'preisguenstig', groesse: 75, anzahl: 1 }], {
      kern: true,
      minBreite: 4500,
    });
    expect(erg).toEqual({
      wohnungen: [
        {
          outline: [
            { x: 0, y: 8000 },
            { x: 7000, y: 8000 },
            { x: 7000, y: 14000 },
            { x: 0, y: 14000 },
          ],
          flaeche: 42,
          typ: null,
          abweichung: null,
        },
        {
          outline: [
            { x: 0, y: 0 },
            { x: 7000, y: 0 },
            { x: 7000, y: 6000 },
            { x: 0, y: 6000 },
          ],
          flaeche: 42,
          typ: null,
          abweichung: null,
        },
      ],
      mix: [{ typ: 'preisguenstig', soll: 1, ist: 0 }],
      kern: null,
      diagnose: [
        'Band zu kurz für den Kern — ohne Treppenhaus geschnitten.',
        'preisguenstig: 0/1 — Band zu kurz oder Typgrösse passt nicht zur Tiefe.',
        'Restfläche 84.0 m² — als «Opfer-Wohnung» zusammenfassen oder Schnitt verschieben.',
      ],
    });
  });
});
