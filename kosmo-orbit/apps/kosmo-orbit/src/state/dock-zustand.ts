import { create } from 'zustand';
import { DOCK_KONSTANTEN, type DockModus, type DockZone, type FloatAnker, type PanelOverride } from './dock-kern';
import { presetFuer, type DockPreset, type PresetId, type PresetStation } from './dock-presets';
import type { DockStation } from './dock-stationen';

/**
 * Dock-Zustand (v0.7.8 Welle 1 / Paket P2 — «Intelligente Werkzeugtabs») —
 * der persistente Layout-Store fürs neue Dock-System, analog zum Muster in
 * `ui-zustand.ts` (`localStorage`, Versionierung, In-Memory-Stub, defensives
 * Parsen + `normalisiere()`). NICHT `ui-zustand.ts` selbst — dieser Store
 * ergänzt ihn nur.
 *
 * **Warum KEINE offen/zu-Verwaltung hier**: die Sichtbarkeits-Booleans
 * (`studieOffen`, `drawOffen`, … `PANEL_IDS` in `ui-zustand.ts`) bleiben
 * bewusst dort, wo sie heute sind. Zwei bestehende Konsumenten lesen diese
 * Booleans DIREKT (nicht über einen Dock-Layout-Umweg):
 *   1. die Arbeitsmodi-Signale (`arbeitsmodi-kern.ts`, `panels: ['studieOffen',
 *      'sonneOffen']` etc. — erkennt den aktuellen Arbeitsmodus u.a. daran,
 *      welche Panels offen sind);
 *   2. der Dimm-Guard in `DesignWorkspace.tsx` (Z.1142ff., die grosse
 *      `sonneOffen || drawOffen || … `-Disjunktion, die den Viewport abdunkelt,
 *      sobald IRGENDEIN Panel offen ist).
 * Beide lesen `useUiZustand` synchron und würden bei einer Verlagerung nach
 * hier eine zweite Quelle der Wahrheit brauchen. Dieser Store verwaltet daher
 * NUR das WIE (Position/Grösse/Andockung/Anheftung — `PanelOverride`), nicht
 * das OB (offen/zu bleibt exklusiv `ui-zustand.ts`). P3 verdrahtet beide
 * Stores nebeneinander: `ui-zustand` liefert `start`/`geschlossen` faktisch
 * über die Booleans, `dock-zustand` liefert alles andere aus `layoutFuer()`.
 *
 * **Persistenz** (`localStorage`, Schlüssel `kosmo.dock.v1`): `modus` (A/B)
 * und je Layout-Schlüssel (`${modus}:${station}`, wie im Prototyp) die
 * Spaltenbreiten + Panel-Overrides. Panel-`eingeklappt`/`geschlossen` liegt
 * technisch IN `PanelOverride` (Typ aus `dock-kern.ts`, dort für den Solver
 * gebraucht) und wird hier mitpersistiert — das ist kein Widerspruch zum
 * Punkt oben: es ist die vom SOLVER verstandene Eingeklappt-Repräsentation
 * (Tab-Höhe `COLLH`), nicht dasselbe Feld wie `ui-zustand`s `…Offen`-Booleans
 * (P3 muss beide beim Rendern in Einklang bringen, s. `dock-stationen.ts`
 * Kopfkommentar zur `unternehmerplan`-Lücke).
 *
 * **v0.8.0 (PD1) — `aktivesPreset`**: additive Erweiterung für die kuratierten
 * Layout-Varianten aus `dock-presets.ts` (`'fokus' | 'arbeiten' | 'pruefen'`,
 * je Station `'design'`/`'vis'`). Dieser Store merkt sich nur, WELCHES Preset
 * je Station zuletzt gewählt wurde (`presetSetzen()` schreibt es UND wendet
 * dessen `overrides`/`leftW`/`rightW` über die bestehenden Aktionen an —
 * Booleans/`offen` bleiben aussen vor, s. `dock-presets.ts`-Kopfkommentar).
 * Fehlt ein Eintrag (z.B. alter `localStorage`-Stand ohne das Feld, oder eine
 * Station, für die nie `presetSetzen()` lief), gilt das als «kein Preset
 * aktiv» — funktional identisch zum heutigen (v0.7.9) Verhalten, NICHT
 * automatisch `'fokus'`: der Owner-Auftrag zieht die «richtige» Default-
 * Oberfläche («fokus» beim ECHTEN Erststart) bewusst in PD2, dort wo der
 * Erststart selbst erkannt wird — diese Datei liefert nur den Mechanismus.
 */

