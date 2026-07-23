import type { z } from 'zod';
import { externalTools, type ReadTool } from '@kosmo/ai';
import { alleUiBefehle, fuehreUiBefehlAus, type UiBefehl } from './ui-befehle';
import { ARBEITSMODUS_LABEL, type Arbeitsmodus } from './arbeitsmodi-kern';
import type { PanelId, ToolId, ViewMode } from './ui-zustand';
// v0.7.8 Welle 3 (P7, «Kosmo ordnet») — statischer Seiteneffekt-Import wie
// `ui-befehle` selbst: `dock-befehle.ts` registriert seine sieben `ui.dock*`-
// Befehle bei `registriereUiBefehl()` NUR, wenn ihr Modul tatsächlich einmal
// geladen wurde. Ohne diesen Import bliebe die Registry (`alleUiBefehle()`
// unten) leer für sie — dieselbe Machart wie jeder andere reine
// Seiteneffekt-Import in dieser Codebasis.
import type {
  UiDockAnheftenErgebnis,
  UiDockEinklappenErgebnis,
  UiDockErgebnis,
  UiDockGroesseErgebnis,
  UiDockPresetErgebnis,
  UiDockSetzenErgebnis,
  UiDockZuruecksetzenErgebnis,
} from './dock-befehle';
import './dock-befehle';

/**
 * Kosmo-UI-Brücke (v0.6.6 BEWEGUNGSKONZEPT §6, Stream E) — macht die
 * `ui.*`-Registry (`state/ui-befehle.ts`, EINGEFROREN — Fundament eines
 * anderen Streams) für Kosmo als LLM-Werkzeuge nutzbar, im selben
 * `ReadTool`-Muster wie `referenzen_suchen`/`quellen_suchen` in
 * `KosmoPanel.tsx` (`packages/kosmo-ai` `ChatSession`, `extraReadTools`).
 *
 * **Die harte Grenze — Diff-Karte vs. `ui.*` (Konzept §6, hier begründet):**
 * Eine Diff-Karte ist ein Vorschlag auf dem `KosmoDoc` (`AnyPatch[]`): sie
 * geht durchs Undo-System, überlebt Yjs-Sync, wird Teil eines
 * `.kosmo`-Pakets — und genau DESHALB muss der Mensch sie vor der Wirkung
 * freigeben (das Modell entscheidet sonst am Bauwerk vorbei). `ui.*`
 * verändert dagegen NUR den flüchtigen `ui-zustand.ts`-Store: kein Doc-Write,
 * kein Undo-Eintrag, kein Sync-Ereignis — ein Panel auf/zu oder ein
 * Moduswechsel ist mit einem Klick oder einem zweiten Kosmo-Satz genauso
 * folgenlos rückgängig wie er entstand. Das Freigabe-Ritual der Diff-Karte
 * wäre hier Reibung ohne Schutzwert, weil es nichts Bleibendes gibt, das
 * geschützt werden müsste. Die GLEICHE Ehrlichkeit («gleiche Ehrlichkeit,
 * anderes Vehikel», Konzept §6) kommt deshalb über SICHTBARKEIT statt
 * Freigabe: jeder schreibende `ui.*`-Aufruf läuft sofort UND hinterlässt eine
 * eigene, unübersehbare Chat-Zeile (`kosmo-ui-aktion-*`, `KosmoPanel.tsx`) —
 * der Mensch sieht in Echtzeit, was sich geändert hat, statt vorher
 * entscheiden zu müssen, ob es sich ändern darf. `ui.zustandLesen` ist
 * ohnehin nur ein Lesezugriff — dafür gab es noch nie ein Freigabe-Ritual.
 */

/**
 * Kuratierte Ausschlussliste für `commandTools({ ohne })` (`packages/kosmo-ai`
 * `tools.ts`): Kosmo soll bauen, nicht abreissen — Abriss bleibt Handgriff.
 * `design.loeschen`/`design.meshVertexSchieben`/`vis.graphLoeschen`/
 * `vis.nodeLoeschen` sind destruktive bzw. rein technische Commands, die kein
 * Sim-Zug bisher sinnvoll über den Chat ausgelöst hat und die im schlimmsten
 * Fall unwiederbringlich wirken, BEVOR der Architekt eine Diff-Karte sieht —
 * die Diff-Karte bleibt zwar das erste Netz (jede Wirkung braucht weiterhin
 * eine Freigabe), aber ein Modell, das gar nicht erst vorschlägt abzureissen,
 * ist das ehrlichere zweite Netz. Gedacht für den `commandTools()`-Aufruf in
 * `packages/kosmo-ai/src/chat.ts` (`ChatSession`-Konstruktor) — DIESE Datei
 * kennt den Aufrufer nicht (App → Package, nie umgekehrt), darum nur als
 * fertig begründete Konstante zum Importieren.
 */
