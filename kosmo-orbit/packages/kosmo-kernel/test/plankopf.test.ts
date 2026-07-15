import { describe, expect, it } from 'vitest';
import {
  afFreigabeStempelSvg,
  kuerzeMitEllipse,
  massstabsbalkenSegmente,
  massstabsbalkenSvg,
  MATRIX_STUFEN,
  nordpfeilSvg,
  PHASEN_MATRIX,
  plancode,
  plankopfSvg,
  siaZuMatrixStufe,
  wasserzeichenSvg,
  type MatrixStufe,
  type PlankopfDaten,
} from '../src/derive/plankopf';
import { plankopfRect, rahmenRect, zeichenflaeche } from '../src/derive/blattlayout';
import { PLANKOPF_TYPO_MM } from '../src/derive/stilblatt';
import type { SiaPhase } from '../src/model/doc';
import { pruefeGolden } from './golden-helfer';

/**
 * Plankopf-Renderer (v0.8.0 / P3) — Tests für die Phasen-Matrix, die
 * 8→6-Abbildung, die Plancode-Komposition und die drei SVG-Fragment-
 * Renderer. Alle Erwartungswerte sind gegen `docs/V080-PLANKOPF-SPEZ.md`
 * §1.5–§1.7/§2/§3 nachvollziehbar (Kommentare je Test).
 */

describe('siaZuMatrixStufe — 8→6-Abbildung (Spez §2.2, alle 8 SiaPhase-Werte einzeln)', () => {
  it('strategie → VS', () => expect(siaZuMatrixStufe('strategie')).toBe('VS'));
  it('wettbewerb → VS', () => expect(siaZuMatrixStufe('wettbewerb')).toBe('VS'));
  it('vorprojekt → VP', () => expect(siaZuMatrixStufe('vorprojekt')).toBe('VP'));
  it('bauprojekt → BP', () => expect(siaZuMatrixStufe('bauprojekt')).toBe('BP'));
  it('bewilligung → BW', () => expect(siaZuMatrixStufe('bewilligung')).toBe('BW'));
  it('ausschreibung → AS', () => expect(siaZuMatrixStufe('ausschreibung')).toBe('AS'));
  it('ausfuehrung → AF', () => expect(siaZuMatrixStufe('ausfuehrung')).toBe('AF'));
  it('abnahme → AF', () => expect(siaZuMatrixStufe('abnahme')).toBe('AF'));

  it('deckt alle 8 SiaPhase-Enum-Werte ab (kein Enum-Mismatch, keine vergessene Phase)', () => {
    const alle: SiaPhase[] = [
      'strategie',
      'wettbewerb',
      'vorprojekt',
      'bauprojekt',
      'bewilligung',
      'ausschreibung',
      'ausfuehrung',
      'abnahme',
    ];
    for (const phase of alle) {
      expect(MATRIX_STUFEN).toContain(siaZuMatrixStufe(phase));
    }
  });
});