// ---------------------------------------------------------------------------
// Öffentliche Typen
// ---------------------------------------------------------------------------

/** Ein Layout-Eintrag, wie er im Speicher liegt — Felder optional (fehlend
 *  heisst „noch nie manuell verändert“, `layoutFuer()` füllt Defaults). */
export interface DockStationLayout {
  leftW?: number;
  rightW?: number;
  panels: Record<string, PanelOverride>;
}

/** Ergebnis von `layoutFuer()` — IMMER vollständig (leftW/rightW aufgelöst),
 *  direkt als `solve()`-Eingabe (`opts.leftW`/`opts.rightW`/`opts.overrides`)
 *  aus `dock-kern.ts` verwendbar. */
export interface DockLayoutAufgeloest {
  leftW: number;
  rightW: number;
  panels: Record<string, PanelOverride>;
}

/**
 * Patch-Typ für `panelOverrideSetzen`/`panelOverridesSetzen`: jedes Feld darf
 * explizit `undefined` sein, um es zu LÖSCHEN (statt es auf `undefined` zu
 * setzen — mit `exactOptionalPropertyTypes` sind das zwei verschiedene
 * Dinge). `Partial<PanelOverride>` allein würde das nicht erlauben, weil
 * `exactOptionalPropertyTypes` ein optionales Feld ohne `| undefined` im
 * Typ als „darf fehlen, aber wenn vorhanden, nicht undefined“ liest.
 */
export type PanelOverridePatch = { [K in keyof PanelOverride]?: PanelOverride[K] | undefined };

// ---------------------------------------------------------------------------
// Speicher-Layer (localStorage, kosmo.dock.v1) — Muster 1:1 wie
// `ui-zustand.ts` (eigene Kopie hier, da die Helfer dort nicht exportiert
// sind und diese Datei `ui-zustand.ts` nicht anfassen soll).
// ---------------------------------------------------------------------------

const STORAGE_KEY = 'kosmo.dock.v1';

interface DockSpeicher {
  version: 1;
  modus: DockModus;
  layouts: Record<string, DockStationLayout>;
  /** v0.8.0 (PD1) — je Station das zuletzt gewählte Preset, s. Kopfkommentar.
   *  `Partial<Record<...>>` statt `Record<...>`, weil `'plan'` NIE einen
   *  Eintrag bekommt (keine Presets, s. `dock-presets.ts`s `PresetStation`)
   *  und weil frisch installierte/alte Speicherstände hier schlicht leer
   *  sind. */
  aktivesPreset: Partial<Record<DockStation, PresetId>>;
}

function basisSpeicher(): DockSpeicher {
  return { version: 1, modus: 'A', layouts: {}, aktivesPreset: {} };
}

/** Minimaler In-Memory-Ersatz, falls die Laufzeit kein `localStorage` kennt
 *  (z.B. Vitest ohne jsdom) — 1:1 dasselbe Muster wie in `ui-zustand.ts`. */
function installiereStorageStubFallsFehlt(): void {
  const global_ = globalThis as { localStorage?: Storage };
  if (typeof global_.localStorage !== 'undefined') return;
  const speicher = new Map<string, string>();
  const stub: Storage = {
    get length() {
      return speicher.size;
    },
    clear() {
      speicher.clear();
    },
    getItem(key: string) {
      return speicher.has(key) ? speicher.get(key)! : null;
    },
    key(index: number) {
      return [...speicher.keys()][index] ?? null;
    },
    removeItem(key: string) {
      speicher.delete(key);
    },
    setItem(key: string, value: string) {
      speicher.set(key, String(value));
    },
  };
  global_.localStorage = stub;
}
installiereStorageStubFallsFehlt();

