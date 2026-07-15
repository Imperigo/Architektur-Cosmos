import type { PanelDef, PanelOverride } from './dock-kern';
import { dockbarePanelIds, stationsPanels, type DockStation } from './dock-stationen';
import { PANEL_IDS } from './ui-zustand';

/**
 * Dock-Presets (v0.8.0 / Paket PD1, Owner-Anforderung «Default-Oberflächen») —
 * kuratierte, benannte Layout-Varianten je Station, damit die App aufgeräumt
 * wirkt statt «alles offen» (Owner-Kritik an den v0.7.9-Screens, s.
 * `docs/OWNER-MANDAT.md`). Diese Datei ist reine Deklaration + reine
 * Funktionen — kein Store, kein DOM, keine Persistenz (die lebt weiterhin in
 * `dock-zustand.ts`, das ein Preset nur ANWENDET, nicht definiert).
 *
 * **Zwei-Schichten-Modell (wie `dock-stationen.ts` ⊕ `dock-zustand.ts`)**:
 * ein Preset beschreibt EINEN gewünschten Ziel-Zustand als reine Daten
 * (`offen`-Menge + `overrides` + optionale Spaltenbreiten). Wer diesen
 * Ziel-Zustand tatsächlich HERSTELLT, ist zweigeteilt:
 *   1. `overrides`/`leftW`/`rightW` — das «WIE» (Position/Grösse/Andockung/
 *      Anheftung), geht direkt in `dock-zustand.ts`s `PanelOverride`-Layer
 *      (PD1, dieses Paket: `presetSetzen()`).
 *   2. `offen` — das «OB» (welche Panels sichtbar sein sollen), bleibt
 *      Kandidat für `ui-zustand.ts`s Booleans (Design-Station) bzw.
 *      `vis-runtime.ts`s eigene Toggles (Vis-Station). Diese Datei LIEFERT
 *      nur die gewünschte Menge (`presetOffenMap()`); das tatsächliche
 *      Setzen der Booleans ist ausdrücklich NICHT Teil von PD1 (kommt mit
 *      dem Anwenden-Befehl/UI in PD2) — s. Auftrag: «Booleans NICHT hier».
 *
 * **Warum nicht einfach `PanelOverride.geschlossen` für alles benutzen?**
 * `DockFlaeche.tsx` (Z.453-459) baut die an `solve()` übergebenen Overrides
 * JE RENDER frisch: `{ ...gespeichert, geschlossen: !sichtbar }` — das
 * `geschlossen`-Feld aus dem persistierten Override wird dabei IMMER durch
 * die von der aufrufenden Station gelieferte `sichtbar`-Prop überschrieben,
 * gleich ob das Panel ein echtes `…Offen`-Flag hat oder ein reiner
 * Daten-Guard ist. Ein Preset, das `geschlossen:true` in `overrides` setzt,
 * hätte damit in der heutigen Verdrahtung schlicht KEINE Wirkung — stille
 * Verrenkung statt echtem Hebel. Diese Datei setzt darum bei keinem Preset
 * jemals `geschlossen` (s. Selbsttest `pruefePresetIntegritaet()` unten, der
 * das aktiv verbietet) und dokumentiert bei den Stationen, wo das eine reale
 * Kuration einschränkt (v.a. `vis`, s. unten).
 *
 * **Drei Presets je Station** (`'fokus' | 'arbeiten' | 'pruefen'`, für
 * `'design'` UND `'vis'` — `'plan'` bleibt wie in `dock-stationen.ts` ein
 * endgültiger Scope-Entscheid ohne eigenes Preset, s. dortigen
 * Kopfkommentar, daher `PresetStation` als eigener, engerer Typ statt
 * `DockStation`):
 *   - `'fokus'` — maximal aufgeräumt, nur das Nötigste. Gedacht als Ziel für
 *     einen ECHTEN Erststart (wird erst in PD2 tatsächlich automatisch
 *     gesetzt, s. `dock-zustand.ts`-Kommentar zu `aktivesPreset`).
 *   - `'arbeiten'` — der ruhige Standard, dem heutigen (v0.7.9) Verhalten am
 *     nächsten (im Wesentlichen: keine Overrides, Kennzahlen normal offen).
 *   - `'pruefen'` — auf Kontrolle/Review ausgelegt (grössere/angeheftete
 *     Kennzahlen, Mengen-/Ausmass-Panel offen).
 */

