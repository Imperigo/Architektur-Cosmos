/**
 * Arbeitsmodi-Kern (v0.6.6 BEWEGUNGSKONZEPT §2/§3) — REINE Funktionen, kein
 * I/O, kein `localStorage` (das übernimmt `state/ui-zustand.ts`, das diesen
 * Kern konsumiert). Vorbild ist die reine Ableitungsschicht in
 * `oberflaeche-adaption-kern.ts` (Messwerte → Stufe), hier: Verhaltenssignale
 * → einer von neun Arbeitsmodi.
 *
 * Die Oberfläche folgt der Tätigkeit, nicht dem Menü (Konzept §1): aus dem
 * Verhalten (Werkzeug, Ansicht, offene Panels, Eingabegerät, Bauphase, Rolle,
 * Station, Nutzung, zuletzt gelaufene Commands) wird deterministisch EIN
 * Arbeitsmodus bestimmt. Keine Lernmagie in 0.6.6 — die Scoring-Matrix ist
 * eine lesbare Daten-Tabelle, jede Regel trägt ihre Begründung («warum bin
 * ich im Zeichnen-Modus? Weil 2D + Wand + Werkplan-Phase erkannt»).
 */

// ---------------------------------------------------------------------------
// Die neun Tätigkeiten (Konzept §2-Tabelle)
// ---------------------------------------------------------------------------

export type Arbeitsmodus =
  | 'entwerfen'
  | 'zeichnen'
  | 'ideen'
  | 'recherchieren'
  | 'erfassen'
  | 'skizzieren'
  | 'vergleichen'
  | 'exportieren'
  | 'modellieren';

export const ARBEITSMODI: readonly Arbeitsmodus[] = [
  'entwerfen',
  'zeichnen',
  'ideen',
  'recherchieren',
  'erfassen',
  'skizzieren',
  'vergleichen',
  'exportieren',
  'modellieren',
];

/** Menschenlesbares Label je Modus (Modus-Chip/Tooltip, Konzept §5). */
export const ARBEITSMODUS_LABEL: Record<Arbeitsmodus, string> = {
  entwerfen: 'Entwerfen',
  zeichnen: 'Zeichnen',
  ideen: 'Ideen entwickeln',
  recherchieren: 'Recherchieren',
  erfassen: 'Daten erfassen',
  skizzieren: 'iPad-Skizzieren',
  vergleichen: 'Varianten vergleichen',
  exportieren: 'PDF exportieren',
  modellieren: '3D modellieren',
};

/**
 * 0.6.6-Rollout (Konzept §2, letzter Absatz): die Design-Station trägt sechs
 * Modi vollständig; Ideen/Recherchieren/Erfassen sind im Kern modelliert,
 * wirken vorerst nur als Stations-Zuordnung (Vis/Data) — Feinrollout 0.6.7,
 * ehrlich vertagt, nicht in dieser Konstante versteckt simuliert.
 */
export const MODI_VOLLSTAENDIG_0_6_6: readonly Arbeitsmodus[] = [
  'entwerfen',
  'zeichnen',
  'skizzieren',
  'vergleichen',
  'exportieren',
  'modellieren',
];

// ---------------------------------------------------------------------------
// Signale — alles optional/defensiv: ein fehlendes Signal zählt einfach nicht
// ---------------------------------------------------------------------------

export type PointerArt = 'maus' | 'touch' | 'pen';

export interface ModusSignale {
  /** Aktives Werkzeug (DesignWorkspace `tool`, z.B. 'wand', 'zone', 'mesh', 'skizze'). */
  tool?: string;
  /** Aktive Ansicht ('3d' | '2d' | 'split' | 'quad'). */
  viewMode?: string;
  /** IDs der offenen Panels (z.B. 'studieOffen', 'kvOffen', 'exportMenuOffen', ...). */
  offenePanels?: readonly string[];
  /** Eingabegerät des letzten Zeigerereignisses. */
  pointerType?: PointerArt;
  /** SIA-Teilphase des Projekts (`doc.settings.siaPhase`, `@kosmo/kernel` `SiaPhase`). */
  siaPhase?: string;
  /** Rolle aus den Einstellungen (`doc.settings.rolle`: 'entwurf' | 'ausfuehrung' | 'admin'). */
  rolle?: string;
  /** Aktuelle Station (`ModuleId` aus `@kosmo/ui`, z.B. 'design', 'vis', 'data', 'publish'). */
  station?: string;
  /** Nutzungszähler je Signal-Schlüssel (bestehende Adaption, additiv nutzbar). */
  nutzung?: Readonly<Record<string, number>>;
  /** Zuletzt gelaufene Commands/Werkzeug-Aufrufe, neueste zuerst. */
  letzteCommands?: readonly string[];
}

// ---------------------------------------------------------------------------
// Scoring — lesbare Daten-Tabelle je Modus (Konzept §2/§3)
// ---------------------------------------------------------------------------

