import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { studienBerichtSvg, type StudienBerichtOptionen } from '../src/derive/studienbericht';
import { generiereVolumenstudien } from '../src/derive/volumenstudie';
import type { StudienVariante } from '../src/derive/volumenstudie';
import { besonnungJeVariante, BESONNUNG_HINWEIS } from '../src/derive/besonnungsvergleich';
import { programmErfuellungJeVariante, PROGRAMM_ERFUELLUNG_HINWEIS } from '../src/derive/programmerfuellung';
import type { RaumprogrammPosten } from '../src/model/doc';
import { escapeXml } from '../src/derive/plansvg';

/**
 * Batch D5 (Wettbewerb-Konzept, Entscheid D-E8, Nacht v0.6.2):
 * Grundlagenstudie-Bericht als eigenständiges A4-quer-SVG-Exportartefakt.
 * Reine Ableitung aus `StudienVariante[]` + optionalen Besonnungs-/
 * Programm-Kennwerten — Anstoss, kein Entwurf.
 */

// Feste Parzelle (60×60 m, quadratisch) — liefert alle 6 Typologien, inkl.
// einer Variante mit `passt: false` (Turm sprengt die Höhe) und einer mit
// `tiefeOk: false` (Winkel unter Spänner-Mass) — s. Probe-Lauf im Auftrag.
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

describe('studienBerichtSvg', () => {
  it('liefert ein wohlgeformtes, eigenständiges SVG (beginnt mit <svg, endet mit </svg>)', () => {
    const svg = studienBerichtSvg(fixtureVarianten(), { zielGf: 6000 });
    expect(svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg"')).toBe(true);
    expect(svg.endsWith('</svg>')).toBe(true);
    expect(svg).toContain('viewBox="0 0 1123 794"');
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
    const opts: StudienBerichtOptionen = { zielGf: 6000, titel: 'Testprojekt', regelName: 'Wohnzone W3', datum: '07.07.2026' };
    const a = studienBerichtSvg(varianten, opts);
    const b = studienBerichtSvg(varianten, opts);
    expect(a).toBe(b);
  });

  it('Ehrlichkeits-Hinweise erscheinen NUR, wenn die jeweilige Kennwertliste übergeben wurde', () => {
    const varianten = fixtureVarianten();
    const ohne = studienBerichtSvg(varianten, { zielGf: 6000 });
    expect(ohne).not.toContain(BESONNUNG_HINWEIS);
    expect(ohne).not.toContain(PROGRAMM_ERFUELLUNG_HINWEIS);
    expect(ohne).toContain('Anstoss, kein Entwurf — Extremvarianten nach GF-Ziel/Zonenregel.');

    const besonnung = besonnungJeVariante(varianten, ZUG);
    const raumprogramm: RaumprogrammPosten[] = [{ typ: 'marktgerecht', hnfSoll: 5000 }];
    const programm = programmErfuellungJeVariante(varianten, raumprogramm, 1.22);
    const mit = studienBerichtSvg(varianten, { zielGf: 6000, besonnung, programm });
    expect(mit).toContain(BESONNUNG_HINWEIS);
    expect(mit).toContain(PROGRAMM_ERFUELLUNG_HINWEIS);
  });

  it('leere Besonnungs-/Programmlisten ([]) zählen als NICHT übergeben — keine Hinweise, kein Kennwert-Zeilenzusatz', () => {
    const varianten = fixtureVarianten();
    const svg = studienBerichtSvg(varianten, { zielGf: 6000, besonnung: [], programm: [] });
    expect(svg).not.toContain(BESONNUNG_HINWEIS);
    expect(svg).not.toContain(PROGRAMM_ERFUELLUNG_HINWEIS);
    expect(svg).not.toContain('Winter-Besonnung');
    expect(svg).not.toContain('Programm-Erfüllung');
  });

  it('fehlende Werte werden als «—» gezeigt, nie mit erfundenen Zahlen (kein Ziel-GF, leeres Raumprogramm)', () => {
    const varianten = fixtureVarianten();
    const svgOhneZiel = studienBerichtSvg(varianten, { zielGf: null });
    expect(svgOhneZiel).toContain('Ziel-GF: —');

    // Leeres Raumprogramm ⇒ sollGf 0 ⇒ erfuellungProzent null (s. programmerfuellung.ts) ⇒ «—»
    const programmLeer = programmErfuellungJeVariante(varianten, [], 1.22);
    const svgProgrammLeer = studienBerichtSvg(varianten, { zielGf: 6000, programm: programmLeer });
    expect(svgProgrammLeer).toContain('Programm-Erfüllung: —');
  });

  it('Grenzabstand-3h-Zeile zeigt «—» für Varianten ohne Näherung (`besonnung: null`) und ok/verfehlt sonst', () => {
    const varianten = fixtureVarianten();
    const svg = studienBerichtSvg(varianten, { zielGf: 6000 });
    // 'teppich'/'turm'/'winkel' haben laut Fixture `besonnung: null`.
    expect(svg).toContain('Grenzabstand 3h (Näherung): —');
    // 'zeilen'/'blockrand' haben `besonnung.ok === true` in der Fixture.
    expect(svg).toContain('Grenzabstand 3h (Näherung): ok');
  });

  it('Warn-Badges: «sprengt Höhe» bei passt=false, «Tiefe» bei tiefeOk=false (Fixture: Turm bzw. Winkel)', () => {
    const varianten = fixtureVarianten();
    const turm = varianten.find((v) => v.id === 'turm')!;
    const winkel = varianten.find((v) => v.id === 'winkel')!;
    expect(turm.passt).toBe(false);
    expect(winkel.tiefeOk).toBe(false);

    const svg = studienBerichtSvg(varianten, { zielGf: 6000 });
    expect(svg).toContain('sprengt Höhe');
    expect(svg).toContain('Tiefe');
  });

  it('Kopfzeile: Titel, Zonenregel-Name und Datum erscheinen nur, wenn übergeben', () => {
    const varianten = fixtureVarianten();
    const ohne = studienBerichtSvg(varianten, { zielGf: 6000 });
    expect(ohne).not.toContain('aus Zonenregel');
    expect(ohne).toBe(studienBerichtSvg(varianten, { zielGf: 6000 })); // stabil ohne optionale Felder

    const mit = studienBerichtSvg(varianten, {
      zielGf: 6000,
      titel: 'Wohnüberbauung Rank',
      regelName: 'W3',
      datum: '07.07.2026',
    });
    expect(mit).toContain('Grundlagenstudie — Wohnüberbauung Rank');
    expect(mit).toContain('aus Zonenregel «W3»');
    expect(mit).toContain('07.07.2026');
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
      expect(svg).toContain(escapeXml(`Programm-Erfüllung: ${erwartet}`));
    }
  });
});

describe('Golden-SVG (Grundlagenstudie-Bericht)', () => {
  it('Bericht der Fixtur-Parzelle (60×60 m, Ziel-GF 6000 m², alle 6 Typologien) ist byte-identisch zur committeten Referenz', () => {
    const varianten = fixtureVarianten();
    const svg = studienBerichtSvg(varianten, { zielGf: 6000 });
    const golden = readFileSync(new URL('./golden/studienbericht.svg', import.meta.url), 'utf8');
    expect(svg).toBe(golden);
    // Bewusste Änderungen an studienbericht.ts: Golden neu erzeugen (Test
    // kurz `writeFileSync` statt `readFileSync`/`expect` einsetzen, laufen
    // lassen, Diff begutachten, zurückbauen) und im Diff begutachten.
  });
});