// ---------------------------------------------------------------------------
// Öffentliche Typen
// ---------------------------------------------------------------------------

export type PresetId = 'fokus' | 'arbeiten' | 'pruefen';

/** Reihenfolge, in der Presets einer Station angeboten werden (UI-Reihenfolge
 *  für PD2, z.B. ein Auswahlmenü) — bewusst «vom Aufgeräumtesten zum
 *  Volltest», nicht alphabetisch. */
export const PRESET_IDS: readonly PresetId[] = ['fokus', 'arbeiten', 'pruefen'];

/** Presets existieren nur für Stationen mit einer echten Panel-Registry —
 *  `'plan'` ist in `dock-stationen.ts` ein endgültig leeres Array (kein
 *  Welle-3-TODO, s. dortiger Kopfkommentar), darum bewusst ausgeschlossen
 *  statt mit drei bedeutungslosen Presets aufgefüllt. */
export type PresetStation = Extract<DockStation, 'design' | 'vis'>;

/**
 * Ein kuratiertes Layout-Ziel. `offen`/`overrides` sind reine Ziel-Daten,
 * keine Befehle — s. Kopfkommentar zum Zwei-Schichten-Modell.
 */
export interface DockPreset {
  id: PresetId;
  station: PresetStation;
  titel: string;
  beschreibung: string;
  /** Panel-IDs, die in diesem Preset offen sein sollen — NUR IDs, für die es
   *  einen echten, ausserhalb dieser Datei ansteuerbaren Umschalt-Weg gibt
   *  (s. `offenFaehigeIds()`); alle anderen Panels der Station gelten in
   *  diesem Preset als zu (Abwesenheit von der Liste = zu, kein separates
   *  «zu»-Feld nötig). */
  offen: readonly string[];
  /** WIE-Overrides je Panel-ID (Position/Grösse/Andockung/Anheftung) — NIE
   *  `geschlossen` (s. Kopfkommentar), das würde in der heutigen
   *  `DockFlaeche`-Verdrahtung ohnehin ignoriert. */
  overrides: Record<string, PanelOverride>;
  leftW?: number;
  rightW?: number;
}

// ---------------------------------------------------------------------------
// Hilfsfunktion: welche Panel-IDs einer Station haben überhaupt einen echten
// Offen/Zu-Umschalter, den ein Preset sinnvoll adressieren kann?
// ---------------------------------------------------------------------------

/**
 * Prüft je Panel-Definition, ob die Station-spezifische «offen»-Semantik
 * einen echten Umschalt-Weg kennt (s. `dock-stationen.ts`-Kopfkommentar zu
 * den Daten-Guard-/HUD-Float-Ausnahmen):
 *   - `'design'`: die drei Daten-Guards (`unternehmerplan`/`kennzahlen`/
 *     `inspector`) und die sechs HUD-Floats tragen zwar `schliessbar:true`
 *     bzw. `:false` in der Registry, haben aber so oder so KEIN `…Offen`-
 *     Flag in `ui-zustand.ts` UND (Daten-Guards) keinen `schliessen`-
 *     Callback in der `DockPanelEintrag`, die `DockFlaeche.tsx` von der
 *     Design-Station bekommt (s. dortiger Typ-Kommentar: «Fehlt bei
 *     datengetriebenen Panels ohne eigenes Boolean»). `PanelDef.schliessbar`
 *     ist darum für diese Station KEIN verlässliches Signal — die einzig
 *     verlässliche Quelle ist die `PANEL_IDS`-Mitgliedschaft selbst.
 *   - `'vis'`: umgekehrter Fall — KEINE der vier IDs steht in `PANEL_IDS`
 *     (alle vier sind Daten-Guards/lokale `vis-runtime.ts`-Toggles, nie
 *     `ui-zustand.ts`-Flags). Hier IST die Registry die Wahrheit:
 *     `visPalette` ist die einzige mit `schliessbar:true` (echter Toggle
 *     `paletteOffen` in `vis-runtime.ts`), die übrigen drei sind reine
 *     Daten-Guards (Graph-/Selektions-/Minimap-Zustand) ohne einen Store,
 *     den ein Preset ansteuern könnte.
 */
