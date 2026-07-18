import { beforeEach, describe, expect, it } from 'vitest';
import { neuLadenAusSpeicher, useUiZustand } from '../src/state/ui-zustand';

const STORAGE_KEY = 'kosmo.ui.v1';

/**
 * PC1 (`docs/V084-SPEZ.md` §5 W2) — der Island/Manuell-Umschalter der
 * vis-Station (`visOberflaeche`), additiv neben `designOberflaeche` (dessen
 * eigene Testdatei `ui-zustand-design-oberflaeche.test.ts` unangetastet
 * bleibt). Mirror-Muster derselben Tests, jetzt für das neue Feld.
 */

beforeEach(() => {
  localStorage.clear();
  neuLadenAusSpeicher();
});

describe('ui-zustand — visOberflaeche (PC1, additiv neben designOberflaeche)', () => {
  it('Default ist "island"', () => {
    expect(useUiZustand.getState().visOberflaeche).toBe('island');
  });

  it('setVisOberflaeche schreibt sofort in den Store, unabhängig von designOberflaeche', () => {
    useUiZustand.getState().setVisOberflaeche('manuell');
    expect(useUiZustand.getState().visOberflaeche).toBe('manuell');
    expect(useUiZustand.getState().designOberflaeche).toBe('island');
    useUiZustand.getState().setVisOberflaeche('island');
    expect(useUiZustand.getState().visOberflaeche).toBe('island');
  });

  it('designOberflaeche und visOberflaeche sind unabhängig schaltbar (keine Kollision)', () => {
    useUiZustand.getState().setDesignOberflaeche('manuell');
    useUiZustand.getState().setVisOberflaeche('island');
    expect(useUiZustand.getState().designOberflaeche).toBe('manuell');
    expect(useUiZustand.getState().visOberflaeche).toBe('island');
  });

  it('übersteht einen simulierten Neustart (kosmo.ui.v1-Persistenz)', () => {
    useUiZustand.getState().setVisOberflaeche('manuell');
    neuLadenAusSpeicher();
    expect(useUiZustand.getState().visOberflaeche).toBe('manuell');
  });

  it('persistiert additiv NEBEN designOberflaeche/den Modus-Feldern', () => {
    useUiZustand.getState().setModusAutomatik(false);
    useUiZustand.getState().setDesignOberflaeche('manuell');
    useUiZustand.getState().setVisOberflaeche('manuell');
    const roh = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
    expect(roh.version).toBe(1);
    expect(roh.modusAutomatik).toBe(false);
    expect(roh.designOberflaeche).toBe('manuell');
    expect(roh.visOberflaeche).toBe('manuell');
  });

  it('fehlendes visOberflaeche im Speicher → Default "island" (rückwärtskompatibel mit altem kosmo.ui.v1)', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ version: 1, modusAutomatik: true, modusFesthalten: false, phasenFokus: null, designOberflaeche: 'manuell' }),
    );
    neuLadenAusSpeicher();
    const s = useUiZustand.getState();
    expect(s.designOberflaeche).toBe('manuell');
    expect(s.visOberflaeche).toBe('island');
  });

  it('minimaler E2E-Seed (nur version+modusAutomatik+visOberflaeche, wie manuell-seed.ts) validiert', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, modusAutomatik: false, visOberflaeche: 'manuell' }));
    neuLadenAusSpeicher();
    const s = useUiZustand.getState();
    expect(s.visOberflaeche).toBe('manuell');
    expect(s.modusAutomatik).toBe(false);
  });

  it('ungültiger visOberflaeche-Wert → ganzer Datensatz ungültig, Basiszustand (kein stiller Fake-Wert)', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, modusAutomatik: false, visOberflaeche: 'irgendwas-erfundenes' }));
    neuLadenAusSpeicher();
    const s = useUiZustand.getState();
    expect(s.modusAutomatik).toBe(true);
    expect(s.visOberflaeche).toBe('island');
  });

  it('kaputtes JSON → Basiszustand inkl. visOberflaeche "island"', () => {
    localStorage.setItem(STORAGE_KEY, '{nicht json');
    neuLadenAusSpeicher();
    expect(useUiZustand.getState().visOberflaeche).toBe('island');
  });
});
