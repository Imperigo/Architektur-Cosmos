/**
 * Kurztasten (v0.6.4, F5 — Navigation/Tastenkürzel wie ArchiCAD, Owner-Befund
 * 0.6.3: «beim modellieren des grundrisses eine tastenkombination oder so
 * einbauen um mich intuitiv bewegen zu können wie archicad»). Löst die
 * bisherige `zeichen-shortcuts.ts` (T3) ab und ergänzt sie um das
 * Auswahl-Werkzeug (A) — bisher war Esc der einzige Weg zurück zum Pfeil.
 * Reine Registry + reine Guard-Funktion (testbar ohne DOM):
 * `DesignWorkspace.tsx` bindet sie an ihren bestehenden `keydown`-Handler,
 * `shell/Kurzbefehle.tsx` zeigt sie im `?`-Overlay (generisch aus
 * `KURZTASTEN` abgeleitet — jeder neue Eintrag hier erscheint dort ohne
 * weitere Verdrahtung).
 *
 * Inventar der Werkzeugleiste (`ZEICHEN_WERKZEUGE_LEISTE`, DesignWorkspace.tsx):
 * Auswahl, Wand, Volumen, Zone, Dach, Treppe, Stütze — plus die drei
 * Klickmodus-Werkzeuge Öffnung/Messen/Kommentar (v0.8.3 E1-E3, bisher NUR
 * über die Island-Werkzeugleiste erreichbar, `island-katalog.ts`) und Mesh
 * (Block 3 / E4). Schnitt/Skizze sitzen seit v0.8.1/P4 in eigenen
 * Kontextzeilen, tragen aber weiterhin Kürzel.
 *
 * v0.8.4 PB5 (§7 D13, `docs/V084-SPEZ.md`): Öffnung/Messen/Kommentar bekommen
 * hier ihre ERSTEN Tastenkürzel — vorher nur per Klick auf die
 * `island-werkzeug-*`-Knöpfe erreichbar, in der `manuell`-Oberfläche (kein
 * Island-Rollout) bislang GAR NICHT auslösbar. Der bestehende
 * `kurztasteFuer`-Aufrufer in `DesignWorkspace.tsx` ist bereits generisch
 * (`setTool(werkzeug as ToolId)` für JEDE aufgelöste `WerkzeugId`) — reine
 * additive Registry-Erweiterung, keine App-Änderung nötig. Öffnung/Messen
 * funktionieren dadurch jetzt auch STANDALONE in `manuell` (Wandtreffer bzw.
 * Klickkette + Escape/Doppelklick/Enter committen ohne Insel-Popup); der
 * Kommentar-Klick setzt weiterhin nur den Punkt — das Erfassen-Formular
 * (Text/Autor) lebt bewusst in der PROJEKT-Insel (`island/inhalte/
 * projekt.tsx`, ausserhalb dieses Dateikreises) und bleibt unverändert die
 * einzige Stelle, die `design.kommentarSetzen` committet. Zusätzlich ein
 * Kürzel für das bisher absichtlich unbelegte Mesh-Werkzeug (N — «Netz»),
 * da eine freie, kollisionsfreie Taste zur Verfügung steht.
 *
 * Belegung (dokumentiert im `?`-Overlay UND in den Werkzeug-Tooltips):
 *   A Auswahl · W Wand · Z Zone · V Volumen · D Dach · T Treppe ·
 *   C Stütze (Column) · S Schnitt · F Freihand-Skizze ·
 *   O Öffnung · M Messen (Masskette) · K Kommentar · N Mesh (Netz) ·
 *   Esc zurück zur Auswahl (+ Kette abbrechen) · Leertaste halten = Pan (2D)
 *
 * v0.6.6 / Welle 2 Stream C (MOTION-KONZEPT-066 §6): `kurztasteFuer` löst bei
 * jedem erfolgreichen Werkzeugwechsel EINEN kurzen Haptik-Tick aus
 * (`state/haptik.ts`, streng feature-detected, still ohne `navigator.vibrate`
 * — auf Desktop/Tauri passiert nichts). Das bleibt ein reiner Seiteneffekt
 * OHNE Einfluss auf den Rückgabewert — die Funktion ist für den Aufrufer
 * (`DesignWorkspace.tsx`, unverändert) weiterhin deterministisch, nur die
 * Testumgebung sieht zusätzlich einen (im Testlauf wirkungslosen) Vibrations-
 * Versuch.
 */

import { tick as haptikTick } from '../../state/haptik';

export type WerkzeugId =
  | 'auswahl'
  | 'wand'
  | 'volumen'
  | 'zone'
  | 'dach'
  | 'treppe'
  | 'stuetze'
  | 'schnitt'
  | 'skizze'
  // v0.8.4 PB5 (§7 D13): additiv, 1:1 dieselben Werte wie `state/ui-zustand.ts`s
  // `ToolId` (dort schon vorhanden, hier bisher ohne Kürzel).
  | 'oeffnung'
  | 'messen'
  | 'kommentar'
  | 'mesh';

export interface KurztastenEintrag {
  /** Einzelner Buchstabe, klein geschrieben (Vergleich ist case-insensitiv). */
  taste: string;
  werkzeug: WerkzeugId;
  beschrieb: string;
}