function istOffenFaehig(station: PresetStation, def: PanelDef): boolean {
  if (station === 'design') {
    return (PANEL_IDS as readonly string[]).includes(def.id);
  }
  return def.schliessbar;
}

/** Die Panel-IDs einer Station, für die ein Preset sinnvoll «offen»/«zu»
 *  aussagen kann (s. `istOffenFaehig`) — Reihenfolge wie `stationsPanels`. */
export function offenFaehigeIds(station: PresetStation): readonly string[] {
  return stationsPanels(station)
    .filter((def) => istOffenFaehig(station, def))
    .map((def) => def.id);
}

// ---------------------------------------------------------------------------
// Design-Station — drei Presets
// ---------------------------------------------------------------------------

/**
 * `'fokus'` — maximal aufgeräumt (Owner-Ziel «aufgeräumt statt alles offen»):
 * KEIN Werkzeug-Panel offen (alle elf `offenFaehigeIds('design')` bleiben
 * ausserhalb der `offen`-Liste, also zu). `kennzahlen` bleibt sichtbar (sie
 * ist ein reiner Daten-Guard, IMMER sichtbar in der Design-Station, s.
 * `dock-stationen.ts`), aber eingeklappt (`eingeklappt:true`) — sie soll
 * präsent, aber nicht raumgreifend sein. Die vier/sechs HUD-Floats bekommen
 * KEIN Override: sie gehören zum Viewport-Chrome selbst (Modus-Leiste,
 * Werkzeug-Rail, …), kein «Werkzeug-Panel» im Sinne dieser Kuration.
 * `inspector` bleibt unangetastet (selektionsgetrieben — erscheint erst,
 * wenn der Mensch etwas auswählt, das ist unabhängig vom Preset richtig).
 */
const DESIGN_FOKUS: DockPreset = {
  id: 'fokus',
  station: 'design',
  titel: 'Fokus',
  beschreibung: 'Nur der Viewport und die eingeklappten Kennzahlen — alle Werkzeug-Panels zu.',
  offen: [],
  overrides: {
    kennzahlen: { eingeklappt: true },
  },
};

/**
 * `'arbeiten'` — der ruhige Standard, dem heutigen (v0.7.9) Verhalten am
 * nächsten: keine Werkzeug-Panels offen, `kennzahlen` normal (NICHT
 * eingeklappt — Abwesenheit von `eingeklappt` in `overrides` reicht dafür,
 * `mischePanel()` in `dock-kern.ts` defaultet ohne Override auf
 * `eingeklappt:false`). Bewusst leere `overrides` — dieses Preset IST fast
 * der unveränderte Ist-Zustand, nur jetzt benannt und wählbar.
 */
const DESIGN_ARBEITEN: DockPreset = {
  id: 'arbeiten',
  station: 'design',
  titel: 'Arbeiten',
  beschreibung: 'Der ruhige Standard: Kennzahlen normal sichtbar, sonst nichts offen.',
  offen: [],
  overrides: {},
};

/**
 * `'pruefen'` — auf Kontrolle/Review ausgelegt: `kennzahlen` gross
 * (`groesse:480`, oberhalb des Registry-Werts 380, s.
 * `dock-stationen.ts`) UND angeheftet (`angeheftet:true`, damit sie beim
 * Einklapp-Wettbewerb im `stack()`-Solver ihre Zielgrösse behält statt
 * proportional zu schrumpfen); `drawOffen` (Modellbaum · Mengen · Ausmass)
 * offen, weil Mengen-/Ausmass-Kontrolle der Kern einer Prüf-Session ist.
 * Alle übrigen zehn Werkzeug-Panels bleiben zu.
 */
const DESIGN_PRUEFEN: DockPreset = {
  id: 'pruefen',
  station: 'design',
  titel: 'Prüfen',
  beschreibung: 'Kennzahlen gross und angeheftet, Mengen/Ausmass offen — für die Kontrolle.',
  offen: ['drawOffen'],
  overrides: {
    kennzahlen: { groesse: 480, angeheftet: true },
  },
};