describe('PHASEN_MATRIX — Vollständigkeit (Spez §2.1, wörtliche Tabelle)', () => {
  it('enthält genau die 6 Stufen VS/VP/BP/BW/AS/AF in dieser Reihenfolge', () => {
    expect(MATRIX_STUFEN).toEqual(['VS', 'VP', 'BP', 'BW', 'AS', 'AF']);
    expect(Object.keys(PHASEN_MATRIX).sort()).toEqual(['AF', 'AS', 'BP', 'BW', 'VP', 'VS'].sort());
  });

  it('jede Stufe trägt alle Pflichtfelder (Name, SIA-Nr., Akzentfarbe, Massstäbe, Freigabe-Empfänger)', () => {
    for (const stufe of MATRIX_STUFEN) {
      const e = PHASEN_MATRIX[stufe];
      expect(e.name.length).toBeGreaterThan(0);
      expect(e.siaNr).toMatch(/^SIA \d+$/);
      expect(e.farbe).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(e.massstaebeLabel.length).toBeGreaterThan(0);
      expect(e.massstaebe.length).toBeGreaterThan(0);
      expect(e.freigabeEmpfaenger.length).toBeGreaterThan(0);
    }
  });

  it('NUR AF hat keinen Wasserzeichen-Text, dafür einen Stempel-Text — alle anderen umgekehrt', () => {
    for (const stufe of MATRIX_STUFEN) {
      const e = PHASEN_MATRIX[stufe];
      if (stufe === 'AF') {
        expect(e.wasserzeichenText).toBeNull();
        expect(e.stempelText).not.toBeNull();
      } else {
        expect(e.wasserzeichenText).not.toBeNull();
        expect(e.stempelText).toBeNull();
      }
    }
  });

  it('Index-Buchstaben a–e für VP…AF, VS hat keinen (Spez-Tabelle «–»)', () => {
    expect(PHASEN_MATRIX.VS.index).toBeNull();
    expect(PHASEN_MATRIX.VP.index).toBe('a');
    expect(PHASEN_MATRIX.BP.index).toBe('b');
    expect(PHASEN_MATRIX.BW.index).toBe('c');
    expect(PHASEN_MATRIX.AS.index).toBe('d');
    expect(PHASEN_MATRIX.AF.index).toBe('e');
  });

  it('Akzentfarben-Entscheid: agent = Token-Wert #A8893F, NICHT der abweichende Prototyp-Wert #9A7C34 (Spez §2.1)', () => {
    expect(PHASEN_MATRIX.BW.farbe.toUpperCase()).toBe('#A8893F');
  });

  it('Farben stimmen wörtlich mit der Spez-Tabelle überein (§2.1)', () => {
    expect(PHASEN_MATRIX.VS.farbe.toUpperCase()).toBe('#94704F');
    expect(PHASEN_MATRIX.VP.farbe.toUpperCase()).toBe('#4B7BB3');
    expect(PHASEN_MATRIX.BP.farbe.toUpperCase()).toBe('#A65E97');
    expect(PHASEN_MATRIX.BW.farbe.toUpperCase()).toBe('#A8893F');
    expect(PHASEN_MATRIX.AS.farbe.toUpperCase()).toBe('#B0703F');
    expect(PHASEN_MATRIX.AF.farbe.toUpperCase()).toBe('#2E8794');
  });
});

describe('plancode(teile) — Komposition & Fallbacks (Spez §3.1)', () => {
  it('Beispiel aus der Spez: MAA-SEE-BP-A-EG-101', () => {
    expect(plancode({ buero: 'MAA', projekt: 'SEE', phase: 'BP', disziplin: 'A', geschoss: 'EG', nr: '101' })).toBe(
      'MAA-SEE-BP-A-EG-101',
    );
  });

  it('fehlende Teile werden je einzeln durch einen ehrlichen «—»-Platzhalter ersetzt', () => {
    expect(plancode({})).toBe('—-—-—-—-—-—');
    expect(plancode({ buero: 'MAA', nr: '101' })).toBe('MAA-—-—-—-—-101');
  });

  it('leere Strings zählen als fehlend (kein stiller Leerstring im Ergebnis)', () => {
    expect(plancode({ buero: '', projekt: 'SEE', phase: 'BP', disziplin: 'A', geschoss: 'EG', nr: '101' })).toBe(
      '—-SEE-BP-A-EG-101',
    );
  });
});

describe('kuerzeMitEllipse — Textkürzung (härteste svg-qa-Nebenbedingung)', () => {
  it('lässt kurzen Text unverändert', () => {
    expect(kuerzeMitEllipse('EG', 40, 2.0)).toBe('EG');
  });

  it('kürzt langen Text mit Ellipse, wenn die geschätzte Breite das Limit überschreitet', () => {
    const lang = 'A'.repeat(200);
    const gekuerzt = kuerzeMitEllipse(lang, 40, 2.0);
    expect(gekuerzt.length).toBeLessThan(lang.length);
    expect(gekuerzt.endsWith('…')).toBe(true);
  });

  it('leerer Text bleibt leer (kein Platzhaltertext, Guard-Prinzip §3.2)', () => {
    expect(kuerzeMitEllipse('', 40, 2.0)).toBe('');
  });
});