interface ModusRegel {
  bedingung: (signale: ModusSignale) => boolean;
  punkte: number;
  /** Erklärtext für die Ehrlichkeits-UI («2D-Plan + Wandwerkzeug erkannt»). */
  grund: string;
}

function enthaelt(liste: readonly string[] | undefined, wert: string): boolean {
  return (liste ?? []).includes(wert);
}

const ZEICHEN_WERKZEUGE = ['wand', 'treppe', 'stuetze', 'schnitt'] as const;

/**
 * Die Gewichte je Regel (Konzept §2: «jedes Signal gibt gewichtete Punkte je
 * Modus; höchster Score gewinnt»). 0.6.6 gewichtet die Design-Station-Modi
 * fein (mehrere unabhängige Signale), die drei vertagten Modi (Ideen/
 * Recherchieren/Erfassen) grob über die Station allein — konsistent mit dem
 * ehrlich vertagten Feinrollout in `MODI_VOLLSTAENDIG_0_6_6`.
 */
const REGELN: Record<Arbeitsmodus, ModusRegel[]> = {
  entwerfen: [
    { bedingung: (s) => s.tool === 'volumen' || s.tool === 'zone', punkte: 5, grund: 'Volumen-/Zonen-Werkzeug aktiv' },
    { bedingung: (s) => s.viewMode === '3d', punkte: 2, grund: '3D/Axo-Ansicht' },
    { bedingung: (s) => s.siaPhase === 'wettbewerb' || s.siaPhase === 'vorprojekt', punkte: 3, grund: 'frühe SIA-Phase (Wettbewerb/Vorprojekt)' },
    { bedingung: (s) => s.rolle === 'entwurf', punkte: 1, grund: 'Rolle Entwerfer:in' },
  ],
  zeichnen: [
    { bedingung: (s) => s.viewMode === '2d', punkte: 4, grund: '2D-Plan aktiv' },
    {
      bedingung: (s) => s.tool !== undefined && (ZEICHEN_WERKZEUGE as readonly string[]).includes(s.tool),
      punkte: 5,
      grund: 'Zeichenwerkzeug aktiv (Wand/Treppe/Stütze/Bemassung)',
    },
    { bedingung: (s) => s.siaPhase === 'ausfuehrung', punkte: 3, grund: 'Werkplan-Phase (SIA 51/52)' },
  ],
  ideen: [
    { bedingung: (s) => s.station === 'vis', punkte: 5, grund: 'KosmoVis-Station aktiv' },
  ],
  recherchieren: [
    { bedingung: (s) => s.station === 'data' && enthaelt(s.letzteCommands, 'suche'), punkte: 5, grund: 'KosmoData-Suche zuletzt genutzt' },
    { bedingung: (s) => s.station === 'data', punkte: 2, grund: 'KosmoData-Station aktiv' },
  ],
  erfassen: [
    { bedingung: (s) => s.station === 'data' && enthaelt(s.letzteCommands, 'formular'), punkte: 5, grund: 'KosmoData-Formular/Import zuletzt genutzt' },
    { bedingung: (s) => s.rolle === 'ausfuehrung', punkte: 2, grund: 'Rolle Bauleitung' },
  ],
  skizzieren: [
    { bedingung: (s) => s.pointerType === 'pen', punkte: 6, grund: 'Stift-Pointer erkannt' },
    { bedingung: (s) => s.tool === 'skizze', punkte: 4, grund: 'Skizzier-Werkzeug aktiv' },
  ],
  vergleichen: [
    { bedingung: (s) => enthaelt(s.offenePanels, 'studieOffen'), punkte: 4, grund: 'Volumenstudien-/Varianten-Panel offen' },
  ],
  exportieren: [
    { bedingung: (s) => s.station === 'publish', punkte: 5, grund: 'Publish-Station aktiv' },
    { bedingung: (s) => enthaelt(s.offenePanels, 'exportMenuOffen'), punkte: 3, grund: 'Export-Menü offen' },
    { bedingung: (s) => s.siaPhase === 'ausschreibung', punkte: 2, grund: 'Ausschreibungs-Phase' },
  ],
  modellieren: [
    { bedingung: (s) => s.tool === 'mesh', punkte: 6, grund: 'Mesh-Werkzeug aktiv' },
    { bedingung: (s) => s.viewMode === '3d' && s.tool === 'mesh', punkte: 1, grund: '3D-Ansicht beim Modellieren' },
  ],
};

/**
 * Bewertet ALLE neun Modi anhand der Signale — Summe der zutreffenden Regeln
 * je Modus. Trifft keine Regel zu, bleibt der Score 0 (kein Modus «gewinnt»
 * ohne echtes Signal — `entscheideModus` bleibt dann im bisherigen Zustand).
 */
export function bewerteModi(signale: ModusSignale): Record<Arbeitsmodus, number> {
  const scores = {} as Record<Arbeitsmodus, number>;
  for (const modus of ARBEITSMODI) {
    scores[modus] = REGELN[modus].reduce((summe, regel) => summe + (regel.bedingung(signale) ? regel.punkte : 0), 0);
  }
  return scores;
}

