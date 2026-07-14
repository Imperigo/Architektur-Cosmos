import { beforeEach, describe, expect, it } from 'vitest';
import { DOCK_KONSTANTEN } from '../src/state/dock-kern';
import { dockbarePanelIds, stationsPanels } from '../src/state/dock-stationen';
import { eingeklappteDiff, neuLadenAusSpeicher, useDockZustand } from '../src/state/dock-zustand';
import { PANEL_IDS } from '../src/state/ui-zustand';

/**
 * v0.7.8 Welle 1 / Paket P2 — Dock-Zustand + Stations-Registry. Persistenz-
 * Store analog zu `ui-zustand.test.ts` (gleiches Vorgehen: `localStorage`
 * leeren, `neuLadenAusSpeicher()`, dann prüfen) + Registry-Invarianten für
 * `dock-stationen.ts` (diese Datei deckt beides ab, weil die Verifikations-
 * Kommandozeile des Auftrags nur `dock-zustand.test.ts`/`dock-kern.test.ts`
 * nennt).
 */

const STORAGE_KEY = 'kosmo.dock.v1';

beforeEach(() => {
  localStorage.clear();
  neuLadenAusSpeicher();
});

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

describe('dock-zustand — Defaults', () => {
  it('startet mit modus A und leeren Layouts', () => {
    const s = useDockZustand.getState();
    expect(s.modus).toBe('A');
    expect(s.layouts).toEqual({});
  });

  it('layoutFuer liefert für eine unbekannte Station die DOCK_KONSTANTEN-Defaults', () => {
    const layout = useDockZustand.getState().layoutFuer('design');
    expect(layout.leftW).toBe(DOCK_KONSTANTEN.DEF_LEFT);
    expect(layout.rightW).toBe(DOCK_KONSTANTEN.DEF_RIGHT);
    expect(layout.panels).toEqual({});
  });
});

// ---------------------------------------------------------------------------
// Persistenz-Roundtrip
// ---------------------------------------------------------------------------

describe('dock-zustand — Persistenz-Roundtrip (kosmo.dock.v1)', () => {
  it('leftW/rightW/panelOverride überleben einen simulierten Neustart', () => {
    useDockZustand.getState().leftWSetzen('design', 280);
    useDockZustand.getState().rightWSetzen('design', 340);
    useDockZustand.getState().panelOverrideSetzen('design', 'rasterOffen', { eingeklappt: true, groesse: 310 });

    neuLadenAusSpeicher();
    const layout = useDockZustand.getState().layoutFuer('design');
    expect(layout.leftW).toBe(280);
    expect(layout.rightW).toBe(340);
    expect(layout.panels['rasterOffen']).toEqual({ eingeklappt: true, groesse: 310 });
  });

  it('modusSetzen überlebt einen simulierten Neustart', () => {
    useDockZustand.getState().modusSetzen('B');
    neuLadenAusSpeicher();
    expect(useDockZustand.getState().modus).toBe('B');
  });

  it('schreibt gültiges, versioniertes JSON unter kosmo.dock.v1', () => {
    useDockZustand.getState().leftWSetzen('design', 250);
    const roh = localStorage.getItem(STORAGE_KEY);
    expect(roh).not.toBeNull();
    const geparst = JSON.parse(roh!);
    expect(geparst.version).toBe(1);
    expect(geparst.modus).toBe('A');
    expect(geparst.layouts['A:design'].leftW).toBe(250);
  });
});

// ---------------------------------------------------------------------------
// Härte gegen kaputten/partiellen Speicher
// ---------------------------------------------------------------------------