function holeStorage(): Storage | undefined {
  try {
    return typeof localStorage === 'undefined' ? undefined : localStorage;
  } catch {
    return undefined;
  }
}

function istDockZone(w: unknown): w is DockZone {
  return w === 'rail' || w === 'left' || w === 'right' || w === 'float';
}

function istFloatAnker(w: unknown): w is FloatAnker {
  return w === 'top' || w === 'bottom-center' || w === 'bottom-left';
}

/** Defensiv: pickt aus einem unbekannten Wert nur die gültigen
 *  `PanelOverride`-Felder heraus, verwirft alles andere. */
function normalisierePanelOverride(wert: unknown): PanelOverride {
  if (typeof wert !== 'object' || wert === null) return {};
  const w = wert as Record<string, unknown>;
  return {
    ...(istDockZone(w['dock']) ? { dock: w['dock'] } : {}),
    ...(istFloatAnker(w['anker']) ? { anker: w['anker'] } : {}),
    ...(typeof w['groesse'] === 'number' ? { groesse: w['groesse'] } : {}),
    ...(typeof w['eingeklappt'] === 'boolean' ? { eingeklappt: w['eingeklappt'] } : {}),
    ...(typeof w['angeheftet'] === 'boolean' ? { angeheftet: w['angeheftet'] } : {}),
    ...(typeof w['fx'] === 'number' ? { fx: w['fx'] } : {}),
    ...(typeof w['fy'] === 'number' ? { fy: w['fy'] } : {}),
    ...(typeof w['fw'] === 'number' ? { fw: w['fw'] } : {}),
    ...(typeof w['fh'] === 'number' ? { fh: w['fh'] } : {}),
    ...(typeof w['geschlossen'] === 'boolean' ? { geschlossen: w['geschlossen'] } : {}),
  };
}

function istEbenesObjekt(wert: unknown): wert is Record<string, unknown> {
  return typeof wert === 'object' && wert !== null && !Array.isArray(wert);
}

/** Defensiv: baut aus einem unbekannten Wert einen vollständigen
 *  `DockStationLayout` — fehlende/kaputte Teile fallen auf „kein Override“. */
function normalisiereLayout(wert: unknown): DockStationLayout {
  if (!istEbenesObjekt(wert)) return { panels: {} };
  const panelsRoh = istEbenesObjekt(wert['panels']) ? wert['panels'] : {};
  const panels: Record<string, PanelOverride> = {};
  for (const [id, ov] of Object.entries(panelsRoh)) {
    panels[id] = normalisierePanelOverride(ov);
  }
  return {
    ...(typeof wert['leftW'] === 'number' ? { leftW: wert['leftW'] } : {}),
    ...(typeof wert['rightW'] === 'number' ? { rightW: wert['rightW'] } : {}),
    panels,
  };
}

/** Top-level-Form-Check — NUR grob (Version + Typen der Top-Felder, falls
 *  vorhanden). Die eigentliche Härte gegen kaputte/teilweise Daten passiert
 *  in `normalisiere()`/`normalisiereLayout()`, analog zu `ui-zustand.ts`s
 *  Trennung „ungültiger Typ macht den Datensatz ungültig, FEHLENDES Feld
 *  bekommt beim Normalisieren einen Default“. */
function istGueltigerSpeicher(wert: unknown): wert is Record<string, unknown> {
  if (!istEbenesObjekt(wert)) return false;
  if (wert['version'] !== 1) return false;
  if ('modus' in wert && wert['modus'] !== undefined && wert['modus'] !== 'A' && wert['modus'] !== 'B') return false;
  if ('layouts' in wert && wert['layouts'] !== undefined && !istEbenesObjekt(wert['layouts'])) return false;
  // 'aktivesPreset' ist v0.8.0 (PD1) additiv — kein Top-Level-Formcheck nötig
  // über den generischen `istEbenesObjekt`-Fall hinaus: ein ungültiger Wert
  // (falscher Typ, unbekannte Station/Preset-ID) wird defensiv in
  // `normalisiereAktivesPreset()` gefiltert, exakt wie bei `layouts` oben.
  return true;
}

