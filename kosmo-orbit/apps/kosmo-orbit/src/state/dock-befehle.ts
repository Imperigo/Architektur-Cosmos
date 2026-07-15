import { z } from 'zod';
import { registriereUiBefehl, UiBefehlError, fuehreUiBefehlAus } from './ui-befehle';
import { aktiveDockStation } from './dock-aktive-station';
import { dockbarePanelIds, stationsPanels, type DockStation } from './dock-stationen';
import { useDockZustand, type PanelOverridePatch } from './dock-zustand';
import type { DockModus, DockZone, FloatAnker, PanelDef, PanelOverride } from './dock-kern';
import { useDockOrbRuntime } from './dock-orb-runtime';
import { presetAnwenden } from './dock-preset-anwendung';
import { presetFuer, PRESET_IDS, type PresetId, type PresetStation } from './dock-presets';

/**
 * `ui.dock*`-Command-Namensraum (v0.7.8 Welle 3 / Paket P7 — «Kosmo ordnet»)
 * — Kosmo steuert das neue Dock (`shell/dock/DockFlaeche.tsx`, `state/
 * dock-zustand.ts`) über dieselbe eingefrorene `ui.*`-Registry wie die
 * bestehenden sieben Befehle (`ui-befehle.ts`, NICHT verändert — dieselbe
 * Registrierungsfunktion `registriereUiBefehl`/derselbe Ausführungsweg
 * `fuehreUiBefehlAus`). Flüchtig wie dort: kein Doc-Patch, kein Undo — jeder
 * Befehl mutiert direkt `useDockZustand` (analog zu `ui.panelSetzen` und
 * `useUiZustand`).
 *
 * v0.7.8 Abnahme-Fix (Matrix-Muss, Entscheids-Dokumentation) — der
 * Undo-Entscheid EXPLIZIT: Dock-Layout ist Laufzeit-UI-Zustand, kein
 * Doc/Yjs/Undo-Bestand — exakt dieselbe Grenze, die die v0.6.6-`ui.*`-Brücke
 * (`ui-befehle.ts`, oben) schon vorlebt: Werkzeug/Ansicht/Panel-Sichtbarkeit
 * gehen nie durch `runCommand`, weil sie nichts am `KosmoDoc` ändern. Die
 * Spec-Formulierung «Command→Patch→Undo» gilt für DOC-SCHREIBER (die
 * `design.*`/`draw.*`-Commands, die echte `AnyPatch[]` zurückgeben) — die
 * `ui.dock*`-Befehle hier sind bewusst KEINE davon; sie laufen als
 * quittierte ReadTools-artige Aktionen (Chat-Zeile ja, Undo-Gruppe nein),
 * genau wie jeder andere `ui.*`-Befehl. Ein Redock/Einklappen landet darum
 * nie im Undo-Stack — das ist kein Versehen, sondern dieselbe bewusste
 * Trennung wie bei Werkzeugwechsel/Panel-Toggle.
 *
 * **Aktive Station**: `dockbarePanelIds()` gibt es je Station (`design`/
 * `plan`/`vis`, `dock-stationen.ts`) — welche Station gerade sichtbar ist,
 * bestimmt der Screen (`App.tsx`), nicht dieser Namensraum. Analog zu `ui.
 * geschossSetzen`s `useProject.getState()` (App-Zustand statt Doc) lesen alle
 * Befehle hier `aktiveDockStation()` (`state/dock-aktive-station.ts`) — ein
 * winziger Store, den `DockFlaeche.tsx` bei jedem Mount/Wechsel füttert (s.
 * dortigen Kopfkommentar). Keine aktive Station (Dock noch nie gemountet)
 * ⇒ ehrlicher `UiBefehlError` statt eines stillen No-ops.
 *
 * **Sichtbare Kosmo-Steuerung**: nach jeder erfolgreichen Mutation meldet der
 * Befehl das betroffene Panel an `useDockOrbRuntime` (`meldeAktion`) — das
 * lässt den goldenen Orb (`shell/dock/KosmoOrdnetOrb.tsx`) zur Kopfleiste
 * dieses Panels wandern und zeigt dort die «KOSMO»-Badge (`DockPanel.tsx`).
 * `ui.dockZuruecksetzen` ist die dokumentierte Ausnahme: ein Voll-Reset trifft
 * ALLE Panels der Station gleichzeitig, ein einzelnes Orb-Ziel wäre hier
 * irreführend (der Orb bliebe zufällig auf einem Panel stehen, das gar nicht
 * das eigentliche Ziel der Aktion ist) — dieser Befehl meldet darum bewusst
 * NICHTS an den Orb-Store (die Chat-Quittung bleibt trotzdem, s.
 * `kosmo-ui-werkzeuge.ts`). `ui.dockLayoutLesen` ist rein lesend (Muster `ui.
 * zustandLesen`): weder Orb-Meldung noch Chat-Zeile.
 */