describe('dock-zustand — Härte gegen kaputten Speicher', () => {
  it('kaputtes JSON → Basiszustand, kein Crash', () => {
    localStorage.setItem(STORAGE_KEY, '{nicht json');
    neuLadenAusSpeicher();
    const s = useDockZustand.getState();
    expect(s.modus).toBe('A');
    expect(s.layouts).toEqual({});
  });

  it('falsche Version → Basiszustand', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 2, modus: 'B', layouts: {} }));
    neuLadenAusSpeicher();
    expect(useDockZustand.getState().modus).toBe('A');
  });

  it('ungültiger modus-Wert → Basiszustand', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, modus: 'X', layouts: {} }));
    neuLadenAusSpeicher();
    expect(useDockZustand.getState().modus).toBe('A');
  });

  it('partieller Datensatz (nur version, kein modus/layouts) validiert und füllt Defaults', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1 }));
    neuLadenAusSpeicher();
    const s = useDockZustand.getState();
    expect(s.modus).toBe('A');
    expect(s.layouts).toEqual({});
  });

  it('kaputter Panel-Override innerhalb eines sonst gültigen Layouts wird defensiv gefiltert', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: 1,
        modus: 'A',
        layouts: {
          'A:design': {
            leftW: 'nicht-numerisch',
            rightW: 300,
            panels: { rasterOffen: { eingeklappt: 'ja-bitte', groesse: 310, dock: 'nirgendwo' } },
          },
        },
      }),
    );
    neuLadenAusSpeicher();
    const layout = useDockZustand.getState().layoutFuer('design');
    // leftW war kein number → Default; rightW war gültig → übernommen.
    expect(layout.leftW).toBe(DOCK_KONSTANTEN.DEF_LEFT);
    expect(layout.rightW).toBe(300);
    // eingeklappt/dock waren ungültig typisiert/wertig → verworfen, groesse blieb.
    expect(layout.panels['rasterOffen']).toEqual({ groesse: 310 });
  });

  it('fehlender localStorage-Eintrag → Basiszustand', () => {
    neuLadenAusSpeicher();
    const s = useDockZustand.getState();
    expect(s.modus).toBe('A');
    expect(s.layouts).toEqual({});
  });
});

// ---------------------------------------------------------------------------
// Merge Default⊕Override je Key
// ---------------------------------------------------------------------------

describe('dock-zustand — layoutFuer (Merge Default⊕Override)', () => {
  it('ohne gespeichertes Layout: reine Defaults', () => {
    const layout = useDockZustand.getState().layoutFuer('design');
    expect(layout).toEqual({ leftW: DOCK_KONSTANTEN.DEF_LEFT, rightW: DOCK_KONSTANTEN.DEF_RIGHT, panels: {} });
  });

  it('mit nur rightW gesetzt: leftW bleibt Default, rightW übernommen', () => {
    useDockZustand.getState().rightWSetzen('design', 400);
    const layout = useDockZustand.getState().layoutFuer('design');
    expect(layout.leftW).toBe(DOCK_KONSTANTEN.DEF_LEFT);
    expect(layout.rightW).toBe(400);
  });

  it('Panel-Overrides mehrerer Panels bleiben getrennt im gemergten Ergebnis', () => {
    useDockZustand.getState().panelOverrideSetzen('design', 'rasterOffen', { eingeklappt: true });
    useDockZustand.getState().panelOverrideSetzen('design', 'kvOffen', { angeheftet: true });
    const layout = useDockZustand.getState().layoutFuer('design');
    expect(layout.panels['rasterOffen']).toEqual({ eingeklappt: true });
    expect(layout.panels['kvOffen']).toEqual({ angeheftet: true });
  });
});

// ---------------------------------------------------------------------------
// modus-Wechsel trennt die Layout-Keys
// ---------------------------------------------------------------------------

describe('dock-zustand — modus-Wechsel trennt A:design von B:design', () => {
  it('Overrides unter A bleiben unter B unsichtbar und umgekehrt', () => {
    useDockZustand.getState().panelOverrideSetzen('design', 'rasterOffen', { eingeklappt: true });
    expect(useDockZustand.getState().layoutFuer('design').panels['rasterOffen']).toEqual({ eingeklappt: true });

    useDockZustand.getState().modusSetzen('B');
    expect(useDockZustand.getState().layoutFuer('design').panels['rasterOffen']).toBeUndefined();

    useDockZustand.getState().panelOverrideSetzen('design', 'rasterOffen', { eingeklappt: false });
    expect(useDockZustand.getState().layoutFuer('design').panels['rasterOffen']).toEqual({ eingeklappt: false });

    useDockZustand.getState().modusSetzen('A');
    expect(useDockZustand.getState().layoutFuer('design').panels['rasterOffen']).toEqual({ eingeklappt: true });
  });

  it('beide Keys landen getrennt im Speicher-Objekt', () => {
    useDockZustand.getState().leftWSetzen('design', 200);
    useDockZustand.getState().modusSetzen('B');
    useDockZustand.getState().leftWSetzen('design', 300);
    const layouts = useDockZustand.getState().layouts;
    expect(layouts['A:design']?.leftW).toBe(200);
    expect(layouts['B:design']?.leftW).toBe(300);
  });
});

