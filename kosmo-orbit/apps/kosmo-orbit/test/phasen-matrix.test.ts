import { describe, expect, it } from 'vitest';
import type { SiaPhase } from '@kosmo/kernel';

const ALLE_8_PHASEN: readonly SiaPhase[] = [
  'strategie',
  'wettbewerb',
  'vorprojekt',
  'bauprojekt',
  'bewilligung',
  'ausschreibung',
  'ausfuehrung',
  'abnahme',
];

describe('PHASEN_MATRIX (V0812-SPEZ E-M, Muster stations-werkzeuge.test.ts): Vollständigkeit + Zellen-Belegung', () => {
  it('deckt ALLE 19 Werkzeug-Ids ab (8 Stationen + 11 ZEICHNEN-Insel), je Eintrag mind. eine sichtbare Phase', async () => {
    const { PHASEN_MATRIX, ALLE_WERKZEUG_IDS } = await import('../src/state/phasen-matrix');

    expect(Object.keys(PHASEN_MATRIX).sort()).toEqual([...ALLE_WERKZEUG_IDS].sort());
    expect(ALLE_WERKZEUG_IDS).toHaveLength(19);

    for (const id of ALLE_WERKZEUG_IDS) {
      const eintrag = PHASEN_MATRIX[id];
      expect(eintrag.sichtbar.length, `Werkzeug ${id}`).toBeGreaterThan(0);
      // Nur gültige SiaPhase-Werte, keine Duplikate innerhalb einer Zeile.
      for (const phase of eintrag.sichtbar) {
        expect(ALLE_8_PHASEN, `Werkzeug ${id}: unbekannte Phase "${phase}"`).toContain(phase);
      }
      expect(new Set(eintrag.sichtbar).size).toBe(eintrag.sichtbar.length);
    }
  });

  it('keine Duplikate/Lücken in ALLE_WERKZEUG_IDS selbst', async () => {
    const { ALLE_WERKZEUG_IDS } = await import('../src/state/phasen-matrix');
    expect(new Set(ALLE_WERKZEUG_IDS).size).toBe(ALLE_WERKZEUG_IDS.length);
  });

  it('die 8 Stations-Ids (orbit-rang.ts ALLE_TOOL_IDS) sind in JEDER Phase sichtbar (Konzept beschreibt keine Stations-Zeilen)', async () => {
    const { PHASEN_MATRIX } = await import('../src/state/phasen-matrix');
    const { ALLE_TOOL_IDS } = await import('../src/state/orbit-rang');
    for (const stationId of ALLE_TOOL_IDS) {
      expect(PHASEN_MATRIX[stationId].sichtbar.sort()).toEqual([...ALLE_8_PHASEN].sort());
    }
  });

  it('Auswahl/Messen (phasenlos laut Konzept) sind in allen 8 Phasen sichtbar', async () => {
    const { PHASEN_MATRIX } = await import('../src/state/phasen-matrix');
    expect(PHASEN_MATRIX.auswahl.sichtbar.sort()).toEqual([...ALLE_8_PHASEN].sort());
    expect(PHASEN_MATRIX.messen.sichtbar.sort()).toEqual([...ALLE_8_PHASEN].sort());
  });

  it('Volumen (R7-Owner-Beispiel K29): sichtbar bis Bewilligung, NICHT mehr ab Ausschreibung/Ausführung/Abnahme', async () => {
    const { PHASEN_MATRIX, werkzeugInPhaseSichtbar } = await import('../src/state/phasen-matrix');
    expect(PHASEN_MATRIX.volumen.sichtbar.sort()).toEqual(
      ['strategie', 'wettbewerb', 'vorprojekt', 'bauprojekt', 'bewilligung'].sort(),
    );
    expect(werkzeugInPhaseSichtbar('volumen', 'strategie')).toBe(true);
    expect(werkzeugInPhaseSichtbar('volumen', 'bewilligung')).toBe(true);
    expect(werkzeugInPhaseSichtbar('volumen', 'ausschreibung')).toBe(false);
    expect(werkzeugInPhaseSichtbar('volumen', 'ausfuehrung')).toBe(false);
    expect(werkzeugInPhaseSichtbar('volumen', 'abnahme')).toBe(false);
  });

  it('Mesh (R7): NICHT sichtbar exakt in Ausschreibung, sonst überall', async () => {
    const { werkzeugInPhaseSichtbar } = await import('../src/state/phasen-matrix');
    expect(werkzeugInPhaseSichtbar('mesh', 'ausschreibung')).toBe(false);
    for (const phase of ALLE_8_PHASEN.filter((p) => p !== 'ausschreibung')) {
      expect(werkzeugInPhaseSichtbar('mesh', phase), `mesh @ ${phase}`).toBe(true);
    }
  });

  it('werkzeugInPhaseSichtbar ist defensiv true für unbekannte Ids (andere Inseln/Stationen)', async () => {
    const { werkzeugInPhaseSichtbar } = await import('../src/state/phasen-matrix');
    expect(werkzeugInPhaseSichtbar('sonne', 'strategie')).toBe(true);
    expect(werkzeugInPhaseSichtbar('kennzahlen', 'ausschreibung')).toBe(true);
    expect(werkzeugInPhaseSichtbar('irgendwas-unbekanntes', 'abnahme')).toBe(true);
  });

  it('Phase 1 (Strategie) zeigt in ZEICHNEN mehr Werkzeuge als Phase 4 (Ausschreibung) — die beweisbare Differenz für den E2E-Vertrag', async () => {
    const { ZEICHNEN_WERKZEUG_IDS, werkzeugInPhaseSichtbar } = await import('../src/state/phasen-matrix');
    const phase1 = ZEICHNEN_WERKZEUG_IDS.filter((id) => werkzeugInPhaseSichtbar(id, 'strategie'));
    const phase4 = ZEICHNEN_WERKZEUG_IDS.filter((id) => werkzeugInPhaseSichtbar(id, 'ausschreibung'));
    expect(phase1.length).toBe(11);
    expect(phase4.length).toBe(9);
    expect(phase1).toEqual(expect.arrayContaining(['volumen', 'mesh']));
    expect(phase4).not.toEqual(expect.arrayContaining(['volumen']));
    expect(phase4).not.toEqual(expect.arrayContaining(['mesh']));
  });
});
