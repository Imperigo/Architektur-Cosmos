import { describe, expect, it } from 'vitest';
import {
  BLATT_FORMATE,
  BLATT_RAENDER,
  dims,
  faltmarken,
  leporelloFaltung,
  lochungMm,
  plankopfRect,
  plankopfReserveMm,
  rahmenRect,
  zeichenflaeche,
  PLANKOPF_MM,
  ROLLE_BREITE_MM,
  ROLLE_LAENGE_STANDARD_MM,
  type BlattAusrichtung,
  type BlattFormat,
} from '../src/derive/blattlayout';

/**
 * Blattgeometrie (v0.8.0 / P1) — reine Mass-Tests, keine Doc-Fixtures nötig.
 * Alle Erwartungswerte für Zeichenfläche/Faltmarken sind von Hand
 * nachgerechnet; die Rechnung steht jeweils im Kommentar direkt beim Test.
 *
 * v0.8.1/P13 (docs/V081-SPEZ.md §7(d), C-27): `Rolle` (1600×594mm) löst die
 * bis P6 geltende VERTAGT-Sperre auf — `FORMATE` unten enthält das Format
 * jetzt mit, damit alle generischen (Format×Ausrichtung-Schleifen-)Tests
 * unten die Rolle automatisch mitprüfen (dims/zeichenflaeche/rahmenRect/
 * plankopfRect/faltmarken sind allesamt reine w/h-Funktionen ohne
 * Format-Fallunterscheidung, s. deren eigene Doku). Die separaten
 * handgerechneten Zahlen-Tabellen (A0…A4, feste Tupel) bleiben unverändert
 * — eigener Abschnitt «Rolle 1600×594» unten für die formatspezifischen
 * Zahlen + die neue Leporello-Ableitung.
 */

const FORMATE: BlattFormat[] = ['A0', 'A1', 'A2', 'A3', 'A4', 'Rolle'];
const AUSRICHTUNGEN: BlattAusrichtung[] = ['quer', 'hoch'];

describe('BLATT_FORMATE / BLATT_RAENDER — Grunddaten', () => {
  it('enthält genau die 5 ISO-Owner-Formate + Rolle (v0.8.1/P13 löst die VERTAGT-Sperre auf)', () => {
    expect(Object.keys(BLATT_FORMATE).sort()).toEqual(['A0', 'A1', 'A2', 'A3', 'A4', 'Rolle']);
  });

  it('Querformat ist für alle 6 Formate Landscape (Breite > Höhe)', () => {
    for (const f of FORMATE) {
      expect(BLATT_FORMATE[f].breite).toBeGreaterThan(BLATT_FORMATE[f].hoehe);
    }
  });

  it('Heftrand links 20mm, oben/rechts/unten je 10mm', () => {
    expect(BLATT_RAENDER).toEqual({ links: 20, oben: 10, rechts: 10, unten: 10 });
  });
});

describe('dims(format, ausrichtung)', () => {
  it('quer liefert die Basis-Masse aus BLATT_FORMATE unverändert', () => {
    for (const f of FORMATE) {
      expect(dims(f, 'quer')).toEqual(BLATT_FORMATE[f]);
    }
  });

  it('hoch vertauscht Breite/Höhe (Hochformat ist damit immer Breite < Höhe)', () => {
    for (const f of FORMATE) {
      const hoch = dims(f, 'hoch');
      expect(hoch).toEqual({ breite: BLATT_FORMATE[f].hoehe, hoehe: BLATT_FORMATE[f].breite });
      expect(hoch.breite).toBeLessThan(hoch.hoehe);
    }
  });
});

