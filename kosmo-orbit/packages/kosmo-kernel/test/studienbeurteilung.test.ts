import { describe, expect, it } from 'vitest';
import {
  TYPOLOGIE_MERKMALE,
  beurteilungssaetze,
  empfehlungssaetze,
  flaechenKennwert,
  kompaktheitsProxy,
  regelGoodness,
  situationSvg,
  studienRanking,
  bboxVonPunkte,
} from '../src/derive/studienbeurteilung';
import { generiereVolumenstudien } from '../src/derive/volumenstudie';
import type { StudienVariante } from '../src/derive/volumenstudie';
import { programmErfuellungJeVariante } from '../src/derive/programmerfuellung';
import type { RaumprogrammPosten } from '../src/model/doc';

/**
 * Grundlagenstudie-Beurteilung v2 (K1, `docs/OWNER-BEFUNDE-0.6.2.md` S. 9):
 * die architektonische Urteilsbildung (Ranking, Empfehlungs-/Beurteilungs-
 * sätze, Situations-Diagramm, Typologie-Wissen) lebt als pure Helfer in
 * `derive/studienbeurteilung.ts` — hier isoliert getestet, unabhängig von der
 * Blatt-Komposition (`test/studienbericht.test.ts`).
 */

const PARZELLE = [
  { x: 0, y: 0 },
  { x: 60000, y: 0 },
  { x: 60000, y: 60000 },
  { x: 0, y: 60000 },
];

function fixtureVarianten(): StudienVariante[] {
  return generiereVolumenstudien(PARZELLE, { zielGf: 6000, maxHoehe: 30000 });
}

describe('studienRanking', () => {
  it('bestes Programm + regelkonform schlägt eine sprengt-Höhe-Variante (Turm), deterministisch', () => {
    const varianten = fixtureVarianten();
    const raumprogramm: RaumprogrammPosten[] = [{ typ: 'marktgerecht', hnfSoll: 5000 }];
    const programm = programmErfuellungJeVariante(varianten, raumprogramm, 1.22);
    const ranking = studienRanking(varianten, { parzelle: PARZELLE, maxHoeheMm: 30000, programm, zielGf: 6000 });
    const turm = varianten.find((v) => v.id === 'turm')!;
    expect(turm.passt).toBe(false);
    expect(ranking.topId).not.toBe(turm.id);
    const turmZeile = ranking.zeilen.find((z) => z.varianteId === turm.id)!;
    const topZeile = ranking.zeilen.find((z) => z.varianteId === ranking.topId)!;
    expect(topZeile.score).toBeGreaterThan(turmZeile.score);

    // Determinismus: zweiter Aufruf mit identischen Eingaben liefert dasselbe Ergebnis.
    const ranking2 = studienRanking(varianten, { parzelle: PARZELLE, maxHoeheMm: 30000, programm, zielGf: 6000 });
    expect(ranking2).toEqual(ranking);
  });

  it('regelkonforme Varianten liegen IMMER vor sprengenden — auch ohne bekanntes maxHoeheMm', () => {
    const varianten = fixtureVarianten();
    const ranking = studienRanking(varianten, { parzelle: undefined, maxHoeheMm: undefined, programm: undefined });
    const turmScore = ranking.zeilen.find((z) => z.varianteId === 'turm')!.score;
    for (const z of ranking.zeilen) {
      if (z.varianteId === 'turm') continue;
      expect(z.score).toBeGreaterThan(turmScore);
    }
  });

  it('ohne Parzelle/Programm werden diese Kriterien deaktiviert (Gewicht 0) und die übrigen Gewichte summieren weiterhin zu 1', () => {
    const varianten = fixtureVarianten();
    const ranking = studienRanking(varianten, { parzelle: undefined, maxHoeheMm: 30000, programm: undefined });
    const programmGewicht = ranking.gewichte.find((g) => g.key === 'programm')!;
    const freiflaecheGewicht = ranking.gewichte.find((g) => g.key === 'freiflaeche')!;
    expect(programmGewicht.aktiv).toBe(false);
    expect(programmGewicht.gewicht).toBe(0);
    expect(freiflaecheGewicht.aktiv).toBe(false);
    expect(freiflaecheGewicht.gewicht).toBe(0);
    const summeAktiv = ranking.gewichte.filter((g) => g.aktiv).reduce((s, g) => s + g.gewicht, 0);
    expect(Math.round(summeAktiv * 100) / 100).toBe(1);
  });

  it('Gleichstand: bei identischem Score gewinnt die erste Variante in Eingabe-Reihenfolge', () => {
    // Zwei synthetische, in jeder Hinsicht identische Varianten (nur ID/Name verschieden).
    const basis: StudienVariante = fixtureVarianten()[0]!;
    const a: StudienVariante = { ...basis, id: 'a', name: 'A' };
    const b: StudienVariante = { ...basis, id: 'b', name: 'B' };
    const ranking = studienRanking([a, b], { parzelle: undefined, maxHoeheMm: undefined, programm: undefined });
    expect(ranking.zeilen[0]!.score).toBe(ranking.zeilen[1]!.score);
    expect(ranking.topId).toBe('a');
  });

  it('leere Variantenliste liefert ein leeres, aber valides Ranking (kein Absturz)', () => {
    const ranking = studienRanking([], { parzelle: undefined, maxHoeheMm: undefined, programm: undefined });
    expect(ranking.topId).toBeNull();
    expect(ranking.zeilen).toEqual([]);
    expect(ranking.gewichte.every((g) => !g.aktiv)).toBe(true);
  });
});