const GUELTIGE_STATIONEN: readonly DockStation[] = ['design', 'plan', 'vis'];
const GUELTIGE_PRESET_IDS: readonly PresetId[] = ['fokus', 'arbeiten', 'pruefen'];

function istDockStation(wert: unknown): wert is DockStation {
  return (GUELTIGE_STATIONEN as readonly unknown[]).includes(wert);
}

function istPresetId(wert: unknown): wert is PresetId {
  return (GUELTIGE_PRESET_IDS as readonly unknown[]).includes(wert);
}

/** Defensiv: pickt aus einem unbekannten Wert nur gültige
 *  Station→PresetId-Paare heraus, verwirft alles andere (ungültiger
 *  Stations-/Preset-Name, falscher Typ) — 1:1 dasselbe Härtungs-Muster wie
 *  `normalisierePanelOverride`. Rückwärtskompatibel: fehlt das Feld ganz
 *  (alter Speicher vor PD1), liefert `istEbenesObjekt` hier `false` und diese
 *  Funktion gibt `{}` zurück, kein Crash. */
function normalisiereAktivesPreset(wert: unknown): Partial<Record<DockStation, PresetId>> {
  if (!istEbenesObjekt(wert)) return {};
  const ergebnis: Partial<Record<DockStation, PresetId>> = {};
  for (const [station, presetId] of Object.entries(wert)) {
    if (istDockStation(station) && istPresetId(presetId)) {
      ergebnis[station] = presetId;
    }
  }
  return ergebnis;
}

function normalisiere(wert: Record<string, unknown>): DockSpeicher {
  const modus: DockModus = wert['modus'] === 'B' ? 'B' : 'A';
  const layoutsRoh = istEbenesObjekt(wert['layouts']) ? wert['layouts'] : {};
  const layouts: Record<string, DockStationLayout> = {};
  for (const [key, layout] of Object.entries(layoutsRoh)) {
    layouts[key] = normalisiereLayout(layout);
  }
  const aktivesPreset = normalisiereAktivesPreset(wert['aktivesPreset']);
  return { version: 1, modus, layouts, aktivesPreset };
}

/** Defensiver Lese-Weg: kaputtes JSON/falsche Form → Basiszustand, kein Crash. */
function ladeSpeicherRoh(): DockSpeicher {
  const storage = holeStorage();
  if (!storage) return basisSpeicher();
  let roh: string | null;
  try {
    roh = storage.getItem(STORAGE_KEY);
  } catch {
    return basisSpeicher();
  }
  if (!roh) return basisSpeicher();
  try {
    const geparst: unknown = JSON.parse(roh);
    if (!istGueltigerSpeicher(geparst)) return basisSpeicher();
    return normalisiere(geparst);
  } catch {
    return basisSpeicher();
  }
}

function schreibeSpeicher(speicher: DockSpeicher): void {
  const storage = holeStorage();
  if (!storage) return;
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(speicher));
  } catch {
    // Privater Modus/volles Kontingent — bleibt flüchtig für diese Sitzung.
  }
}

function persistiere(zustand: Pick<DockZustand, 'modus' | 'layouts' | 'aktivesPreset'>): void {
  schreibeSpeicher({ version: 1, modus: zustand.modus, layouts: zustand.layouts, aktivesPreset: zustand.aktivesPreset });
}

// ---------------------------------------------------------------------------
// Hilfsfunktionen
// ---------------------------------------------------------------------------

function layoutKey(modus: DockModus, station: DockStation): string {
  return `${modus}:${station}`;
}

function klemme(px: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, px));
}

/** Wendet einen `PanelOverridePatch` auf einen bestehenden Override an —
 *  Felder mit explizitem `undefined` werden GELÖSCHT (nicht auf `undefined`
 *  gesetzt), alle anderen überschrieben. */
