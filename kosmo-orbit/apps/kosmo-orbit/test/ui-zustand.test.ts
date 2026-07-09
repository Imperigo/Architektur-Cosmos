import { beforeEach, describe, expect, it } from 'vitest';
import { neuLadenAusSpeicher, useUiZustand } from '../src/state/ui-zustand';

const STORAGE_KEY = 'kosmo.ui.v1';

beforeEach(() => {
  localStorage.clear();
  neuLadenAusSpeicher();
});

describe('ui-zustand — Defaults (v0.6.6 Bewegungskonzept §6)', () => {
  it('Neutral-Start: kein Arbeitsmodus, Automatik AN, Festhalten AUS', () => {
    const s = useUiZustand.getState();
    expect(s.arbeitsmodus).toBeUndefined();
    expect(s.modusAutomatik).toBe(true);
    expect(s.modusFesthalten).toBe(false);
    expect(s.modusManuell).toBeUndefined();
    expect(s.phasenFokus).toBeNull();
  });

  it('Session-Felder starten wie die bisherigen useState-Defaults in DesignWorkspace.tsx', () => {
    const s = useUiZustand.getState();
    expect(s.tool).toBe('auswahl');
    expect(s.viewMode).toBe('split');
    expect(s.exportMenuOffen).toBe(true); // bewusst OFFEN per Default, wie im bestehenden useState
    expect(s.studieOffen).toBe(false);
    expect(s.drawOffen).toBe(false);
    expect(s.listeOffen).toBe(false);
    expect(s.rasterOffen).toBe(false);
    expect(s.kvOffen).toBe(false);
    expect(s.bauablaufOffen).toBe(false);
    expect(s.maengelOffen).toBe(false);
    expect(s.submissionOffen).toBe(false);
    expect(s.splatPanelOffen).toBe(false);
    expect(s.sonneOffen).toBe(false);
    expect(s.mehrOffen).toBe(false);
    // Stream B (W1b): additiv ergänztes Feld — fehlte im Fundament.
    expect(s.projektMenuOffen).toBe(false);
  });

  it('setProjektMenuOffen schreibt direkt (kein funktionales Update, Stream-B-Migration)', () => {
    const s = useUiZustand.getState();
    s.setProjektMenuOffen(true);
    expect(useUiZustand.getState().projektMenuOffen).toBe(true);
    useUiZustand.getState().setProjektMenuOffen(false);
    expect(useUiZustand.getState().projektMenuOffen).toBe(false);
  });
});

describe('ui-zustand — Persistenz-Roundtrip (kosmo.ui.v1)', () => {
  it('Modus-Felder überleben einen simulierten Neustart (neuLadenAusSpeicher)', () => {
    useUiZustand.getState().setArbeitsmodus('zeichnen');
    useUiZustand.getState().setModusAutomatik(false);
    useUiZustand.getState().setModusFesthalten(true);
    useUiZustand.getState().setModusManuell('entwerfen');

    neuLadenAusSpeicher();
    const s = useUiZustand.getState();
    expect(s.arbeitsmodus).toBe('zeichnen');
    expect(s.modusAutomatik).toBe(false);
    expect(s.modusFesthalten).toBe(true);
    expect(s.modusManuell).toBe('entwerfen');
  });

  it('phasenFokus überlebt als Set einen simulierten Neustart', () => {
    useUiZustand.getState().setPhasenFokus(new Set(['kv', 'bauablauf']));
    neuLadenAusSpeicher();
    const s = useUiZustand.getState();
    expect(s.phasenFokus).toBeInstanceOf(Set);
    expect([...(s.phasenFokus ?? [])].sort()).toEqual(['bauablauf', 'kv']);
  });

  it('phasenFokus=null überlebt einen simulierten Neustart', () => {
    useUiZustand.getState().setPhasenFokus(new Set(['sonne']));
    useUiZustand.getState().setPhasenFokus(null);
    neuLadenAusSpeicher();
    expect(useUiZustand.getState().phasenFokus).toBeNull();
  });

  it('tool/viewMode/Panel-Flags bleiben NACH Neuladen auf Session-Default (nicht persistiert)', () => {
    useUiZustand.getState().setTool('wand');
    useUiZustand.getState().setViewMode('2d');
    useUiZustand.getState().setStudieOffen(true);
    useUiZustand.getState().setMehrOffen(true);
    useUiZustand.getState().setExportMenuOffen(false);

    neuLadenAusSpeicher();
    const s = useUiZustand.getState();
    expect(s.tool).toBe('auswahl');
    expect(s.viewMode).toBe('split');
    expect(s.studieOffen).toBe(false);
    expect(s.mehrOffen).toBe(false);
    expect(s.exportMenuOffen).toBe(true);
  });

  it('schreibt gültiges, versioniertes JSON unter kosmo.ui.v1', () => {
    useUiZustand.getState().setArbeitsmodus('modellieren');
    const roh = localStorage.getItem(STORAGE_KEY);
    expect(roh).not.toBeNull();
    const geparst = JSON.parse(roh!);
    expect(geparst.version).toBe(1);
    expect(geparst.arbeitsmodus).toBe('modellieren');
    expect(geparst.modusAutomatik).toBe(true);
  });
});

describe('ui-zustand — Härte gegen kaputten Speicher', () => {
  it('kaputtes JSON → Basiszustand, kein Crash', () => {
    localStorage.setItem(STORAGE_KEY, '{nicht json');
    neuLadenAusSpeicher();
    const s = useUiZustand.getState();
    expect(s.arbeitsmodus).toBeUndefined();
    expect(s.modusAutomatik).toBe(true);
    expect(s.modusFesthalten).toBe(false);
    expect(s.phasenFokus).toBeNull();
  });

  it('falsche Version → Basiszustand', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 2, modusAutomatik: false, modusFesthalten: false, phasenFokus: null }));
    neuLadenAusSpeicher();
    expect(useUiZustand.getState().modusAutomatik).toBe(true);
  });

  it('unbekannter Arbeitsmodus-String → Basiszustand (kein stiller Fake-Wert)', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ version: 1, arbeitsmodus: 'erfinden', modusAutomatik: true, modusFesthalten: false, phasenFokus: null }),
    );
    neuLadenAusSpeicher();
    expect(useUiZustand.getState().arbeitsmodus).toBeUndefined();
  });

  it('unbekannte Fähigkeit in phasenFokus → Basiszustand', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ version: 1, modusAutomatik: true, modusFesthalten: false, phasenFokus: ['nicht-echt'] }),
    );
    neuLadenAusSpeicher();
    expect(useUiZustand.getState().phasenFokus).toBeNull();
  });

  it('minimaler Datensatz (nur version+modusAutomatik, wie der Playwright-E2E-Seed) validiert und füllt Defaults', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, modusAutomatik: false }));
    neuLadenAusSpeicher();
    const s = useUiZustand.getState();
    expect(s.modusAutomatik).toBe(false);
    expect(s.modusFesthalten).toBe(false);
    expect(s.phasenFokus).toBeNull();
    expect(s.arbeitsmodus).toBeUndefined();
  });

  it('fehlender localStorage-Eintrag → Basiszustand', () => {
    neuLadenAusSpeicher();
    const s = useUiZustand.getState();
    expect(s.modusAutomatik).toBe(true);
    expect(s.modusFesthalten).toBe(false);
  });
});