// ---------------------------------------------------------------------------
// leftW/rightW-Klemmung
// ---------------------------------------------------------------------------

describe('dock-zustand — leftW/rightW-Klemmung', () => {
  it('leftWSetzen klemmt unterhalb MIN_LEFT auf MIN_LEFT', () => {
    useDockZustand.getState().leftWSetzen('design', 10);
    expect(useDockZustand.getState().layoutFuer('design').leftW).toBe(DOCK_KONSTANTEN.MIN_LEFT);
  });

  it('leftWSetzen klemmt oberhalb MAX_LEFT auf MAX_LEFT', () => {
    useDockZustand.getState().leftWSetzen('design', 9999);
    expect(useDockZustand.getState().layoutFuer('design').leftW).toBe(DOCK_KONSTANTEN.MAX_LEFT);
  });

  it('rightWSetzen klemmt unterhalb MIN_RIGHT auf MIN_RIGHT', () => {
    useDockZustand.getState().rightWSetzen('design', 10);
    expect(useDockZustand.getState().layoutFuer('design').rightW).toBe(DOCK_KONSTANTEN.MIN_RIGHT);
  });

  it('rightWSetzen klemmt oberhalb MAX_RIGHT auf MAX_RIGHT', () => {
    useDockZustand.getState().rightWSetzen('design', 9999);
    expect(useDockZustand.getState().layoutFuer('design').rightW).toBe(DOCK_KONSTANTEN.MAX_RIGHT);
  });

  it('ein Wert innerhalb des Rahmens bleibt unverändert', () => {
    useDockZustand.getState().leftWSetzen('design', 300);
    expect(useDockZustand.getState().layoutFuer('design').leftW).toBe(300);
  });
});

// ---------------------------------------------------------------------------
// panelOverrideSetzen / panelOverridesSetzen
// ---------------------------------------------------------------------------

describe('dock-zustand — panelOverrideSetzen', () => {
  it('setzt neue Felder', () => {
    useDockZustand.getState().panelOverrideSetzen('design', 'rasterOffen', { eingeklappt: true, groesse: 320 });
    expect(useDockZustand.getState().layoutFuer('design').panels['rasterOffen']).toEqual({ eingeklappt: true, groesse: 320 });
  });

  it('ein Patch-Feld mit undefined LÖSCHT das Feld wirklich (kein `key: undefined` im Objekt)', () => {
    useDockZustand.getState().panelOverrideSetzen('design', 'rasterOffen', { eingeklappt: true, groesse: 320 });
    useDockZustand.getState().panelOverrideSetzen('design', 'rasterOffen', { eingeklappt: undefined });
    const override = useDockZustand.getState().layoutFuer('design').panels['rasterOffen'];
    expect(override).toEqual({ groesse: 320 });
    expect('eingeklappt' in (override ?? {})).toBe(false);
  });

  it('bestehende Felder anderer Panels bleiben beim Patchen eines Panels unberührt', () => {
    useDockZustand.getState().panelOverrideSetzen('design', 'rasterOffen', { eingeklappt: true });
    useDockZustand.getState().panelOverrideSetzen('design', 'kvOffen', { eingeklappt: true });
    useDockZustand.getState().panelOverrideSetzen('design', 'rasterOffen', { eingeklappt: false });
    expect(useDockZustand.getState().layoutFuer('design').panels['kvOffen']).toEqual({ eingeklappt: true });
  });
});

