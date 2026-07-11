import { create } from 'zustand';
import { ALLE_FAEHIGKEITEN, type FaehigkeitId } from '../modules/design/phasen-presets';
import { ARBEITSMODI, type Arbeitsmodus } from './arbeitsmodi-kern';

/**
 * UI-Zustands-Store (v0.6.6 BEWEGUNGSKONZEPT §6) — der zentrale Ort für das,
 * was heute im lokalen `useState` von `DesignWorkspace.tsx` (Z.320-435) lebt:
 * `tool`, `viewMode`, die zehn Panel-Flags, `mehrOffen`, `exportMenuOffen`,
 * `phasenFokus` — plus die NEUEN Arbeitsmodus-Felder. Feld- UND Setter-Namen
 * sind bewusst 1:1 aus dem bestehenden `useState`-Paar übernommen (z.B.
 * `studieOffen`/`setStudieOffen`), damit Stream B die Verdrahtung MECHANISCH
 * migrieren kann: `const [x, setX] = useState(...)` → `const x =
 * useUiZustand((s) => s.x); const setX = useUiZustand((s) => s.setX);`.
 *
 * **Diese Datei ändert NICHTS an `DesignWorkspace.tsx`** — der Store wird
 * hier nur gebaut und getestet; die Verdrahtung macht ein anderer Stream.
 *
 * **Drei Konsumenten, ein Pfad** (Konzept §6): die Modus-Automatik
 * (`arbeitsmodi-kern.ts`), Kosmo (`state/ui-befehle.ts`, LLM-Werkzeuge über
 * `packages/kosmo-ai`) und E2E-Tests lesen/schreiben denselben Store.
 *
 * **Persistenz** (`localStorage`, Schlüssel `kosmo.ui.v1`, Muster 1:1 wie
 * `oberflaeche-adaption-kern.ts`/`state/leistung.ts`: Versionierung,
 * defensives Parsen, In-Memory-Stub falls kein `localStorage` da ist): NUR
 * die vier Modus-Felder (`arbeitsmodus`, `modusAutomatik`, `modusFesthalten`,
 * `modusManuell`) + `phasenFokus` gehen in den Speicher. `tool`, `viewMode`
 * und alle Panel-Flags bleiben SITZUNG (flüchtig) — heutiges Verhalten bleibt
 * unverändert, nichts überlebt einen Neuladen, was es heute auch nicht tut.
 */

export type ToolId =
  | 'auswahl'
  | 'wand'
  | 'volumen'
  | 'zone'
  | 'dach'
  | 'treppe'
  | 'stuetze'
  | 'schnitt'
  | 'skizze'
  | 'mesh';

/** Für Validierung (`ui-befehle.ts` `ui.werkzeugSetzen`) — 1:1 aus `ToolId`. */
export const TOOL_IDS: readonly ToolId[] = ['auswahl', 'wand', 'volumen', 'zone', 'dach', 'treppe', 'stuetze', 'schnitt', 'skizze', 'mesh'];

export type ViewMode = '3d' | '2d' | 'split' | 'quad';

/** Für Validierung (`ui-befehle.ts` `ui.ansichtSetzen`) — 1:1 aus `ViewMode`. */
export const VIEW_MODES: readonly ViewMode[] = ['3d', '2d', 'split', 'quad'];

/** Panel-/Menü-Flag-Namen, über die `ui.panelSetzen` (Paket 3) generisch schreibt. */
export const PANEL_IDS = [
  'studieOffen',
  'drawOffen',
  'listeOffen',
  'rasterOffen',
  'kvOffen',
  'bauablaufOffen',
  'maengelOffen',
  'submissionOffen',
  'splatPanelOffen',
  'sonneOffen',
  'mehrOffen',
  'exportMenuOffen',
  // Stream B (W1b): fehlte in der Fundament-Fassung — DesignWorkspace.tsx
  // (Z.400) hat dieses Flag, additiv nachgezogen (API-kompatibel, gleiches
  // Muster wie `mehrOffen`/`exportMenuOffen`: ein Menü-Toggle, kein Panel im
  // engeren Sinn, trotzdem Teil von `PANEL_IDS`, damit `ui.panelSetzen`/
  // `ui.zustandLesen` es generisch mitnehmen).
  'projektMenuOffen',
  // v0.7.0 (Stream 1B, SIM-BEFUNDE-Notiz zur v0.6.9-Statusrunde): der
  // «Fensterband/CW setzen»-Dialog führte seine Sichtbarkeit als LOKALEN
  // useState in DesignWorkspace.tsx — dokumentierte Abweichung, hier
  // vereinheitlicht (gleiches Muster wie die übrigen Panel-Flags: Sitzung,
  // nicht persistiert, generisch über `ui.panelSetzen` erreichbar).
  'cwSetzenOffen',
] as const;
export type PanelId = (typeof PANEL_IDS)[number];