describe('zeichenflaeche(w,h) — (B−30)×(H−20)', () => {
  it('quer: Zeichenflächen exakt wie Spez-Tabelle (A0 1159×821 … A4 267×190)', () => {
    // Rechnung je Zeile: Breite−30 (20 Heftrand + 10 rechts), Höhe−20 (10 oben + 10 unten).
    const tabelle: [BlattFormat, number, number][] = [
      ['A0', 1159, 821], // 1189-30=1159, 841-20=821
      ['A1', 811, 574], // 841-30=811, 594-20=574
      ['A2', 564, 400], // 594-30=564, 420-20=400
      ['A3', 390, 277], // 420-30=390, 297-20=277
      ['A4', 267, 190], // 297-30=267, 210-20=190
    ];
    for (const [f, breite, hoehe] of tabelle) {
      const { breite: b, hoehe: h } = BLATT_FORMATE[f];
      expect(zeichenflaeche(b, h)).toEqual({ breite, hoehe });
    }
  });

  it('hoch: Zeichenflächen mit vertauschten Aussenmassen', () => {
    // dims(f,'hoch') tauscht zuerst w/h, danach greift dieselbe (B−30)×(H−20)-Formel.
    const tabelle: [BlattFormat, number, number][] = [
      ['A0', 811, 1169], // w=841,h=1189 -> 841-30=811, 1189-20=1169
      ['A1', 564, 821], // w=594,h=841 -> 594-30=564, 841-20=821
      ['A2', 390, 574], // w=420,h=594 -> 420-30=390, 594-20=574
      ['A3', 267, 400], // w=297,h=420 -> 297-30=267, 420-20=400
      ['A4', 180, 277], // w=210,h=297 -> 210-30=180, 297-20=277
    ];
    for (const [f, breite, hoehe] of tabelle) {
      const { breite: w, hoehe: h } = dims(f, 'hoch');
      expect(zeichenflaeche(w, h)).toEqual({ breite, hoehe });
    }
  });

  it('ist für alle 12 Format×Ausrichtung-Kombinationen positiv (keine negativen Massregression)', () => {
    for (const f of FORMATE) {
      for (const a of AUSRICHTUNGEN) {
        const { breite: w, hoehe: h } = dims(f, a);
        const flaeche = zeichenflaeche(w, h);
        expect(flaeche.breite).toBeGreaterThan(0);
        expect(flaeche.hoehe).toBeGreaterThan(0);
      }
    }
  });
});

describe('rahmenRect(w,h) — Volllinie entlang der Ränder', () => {
  it('Position ist immer (20,10), Masse decken sich mit zeichenflaeche', () => {
    for (const f of FORMATE) {
      for (const a of AUSRICHTUNGEN) {
        const { breite: w, hoehe: h } = dims(f, a);
        const rahmen = rahmenRect(w, h);
        const flaeche = zeichenflaeche(w, h);
        expect(rahmen.x).toBe(BLATT_RAENDER.links);
        expect(rahmen.y).toBe(BLATT_RAENDER.oben);
        expect(rahmen.breite).toBe(flaeche.breite);
        expect(rahmen.hoehe).toBe(flaeche.hoehe);
      }
    }
  });
});

describe('plankopfRect(w,h) / PLANKOPF_MM', () => {
  it('PLANKOPF_MM ist fix 180×55mm', () => {
    expect(PLANKOPF_MM).toEqual({ b: 180, h: 55 });
  });

  it('hat immer die feste Grösse 180×55, unabhängig von Format/Ausrichtung', () => {
    for (const f of FORMATE) {
      for (const a of AUSRICHTUNGEN) {
        const { breite: w, hoehe: h } = dims(f, a);
        const pk = plankopfRect(w, h);
        expect(pk.breite).toBe(180);
        expect(pk.hoehe).toBe(55);
      }
    }
  });

  it('Ecke unten rechts liegt exakt auf der Rahmenlinie (innerhalb des Rahmens, kein Zusatzabstand)', () => {
    for (const f of FORMATE) {
      for (const a of AUSRICHTUNGEN) {
        const { breite: w, hoehe: h } = dims(f, a);
        const pk = plankopfRect(w, h);
        const rahmen = rahmenRect(w, h);
        expect(pk.x + pk.breite).toBe(rahmen.x + rahmen.breite);
        expect(pk.y + pk.hoehe).toBe(rahmen.y + rahmen.hoehe);
        // ...und liegt vollständig innerhalb des Rahmens (nicht davor/darüber hinaus).
        expect(pk.x).toBeGreaterThanOrEqual(rahmen.x);
        expect(pk.y).toBeGreaterThanOrEqual(rahmen.y);
      }
    }
  });

  it('A4 quer: konkrete Zahlen — x=297-10-180=107, y=210-10-55=145', () => {
    const { breite: w, hoehe: h } = dims('A4', 'quer');
    expect(plankopfRect(w, h)).toEqual({ x: 107, y: 145, breite: 180, hoehe: 55 });
  });
});