// ---------------------------------------------------------------------------
// Aktive-Station-/Panel-Auflösung — gemeinsame Fehlermeldungen für alle
// Befehle unten (ehrlich benannt: welche Station lief, welche Panel-IDs
// wirklich existieren).
// ---------------------------------------------------------------------------

function holeAktiveStation(befehlId: string): DockStation {
  const station = aktiveDockStation();
  if (!station) {
    throw new UiBefehlError(
      `${befehlId}: keine Dock-Station aktiv — zuerst KosmoDesign oder KosmoVis öffnen.`,
      befehlId,
    );
  }
  return station;
}

function holePanelDef(befehlId: string, station: DockStation, panelId: string): PanelDef {
  const def = stationsPanels(station).find((p) => p.id === panelId);
  if (!def) {
    throw new UiBefehlError(
      `${befehlId}: Panel «${panelId}» gibt es nicht in der aktiven Station «${station}» — vorhanden: ${
        dockbarePanelIds(station).join(', ') || '(keine Panels)'
      }`,
      befehlId,
    );
  }
  return def;
}

/** Effektives `dock` eines Panels — persistierter Override gewinnt über die
 *  Registry (identisch zur `mischePanel`-Regel in `dock-kern.ts`). */
function effektivesDock(station: DockStation, panelId: string, def: PanelDef): DockZone {
  const layout = useDockZustand.getState().layoutFuer(station);
  return layout.panels[panelId]?.dock ?? def.dock;
}

// ---------------------------------------------------------------------------
// Gemeinsame Rückgabeform — trägt IMMER den echten Panel-Titel (Muster `ui.
// geschossSetzen`s `UiGeschossResultat`: `beschreibeAktion` liest den Titel
// aus dem ERGEBNIS, nie aus rohen Params, die z.B. bei einem LLM-Tippfehler
// abweichen könnten).
// ---------------------------------------------------------------------------

export interface UiDockErgebnis {
  station: DockStation;
  panelId: string;
  titel: string;
}

const DOCK_ZIEL_TUPLE = ['left', 'right', 'float'] as const;
const ANKER_TUPLE = ['top', 'bottom-center', 'bottom-left'] as const;

/** Die drei Ziele von `ui.dockSetzen` — eine ECHTE Teilmenge von `DockZone`
 *  (die selbst noch `'rail'` kennt, ein internes Solver-Detail ohne
 *  `ui.dockSetzen`-Ziel). Eigener Alias, damit `kosmo-ui-werkzeuge.ts`s
 *  Label-Record ohne einen toten `'rail'`-Fall auskommt. */
type DockSetzenZiel = (typeof DOCK_ZIEL_TUPLE)[number];

// ---------------------------------------------------------------------------
// ui.dockSetzen
// ---------------------------------------------------------------------------

export interface UiDockSetzenErgebnis extends UiDockErgebnis {
  dock: DockSetzenZiel;
}

