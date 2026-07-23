import { create } from 'zustand';
import type { Pt } from '@kosmo/kernel';
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

/** v0.8.3 E3 (§3.1, `docs/V083-SPEZ.md`, Island-§8-Freigabe §8-5/§8-7/§8-6):
 *  `'oeffnung'`/`'messen'`/`'kommentar'` additiv ergänzt (10 → 13) — eigene
 *  Klickmodi in `DesignWorkspace.tsx`s `punktSetzen()`, s. dortigen
 *  Kommentar. Kein bestehender Wert verändert.
 *
 *  v0.9.1 P-B2 (`docs/V091-SPEZ.md` §P-B2, bewusst NICHT erweitert): die
 *  zwei neuen ZEICHNEN-Werkzeuge `gelaender`/`rampe` (`island-katalog.ts`)
 *  tragen `toolId: 'gelaender'`/`'rampe'` als reinen `string` (das Feld
 *  `IslandWerkzeug.toolId` ist bereits `string`, keine `ToolId`) — sie
 *  aktivieren ihren Modus über denselben bestehenden, generischen Weg wie
 *  jedes andere Zeichenwerkzeug (`DesignWorkspace.tsx`s
 *  `aktiviereIslandWerkzeug()`: `setTool(w.toolId as ToolId)`, ein
 *  bewusster Type-Assertion-Durchlass, der JEDEN String akzeptiert). Diese
 *  `ToolId`-Union bleibt darum BYTE-STILL: sie zusätzlich um 'gelaender'/
 *  'rampe' zu erweitern bräche `DesignWorkspace.tsx`s eigene, dort lokal
 *  duplizierte (TABU-Datei, `docs/V091-SPEZ.md` Sanktion 3) `ToolId`-
 *  Kopie — deren Aktualisierung ist P-B1s Aufgabe (Cluster B), sobald dort
 *  auch die echte Klickketten-/Zwei-Punkt-Interaktion für die beiden Modi
 *  entsteht. NACHTRAG P-B1 (dasselbe Paket-Fenster): genau das ist jetzt
 *  geschehen — `'gelaender'`/`'rampe'` sind formale Union-Mitglieder (13 →
 *  15), synchron mit `DesignWorkspace.tsx`s lokaler Kopie, und die echte
 *  Klickketten- (Geländer, Muster Messen) bzw. Zwei-Punkt-Interaktion
 *  (Rampe, Muster Schnitt/Wand) lebt in `punktSetzen()` dort. */
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
  | 'mesh'
  | 'oeffnung'
  | 'messen'
  | 'kommentar'
  | 'gelaender'
  | 'rampe';

/** Für Validierung (`ui-befehle.ts` `ui.werkzeugSetzen`) — 1:1 aus `ToolId`. */
export const TOOL_IDS: readonly ToolId[] = ['auswahl', 'wand', 'volumen', 'zone', 'dach', 'treppe', 'stuetze', 'schnitt', 'skizze', 'mesh', 'oeffnung', 'messen', 'kommentar', 'gelaender', 'rampe'];

export type ViewMode = '3d' | '2d' | 'split' | 'quad';

/** Für Validierung (`ui-befehle.ts` `ui.ansichtSetzen`) — 1:1 aus `ViewMode`. */
export const VIEW_MODES: readonly ViewMode[] = ['3d', '2d', 'split', 'quad'];

/**
 * PD2 (`docs/ISLAND-UI-SPEZ.md` §6 Sanktion 1, §7 PD2-Zeile, `V082-SPEZ.md`
 * C-35/C-41) — der Island/Manuell-Umschalter der design-Station. Lebt HIER
 * (Fable-Entscheid, additiv) statt im Yjs-Projekt-Doc: eine UI-Präferenz ist
 * Gerätezustand, kein Modellzustand (Repo-Regel «Laufzeit ≠ Modell»,
 * CLAUDE.md). **Default `'island'` — das IST der Default-Flip (C-35).**
 */
export type DesignOberflaeche = 'island' | 'manuell';

/** Für Validierung/Defensiv-Parsing — 1:1 aus `DesignOberflaeche`. */
export const DESIGN_OBERFLAECHEN: readonly DesignOberflaeche[] = ['island', 'manuell'];

