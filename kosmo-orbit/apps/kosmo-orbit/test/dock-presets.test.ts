import { beforeEach, describe, expect, it } from 'vitest';
import { DOCK_KONSTANTEN } from '../src/state/dock-kern';
import {
  allePresets,
  offenFaehigeIds,
  presetFuer,
  presetOffenMap,
  presetOverrides,
  PRESET_IDS,
  type PresetId,
  type PresetStation,
} from '../src/state/dock-presets';
import { dockbarePanelIds } from '../src/state/dock-stationen';
import { neuLadenAusSpeicher, useDockZustand } from '../src/state/dock-zustand';

/**
 * v0.8.0 / Paket PD1 — Dock-Presets (kuratierte Layout-Varianten je Station)
 * + die additive `dock-zustand.ts`-Erweiterung (`aktivesPreset`/
 * `presetSetzen`/`layoutZuruecksetzen`-Änderung). Drei Blöcke:
 *   1. Registry-Validität der drei Presets je Station (`dock-presets.ts`
 *      allein, kein Store).
 *   2. Owner-Kuratierung als harte Asserts («aufgeräumt statt alles offen»).
 *   3. `dock-zustand.ts`: `presetSetzen`/`layoutZuruecksetzen`/Persistenz/
 *      Rückwärtskompatibilität.
 */

const STORAGE_KEY = 'kosmo.dock.v1';
const STATIONEN: readonly PresetStation[] = ['design', 'vis', 'publish'];

beforeEach(() => {
  localStorage.clear();
  neuLadenAusSpeicher();
});

// ---------------------------------------------------------------------------
// 1. Registry-Validität
// ---------------------------------------------------------------------------

describe('dock-presets — Registry-Validität', () => {
  it('jede Station bietet genau die drei PRESET_IDS, in dieser Reihenfolge', () => {
    expect(PRESET_IDS).toEqual(['fokus', 'arbeiten', 'pruefen']);
    for (const station of STATIONEN) {
      expect(allePresets(station).map((p) => p.id)).toEqual(['fokus', 'arbeiten', 'pruefen']);
    }
  });

  it('presetFuer(station, id).id/.station stimmen mit den Aufruf-Argumenten überein', () => {
    for (const station of STATIONEN) {
      for (const id of PRESET_IDS) {
        const preset = presetFuer(station, id);
        expect(preset.id).toBe(id);
        expect(preset.station).toBe(station);
      }
    }
  });

  it('preset.offen ist ⊆ dockbarePanelIds(station) — gegen die echte Registry aus dock-stationen.ts geprüft', () => {
    for (const station of STATIONEN) {
      const gueltig = new Set(dockbarePanelIds(station));
      for (const preset of allePresets(station)) {
        for (const id of preset.offen) {
          expect(gueltig.has(id)).toBe(true);
        }
      }
    }
  });

  it('preset.offen ist sogar ⊆ offenFaehigeIds(station) — nur Panels mit echtem Umschalt-Weg', () => {
    for (const station of STATIONEN) {
      const faehig = new Set(offenFaehigeIds(station));
      for (const preset of allePresets(station)) {
        for (const id of preset.offen) {
          expect(faehig.has(id)).toBe(true);
        }
      }
    }
  });

  it('preset.overrides-Schlüssel sind ⊆ dockbarePanelIds(station)', () => {
    for (const station of STATIONEN) {
      const gueltig = new Set(dockbarePanelIds(station));
      for (const preset of allePresets(station)) {
        for (const id of Object.keys(preset.overrides)) {
          expect(gueltig.has(id)).toBe(true);
        }
      }
    }
  });

  it('kein preset.overrides-Eintrag setzt jemals "geschlossen" (wird von DockFlaeche.tsx ignoriert, s. Kopfkommentar)', () => {
    for (const station of STATIONEN) {
      for (const preset of allePresets(station)) {
        for (const override of Object.values(preset.overrides)) {
          expect('geschlossen' in override).toBe(false);
        }
      }
    }
  });

  it('presetOverrides(station, id) ist ein reiner Alias auf presetFuer(...).overrides', () => {
    for (const station of STATIONEN) {
      for (const id of PRESET_IDS) {
        expect(presetOverrides(station, id)).toEqual(presetFuer(station, id).overrides);
      }
    }
  });

  it('presetOffenMap(station, id) deckt genau offenFaehigeIds(station) als Schlüssel ab', () => {
    for (const station of STATIONEN) {
      const faehig = offenFaehigeIds(station);
      for (const id of PRESET_IDS) {
        const map = presetOffenMap(station, id);
        expect([...map.keys()].sort()).toEqual([...faehig].sort());
      }
    }
  });

  it('presetOffenMap markiert genau die in preset.offen gelisteten IDs als true', () => {
    for (const station of STATIONEN) {
      for (const id of PRESET_IDS) {
        const preset = presetFuer(station, id);
        const map = presetOffenMap(station, id);
        for (const [panelId, offen] of map) {
          expect(offen).toBe(preset.offen.includes(panelId));
        }
      }
    }
  });

  it('design: genau elf Panel-IDs sind offen-fähig (die echten …Offen-Booleans aus ui-zustand.ts)', () => {
    expect(offenFaehigeIds('design').length).toBe(11);
  });

  it('vis: genau ein Panel ist offen-fähig (visPalette — der einzige echte Toggle, s. Kopfkommentar)', () => {
    expect(offenFaehigeIds('vis')).toEqual(['visPalette']);
  });

  it('publish: genau drei Panel-IDs sind offen-fähig (dossier + plankopf + autopack, alle drei echte Werkzeugleisten-Toggles)', () => {
    // v0.8.1 P12 (Auto-Pack-Layout-Editor, docs/V081-SPEZ.md §7(b)/C-26):
    // `autopack` additiv nachgezogen, s. `dock-stationen.ts`s `PUBLISH_PANELS`-
    // Kopfkommentar zum neuen dritten Eintrag.
    expect(offenFaehigeIds('publish')).toEqual(['dossier', 'plankopf', 'autopack']);
  });
});