export const uiDockSetzen = registriereUiBefehl({
  id: 'ui.dockSetzen',
  params: z.object({
    panelId: z.string(),
    dock: z.enum(DOCK_ZIEL_TUPLE),
    anker: z.enum(ANKER_TUPLE).optional(),
  }),
  beschreibung:
    'Dockt ein Panel des Docks der aktiven Station um — «left»/«right» (Spalte) oder «schwebend» (float, NUR im Modus A/"Frei" möglich). Landet an seinem Standard-Ankerplatz, keine freie Positionierung.',
  run: ({ panelId, dock, anker }) => {
    const station = holeAktiveStation('ui.dockSetzen');
    const def = holePanelDef('ui.dockSetzen', station, panelId);
    const modus = useDockZustand.getState().modus;
    if (dock === 'float' && modus !== 'A') {
      throw new UiBefehlError(
        `ui.dockSetzen: schwebende Panels («float») gibt es nur im Modus A («Frei») — die aktive Station läuft gerade im Modus B («Raster-Kachel»), dort ist nur 'left'/'right' möglich.`,
        'ui.dockSetzen',
      );
    }
    const patch: PanelOverridePatch =
      dock === 'float'
        ? { dock: 'float', anker: anker ?? 'top' }
        : { dock, anker: undefined, fx: undefined, fy: undefined, fw: undefined, fh: undefined };
    useDockZustand.getState().panelOverrideSetzen(station, panelId, patch);
    useDockOrbRuntime.getState().meldeAktion(panelId);
    const ergebnis: UiDockSetzenErgebnis = { station, panelId, titel: def.titel, dock };
    return ergebnis;
  },
});

// ---------------------------------------------------------------------------
// ui.dockGroesseSetzen
// ---------------------------------------------------------------------------

export interface UiDockGroesseErgebnis extends UiDockErgebnis {
  groesse: number;
}

/** Fallback-Untergrenze, wenn die Registry kein `min` trägt — identisch zum
 *  Solver-Fallback (`dock-kern.ts`s `stack()`, `p.min || 130`). */
const GROESSE_MIN_FALLBACK = 130;
/** Grosszügige Obergrenze (Auftrag «klemmt … an Spaltenlogik»): der Solver
 *  selbst deckelt effektiv über `avail`/`avail*0.66` (`stack()`), diese Zahl
 *  fängt nur absurde Werte (z.B. eine Tippfehler-Null zu viel vom Modell) ab,
 *  ohne dem Solver seine eigene, feinere Platzverteilung wegzunehmen. */
const GROESSE_MAX_FALLBACK = 900;

function klemmeGroesse(def: PanelDef, groesse: number): number {
  const minVal = def.min ?? GROESSE_MIN_FALLBACK;
  const maxVal = Math.max(minVal, (def.groesse ?? minVal) * 3, GROESSE_MAX_FALLBACK);
  return Math.min(maxVal, Math.max(minVal, groesse));
}

export const uiDockGroesseSetzen = registriereUiBefehl({
  id: 'ui.dockGroesseSetzen',
  params: z.object({ panelId: z.string(), groesse: z.number() }),
  beschreibung:
    'Setzt das Grössen-Budget eines gedockten Panels für den Stack-Solver (Höhe in der Spalte) — wird an das Panel-Minimum und eine grosszügige Obergrenze geklemmt, keine beliebigen Werte.',
  run: ({ panelId, groesse }) => {
    const station = holeAktiveStation('ui.dockGroesseSetzen');
    const def = holePanelDef('ui.dockGroesseSetzen', station, panelId);
    const geklemmt = klemmeGroesse(def, groesse);
    useDockZustand.getState().panelOverrideSetzen(station, panelId, { groesse: geklemmt });
    useDockOrbRuntime.getState().meldeAktion(panelId);
    const ergebnis: UiDockGroesseErgebnis = { station, panelId, titel: def.titel, groesse: geklemmt };
    return ergebnis;
  },
});

// ---------------------------------------------------------------------------
// ui.dockAnheften
// ---------------------------------------------------------------------------

export interface UiDockAnheftenErgebnis extends UiDockErgebnis {
  angeheftet: boolean;
}

export const uiDockAnheften = registriereUiBefehl({
  id: 'ui.dockAnheften',
  params: z.object({ panelId: z.string(), angeheftet: z.boolean() }),
  beschreibung:
    'Heftet ein gedocktes Panel an (oder löst die Anheftung) — angeheftete Panels behalten bei Platzmangel bevorzugt ihre Grösse, andere Panels klappen zuerst ein.',
  run: ({ panelId, angeheftet }) => {
    const station = holeAktiveStation('ui.dockAnheften');
    const def = holePanelDef('ui.dockAnheften', station, panelId);
    useDockZustand.getState().panelOverrideSetzen(station, panelId, { angeheftet });
    useDockOrbRuntime.getState().meldeAktion(panelId);
    const ergebnis: UiDockAnheftenErgebnis = { station, panelId, titel: def.titel, angeheftet };
    return ergebnis;
  },
});

// ---------------------------------------------------------------------------
// ui.dockEinklappen
// ---------------------------------------------------------------------------