/**
 * PC1 (`docs/V084-SPEZ.md` §5 W2, App.tsx-Guard-Verallgemeinerung) — derselbe
 * Island/Manuell-Umschalter, jetzt additiv auch für die vis-Station. Bewusst
 * EIN eigenes Feld statt eines generischen `stationOberflaeche: Record<...>`:
 * `designOberflaeche` bleibt WÖRTLICH unverändert (Typ, Feldname, Testids,
 * Persistenz-Schlüssel) — kein Bestands-Konsument (DesignWorkspace.tsx,
 * island-ui.spec.ts, `e2e/helpers/manuell-seed.ts`) sieht eine andere Form.
 * `visOberflaeche` kopiert exakt dasselbe Muster (Default `'island'`, gleiche
 * defensive Parsing-Kette) — die zwei Felder sind unabhängig voneinander
 * schaltbar (Design kann `manuell` sein, während Vis `island` bleibt, oder
 * umgekehrt).
 */
export type VisOberflaeche = 'island' | 'manuell';

/** Für Validierung/Defensiv-Parsing — 1:1 aus `VisOberflaeche`. */
export const VIS_OBERFLAECHEN: readonly VisOberflaeche[] = ['island', 'manuell'];

/**
 * PC3 (`docs/V084-SPEZ.md` §5 W3, C-19) — derselbe additive Island/Manuell-
 * Umschalter, jetzt für die publish-Station. Kopiert exakt dasselbe Muster
 * wie `visOberflaeche` oben (eigenes Feld statt generischem Record, Default
 * `'island'`, gleiche defensive Parsing-Kette) — `designOberflaeche`/
 * `visOberflaeche` bleiben WÖRTLICH unverändert, alle drei Felder sind
 * unabhängig voneinander schaltbar.
 */
export type PublishOberflaeche = 'island' | 'manuell';

/** Für Validierung/Defensiv-Parsing — 1:1 aus `PublishOberflaeche`. */
export const PUBLISH_OBERFLAECHEN: readonly PublishOberflaeche[] = ['island', 'manuell'];

/**
 * PC4 (`docs/V084-SPEZ.md` §5 W3, C-20) — derselbe additive Island/Manuell-
 * Umschalter, jetzt für die prepare-Station. Kopiert exakt dasselbe Muster
 * wie `publishOberflaeche`/`visOberflaeche` oben (eigenes Feld statt
 * generischem Record, Default `'island'`, gleiche defensive Parsing-Kette).
 */
export type PrepareOberflaeche = 'island' | 'manuell';