// ---------------------------------------------------------------------------
// 2. Owner-Kuratierung als harte Asserts («aufgeräumt statt alles offen»)
// ---------------------------------------------------------------------------

describe('dock-presets — design/fokus ist die aufgeräumteste Kuration (Owner-Ziel)', () => {
  const preset = presetFuer('design', 'fokus');

  it('offen-Liste ist leer — KEIN Werkzeug-Panel offen', () => {
    expect(preset.offen).toEqual([]);
  });

  it('kennzahlen ist eingeklappt (override eingeklappt:true) — sichtbar bleibt sie als Daten-Guard', () => {
    expect(preset.overrides['kennzahlen']).toEqual({ eingeklappt: true });
  });

  it('keine anderen Panel-Overrides — die HUD-Floats/inspector bleiben unangetastet', () => {
    expect(Object.keys(preset.overrides)).toEqual(['kennzahlen']);
  });
});

describe('dock-presets — design/arbeiten ist der ruhige Standard mit 1-2 offenen Werkzeug-Panels (P9-Abnahmefund)', () => {
  const preset = presetFuer('design', 'arbeiten');

  it('genau zwei Panels offen: Berechnungsliste + Modellbaum/Mengen/Ausmass (Spez §7.1: «1-2 sinnvoll ausgewählte Panels»)', () => {
    expect(preset.offen).toEqual(['listeOffen', 'drawOffen']);
  });

  it('keine Overrides — kennzahlen bleibt normal (nicht eingeklappt)', () => {
    expect(preset.overrides).toEqual({});
  });
});

describe('dock-presets — design/pruefen ist auf Kontrolle ausgelegt', () => {
  const preset = presetFuer('design', 'pruefen');

  it('drawOffen (Modellbaum · Mengen · Ausmass) ist offen, sonst nichts', () => {
    expect(preset.offen).toEqual(['drawOffen']);
  });

  it('kennzahlen ist gross (groesse 480, über dem Registry-Wert 380) und angeheftet', () => {
    expect(preset.overrides['kennzahlen']).toEqual({ groesse: 480, angeheftet: true });
  });
});

describe('dock-presets — vis-Station (ehrliche Grenze: nur visPalette ist ein echter Hebel)', () => {
  it('vis/fokus: visPalette nicht in offen (zu) — Minimap/Legende/Ausrichten bleiben datengetrieben', () => {
    expect(presetFuer('vis', 'fokus').offen).toEqual([]);
  });

  it('vis/arbeiten: visPalette ist offen', () => {
    expect(presetFuer('vis', 'arbeiten').offen).toEqual(['visPalette']);
  });

  it('vis/pruefen: visPalette zu, Legende via echtem fw/fh-Hebel vergrössert', () => {
    const preset = presetFuer('vis', 'pruefen');
    expect(preset.offen).toEqual([]);
    expect(preset.overrides['visLegende']).toEqual({ fw: 130, fh: 170 });
  });
});