describe('dock-zustand — panelOverridesSetzen (atomar, für row-Splitter)', () => {
  it('aktualisiert zwei Nachbar-Panels in einem Schreibvorgang', () => {
    useDockZustand.getState().panelOverridesSetzen('design', {
      rasterOffen: { groesse: 300 },
      kvOffen: { groesse: 380 },
    });
    const layout = useDockZustand.getState().layoutFuer('design');
    expect(layout.panels['rasterOffen']).toEqual({ groesse: 300 });
    expect(layout.panels['kvOffen']).toEqual({ groesse: 380 });
  });

  it('löscht in derselben atomaren Aktualisierung ebenfalls undefined-Felder', () => {
    useDockZustand.getState().panelOverrideSetzen('design', 'rasterOffen', { eingeklappt: true });
    useDockZustand.getState().panelOverridesSetzen('design', {
      rasterOffen: { eingeklappt: undefined, groesse: 310 },
    });
    expect(useDockZustand.getState().layoutFuer('design').panels['rasterOffen']).toEqual({ groesse: 310 });
  });
});

// ---------------------------------------------------------------------------
// layoutZuruecksetzen
// ---------------------------------------------------------------------------

describe('dock-zustand — layoutZuruecksetzen', () => {
  it('löscht genau den aktiven Schlüssel, andere Stationen/Modi bleiben unberührt', () => {
    useDockZustand.getState().leftWSetzen('design', 300);
    useDockZustand.getState().panelOverrideSetzen('design', 'rasterOffen', { eingeklappt: true });
    useDockZustand.getState().modusSetzen('B');
    useDockZustand.getState().leftWSetzen('design', 250);
    useDockZustand.getState().modusSetzen('A');

    useDockZustand.getState().layoutZuruecksetzen('design');

    expect(useDockZustand.getState().layoutFuer('design')).toEqual({
      leftW: DOCK_KONSTANTEN.DEF_LEFT,
      rightW: DOCK_KONSTANTEN.DEF_RIGHT,
      panels: {},
    });
    // B:design blieb unangetastet.
    useDockZustand.getState().modusSetzen('B');
    expect(useDockZustand.getState().layoutFuer('design').leftW).toBe(250);
  });

  it('ist ein No-Op, wenn für die Station noch nie etwas gespeichert wurde', () => {
    expect(() => useDockZustand.getState().layoutZuruecksetzen('design')).not.toThrow();
    expect(useDockZustand.getState().layouts).toEqual({});
  });
});

// ---------------------------------------------------------------------------
// eingeklappteDiff
// ---------------------------------------------------------------------------

describe('eingeklappteDiff', () => {
  it('meldet ein neu eingeklapptes Panel', () => {
    const ergebnis = eingeklappteDiff(['a'], ['a', 'b']);
    expect(ergebnis.neuEingeklappt).toBe('b');
    expect(ergebnis.wiederOffen).toBeUndefined();
  });

  it('meldet ein wieder geöffnetes Panel', () => {
    const ergebnis = eingeklappteDiff(['a', 'b'], ['a']);
    expect(ergebnis.wiederOffen).toBe('b');
    expect(ergebnis.neuEingeklappt).toBeUndefined();
  });

  it('nimmt das selbst bediente Panel von "neu eingeklappt" aus', () => {
    // Der Mensch klappt "b" selbst zu — das ist keine Auto-Reaktion.
    const ergebnis = eingeklappteDiff(['a'], ['a', 'b'], 'b');
    expect(ergebnis.neuEingeklappt).toBeUndefined();
  });

  it('nimmt das selbst bediente Panel von "wieder offen" aus', () => {
    const ergebnis = eingeklappteDiff(['a', 'b'], ['a'], 'b');
    expect(ergebnis.wiederOffen).toBeUndefined();
  });

  it('liefert ein leeres Ergebnis, wenn sich nichts ändert', () => {
    expect(eingeklappteDiff(['a', 'b'], ['a', 'b'])).toEqual({});
  });

  it('liefert ein leeres Ergebnis bei zwei leeren Listen', () => {
    expect(eingeklappteDiff([], [])).toEqual({});
  });

  it('meldet das ZUERST gefundene bei mehreren neu eingeklappten Panels', () => {
    const ergebnis = eingeklappteDiff(['a'], ['a', 'b', 'c']);
    expect(ergebnis.neuEingeklappt).toBe('b');
  });

  it('meldet neu eingeklappt UND wieder offen gleichzeitig, wenn beides passiert', () => {
    const ergebnis = eingeklappteDiff(['a'], ['b']);
    expect(ergebnis.neuEingeklappt).toBe('b');
    expect(ergebnis.wiederOffen).toBe('a');
  });
});