/** Für Validierung/Defensiv-Parsing — 1:1 aus `PrepareOberflaeche`. */
export const PREPARE_OBERFLAECHEN: readonly PrepareOberflaeche[] = ['island', 'manuell'];

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
  // v0.7.0 (Stream 5A, E5-i/iii): «Varianten»-Panel (VariantenPanel.tsx) —
  // Anytime-Variantensuche + Kennzahl-Matrix. Gleiches Muster wie
  // `cwSetzenOffen` (Sitzung, nicht persistiert, generisch über
  // `ui.panelSetzen` erreichbar).
  'variantenPanelOffen',
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
  /** v0.7.0 (Stream 5A): «Varianten»-Panel (Anytime-Variantensuche +
   *  Kennzahl-Matrix, VariantenPanel.tsx). */
  variantenPanelOffen: boolean;
  /** v0.8.3 E1 (§1.4, `docs/V083-SPEZ.md`): der zuletzt mit dem
   *  `'kommentar'`-Werkzeug gesetzte Welt-mm-Punkt — Brücke zwischen dem
   *  Klickmodus (`DesignWorkspace.tsx`s `punktSetzen()`) und dem
   *  Erfassen-Formular der PROJEKT-Insel (`island/inhalte/projekt.tsx`,
   *  Stufe 2/3), die keinen direkten Zugriff auf DesignWorkspaces lokalen
   *  `points`-State hat. Reine UI-Brücke, geht NIE durchs Doc/Undo/Yjs
   *  (Laufzeit ≠ Modell) — `null` nach erfolgreichem `design.kommentarSetzen`
   *  oder Werkzeugwechsel. */
  kommentarPunkt: Pt | null;

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
  /** PD2 Default-Flip (C-35/C-41) — `'island'` ist der neue Default. */
  designOberflaeche: DesignOberflaeche;
  /** PC1 (V084-SPEZ §5 W2) — dasselbe Muster für die vis-Station, additiv. */
  visOberflaeche: VisOberflaeche;
  /** PC3 (V084-SPEZ §5 W3) — dasselbe Muster für die publish-Station, additiv. */
  publishOberflaeche: PublishOberflaeche;
  /** PC4 (V084-SPEZ §5 W3) — dasselbe Muster für die prepare-Station, additiv. */
  prepareOberflaeche: PrepareOberflaeche;

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
  setVariantenPanelOffen: (v: boolean) => void;
  setKommentarPunkt: (v: Pt | null) => void;

  setArbeitsmodus: (v: Arbeitsmodus | undefined) => void;
  setModusAutomatik: (v: boolean) => void;
  setModusFesthalten: (v: boolean) => void;
  setModusManuell: (v: Arbeitsmodus | undefined) => void;
  setPhasenFokus: (v: ReadonlySet<FaehigkeitId> | null) => void;
  setDesignOberflaeche: (v: DesignOberflaeche) => void;
  setVisOberflaeche: (v: VisOberflaeche) => void;
  setPublishOberflaeche: (v: PublishOberflaeche) => void;
  setPrepareOberflaeche: (v: PrepareOberflaeche) => void;

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
  /** PD2 — immer normalisiert vorhanden (Default `'island'`, s. `normalisiere`). */
  designOberflaeche: DesignOberflaeche;
  /** PC1 — additiv, dasselbe Normalisierungs-Muster (Default `'island'`). */
  visOberflaeche: VisOberflaeche;
  /** PC3 — additiv, dasselbe Normalisierungs-Muster (Default `'island'`). */
  publishOberflaeche: PublishOberflaeche;
  /** PC4 — additiv, dasselbe Normalisierungs-Muster (Default `'island'`). */
  prepareOberflaeche: PrepareOberflaeche;
}