export const KOSMO_AUSGESCHLOSSENE_COMMANDS: readonly string[] = [
  'design.loeschen',
  'design.meshVertexSchieben',
  'vis.graphLoeschen',
  'vis.nodeLoeschen',
];

const PANEL_LABEL: Record<PanelId, string> = {
  studieOffen: 'Volumenstudien-Panel',
  drawOffen: 'Zeichnen-Panel',
  listeOffen: 'Massliste',
  rasterOffen: 'Raster-Panel',
  kvOffen: 'KV-Panel',
  bauablaufOffen: 'Bauablauf-Panel',
  maengelOffen: 'Mängel-Panel',
  submissionOffen: 'Submissions-Panel',
  splatPanelOffen: 'Splat-Panel',
  sonneOffen: 'Sonnenstudien-Panel',
  mehrOffen: 'Mehr-Menü',
  exportMenuOffen: 'Export-Menü',
  projektMenuOffen: 'Projekt-Menü',
  // v0.7.0 (Stream 1B): CurtainWallPanel-Sichtbarkeit jetzt im Store —
  // mechanische Folge des neuen PANEL_IDS-Eintrags (Record ist vollständig).
  cwSetzenOffen: 'Fensterband/CW-Dialog',
  // v0.7.0 (Stream 5A): Varianten-Panel-Sichtbarkeit jetzt im Store —
  // mechanische Folge des neuen PANEL_IDS-Eintrags (Record ist vollständig).
  variantenPanelOffen: 'Varianten-Panel',
};

const TOOL_LABEL: Record<ToolId, string> = {
  auswahl: 'Auswahl',
  wand: 'Wand',
  volumen: 'Volumen',
  zone: 'Zone',
  dach: 'Dach',
  treppe: 'Treppe',
  stuetze: 'Stütze',
  schnitt: 'Schnitt',
  skizze: 'Skizze',
  mesh: 'Mesh',
  // v0.8.3 E3 (§3.1, docs/V083-SPEZ.md): additive Zeilen, TOOL_IDS 10→13.
  oeffnung: 'Öffnung',
  messen: 'Messen',
  kommentar: 'Kommentar',
  // v0.9.1 P-B1 (docs/V091-SPEZ.md §P-B1): additive Zeilen, TOOL_IDS 13→15.
  gelaender: 'Geländer',
  rampe: 'Rampe',
  // v0.9.2 P-D-Nachzug (docs/V092-SPEZ.md §P-D): additive Zeile, 15→16.
  detail: 'Detail',
};

const VIEW_LABEL: Record<ViewMode, string> = {
  '3d': '3D',
  '2d': '2D',
  split: 'Split',
  quad: 'Quad',
};

export interface UiAktionMeldung {
  /** Für `data-testid="kosmo-ui-aktion-${art}"` (Aufgabe 3, Sichtbare Ehrlichkeit).
   *  `'dock'` (P7, «Kosmo ordnet»; v0.8.0/PD2 erweitert um `ui.dockPresetSetzen`)
   *  deckt ALLE sieben schreibenden `ui.dock*`-Befehle ab — eine gemeinsame
   *  Test-ID, weil sie alle dieselbe Fläche (das Dock) betreffen, nicht sieben
   *  einzelne. */
  art: 'panel' | 'werkzeug' | 'ansicht' | 'modus' | 'automatik' | 'geschoss' | 'dock';
  /** Die Chat-Systemzeile, z.B. «Kosmo hat auf ‹PDF exportieren› gestellt — auf Wunsch.» */
  text: string;
}

const DOCK_ZIEL_LABEL: Record<'left' | 'right' | 'float', string> = {
  left: 'links angedockt',
  right: 'rechts angedockt',
  float: 'schweben lassen',
};

