import { beforeEach, describe, expect, it } from 'vitest';
import { neuLadenAusSpeicher, useUiZustand } from '../src/state/ui-zustand';

const STORAGE_KEY = 'kosmo.ui.v1';

/**
 * PC4 (`docs/V084-SPEZ.md` §5 W3, C-20) — der Island/Manuell-Umschalter der
 * prepare-Station (`prepareOberflaeche`), additiv neben `designOberflaeche`/
 * `visOberflaeche` (deren eigene Testdateien unangetastet bleiben). Mirror-
 * Muster derselben Tests, jetzt für das neue Feld — s. `vis-island-
 * oberflaeche.test.ts` (PC1).
 */

beforeEach(() => {
  localStorage.clear();
  neuLadenAusSpeicher();
});

describe('ui-zustand — prepareOberflaeche (PC4, additiv neben designOberflaeche/visOberflaeche)', () => {
  it('Default ist "island"', () => {
    expect(useUiZustand.getState().prepareOberflaeche).toBe('island');
  });

  it('setPrepareOberflaeche schreibt sofort in den Store, unabhängig von design/vis', () => {
    useUiZustand.getState().setPrepareOberflaeche('manuell');
    expect(useUiZustand.getState().prepareOberflaeche).toBe('manuell');
    expect(useUiZustand.getState().designOberflaeche).toBe('island');
    expect(useUiZustand.getState().visOberflaeche).toBe('island');
    useUiZustand.getState().setPrepareOberflaeche('island');
    expect(useUiZustand.getState().prepareOberflaeche).toBe('island');
  });

  it('designOberflaeche/visOberflaeche/prepareOberflaeche sind unabhängig schaltbar (keine Kollision)', () => {
    useUiZustand.getState().setDesignOberflaeche('manuell');
    useUiZustand.getState().setVisOberflaeche('island');
    useUiZustand.getState().setPrepareOberflaeche('manuell');
    expect(useUiZustand.getState().designOberflaeche).toBe('manuell');
    expect(useUiZustand.getState().visOberflaeche).toBe('island');
    expect(useUiZustand.getState().prepareOberflaeche).toBe('manuell');
  });

  it('übersteht einen simulierten Neustart (kosmo.ui.v1-Persistenz)', () => {
    useUiZustand.getState().setPrepareOberflaeche('manuell');
    neuLadenAusSpeicher();
    expect(useUiZustand.getState().prepareOberflaeche).toBe('manuell');
  });

  it('persistiert additiv NEBEN designOberflaeche/visOberflaeche/den Modus-Feldern', () => {
    useUiZustand.getState().setModusAutomatik(false);
    useUiZustand.getState().setDesignOberflaeche('manuell');
    useUiZustand.getState().setPrepareOberflaeche('manuell');
    const roh = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
    expect(roh.version).toBe(1);
    expect(roh.modusAutomatik).toBe(false);
    expect(roh.designOberflaeche).toBe('manuell');
    expect(roh.prepareOberflaeche).toBe('manuell');
  });

  it('fehlendes prepareOberflaeche im Speicher → Default "island" (rückwärtskompatibel mit altem kosmo.ui.v1)', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ version: 1, modusAutomatik: true, modusFesthalten: false, phasenFokus: null, designOberflaeche: 'manuell' }),
    );
    neuLadenAusSpeicher();
    const s = useUiZustand.getState();
    expect(s.designOberflaeche).toBe('manuell');
    expect(s.prepareOberflaeche).toBe('island');
  });

  it('minimaler E2E-Seed (nur version+modusAutomatik+prepareOberflaeche, wie manuell-seed.ts) validiert', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, modusAutomatik: false, prepareOberflaeche: 'manuell' }));
    neuLadenAusSpeicher();
    const s = useUiZustand.getState();
    expect(s.prepareOberflaeche).toBe('manuell');
    expect(s.modusAutomatik).toBe(false);
  });

  it('ungültiger prepareOberflaeche-Wert → ganzer Datensatz ungültig, Basiszustand (kein stiller Fake-Wert)', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, modusAutomatik: false, prepareOberflaeche: 'irgendwas-erfundenes' }));
    neuLadenAusSpeicher();
    const s = useUiZustand.getState();
    expect(s.modusAutomatik).toBe(true);
    expect(s.prepareOberflaeche).toBe('island');
  });

  it('kaputtes JSON → Basiszustand inkl. prepareOberflaeche "island"', () => {
    localStorage.setItem(STORAGE_KEY, '{nicht json');
    neuLadenAusSpeicher();
    expect(useUiZustand.getState().prepareOberflaeche).toBe('island');
  });
});