describe('regelGoodness', () => {
  it('eine passende Variante hat IMMER einen höheren Rohwert als eine sprengende — unabhängig von der konkreten Höhenreserve', () => {
    const varianten = fixtureVarianten();
    const teppich = varianten.find((v) => v.id === 'teppich')!; // passt: true
    const turm = varianten.find((v) => v.id === 'turm')!; // passt: false
    expect(teppich.passt).toBe(true);
    expect(turm.passt).toBe(false);
    expect(regelGoodness(teppich, 30000)).toBeGreaterThan(regelGoodness(turm, 30000));
    // Auch ohne bekannte Regel-Höhe bleibt die Trennung bestehen.
    expect(regelGoodness(teppich, undefined)).toBeGreaterThan(regelGoodness(turm, undefined));
  });
});

describe('flaechenKennwert', () => {
  it('ohne Parzelle liefert es null-Felder (keine erfundene Prozentzahl)', () => {
    const varianten = fixtureVarianten();
    const fk = flaechenKennwert(varianten[0]!, undefined);
    expect(fk.parzelleM2).toBeNull();
    expect(fk.ueberbauungProzent).toBeNull();
    expect(fk.freiflaecheProzent).toBeNull();
    expect(fk.footprintM2).toBeGreaterThan(0);
  });

  it('mit Parzelle ergeben Überbauung + Freifläche exakt 100 %', () => {
    const varianten = fixtureVarianten();
    for (const v of varianten) {
      const fk = flaechenKennwert(v, PARZELLE);
      expect(fk.ueberbauungProzent).not.toBeNull();
      expect(Math.round((fk.ueberbauungProzent! + fk.freiflaecheProzent!) * 10) / 10).toBe(100);
    }
  });
});

describe('kompaktheitsProxy', () => {
  it('rechnet exakt Fassadenumfang×Höhe/GF nach (Turm: quadratischer 24×24-m-Footprint, 10 Geschosse à 2.8 m)', () => {
    const varianten = fixtureVarianten();
    const turm = varianten.find((v) => v.id === 'turm')!;
    expect(turm.koerper).toHaveLength(1);
    const [k] = turm.koerper;
    const umfangMm = k!.outline.reduce((s, p, i) => {
      const next = k!.outline[(i + 1) % k!.outline.length]!;
      return s + Math.hypot(next.x - p.x, next.y - p.y);
    }, 0);
    const erwartet = Math.round(((umfangMm * turm.hoehe) / 1e6 / turm.gf) * 10) / 10;
    expect(kompaktheitsProxy(turm)).toBe(erwartet);
  });

  it('ein quadratischer Footprint mit doppelter Kantenlänge hat den halben Proxy-Wert (reine Umfang/Fläche-Skalierung)', () => {
    // Ein Quadrat mit Seite 2s hat 2× Umfang, aber 4× Fläche eines Quadrats
    // mit Seite s — bei gleicher Geschosszahl/-höhe halbiert sich darum
    // Fassadenumfang×Höhe/GF exakt. Reiner Formel-Test, unabhängig von der
    // Fixture-Geometrie.
    const basis = fixtureVarianten().find((v) => v.id === 'turm')!;
    const klein: StudienVariante = {
      ...basis,
      koerper: [{ outline: [{ x: 0, y: 0 }, { x: 10000, y: 0 }, { x: 10000, y: 10000 }, { x: 0, y: 10000 }], height: basis.hoehe, program: 'studie' }],
      gf: 100, // 10m×10m × 1 Geschoss
      geschosse: 1,
    };
    const gross: StudienVariante = {
      ...basis,
      koerper: [{ outline: [{ x: 0, y: 0 }, { x: 20000, y: 0 }, { x: 20000, y: 20000 }, { x: 0, y: 20000 }], height: basis.hoehe, program: 'studie' }],
      gf: 400, // 20m×20m × 1 Geschoss
      geschosse: 1,
    };
    const proxyKlein = kompaktheitsProxy(klein)!;
    const proxyGross = kompaktheitsProxy(gross)!;
    expect(Math.round((proxyKlein / proxyGross) * 100) / 100).toBe(2);
  });
});