/**
 * Baut die Chat-Systemzeile für einen erfolgreich ausgeführten SCHREIBENDEN
 * `ui.*`-Befehl. `ui.zustandLesen` ist lesend — dafür gibt es bewusst KEINE
 * Meldung (`null`): eine Ehrlichkeits-Zeile für einen blossen Lesezugriff
 * wäre selbst schon der stille Zauber, den sie vermeiden soll (Rauschen ohne
 * Wirkung).
 */
function beschreibeAktion(befehlId: string, params: unknown, ergebnis?: unknown): UiAktionMeldung | null {
  switch (befehlId) {
    case 'ui.panelSetzen': {
      const p = params as { panel: PanelId; offen: boolean };
      return { art: 'panel', text: `Kosmo hat das ${PANEL_LABEL[p.panel]} ${p.offen ? 'geöffnet' : 'geschlossen'}.` };
    }
    case 'ui.werkzeugSetzen': {
      const p = params as { tool: ToolId };
      return { art: 'werkzeug', text: `Kosmo hat das Werkzeug ${TOOL_LABEL[p.tool]} gewählt.` };
    }
    case 'ui.ansichtSetzen': {
      const p = params as { viewMode: ViewMode };
      return { art: 'ansicht', text: `Kosmo hat die Ansicht auf ${VIEW_LABEL[p.viewMode]} gestellt.` };
    }
    case 'ui.modusSetzen': {
      const p = params as { modus: Arbeitsmodus | null };
      // Kritik-1-C1 (v0.6.6 UI-SELBSTKRITIK-066, kuratierter C-Befund 1): die
      // Begründung gehört in die Chat-Zeile — das Modus-Chip-MENÜ selbst
      // bleibt Stream-B-Gebiet, unangetastet. Kosmo entscheidet nie autonom
      // im Hintergrund: jeder `ui.modusSetzen`-Aufruf ist Antwort auf eine
      // Chat-Nachricht des Menschen — die Begründung ist deshalb IMMER
      // ehrlich «auf Wunsch» (keine erfundene Signal-Herleitung, die hier
      // gar nicht vorliegt — das ist die Automatik-Matrix, ein anderer Pfad).
      return {
        art: 'modus',
        text: p.modus
          ? `Kosmo hat auf ‹${ARBEITSMODUS_LABEL[p.modus]}› gestellt — auf Wunsch.`
          : 'Kosmo hat den Arbeitsmodus zurückgesetzt (Voll-Ansicht) — auf Wunsch.',
      };
    }
    case 'ui.modusAutomatik': {
      const p = params as { automatik: boolean };
      return {
        art: 'automatik',
        text: `Kosmo hat die Arbeitsmodus-Automatik ${p.automatik ? 'eingeschaltet' : 'ausgeschaltet'}.`,
      };
    }
    case 'ui.geschossSetzen': {
      // H-33: `ergebnis` (Rückgabe von `ui-befehle.ts`s `run()`) statt der
      // rohen `params` — das Modell liefert oft nur storeyId ODER index,
      // der Mensch soll aber immer den echten Geschossnamen sehen.
      const r = ergebnis as { name: string } | undefined;
      return {
        art: 'geschoss',
        text: `Kosmo hat das aktive Geschoss auf «${r?.name ?? '?'}» gestellt.`,
      };
    }
    // v0.7.8 Welle 3 (P7, «Kosmo ordnet») + v0.8.0 (PD2) — die sieben
    // schreibenden `ui.dock*`-Befehle, alle `art:'dock'`. Wie bei
    // `ui.geschossSetzen` (H-33) liest jeder Fall den ECHTEN Titel aus dem
    // `ergebnis` (Rückgabe von `dock-befehle.ts`s `run()`), nie aus den rohen
    // `params` — ein LLM kennt oft nur die `panelId`, nicht den
    // menschenlesbaren Titel.
    case 'ui.dockSetzen': {
      const r = ergebnis as UiDockSetzenErgebnis | undefined;
      return {
        art: 'dock',
        text: `Kosmo hat ‹${r?.titel ?? '?'}› ${r ? DOCK_ZIEL_LABEL[r.dock] : 'umgedockt'}.`,
      };
    }
    case 'ui.dockGroesseSetzen': {
      const r = ergebnis as UiDockGroesseErgebnis | undefined;
      return {
        art: 'dock',
        text: `Kosmo hat die Grösse von ‹${r?.titel ?? '?'}› auf ${r?.groesse ?? '?'}px gesetzt.`,
      };
    }
    case 'ui.dockAnheften': {
      const r = ergebnis as UiDockAnheftenErgebnis | undefined;
      return {
        art: 'dock',
        text: `Kosmo hat ‹${r?.titel ?? '?'}› ${r?.angeheftet ? 'angeheftet' : 'losgelöst'}.`,
      };
    }
    case 'ui.dockEinklappen': {
      const r = ergebnis as UiDockEinklappenErgebnis | undefined;
      return {
        art: 'dock',
        text: `Kosmo hat ‹${r?.titel ?? '?'}› ${r?.eingeklappt ? 'eingeklappt' : 'wieder geöffnet'}.`,
      };
    }
    case 'ui.dockZurueckLegen': {
      const r = ergebnis as UiDockErgebnis | undefined;
      return { art: 'dock', text: `Kosmo hat ‹${r?.titel ?? '?'}› zurück angedockt.` };
    }
    case 'ui.dockZuruecksetzen': {
      const r = ergebnis as UiDockZuruecksetzenErgebnis | undefined;
      return {
        art: 'dock',
        text: `Kosmo hat das Dock-Layout${r ? ` (${r.station})` : ''} zurückgesetzt.`,
      };
    }
    case 'ui.dockPresetSetzen': {
      const r = ergebnis as UiDockPresetErgebnis | undefined;
      return {
        art: 'dock',
        text: `Kosmo hat die Oberfläche${r ? ` (${r.station})` : ''} auf ‹${r?.titel ?? '?'}› gestellt.`,
      };
    }
    default:
      return null; // ui.zustandLesen / ui.dockLayoutLesen — lesend, keine Meldung.
  }
}