describe('faltmarken(w,h) — DIN 824', () => {
  it('A0 quer: vertikal von rechts (210, +190…) bis zum Heftrand, horizontal bei H-297', () => {
    // w=1189,h=841. Vertikal-Offsets von rechts: 210,400,590,780,970,1160 (1350 fiele auf x=-161 < 20 -> Abbruch).
    // x = w - offset: 979, 789, 599, 409, 219, 29 (alle > 20 = Heftrand).
    // Horizontal: h=841>300 -> 841-297=544.
    expect(faltmarken(1189, 841)).toEqual({ vertikal: [979, 789, 599, 409, 219, 29], horizontal: [544] });
  });

  it('A1 quer: vertikal endet nach 4 Marken (nächste läge bei x=-129)', () => {
    // w=841,h=594. Offsets 210,400,590,780 -> x=631,441,251,61 (alle >20); Offset 970 -> x=-129 -> Abbruch.
    // Horizontal: h=594>300 -> 594-297=297.
    expect(faltmarken(841, 594)).toEqual({ vertikal: [631, 441, 251, 61], horizontal: [297] });
  });

  it('A2 quer: vertikal endet nach 2 Marken (nächste läge bei x=4, unter dem Heftrand)', () => {
    // w=594,h=420. Offsets 210,400 -> x=384,194 (>20); Offset 590 -> x=4 (<=20) -> Abbruch.
    // Horizontal: h=420>300 -> 420-297=123.
    expect(faltmarken(594, 420)).toEqual({ vertikal: [384, 194], horizontal: [123] });
  });

  it('A3 quer Sonderfall: genau eine Vertikal-Marke — die nächste läge exakt AUF dem Heftrand (x=20) und wird ausgeschlossen', () => {
    // w=420,h=297. Offset 210 -> x=210 (>20, drin). Offset 400 -> x=20 (== Heftrand, NICHT > 20 -> Abbruch).
    // Horizontal: h=297, NICHT >300 -> keine Marke.
    expect(faltmarken(420, 297)).toEqual({ vertikal: [210], horizontal: [] });
  });

  it('A4 (quer): keine Marken — weder vertikal (Breite 297 ist nicht > 297) noch horizontal (Höhe 210 ist nicht > 300)', () => {
    expect(faltmarken(297, 210)).toEqual({ vertikal: [], horizontal: [] });
  });

  it('Querfalz-Grenze H=300: an der Schwelle selbst keine horizontale Marke', () => {
    // w=297 hält die Vertikal-Liste bewusst leer, damit dieser Test isoliert die H-Schwelle prüft.
    expect(faltmarken(297, 300).horizontal).toEqual([]);
  });

  it('Querfalz-Grenze: knapp über 300 erscheint sofort eine horizontale Marke bei H-297', () => {
    expect(faltmarken(297, 301).horizontal).toEqual([4]); // 301-297=4
    expect(faltmarken(297, 350).horizontal).toEqual([53]); // 350-297=53
  });

  it('Hochformat-Tausch: faltmarken hängt nur von den tatsächlichen (getauschten) w/h ab, nicht vom Format-Label', () => {
    // A1 hoch = dims('A1','hoch') = {breite:594, hoehe:841} — numerisch identisch zu
    // A2 quer für die Vertikal-Rechnung (w=594) und liefert dieselben Marken [384,194];
    // horizontal wie A0 quer (h=841 -> 841-297=544), rein zufällige Zahlenübereinstimmung,
    // aber gerade deshalb ein gutes Cross-Check, dass nur w/h zählen.
    const { breite: w, hoehe: h } = dims('A1', 'hoch');
    expect(w).toBe(594);
    expect(h).toBe(841);
    expect(faltmarken(w, h)).toEqual({ vertikal: [384, 194], horizontal: [544] });
  });

  it('vertikale Marken liegen für alle Formate/Ausrichtungen strikt über dem Heftrand (20mm)', () => {
    for (const f of FORMATE) {
      for (const a of AUSRICHTUNGEN) {
        const { breite: w, hoehe: h } = dims(f, a);
        for (const x of faltmarken(w, h).vertikal) {
          expect(x).toBeGreaterThan(BLATT_RAENDER.links);
        }
      }
    }
  });

  it('vertikale Marken sind absteigend sortiert (Generierung von rechts nach links)', () => {
    for (const f of FORMATE) {
      for (const a of AUSRICHTUNGEN) {
        const { breite: w, hoehe: h } = dims(f, a);
        const liste = faltmarken(w, h).vertikal;
        const sortiertAbsteigend = [...liste].sort((x, y) => y - x);
        expect(liste).toEqual(sortiertAbsteigend);
      }
    }
  });
});