function langeMusterdaten(): PlankopfDaten {
  return {
    buero: {
      name: 'Musterbüro für Architektur und Städtebau Andrin AG',
      adresse: 'Sehr lange Musterstrasse 123456789, 8000 Zürich, Schweiz',
      kuerzel: 'MAA',
    },
    bauherr: 'Eine sehr lange Bauherrschaftsbezeichnung mit vielen Wörtern und Zusätzen GmbH',
    projektName: 'Ein ausserordentlich langer Projektname zur Prüfung der Ellipsen-Kürzung',
    adresse: 'Eine ziemlich lange Standortadresse mit Hausnummer 4711',
    parzelleNr: 'Parzelle-Nr-9988776655',
    inhalt: 'Grundriss Erdgeschoss mit sehr langem Planinhalts-Titeltext zur Überlänge-Prüfung',
    massstab: 100,
    format: 'A1',
    gezeichnet: 'Ein sehr langes Zeichner-Kürzel-Beispiel',
    geprueft: 'Ein sehr langes Prüfer-Kürzel-Beispiel',
    datum: '14.07.2026',
    plancode: plancode({ buero: 'MAA', projekt: 'SEE', phase: 'BW', disziplin: 'A', geschoss: 'EG', nr: '101' }),
    revision: { index: 'C', datum: '14.07.2026', text: 'Eine sehr lange Revisionstext-Beschreibung', kuerzel: 'ab' },
  };
}

describe('plankopfSvg — Geometrie (Spez §1.5)', () => {
  const w = 841;
  const h = 594; // A1 quer

  it('rendert genau eine Gruppe <g data-teil="plankopf">', () => {
    const svg = plankopfSvg(w, h, 'BP', {});
    const treffer = svg.match(/<g data-teil="plankopf">/g);
    expect(treffer).toHaveLength(1);
    expect(svg.trim().endsWith('</g>')).toBe(true);
  });

  it('der äussere Rahmen-Rect liegt exakt an plankopfRect(w,h) — 180×55mm', () => {
    const svg = plankopfSvg(w, h, 'BP', {});
    const rect = plankopfRect(w, h);
    const m = svg.match(/<rect x="([\d.]+)" y="([\d.]+)" width="([\d.]+)" height="([\d.]+)" fill="white"/);
    expect(m).not.toBeNull();
    const [, x, y, breite, hoehe] = m as unknown as [string, string, string, string, string];
    expect(Number(x)).toBeCloseTo(rect.x, 6);
    expect(Number(y)).toBeCloseTo(rect.y, 6);
    expect(Number(breite)).toBe(180);
    expect(Number(hoehe)).toBe(55);
  });

  it('der Akzentbalken ist 1.3mm hoch, volle Plankopf-Breite, in Phasenfarbe', () => {
    const rect = plankopfRect(w, h);
    for (const stufe of MATRIX_STUFEN) {
      const svg = plankopfSvg(w, h, stufe, {});
      const re = new RegExp(`<rect x="${rect.x}" y="${rect.y}" width="${rect.breite}" height="1.3" fill="${PHASEN_MATRIX[stufe].farbe}"/>`);
      expect(svg).toMatch(re);
    }
  });

  it('funktioniert für alle 5 Formate × beide Ausrichtungen ohne Absturz', () => {
    const groessen: [number, number][] = [
      [1189, 841],
      [841, 594],
      [594, 420],
      [420, 297],
      [297, 210],
      [594, 1189],
    ];
    for (const [bw, bh] of groessen) {
      for (const stufe of MATRIX_STUFEN) {
        expect(() => plankopfSvg(bw, bh, stufe, langeMusterdaten())).not.toThrow();
      }
    }
  });
});

