import { presetOffenMap, type PresetId, type PresetStation } from './dock-presets';
import { useDockZustand } from './dock-zustand';
import { useUiZustand, type PanelId } from './ui-zustand';
import { useVisRuntime } from '../modules/vis/vis-runtime';

/**
 * Preset-Anwendung (v0.8.0 / Paket PD2, Default-Oberflächen) — EINE Funktion,
 * die ein Preset aus `dock-presets.ts` VOLLSTÄNDIG herstellt: das WIE
 * (Position/Grösse/Andockung/Anheftung, über `useDockZustand.presetSetzen()`)
 * UND das OB (welche Panels offen sind, `presetOffenMap()` auf die jeweils
 * zuständigen Booleans angewendet). `dock-presets.ts`s Kopfkommentar nennt
 * dieses Zusammenspiel das «Zwei-Schichten-Modell» — diese Datei ist die dort
 * angekündigte, noch fehlende zweite Hälfte («Anwenden-Befehl/UI kommt mit
 * PD2»).
 *
 * **Eine Quelle für UI UND Befehl**: sowohl der Preset-Wähler (Einstellungen
 * → Darstellung, Kontextzeile-Schnellzugriff) als auch der Kosmo-Befehl
 * `ui.dockPresetSetzen` (`dock-befehle.ts`) rufen ausschliesslich
 * `presetAnwenden()` — keine zweite Kopie der Booleans-Zuordnung, kein Weg,
 * bei dem UI und Kosmo unterschiedliche Panels öffnen/schliessen könnten.
 *
 * **Warum zwei verschiedene Booleans-Ziele je Station**: `presetOffenMap()`
 * liefert nur Panel-IDs — WELCHER Store diese ID kennt, unterscheidet sich
 * je Station (s. `dock-presets.ts`s `istOffenFaehig()`):
 *   - `'design'`: jede offen-fähige ID ist wörtlich ein `ui-zustand.ts`
 *     `PanelId` (`PANEL_IDS`-Mitgliedschaft ist genau das Kriterium) — der
 *     generische `setzePanel()`-Setter (derselbe, den `ui.panelSetzen`
 *     benutzt) deckt darum ALLE elf ab.
 *   - `'vis'`: `offenFaehigeIds('vis')` ist IMMER genau `['visPalette']`
 *     (s. `dock-presets.ts`-Kopfkommentar zur «ehrlichen Grenze») — dessen
 *     Sichtbarkeit lebt nicht in `ui-zustand.ts`, sondern in
 *     `vis-runtime.ts`s `paletteOffen`. Ein expliziter Setter
 *     (`paletteOffenSetzen`, additiv neben dem bestehenden
 *     `paletteUmschalten`/`paletteSchliessen`) ist hier nötig, weil ein
 *     Preset ein absolutes ZIEL kennt (offen/zu), nicht "umschalten".
 */
export function presetAnwenden(station: PresetStation, id: PresetId): void {
  useDockZustand.getState().presetSetzen(station, id);

  const offenMap = presetOffenMap(station, id);
  if (station === 'design') {
    const setzePanel = useUiZustand.getState().setzePanel;
    for (const [panelId, offen] of offenMap) {
      setzePanel(panelId as PanelId, offen);
    }
  } else {
    const visPaletteOffen = offenMap.get('visPalette');
    if (visPaletteOffen !== undefined) {
      useVisRuntime.getState().paletteOffenSetzen(visPaletteOffen);
    }
  }
}

// ---------------------------------------------------------------------------
// Erststart-Erkennung (Abschnitt 7.2 der Spez: «Erststart = Fokus, aber NUR
// wenn kein gespeichertes Layout existiert»)
// ---------------------------------------------------------------------------

/**
 * Marker, der EINMALIG nach der ersten Entscheidung (anwenden ODER bewusst
 * überspringen) gesetzt wird — verhindert, dass jeder künftige App-Start
 * erneut prüft/eingreift, unabhängig davon, was der Mensch danach am Dock
 * verändert (auch ein vollständig auf leer zurückgesetztes Layout darf die
 * Fokus-Anwendung nicht ein zweites Mal auslösen).
 */