describe('lochungMm(h) — ISO 838', () => {
  it('symmetrisch um H/2 mit 80mm Mittenabstand, für mehrere Höhen', () => {
    for (const h of [210, 297, 420, 594, 841, 1189]) {
      const l = lochungMm(h);
      expect(l.y2 - l.y1).toBe(80);
      expect((l.y1 + l.y2) / 2).toBeCloseTo(h / 2, 9);
    }
  });

  it('Lochmitte liegt bei x=10 — mittig im 20mm-Heftrand (BLATT_RAENDER.links/2), nur sinnvoll solange der Heftrand aktiv ist', () => {
    const l = lochungMm(210);
    expect(l.x).toBe(10);
    expect(l.x).toBe(BLATT_RAENDER.links / 2);
  });

  it('Durchmesser ist 6mm', () => {
    expect(lochungMm(210).d).toBe(6);
  });

  it('A4 quer (h=210): konkrete Werte y1=65, y2=145', () => {
    expect(lochungMm(210)).toEqual({ x: 10, y1: 65, y2: 145, d: 6 });
  });

  it('funktioniert auch mit Hochformat-Höhen (z.B. A2 hoch, h=594)', () => {
    const { hoehe: h } = dims('A2', 'hoch');
    expect(lochungMm(h)).toEqual({ x: 10, y1: 257, y2: 337, d: 6 }); // 594/2=297; 297-40=257, 297+40=337
  });
});

describe('plankopfReserveMm()', () => {
  it('ist konsistent zu PLANKOPF_MM: Reserve = Plankopf-Mass + fixer Rand (10mm, wie BLATT_RAENDER)', () => {
    const reserve = plankopfReserveMm();
    expect(reserve).toEqual({ breite: PLANKOPF_MM.b + 10, hoehe: PLANKOPF_MM.h + 10 });
    expect(reserve).toEqual({ breite: 190, hoehe: 65 });
  });

  it('ist grösszügiger als das reine Plankopf-Mass (Sicherheitsabstand zum übrigen Blattinhalt)', () => {
    const reserve = plankopfReserveMm();
    expect(reserve.breite).toBeGreaterThan(PLANKOPF_MM.b);
    expect(reserve.hoehe).toBeGreaterThan(PLANKOPF_MM.h);
  });

  it('ist ein reiner Konstantenwert — deterministisch bei wiederholtem Aufruf, keine Formatabhängigkeit in der Signatur', () => {
    expect(plankopfReserveMm()).toEqual(plankopfReserveMm());
  });
});