describe('plankopfSvg — mm-Typoleiter (Spez §1.5, PLANKOPF_TYPO_MM)', () => {
  it('jede emittierte font-size stammt aus PLANKOPF_TYPO_MM (keine erfundene Zwischengrösse)', () => {
    const zulaessig = new Set<number>(Object.values(PLANKOPF_TYPO_MM));
    const svg = plankopfSvg(841, 594, 'AF', langeMusterdaten());
    const groessen = [...svg.matchAll(/font-size="([\d.]+)"/g)].map((m) => Number(m[1]));
    expect(groessen.length).toBeGreaterThan(0);
    for (const g of groessen) {
      expect(zulaessig.has(g)).toBe(true);
    }
  });

  /**
   * Offener Punkt (ehrlich dokumentiert, s. Abschlussbericht): die Spez
   * nennt an zwei Stellen zwei verschiedene Zahlen für denselben Bereich —
   * §1.5 (die tatsächliche `PLANKOPF_TYPO_MM`-Tabelle) "1.3–5.6mm", §6.1
   * (im Golden-Verfahren-Kontext) "1.3–2.9mm". Dieser Test prüft die
   * §1.5-Tabelle wörtlich (die als "additiv ... geführt" explizit bindende
   * Quelle) — NICHT die engere 2.9mm-Grenze aus §6.1, die keine der in §1.5
   * geforderten Werte (Plan-Nr. 3.0, Logo-Initialen 5.6) überhaupt zulassen
   * würde. Containment wird stattdessen über `npm run svg-qa` real geprüft
   * (kein Font-Grössen-Deckel dort, sondern eine Position-in-viewBox-Prüfung).
   */
  it('PLANKOPF_TYPO_MM deckt den vollen Spez-Bereich 1.3–5.6mm ab', () => {
    const werte = Object.values(PLANKOPF_TYPO_MM);
    expect(Math.min(...werte)).toBe(1.3);
    expect(Math.max(...werte)).toBe(5.6);
    for (const w of werte) {
      expect(w).toBeGreaterThanOrEqual(1.3);
      expect(w).toBeLessThanOrEqual(5.6);
    }
  });
});

describe('plankopfSvg — Ellipsen-Kürzung bei Überlänge', () => {
  it('sehr lange Musterwerte erscheinen gekürzt (mit «…»), nicht im Volltext', () => {
    const daten = langeMusterdaten();
    const svg = plankopfSvg(297, 210, 'AS', daten); // A4 quer — engster Fall
    expect(svg).toContain('…');
    // Keiner der langen Rohwerte darf unverändert (voll ausgeschrieben) im SVG stehen —
    // sonst hätte die Kürzung nicht gegriffen.
    expect(svg).not.toContain(daten.buero!.name);
    expect(svg).not.toContain(daten.projektName);
    expect(svg).not.toContain(daten.bauherr);
  });

  it('kurze, alltägliche Werte bleiben unverändert (kein Overkill-Kürzen)', () => {
    const svg = plankopfSvg(1189, 841, 'BP', {
      buero: { name: 'Büro AG', kuerzel: 'BAG' },
      projektName: 'Haus See',
      format: 'A0',
      massstab: 100,
    });
    expect(svg).toContain('Büro AG');
    expect(svg).toContain('Haus See');
  });
});