// ---------------------------------------------------------------------------
// Vis-Station — drei Presets
//
// EHRLICHE GRENZE (statt Verrenkung): von den vier Vis-Panels ist NUR
// `visPalette` `offenFaehig` (echter Toggle `paletteOffen` in
// `vis-runtime.ts`). `visAusrichten`/`visMinimap`/`visLegende` sind reine
// Daten-Guards:
//   - `visAusrichten` — Sichtbarkeit = `auswahl.size >= 2`, kein Store-Feld.
//   - `visLegende` — Sichtbarkeit = Graph hat Nodes, kein Store-Feld.
//   - `visMinimap` — Sichtbarkeit = `graph.nodes.length > 0 && minimapSichtbar`
//     (`minimapSichtbar = minimapManuell ?? nodes.length >= MINIMAP_KNOTEN_MIN`,
//     `NodeCanvas.tsx`) — ZWAR gibt es mit `minimapManuell` einen manuellen
//     Umschalter, der ist aber ein lokales `useState` in `NodeCanvas.tsx`
//     (Shell-Modul, nicht Teil der Datei-Grenzen dieses Auftrags) UND wirkt
//     ohnehin nur zusammen mit `nodes.length > 0` — kein Preset kann die
//     Minimap bei leerem Graph erzwingen.
// Weder `offen` (kein Store zum Setzen) noch `overrides.geschlossen` (wird
// von `DockFlaeche.tsx` ohnehin ignoriert, s. Datei-Kopfkommentar) können
// diese drei also sauber ansteuern — «nur Canvas» (`fokus`) und «+ minimap»
// (`arbeiten`) sind für sie darum AUSSAGEN ÜBER DIE ABSICHT, nicht technisch
// erzwingbare Zustände; einzig `visPalette` UND reine Geometrie-Overrides
// (`fw`/`fh`/`fx`/`fy` — die WERDEN von `DockFlaeche.tsx` respektiert, nur
// `geschlossen` nicht) sind heute wirklich von einem Preset aus steuerbar.
// `'pruefen'` nutzt genau diesen echten Geometrie-Hebel (grössere Legende),
// statt eine dritte, praktisch identische Zu-Kuration wie `'fokus'`
// vorzutäuschen.
// ---------------------------------------------------------------------------

/**
 * `'fokus'` — nur der Canvas. `visPalette` zu (der einzige echte Hebel).
 * `visAusrichten`/`visMinimap`/`visLegende` bleiben Daten-Guards — sie
 * verschwinden von selbst, sobald kein Graph/keine Mehrfachauswahl vorliegt,
 * ein Preset kann das aber nicht erzwingen (s. Blockkommentar oben).
 */
const VIS_FOKUS: DockPreset = {
  id: 'fokus',
  station: 'vis',
  titel: 'Fokus',
  beschreibung: 'Nur der Canvas — die Node-Palette ist zu (Minimap/Legende/Ausrichten bleiben datengetrieben).',
  offen: [],
  overrides: {},
};

/**
 * `'arbeiten'` — der Standard beim aktiven Modellieren: `visPalette` offen
 * (Nodes einfügen), die Minimap bleibt wie immer eine Daten-Guard-Aussage
 * (s. Blockkommentar oben) statt eines erzwingbaren Zustands.
 */
const VIS_ARBEITEN: DockPreset = {
  id: 'arbeiten',
  station: 'vis',
  titel: 'Arbeiten',
  beschreibung: 'Node-Palette offen zum Modellieren (Minimap erscheint automatisch ab genügend Nodes).',
  offen: ['visPalette'],
  overrides: {},
};

/**
 * `'pruefen'` — Review-Modus: `visPalette` zu (keine neuen Nodes während der
 * Prüfung), stattdessen die Legende vergrössert (`fw`/`fh`, ein ECHTER,
 * funktionierender Geometrie-Hebel, s. Blockkommentar oben) — bessere
 * Lesbarkeit der Porttyp-Farbcodierung bei einer Kontrolle, statt einer
 * bedeutungslosen Kopie von `'fokus'`.
 */
const VIS_PRUEFEN: DockPreset = {
  id: 'pruefen',
  station: 'vis',
  titel: 'Prüfen',
  beschreibung: 'Node-Palette zu, Legende vergrössert — für die Kontrolle der Porttyp-Farbcodierung.',
  offen: [],
  overrides: {
    visLegende: { fw: 130, fh: 170 },
  },
};