export interface UiZustand {
  // ---- flüchtig (Sitzung, NICHT persistiert) ----
  tool: ToolId;
  viewMode: ViewMode;
  /** Die zehn Panel-Flags aus DesignWorkspace.tsx (Z.320-435), Namen 1:1 übernommen. */
  studieOffen: boolean;
  drawOffen: boolean;
  listeOffen: boolean;
  rasterOffen: boolean;
  kvOffen: boolean;
  bauablaufOffen: boolean;
  maengelOffen: boolean;
  submissionOffen: boolean;
  splatPanelOffen: boolean;
  sonneOffen: boolean;
  /** Separat genannte Menü-Flags (Konzept-Briefing): kein "Panel" im engeren Sinn. */
  mehrOffen: boolean;
  exportMenuOffen: boolean;
  /** Stream B (W1b): additiv ergänzt — DesignWorkspace.tsx (Z.400) hat dieses
   *  Flag, das Fundament hatte es noch nicht. */
  projektMenuOffen: boolean;
  /** v0.7.0 (Stream 1B): «Fensterband/CW setzen»-Dialog — vorher lokaler
   *  useState in DesignWorkspace.tsx (dokumentierte v0.6.9-Abweichung). */
  cwSetzenOffen: boolean;

  // ---- persistiert (kosmo.ui.v1) ----
  /** Neutral-Zustand `undefined` = Voll-UI, vor erster sicherer Erkennung (arbeitsmodi-kern.ts). */
  arbeitsmodus: Arbeitsmodus | undefined;
  /** Default AN — die Erkennung läuft, bis der Mensch sie ausdrücklich ausschaltet. */
  modusAutomatik: boolean;
  /** Default aus — friert den aktuellen Modus ein (Konzept §3). */
  modusFesthalten: boolean;
  /** Letzter manuell (nicht automatisch) gewählter Modus, für die Wieder-Aufnahme nach «Festhalten aus». */
  modusManuell: Arbeitsmodus | undefined;
  /** SIA-Phasen-Preset-Fokus (A8) — bleibt persistiert wie bisher (kein Verhaltenswechsel). */
  phasenFokus: ReadonlySet<FaehigkeitId> | null;

  setTool: (v: ToolId) => void;
  setViewMode: (v: ViewMode) => void;
  setStudieOffen: (v: boolean) => void;
  setDrawOffen: (v: boolean) => void;
  setListeOffen: (v: boolean) => void;
  setRasterOffen: (v: boolean) => void;
  setKvOffen: (v: boolean) => void;
  setBauablaufOffen: (v: boolean) => void;
  setMaengelOffen: (v: boolean) => void;
  setSubmissionOffen: (v: boolean) => void;
  setSplatPanelOffen: (v: boolean) => void;
  setSonneOffen: (v: boolean) => void;
  setMehrOffen: (v: boolean) => void;
  setExportMenuOffen: (v: boolean) => void;
  setProjektMenuOffen: (v: boolean) => void;
  setCwSetzenOffen: (v: boolean) => void;

  setArbeitsmodus: (v: Arbeitsmodus | undefined) => void;
  setModusAutomatik: (v: boolean) => void;
  setModusFesthalten: (v: boolean) => void;
  setModusManuell: (v: Arbeitsmodus | undefined) => void;
  setPhasenFokus: (v: ReadonlySet<FaehigkeitId> | null) => void;

  /** Generischer Panel-Setter über den Flag-Namen (`ui-befehle.ts` `ui.panelSetzen`). */
  setzePanel: (panel: PanelId, offen: boolean) => void;
}

