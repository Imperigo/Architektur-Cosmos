import { STATIONS_MODUL_IDS, type StationModulId } from '../shell/stations-werkzeuge';
import { STATION_ZU_TOOLID } from './orbit-rang';
import type { NutzungsProfil } from './oberflaeche-adaption-kern';

/**
 * v0.8.1 / P15 (Nutzungszeit-Panel, `docs/V081-SPEZ.md` §7(f)/§9.5 C-34) —
 * reine, unit-getestete Ableitung ECHTER Nutzungsdaten aus dem bestehenden
 * Adaptions-Speicher (`kosmo.adaption.v1`, `state/oberflaeche-adaption-kern.ts`).
 * KEINE zweite Erfassung, KEIN neuer Speicher: dieses Modul liest nur ein
 * bereits geladenes `NutzungsProfil` (gewichteter Klickzähler + Zeitpunkt der
 * letzten Nutzung je Element, s. dortiger Kopfkommentar) und übersetzt es in
 * eine Anzeige-Tabelle für `shell/Einstellungen.tsx`.
 *
 * **Ehrlichkeitsgrenze (Owner-Auftrag wörtlich: «keine Attrappen-Zahlen»):**
 * eine durchgehend GEMESSENE Aufenthaltsdauer je Station (Minuten/Sekunden im
 * Vordergrund) wird HEUTE NIRGENDS im Repo erfasst (geprüft: kein
 * `usageMinutes`/Sitzungs-Timer existiert — `B-137`s «State-Kern» in
 * `docs/V080B-DESIGN-SPEZ.md` §9.15 ist ausdrücklich NICHT ANGEFASST/Prototyp-
 * only). Diese Datei ERFINDET darum keine Minutenzahl. Sie zeigt die ZWEI
 * Grössen, die tatsächlich existieren:
 *  1. das gewichtete Klick-/Nutzungsprofil (`orbit:<ToolId>`, s.
 *     `state/orbit-rang.ts`, gefüttert von `EntwurfsDock.tsx`s
 *     `toolNutzungMelden`-Aufrufen bei echten Stationswechseln) — als
 *     Nutzungs-HÄUFIGKEIT, nie als Zeit umbenannt;
 *  2. den echten `Date.now()`-Zeitstempel der letzten Nutzung (`zuletzt`) —
 *     daraus lässt sich eine WIRKLICH gemessene relative Zeitspanne
 *     («vor 5 Min.») ableiten, das ist die einzige Zeit-Grösse, die dieses
 *     Modul zeigt.
 * Stationen OHNE Rang-Zuordnung (`STATION_ZU_TOOLID` deckt nur die 7 BASE-
 * Matrix-Werkzeuge ab, s. dortiger Kommentar) bekommen ehrlich den Status
 * `'nicht-erfasst'` — NICHT dieselbe 0 wie eine Station, die zwar zählbar
 * wäre, aber schlicht noch nie besucht wurde (`'nie-genutzt'`). Diese
 * Unterscheidung ist der Kern der Ehrlichkeitsregel: eine erfundene 0 sähe
 * für beide Fälle gleich aus, obwohl nur der zweite Fall wirklich "0" bedeutet.
 */

export type StationErfassungsStatus = 'genutzt' | 'nie-genutzt' | 'nicht-erfasst';

export interface StationNutzungsEintrag {
  station: StationModulId;
  titel: string;
  status: StationErfassungsStatus;
  /** Gewichteter 7-Tage-Klickzähler (0, wenn `status !== 'genutzt'`). */
  gewicht: number;
  /** Echter `Date.now()`-Zeitstempel der letzten Nutzung, nur bei `'genutzt'`. */
  zuletztMs?: number;
}

/**
 * Anzeige-Titel je Station — dieselben Owner-Wortlaut-Namen wie die
 * `modules`-Registrierung in `App.tsx` (dort nicht exportiert, darum hier
 * als eigene, kleine Konstante dupliziert statt `App.tsx` anzufassen; die 14
 * Einträge sind gegen `STATIONS_MODUL_IDS`/`App.tsx`s `modules`-Tabelle
 * geprüft, s. `test/nutzungszeit.test.ts`).
 */
export const STATION_TITEL: Record<StationModulId, string> = {
  design: 'KosmoDesign',
  draw: 'KosmoDraw',
  sketch: 'KosmoSketch',
  data: 'KosmoData',
  vis: 'KosmoVis',
  publish: 'KosmoPublish',
  prepare: 'KosmoPrepare',
  asset: 'KosmoAsset',
  dev: 'KosmoDev',
  speak: 'KosmoSpeak',
  doc: 'KosmoDoc',
  train: 'KosmoTrain',
  trust: 'KosmoTrust',
  paket: 'KosmoPackage',
};