/** Rohe String-/undefined-Argumente eines LLM-Tool-Calls robust in ein Objekt verwandeln (gleicher Gedanke wie `validateToolCall`s Reparatur-Pfad, hier bewusst schlank: die eigentliche Validierung übernimmt `fuehreUiBefehlAus` per zod). */
function alsParamObjekt(args: unknown): unknown {
  if (typeof args !== 'string') return args ?? {};
  try {
    return JSON.parse(args);
  } catch {
    return {};
  }
}

/**
 * Die `ui.*`-Registry als Kosmo-Lesewerkzeuge (`ReadTool`, `packages/kosmo-ai`):
 * jeder Aufruf läuft SOFORT (`ChatSession.turn()`, `this.readTools.get(call.
 * name)` — Muster von `referenzen_suchen`/`quellen_suchen`), NIE über die
 * Diff-Karten-/Freigabe-Schiene (Begründung oben). `onAktion` bekommt bei
 * jedem SCHREIBENDEN Befehl eine für den Menschen lesbare Meldung — der
 * Aufrufer (`KosmoPanel.tsx`) macht daraus die sichtbare Chat-Systemzeile.
 * Scheitert die Ausführung (ungültige Parameter, `UiBefehlError`), wirft
 * `execute()` — `ChatSession.turn()` fängt das bereits ab und meldet es dem
 * Modell ehrlich als `FEHLER:`-Tool-Resultat (gleiches Muster wie jeder
 * andere `ReadTool`); es erscheint dann auch KEINE Aktionszeile — nur eine
 * tatsächlich vollzogene Änderung wird sichtbar quittiert.
 */
export function kosmoUiWerkzeuge(onAktion: (m: UiAktionMeldung) => void): ReadTool[] {
  const befehle: UiBefehl<unknown>[] = alleUiBefehle();
  const definitionen = externalTools(
    befehle.map((b) => ({ id: b.id, beschreibung: b.beschreibung, params: b.params as z.ZodType })),
  );
  return definitionen.map((def, i) => {
    const befehl = befehle[i]!;
    return {
      ...def,
      execute: (args: unknown) => {
        const params = alsParamObjekt(args);
        const ergebnis = fuehreUiBefehlAus(befehl.id, params);
        const meldung = beschreibeAktion(befehl.id, params, ergebnis);
        if (meldung) onAktion(meldung);
        return JSON.stringify(ergebnis);
      },
    };
  });
}
