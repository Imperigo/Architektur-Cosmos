import { beforeEach, describe, expect, it } from 'vitest';
import { KOSMO_AUSGESCHLOSSENE_COMMANDS, kosmoUiWerkzeuge, type UiAktionMeldung } from '../src/state/kosmo-ui-werkzeuge';
import { alleUiBefehle } from '../src/state/ui-befehle';
import { neuLadenAusSpeicher, useUiZustand } from '../src/state/ui-zustand';
import { useProject } from '../src/state/project-store';

/**
 * v0.6.6 Welle 3 / Stream E — Kosmo-UI-Brücke (BEWEGUNGSKONZEPT §6):
 * `kosmoUiWerkzeuge()` macht die ui.*-Registry (`state/ui-befehle.ts`,
 * EINGEFROREN) als `ReadTool[]` verfügbar — SOFORT ausführend (kein
 * Diff-Karten-Gate), mit einer Sichtbarkeits-Meldung bei jedem schreibenden
 * Aufruf (`onAktion`).
 */

beforeEach(() => {
  localStorage.clear();
  neuLadenAusSpeicher();
});

describe('kosmoUiWerkzeuge()', () => {
  it('liefert genau ein Werkzeug pro ui.*-Befehl, korrekt benannt (Punkt → Unterstrich)', () => {
    const werkzeuge = kosmoUiWerkzeuge(() => {});
    expect(werkzeuge).toHaveLength(alleUiBefehle().length);
    const namen = werkzeuge.map((w) => w.name).sort();
    expect(namen).toEqual([
      'ui_ansichtSetzen',
      // v0.7.8 Welle 3 (P7, «Kosmo ordnet») — die additiven `ui.dock*`-
      // Befehle (`state/dock-befehle.ts`), statisch importiert von
      // `kosmo-ui-werkzeuge.ts` (s. dortigen Kommentar). v0.8.0 (PD2) fügt
      // `ui_dockPresetSetzen` hinzu (Default-Oberflächen).
      'ui_dockAnheften',
      'ui_dockEinklappen',
      'ui_dockGroesseSetzen',
      'ui_dockLayoutLesen',
      'ui_dockPresetSetzen',
      'ui_dockSetzen',
      'ui_dockZurueckLegen',
      'ui_dockZuruecksetzen',
      'ui_geschossSetzen',
      'ui_modusAutomatik',
      'ui_modusSetzen',
      'ui_panelSetzen',
      'ui_werkzeugSetzen',
      'ui_zustandLesen',
    ]);
  });

  it('jedes Werkzeug trägt Beschreibung + JSON-Schema (LLM-sichtbar)', () => {
    for (const w of kosmoUiWerkzeuge(() => {})) {
      expect(w.description.length).toBeGreaterThan(10);
      expect(w.parameters && typeof w.parameters === 'object').toBe(true);
    }
  });

  it('ui_werkzeugSetzen mutiert SOFORT den ui-zustand.ts-Store — kein Undo, kein Doc', () => {
    const werkzeuge = kosmoUiWerkzeuge(() => {});
    const tool = werkzeuge.find((w) => w.name === 'ui_werkzeugSetzen')!;
    tool.execute({ tool: 'mesh' });
    expect(useUiZustand.getState().tool).toBe('mesh');
  });

  it('ui_zustandLesen liefert den ECHTEN, aktuellen Snapshot als JSON (kein fester Platzhaltertext)', () => {
    useUiZustand.getState().setTool('treppe');
    useUiZustand.getState().setViewMode('2d');
    const werkzeuge = kosmoUiWerkzeuge(() => {});
    const tool = werkzeuge.find((w) => w.name === 'ui_zustandLesen')!;
    const roh = tool.execute({}) as string;
    const snap = JSON.parse(roh) as { tool: string; viewMode: string };
    expect(snap.tool).toBe('treppe');
    expect(snap.viewMode).toBe('2d');
  });

  it('ui_zustandLesen (lesend) löst KEINE Aktionsmeldung aus — nur schreibende Befehle quittieren sich sichtbar', () => {
    const meldungen: UiAktionMeldung[] = [];
    const werkzeuge = kosmoUiWerkzeuge((m) => meldungen.push(m));
    werkzeuge.find((w) => w.name === 'ui_zustandLesen')!.execute({});
    expect(meldungen).toHaveLength(0);
  });

  it('ui_panelSetzen quittiert sich sichtbar mit dem Panel-Namen — art "panel" (testid kosmo-ui-aktion-panel)', () => {
    const meldungen: UiAktionMeldung[] = [];
    const werkzeuge = kosmoUiWerkzeuge((m) => meldungen.push(m));
    werkzeuge.find((w) => w.name === 'ui_panelSetzen')!.execute({ panel: 'kvOffen', offen: true });
    expect(meldungen).toHaveLength(1);
    expect(meldungen[0]!.art).toBe('panel');
    expect(meldungen[0]!.text).toContain('KV-Panel');
    expect(meldungen[0]!.text).toContain('geöffnet');
  });

  it('ui_panelSetzen kennt das neue Varianten-Panel (v0.7.0 Stream 5A, PANEL_LABEL-Nachzug)', () => {
    const meldungen: UiAktionMeldung[] = [];
    const werkzeuge = kosmoUiWerkzeuge((m) => meldungen.push(m));
    werkzeuge.find((w) => w.name === 'ui_panelSetzen')!.execute({ panel: 'variantenPanelOffen', offen: true });
    expect(meldungen).toHaveLength(1);
    expect(meldungen[0]!.text).toContain('Varianten-Panel');
    expect(meldungen[0]!.text).toContain('geöffnet');
  });

  it('ui_modusSetzen quittiert sich mit Label + ehrlicher Begründung «auf Wunsch» (Kritik-1-C1)', () => {
    const meldungen: UiAktionMeldung[] = [];
    const werkzeuge = kosmoUiWerkzeuge((m) => meldungen.push(m));
    werkzeuge.find((w) => w.name === 'ui_modusSetzen')!.execute({ modus: 'exportieren' });
    expect(meldungen[0]!.art).toBe('modus');
    expect(meldungen[0]!.text).toContain('PDF exportieren');
    expect(meldungen[0]!.text).toContain('auf Wunsch');
  });

  it('ui_modusAutomatik quittiert sich mit art "automatik", je nach Richtung ein/aus', () => {
    const meldungen: UiAktionMeldung[] = [];
    const werkzeuge = kosmoUiWerkzeuge((m) => meldungen.push(m));
    werkzeuge.find((w) => w.name === 'ui_modusAutomatik')!.execute({ automatik: false });
    expect(meldungen[0]!.art).toBe('automatik');
    expect(meldungen[0]!.text).toContain('ausgeschaltet');
  });

  it('respektiert eine gehaltene Übersteuerung: ui_modusAutomatik rührt modusFesthalten nicht an (kein stiller Override)', () => {
    useUiZustand.getState().setArbeitsmodus('exportieren');
    useUiZustand.getState().setModusFesthalten(true);
    const werkzeuge = kosmoUiWerkzeuge(() => {});
    werkzeuge.find((w) => w.name === 'ui_modusAutomatik')!.execute({ automatik: true });
    expect(useUiZustand.getState().modusFesthalten).toBe(true);
    expect(useUiZustand.getState().arbeitsmodus).toBe('exportieren');
  });

  it('ungültige Parameter werfen (UiBefehlError) — execute() gibt den Fehler weiter, KEINE Aktionsmeldung', () => {
    const meldungen: UiAktionMeldung[] = [];
    const werkzeuge = kosmoUiWerkzeuge((m) => meldungen.push(m));
    const tool = werkzeuge.find((w) => w.name === 'ui_werkzeugSetzen')!;
    expect(() => tool.execute({ tool: 'zauberstab' })).toThrow();
    expect(meldungen).toHaveLength(0);
  });

  it('erträgt einen JSON-String als Argument (lokale-LLM-Robustheit) und einen leeren/undefined-Aufruf für ui.zustandLesen', () => {
    const werkzeuge = kosmoUiWerkzeuge(() => {});
    const setzen = werkzeuge.find((w) => w.name === 'ui_werkzeugSetzen')!;
    setzen.execute('{"tool":"zone"}');
    expect(useUiZustand.getState().tool).toBe('zone');

    const lesen = werkzeuge.find((w) => w.name === 'ui_zustandLesen')!;
    expect(() => lesen.execute(undefined)).not.toThrow();
  });

  it('ui_geschossSetzen (H-33) quittiert sich mit dem ECHTEN Geschossnamen (aus dem Ergebnis, nicht aus rohen Params) — art "geschoss"', () => {
    const res = useProject.getState().runCommand('design.geschossErstellen', {
      name: 'Werkzeuge-DG', index: 3, elevation: 8000, height: 2400,
    });
    const storeyId = (res.patches[0] as { id: string }).id;
    const meldungen: UiAktionMeldung[] = [];
    const werkzeuge = kosmoUiWerkzeuge((m) => meldungen.push(m));
    const tool = werkzeuge.find((w) => w.name === 'ui_geschossSetzen')!;
    // Aufruf per storeyId (kein Name im Argument) — die Meldung kennt den
    // Namen trotzdem, weil sie aus dem RESULTAT (nicht den rohen Params) baut.
    tool.execute({ storeyId });
    expect(meldungen).toHaveLength(1);
    expect(meldungen[0]!.art).toBe('geschoss');
    expect(meldungen[0]!.text).toContain('Werkzeuge-DG');
    expect(useProject.getState().activeStoreyId).toBe(storeyId);
  });

  it('ui_geschossSetzen mit unbekanntem Geschoss wirft, KEINE Aktionsmeldung', () => {
    const meldungen: UiAktionMeldung[] = [];
    const werkzeuge = kosmoUiWerkzeuge((m) => meldungen.push(m));
    const tool = werkzeuge.find((w) => w.name === 'ui_geschossSetzen')!;
    expect(() => tool.execute({ storeyId: 'geschoss-existiert-nicht' })).toThrow();
    expect(meldungen).toHaveLength(0);
  });
});

describe('KOSMO_AUSGESCHLOSSENE_COMMANDS — kuratierte Ausschlussliste für commandTools({ ohne })', () => {
  it('nennt genau die destruktiven/technischen Commands aus der Auflage (Kosmo soll bauen, nicht abreissen)', () => {
    expect([...KOSMO_AUSGESCHLOSSENE_COMMANDS].sort()).toEqual([
      'design.loeschen',
      'design.meshVertexSchieben',
      'vis.graphLoeschen',
      'vis.nodeLoeschen',
    ]);
  });
});