/** Erklärtexte der zutreffenden Regeln für einen Modus (Ehrlichkeits-Tooltip). */
export function begruendeModus(modus: Arbeitsmodus, signale: ModusSignale): string[] {
  return REGELN[modus].filter((regel) => regel.bedingung(signale)).map((regel) => regel.grund);
}

// ---------------------------------------------------------------------------
// Entscheidung — Hysterese + Festhalten (Konzept §3)
// ---------------------------------------------------------------------------

/** Moduswechsel frühestens nach 5s Signal-Stabilität (Debounce). */
export const HYSTERESE_MS = 5000;
/** Der amtierende Modus bekommt +2 Bonus — nichts flackert bei knappem Vorsprung. */
export const AMTIERENDER_BONUS = 2;

/**
 * Deterministische Entscheidung: Neutral-Start ist `aktuell === undefined`
 * (Voll-UI, vor erster sicherer Erkennung). `festhalten` (Konzept §3,
 * `modusFesthalten`) friert IMMER ein — auch bei starkem neuem Signal; das
 * ist additiv zur im Konzept genannten Signatur `entscheideModus(aktuell,
 * scores, stabilSeitMs)` (viertes Argument, Default `false`), damit das
 * Einfrieren hier rein und testbar bleibt statt in jedem Aufrufer dupliziert
 * zu werden. `modusAutomatik: aus` ist KEINE Kern-Angelegenheit — der
 * Aufrufer (state/ui-zustand.ts) ruft diese Funktion bei ausgeschalteter
 * Automatik schlicht nicht auf.
 */
export function entscheideModus(
  aktuell: Arbeitsmodus | undefined,
  scores: Record<Arbeitsmodus, number>,
  stabilSeitMs: number,
  festhalten = false,
): Arbeitsmodus | undefined {
  if (festhalten) return aktuell;

  const bewertet = ARBEITSMODI.map((modus) => ({
    modus,
    punkte: scores[modus] + (modus === aktuell ? AMTIERENDER_BONUS : 0),
  })).sort((a, b) => b.punkte - a.punkte);

  const bester = bewertet[0]!;
  if (bester.punkte <= 0) return aktuell; // kein Signal stark genug — Neutral bleibt Neutral
  if (bester.modus === aktuell) return aktuell;
  if (stabilSeitMs < HYSTERESE_MS) return aktuell; // noch nicht stabil genug — kein Wechsel
  return bester.modus;
}

// ---------------------------------------------------------------------------
// Sichtbarkeits-Sets — Daten, nicht verstreute JSX-Bedingungen (Konzept §4/§8)
// ---------------------------------------------------------------------------

export interface SichtbaresSet {
  /** Welche Werkzeug-Gruppen in diesem Modus prominent sind. */
  werkzeugGruppen: readonly string[];
  /** Welche Panels (Panel-Flag-Namen aus `state/ui-zustand.ts`) prominent sind. */
  panels: readonly string[];
}

const SICHTBARKEIT: Record<Arbeitsmodus, SichtbaresSet> = {
  entwerfen: { werkzeugGruppen: ['massenWerkzeuge', 'kennzahlenLive', 'schattenstudie'], panels: ['studieOffen', 'sonneOffen'] },
  zeichnen: { werkzeugGruppen: ['zeichenwerkzeuge', 'fangRaster', 'geschossLeiter', 'bemassung'], panels: ['listeOffen', 'rasterOffen'] },
  ideen: { werkzeugGruppen: ['nodePalette', 'bildvergleich', 'referenzAndockung'], panels: [] },
  recherchieren: { werkzeugGruppen: ['suche', 'facetten', 'dossiers', 'quellensprung'], panels: [] },
  erfassen: { werkzeugGruppen: ['formulare', 'import', 'validierung'], panels: [] },
  skizzieren: { werkzeugGruppen: ['stiftPaletten', 'annaeherungsVorschlaege', 'grosseZiele'], panels: ['drawOffen'] },
  vergleichen: { werkzeugGruppen: ['vergleichsflaechen', 'kennzahlenMatrix'], panels: ['studieOffen'] },
  exportieren: { werkzeugGruppen: ['blattlisten', 'sets', 'exportkette', 'revision'], panels: ['exportMenuOffen'] },
  modellieren: { werkzeugGruppen: ['meshWerkzeuge', 'modulWerkzeuge', 'texturen', 'kamera'], panels: ['splatPanelOffen'] },
};

/**
 * Sichtbarkeits-Set eines Modus. Neutral-Zustand `undefined` (kein Modus
 * erkannt/Automatik aus) = Voll-UI: `undefined` zurück — die Oberfläche
 * zeigt dann ALLES wie heute, kein testid verschwindet (E2E-Vertrag).
 */
export function sichtbaresSet(modus: Arbeitsmodus | undefined): SichtbaresSet | undefined {
  if (modus === undefined) return undefined;
  return SICHTBARKEIT[modus];
}