export interface UiDockEinklappenErgebnis extends UiDockErgebnis {
  eingeklappt: boolean;
}

export const uiDockEinklappen = registriereUiBefehl({
  id: 'ui.dockEinklappen',
  params: z.object({ panelId: z.string(), eingeklappt: z.boolean() }),
  beschreibung: 'Klappt ein gedocktes Panel zu einem schmalen Tab ein oder wieder auf.',
  run: ({ panelId, eingeklappt }) => {
    const station = holeAktiveStation('ui.dockEinklappen');
    const def = holePanelDef('ui.dockEinklappen', station, panelId);
    useDockZustand.getState().panelOverrideSetzen(station, panelId, { eingeklappt });
    useDockOrbRuntime.getState().meldeAktion(panelId);
    const ergebnis: UiDockEinklappenErgebnis = { station, panelId, titel: def.titel, eingeklappt };
    return ergebnis;
  },
});

// ---------------------------------------------------------------------------
// ui.dockZurueckLegen — Float zurück an den Anker (fx/fy/dock/anker/fw/fh
// löschen, Muster `DockFlaeche.tsx`s `vollRedock`).
// ---------------------------------------------------------------------------

export const uiDockZurueckLegen = registriereUiBefehl({
  id: 'ui.dockZurueckLegen',
  params: z.object({ panelId: z.string() }),
  beschreibung: 'Legt ein schwebendes (float) Panel zurück in seine ursprüngliche Dock-Spalte.',
  run: ({ panelId }) => {
    const station = holeAktiveStation('ui.dockZurueckLegen');
    const def = holePanelDef('ui.dockZurueckLegen', station, panelId);
    if (effektivesDock(station, panelId, def) !== 'float') {
      throw new UiBefehlError(`ui.dockZurueckLegen: «${def.titel}» schwebt nicht — nichts zum Zurücklegen.`, 'ui.dockZurueckLegen');
    }
    useDockZustand.getState().panelOverrideSetzen(station, panelId, {
      dock: undefined,
      anker: undefined,
      fx: undefined,
      fy: undefined,
      fw: undefined,
      fh: undefined,
    });
    useDockOrbRuntime.getState().meldeAktion(panelId);
    const ergebnis: UiDockErgebnis = { station, panelId, titel: def.titel };
    return ergebnis;
  },
});

// ---------------------------------------------------------------------------
// ui.dockZuruecksetzen — layoutZuruecksetzen der AKTIVEN Station. Trifft
// ALLE Panels gleichzeitig — bewusst KEINE Orb-Meldung (s. Kopfkommentar).
// ---------------------------------------------------------------------------

export interface UiDockZuruecksetzenErgebnis {
  station: DockStation;
}

export const uiDockZuruecksetzen = registriereUiBefehl({
  id: 'ui.dockZuruecksetzen',
  params: z.object({}),
  beschreibung:
    'Setzt das Dock-Layout der aktiven Station auf die eingebauten Vorgaben zurück — löscht Spaltenbreiten und alle Panel-Overrides dieser Station/diesem Modus.',
  run: () => {
    const station = holeAktiveStation('ui.dockZuruecksetzen');
    useDockZustand.getState().layoutZuruecksetzen(station);
    const ergebnis: UiDockZuruecksetzenErgebnis = { station };
    return ergebnis;
  },
});

// ---------------------------------------------------------------------------
// ui.dockPresetSetzen (v0.8.0 / Paket PD2, «Default-Oberflächen») — wendet
// eines der drei kuratierten Presets (`dock-presets.ts`) auf eine Station an.
// EIN gemeinsamer Anwend-Weg (`presetAnwenden()`, `state/dock-preset-
// anwendung.ts`) für diesen Befehl UND den UI-Preset-Wähler (Einstellungen +
// Kontextzeile) — Kosmo und ein Klick landen darum IMMER beim exakt gleichen
// Ergebnis. `station` ist EXPLIZIT (kein `holeAktiveStation()`-Fallback wie
// bei den übrigen Befehlen oben): «räum die KosmoVis-Oberfläche auf», während
// gerade die Design-Station offen ist, muss funktionieren — ein Preset ist
// KEIN "nur auf die gerade sichtbare Fläche wirkender" Toggle wie
// `ui.dockSetzen`/`ui.dockEinklappen`, sondern ein benannter Ziel-Zustand
// einer beliebigen Station. Wie `ui.dockZuruecksetzen` (das strukturell
// ähnlich ALLE Panels einer Station gleichzeitig trifft) bewusst KEINE
// Orb-Meldung — ein einzelnes Orb-Ziel wäre bei einer Preset-weiten Änderung
// zufällig und irreführend; die Chat-Quittung (`art:'dock'`,
// `kosmo-ui-aktion-dock`) bleibt trotzdem die sichtbare Ehrlichkeits-Zeile.
// ---------------------------------------------------------------------------