/** Alle 14 Stationen mit ihrem echten Erfassungsstatus, absteigend nach
 *  Gewicht sortiert (ungenutzt/nicht-erfasst hinten, stabile Reihenfolge
 *  innerhalb gleichen Gewichts über `STATIONS_MODUL_IDS`). */
export function stationsNutzung(profil: NutzungsProfil): StationNutzungsEintrag[] {
  const eintraege = STATIONS_MODUL_IDS.map((station): StationNutzungsEintrag => {
    const titel = STATION_TITEL[station];
    const toolId = STATION_ZU_TOOLID[station];
    if (!toolId) {
      return { station, titel, status: 'nicht-erfasst', gewicht: 0 };
    }
    const elementId = `orbit:${toolId}`;
    const gewicht = profil.zaehler[elementId] ?? 0;
    const zuletztMs = profil.zuletzt[elementId];
    if (gewicht <= 0 || zuletztMs === undefined) {
      return { station, titel, status: 'nie-genutzt', gewicht: 0 };
    }
    return { station, titel, status: 'genutzt', gewicht, zuletztMs };
  });
  return [...eintraege].sort((a, b) => b.gewicht - a.gewicht);
}

export interface WerkzeugNutzungsEintrag {
  /** Rohe `"<gruppe>:<name>"`-Element-Id, s. `oberflaeche-adaption-kern.ts`. */
  elementId: string;
  gewicht: number;
  zuletztMs: number;
}

/** Top-`n` Einzel-Werkzeuge/Stationen aus dem GESAMTEN Nutzungsprofil (jede
 *  Gruppe: `orbit:*` Stationen, `zeichnen:*`/`ebenen:*` Design-Werkzeuge,
 *  `navigation:*`/`suche:*` Data-Werkzeuge, …) — reine Top-N-Sortierung nach
 *  Gewicht, kein Gruppen-Filter (ergänzt `stationsNutzung`, die NUR die
 *  Stations-Ebene zeigt). Elemente ohne `zuletzt`-Zeitstempel (sollte laut
 *  `nutzungMelden` nicht vorkommen, s. dortiger Kommentar) werden defensiv
 *  ausgeschlossen statt mit einer erfundenen Zeit angezeigt. */
export function meistgenutzteElemente(profil: NutzungsProfil, n = 5): WerkzeugNutzungsEintrag[] {
  return Object.entries(profil.zaehler)
    .filter(([, gewicht]) => gewicht > 0)
    .map(([elementId, gewicht]) => ({ elementId, gewicht, zuletztMs: profil.zuletzt[elementId] }))
    .filter((e): e is WerkzeugNutzungsEintrag => e.zuletztMs !== undefined)
    .sort((a, b) => b.gewicht - a.gewicht)
    .slice(0, n);
}

/** `"<gruppe>:<name>"` → lesbarer Anzeigetext, z.B. `"orbit:draw"` →
 *  `"draw (orbit)"` — generische Best-Effort-Formatierung (keine Wunschtabelle
 *  je Element nötig, es sind potenziell Dutzende Ids über alle Stationen). */
export function lesbarerElementName(elementId: string): string {
  const [gruppe, ...rest] = elementId.split(':');
  const name = rest.join(':');
  return name ? `${name} (${gruppe})` : elementId;
}

const MINUTE_MS = 60_000;
const STUNDE_MS = 60 * MINUTE_MS;
const TAG_MS = 24 * STUNDE_MS;

/** Formatiert eine ECHTE, aus zwei realen Zeitstempeln berechnete Zeitspanne
 *  («vor 5 Min.») — erfindet keine Zeit, rundet nur ab (keine Sekunden-Hatz). */
export function formatiereZuletzt(zuletztMs: number, jetztMs: number = Date.now()): string {
  const deltaMs = Math.max(0, jetztMs - zuletztMs);
  if (deltaMs < MINUTE_MS) return 'gerade eben';
  if (deltaMs < STUNDE_MS) {
    const min = Math.floor(deltaMs / MINUTE_MS);
    return `vor ${min} Min.`;
  }
  if (deltaMs < TAG_MS) {
    const std = Math.floor(deltaMs / STUNDE_MS);
    return `vor ${std} Std.`;
  }
  const tage = Math.floor(deltaMs / TAG_MS);
  return `vor ${tage} Tag${tage === 1 ? '' : 'en'}`;
}