// ---------------------------------------------------------------------------
// Speicher-Layer (localStorage, kosmo.ui.v1) — Muster 1:1 wie
// oberflaeche-adaption-kern.ts / state/leistung.ts.
// ---------------------------------------------------------------------------

const STORAGE_KEY = 'kosmo.ui.v1';

interface UiSpeicher {
  version: 1;
  arbeitsmodus?: Arbeitsmodus;
  modusAutomatik: boolean;
  modusFesthalten: boolean;
  modusManuell?: Arbeitsmodus;
  phasenFokus: FaehigkeitId[] | null;
}

function basisSpeicher(): UiSpeicher {
  return { version: 1, modusAutomatik: true, modusFesthalten: false, phasenFokus: null };
}

/**
 * Minimaler In-Memory-Ersatz, falls die Laufzeit kein `localStorage` kennt
 * (z.B. Vitest ohne jsdom) — 1:1 dasselbe Muster wie in
 * `oberflaeche-adaption-kern.ts`/`state/leistung.ts`.
 */
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

function istGueltigerModus(wert: unknown): wert is Arbeitsmodus {
  return typeof wert === 'string' && (ARBEITSMODI as readonly string[]).includes(wert);
}

function istGueltigeFaehigkeit(wert: unknown): wert is FaehigkeitId {
  return typeof wert === 'string' && (ALLE_FAEHIGKEITEN as readonly string[]).includes(wert);
}

function istGueltigerSpeicher(wert: unknown): wert is UiSpeicher {
  if (typeof wert !== 'object' || wert === null) return false;
  const w = wert as Record<string, unknown>;
  if (w['version'] !== 1) return false;
  if (typeof w['modusAutomatik'] !== 'boolean') return false;
  // modusFesthalten/phasenFokus: FEHLEND ist gültig (Default greift beim
  // Normalisieren unten) — nur ein FALSCHER Typ/Wert macht den ganzen
  // Datensatz ungültig. Das erlaubt u.a. den minimalen E2E-Seed
  // (playwright.config.ts: nur version+modusAutomatik) UND bleibt
  // vorwärtskompatibel, falls künftig ein weiteres Feld dazukommt.
  if ('modusFesthalten' in w && w['modusFesthalten'] !== undefined && typeof w['modusFesthalten'] !== 'boolean') return false;
  if ('arbeitsmodus' in w && w['arbeitsmodus'] !== undefined && !istGueltigerModus(w['arbeitsmodus'])) return false;
  if ('modusManuell' in w && w['modusManuell'] !== undefined && !istGueltigerModus(w['modusManuell'])) return false;
  if ('phasenFokus' in w && w['phasenFokus'] !== undefined && w['phasenFokus'] !== null) {
    const pf = w['phasenFokus'];
    if (!Array.isArray(pf)) return false;
    if (!pf.every(istGueltigeFaehigkeit)) return false;
  }
  return true;
}

/** Füllt fehlende, optionale Felder eines validierten (aber evtl. lückenhaften)
 *  Datensatzes mit den Basiswerten auf — hält `UiSpeicher` downstream immer
 *  vollständig, egal wie knapp der localStorage-Eintrag geschrieben wurde. */
function normalisiere(wert: unknown): UiSpeicher {
  const w = wert as Record<string, unknown>;
  return {
    version: 1,
    ...(typeof w['arbeitsmodus'] === 'string' ? { arbeitsmodus: w['arbeitsmodus'] as Arbeitsmodus } : {}),
    modusAutomatik: w['modusAutomatik'] as boolean,
    modusFesthalten: typeof w['modusFesthalten'] === 'boolean' ? w['modusFesthalten'] : false,
    ...(typeof w['modusManuell'] === 'string' ? { modusManuell: w['modusManuell'] as Arbeitsmodus } : {}),
    phasenFokus: Array.isArray(w['phasenFokus']) ? (w['phasenFokus'] as FaehigkeitId[]) : null,
  };
}

/** Defensiver Lese-Weg: kaputtes JSON/falsche Form → Basiszustand, kein Crash. */
function ladeSpeicherRoh(): UiSpeicher {
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

function schreibeSpeicher(speicher: UiSpeicher): void {
  const storage = holeStorage();
  if (!storage) return;
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(speicher));
  } catch {
    // Privater Modus/volles Kontingent — Modus-Felder bleiben flüchtig.
  }
}