describe('dock-presets — publish-Station (v0.8.0 P11, beide Panels sind echte Hebel)', () => {
  it('publish/fokus: nur die Blattfläche — dossier UND plankopf zu', () => {
    const preset = presetFuer('publish', 'fokus');
    expect(preset.offen).toEqual([]);
    expect(preset.overrides).toEqual({});
  });

  it('publish/arbeiten: plankopf + autopack offen (Zusammenstell-Werkzeuge, häufigster Begleiter beim Blatt-Zusammenstellen), dossier zu', () => {
    // v0.8.2 / P7a (B4, ROADMAP 1416/1441): `autopack` additiv nachgezogen —
    // beides Produktions-/Zusammenstell-Werkzeuge (s. dock-presets.ts-
    // Kopfkommentar zu PUBLISH_ARBEITEN), `dossier` (Kontrolle) bleibt zu.
    const preset = presetFuer('publish', 'arbeiten');
    expect(preset.offen).toEqual(['plankopf', 'autopack']);
    expect(preset.overrides).toEqual({});
  });

  it('publish/pruefen: dossier offen und angeheftet, plankopf zu', () => {
    const preset = presetFuer('publish', 'pruefen');
    expect(preset.offen).toEqual(['dossier']);
    expect(preset.overrides['dossier']).toEqual({ angeheftet: true });
  });
});

// ---------------------------------------------------------------------------
// 3. dock-zustand.ts — presetSetzen / layoutZuruecksetzen / Persistenz
// ---------------------------------------------------------------------------

describe('dock-zustand — presetSetzen (PD1)', () => {
  it('wendet die overrides des Presets über layoutFuer an', () => {
    useDockZustand.getState().presetSetzen('design', 'pruefen');
    const layout = useDockZustand.getState().layoutFuer('design');
    expect(layout.panels['kennzahlen']).toEqual({ groesse: 480, angeheftet: true });
  });

  it('merkt sich die id als aktivesPreset der Station', () => {
    useDockZustand.getState().presetSetzen('design', 'pruefen');
    expect(useDockZustand.getState().aktivesPreset['design']).toBe('pruefen');
  });

  it('lässt andere Stationen/Presets unberührt', () => {
    useDockZustand.getState().presetSetzen('design', 'fokus');
    expect(useDockZustand.getState().aktivesPreset['vis']).toBeUndefined();
  });

  it('funktioniert genauso für die publish-Station (v0.8.0 P11)', () => {
    useDockZustand.getState().presetSetzen('publish', 'pruefen');
    const layout = useDockZustand.getState().layoutFuer('publish');
    expect(layout.panels['dossier']).toEqual({ angeheftet: true });
    expect(useDockZustand.getState().aktivesPreset['publish']).toBe('pruefen');
  });

  it('überschreibt vorherige manuelle Overrides vollständig (kein Preset⊕Reste)', () => {
    useDockZustand.getState().panelOverrideSetzen('design', 'rasterOffen', { eingeklappt: true, groesse: 999 });
    useDockZustand.getState().presetSetzen('design', 'arbeiten'); // arbeiten hat leere overrides
    const layout = useDockZustand.getState().layoutFuer('design');
    expect(layout.panels['rasterOffen']).toBeUndefined();
  });

  it('persistiert unter kosmo.dock.v1 (Overrides + aktivesPreset überleben einen simulierten Neustart)', () => {
    useDockZustand.getState().presetSetzen('design', 'pruefen');
    neuLadenAusSpeicher();
    expect(useDockZustand.getState().aktivesPreset['design']).toBe('pruefen');
    expect(useDockZustand.getState().layoutFuer('design').panels['kennzahlen']).toEqual({ groesse: 480, angeheftet: true });
  });

  it('setzt leftW/rightW, falls das Preset welche mitbringt (aktuell hat keines eines — Regressionsschutz für künftige Presets)', () => {
    useDockZustand.getState().presetSetzen('vis', 'arbeiten');
    const layout = useDockZustand.getState().layoutFuer('vis');
    // vis/arbeiten setzt heute kein leftW/rightW → Default bleibt.
    expect(layout.leftW).toBe(DOCK_KONSTANTEN.DEF_LEFT);
    expect(layout.rightW).toBe(DOCK_KONSTANTEN.DEF_RIGHT);
  });
});