export const KURZTASTEN: readonly KurztastenEintrag[] = [
  { taste: 'a', werkzeug: 'auswahl', beschrieb: 'Auswahl' },
  { taste: 'w', werkzeug: 'wand', beschrieb: 'Wand' },
  { taste: 'z', werkzeug: 'zone', beschrieb: 'Zone' },
  { taste: 'v', werkzeug: 'volumen', beschrieb: 'Volumen' },
  { taste: 'd', werkzeug: 'dach', beschrieb: 'Dach' },
  { taste: 't', werkzeug: 'treppe', beschrieb: 'Treppe' },
  { taste: 'c', werkzeug: 'stuetze', beschrieb: 'Stütze (Column)' },
  { taste: 's', werkzeug: 'schnitt', beschrieb: 'Schnitt' },
  { taste: 'f', werkzeug: 'skizze', beschrieb: 'Freihand-Skizze' },
  // v0.8.4 PB5 (§7 D13): vier neue, kollisionsfreie Kürzel — geprüft gegen
  // die neun bestehenden UND gegen die globalen Kürzel in `shell/Kurzbefehle.tsx`
  // (?, 0-9, Ctrl+K, Ctrl+Z — alle modifiziert oder Ziffern, keine Kollision
  // mit einem einzelnen Buchstaben).
  { taste: 'o', werkzeug: 'oeffnung', beschrieb: 'Öffnung' },
  { taste: 'm', werkzeug: 'messen', beschrieb: 'Messen (Masskette)' },
  { taste: 'k', werkzeug: 'kommentar', beschrieb: 'Kommentar' },
  { taste: 'n', werkzeug: 'mesh', beschrieb: 'Mesh (Netz)' },
];

/** Werkzeug-Id für eine gedrückte Taste, oder null (unbekannte Taste). */
export function werkzeugFuerTaste(taste: string): WerkzeugId | null {
  const t = taste.toLowerCase();
  return KURZTASTEN.find((k) => k.taste === t)?.werkzeug ?? null;
}

/**
 * Fokus-Guard: true, wenn das übergebene Element ein Eingabefeld ist
 * (input/textarea/select/contenteditable) — Kurztasten dürfen dort NIE
 * feuern (es gibt Kosmo-Chat-Eingaben, die einzelne Buchstaben brauchen).
 * Der Aufrufer übergibt `document.activeElement`, damit diese Funktion
 * selbst DOM-frei bleibt und mit einem simplen Fake-Objekt testbar ist.
 */
export function istEingabefeld(el: { tagName?: string; isContentEditable?: boolean } | null): boolean {
  if (!el) return false;
  return el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable === true;
}

/**
 * Reine Kurztasten-Auflösung fürs `keydown`-Handling: liefert die Werkzeug-Id
 * oder null (unbekannte Taste, ein Modifier ist gedrückt, Tastenwiederholung,
 * oder der Fokus liegt in einem Eingabefeld). Der Fokus-Guard kommt als
 * Parameter herein (siehe `istEingabefeld`) statt selbst `document` zu lesen —
 * das hält die Funktion pure und ohne DOM testbar.
 */
export function kurztasteFuer(
  event: Pick<KeyboardEvent, 'key' | 'repeat' | 'metaKey' | 'ctrlKey' | 'altKey'>,
  fokusImEingabefeld: boolean,
): WerkzeugId | null {
  if (event.repeat || event.metaKey || event.ctrlKey || event.altKey || fokusImEingabefeld) return null;
  const werkzeug = werkzeugFuerTaste(event.key);
  if (werkzeug) haptikTick(); // §6: Werkzeugwechsel-Pfad — kurzer Tick, still ohne Touch-Support
  return werkzeug;
}

// ---------------------------------------------------------------------------
// F9 — kontextabhängige Maus im 2D-Plan (Owner-Befund 0.6.3: «die maus sollte
// sich zudem an die verschiedenen bereichen anpassen können, sprich sie
// sollte auf die umgebung reagieren»). Dieselbe Systematik wie
// `werkzeugCursorFuer` in `eingabe-3d.ts` — nur um den Hover-Treffer/
// Auswahl-Zustand erweitert, den nur der 2D-Plan kennt (Hit-Test über
// `plan-hit-test.ts`, das 3D-Viewport pickt anders). Reine Funktion, DOM-frei
// testbar (alle Zweige).

export interface Cursor2dEingabe {
  /** Auswahl-Werkzeug aktiv? (sonst: irgendein Zeichenwerkzeug → Fadenkreuz) */
  istAuswahlWerkzeug: boolean;
  /** Leertaste gehalten ODER die Nav-Leiste steht auf «Pan» (`navModus2d`). */
  spaceOderPanModus: boolean;
  /** Die Maus ist gerade aktiv am Verschieben der Ansicht (Taste unten). */
  ziehtGerade: boolean;
  /** Auswahl-Werkzeug: die Maus schwebt über einem treffbaren Bauteil. */
  hoverTrifftElement: boolean;
  /** …und dieses Bauteil ist bereits ausgewählt (ein Ziehen würde verschieben). */
  hoverIstAusgewaehlt: boolean;
}

/**
 * Cursor-Stil (CSS `cursor`-Wert) für den 2D-Plan, je Kontext:
 *   Pan (Space/Nav-Leiste)         → grab / grabbing (während des Ziehens)
 *   Zeichenwerkzeug                → crosshair
 *   Auswahl über gewähltem Element → move
 *   Auswahl über einem Treffer     → pointer
 *   sonst (Auswahl, freie Fläche)  → default
 */
export function cursor2dFuer(e: Cursor2dEingabe): string {
  if (e.spaceOderPanModus) return e.ziehtGerade ? 'grabbing' : 'grab';
  if (!e.istAuswahlWerkzeug) return 'crosshair';
  if (e.hoverTrifftElement) return e.hoverIstAusgewaehlt ? 'move' : 'pointer';
  return 'default';
}