// ---------------------------------------------------------------------------
// Registry-Invarianten (dock-stationen.ts)
// ---------------------------------------------------------------------------

/** Bekannte `--k-rolle-*`-Schlüssel aus `packages/kosmo-ui/src/aura.css`
 *  (manuell/pn/pna/agent/memory/generator/ak/office) PLUS `system` — der
 *  Alias, den `dock-flaeche.css` für `PanelDef['rolle']`s `'system'`-Wert
 *  anlegt (`--k-rolle-system: var(--k-rolle-office)`, s. Kopfkommentar dort);
 *  `'inspector'` (P4) ist die erste Registry-Zeile, die ihn nutzt. */
const GUELTIGE_ROLLEN = ['manuell', 'pn', 'pna', 'agent', 'memory', 'generator', 'ak', 'system'] as const;

/** Daten-Guard-IDs ohne `…Offen`-Flag in `ui-zustand.ts` (s. `dock-stationen.ts`
 *  Kopfkommentar) — Welle 1: `unternehmerplan`; Welle 2 (P4): `kennzahlen`/
 *  `inspector` kommen hinzu. */
const DATEN_GUARD_IDS = ['unternehmerplan', 'kennzahlen', 'inspector'] as const;

/** v0.7.8 Welle 2 (P5) — die vier gefloateten Viewport-HUDs (Modus-Leiste/
 *  -Karte/-Werkzeug-Rail/-Orientierungskreuz), erweitert v0.7.9 (A1) um die
 *  zwei ehemals fixen Säulen-Blöcke (HUD-Statuskarte + Eigenschaften-Panel,
 *  Anker `top-right` — «die letzte Überlappungs-Klasse», ROADMAP 357/358).
 *  Wie die `DATEN_GUARD_IDS` oben haben sie KEIN `…Offen`-Flag in
 *  `ui-zustand.ts` (Sichtbarkeit kommt aus `viewport-chrome-runtime.ts`s
 *  `bereit`, s. `DesignWorkspace.tsx`) — anders als die Daten-Guards sind
 *  sie aber `dock:'float'` statt `'left'`/`'right'` und NICHT schliessbar
 *  (kein Schliessen-Weg im Ist-Zustand). Eigene Konstante statt Erweiterung
 *  von `DATEN_GUARD_IDS`, weil ein paar Invarianten unten (Wichtigkeits-Band,
 *  `min`/`groesse`, `schliessbar`) für Floats bewusst ANDERS gelten, s.
 *  jeweilige Tests. */
const HUD_FLOAT_IDS = [
  'viewportModusLeiste',
  'viewportModusKarte',
  'viewportWerkzeugRail',
  'viewportOrientierung',
  'viewportHudStatuskarte',
  'viewportEigenschaften',
] as const;

