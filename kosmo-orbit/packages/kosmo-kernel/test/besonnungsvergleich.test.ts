import { describe, expect, it } from 'vitest';
import {
  besonnungJeVariante,
  BESONNUNG_HINWEIS,
  type BesonnungsStandort,
} from '../src/derive/besonnungsvergleich';
import type { StudienKoerper, StudienVariante } from '../src/derive/volumenstudie';
import { polygonArea, type Pt } from '../src/model/units';

/**
 * Batch D2 (Wettbewerb-Konzept, Entscheid D-E4): Besonnungsvergleich je
 * Volumenstudien-Variante — reine SunCalc-Auswertung auf `StudienKoerper[]`,
 * Wintersonnenwende 10/12/14 Uhr MEZ. Vergleichs-Richtwert, kein
 * Normnachweis (s. Modul-Kommentar `besonnungsvergleich.ts`).
 */

const ZUG: BesonnungsStandort = { lat: 47.05, lon: 8.31 };

const R = (x: number, y: number, w: number, h: number): Pt[] => [
  { x, y },
  { x: x + w, y },
  { x: x + w, y: y + h },
  { x, y: y + h },
];

const koerper = (outline: Pt[], height: number): StudienKoerper => ({ outline, height, program: 'studie' });

const V = (id: string, koerperListe: StudienKoerper[], gf: number): StudienVariante => ({
  id,
  name: `Variante ${id}`,
  beschrieb: '',
  koerper: koerperListe,
  gf,
  geschosse: 1,
  hoehe: koerperListe[0]?.height ?? 0,
  hoehen: { eg: 2800, og: 2800 },
  passt: true,
  tiefe: null,
  tiefeOk: null,
  besonnung: null,
  hinweise: [],
});

describe('besonnungJeVariante', () => {
  it('leere Varianten → leeres Ergebnis', () => {
    expect(besonnungJeVariante([], ZUG)).toEqual([]);
  });

  it('Variante ohne Studienkörper → 0 m² beschattet je Zeitpunkt', () => {
    const varianten = [V('leer', [], 1000)];
    const [ergebnis] = besonnungJeVariante(varianten, ZUG);

    expect(ergebnis!.zeitpunkte).toHaveLength(3);
    for (const z of ergebnis!.zeitpunkte) {
      expect(z.beschatteteFlaecheM2).toBe(0);
    }
    expect(ergebnis!.richtwertM2).toBe(0);
    expect(ergebnis!.hinweis).toBe(BESONNUNG_HINWEIS);
  });

  it('Determinismus: zweimal identische Eingabe → identisches Ergebnis', () => {
    const varianten = [
      V('turm', [koerper(R(0, 0, 10000, 10000), 60000)], 2100),
      V('riegel', [koerper(R(0, 0, 14000, 40000), 9000)], 2100),
    ];

    const a = besonnungJeVariante(varianten, ZUG);
    const b = besonnungJeVariante(varianten, ZUG);

    expect(a).toEqual(b);
  });

  it('hoher Turm vs. flacher Riegel gleicher GF → unterschiedlicher, plausibel gerichteter Schatten', () => {
    // Gleiche GF (hier direkt gesetzt, s. Fixture): der Kennwert selbst
    // bezieht sich nur auf die Geometrie (koerper), nicht auf `gf`.
    const turmOutline = R(0, 0, 10000, 10000); // 10×10 m, 100 m²
    const riegelOutline = R(0, 0, 14000, 40000); // 14×40 m, 560 m²
    const turm = V('turm', [koerper(turmOutline, 60000)], 2100); // 60 m hoch
    const riegel = V('riegel', [koerper(riegelOutline, 9000)], 2100); // 9 m hoch (3 Geschosse)

    const [turmErgebnis, riegelErgebnis] = besonnungJeVariante([turm, riegel], ZUG);

    expect(turmErgebnis!.zeitpunkte).toHaveLength(3);
    expect(riegelErgebnis!.zeitpunkte).toHaveLength(3);

    const turmFootprintM2 = Math.abs(polygonArea(turmOutline)) / 1e6;
    const riegelFootprintM2 = Math.abs(polygonArea(riegelOutline)) / 1e6;

    for (let i = 0; i < 3; i++) {
      const tz = turmErgebnis!.zeitpunkte[i]!;
      const rz = riegelErgebnis!.zeitpunkte[i]!;

      expect(tz.stunde).toBe(rz.stunde);
      // Beide Male Sonne über Horizont zur Wintersonnenwende 10/12/14 Uhr in Zug.
      expect(tz.ueberHorizont).toBe(true);
      expect(rz.ueberHorizont).toBe(true);

      // Unterschiedlicher Kennwert (nicht einfach gleich, da unterschiedliche Geometrie).
      expect(tz.beschatteteFlaecheM2).not.toBe(rz.beschatteteFlaecheM2);

      // Plausible Richtung: die vom Schattenwurf zusätzlich beanspruchte Fläche
      // (Gesamtfläche minus eigener Fussabdruck) ist beim 6× so hohen Turm
      // deutlich grösser als beim flachen Riegel — der Turm wirft den weiteren
      // Schatten, trotz kleinerem Fussabdruck.
      const turmZusatz = tz.beschatteteFlaecheM2 - turmFootprintM2;
      const riegelZusatz = rz.beschatteteFlaecheM2 - riegelFootprintM2;
      expect(turmZusatz).toBeGreaterThan(riegelZusatz);
    }

    // Richtwert (Mittel über die drei Zeitpunkte) unterscheidet sich ebenfalls.
    expect(turmErgebnis!.richtwertM2).not.toBe(riegelErgebnis!.richtwertM2);
    expect(turmErgebnis!.hinweis).toBe(BESONNUNG_HINWEIS);
  });

  it('Sonnenwinkel je Referenzstunde sind plausibel (Wintersonnenwende, ~47° N)', () => {
    const varianten = [V('teppich', [koerper(R(0, 0, 20000, 20000), 12000)], 400)];
    const [ergebnis] = besonnungJeVariante(varianten, ZUG);

    const [zehn, zwoelf, vierzehn] = ergebnis!.zeitpunkte;
    expect(zehn!.stunde).toBe(10);
    expect(zwoelf!.stunde).toBe(12);
    expect(vierzehn!.stunde).toBe(14);

    // Sonnenhöchststand liegt nahe 12 Uhr MEZ — tiefer Wintersonnenstand (< 25°),
    // aber höher als am Vor-/Nachmittag.
    expect(zwoelf!.sonnenhoeheGrad).toBeGreaterThan(zehn!.sonnenhoeheGrad);
    expect(zwoelf!.sonnenhoeheGrad).toBeGreaterThan(vierzehn!.sonnenhoeheGrad);
    expect(zwoelf!.sonnenhoeheGrad).toBeLessThan(25);

    // Azimut wandert über den Tag von Südost (< 180°) über Süd nach Südwest (> 180°).
    expect(zehn!.sonnenazimutGrad).toBeLessThan(180);
    expect(vierzehn!.sonnenazimutGrad).toBeGreaterThan(180);
  });

  it('optionale Referenzstunden/Jahr werden respektiert', () => {
    const varianten = [V('teppich', [koerper(R(0, 0, 20000, 20000), 12000)], 400)];
    const [ergebnis] = besonnungJeVariante(varianten, ZUG, { stunden: [12], jahr: 2030 });

    expect(ergebnis!.zeitpunkte).toHaveLength(1);
    expect(ergebnis!.zeitpunkte[0]!.stunde).toBe(12);
  });
});
