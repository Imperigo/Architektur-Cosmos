import { beforeEach, describe, expect, it } from 'vitest';
import { presetAnwenden, wendeErststartPresetFallsNoetigAn } from '../src/state/dock-preset-anwendung';
import { neuLadenAusSpeicher, useDockZustand } from '../src/state/dock-zustand';
import { neuLadenAusSpeicher as neuLadenUiAusSpeicher, useUiZustand } from '../src/state/ui-zustand';
import { useVisRuntime } from '../src/modules/vis/vis-runtime';
import { offenFaehigeIds } from '../src/state/dock-presets';

/**
 * v0.8.0 / Paket PD2 (Default-Oberflächen) — `state/dock-preset-anwendung.ts`:
 *   1. `presetAnwenden()` — die EINE geteilte Anwend-Funktion (WIE + OB in
 *      einem Aufruf), für beide Stationen.
 *   2. `wendeErststartPresetFallsNoetigAn()` — Erststart-Erkennung +
 *      Bestandsschutz (Abschnitt 7.2 der Spez, hartes Abnahmekriterium:
 *      Bestandsnutzer erleben KEINE Layout-Änderung).
 */

const ERSTSTART_MARKER_KEY = 'kosmo.dock.presetInit.v1';
const DOCK_STORAGE_KEY = 'kosmo.dock.v1';

beforeEach(() => {
  localStorage.clear();
  neuLadenAusSpeicher();
  neuLadenUiAusSpeicher();
  useVisRuntime.setState({ paletteOffen: false });
});

describe('presetAnwenden — Design-Station', () => {
  it('setzt die WIE-Overrides (dock-zustand) UND die OB-Booleans (ui-zustand) gemäss presetOffenMap', () => {
    // Ausgangslage: irgendein Panel manuell offen, das im Ziel-Preset zu sein soll.
    useUiZustand.getState().setzePanel('kvOffen', true);
    presetAnwenden('design', 'pruefen');

    // WIE: kennzahlen-Override aus dem Preset.
    expect(useDockZustand.getState().layoutFuer('design').panels['kennzahlen']).toEqual({ groesse: 480, angeheftet: true });
    // OB: drawOffen (im Preset gelistet) → true, alle anderen offen-fähigen IDs → false.
    const ui = useUiZustand.getState();
    expect(ui.drawOffen).toBe(true);
    expect(ui.kvOffen).toBe(false);
    for (const id of offenFaehigeIds('design')) {
      if (id === 'drawOffen') continue;
      expect(ui[id as keyof typeof ui]).toBe(false);
    }
  });

  it('merkt sich das aktive Preset im dock-zustand-Store', () => {
    presetAnwenden('design', 'fokus');
    expect(useDockZustand.getState().aktivesPreset['design']).toBe('fokus');
  });
});

describe('presetAnwenden — Vis-Station (einziger echter Hebel: visPalette)', () => {
  it('"arbeiten" öffnet visPalette (vis-runtime.ts), "fokus" schliesst sie wieder', () => {
    presetAnwenden('vis', 'arbeiten');
    expect(useVisRuntime.getState().paletteOffen).toBe(true);

    presetAnwenden('vis', 'fokus');
    expect(useVisRuntime.getState().paletteOffen).toBe(false);
  });

  it('"pruefen" setzt den Legende-Geometrie-Override, visPalette bleibt zu', () => {
    useVisRuntime.getState().paletteOffenSetzen(true);
    presetAnwenden('vis', 'pruefen');
    expect(useVisRuntime.getState().paletteOffen).toBe(false);
    expect(useDockZustand.getState().layoutFuer('vis').panels['visLegende']).toEqual({ fw: 130, fh: 170 });
  });
});

describe('wendeErststartPresetFallsNoetigAn — Erststart-Erkennung + Bestandsschutz', () => {
  it('echter Erststart (kein Marker, kein kosmo.dock.v1): wendet Fokus auf BEIDE Stationen an, setzt den Marker', () => {
    expect(localStorage.getItem(DOCK_STORAGE_KEY)).toBeNull();
    expect(localStorage.getItem(ERSTSTART_MARKER_KEY)).toBeNull();

    wendeErststartPresetFallsNoetigAn();

    expect(useDockZustand.getState().aktivesPreset['design']).toBe('fokus');
    expect(useDockZustand.getState().aktivesPreset['vis']).toBe('fokus');
    expect(localStorage.getItem(ERSTSTART_MARKER_KEY)).toBe('1');
    expect(localStorage.getItem(DOCK_STORAGE_KEY)).not.toBeNull();
  });

  it('Bestandsschutz: vorhandenes kosmo.dock.v1 → KEINE Preset-Anwendung, Marker wird trotzdem gesetzt', () => {
    const bestandsLayout = {
      version: 1,
      modus: 'A',
      layouts: { 'A:design': { leftW: 333, panels: { kvOffen: { angeheftet: true } } } },
    };
    localStorage.setItem(DOCK_STORAGE_KEY, JSON.stringify(bestandsLayout));
    neuLadenAusSpeicher();

    wendeErststartPresetFallsNoetigAn();

    // Kein Preset wurde je aktiv — der Bestand blieb unangetastet.
    expect(useDockZustand.getState().aktivesPreset['design']).toBeUndefined();
    expect(useDockZustand.getState().aktivesPreset['vis']).toBeUndefined();
    expect(useDockZustand.getState().layoutFuer('design').leftW).toBe(333);
    expect(useDockZustand.getState().layoutFuer('design').panels['kvOffen']).toEqual({ angeheftet: true });
    // Marker trotzdem gesetzt (verhindert künftige Re-Prüfung).
    expect(localStorage.getItem(ERSTSTART_MARKER_KEY)).toBe('1');

    // Die roh gespeicherten Bestandsdaten selbst wurden nicht überschrieben
    // (ausser um den aktivesPreset-Schlüssel, der defensiv leer bleibt).
    const gespeichert = JSON.parse(localStorage.getItem(DOCK_STORAGE_KEY)!) as { layouts: Record<string, unknown> };
    expect(gespeichert.layouts['A:design']).toEqual({ leftW: 333, panels: { kvOffen: { angeheftet: true } } });
  });

  it('Marker bereits gesetzt: KEINE erneute Prüfung/Anwendung, selbst wenn kosmo.dock.v1 fehlt', () => {
    localStorage.setItem(ERSTSTART_MARKER_KEY, '1');

    wendeErststartPresetFallsNoetigAn();

    expect(useDockZustand.getState().aktivesPreset['design']).toBeUndefined();
    expect(localStorage.getItem(DOCK_STORAGE_KEY)).toBeNull();
  });

  it('ist idempotent: ein zweiter Aufruf nach erfolgreicher Erststart-Anwendung ändert nichts mehr', () => {
    wendeErststartPresetFallsNoetigAn();
    // Mensch weicht danach manuell von der Fokus-Kuration ab:
    useDockZustand.getState().panelOverrideSetzen('design', 'kennzahlen', { eingeklappt: false, groesse: 999 });
    wendeErststartPresetFallsNoetigAn();
    // Zweiter Aufruf griff nicht erneut ein — die manuelle Abweichung blieb bestehen.
    expect(useDockZustand.getState().layoutFuer('design').panels['kennzahlen']).toEqual({ eingeklappt: false, groesse: 999 });
  });
});