describe('dock-stationen — Registry-Invarianten (design)', () => {
  const panels = stationsPanels('design');

  it('enthält genau 20 Panels (Welle 1: 12 + Welle 2/P4: kennzahlen/inspector + Welle 2/P5: 4 HUD-Floats + v0.7.9/A1: Statuskarte/Eigenschaften)', () => {
    expect(panels.length).toBe(20);
  });

  it('alle IDs sind paarweise eindeutig', () => {
    const ids = panels.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('alle IDs ausser den dokumentierten Daten-Guard-/HUD-Float-Ausnahmen sind ⊆ PANEL_IDS aus ui-zustand.ts', () => {
    const ausnahmen = new Set<string>([...DATEN_GUARD_IDS, ...HUD_FLOAT_IDS]);
    const ohneAusnahme = panels.filter((p) => !ausnahmen.has(p.id)).map((p) => p.id);
    for (const id of ohneAusnahme) {
      expect((PANEL_IDS as readonly string[]).includes(id)).toBe(true);
    }
  });

  it('Daten-Guards + HUD-Floats sind GENAU die IDs ohne Entsprechung in PANEL_IDS (kein …Offen-Flag)', () => {
    const ohneEntsprechung = panels.filter((p) => !(PANEL_IDS as readonly string[]).includes(p.id));
    expect(ohneEntsprechung.map((p) => p.id).sort()).toEqual([...DATEN_GUARD_IDS, ...HUD_FLOAT_IDS].sort());
  });

  it('Wichtigkeiten liegen im Band 38-52, ausser den P4-Sonderfällen kennzahlen (60)/inspector (82) und den HUD-Floats', () => {
    const erwarteteFloatWichtigkeit: Record<string, number> = {
      viewportModusLeiste: 70,
      viewportModusKarte: 50,
      viewportWerkzeugRail: 64,
      viewportOrientierung: 30,
      // v0.7.9 A1: bewusst ÜBER allen P5-Floats — die ehemals fixen Säulen-
      // Blöcke sollen bei `separate()`-Kollisionen ihren Platz behalten
      // (das jeweils UNwichtigere Panel weicht), s. `dock-stationen.ts`.
      viewportHudStatuskarte: 72,
      viewportEigenschaften: 74,
    };
    for (const p of panels) {
      if (p.id === 'kennzahlen') {
        expect(p.wichtigkeit).toBe(60);
      } else if (p.id === 'inspector') {
        expect(p.wichtigkeit).toBe(82);
      } else if ((HUD_FLOAT_IDS as readonly string[]).includes(p.id)) {
        expect(p.wichtigkeit).toBe(erwarteteFloatWichtigkeit[p.id]);
      } else {
        expect(p.wichtigkeit).toBeGreaterThanOrEqual(38);
        expect(p.wichtigkeit).toBeLessThanOrEqual(52);
      }
    }
  });

  it('Wichtigkeiten der Stack-Panels (links/rechts) sind paarweise eindeutig (klare Einklapp-Rangfolge)', () => {
    // Floats ausgeschlossen: `stack()`/`separate()` (dock-kern.ts) vergleichen
    // Wichtigkeit NIE gruppenübergreifend (Stack- vs. Float-Panels) — ein
    // Wert wie `variantenPanelOffen`s 50 darf darum mit einem Float
    // (`viewportModusKarte`, ebenfalls 50) kollidieren, ohne die Solver-
    // Ordnung innerhalb einer Gruppe zu beeinflussen.
    const werte = panels.filter((p) => p.dock !== 'float').map((p) => p.wichtigkeit);
    expect(new Set(werte).size).toBe(werte.length);
  });

  it('Wichtigkeiten der Float-HUDs sind paarweise eindeutig (Überlapp-Priorität in separate())', () => {
    const werte = panels.filter((p) => p.dock === 'float').map((p) => p.wichtigkeit);
    expect(new Set(werte).size).toBe(werte.length);
  });

  it('min <= groesse für jedes Stack-Panel (Floats nutzen fw/fh statt min/groesse)', () => {
    for (const p of panels.filter((x) => x.dock !== 'float')) {
      expect(p.min).toBeDefined();
      expect(p.groesse).toBeDefined();
      expect(p.min!).toBeLessThanOrEqual(p.groesse!);
    }
  });

  it('fw/fh sind definiert und positiv für jedes Float-HUD', () => {
    for (const p of panels.filter((x) => x.dock === 'float')) {
      expect(p.fw).toBeDefined();
      expect(p.fh).toBeDefined();
      expect(p.fw!).toBeGreaterThan(0);
      expect(p.fh!).toBeGreaterThan(0);
      expect(p.anker).toBeDefined();
    }
  });

  it('jede rolle ist ein gültiger --k-rolle-Schlüssel', () => {
    for (const p of panels) {
      expect((GUELTIGE_ROLLEN as readonly string[]).includes(p.rolle)).toBe(true);
    }
  });

  it('alle Stack-Panels sind start:"zu", schliessbar und bewegbar; HUD-Floats sind start:"zu", NICHT schliessbar, aber bewegbar', () => {
    for (const p of panels) {
      expect(p.start).toBe('zu');
      expect(p.bewegbar).toBe(true);
      if ((HUD_FLOAT_IDS as readonly string[]).includes(p.id)) {
        expect(p.schliessbar).toBe(false);
      } else {
        expect(p.schliessbar).toBe(true);
      }
    }
  });

  it('dockbarePanelIds(design) liefert dieselben IDs wie stationsPanels(design)', () => {
    expect(dockbarePanelIds('design')).toEqual(panels.map((p) => p.id));
  });

  it('"left"/"right"/"float" sind die einzigen dock-Zonen — GENAU die HUD-IDs sind "float"', () => {
    for (const p of panels) {
      expect(['left', 'right', 'float']).toContain(p.dock);
    }
    const floatIds = panels.filter((p) => p.dock === 'float').map((p) => p.id);
    expect(floatIds.sort()).toEqual([...HUD_FLOAT_IDS].sort());
  });
});

describe('dock-stationen — plan bleibt ein endgültig leeres Array (Scope-Entscheid P6, kein Welle-3-TODO mehr)', () => {
  it('plan liefert ein leeres Array', () => {
    expect(stationsPanels('plan')).toEqual([]);
    expect(dockbarePanelIds('plan')).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// v0.7.8 Welle 3 (P6) — vis-Registry. Anders als bei `design` gilt HIER
// KEINE ⊆-`PANEL_IDS`-Invariante: alle vier Panels sind Daten-Guards/lokale
// Toggle-Booleans, die NIE in `ui-zustand.ts` (einer DESIGN-spezifischen
// Datei) standen — s. `dock-stationen.ts`-Kopfkommentar zu `VIS_PANELS`.
// ---------------------------------------------------------------------------

describe('dock-stationen — Registry-Invarianten (vis)', () => {
  const panels = stationsPanels('vis');

  it('enthält genau 4 Panels', () => {
    expect(panels.length).toBe(4);
  });

  it('alle IDs sind paarweise eindeutig', () => {
    const ids = panels.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('genau ein Panel ist dock:"left" (visPalette), die übrigen drei sind dock:"float"', () => {
    const left = panels.filter((p) => p.dock === 'left');
    const float = panels.filter((p) => p.dock === 'float');
    expect(left.map((p) => p.id)).toEqual(['visPalette']);
    expect(float.map((p) => p.id).sort()).toEqual(['visAusrichten', 'visLegende', 'visMinimap']);
  });

  it('visPalette trägt min/groesse (Stack-Panel), keine Float-Geometrie', () => {
    const p = panels.find((x) => x.id === 'visPalette')!;
    expect(p.min).toBe(200);
    expect(p.groesse).toBe(360);
    expect(p.fw).toBeUndefined();
    expect(p.fh).toBeUndefined();
  });

  it('fw/fh sind definiert und positiv für jedes Float-Panel', () => {
    for (const p of panels.filter((x) => x.dock === 'float')) {
      expect(p.fw).toBeDefined();
      expect(p.fh).toBeDefined();
      expect(p.fw!).toBeGreaterThan(0);
      expect(p.fh!).toBeGreaterThan(0);
      expect(p.anker).toBeDefined();
    }
  });

  it('visLegende steht vor visMinimap in der Registry (Stapelreihenfolge bottom-left, s. Kopfkommentar)', () => {
    const ids = panels.map((p) => p.id);
    expect(ids.indexOf('visLegende')).toBeLessThan(ids.indexOf('visMinimap'));
  });

  it('keines der vier IDs steht in PANEL_IDS (alle vier sind Daten-Guards/gehobene lokale Toggles, keine ui-zustand-Flags)', () => {
    for (const p of panels) {
      expect((PANEL_IDS as readonly string[]).includes(p.id)).toBe(false);
    }
  });

  it('jede rolle ist ein gültiger --k-rolle-Schlüssel', () => {
    for (const p of panels) {
      expect((GUELTIGE_ROLLEN as readonly string[]).includes(p.rolle)).toBe(true);
    }
  });

  it('alle vier sind start:"zu" und bewegbar; nur visPalette ist schliessbar (Toggle-Button steuert sie)', () => {
    for (const p of panels) {
      expect(p.start).toBe('zu');
      expect(p.bewegbar).toBe(true);
      expect(p.schliessbar).toBe(p.id === 'visPalette');
    }
  });

  it('dockbarePanelIds(vis) liefert dieselben IDs wie stationsPanels(vis)', () => {
    expect(dockbarePanelIds('vis')).toEqual(panels.map((p) => p.id));
  });
});
