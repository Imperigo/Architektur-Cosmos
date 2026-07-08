import { describe, expect, it } from 'vitest';
import {
  programmErfuellungJeVariante,
  PROGRAMM_ERFUELLUNG_HINWEIS,
} from '../src/derive/programmerfuellung';
import { generiereVolumenstudien } from '../src/derive/volumenstudie';
import type { StudienVariante } from '../src/derive/volumenstudie';
import type { RaumprogrammPosten } from '../src/model/doc';

/**
 * Batch D3 (Wettbewerb-Konzept, Entscheid D-E5): Programm-Erfüllungsgrad je
 * Volumenstudien-Variante — reine Gesamt-GF-Ableitung, keine Typenzuordnung.
 */

const V = (id: string, gf: number): StudienVariante => ({
  id,
  name: `Variante ${id}`,
  beschrieb: '',
  koerper: [],
  gf,
  geschosse: 1,
  hoehe: 1000,
  hoehen: { eg: 1000, og: 1000 },
  passt: true,
  tiefe: null,
  tiefeOk: null,
  besonnung: null,
  hinweise: [],
});

describe('programmErfuellungJeVariante', () => {
  it('Variante exakt auf Soll → 100 %, Delta 0', () => {
    const raumprogramm: RaumprogrammPosten[] = [{ typ: 'marktgerecht', hnfSoll: 1000 }];
    const programmFaktor = 1.22;
    const sollGf = 1000 * 1.22; // 1220
    const varianten = [V('teppich', sollGf)];

    const ergebnis = programmErfuellungJeVariante(varianten, raumprogramm, programmFaktor);

    expect(ergebnis).toHaveLength(1);
    expect(ergebnis[0]).toMatchObject({
      varianteId: 'teppich',
      varianteName: 'Variante teppich',
      gf: sollGf,
      sollGf,
      erfuellungProzent: 100,
      deltaAbsolut: 0,
      hinweis: PROGRAMM_ERFUELLUNG_HINWEIS,
    });
  });

  it('halbe GF → 50 % Erfüllung, negatives Delta', () => {
    const raumprogramm: RaumprogrammPosten[] = [{ typ: 'marktgerecht', hnfSoll: 1000 }];
    const programmFaktor = 1.0; // sollGf = 1000, einfacher Faktor
    const varianten = [V('riegel', 500)];

    const ergebnis = programmErfuellungJeVariante(varianten, raumprogramm, programmFaktor);

    expect(ergebnis[0]!.sollGf).toBe(1000);
    expect(ergebnis[0]!.erfuellungProzent).toBe(50);
    expect(ergebnis[0]!.deltaAbsolut).toBe(-500);
  });

  it('Summiert mehrere Raumprogramm-Posten mit demselben programmFaktor wie deriveBerechnungsliste (agfZiel = hnfSoll * programmFaktor)', () => {
    const raumprogramm: RaumprogrammPosten[] = [
      { typ: 'marktgerecht', hnfSoll: 400 },
      { typ: 'preisguenstig', hnfSoll: 600 },
    ];
    const programmFaktor = 1.22;
    const sollGf = Math.round((400 + 600) * 1.22 * 10) / 10; // 1220
    const varianten = [V('turm', sollGf)];

    const ergebnis = programmErfuellungJeVariante(varianten, raumprogramm, programmFaktor);

    expect(ergebnis[0]!.sollGf).toBe(sollGf);
    expect(ergebnis[0]!.erfuellungProzent).toBe(100);
  });

  it('leeres Raumprogramm → sollGf 0, erfuellungProzent null, deltaAbsolut = gf (klar definiert, kein Verwerfen der Variante)', () => {
    const varianten = [V('teppich', 1234), V('turm', 0)];

    const ergebnis = programmErfuellungJeVariante(varianten, [], 1.22);

    expect(ergebnis).toHaveLength(2);
    for (const zeile of ergebnis) {
      expect(zeile.sollGf).toBe(0);
      expect(zeile.erfuellungProzent).toBeNull();
    }
    expect(ergebnis[0]!.deltaAbsolut).toBe(1234);
    expect(ergebnis[1]!.deltaAbsolut).toBe(0);
  });

  it('leere Varianten-Liste → leeres Ergebnis, unabhängig vom Raumprogramm', () => {
    const raumprogramm: RaumprogrammPosten[] = [{ typ: 'marktgerecht', hnfSoll: 500 }];

    expect(programmErfuellungJeVariante([], raumprogramm, 1.22)).toEqual([]);
    expect(programmErfuellungJeVariante([], [], 1.22)).toEqual([]);
  });

  it('Delta > 0 heisst über Soll, jede Zeile trägt den Ehrlichkeits-Hinweis (D-E5, keine Typenzuordnung)', () => {
    const raumprogramm: RaumprogrammPosten[] = [{ typ: 'marktgerecht', hnfSoll: 1000 }];
    const varianten = [V('blockrand', 2000)];

    const ergebnis = programmErfuellungJeVariante(varianten, raumprogramm, 1.0);

    expect(ergebnis[0]!.deltaAbsolut).toBe(1000);
    expect(ergebnis[0]!.erfuellungProzent).toBe(200);
    expect(ergebnis[0]!.hinweis).toBe('Gesamt-GF-Vergleich — keine Raumtypen-Zuordnung (Studie)');
  });

  it('Determinismus: zweifacher Aufruf mit identischen Eingaben liefert identisches Ergebnis', () => {
    const raumprogramm: RaumprogrammPosten[] = [
      { typ: 'marktgerecht', hnfSoll: 1234.5 },
      { typ: 'alterswohnen', hnfSoll: 321.7 },
    ];
    const varianten = [V('teppich', 900), V('riegel', 1500), V('turm', 100)];

    const a = programmErfuellungJeVariante(varianten, raumprogramm, 1.22);
    const b = programmErfuellungJeVariante(varianten, raumprogramm, 1.22);

    expect(a).toEqual(b);
  });

  it('bewusst KEINE Typenzuordnung: StudienKoerper.program bleibt bei generierten Varianten immer "studie" (D-E5)', () => {
    const parzelle = [
      { x: 0, y: 0 },
      { x: 60000, y: 0 },
      { x: 60000, y: 60000 },
      { x: 0, y: 60000 },
    ];
    const varianten = generiereVolumenstudien(parzelle, { zielGf: 8000, maxHoehe: 30000 });
    expect(varianten.length).toBeGreaterThan(0);
    for (const v of varianten) {
      for (const k of v.koerper) {
        expect(k.program).toBe('studie');
      }
    }

    const raumprogramm: RaumprogrammPosten[] = [{ typ: 'marktgerecht', hnfSoll: 8000 / 1.22 }];
    const ergebnis = programmErfuellungJeVariante(varianten, raumprogramm, 1.22);
    // Jede Zeile vergleicht nur Gesamt-GF — keine typ-spezifischen Felder im Ergebnis.
    for (const zeile of ergebnis) {
      expect(Object.keys(zeile).sort()).toEqual(
        ['deltaAbsolut', 'erfuellungProzent', 'gf', 'hinweis', 'sollGf', 'varianteId', 'varianteName'].sort(),
      );
    }
  });
});