/** Persistiert NUR die vier Modus-Felder + `phasenFokus` (nie tool/viewMode/Panels). */
function persistiere(zustand: Pick<UiZustand, 'arbeitsmodus' | 'modusAutomatik' | 'modusFesthalten' | 'modusManuell' | 'phasenFokus'>): void {
  const speicher: UiSpeicher = {
    version: 1,
    ...(zustand.arbeitsmodus !== undefined ? { arbeitsmodus: zustand.arbeitsmodus } : {}),
    modusAutomatik: zustand.modusAutomatik,
    modusFesthalten: zustand.modusFesthalten,
    ...(zustand.modusManuell !== undefined ? { modusManuell: zustand.modusManuell } : {}),
    phasenFokus: zustand.phasenFokus ? [...zustand.phasenFokus] : null,
  };
  schreibeSpeicher(speicher);
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

function anfangsZustand() {
  const gespeichert = ladeSpeicherRoh();
  return {
    tool: 'auswahl' as ToolId,
    viewMode: 'split' as ViewMode,
    studieOffen: false,
    drawOffen: false,
    listeOffen: false,
    rasterOffen: false,
    kvOffen: false,
    bauablaufOffen: false,
    maengelOffen: false,
    submissionOffen: false,
    splatPanelOffen: false,
    sonneOffen: false,
    mehrOffen: false,
    // Owner-Muster aus DesignWorkspace.tsx: das Export-Menü startet OFFEN.
    exportMenuOffen: true,
    projektMenuOffen: false,
    cwSetzenOffen: false,
    arbeitsmodus: gespeichert.arbeitsmodus,
    modusAutomatik: gespeichert.modusAutomatik,
    modusFesthalten: gespeichert.modusFesthalten,
    modusManuell: gespeichert.modusManuell,
    phasenFokus: gespeichert.phasenFokus ? new Set(gespeichert.phasenFokus) : null,
  };
}

export const useUiZustand = create<UiZustand>((set, get) => ({
  ...anfangsZustand(),

  setTool: (v) => set({ tool: v }),
  setViewMode: (v) => set({ viewMode: v }),
  setStudieOffen: (v) => set({ studieOffen: v }),
  setDrawOffen: (v) => set({ drawOffen: v }),
  setListeOffen: (v) => set({ listeOffen: v }),
  setRasterOffen: (v) => set({ rasterOffen: v }),
  setKvOffen: (v) => set({ kvOffen: v }),
  setBauablaufOffen: (v) => set({ bauablaufOffen: v }),
  setMaengelOffen: (v) => set({ maengelOffen: v }),
  setSubmissionOffen: (v) => set({ submissionOffen: v }),
  setSplatPanelOffen: (v) => set({ splatPanelOffen: v }),
  setSonneOffen: (v) => set({ sonneOffen: v }),
  setMehrOffen: (v) => set({ mehrOffen: v }),
  setExportMenuOffen: (v) => set({ exportMenuOffen: v }),
  setProjektMenuOffen: (v) => set({ projektMenuOffen: v }),
  setCwSetzenOffen: (v) => set({ cwSetzenOffen: v }),

  setzePanel: (panel, offen) => set({ [panel]: offen } as Partial<UiZustand>),

  setArbeitsmodus: (v) => {
    set({ arbeitsmodus: v });
    persistiere(get());
  },
  setModusAutomatik: (v) => {
    set({ modusAutomatik: v });
    persistiere(get());
  },
  setModusFesthalten: (v) => {
    set({ modusFesthalten: v });
    persistiere(get());
  },
  setModusManuell: (v) => {
    set({ modusManuell: v });
    persistiere(get());
  },
  setPhasenFokus: (v) => {
    set({ phasenFokus: v });
    persistiere(get());
  },
}));

/**
 * Setzt den Store auf frische `localStorage`-Werte zurück (Tests/E2E-Setup) —
 * liest `kosmo.ui.v1` erneut, ohne die App neu zu laden.
 */
export function neuLadenAusSpeicher(): void {
  useUiZustand.setState(anfangsZustand());
}