describe('dock-zustand — layoutZuruecksetzen mit/ohne aktives Preset (PD1)', () => {
  it('ohne aktives Preset: unverändertes Verhalten — leeres Layout', () => {
    useDockZustand.getState().leftWSetzen('design', 300);
    useDockZustand.getState().layoutZuruecksetzen('design');
    expect(useDockZustand.getState().layoutFuer('design')).toEqual({
      leftW: DOCK_KONSTANTEN.DEF_LEFT,
      rightW: DOCK_KONSTANTEN.DEF_RIGHT,
      panels: {},
    });
  });

  it('mit aktivem Preset: setzt auf dessen Kuration zurück statt auf leer', () => {
    useDockZustand.getState().presetSetzen('design', 'pruefen');
    // Manuelle Abweichung von der Kuration:
    useDockZustand.getState().panelOverrideSetzen('design', 'kennzahlen', { groesse: 250 });
    expect(useDockZustand.getState().layoutFuer('design').panels['kennzahlen']).toEqual({ groesse: 250, angeheftet: true });

    useDockZustand.getState().layoutZuruecksetzen('design');

    expect(useDockZustand.getState().layoutFuer('design').panels['kennzahlen']).toEqual({ groesse: 480, angeheftet: true });
  });

  it('layoutZuruecksetzen mit aktivem Preset lässt aktivesPreset selbst unverändert', () => {
    useDockZustand.getState().presetSetzen('design', 'fokus');
    useDockZustand.getState().layoutZuruecksetzen('design');
    expect(useDockZustand.getState().aktivesPreset['design']).toBe('fokus');
  });

  it('"plan" hat nie ein aktives Preset — layoutZuruecksetzen bleibt dort exakt das Alt-Verhalten', () => {
    useDockZustand.getState().leftWSetzen('plan', 300);
    expect(() => useDockZustand.getState().layoutZuruecksetzen('plan')).not.toThrow();
    expect(useDockZustand.getState().layoutFuer('plan').leftW).toBe(DOCK_KONSTANTEN.DEF_LEFT);
  });
});

describe('dock-zustand — Rückwärtskompatibilität (aktivesPreset in altem/kaputtem Speicher)', () => {
  it('alter Speicherstand ganz ohne "aktivesPreset"-Feld lädt sauber (aktivesPreset wird {})', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, modus: 'A', layouts: {} }));
    neuLadenAusSpeicher();
    expect(useDockZustand.getState().aktivesPreset).toEqual({});
  });

  it('"aktivesPreset" mit unbekannter Station/Preset-ID wird defensiv gefiltert, kein Crash', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: 1,
        modus: 'A',
        layouts: {},
        aktivesPreset: { design: 'pruefen', quatsch: 'fokus', vis: 'nicht-existent' },
      }),
    );
    neuLadenAusSpeicher();
    expect(useDockZustand.getState().aktivesPreset).toEqual({ design: 'pruefen' });
  });

  it('"aktivesPreset" mit falschem Typ (kein Objekt) fällt auf {} zurück', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, modus: 'A', layouts: {}, aktivesPreset: 'fokus' }));
    neuLadenAusSpeicher();
    expect(useDockZustand.getState().aktivesPreset).toEqual({});
  });

  it('schreibt aktivesPreset korrekt versioniert in kosmo.dock.v1', () => {
    useDockZustand.getState().presetSetzen('vis', 'arbeiten');
    const roh = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
    expect(roh.version).toBe(1);
    expect(roh.aktivesPreset).toEqual({ vis: 'arbeiten' });
  });

  it('bestehende dock-zustand-Funktionalität (leftW/rightW-Klemmung) bleibt unverändert nutzbar, wenn kein Preset aktiv ist', () => {
    useDockZustand.getState().leftWSetzen('design', 9999);
    expect(useDockZustand.getState().layoutFuer('design').leftW).toBe(DOCK_KONSTANTEN.MAX_LEFT);
  });
});

// Nur zur Kompilierzeit genutzt (Typ-Regressionsschutz: PresetId muss exakt
// die drei bekannten Werte bleiben) — kein Laufzeit-Effekt.
function _typRegression(id: PresetId): PresetId {
  return id;
}
void _typRegression;