// v0.8.1/P13 (docs/V081-SPEZ.md §7(d), C-27) — Rolle 1600×594mm: der
// generische FORMATE-Loop oben deckt bereits dims/zeichenflaeche/rahmenRect/
// plankopfRect/faltmarken-Invarianten für Rolle mit ab (reine w/h-Funktionen,
// kein Format-Sonderfall). Dieser Block prüft die konkreten Zahlen + die
// neue Leporello-Faltfelder-Ableitung, die es vor P13 nicht gab.
describe('Rolle 1600×594 (v0.8.1/P13, fixierter Default §7(d))', () => {
  it('ROLLE_BREITE_MM=594 (identisch A1-Breite im Hochformat), ROLLE_LAENGE_STANDARD_MM=1600', () => {
    expect(ROLLE_BREITE_MM).toBe(594);
    expect(ROLLE_LAENGE_STANDARD_MM).toBe(1600);
    expect(dims('A1', 'hoch').breite).toBe(ROLLE_BREITE_MM);
  });

  it('BLATT_FORMATE.Rolle = {breite:1600, hoehe:594} — Querformat, Breite>Höhe wie alle anderen Formate', () => {
    expect(BLATT_FORMATE.Rolle).toEqual({ breite: 1600, hoehe: 594 });
  });

  it('zeichenflaeche/rahmenRect/plankopfRect quer: konkrete Zahlen', () => {
    const { breite: w, hoehe: h } = dims('Rolle', 'quer');
    expect(zeichenflaeche(w, h)).toEqual({ breite: 1570, hoehe: 574 }); // 1600-30, 594-20
    expect(rahmenRect(w, h)).toEqual({ x: 20, y: 10, breite: 1570, hoehe: 574 });
    // rechteKante=20+1570=1590, untereKante=10+574=584 -> x=1590-180=1410, y=584-55=529
    expect(plankopfRect(w, h)).toEqual({ x: 1410, y: 529, breite: 180, hoehe: 55 });
  });

  it('faltmarken quer: 8 Vertikal-Marken (210, +190×7) bis zum Heftrand, horizontal identisch zu A1 (h=594 -> 297)', () => {
    // Offsets 210,400,590,780,970,1160,1350,1540 -> x=1390,1200,1010,820,630,440,250,60 (alle >20);
    // Offset 1730 -> x=-130 -> Abbruch.
    expect(faltmarken(1600, 594)).toEqual({
      vertikal: [1390, 1200, 1010, 820, 630, 440, 250, 60],
      horizontal: [297],
    });
  });

  it('faltmarken hoch: dieselben Vertikal-Marken wie A1-hoch/A2-quer (w=594 numerisch gleich), horizontal bei H-297=1303', () => {
    const { breite: w, hoehe: h } = dims('Rolle', 'hoch');
    expect(w).toBe(594);
    expect(h).toBe(1600);
    expect(faltmarken(w, h)).toEqual({ vertikal: [384, 194], horizontal: [1303] });
  });

  describe('leporelloFaltung(w,h) — Faltfelder/Knicklinien-Ableitung (reine Funktion, kein zweiter Faltalgorithmus)', () => {
    it('quer: 9 Faltfelder (Deckfläche 210mm + 7×190mm + Restfeld 40mm am Heftrand), 8 Knicklinien = faltmarken().vertikal', () => {
      const { breite: w, hoehe: h } = dims('Rolle', 'quer');
      const { felder, knicklinien } = leporelloFaltung(w, h);
      expect(knicklinien).toEqual(faltmarken(w, h).vertikal);
      expect(felder).toHaveLength(9);
      expect(felder.map((f) => f.breite)).toEqual([210, 190, 190, 190, 190, 190, 190, 190, 40]);
      // Alle Felder decken die volle Blatthöhe ab (y=0, hoehe=h), keine Lücke/Überlappung.
      for (const f of felder) {
        expect(f.y).toBe(0);
        expect(f.hoehe).toBe(h);
      }
      const summe = felder.reduce((acc, f) => acc + f.breite, 0);
      expect(summe).toBe(w - BLATT_RAENDER.links); // 1600-20=1580, deckt die gesamte Fläche rechts des Heftrands
      // Feldgrenzen (x + breite) grenzen lückenlos aneinander, von rechts (Deckfläche) nach links.
      for (let i = 0; i < felder.length - 1; i++) {
        expect(felder[i]!.x).toBe(felder[i + 1]!.x + felder[i + 1]!.breite);
      }
      // Letztes (linkes) Feld beginnt exakt am Heftrand.
      expect(felder[felder.length - 1]!.x).toBe(BLATT_RAENDER.links);
      // Erstes (rechtes) Feld = Deckfläche, endet exakt an der Blattkante (Plankopf liegt hier).
      expect(felder[0]!.x + felder[0]!.breite).toBe(w);
    });

    it('A4 (Breite 297, keine Vertikal-Marken): genau EIN Feld über die volle Breite, keine Knicklinien', () => {
      const { felder, knicklinien } = leporelloFaltung(297, 210);
      expect(knicklinien).toEqual([]);
      expect(felder).toEqual([{ x: BLATT_RAENDER.links, y: 0, breite: 297 - BLATT_RAENDER.links, hoehe: 210 }]);
    });

    it('funktioniert für jedes Format/jede Ausrichtung ohne negative Feldbreiten (keine Regression über die generische FORMATE-Liste)', () => {
      for (const f of FORMATE) {
        for (const a of AUSRICHTUNGEN) {
          const { breite: w, hoehe: h } = dims(f, a);
          const { felder } = leporelloFaltung(w, h);
          for (const feld of felder) {
            expect(feld.breite).toBeGreaterThan(0);
          }
        }
      }
    });
  });
});
