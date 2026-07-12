import { describe, expect, it } from 'vitest';
import { pruefeGolden } from './golden-helfer';
import { readFileSync } from 'node:fs';
import { studienBerichtSvg, type StudienBerichtOptionen } from '../src/derive/studienbericht';
import { generiereVolumenstudien } from '../src/derive/volumenstudie';
import type { StudienVariante } from '../src/derive/volumenstudie';
import { besonnungJeVariante, BESONNUNG_HINWEIS } from '../src/derive/besonnungsvergleich';
import { programmErfuellungJeVariante, PROGRAMM_ERFUELLUNG_HINWEIS } from '../src/derive/programmerfuellung';
import type { RaumprogrammPosten, ZonenRegel } from '../src/model/doc';
import { escapeXml } from '../src/derive/plansvg';

/**
 * Batch D5 (Wettbewerb-Konzept, Entscheid D-E8) + v2 (K1, `docs/OWNER-BEFUNDE-
 * 0.6.2.md` S. 9 — «Dieser gesamte Teil ist ultra schlecht!»): Grundlagen-
 * studie-Bericht als eigenständiges A3-quer-SVG-Exportartefakt mit echter
 * Blatt-Dramaturgie (Empfehlung → Situation + Vergleichstabelle + Beurteilung
 * je Variante → Grenzen der Studie). Die architektonische Urteilsbildung
 * selbst (Ranking, Beurteilungssätze, Situations-Diagramm) ist in
 * `test/studienbeurteilung.test.ts` separat getestet — hier geht es um die
 * KOMPOSITION des Blatts: Reihenfolge, Ehrlichkeitspfade, Determinismus.
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

const ZUG = { lat: 47.05, lon: 8.31 };

const REGEL: ZonenRegel = {
  name: 'W3',
  az: 0.6,
  maxHoehe: 30000,
  maxVollgeschosse: 10,
  grenzabstandKlein: 4000,
  grenzabstandGross: 10000,
};

describe('studienBerichtSvg', () => {
  it('liefert ein wohlgeformtes, eigenständiges A3-quer-SVG (beginnt mit <svg, endet mit </svg>)', () => {
    const svg = studienBerichtSvg(fixtureVarianten(), { zielGf: 6000 });
    expect(svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg"')).toBe(true);
    expect(svg.endsWith('</svg>')).toBe(true);
    expect(svg).toContain('viewBox="0 0 1587 1123"');
  });

  it('enthält jeden Variantennamen und die formatierte GF jeder Variante', () => {
    const varianten = fixtureVarianten();
    const svg = studienBerichtSvg(varianten, { zielGf: 6000 });
    for (const v of varianten) {
      expect(svg).toContain(escapeXml(v.name));
      expect(svg).toContain(escapeXml(`${v.gf.toLocaleString('de-CH', { maximumFractionDigits: 1 })} m²`));
    }
  });

  it('Determinismus: zweimaliger Aufruf mit identischen Eingaben liefert byte-identisches SVG', () => {
    const varianten = fixtureVarianten();
    const opts: StudienBerichtOptionen = {
      zielGf: 6000,
      titel: 'Testprojekt',
      regelName: 'Wohnzone W3',
      regel: REGEL,
      datum: '07.07.2026',
      parzelle: PARZELLE,
    };
    const a = studienBerichtSvg(varianten, opts);
    const b = studienBerichtSvg(varianten, opts);
    expect(a).toBe(b);
  });

  it('Ehrlichkeits-Hinweise erscheinen NUR, wenn die jeweilige Kennwertliste übergeben wurde', () => {
    const varianten = fixtureVarianten();
    const ohne = studienBerichtSvg(varianten, { zielGf: 6000 });
    expect(ohne).not.toContain(BESONNUNG_HINWEIS);
    expect(ohne).not.toContain(PROGRAMM_ERFUELLUNG_HINWEIS);
    expect(ohne).toContain('Anstoss, kein Entwurf');

    const besonnung = besonnungJeVariante(varianten, ZUG);
    const raumprogramm: RaumprogrammPosten[] = [{ typ: 'marktgerecht', hnfSoll: 5000 }];
    const programm = programmErfuellungJeVariante(varianten, raumprogramm, 1.22);
    const mit = studienBerichtSvg(varianten, { zielGf: 6000, besonnung, programm });
    expect(mit).toContain(BESONNUNG_HINWEIS);
    expect(mit).toContain(PROGRAMM_ERFUELLUNG_HINWEIS);
  });

  it('leere Besonnungs-/Programmlisten ([]) zählen als NICHT übergeben — keine Hinweise, keine Programm-Erfüllungs-Spalte', () => {
    const varianten = fixtureVarianten();
    const svg = studienBerichtSvg(varianten, { zielGf: 6000, besonnung: [], programm: [] });
    expect(svg).not.toContain(BESONNUNG_HINWEIS);
    expect(svg).not.toContain(PROGRAMM_ERFUELLUNG_HINWEIS);
    expect(svg).not.toContain('Winter-Besonnung');
    // Ehrlichkeit (K1): ohne Raumprogramm bleibt die Tabellenzeile schlicht
    // «GF» — «Programm-Erfüllung» darf ohne Datengrundlage nirgends stehen.
    expect(svg).not.toContain('Programm-Erfüllung');
  });

  it('fehlende Werte werden als «—» gezeigt, nie mit erfundenen Zahlen (kein Ziel-GF, leeres Raumprogramm)', () => {
    const varianten = fixtureVarianten();
    const svgOhneZiel = studienBerichtSvg(varianten, { zielGf: null });
    expect(svgOhneZiel).toContain('Ziel-GF: —');

    // Leeres Raumprogramm ⇒ sollGf 0 ⇒ erfuellungProzent null je Variante ⇒ Tabellenzelle zeigt «—»
    const programmLeer = programmErfuellungJeVariante(varianten, [], 1.22);
    const svgProgrammLeer = studienBerichtSvg(varianten, { zielGf: 6000, programm: programmLeer });
    expect(svgProgrammLeer).toContain('GF / Programm-Erfüllung');
    expect(svgProgrammLeer).toContain('(—)');
  });

  it('Grenzabstand-Besonnung-Zeile zeigt «—» für Varianten ohne 3h-Näherung und ok/verfehlt sonst', () => {
    const varianten = fixtureVarianten();
    const svg = studienBerichtSvg(varianten, { zielGf: 6000 });
    expect(svg).toContain('Grenzabstand-Besonnung (3h-Näherung)');
    // 'teppich'/'turm'/'winkel' haben laut Fixture `besonnung: null`.
    // 'zeilen'/'blockrand' haben `besonnung.ok === true` in der Fixture.
    expect(svg).toContain('>—<');
    expect(svg).toContain('>ok<');
  });

  it('Beurteilung je Variante nennt die echte Regel-/Tiefen-Überschreitung (Fixture: Turm bzw. Winkel), nie eine generische Floskel ohne Zahl', () => {
    const varianten = fixtureVarianten();
    const turm = varianten.find((v) => v.id === 'turm')!;
    const winkel = varianten.find((v) => v.id === 'winkel')!;
    expect(turm.passt).toBe(false);
    expect(winkel.tiefeOk).toBe(false);

    const svg = studienBerichtSvg(varianten, { zielGf: 6000, regel: REGEL });
    expect(svg).toContain('Sprengt die zulässige Höhe um');
    // Der Beurteilungstext ist zeilenumgebrochen (SVG kennt keinen Fliesstext)
    // — der Spänner-Mass-Hinweis kann darum über zwei <text>-Elemente
    // verteilt sein; einzeln bleiben beide Fragmente eindeutig.
    expect(svg).toContain('Gebäudetiefe 13 m');
    expect(svg).toContain('Spänner-Masses (14–18 m)');
  });

  it('Kopfzeile: Titel, Zonenregel-Name/-Eckwerte und Datum erscheinen nur, wenn übergeben', () => {
    const varianten = fixtureVarianten();
    const ohne = studienBerichtSvg(varianten, { zielGf: 6000 });
    expect(ohne).not.toContain('aus Zonenregel');
    expect(ohne).not.toContain('AZ ');
    expect(ohne).toBe(studienBerichtSvg(varianten, { zielGf: 6000 })); // stabil ohne optionale Felder

    const mit = studienBerichtSvg(varianten, {
      zielGf: 6000,
      titel: 'Wohnüberbauung Rank',
      regelName: 'W3',
      regel: REGEL,
      datum: '07.07.2026',
    });
    expect(mit).toContain('Grundlagenstudie — Wohnüberbauung Rank');
    expect(mit).toContain('aus Zonenregel «W3»');
    expect(mit).toContain('AZ 0.6');
    expect(mit).toContain('max. Höhe 30 m');
    expect(mit).toContain('Grenzabstand 4/10 m');
    expect(mit).toContain('07.07.2026');
  });

  it('Situations-Zeile enthält das Parzellen-Polygon (gestrichelt) NUR wenn `parzelle` übergeben wird', () => {
    const varianten = fixtureVarianten();
    const ohneParzelle = studienBerichtSvg(varianten, { zielGf: 6000 });
    expect(ohneParzelle).not.toContain('stroke-dasharray="3,2"');

    const mitParzelle = studienBerichtSvg(varianten, { zielGf: 6000, parzelle: PARZELLE });
    expect(mitParzelle).toContain('stroke-dasharray="3,2"');
    // Freiflächenanteil ist NUR mit Parzellenbezug eine echte Zahl.
    expect(ohneParzelle).toContain('Freifläche —');
    expect(mitParzelle).not.toContain('Freifläche —');
  });

  it('Blatt-Dramaturgie (K1): Empfehlung steht VOR der Vergleichstabelle, die Grenzen der Studie stehen NACH allem als EIN Block (keine Themenvermischung)', () => {
    const varianten = fixtureVarianten();
    const svg = studienBerichtSvg(varianten, {
      zielGf: 6000,
      regel: REGEL,
      parzelle: PARZELLE,
      besonnung: besonnungJeVariante(varianten, ZUG),
      programm: programmErfuellungJeVariante(varianten, [{ typ: 'marktgerecht', hnfSoll: 5000 }], 1.22),
    });
    const posEmpfehlung = svg.indexOf('EMPFEHLUNG');
    const posTabelle = svg.indexOf('Höhe / Reserve zur Regel');
    const posGrenzen = svg.indexOf('Grenzen der Studie');
    const posBesonnungHinweis = svg.indexOf(BESONNUNG_HINWEIS);
    const posProgrammHinweis = svg.indexOf(PROGRAMM_ERFUELLUNG_HINWEIS);
    expect(posEmpfehlung).toBeGreaterThanOrEqual(0);
    expect(posTabelle).toBeGreaterThan(posEmpfehlung);
    expect(posGrenzen).toBeGreaterThan(posTabelle);
    // Die Ehrlichkeits-Hinweise stehen NACH «Grenzen der Studie» im selben Block, nicht zwischen den Inhalten.
    expect(posBesonnungHinweis).toBeGreaterThan(posGrenzen);
    expect(posProgrammHinweis).toBeGreaterThan(posGrenzen);
  });

  it('Empfehlung nennt die Top-Ranking-Variante namentlich und ist deterministisch reproduzierbar', () => {
    const varianten = fixtureVarianten();
    const opts: StudienBerichtOptionen = {
      zielGf: 6000,
      regel: REGEL,
      parzelle: PARZELLE,
      programm: programmErfuellungJeVariante(varianten, [{ typ: 'marktgerecht', hnfSoll: 5000 }], 1.22),
    };
    const svg = studienBerichtSvg(varianten, opts);
    const match = svg.match(/Empfehlung: ([^.]+)\./);
    expect(match).not.toBeNull();
    const empfohleneName = match![1]!;
    expect(varianten.some((v) => v.name === empfohleneName)).toBe(true);
    // Die Turm-Variante sprengt die Höhe fürs Programm — sie darf NIE empfohlen werden.
    expect(empfohleneName).not.toBe('Turm');
  });

  it('Ranking-Gewichte erscheinen transparent im Fusstext', () => {
    const varianten = fixtureVarianten();
    const svg = studienBerichtSvg(varianten, { zielGf: 6000 });
    expect(svg).toContain('Ranking-Gewichte:');
    expect(svg).toContain('Regelkonformität');
  });

  it('leere Variantenliste liefert weiterhin ein valides SVG ohne Spalten (kein Absturz)', () => {
    const svg = studienBerichtSvg([], { zielGf: 500 });
    expect(svg.startsWith('<svg')).toBe(true);
    expect(svg.endsWith('</svg>')).toBe(true);
    expect(svg).toContain('Anstoss, kein Entwurf');
  });

  it('Sonderzeichen in Titel/Regelname werden XML-escaped (keine kaputten Attribute/Tags)', () => {
    const varianten = fixtureVarianten();
    const svg = studienBerichtSvg(varianten, { zielGf: 6000, titel: 'A & B <Test>', regelName: 'Zone "X"' });
    expect(svg).not.toContain('A & B <Test>');
    expect(svg).toContain('A &#38; B &#60;Test&#62;');
  });

  it('Programm-Erfüllung in % erscheint mit dem korrekten, gerundeten Wert je Variante', () => {
    const varianten = fixtureVarianten();
    const raumprogramm: RaumprogrammPosten[] = [{ typ: 'marktgerecht', hnfSoll: 5000 }];
    const programm = programmErfuellungJeVariante(varianten, raumprogramm, 1.22);
    const svg = studienBerichtSvg(varianten, { zielGf: 6000, programm });
    for (const p of programm) {
      const erwartet = p.erfuellungProzent !== null ? `${p.erfuellungProzent.toLocaleString('de-CH', { maximumFractionDigits: 1 })} %` : '—';
      expect(svg).toContain(escapeXml(`(${erwartet})`));
    }
  });

  it('Ziel-GF-Herkunft erscheint in der Kopfzeile nur, wenn übergeben', () => {
    const varianten = fixtureVarianten();
    const ohne = studienBerichtSvg(varianten, { zielGf: 6000 });
    expect(ohne).toContain('Ziel-GF: 6\'000 m²');
    expect(ohne).not.toContain('(aus Zonenregel)');

    const mit = studienBerichtSvg(varianten, { zielGf: 6000, zielGfHerkunft: 'aus Zonenregel' });
    expect(mit).toContain('Ziel-GF: 6\'000 m² (aus Zonenregel)');
  });
});

describe('Golden-SVG (Grundlagenstudie-Bericht v2)', () => {
  it('Bericht der Fixtur-Parzelle (60×60 m, Ziel-GF 6000 m², alle 6 Typologien) ist byte-identisch zur committeten Referenz', () => {
    // BEWUSST NEU ERZEUGT (K1, `docs/OWNER-BEFUNDE-0.6.2.md`): der v1-Bericht
    // zeigte nur Footprints + rohe Kennwert-Zeilen («ultra schlecht», Owner-
    // Wortlaut). v2 ist ein A3-quer-Blatt mit Empfehlung/Situations-Diagramm/
    // Vergleichstabelle/Beurteilung je Variante/Grenzen-Block — das Golden
    // wurde bewusst neu erzeugt (writeFileSync statt readFileSync/expect,
    // Diff begutachtet, zurückgebaut). ALLE anderen Kernel-Goldens bleiben
    // byte-identisch.
    const varianten = fixtureVarianten();
    const svg = studienBerichtSvg(varianten, { zielGf: 6000 });
    pruefeGolden(svg, new URL('./golden/studienbericht.svg', import.meta.url));
  });
});
