import { beforeEach, describe, expect, it } from 'vitest';
import {
  adaptionAktiv,
  adaptionZuruecksetzen,
  darfUmordnen,
  elementFokusStufe,
  gehobenesElementDerGruppe,
  gruppeIstOftGenutzt,
  istUnterBasis,
  nutzungMelden,
  nutzungsProfil,
  nutzungVerfallen,
  opazitaetsKlasse,
  opazitaetsWert,
  setAdaptionAktiv,
  stufeAnheben,
  stufeAusRegel,
  stufeMax,
  stufeMin,
  wendeAntiDimmAn,
  wendeNutzerHebungAn,
  type NutzungsProfil,
} from '../src/state/oberflaeche-adaption-kern';

/**
 * Serie J2 / Batch B1 (docs/SERIE-J2-IMMERSIVE-OBERFLAECHE.md Abschnitt 3.1/4):
 * die stationsneutralen Kern-Primitive isoliert getestet — ohne jeden Design-
 * Bezug (kein `LeistenGruppe`/`TaetigkeitsKontext`), mit generischen
 * Test-Gruppen statt der Design-Matrix. Mustergleich zu
 * `test/oberflaeche-adaption.test.ts` (Storage-Layer-Härte, Rang-Helfer),
 * hier nur der neu geschnittene, stationsneutrale Teil.
 */

const STORAGE_KEY = 'kosmo.adaption.v1';

type TestGruppe = 'alpha' | 'beta' | 'gamma';
const ALLE_TEST_GRUPPEN: readonly TestGruppe[] = ['alpha', 'beta', 'gamma'];

function leeresProfil(): NutzungsProfil {
  return { zaehler: {}, zuletzt: {} };
}

function profilMit(elementId: string, anzahl: number): NutzungsProfil {
  return { zaehler: { [elementId]: anzahl }, zuletzt: {} };
}

beforeEach(() => {
  localStorage.clear();
});

describe('stufeAusRegel — Schritt 1 der aufgetrennten Matrix-Anwendung', () => {
  it('"basis" heisst keine Verschiebung — liefert die Basis-Stufe zurück', () => {
    expect(stufeAusRegel('basis', 'sekundaer')).toBe('sekundaer');
    expect(stufeAusRegel('basis', 'primaer')).toBe('primaer');
  });

  it('eine konkrete Regel-Stufe überschreibt die Basis', () => {
    expect(stufeAusRegel('selten', 'primaer')).toBe('selten');
    expect(stufeAusRegel('primaer', 'selten')).toBe('primaer');
  });
});

describe('wendeAntiDimmAn — Schritt 2, Anti-Dimm-Wache (generisches Ziel statt fixer Basis)', () => {
  it('hebt die Stufe auf das Ziel, wenn aktiv', () => {
    expect(wendeAntiDimmAn('selten', 'sekundaer', true)).toBe('sekundaer');
  });

  it('rührt eine bereits höhere Stufe nicht an (Rang-Maximum, nie eine Absenkung)', () => {
    expect(wendeAntiDimmAn('primaer', 'sekundaer', true)).toBe('primaer');
  });

  it('bleibt unverändert, wenn nicht aktiv', () => {
    expect(wendeAntiDimmAn('selten', 'primaer', false)).toBe('selten');
  });

  it('das Ziel kann über der eigentlichen T7-Basis liegen (KosmoData: Anti-Dimm auf primär statt nur auf die eigene sekundäre Basis)', () => {
    expect(wendeAntiDimmAn('sekundaer', 'primaer', true)).toBe('primaer');
  });
});