// ---------------------------------------------------------------------------
// Registry + öffentliche Zugriffsfunktionen
// ---------------------------------------------------------------------------

const DESIGN_PRESETS: Readonly<Record<PresetId, DockPreset>> = {
  fokus: DESIGN_FOKUS,
  arbeiten: DESIGN_ARBEITEN,
  pruefen: DESIGN_PRUEFEN,
};

const VIS_PRESETS: Readonly<Record<PresetId, DockPreset>> = {
  fokus: VIS_FOKUS,
  arbeiten: VIS_ARBEITEN,
  pruefen: VIS_PRUEFEN,
};

function presetsFuerStation(station: PresetStation): Readonly<Record<PresetId, DockPreset>> {
  return station === 'design' ? DESIGN_PRESETS : VIS_PRESETS;
}

/** Ein einzelnes Preset — wirft nie (der Typ `PresetId` deckt alle Schlüssel
 *  ab, `presetsFuerStation` ist vollständig für beide Stationen). */
export function presetFuer(station: PresetStation, id: PresetId): DockPreset {
  return presetsFuerStation(station)[id];
}

/** Alle drei Presets einer Station, in `PRESET_IDS`-Reihenfolge. */
export function allePresets(station: PresetStation): readonly DockPreset[] {
  return PRESET_IDS.map((id) => presetFuer(station, id));
}

/** Die WIE-Overrides eines Presets — reiner Zugriffs-Alias auf
 *  `presetFuer(...).overrides`, für Aufrufstellen, die nur das brauchen. */
export function presetOverrides(station: PresetStation, id: PresetId): Record<string, PanelOverride> {
  return presetFuer(station, id).overrides;
}

/**
 * Die gewünschte Offen-Menge eines Presets als vollständige Boolean-Map —
 * EIN Eintrag je `offenFaehigeIds(station)` (nicht nur die in `offen`
 * gelisteten), `true` für Panels in `preset.offen`, sonst `false`. Das
 * Anwenden dieser Map auf `ui-zustand.ts`/`vis-runtime.ts` ist NICHT Teil
 * dieser Datei (s. Kopfkommentar, Zwei-Schichten-Modell) — kommt mit PD2.
 */
export function presetOffenMap(station: PresetStation, id: PresetId): ReadonlyMap<string, boolean> {
  const preset = presetFuer(station, id);
  const map = new Map<string, boolean>();
  for (const panelId of offenFaehigeIds(station)) {
    map.set(panelId, preset.offen.includes(panelId));
  }
  return map;
}

// ---------------------------------------------------------------------------
// Selbsttest — läuft einmal beim Modul-Import (billig: drei Presets je
// Station, keine I/O). Kein Ersatz für `dock-presets.test.ts`, sondern ein
// zusätzliches, permanentes Sicherheitsnetz gegen künftige Tippfehler in den
// obigen Literalen (falsche Panel-ID, versehentliches `geschlossen`-Feld).
// ---------------------------------------------------------------------------

function pruefePresetIntegritaet(): void {
  for (const station of ['design', 'vis'] as const) {
    const gueltigeIds = new Set(dockbarePanelIds(station));
    const offenFaehig = new Set(offenFaehigeIds(station));
    for (const preset of allePresets(station)) {
      for (const id of preset.offen) {
        if (!offenFaehig.has(id)) {
          throw new Error(`dock-presets: '${station}/${preset.id}'.offen enthält '${id}', das dort keinen echten Umschalt-Weg hat.`);
        }
      }
      for (const [id, override] of Object.entries(preset.overrides)) {
        if (!gueltigeIds.has(id)) {
          throw new Error(`dock-presets: '${station}/${preset.id}'.overrides referenziert unbekannte Panel-ID '${id}'.`);
        }
        if ('geschlossen' in override) {
          throw new Error(
            `dock-presets: '${station}/${preset.id}'.overrides['${id}'] setzt 'geschlossen' — wird von DockFlaeche.tsx ignoriert, s. Kopfkommentar.`,
          );
        }
      }
    }
  }
}
pruefePresetIntegritaet();
