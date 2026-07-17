import { beforeEach, describe, expect, it } from 'vitest';
import { neuLadenAusSpeicher, useUiZustand } from '../src/state/ui-zustand';

const STORAGE_KEY = 'kosmo.ui.v1';

/**
 * PD2 (`docs/ISLAND-UI-SPEZ.md` §6 Sanktion 1, `docs/V082-SPEZ.md` C-35/
 * C-41) — der Island/Manuell-Umschalter in `ui-zustand.ts`. Eigene, NEUE
 * Testdatei (statt `ui-zustand.test.ts` zu erweitern) — additiv, keine
 * bestehende Testdatei angefasst.
 */

beforeEach(() => {
  localStorage.clear();
  neuLadenAusSpeicher();
});

describe('ui-zustand — designOberflaeche (PD2 Default-Flip C-35)', () => {
  it('Default ist "island" — das IST der Default-Flip', () => {
    expect(useUiZustand.getState().designOberflaeche).toBe('island');
  });

  it('setDesignOberflaeche schreibt sofort in den Store', () => {
    useUiZustand.getState().setDesignOberflaeche('manuell');
    expect(useUiZustand.getState().designOberflaeche).toBe('manuell');
    useUiZustand.getState().setDesignOberflaeche('island');
    expect(useUiZustand.getState().designOberflaeche).toBe('island');
  });

  it('übersteht einen simulierten Neustart (kosmo.ui.v1-Persistenz, C-41)', () => {
    useUiZustand.getState().setDesignOberflaeche('manuell');
    neuLadenAusSpeicher();
    expect(useUiZustand.getState().designOberflaeche).toBe('manuell');
  });

  it('persistiert additiv NEBEN den bestehenden Modus-Feldern (keine Kollision)', () => {
    useUiZustand.getState().setModusAutomatik(false);
    useUiZustand.getState().setDesignOberflaeche('manuell');
    const roh = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
    expect(roh.version).toBe(1);
    expect(roh.modusAutomatik).toBe(false);
    expect(roh.designOberflaeche).toBe('manuell');
  });

  it('minimaler E2E-Seed (nur version+modusAutomatik+designOberflaeche, wie playwright.config.ts) validiert', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, modusAutomatik: false, designOberflaeche: 'manuell' }));
    neuLadenAusSpeicher();
    const s = useUiZustand.getState();
    expect(s.designOberflaeche).toBe('manuell');
    expect(s.modusAutomatik).toBe(false);
    expect(s.modusFesthalten).toBe(false);
    expect(s.phasenFokus).toBeNull();
  });

  it('fehlendes designOberflaeche im Speicher → Default "island" (rückwärtskompatibel mit altem kosmo.ui.v1)', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, modusAutomatik: true, modusFesthalten: false, phasenFokus: null }));
    neuLadenAusSpeicher();
    expect(useUiZustand.getState().designOberflaeche).toBe('island');
  });

  it('ungültiger designOberflaeche-Wert → ganzer Datensatz ungültig, Basiszustand (kein stiller Fake-Wert)', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ version: 1, modusAutomatik: false, designOberflaeche: 'irgendwas-erfundenes' }),
    );
    neuLadenAusSpeicher();
    const s = useUiZustand.getState();
    // Ganzer Datensatz fällt auf Basiszustand zurück (istGueltigerSpeicher
    // liefert false) — modusAutomatik landet damit auf dem Basiswert true,
    // NICHT auf dem im kaputten Datensatz stehenden false.
    expect(s.modusAutomatik).toBe(true);
    expect(s.designOberflaeche).toBe('island');
  });

  it('kaputtes JSON → Basiszustand inkl. designOberflaeche "island"', () => {
    localStorage.setItem(STORAGE_KEY, '{nicht json');
    neuLadenAusSpeicher();
    expect(useUiZustand.getState().designOberflaeche).toBe('island');
  });
});
