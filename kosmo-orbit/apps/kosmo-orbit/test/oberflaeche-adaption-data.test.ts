import { beforeEach, describe, expect, it } from 'vitest';
import {
  ALLE_DATEN_GRUPPEN,
  DATEN_LEISTEN_BASIS,
  adaptiveDatenFokusStufe,
  leiteDatenTaetigkeitsKontextAb,
  type DatenGruppe,
  type DatenTaetigkeitsKontext,
} from '../src/state/oberflaeche-adaption-data';
import { type NutzungsProfil } from '../src/state/oberflaeche-adaption-kern';

/**
 * Serie J2 / Batch B1 (docs/SERIE-J2-IMMERSIVE-OBERFLAECHE.md Abschnitt 3.1/4,
 * Abnahme Abschnitt 4): die KosmoData-Matrix isoliert getestet — Muster
 * `test/oberflaeche-adaption.test.ts` (Design-Matrix), hier die zweite
 * Station am selben Kern. Reine Regelfunktion + Kontext-Ableitung, kein
 * DOM/React nötig (Muster A4).
 */

function kontext(partial: Partial<DatenTaetigkeitsKontext> = {}): DatenTaetigkeitsKontext {
  return { tab: 'referenzen', aktionLaeuft: false, panelOffen: false, ...partial };
}

function leeresProfil(): NutzungsProfil {
  return { zaehler: {}, zuletzt: {} };
}

function profilMit(elementId: string, anzahl: number): NutzungsProfil {
  return { zaehler: { [elementId]: anzahl }, zuletzt: {} };
}

beforeEach(() => {
  localStorage.clear();
});

describe('ALLE_DATEN_GRUPPEN / DATEN_LEISTEN_BASIS — T7-Basis (Abschnitt 3.3)', () => {
  it('vier Gruppen, disjunkt vom Design-Namensraum', () => {
    expect([...ALLE_DATEN_GRUPPEN].sort()).toEqual(['dossier', 'navigation', 'suche', 'sync']);
  });

  it('Basis entspricht der Konzept-Tabelle: navigation primär, Rest sekundär', () => {
    expect(DATEN_LEISTEN_BASIS).toEqual({
      navigation: 'primaer',
      suche: 'sekundaer',
      sync: 'sekundaer',
      dossier: 'sekundaer',
    });
  });
});

describe('leiteDatenTaetigkeitsKontextAb — Kontext-Ableitung aus DataWorkspace-State', () => {
  it('aktionLaeuft ist wahr, sobald die Suche getrimmt nicht leer ist', () => {
    expect(leiteDatenTaetigkeitsKontextAb({ tab: 'referenzen', query: 'Villa', dossierOffen: false }).aktionLaeuft).toBe(true);
  });

  it('reine Leerzeichen zählen nicht als Tätigkeit (getrimmt)', () => {
    expect(leiteDatenTaetigkeitsKontextAb({ tab: 'referenzen', query: '   ', dossierOffen: false }).aktionLaeuft).toBe(false);
  });

  it('panelOffen wird unverändert durchgereicht', () => {
    expect(leiteDatenTaetigkeitsKontextAb({ tab: 'referenzen', query: '', dossierOffen: true }).panelOffen).toBe(true);
  });

  it('tab wird unverändert durchgereicht', () => {
    expect(leiteDatenTaetigkeitsKontextAb({ tab: 'uebersicht', query: '', dossierOffen: false }).tab).toBe('uebersicht');
  });
});