describe('wendeNutzerHebungAn — Schritt 3, Top-3-Nutzer-Hebung (generisch über G)', () => {
  it('hebt eine zurückgestellte (selten) Gruppe auf sekundär, wenn ein Top-3-Element oft genug genutzt ist', () => {
    const nutzung = profilMit('alpha:knopf', 5);
    expect(wendeNutzerHebungAn('selten', 'alpha', ALLE_TEST_GRUPPEN, nutzung)).toBe('sekundaer');
  });

  it('rührt eine Stufe über selten nicht an (nur der selten→sekundär-Übergang ist definiert)', () => {
    const nutzung = profilMit('alpha:knopf', 99);
    expect(wendeNutzerHebungAn('sekundaer', 'alpha', ALLE_TEST_GRUPPEN, nutzung)).toBe('sekundaer');
    expect(wendeNutzerHebungAn('primaer', 'alpha', ALLE_TEST_GRUPPEN, nutzung)).toBe('primaer');
  });

  it('ein einzelner Klick unter der Schwelle hebt nicht', () => {
    const nutzung = profilMit('alpha:knopf', 1);
    expect(wendeNutzerHebungAn('selten', 'alpha', ALLE_TEST_GRUPPEN, nutzung)).toBe('selten');
  });

  it('Nutzung einer anderen Gruppe hebt die eigene Gruppe nicht (Top-3 ist je Gruppe)', () => {
    const nutzung = profilMit('beta:knopf', 99);
    expect(wendeNutzerHebungAn('selten', 'alpha', ALLE_TEST_GRUPPEN, nutzung)).toBe('selten');
  });
});

describe('darfUmordnen — nimmt jetzt aktionLaeuft direkt (kein TaetigkeitsKontext)', () => {
  it('friert bei laufender Aktion ein', () => {
    expect(darfUmordnen(true)).toBe(false);
  });

  it('erlaubt Neuberechnung ohne laufende Aktion', () => {
    expect(darfUmordnen(false)).toBe(true);
  });
});

describe('Rang-Arithmetik — stufeMax/stufeMin/stufeAnheben (Zusatz-Exporte für lokale Stations-Sonderfälle)', () => {
  it('stufeMax liefert die höhere Stufe', () => {
    expect(stufeMax('selten', 'sekundaer')).toBe('sekundaer');
    expect(stufeMax('primaer', 'selten')).toBe('primaer');
  });

  it('stufeMin liefert die niedrigere Stufe', () => {
    expect(stufeMin('selten', 'sekundaer')).toBe('selten');
    expect(stufeMin('primaer', 'sekundaer')).toBe('sekundaer');
  });

  it('stufeAnheben hebt um genau eine Stufe, gedeckelt auf primär', () => {
    expect(stufeAnheben('selten')).toBe('sekundaer');
    expect(stufeAnheben('sekundaer')).toBe('primaer');
    expect(stufeAnheben('primaer')).toBe('primaer');
  });
});

describe('istUnterBasis — Vergleichshilfe (unverändert aus dem Ist-Stand)', () => {
  it('erkennt eine demotete Stufe als unter der Basis', () => {
    expect(istUnterBasis('selten', 'sekundaer')).toBe(true);
  });

  it('eine Stufe auf/über der Basis gilt nicht als "unter Basis"', () => {
    expect(istUnterBasis('sekundaer', 'sekundaer')).toBe(false);
    expect(istUnterBasis('primaer', 'sekundaer')).toBe(false);
  });
});

describe('Opazitäts-Helfer — opazitaetsKlasse/opazitaetsWert', () => {
  it('opazitaetsKlasse liefert die reine k-opazitaet-* Klasse', () => {
    expect(opazitaetsKlasse('primaer')).toBe('k-opazitaet-primaer');
    expect(opazitaetsKlasse('sekundaer')).toBe('k-opazitaet-sekundaer');
    expect(opazitaetsKlasse('selten')).toBe('k-opazitaet-selten');
  });

  it('opazitaetsWert spiegelt die aura.css-Werte', () => {
    expect(opazitaetsWert('primaer')).toBe(1);
    expect(opazitaetsWert('sekundaer')).toBe(0.92);
    expect(opazitaetsWert('selten')).toBe(0.6);
  });
});