const ERSTSTART_MARKER_KEY = 'kosmo.dock.presetInit.v1';

/**
 * Derselbe `localStorage`-Schlüssel wie `dock-zustand.ts`s privates
 * `STORAGE_KEY` — hier bewusst als eigenes Literal geführt (nicht importiert)
 * statt `dock-zustand.ts` für einen Re-Export anzufassen (Auftrag: dessen
 * Datei möglichst unangetastet lassen). Nur der reine STRING wird gebraucht,
 * keine Store-Logik.
 */
const DOCK_STORAGE_KEY = 'kosmo.dock.v1';

/**
 * Prüft den Erststart-Fall und wendet bei Bedarf «Fokus» auf beide
 * Preset-Stationen (`'design'`/`'vis'`) an — reine Bestandsschutz-Logik,
 * KEINE Layout-Änderung für alle anderen Fälle:
 *
 * 1. Marker `kosmo.dock.presetInit.v1` bereits gesetzt → sofort zurück, keine
 *    weitere Prüfung. Diese Entscheidung ist endgültig für dieses Gerät/
 *    dieses Profil (`localStorage` ist pro Origin, nicht pro Sitzung).
 * 2. `kosmo.dock.v1` existiert BEREITS (roh, vor jeder eigenen Schreibung
 *    dieser Funktion) → Bestandsnutzer-Schutz: ein Mensch hat entweder das
 *    Dock schon einmal manuell verändert (Overrides/Spaltenbreiten/Modus)
 *    ODER eine frühere Session hat hier bereits ein Preset gesetzt (was
 *    diesen Schlüssel selbst erzeugt hätte) — in BEIDEN Fällen gilt: nicht
 *    anfassen. Marker wird trotzdem gesetzt, damit dieser (günstige) Pfad
 *    beim nächsten Start nicht erneut den `localStorage`-Read braucht.
 * 3. Sonst (kein Marker, kein bestehendes Dock-Layout): das ist der ECHTE
 *    Erststart — «Fokus» wird für BEIDE Stationen angewendet (unabhängig
 *    davon, welche Station der Mensch zuerst öffnet), dann der Marker
 *    gesetzt.
 *
 * **Bewusst KEIN Blick auf `ui-zustand.ts`s persistierten Speicher
 * (`kosmo.ui.v1`)**: dessen `persistiere()` schreibt NUR die vier
 * Modus-Felder + `phasenFokus` (s. dortiger Kopfkommentar, Abschnitt
 * «persistiert») — keines der elf Panel-Flags (`PANEL_IDS`) ist je
 * Bestandteil dieses Speichers, sie sind reine Sitzungs-Booleans und starten
 * bei JEDEM Laden (auch für langjährige Bestandsnutzer) auf denselben
 * `anfangsZustand()`-Werten. Es gibt daher schlicht KEINE „relevanten
 * ui-Booleans im persistierten Speicher“ zu schützen — der einzige reale
 * Bestand, den ein Preset überschreiben könnte, ist `kosmo.dock.v1` (Punkt 2
 * oben). Diese Klarstellung ist das Ergebnis der Prüfung, die der Auftrag
 * einfordert, nicht eine Annahme.
 */
export function wendeErststartPresetFallsNoetigAn(): void {
  let storage: Storage;
  try {
    if (typeof localStorage === 'undefined') return;
    storage = localStorage;
  } catch {
    return;
  }
  try {
    if (storage.getItem(ERSTSTART_MARKER_KEY) !== null) return;
    if (storage.getItem(DOCK_STORAGE_KEY) !== null) {
      storage.setItem(ERSTSTART_MARKER_KEY, '1');
      return;
    }
    presetAnwenden('design', 'fokus');
    presetAnwenden('vis', 'fokus');
    storage.setItem(ERSTSTART_MARKER_KEY, '1');
  } catch {
    // Privater Modus/volles Kontingent — kein Crash, Erststart-Komfort
    // entfällt einfach für diese Sitzung (dieselbe Ehrlichkeit wie die
    // übrigen Speicher-Layer in dieser Codebasis).
  }
}