describe('wasserzeichenSvg — Attribute (Spez §1.7)', () => {
  const zf = zeichenflaeche(841, 594);
  const zfRect = { x: rahmenRect(841, 594).x, y: rahmenRect(841, 594).y, breite: zf.breite, hoehe: zf.hoehe };

  it('AF liefert KEIN Wasserzeichen (null)', () => {
    expect(wasserzeichenSvg(zfRect, 'AF')).toBeNull();
  });

  it('alle Nicht-AF-Stufen liefern ein Wasserzeichen mit Rotation −26° und Opazität 0.13', () => {
    for (const stufe of MATRIX_STUFEN.filter((s): s is Exclude<MatrixStufe, 'AF'> => s !== 'AF')) {
      const svg = wasserzeichenSvg(zfRect, stufe);
      expect(svg).not.toBeNull();
      expect(svg).toMatch(/opacity="0\.13"/);
      expect(svg).toMatch(/rotate\(-26 /);
      expect(svg).toContain(`fill="${PHASEN_MATRIX[stufe].farbe}"`);
    }
  });

  it('Text ist versal gesetzt', () => {
    const svg = wasserzeichenSvg(zfRect, 'BW')!;
    expect(svg).toMatch(/>BAUEINGABE/);
  });
});

describe('afFreigabeStempelSvg — nur bei AF (Spez §1.7)', () => {
  const zf = zeichenflaeche(841, 594);
  const zfRect = { x: rahmenRect(841, 594).x, y: rahmenRect(841, 594).y, breite: zf.breite, hoehe: zf.hoehe };

  it('liefert null für alle Stufen ausser AF', () => {
    for (const stufe of MATRIX_STUFEN.filter((s): s is Exclude<MatrixStufe, 'AF'> => s !== 'AF')) {
      expect(afFreigabeStempelSvg(zfRect, stufe)).toBeNull();
    }
  });

  it('liefert für AF einen Stempel mit −6°-Rotation und dem Text «FREIGEGEBEN FÜR AUSFÜHRUNG»', () => {
    const svg = afFreigabeStempelSvg(zfRect, 'AF');
    expect(svg).not.toBeNull();
    expect(svg).toMatch(/rotate\(-6 /);
    expect(svg).toContain('FREIGEGEBEN FÜR AUSFÜHRUNG');
    expect(svg).toContain(`stroke="${PHASEN_MATRIX.AF.farbe}"`);
  });

  it('rendert optional eine Datumszeile, wenn ein Datum übergeben wird', () => {
    const ohne = afFreigabeStempelSvg(zfRect, 'AF');
    const mit = afFreigabeStempelSvg(zfRect, 'AF', '14.07.2026');
    expect(ohne).not.toContain('14.07.2026');
    expect(mit).toContain('14.07.2026');
  });

  it('bleibt auch auf dem kleinsten Format (A4 quer) innerhalb der Zeichenfläche (keine negativen/absurden Masse)', () => {
    const zfA4 = zeichenflaeche(297, 210);
    const rahmenA4 = rahmenRect(297, 210);
    const zielA4 = { x: rahmenA4.x, y: rahmenA4.y, breite: zfA4.breite, hoehe: zfA4.hoehe };
    const svg = afFreigabeStempelSvg(zielA4, 'AF')!;
    const m = svg.match(/<rect x="([-\d.]+)" y="([-\d.]+)" width="([\d.]+)" height="([\d.]+)"/);
    expect(m).not.toBeNull();
    const [, x, y, breite, hoehe] = m as unknown as [string, string, string, string, string];
    expect(Number(breite)).toBeGreaterThan(0);
    expect(Number(hoehe)).toBeGreaterThan(0);
    // Unrotierte Box muss innerhalb der Zeichenfläche liegen (Rotation macht es nur enger, nie weiter).
    expect(Number(x)).toBeGreaterThanOrEqual(zielA4.x - 0.01);
    expect(Number(y)).toBeGreaterThanOrEqual(zielA4.y - 0.01);
    expect(Number(x) + Number(breite)).toBeLessThanOrEqual(zielA4.x + zielA4.breite + 0.01);
  });
});

describe('massstabsbalkenSegmente — Segmentformel (Spez §1.6, hart über mehrere Massstäbe)', () => {
  it('folgt wörtlich clamp(2, 6, round(45 / (1000 / Massstabszahl))) = round(0.045 × M)', () => {
    // Wörtlich nachgerechnet (nicht nur gegen die Implementierung gespiegelt):
    // 1:500 → 45/2=22.5→23→clamp 6 · 1:200 → 45/5=9→clamp 6 ·
    // 1:100 → 45/10=4.5→5 · 1:50 → 45/20=2.25→2 · 1:20 → 45/50=0.9→1→clamp 2 ·
    // 1:10 → 45/100=0.45→0→clamp 2.
    expect(massstabsbalkenSegmente(500)).toBe(6);
    expect(massstabsbalkenSegmente(200)).toBe(6);
    expect(massstabsbalkenSegmente(100)).toBe(5);
    expect(massstabsbalkenSegmente(50)).toBe(2);
    expect(massstabsbalkenSegmente(20)).toBe(2);
    expect(massstabsbalkenSegmente(10)).toBe(2);
  });

  it('bleibt für jeden denkbaren Massstab innerhalb von [2, 6] (Clamp-Grenzen)', () => {
    for (const m of [1, 5, 15, 33, 75, 150, 333, 750, 1000, 5000]) {
      const n = massstabsbalkenSegmente(m);
      expect(n).toBeGreaterThanOrEqual(2);
      expect(n).toBeLessThanOrEqual(6);
    }
  });
});

describe('massstabsbalkenSvg — Geometrie/Position (Spez §1.6)', () => {
  const zf = zeichenflaeche(841, 594);
  const zfRect = { x: rahmenRect(841, 594).x, y: rahmenRect(841, 594).y, breite: zf.breite, hoehe: zf.hoehe };
  const pkRect = plankopfRect(841, 594);

  it('liefert Leerstring ohne echten Massstab (kein erfundener Balken)', () => {
    expect(massstabsbalkenSvg(zfRect, pkRect.y, 0)).toBe('');
    expect(massstabsbalkenSvg(zfRect, pkRect.y, -100)).toBe('');
  });

  it('rendert genau so viele Segment-Rects wie massstabsbalkenSegmente(massstab) liefert', () => {
    for (const massstab of [500, 200, 100, 50, 20, 10]) {
      const svg = massstabsbalkenSvg(zfRect, pkRect.y, massstab);
      const rects = svg.match(/<rect /g);
      expect(rects).toHaveLength(massstabsbalkenSegmente(massstab));
    }
  });

  it('liegt unten LINKS in der Zeichenfläche (x nahe zf.x, y oberhalb der Plankopf-Oberkante)', () => {
    const svg = massstabsbalkenSvg(zfRect, pkRect.y, 100);
    const m = svg.match(/<rect x="([\d.]+)" y="([\d.]+)"/);
    expect(m).not.toBeNull();
    const [, x, y] = m as unknown as [string, string, string];
    expect(Number(x)).toBeGreaterThanOrEqual(zfRect.x);
    expect(Number(x)).toBeLessThan(zfRect.x + 10); // nahe am linken Rand, kein zentrierter Balken
    expect(Number(y)).toBeLessThan(pkRect.y); // liegt oberhalb (also "nahe") der Plankopf-Oberkante
  });

  it('Beschriftung: «0» am linken, «{n} m · M 1:{massstab}» am rechten Ende', () => {
    const svg = massstabsbalkenSvg(zfRect, pkRect.y, 100);
    const anzahl = massstabsbalkenSegmente(100);
    expect(svg).toContain('>0<');
    expect(svg).toContain(`${anzahl} m · M 1:100`);
  });

  it('alle font-size-Werte stammen aus PLANKOPF_TYPO_MM.massstabsbalkenLabel', () => {
    const svg = massstabsbalkenSvg(zfRect, pkRect.y, 100);
    const groessen = [...svg.matchAll(/font-size="([\d.]+)"/g)].map((m) => Number(m[1]));
    expect(groessen.length).toBeGreaterThan(0);
    for (const g of groessen) expect(g).toBe(PLANKOPF_TYPO_MM.massstabsbalkenLabel);
  });
});

describe('nordpfeilSvg — Geometrie/Position (Spez §1.6)', () => {
  it('rendert genau eine Gruppe <g data-teil="nordpfeil"> mit Kreis, Pfeil-Pfad und Label «N»', () => {
    const zf = zeichenflaeche(841, 594);
    const zfRect = { x: rahmenRect(841, 594).x, y: rahmenRect(841, 594).y, breite: zf.breite, hoehe: zf.hoehe };
    const svg = nordpfeilSvg(zfRect);
    expect(svg.match(/<g data-teil="nordpfeil"/g)).toHaveLength(1);
    expect(svg.match(/<circle /g)).toHaveLength(1);
    expect(svg.match(/<path /g)).toHaveLength(1);
    expect(svg).toContain('>N<');
  });

  it('liegt oben RECHTS in der Zeichenfläche (Kreis-Mittelpunkt nahe der oberen rechten Ecke)', () => {
    const zf = zeichenflaeche(841, 594);
    const rahmen = rahmenRect(841, 594);
    const zfRect = { x: rahmen.x, y: rahmen.y, breite: zf.breite, hoehe: zf.hoehe };
    const svg = nordpfeilSvg(zfRect);
    const m = svg.match(/<circle cx="([\d.]+)" cy="([\d.]+)" r="([\d.]+)"/);
    expect(m).not.toBeNull();
    const [, cx, cy, r] = m as unknown as [string, string, string, string];
    expect(Number(r)).toBe(4);
    // Nahe der rechten Kante (weniger als 15mm Abstand), deutlich rechts der Zeichenflächen-Mitte.
    expect(zfRect.x + zfRect.breite - Number(cx)).toBeLessThan(15);
    expect(Number(cx)).toBeGreaterThan(zfRect.x + zfRect.breite / 2);
    // Nahe der oberen Kante, deutlich über der Zeichenflächen-Mitte.
    expect(Number(cy) - zfRect.y).toBeLessThan(15);
    expect(Number(cy)).toBeLessThan(zfRect.y + zfRect.hoehe / 2);
  });

  it('funktioniert für alle 5 Formate × beide Ausrichtungen ohne Absturz', () => {
    const groessen: [number, number][] = [
      [1189, 841],
      [841, 594],
      [594, 420],
      [420, 297],
      [297, 210],
      [594, 1189],
    ];
    for (const [bw, bh] of groessen) {
      const zf = zeichenflaeche(bw, bh);
      const rahmen = rahmenRect(bw, bh);
      const zfRect = { x: rahmen.x, y: rahmen.y, breite: zf.breite, hoehe: zf.hoehe };
      expect(() => nordpfeilSvg(zfRect)).not.toThrow();
    }
  });
});

describe('Golden — plankopf-framework.svg (isolierter 180×55-Baustein, alle 6 Phasen + AF-Stempel)', () => {
  it('entspricht dem registrierten Golden byte-identisch', () => {
    const svg = erzeugeGolden();
    pruefeGolden(svg, new URL('./golden/plankopf-framework.svg', import.meta.url));
  });
});

/**
 * Baut das additive Golden `plankopf-framework.svg` (Spez §6, «+2 additive,
 * neue Goldens», isolierter Plankopf-Baustein). Zwei kleine Demo-Blätter
 * (260×140mm — knapp über dem Minimum, das ein 180×55-Plankopf + etwas
 * Zeichenfläche darüber braucht) nebeneinander:
 *   1) Phase BW (Bewilligung) — Wasserzeichen sichtbar, lange Musterwerte
 *      demonstrieren die Ellipsen-Kürzung.
 *   2) Phase AF (Realisierung) — kein Wasserzeichen, dafür der
 *      AF-Freigabestempel, ebenfalls mit langen Musterwerten.
 * Jedes Demo-Blatt nutzt dieselbe (w,h), daher identische, bekannte
 * `plankopfRect()`/`zeichenflaeche()`-Koordinaten für beide Beispiele.
 */
function erzeugeGolden(): string {
  const w = 260;
  const h = 140;
  const rahmen = rahmenRect(w, h);
  const zf = zeichenflaeche(w, h);
  const zfRect = { x: rahmen.x, y: rahmen.y, breite: zf.breite, hoehe: zf.hoehe };

  function einzelBlatt(stufe: MatrixStufe, daten: PlankopfDaten, stempelDatum?: string): string {
    const wz = wasserzeichenSvg(zfRect, stufe);
    const stempel = afFreigabeStempelSvg(zfRect, stufe, stempelDatum);
    const pk = plankopfSvg(w, h, stufe, daten);
    return [
      `<rect x="0" y="0" width="${w}" height="${h}" fill="white"/>`,
      `<rect x="${rahmen.x}" y="${rahmen.y}" width="${rahmen.breite}" height="${rahmen.hoehe}" fill="none" stroke="black" stroke-width="0.35"/>`,
      wz ?? '',
      stempel ?? '',
      pk,
    ]
      .filter((t) => t.length > 0)
      .join('\n');
  }

  const bwDaten = langeMusterdaten();
  const afDaten: PlankopfDaten = {
    ...langeMusterdaten(),
    plancode: plancode({ buero: 'MAA', projekt: 'SEE', phase: 'AF', disziplin: 'A', geschoss: 'EG', nr: '101' }),
  };

  const gesamtBreite = w * 2 + 10;
  const teile = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${gesamtBreite}mm" height="${h}mm" viewBox="0 0 ${gesamtBreite} ${h}" font-family="Helvetica, Arial, sans-serif">`,
    `<rect x="0" y="0" width="${gesamtBreite}" height="${h}" fill="white"/>`,
    `<g transform="translate(0, 0)">${einzelBlatt('BW', bwDaten)}</g>`,
    `<g transform="translate(${w + 10}, 0)">${einzelBlatt('AF', afDaten, '14.07.2026')}</g>`,
    `</svg>`,
  ];
  return teile.join('\n');
}