describe('Element-Hebung — gehobenesElementDerGruppe/elementFokusStufe/gruppeIstOftGenutzt (generalisiert mit alleGruppen-Parameter)', () => {
  it('gehobenesElementDerGruppe liefert undefined ohne Nutzung', () => {
    expect(gehobenesElementDerGruppe('alpha', ALLE_TEST_GRUPPEN, leeresProfil())).toBeUndefined();
  });

  it('gehobenesElementDerGruppe liefert das oft genutzte Element (>= Schwelle)', () => {
    const nutzung = profilMit('alpha:knopf', 5);
    expect(gehobenesElementDerGruppe('alpha', ALLE_TEST_GRUPPEN, nutzung)).toBe('alpha:knopf');
  });

  it('gehobenesElementDerGruppe ignoriert Elemente anderer Gruppen', () => {
    const nutzung = profilMit('beta:knopf', 5);
    expect(gehobenesElementDerGruppe('alpha', ALLE_TEST_GRUPPEN, nutzung)).toBeUndefined();
  });

  it('gruppeIstOftGenutzt ist wahr, sobald ein Top-3-Element die Schwelle erreicht', () => {
    const nutzung = profilMit('gamma:x', 3);
    expect(gruppeIstOftGenutzt('gamma', ALLE_TEST_GRUPPEN, nutzung)).toBe(true);
    expect(gruppeIstOftGenutzt('alpha', ALLE_TEST_GRUPPEN, nutzung)).toBe(false);
  });

  it('elementFokusStufe hebt das gehobene Element eine Stufe über die Gruppen-Stufe', () => {
    expect(elementFokusStufe('alpha:knopf', 'selten', 'alpha:knopf')).toBe('sekundaer');
  });

  it('elementFokusStufe hebt nie über primär hinaus', () => {
    expect(elementFokusStufe('alpha:knopf', 'primaer', 'alpha:knopf')).toBe('primaer');
  });

  it('elementFokusStufe lässt ein nicht gehobenes Geschwister exakt auf der Gruppen-Stufe', () => {
    expect(elementFokusStufe('alpha:anderer', 'selten', 'alpha:knopf')).toBe('selten');
  });
});

describe('Laufzeit-Store — localStorage kosmo.adaption.v1 (geteilt über alle Stationen, Entscheid 2)', () => {
  it('adaptionAktiv() ist standardmässig an', () => {
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    expect(adaptionAktiv()).toBe(true);
  });

  it('ein kaputter localStorage-Eintrag führt zum Basiszustand statt zum Crash', () => {
    localStorage.setItem(STORAGE_KEY, '{ nicht: gueltiges json ][');
    expect(() => adaptionAktiv()).not.toThrow();
    expect(adaptionAktiv()).toBe(true);
  });

  it('nutzungMelden erhöht den gewichteten Zähler', () => {
    nutzungMelden('alpha:x');
    nutzungMelden('alpha:x');
    expect(nutzungsProfil().zaehler['alpha:x']).toBe(2);
  });

  it('nutzungVerfallen halbiert nach genau einer Halbwertszeit (7 Tage)', () => {
    const verfallen = nutzungVerfallen({ zaehler: { a: 10 }, zuletzt: {} }, 7);
    expect(verfallen.zaehler['a']).toBeCloseTo(5, 6);
  });

  it('adaptionZuruecksetzen löscht nur das Profil, lässt den Schalter unangetastet', () => {
    setAdaptionAktiv(false);
    nutzungMelden('alpha:x');
    adaptionZuruecksetzen();
    expect(nutzungsProfil()).toEqual({ zaehler: {}, zuletzt: {} });
    expect(adaptionAktiv()).toBe(false);
  });

  it('setAdaptionAktiv schreibt nur den Schalter, wischt nie das Profil', () => {
    nutzungMelden('alpha:x');
    setAdaptionAktiv(false);
    expect(adaptionAktiv()).toBe(false);
    expect(nutzungsProfil().zaehler['alpha:x']).toBe(1);
    setAdaptionAktiv(true);
    expect(nutzungsProfil().zaehler['alpha:x']).toBe(1);
  });

  it('derselbe Speicher ist von jeder Gruppen-Konfiguration aus lesbar — der Store kennt keine Station', () => {
    nutzungMelden('navigation:referenzen'); // Data-Namensraum
    nutzungMelden('zeichnen:wand'); // Design-Namensraum
    const profil = nutzungsProfil();
    expect(profil.zaehler['navigation:referenzen']).toBe(1);
    expect(profil.zaehler['zeichnen:wand']).toBe(1);
  });
});