export interface UiDockPresetErgebnis {
  station: PresetStation;
  preset: PresetId;
  titel: string;
}

const PRESET_STATION_TUPLE = ['design', 'vis'] as const;
const PRESET_ID_TUPLE = PRESET_IDS as [PresetId, ...PresetId[]];

export const uiDockPresetSetzen = registriereUiBefehl({
  id: 'ui.dockPresetSetzen',
  params: z.object({
    station: z.enum(PRESET_STATION_TUPLE),
    preset: z.enum(PRESET_ID_TUPLE),
  }),
  beschreibung:
    'Wendet eines der drei kuratierten Oberflächen-Presets («fokus»/«arbeiten»/«pruefen») auf eine Station (design/vis) an — «fokus» räumt auf, «pruefen» stellt Kontrolle/Kennzahlen in den Vordergrund. Wirkt auf die genannte Station, unabhängig davon, welche Station gerade sichtbar ist.',
  run: ({ station, preset }) => {
    presetAnwenden(station, preset);
    const titel = presetFuer(station, preset).titel;
    const ergebnis: UiDockPresetErgebnis = { station, preset, titel };
    return ergebnis;
  },
});

// ---------------------------------------------------------------------------
// ui.dockLayoutLesen — stiller Schnappschuss (Muster `ui.zustandLesen`):
// KEINE Chat-Zeile, KEINE Orb-Meldung.
// ---------------------------------------------------------------------------

export interface UiDockLayoutSnapshot {
  station: DockStation;
  modus: DockModus;
  leftW: number;
  rightW: number;
  panels: Record<string, PanelOverride>;
  eingeklappt: string[];
}

export const uiDockLayoutLesen = registriereUiBefehl({
  id: 'ui.dockLayoutLesen',
  params: z.object({}),
  beschreibung:
    'Liest einen stillen Schnappschuss des Dock-Layouts der aktiven Station (Modus, Spaltenbreiten, Panel-Overrides, eingeklappte Panels) — keine sichtbare Wirkung.',
  run: () => {
    const station = holeAktiveStation('ui.dockLayoutLesen');
    const modus = useDockZustand.getState().modus;
    const layout = useDockZustand.getState().layoutFuer(station);
    const eingeklappt = Object.entries(layout.panels)
      .filter(([, ov]) => ov.eingeklappt)
      .map(([id]) => id);
    const ergebnis: UiDockLayoutSnapshot = {
      station,
      modus,
      leftW: layout.leftW,
      rightW: layout.rightW,
      panels: layout.panels,
      eingeklappt,
    };
    return ergebnis;
  },
});

// ---------------------------------------------------------------------------
// Anker/FloatAnker-Reexport für Aufrufer, die nur die Typen brauchen, ohne
// `dock-kern.ts` selbst zu importieren (Muster `DockPanel.tsx`s `DOCK_TAB_HOEHE`).
// ---------------------------------------------------------------------------
export type { DockZone, FloatAnker };

// ---------------------------------------------------------------------------
// Test-/E2E-Hook (Playwright) — Muster `window.__kosmoChat` (`KosmoPanel.tsx`):
// `fuehreUiBefehlAus` direkt aus dem Browser aufrufbar, für Specs, die eine
// exakte Befehlssequenz nachspielen wollen, ohne den Chat-/Mock-Provider-Weg
// zu nehmen (`e2e/dock-kosmo.spec.ts` Direktweg-Teil).
// ---------------------------------------------------------------------------
if (typeof window !== 'undefined') {
  (window as never as Record<string, unknown>)['__kosmoUiBefehle'] = {
    ausfuehren: (id: string, params: unknown) => fuehreUiBefehlAus(id, params),
  };
}