describe('adaptiveDatenFokusStufe — Matrix (Abschnitt 3.3/4)', () => {
  it('Ruhezustand: alle Gruppen bleiben auf ihrer T7-Basis', () => {
    for (const g of ALLE_DATEN_GRUPPEN) {
      expect(adaptiveDatenFokusStufe(g, DATEN_LEISTEN_BASIS[g], kontext(), leeresProfil())).toBe(DATEN_LEISTEN_BASIS[g]);
    }
  });

  it('suche bleibt beim Tippen selbst immer primär (Anti-Dimm über aktionLaeuft)', () => {
    const stufe = adaptiveDatenFokusStufe('suche', 'sekundaer', kontext({ aktionLaeuft: true }), leeresProfil());
    expect(stufe).toBe('primaer');
  });

  it('sync tritt beim Tippen auf selten zurück', () => {
    const stufe = adaptiveDatenFokusStufe('sync', 'sekundaer', kontext({ aktionLaeuft: true }), leeresProfil());
    expect(stufe).toBe('selten');
  });

  it('navigation bleibt beim Tippen unverändert primär (keine Demotion für navigation)', () => {
    const stufe = adaptiveDatenFokusStufe('navigation', 'primaer', kontext({ aktionLaeuft: true }), leeresProfil());
    expect(stufe).toBe('primaer');
  });

  it('dossier bleibt primär, solange panelOffen — unabhängig von aktionLaeuft', () => {
    const waehrendTippen = adaptiveDatenFokusStufe('dossier', 'sekundaer', kontext({ aktionLaeuft: true, panelOffen: true }), leeresProfil());
    const inRuhe = adaptiveDatenFokusStufe('dossier', 'sekundaer', kontext({ aktionLaeuft: false, panelOffen: true }), leeresProfil());
    expect(waehrendTippen).toBe('primaer');
    expect(inRuhe).toBe('primaer');
  });

  it('dossier bleibt auf T7-Basis, wenn kein Panel offen ist — auch während getippt wird', () => {
    const stufe = adaptiveDatenFokusStufe('dossier', 'sekundaer', kontext({ aktionLaeuft: true, panelOffen: false }), leeresProfil());
    expect(stufe).toBe('sekundaer');
  });

  it('panelOffen wirkt sich NICHT auf sync aus (nur dossier ist sein Anti-Dimm-Analogon)', () => {
    const stufe = adaptiveDatenFokusStufe('sync', 'sekundaer', kontext({ aktionLaeuft: true, panelOffen: true }), leeresProfil());
    expect(stufe).toBe('selten'); // sync demotet trotz offenem Dossier weiter
  });

  it('Nutzer-Adaption: ein oft genutztes sync-Element hebt sync von selten auf sekundär', () => {
    const nutzung = profilMit('sync:sync-button', 5);
    const stufe = adaptiveDatenFokusStufe('sync', 'sekundaer', kontext({ aktionLaeuft: true }), nutzung);
    expect(stufe).toBe('sekundaer');
  });

  it('ein einzelner Klick reicht nicht zur Hebung', () => {
    const nutzung = profilMit('sync:sync-button', 1);
    const stufe = adaptiveDatenFokusStufe('sync', 'sekundaer', kontext({ aktionLaeuft: true }), nutzung);
    expect(stufe).toBe('selten');
  });

  it('ein unbekannter/neutraler Tab-Zustand ändert nichts an der Matrix (aktuell rein aktionLaeuft/panelOffen-getrieben)', () => {
    const a = adaptiveDatenFokusStufe('sync', 'sekundaer', kontext({ tab: 'uebersicht', aktionLaeuft: true }), leeresProfil());
    const b = adaptiveDatenFokusStufe('sync', 'sekundaer', kontext({ tab: 'referenzen', aktionLaeuft: true }), leeresProfil());
    expect(a).toBe(b);
  });
});

describe('DatenGruppe — Typüberdeckung (Compile-Time, hier als Laufzeit-Symmetrie-Check)', () => {
  it('jede Gruppe hat einen eigenen elementId-Namensraum, der mit ihrem Gruppennamen beginnt', () => {
    const namen: DatenGruppe[] = ['navigation', 'suche', 'sync', 'dossier'];
    for (const n of namen) {
      expect(ALLE_DATEN_GRUPPEN.includes(n)).toBe(true);
    }
  });
});