function wendePatchAn(bestehend: PanelOverride, patch: PanelOverridePatch): PanelOverride {
  const naechste: Record<string, unknown> = { ...bestehend };
  for (const [feld, wert] of Object.entries(patch)) {
    if (wert === undefined) {
      delete naechste[feld];
    } else {
      naechste[feld] = wert;
    }
  }
  return naechste as PanelOverride;
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export interface DockZustand {
  modus: DockModus;
  /** Schlüssel `${modus}:${station}` → Layout-Eintrag. */
  layouts: Record<string, DockStationLayout>;
  /** v0.8.0 (PD1) — je Station das zuletzt per `presetSetzen()` gewählte
   *  Preset (s. Kopfkommentar). Fehlt ein Eintrag, ist «kein Preset aktiv»
   *  gemeint — NICHT implizit `'arbeiten'` als gespeicherter Wert (der
   *  Fallback-CHARAKTER von `'arbeiten'` ist rein semantisch: es ist das
   *  Preset, das am wenigsten vom heutigen Ist-Zustand abweicht). */
  aktivesPreset: Partial<Record<DockStation, PresetId>>;

  modusSetzen: (m: DockModus) => void;
  leftWSetzen: (station: DockStation, px: number) => void;
  rightWSetzen: (station: DockStation, px: number) => void;
  /** Setzt/löscht einzelne Override-Felder eines Panels (löscht Felder mit
   *  `undefined` im Patch wirklich, statt sie auf `undefined` zu setzen). */
  panelOverrideSetzen: (station: DockStation, panelId: string, patch: PanelOverridePatch) => void;
  /** Wie `panelOverrideSetzen`, aber für mehrere Panels ATOMAR in einem
   *  Schreibvorgang — für den row-Splitter, der zwei Nachbarn gleichzeitig
   *  verändert (sonst würde ein Zwischenzustand persistiert). */
  panelOverridesSetzen: (station: DockStation, patches: Record<string, PanelOverridePatch>) => void;
  /** v0.8.0 (PD1) — merkt sich `id` als aktives Preset der Station UND wendet
   *  dessen `overrides`/`leftW`/`rightW` sofort über die bestehenden Aktionen
   *  an (`leftWSetzen`/`rightWSetzen`/`panelOverridesSetzen`) — ausgehend von
   *  einem für diesen Schlüssel geleerten Layout, damit KEINE manuellen
   *  Alt-Overrides von vorher übrig bleiben (die Kuration soll exakt dem
   *  Preset entsprechen, nicht Preset⊕Reste). `offen`/Booleans bleiben
   *  aussen vor — s. `dock-presets.ts`-Kopfkommentar (Zwei-Schichten-Modell). */
  presetSetzen: (station: PresetStation, id: PresetId) => void;
  /** «Auf schlaues Layout zurücksetzen» — löscht den aktiven Schlüssel
   *  (`${modus}:${station}`), alle anderen Stationen/Modi bleiben unberührt.
   *  v0.8.0 (PD1) GEÄNDERT: ist für die Station ein Preset aktiv
   *  (`aktivesPreset[station]`), landet man NICHT mehr auf einem leeren
   *  Layout, sondern wieder GENAU auf dessen Kuration (dieselbe Anwend-Logik
   *  wie `presetSetzen`, minus dem erneuten Schreiben von `aktivesPreset`
   *  selbst, das bleibt unverändert). Ohne aktives Preset (z.B. `'plan'`,
   *  das nie eins bekommen kann, oder eine Station, für die `presetSetzen()`
   *  nie lief) bleibt es exakt das bisherige Verhalten: leeres Layout. */
  layoutZuruecksetzen: (station: DockStation) => void;
  /** Gemergte Overrides für die aktive `modus`+`station`-Kombination — IMMER
   *  vollständig (leftW/rightW aufgelöst mit `DOCK_KONSTANTEN`-Defaults). */
  layoutFuer: (station: DockStation) => DockLayoutAufgeloest;
  /** v0.7.8 Welle 3 (P8, Geführte Tour): setzt `modus`+`layouts` EXAKT auf die
   *  übergebenen Werte (und persistiert danach) — für `DockTour.tsx`, das
   *  beim Beenden den kompletten Vor-Tour-Zustand wiederherstellen muss.
   *  Bewusst additiv statt über die einzelnen Patch-Aktionen (die kennen nur
   *  "aktuellen Override ändern", kein "auf genau DIESEN Schnappschuss
   *  zurücksetzen") — ein Rundgang, der 7 Demo-Layouts durchläuft, müsste
   *  sonst jedes einzelne Feld von Hand zurückrechnen. */
  zustandWiederherstellen: (modus: DockModus, layouts: Record<string, DockStationLayout>) => void;
}

function anfangsZustand(): Pick<DockZustand, 'modus' | 'layouts' | 'aktivesPreset'> {
  const gespeichert = ladeSpeicherRoh();
  return { modus: gespeichert.modus, layouts: gespeichert.layouts, aktivesPreset: gespeichert.aktivesPreset };
}

/**
 * Wendet ein Preset auf den `${modus}:${station}`-Schlüssel an: leert ihn
 * zuerst (kein Vermischen mit alten manuellen Overrides), setzt dann
 * `leftW`/`rightW`/`overrides` über die BESTEHENDEN Aktionen (nicht über
 * einen zweiten, parallelen Schreibweg) — geteilte Hilfsfunktion für
 * `presetSetzen` und `layoutZuruecksetzen` (mit aktivem Preset). Persistiert
 * am Ende selbst noch einmal, damit auch ein Preset ohne `leftW`/`rightW`/
 * `overrides` (rein hypothetisch, aktuell hat keines das) sicher geschrieben
 * wird — die einzelnen Aktionen persistieren zwar schon selbst, ein
 * zusätzlicher Schreibvorgang mit identischem Inhalt ist dabei harmlos.
 */
function wendePresetLayoutAn(get: () => DockZustand, set: (teil: Partial<DockZustand>) => void, station: PresetStation, preset: DockPreset): void {
  const { modus, layouts } = get();
  const key = layoutKey(modus, station);
  if (key in layouts) {
    const geleert = { ...layouts };
    delete geleert[key];
    set({ layouts: geleert });
  }
  if (preset.leftW !== undefined) get().leftWSetzen(station, preset.leftW);
  if (preset.rightW !== undefined) get().rightWSetzen(station, preset.rightW);
  if (Object.keys(preset.overrides).length > 0) get().panelOverridesSetzen(station, preset.overrides);
  persistiere(get());
}

export const useDockZustand = create<DockZustand>((set, get) => ({
  ...anfangsZustand(),

  modusSetzen: (m) => {
    set({ modus: m });
    persistiere(get());
  },

  leftWSetzen: (station, px) => {
    const { modus, layouts } = get();
    const key = layoutKey(modus, station);
    const bestehend = layouts[key] ?? { panels: {} };
    const naechste = { ...layouts, [key]: { ...bestehend, leftW: klemme(px, DOCK_KONSTANTEN.MIN_LEFT, DOCK_KONSTANTEN.MAX_LEFT) } };
    set({ layouts: naechste });
    persistiere(get());
  },

  rightWSetzen: (station, px) => {
    const { modus, layouts } = get();
    const key = layoutKey(modus, station);
    const bestehend = layouts[key] ?? { panels: {} };
    const naechste = { ...layouts, [key]: { ...bestehend, rightW: klemme(px, DOCK_KONSTANTEN.MIN_RIGHT, DOCK_KONSTANTEN.MAX_RIGHT) } };
    set({ layouts: naechste });
    persistiere(get());
  },

  panelOverrideSetzen: (station, panelId, patch) => {
    const { modus, layouts } = get();
    const key = layoutKey(modus, station);
    const bestehend = layouts[key] ?? { panels: {} };
    const panels = { ...bestehend.panels, [panelId]: wendePatchAn(bestehend.panels[panelId] ?? {}, patch) };
    set({ layouts: { ...layouts, [key]: { ...bestehend, panels } } });
    persistiere(get());
  },

  panelOverridesSetzen: (station, patches) => {
    const { modus, layouts } = get();
    const key = layoutKey(modus, station);
    const bestehend = layouts[key] ?? { panels: {} };
    const panels = { ...bestehend.panels };
    for (const [panelId, patch] of Object.entries(patches)) {
      panels[panelId] = wendePatchAn(panels[panelId] ?? {}, patch);
    }
    set({ layouts: { ...layouts, [key]: { ...bestehend, panels } } });
    persistiere(get());
  },

  presetSetzen: (station, id) => {
    const preset = presetFuer(station, id);
    wendePresetLayoutAn(get, set, station, preset);
    const aktivesPreset = { ...get().aktivesPreset, [station]: id };
    set({ aktivesPreset });
    persistiere(get());
  },

  layoutZuruecksetzen: (station) => {
    if (station === 'design' || station === 'vis') {
      const aktivId = get().aktivesPreset[station];
      if (aktivId !== undefined) {
        // v0.8.0 (PD1): mit aktivem Preset heisst "zurücksetzen" wieder auf
        // dessen Kuration, nicht auf ein leeres Layout (s. Interface-Kommentar).
        wendePresetLayoutAn(get, set, station, presetFuer(station, aktivId));
        return;
      }
    }
    const { modus, layouts } = get();
    const key = layoutKey(modus, station);
    if (!(key in layouts)) return;
    const naechste = { ...layouts };
    delete naechste[key];
    set({ layouts: naechste });
    persistiere(get());
  },

  layoutFuer: (station) => {
    const { modus, layouts } = get();
    const key = layoutKey(modus, station);
    const bestehend = layouts[key];
    return {
      leftW: bestehend?.leftW ?? DOCK_KONSTANTEN.DEF_LEFT,
      rightW: bestehend?.rightW ?? DOCK_KONSTANTEN.DEF_RIGHT,
      panels: bestehend?.panels ?? {},
    };
  },

  zustandWiederherstellen: (modus, layouts) => {
    set({ modus, layouts });
    persistiere(get());
  },
}));

/**
 * Setzt den Store auf frische `localStorage`-Werte zurück (Tests/E2E-Setup)
 * — liest `kosmo.dock.v1` erneut, ohne die App neu zu laden. Gleiches Muster
 * wie `neuLadenAusSpeicher` in `ui-zustand.ts`.
 */
export function neuLadenAusSpeicher(): void {
  useDockZustand.setState(anfangsZustand());
}

// ---------------------------------------------------------------------------
// eingeklappteDiff — Grundlage des Auto-Reaktions-Chips (C6, kommt erst in
// P3/P5). Reine Funktion, KEIN UI hier. Semantik 1:1 wie `announce()` im
// Design-Handoff-Prototyp: vergleicht die Menge der eingeklappten Panel-IDs
// vor/nach einer Solver-Runde und meldet je EINE neu eingeklappte und/oder
// wieder geöffnete ID — das zuerst gefundene, das selbst bediente Panel
// (`ausgeloestId`, z.B. das gerade vom Menschen geöffnete) zählt nicht als
// Auto-Reaktion.
// ---------------------------------------------------------------------------

export interface EingeklappteDiffErgebnis {
  neuEingeklappt?: string;
  wiederOffen?: string;
}

export function eingeklappteDiff(vorher: readonly string[], nachher: readonly string[], ausgeloestId?: string): EingeklappteDiffErgebnis {
  const neu = nachher.filter((id) => id !== ausgeloestId && !vorher.includes(id));
  const wieder = vorher.filter((id) => id !== ausgeloestId && !nachher.includes(id));
  return {
    ...(neu.length ? { neuEingeklappt: neu[0] } : {}),
    ...(wieder.length ? { wiederOffen: wieder[0] } : {}),
  };
}
