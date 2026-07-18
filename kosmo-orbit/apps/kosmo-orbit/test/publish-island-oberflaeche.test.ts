import { beforeEach, describe, expect, it } from 'vitest';
import { neuLadenAusSpeicher, useUiZustand } from '../src/state/ui-zustand';

const STORAGE_KEY = 'kosmo.ui.v1';

/**
 * PC3 (`docs/V084-SPEZ.md` §5 W3, C-19) — der Island/Manuell-Umschalter der
 * publish-Station (`publishOberflaeche`), additiv neben `designOberflaeche`/
 * `visOberflaeche` (deren eigene Testdateien unangetastet bleiben). Muster
 * `test/vis-island-oberflaeche.test.ts` (PC1).
 */

beforeEach(() => {
  localStorage.clear();
  neuLadenAusSpeicher();
});

describe('ui-zustand — publishOberflaeche (PC3, additiv neben designOberflaeche/visOberflaeche)', () => {
  it('Default ist "island"', () => {
    expect(useUiZustand.getState().publishOberflaeche).toBe('island');
  });

  it('setPublishOberflaeche schreibt sofort in den Store, unabhängig von design/vis', () => {
    useUiZustand.getState().setPublishOberflaeche('manuell');
    expect(useUiZustand.getState().publishOberflaeche).toBe('manuell');
    expect(useUiZustand.getState().designOberflaeche).toBe('island');
    expect(useUiZustand.getState().visOberflaeche).toBe('island');
    useUiZustand.getState().setPublishOberflaeche('island');
    expect(useUiZustand.getState().publishOberflaeche).toBe('island');
  });

  it('designOberflaeche/visOberflaeche/publishOberflaeche sind unabhängig schaltbar (keine Kollision)', () => {
    useUiZustand.getState().setDesignOberflaeche('manuell');
    useUiZustand.getState().setVisOberflaeche('island');
    useUiZustand.getState().setPublishOberflaeche('manuell');
    expect(useUiZustand.getState().designOberflaeche).toBe('manuell');
    expect(useUiZustand.getState().visOberflaeche).toBe('island');
    expect(useUiZustand.getState().publishOberflaeche).toBe('manuell');
  });

  it('übersteht einen simulierten Neustart (kosmo.ui.v1-Persistenz)', () => {
    useUiZustand.getState().setPublishOberflaeche('manuell');
    neuLadenAusSpeicher();
    expect(useUiZustand.getState().publishOberflaeche).toBe('manuell');
  });

  it('persistiert additiv NEBEN designOberflaeche/visOberflaeche/den Modus-Feldern', () => {
    useUiZustand.getState().setModusAutomatik(false);
    useUiZustand.getState().setDesignOberflaeche('manuell');
    useUiZustand.getState().setPublishOberflaeche('manuell');
    const roh = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
    expect(roh.version).toBe(1);
    expect(roh.modusAutomatik).toBe(false);
    expect(roh.designOberflaeche).toBe('manuell');
    expect(roh.publishOberflaeche).toBe('manuell');
  });

  it('fehlendes publishOberflaeche im Speicher → Default "island" (rückwärtskompatibel mit altem kosmo.ui.v1)', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ version: 1, modusAutomatik: true, modusFesthalten: false, phasenFokus: null, designOberflaeche: 'manuell' }),
    );
    neuLadenAusSpeicher();
    const s = useUiZustand.getState();
    expect(s.designOberflaeche).toBe('manuell');
    expect(s.publishOberflaeche).toBe('island');
  });

  it('minimaler E2E-Seed (nur version+modusAutomatik+publishOberflaeche, wie manuell-seed.ts) validiert', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, modusAutomatik: false, publishOberflaeche: 'manuell' }));
    neuLadenAusSpeicher();
    const s = useUiZustand.getState();
    expect(s.publishOberflaeche).toBe('manuell');
    expect(s.modusAutomatik).toBe(false);
  });

  it('ungültiger publishOberflaeche-Wert → ganzer Datensatz ungültig, Basiszustand (kein stiller Fake-Wert)', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, modusAutomatik: false, publishOberflaeche: 'irgendwas-erfundenes' }));
    neuLadenAusSpeicher();
    const s = useUiZustand.getState();
    expect(s.modusAutomatik).toBe(true);
    expect(s.publishOberflaeche).toBe('island');
  });

  it('kaputtes JSON → Basiszustand inkl. publishOberflaeche "island"', () => {
    localStorage.setItem(STORAGE_KEY, '{nicht json');
    neuLadenAusSpeicher();
    expect(useUiZustand.getState().publishOberflaeche).toBe('island');
  });
});