function basisSpeicher(): UiSpeicher {
  return {
    version: 1,
    modusAutomatik: true,
    modusFesthalten: false,
    phasenFokus: null,
    designOberflaeche: 'island',
    visOberflaeche: 'island',
    publishOberflaeche: 'island',
    prepareOberflaeche: 'island',
  };
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

function istGueltigeOberflaeche(wert: unknown): wert is DesignOberflaeche {
  return typeof wert === 'string' && (DESIGN_OBERFLAECHEN as readonly string[]).includes(wert);
}

function istGueltigeVisOberflaeche(wert: unknown): wert is VisOberflaeche {
  return typeof wert === 'string' && (VIS_OBERFLAECHEN as readonly string[]).includes(wert);
}

function istGueltigePublishOberflaeche(wert: unknown): wert is PublishOberflaeche {
  return typeof wert === 'string' && (PUBLISH_OBERFLAECHEN as readonly string[]).includes(wert);
}

function istGueltigePrepareOberflaeche(wert: unknown): wert is PrepareOberflaeche {
  return typeof wert === 'string' && (PREPARE_OBERFLAECHEN as readonly string[]).includes(wert);
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
  // PD2: FEHLEND ist gültig (Default 'island' greift beim Normalisieren) —
  // exakt dasselbe defensive Muster wie `modusFesthalten`/`phasenFokus` oben,
  // damit der globale E2E-Seed-Helper (`e2e/helpers/manuell-seed.ts`) mit nur
  // `version`+`modusAutomatik`+`designOberflaeche` ein gültiger Datensatz ist.
  if ('designOberflaeche' in w && w['designOberflaeche'] !== undefined && !istGueltigeOberflaeche(w['designOberflaeche'])) {
    return false;
  }
  // PC1: additiv, dieselbe «fehlend ist gültig»-Regel wie designOberflaeche —
  // ein Seed ohne `visOberflaeche` (jeder Bestands-Seed, jede alte
  // localStorage-Zeile) bleibt ein gültiger Datensatz.
  if ('visOberflaeche' in w && w['visOberflaeche'] !== undefined && !istGueltigeVisOberflaeche(w['visOberflaeche'])) {
    return false;
  }
  // PC3: additiv, dieselbe «fehlend ist gültig»-Regel wie designOberflaeche/
  // visOberflaeche — ein Seed ohne `publishOberflaeche` (jeder Bestands-Seed,
  // jede alte localStorage-Zeile) bleibt ein gültiger Datensatz.
  if (
    'publishOberflaeche' in w &&
    w['publishOberflaeche'] !== undefined &&
    !istGueltigePublishOberflaeche(w['publishOberflaeche'])
  ) {
    return false;
  }
  // PC4: additiv, dieselbe «fehlend ist gültig»-Regel wie publishOberflaeche.
  if (
    'prepareOberflaeche' in w &&
    w['prepareOberflaeche'] !== undefined &&
    !istGueltigePrepareOberflaeche(w['prepareOberflaeche'])
  ) {
    return false;
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
    designOberflaeche: istGueltigeOberflaeche(w['designOberflaeche']) ? w['designOberflaeche'] : 'island',
    visOberflaeche: istGueltigeVisOberflaeche(w['visOberflaeche']) ? w['visOberflaeche'] : 'island',
    publishOberflaeche: istGueltigePublishOberflaeche(w['publishOberflaeche']) ? w['publishOberflaeche'] : 'island',
    prepareOberflaeche: istGueltigePrepareOberflaeche(w['prepareOberflaeche']) ? w['prepareOberflaeche'] : 'island',
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

/** Persistiert die vier Modus-Felder + `phasenFokus` + `designOberflaeche` +
 *  `visOberflaeche` + `publishOberflaeche` (nie tool/viewMode/Panels). */
function persistiere(
  zustand: Pick<
    UiZustand,
    | 'arbeitsmodus'
    | 'modusAutomatik'
    | 'modusFesthalten'
    | 'modusManuell'
    | 'phasenFokus'
    | 'designOberflaeche'
    | 'visOberflaeche'
    | 'publishOberflaeche'
    | 'prepareOberflaeche'
  >,
): void {
  const speicher: UiSpeicher = {
    version: 1,
    ...(zustand.arbeitsmodus !== undefined ? { arbeitsmodus: zustand.arbeitsmodus } : {}),
    modusAutomatik: zustand.modusAutomatik,
    modusFesthalten: zustand.modusFesthalten,
    ...(zustand.modusManuell !== undefined ? { modusManuell: zustand.modusManuell } : {}),
    phasenFokus: zustand.phasenFokus ? [...zustand.phasenFokus] : null,
    designOberflaeche: zustand.designOberflaeche,
    visOberflaeche: zustand.visOberflaeche,
    publishOberflaeche: zustand.publishOberflaeche,
    prepareOberflaeche: zustand.prepareOberflaeche,
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
    variantenPanelOffen: false,
    kommentarPunkt: null as Pt | null,
    arbeitsmodus: gespeichert.arbeitsmodus,
    modusAutomatik: gespeichert.modusAutomatik,
    modusFesthalten: gespeichert.modusFesthalten,
    modusManuell: gespeichert.modusManuell,
    phasenFokus: gespeichert.phasenFokus ? new Set(gespeichert.phasenFokus) : null,
    designOberflaeche: gespeichert.designOberflaeche,
    visOberflaeche: gespeichert.visOberflaeche,
    publishOberflaeche: gespeichert.publishOberflaeche,
    prepareOberflaeche: gespeichert.prepareOberflaeche,
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
  setVariantenPanelOffen: (v) => set({ variantenPanelOffen: v }),
  setKommentarPunkt: (v) => set({ kommentarPunkt: v }),

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
  setDesignOberflaeche: (v) => {
    set({ designOberflaeche: v });
    persistiere(get());
  },
  setVisOberflaeche: (v) => {
    set({ visOberflaeche: v });
    persistiere(get());
  },
  setPublishOberflaeche: (v) => {
    set({ publishOberflaeche: v });
    persistiere(get());
  },
  setPrepareOberflaeche: (v) => {
    set({ prepareOberflaeche: v });
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