describe('empfehlungssaetze', () => {
  it('nennt die Top-Ranking-Variante im ersten Satz und begründet mit echten Zahlen (nie generisch)', () => {
    const varianten = fixtureVarianten();
    const raumprogramm: RaumprogrammPosten[] = [{ typ: 'marktgerecht', hnfSoll: 5000 }];
    const programm = programmErfuellungJeVariante(varianten, raumprogramm, 1.22);
    const ranking = studienRanking(varianten, { parzelle: PARZELLE, maxHoeheMm: 30000, programm, zielGf: 6000 });
    const saetze = empfehlungssaetze(varianten, ranking, { parzelle: PARZELLE, maxHoeheMm: 30000, programm, zielGf: 6000 });
    const top = varianten.find((v) => v.id === ranking.topId)!;
    expect(saetze[0]).toBe(`Empfehlung: ${top.name}.`);
    // Mindestens EIN Begründungssatz muss eine Ziffer enthalten (echte Zahl, keine Floskel).
    expect(saetze.slice(1).some((s) => /\d/.test(s))).toBe(true);
    expect(saetze.length).toBeGreaterThanOrEqual(2);
    expect(saetze.length).toBeLessThanOrEqual(4);
  });

  it('leere Variantenliste liefert einen Fallback-Text statt eines Absturzes', () => {
    const ranking = studienRanking([], { parzelle: undefined, maxHoeheMm: undefined, programm: undefined });
    const saetze = empfehlungssaetze([], ranking, { parzelle: undefined, maxHoeheMm: undefined, programm: undefined });
    expect(saetze[0]).toBe('Empfehlung: —');
  });
});

