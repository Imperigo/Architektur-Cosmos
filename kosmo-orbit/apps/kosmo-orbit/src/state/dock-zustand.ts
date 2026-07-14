import { create } from 'zustand';
import { DOCK_KONSTANTEN, type DockModus, type DockZone, type FloatAnker, type PanelOverride } from './dock-kern';
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
}

function basisSpeicher(): DockSpeicher {
  return { version: 1, modus: 'A', layouts: {} };
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
  return true;
}

function normalisiere(wert: Record<string, unknown>): DockSpeicher {
  const modus: DockModus = wert['modus'] === 'B' ? 'B' : 'A';
  const layoutsRoh = istEbenesObjekt(wert['layouts']) ? wert['layouts'] : {};
  const layouts: Record<string, DockStationLayout> = {};
  for (const [key, layout] of Object.entries(layoutsRoh)) {
    layouts[key] = normalisiereLayout(layout);
  }
  return { version: 1, modus, layouts };
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

function persistiere(zustand: Pick<DockZustand, 'modus' | 'layouts'>): void {
  schreibeSpeicher({ version: 1, modus: zustand.modus, layouts: zustand.layouts });
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
  /** «Auf schlaues Layout zurücksetzen» — löscht NUR den aktiven Schlüssel
   *  (`${modus}:${station}`), alle anderen Stationen/Modi bleiben unberührt. */
  layoutZuruecksetzen: (station: DockStation) => void;
  /** Gemergte Overrides für die aktive `modus`+`station`-Kombination — IMMER
   *  vollständig (leftW/rightW aufgelöst mit `DOCK_KONSTANTEN`-Defaults). */
  layoutFuer: (station: DockStation) => DockLayoutAufgeloest;
}

function anfangsZustand(): Pick<DockZustand, 'modus' | 'layouts'> {
  const gespeichert = ladeSpeicherRoh();
  return { modus: gespeichert.modus, layouts: gespeichert.layouts };
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

  layoutZuruecksetzen: (station) => {
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
