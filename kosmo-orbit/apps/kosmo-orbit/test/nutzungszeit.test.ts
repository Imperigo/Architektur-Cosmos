import { describe, expect, it } from 'vitest';
import {
  STATION_TITEL,
  formatiereZuletzt,
  lesbarerElementName,
  meistgenutzteElemente,
  stationsNutzung,
} from '../src/state/nutzungszeit';
import { STATIONS_MODUL_IDS } from '../src/shell/stations-werkzeuge';
import type { NutzungsProfil } from '../src/state/oberflaeche-adaption-kern';

/**
 * v0.8.1 / P15 (Nutzungszeit-Panel) — reine Ableitungs-Tests, kein DOM/kein
 * localStorage-Mocking nötig: `stationsNutzung`/`meistgenutzteElemente`
 * nehmen ein `NutzungsProfil` direkt entgegen (dieselbe Signatur wie
 * `adaptiveFokusStufe`).
 */

function profil(zaehler: Record<string, number>, zuletzt: Record<string, number>): NutzungsProfil {
  return { zaehler, zuletzt };
}

describe('nutzungszeit — Ehrlichkeitsregel', () => {
  it('deckt alle 14 Stationen ab, jede genau einmal', () => {
    const liste = stationsNutzung(profil({}, {}));
    expect(liste).toHaveLength(STATIONS_MODUL_IDS.length);
    expect(liste.map((e) => e.station).sort()).toEqual([...STATIONS_MODUL_IDS].sort());
  });

  it('jede Station hat einen STATION_TITEL-Eintrag', () => {
    for (const s of STATIONS_MODUL_IDS) {
      expect(STATION_TITEL[s]).toBeTruthy();
    }
  });

  it('Stationen ohne STATION_ZU_TOOLID-Zuordnung sind "nicht-erfasst", nicht "nie-genutzt"', () => {
    const liste = stationsNutzung(profil({}, {}));
    const nichtErfasst = liste.filter((e) => e.status === 'nicht-erfasst').map((e) => e.station);
    // asset/draw(KosmoDraw)/sketch/train/doc/trust/paket haben keine ToolId
    // (s. `state/orbit-rang.ts` STATION_ZU_TOOLID) — 7 der 14 Stationen.
    expect(nichtErfasst.sort()).toEqual(['asset', 'doc', 'draw', 'paket', 'sketch', 'train', 'trust'].sort());
  });

  it('eine Station mit ToolId, aber ohne Klicks, ist "nie-genutzt" mit Gewicht 0', () => {
    const liste = stationsNutzung(profil({}, {}));
    const design = liste.find((e) => e.station === 'design')!;
    expect(design.status).toBe('nie-genutzt');
    expect(design.gewicht).toBe(0);
    expect(design.zuletztMs).toBeUndefined();
  });

  it('eine echt genutzte Station zeigt reales Gewicht + realen Zeitstempel', () => {
    const jetzt = Date.now();
    const liste = stationsNutzung(profil({ 'orbit:draw': 4.5 }, { 'orbit:draw': jetzt - 60_000 }));
    const design = liste.find((e) => e.station === 'design')!;
    expect(design.status).toBe('genutzt');
    expect(design.gewicht).toBe(4.5);
    expect(design.zuletztMs).toBe(jetzt - 60_000);
  });

  it('sortiert absteigend nach Gewicht', () => {
    const jetzt = Date.now();
    const liste = stationsNutzung(
      profil(
        { 'orbit:draw': 1, 'orbit:data': 9, 'orbit:viz': 5 },
        { 'orbit:draw': jetzt, 'orbit:data': jetzt, 'orbit:viz': jetzt },
      ),
    );
    const genutzte = liste.filter((e) => e.status === 'genutzt');
    expect(genutzte.map((e) => e.station)).toEqual(['data', 'vis', 'design']);
  });

  it('ein Zähler ohne zuletzt-Zeitstempel gilt defensiv als nie-genutzt (kein Crash, keine erfundene Zeit)', () => {
    const liste = stationsNutzung(profil({ 'orbit:draw': 3 }, {}));
    const design = liste.find((e) => e.station === 'design')!;
    expect(design.status).toBe('nie-genutzt');
  });
});

describe('meistgenutzteElemente', () => {
  it('liefert leer bei leerem Profil', () => {
    expect(meistgenutzteElemente(profil({}, {}))).toEqual([]);
  });

  it('sortiert nach Gewicht, begrenzt auf n', () => {
    const jetzt = Date.now();
    const p = profil(
      { 'zeichnen:wand': 10, 'ebenen:sonne': 5, 'orbit:draw': 20, 'navigation:x': 1 },
      { 'zeichnen:wand': jetzt, 'ebenen:sonne': jetzt, 'orbit:draw': jetzt, 'navigation:x': jetzt },
    );
    const top = meistgenutzteElemente(p, 2);
    expect(top).toHaveLength(2);
    expect(top[0]!.elementId).toBe('orbit:draw');
    expect(top[1]!.elementId).toBe('zeichnen:wand');
  });

  it('ignoriert Einträge mit Gewicht 0 und Einträge ohne echten zuletzt-Zeitstempel', () => {
    const p = profil({ a: 0, b: 5 }, { b: Date.now() });
    const top = meistgenutzteElemente(p);
    expect(top.map((e) => e.elementId)).toEqual(['b']);
  });
});

describe('lesbarerElementName', () => {
  it('formatiert "gruppe:name" lesbar', () => {
    expect(lesbarerElementName('orbit:draw')).toBe('draw (orbit)');
    expect(lesbarerElementName('zeichnen:wand')).toBe('wand (zeichnen)');
  });

  it('fällt auf die rohe Id zurück, wenn kein Doppelpunkt-Namensteil existiert', () => {
    expect(lesbarerElementName('ohnepraefix')).toBe('ohnepraefix');
  });
});

describe('formatiereZuletzt — echte, aus zwei Zeitstempeln berechnete Zeitspanne', () => {
  const jetzt = 1_000_000_000_000;

  it('unter 1 Minute: "gerade eben"', () => {
    expect(formatiereZuletzt(jetzt - 30_000, jetzt)).toBe('gerade eben');
  });

  it('Minuten', () => {
    expect(formatiereZuletzt(jetzt - 5 * 60_000, jetzt)).toBe('vor 5 Min.');
  });

  it('Stunden', () => {
    expect(formatiereZuletzt(jetzt - 3 * 3_600_000, jetzt)).toBe('vor 3 Std.');
  });

  it('Tage (Singular/Plural)', () => {
    expect(formatiereZuletzt(jetzt - 1 * 86_400_000, jetzt)).toBe('vor 1 Tag');
    expect(formatiereZuletzt(jetzt - 4 * 86_400_000, jetzt)).toBe('vor 4 Tagen');
  });

  it('ein zukünftiger Zeitstempel (Uhrendrift) crasht nicht, liefert "gerade eben"', () => {
    expect(formatiereZuletzt(jetzt + 5000, jetzt)).toBe('gerade eben');
  });
});