describe('beurteilungssaetze', () => {
  it('kombiniert die Typologie-Einordnung MIT den echten Zahlen der Variante (Geschosse/Höhe/GF)', () => {
    const varianten = fixtureVarianten();
    const teppich = varianten.find((v) => v.id === 'teppich')!;
    const saetze = beurteilungssaetze(teppich, { parzelle: PARZELLE, maxHoeheMm: 30000, programm: undefined, zielGf: 6000 });
    expect(saetze[0]).toContain(String(teppich.geschosse));
    expect(saetze[0]).toContain(`${(teppich.hoehe / 1000).toLocaleString('de-CH', { maximumFractionDigits: 1 })} m`);
    expect(saetze[0]).toContain(`${teppich.gf.toLocaleString('de-CH', { maximumFractionDigits: 1 })} m²`);
    expect(saetze.length).toBeGreaterThanOrEqual(3);
    expect(saetze.length).toBeLessThanOrEqual(4);
  });

  it('nennt für eine sprengende Variante (Turm) die ECHTE Höhen-Überschreitung in Metern statt einer Floskel', () => {
    const varianten = fixtureVarianten();
    const turm = varianten.find((v) => v.id === 'turm')!;
    expect(turm.passt).toBe(false);
    const saetze = beurteilungssaetze(turm, { parzelle: PARZELLE, maxHoeheMm: 30000, programm: undefined, zielGf: 6000 });
    const schwaecheSatz = saetze.find((s) => s.includes('Sprengt die zulässige Höhe'));
    expect(schwaecheSatz).toBeDefined();
    expect(schwaecheSatz).toMatch(/Sprengt die zulässige Höhe um [\d.,]+ m/);
  });

  it('ohne bekanntes maxHoehe/zielGf bleibt die Schwäche generisch statt eine falsche Zahl zu erfinden', () => {
    const varianten = fixtureVarianten();
    const turm = varianten.find((v) => v.id === 'turm')!;
    const saetze = beurteilungssaetze(turm, { parzelle: undefined, maxHoeheMm: undefined, programm: undefined });
    expect(saetze.some((s) => s === 'Sprengt die zulässige Höhe, um das Programm zu fassen.')).toBe(true);
  });

  it('nennt für die tiefenwidrige Winkel-Variante das exakte Mass ausserhalb des Spänner-Bereichs', () => {
    const varianten = fixtureVarianten();
    const winkel = varianten.find((v) => v.id === 'winkel')!;
    expect(winkel.tiefeOk).toBe(false);
    const saetze = beurteilungssaetze(winkel, { parzelle: PARZELLE, maxHoeheMm: 30000, programm: undefined });
    const text = saetze.join(' ');
    expect(text).toContain(`Gebäudetiefe ${(winkel.tiefe! / 1000).toLocaleString('de-CH', { maximumFractionDigits: 1 })} m`);
  });

  it('unbekannte Typologie-ID fällt ehrlich auf reine Kennzahlen zurück (keine erfundene Einordnung)', () => {
    const basis = fixtureVarianten()[0]!;
    const unbekannt: StudienVariante = { ...basis, id: 'unbekannte-typologie' };
    const saetze = beurteilungssaetze(unbekannt, { parzelle: undefined, maxHoeheMm: undefined, programm: undefined });
    expect(saetze[0]).not.toMatch(/—/); // kein Merkmal-Anschluss-Bindestrich-Text
    expect(saetze[0]).toContain(String(unbekannt.geschosse));
  });
});

describe('TYPOLOGIE_MERKMALE', () => {
  it('deckt alle sechs von generiereVolumenstudien erzeugten Extremvarianten-IDs ab', () => {
    const varianten = fixtureVarianten();
    for (const v of varianten) {
      expect(TYPOLOGIE_MERKMALE[v.id], `Merkmal fehlt für Typologie «${v.id}»`).toBeDefined();
    }
    expect(Object.keys(TYPOLOGIE_MERKMALE).sort()).toEqual(
      ['blockrand', 'riegel', 'teppich', 'turm', 'winkel', 'zeilen'].sort(),
    );
  });
});

describe('situationSvg', () => {
  const bb = { minX: 0, minY: 0, maxX: 60000, maxY: 60000 };
  const footprint = [
    { x: 10000, y: 10000 },
    { x: 50000, y: 10000 },
    { x: 50000, y: 50000 },
    { x: 10000, y: 50000 },
  ];

  it('enthält das Parzellen-Polygon (gestrichelt) WENN eine Parzelle übergeben wird', () => {
    const svg = situationSvg(PARZELLE, [{ outline: footprint, height: 10000, program: 'studie' }], bb, 0.002, 0, 0, 150);
    expect(svg).toContain('stroke-dasharray="3,2"');
    // Zwei Polygone: Parzelle (gestrichelt) + EIN Footprint.
    expect(svg.match(/<polygon/g)?.length).toBe(2);
  });

  it('enthält KEIN Parzellen-Polygon, wenn keine Parzelle übergeben wird — nur den Footprint', () => {
    const svg = situationSvg(undefined, [{ outline: footprint, height: 10000, program: 'studie' }], bb, 0.002, 0, 0, 150);
    expect(svg).not.toContain('stroke-dasharray');
    expect(svg.match(/<polygon/g)?.length).toBe(1);
  });
});

describe('bboxVonPunkte', () => {
  it('liefert null für eine leere Liste, sonst die umschliessende BBox', () => {
    expect(bboxVonPunkte([])).toBeNull();
    const bb = bboxVonPunkte([PARZELLE]);
    expect(bb).toEqual({ minX: 0, minY: 0, maxX: 60000, maxY: 60000 });
  });
});
