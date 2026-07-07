/**
 * Adaptions-Regelwerk (Serie J / Batch J3a — docs/SERIE-J-BUILDPLAN.md
 * Abschnitt 2). Reine Regelfunktionen, die auf der statischen T7-Basis
 * (`state/fokus.ts`, `FokusStufe`/`KOPFLEISTE_FOKUS`) aufsetzen, plus ein
 * dünner Laufzeit-Store für Nutzungslernen und den Opt-out-Schalter.
 *
 * **Laufzeit ≠ Modell:** Adaption ist Nutzer-/Gerätezustand, kein Projekt-
 * inhalt — sie lebt in `localStorage` unter dem Versionsschlüssel
 * `kosmo.adaption.v1`, geht NIE ins Doc/Yjs/Undo und berührt keine Goldens.
 *
 * **Rein vs. Laufzeit:** `adaptiveFokusStufe`/`darfUmordnen` sind reine
 * Funktionen ihrer expliziten Parameter — sie lesen NIE den Store. Der
 * Opt-out-Schalter (`adaptionAktiv()`) ist bewusst aussen vor: Aufrufer
 * (J3b/J3c) entscheiden `adaptionAktiv() ? adaptiveFokusStufe(...) : basis`
 * — die Regel selbst bleibt unkontaminiert und ohne Seiteneffekt testbar.
 *
 * J3a lieferte **kein UI-Wiring**. Seit J3b konsumiert `DesignWorkspace.tsx`
 * dieses Modul: `ZEICHEN_WERKZEUG_IDS`/`LEISTEN_BASIS` sind die einzige
 * Quelle der Matrix-Daten, `leiteTaetigkeitsKontextAb`/`nutzungsProfil`
 * füttern `adaptiveFokusStufe(...)` mit echtem State — Import-Richtung
 * bleibt einseitig (DesignWorkspace → hier, nie umgekehrt); dieses Modul
 * bleibt UI-frei.
 */

import type { FokusStufe } from './fokus';

// ---------------------------------------------------------------------------
// Typen (API aus Abschnitt 2.1, exakt)
// ---------------------------------------------------------------------------

export type LeistenGruppe = 'zeichnen' | 'ansicht' | 'export' | 'ebenen' | 'projekt' | 'verlauf';

const LEISTEN_GRUPPEN: readonly LeistenGruppe[] = [
  'zeichnen',
  'ansicht',
  'export',
  'ebenen',
  'projekt',
  'verlauf',
];

export interface TaetigkeitsKontext {
  /** ToolId aus DesignWorkspace (z.B. 'wand', 'auswahl', 'skizze'). */
  tool: string;
  /** SIA-Phase, `doc.settings.phase`. */
  phase: 'vorprojekt' | 'bauprojekt' | 'werkplan';
  /** Punktkette offen, Pointer unten, Sketch pending — Anti-Nerv-Wache. */
  aktionLaeuft: boolean;
  /**
   * Fable-Review-2-Auflage (J3c-0b): irgendein Ebenen-Panel offen (Sonne/
   * Draw/Liste/Raster/Splat/Studie in DesignWorkspace — `sonneOffen ||
   * drawOffen || listeOffen || rasterOffen || splatPanelOffen ||
   * studieOffen`). Ein offenes Panel ist eine laufende Tätigkeit wie
   * `aktionLaeuft`, nur auf die Ebenen-Gruppe bezogen: sie wird NIE gedimmt,
   * solange eines ihrer Panels offen ist.
   */
  panelOffen: boolean;
}

export interface NutzungsProfil {
  /** elementId → gewichteter Zähler. Konvention: `"<gruppe>:<name>"`, z.B. `"ebenen:sonne"`. */
  zaehler: Record<string, number>;
  /** elementId → Zeitstempel (ms) der letzten Nutzung. */
  zuletzt: Record<string, number>;
}

// ---------------------------------------------------------------------------
// Tätigkeits-Matrix (2.2) als Datentabelle — keine if-Kaskade.
// ---------------------------------------------------------------------------

/**
 * Für jede Gruppe: auf welche Stufe sie fällt, wenn `tool` ein
 * Zeichenwerkzeug/Skizze ist ('basis' = keine Verschiebung, bleibt auf der
 * übergebenen Basis-Stufe). `tool='auswahl'` (und jedes andere, nicht
 * zeichnende Werkzeug) lässt jede Gruppe unverändert auf ihrer Basis-Stufe
 * — die Matrix hat dafür keine eigene Zeile nötig, weil sie in Abschnitt
 * 2.2 überall exakt der Basis-Spalte entspricht.
 */
const TAETIGKEITS_REGELN: Record<LeistenGruppe, { beimZeichnen: FokusStufe | 'basis' }> = {
  zeichnen: { beimZeichnen: 'basis' }, // immer primär
  ansicht: { beimZeichnen: 'basis' }, // immer sekundär
  export: { beimZeichnen: 'selten' }, // wird beim Zeichnen zurückgestellt
  ebenen: { beimZeichnen: 'selten' }, // wird beim Zeichnen zurückgestellt
  projekt: { beimZeichnen: 'basis' }, // immer selten
  verlauf: { beimZeichnen: 'basis' }, // immer primär
};

/**
 * Zeichenwerkzeug-IDs — EINE Quelle der Wahrheit (Fable-Review-1-Auflage,
 * SERIE-J-BUILDPLAN.md Abschnitt 4): DesignWorkspace importiert diese Liste
 * für sein `ZEICHEN_WERKZEUGE`-Set, statt sie ein zweites Mal zu pflegen.
 * Import-Richtung bleibt einseitig (adaption → nirgendwo UI-seitig zurück) —
 * dieses Modul bleibt UI-frei, es exportiert nur Daten.
 */
export const ZEICHEN_WERKZEUG_IDS: readonly string[] = [
  'wand',
  'volumen',
  'zone',
  'dach',
  'treppe',
  'stuetze',
  'schnitt',
];

const ZEICHEN_TOOL_IDS = new Set(ZEICHEN_WERKZEUG_IDS);

function istZeichenKontext(tool: string): boolean {
  return ZEICHEN_TOOL_IDS.has(tool) || tool === 'skizze';
}

/**
 * T7-Basis je Werkzeugleisten-Gruppe (Tabelle 2.2, Basis-Spalte, gespiegelt
 * aus `docs/OBERFLAECHE-FOKUS-SYSTEMATIK.md`) — die einzige Quelle für
 * DesignWorkspace (J3b), damit die Matrix nicht ein zweites Mal (dort als
 * literale Werte) gepflegt werden muss.
 */
export const LEISTEN_BASIS: Record<LeistenGruppe, FokusStufe> = {
  zeichnen: 'primaer',
  ansicht: 'sekundaer',
  export: 'sekundaer',
  ebenen: 'sekundaer',
  projekt: 'selten',
  verlauf: 'primaer',
};

// Stufen-Rangordnung für Anheben/Deckeln/Floor — nur intern.
const STUFEN_RANG: Record<FokusStufe, number> = { selten: 0, sekundaer: 1, primaer: 2 };
const RANG_STUFE: FokusStufe[] = ['selten', 'sekundaer', 'primaer'];

/**
 * Ist `stufe` niedriger als `basis`? Für den Adaptions-Hinweis (2.3.5) —
 * DesignWorkspace muss dafür die interne Rangordnung nicht selbst kennen.
 */
export function istUnterBasis(stufe: FokusStufe, basis: FokusStufe): boolean {
  return STUFEN_RANG[stufe] < STUFEN_RANG[basis];
}

function stufeMax(a: FokusStufe, b: FokusStufe): FokusStufe {
  return STUFEN_RANG[a] >= STUFEN_RANG[b] ? a : b;
}
function stufeMin(a: FokusStufe, b: FokusStufe): FokusStufe {
  return STUFEN_RANG[a] <= STUFEN_RANG[b] ? a : b;
}
function stufeAnheben(stufe: FokusStufe): FokusStufe {
  return RANG_STUFE[Math.min(STUFEN_RANG[stufe] + 1, 2)]!;
}

/** Ab dieser gewichteten Nutzung zählt ein Element als "oft genutzt" genug,
 *  um für die Top-3-Hebung seiner Gruppe zu zählen (ein einzelner Klick
 *  hebt noch nichts). */
const NUTZUNG_SCHWELLE = 3;
/** "Top-3 ihrer Gruppe" (2.2, Schlussabsatz). */
const TOP_N = 3;

function gruppeVonElement(elementId: string): LeistenGruppe | undefined {
  const praefix = elementId.split(':', 1)[0];
  return (LEISTEN_GRUPPEN as string[]).includes(praefix ?? '') ? (praefix as LeistenGruppe) : undefined;
}

/** Ist mindestens eines der Top-3-genutzten Elemente dieser Gruppe oft
 *  genug genutzt (>= NUTZUNG_SCHWELLE), um die ganze Gruppe zu heben? */
function gruppeIstOftGenutzt(gruppe: LeistenGruppe, nutzung: NutzungsProfil): boolean {
  const eintraege = Object.entries(nutzung.zaehler)
    .filter(([id]) => gruppeVonElement(id) === gruppe)
    .sort((a, b) => b[1] - a[1])
    .slice(0, TOP_N);
  return eintraege.some(([, anzahl]) => anzahl >= NUTZUNG_SCHWELLE);
}

/**
 * DIE Regel: Basis-Stufe (T7) × Tätigkeit × Nutzung → Stufe. Rein, testbar,
 * kennt keinen Store.
 *
 * Reihenfolge: (1) Tätigkeits-Matrix (Werkzeug demotet export/ebenen beim
 * Zeichnen) → (2) Anti-Dimm-Floor (`aktionLaeuft` hebt nie unter die
 * Basis-Stufe — "ein aktives Element/Panel wird nie gedimmt") → (2b)
 * dieselbe Anti-Dimm-Floor für ein offenes Ebenen-Panel (`panelOffen`,
 * Fable-Review-2-Auflage J3c-0b) → (3) Werkplan-Phase hebt eine
 * zurückgestellte Export-Stufe einmal an, gedeckelt auf die Basis-Stufe →
 * (4) Nutzer-Adaption: oft genutzte Top-3-Elemente heben die Gruppe maximal
 * eine Stufe (selten→sekundär), nie über primär, nie unter das bisherige
 * Ergebnis (die Hebung ist rein additiv).
 */
export function adaptiveFokusStufe(
  gruppe: LeistenGruppe,
  basis: FokusStufe,
  kontext: TaetigkeitsKontext,
  nutzung: NutzungsProfil,
): FokusStufe {
  const regel = TAETIGKEITS_REGELN[gruppe];
  let stufe: FokusStufe = regel.beimZeichnen !== 'basis' && istZeichenKontext(kontext.tool)
    ? regel.beimZeichnen
    : basis;

  if (kontext.aktionLaeuft) {
    // Anti-Nerv-Wache: ein gerade aktives Element/Panel wird nie gedimmt.
    stufe = stufeMax(stufe, basis);
  } else if (gruppe === 'ebenen' && kontext.panelOffen) {
    // Fable-Review-2-Auflage J3c-0b: ein offenes Ebenen-Panel (Sonne/Draw/
    // Liste/Raster/Splat/Studie) wird nie gedimmt — die Gruppe bleibt auf
    // Basis, unabhängig von der Zeichnen-Demotion oben.
    stufe = stufeMax(stufe, basis);
  } else if (gruppe === 'export' && stufe === 'selten' && kontext.phase === 'werkplan') {
    // Werkplan braucht Export laufend — hebt die Zeichnen-Demotion einmal an.
    stufe = stufeMin(stufeAnheben(stufe), basis);
  }

  if (stufe === 'selten' && gruppeIstOftGenutzt(gruppe, nutzung)) {
    stufe = 'sekundaer';
  }

  return stufe;
}

/** Anti-Nerv-Wache: bei laufender Aktion wird NIE neu berechnet. */
export function darfUmordnen(kontext: TaetigkeitsKontext): boolean {
  return !kontext.aktionLaeuft;
}

// ---------------------------------------------------------------------------
// Element-Hebung (J3c, 2.2 Schlussabsatz) — Fable-Review-2-Auflage J3c-2.
//
// CSS-`opacity` ist multiplikativ: ein Kind mit `k-sekundaer` (0.92) innerhalb
// einer `k-selten`-Gruppe (0.6) erscheint effektiv bei 0.6*0.92 ≈ 0.55 —
// DUNKLER als die Gruppe selbst, nie heller. Eine Hebung "aufs Kind" ist also
// wirkungslos (schlimmer: kontraproduktiv), solange die GRUPPE als Ganzes
// dimmt. Die Lösung: die Dimmung wird — nur für Gruppen mit einem gehobenen
// Element — pro Kind angewandt (`opazitaetsWert`/`opazitaetsKlasse`, s.u.),
// nicht mehr am Gruppen-Wrapper; DesignWorkspace neutralisiert dafür dessen
// eigene Opacity (`style={{ opacity: 1 }}`, die `fokusKlasse`-Klasse bleibt
// für Tests/Font-Neutralität unangetastet). Beide Hebungs-Helfer setzen NUR
// `opacity` — nie `font-size`/`font-weight` (2.3.1: kein Layout-Shift durch
// die Hebung). `KButton` (kosmo-ui) setzt selbst immer eine Inline-`opacity`
// — darum braucht DesignWorkspace dort den NUMERISCHEN Wert (`opazitaetsWert`,
// als `style.opacity`), eine CSS-Klasse (`opazitaetsKlasse`) würde von
// KButtons eigener Inline-Eigenschaft überschattet und wäre wirkungslos.
// ---------------------------------------------------------------------------

/** Reine Opazitäts-Klasse ohne Font-Kopplung (aura.css `.k-opazitaet-*`) —
 *  Gegenstück zu `fokusKlasse` (state/fokus.ts), aber garantiert ohne
 *  font-size/font-weight, für die Pro-Kind-Anwendung der Element-Hebung auf
 *  Elementen, die NICHT schon selbst eine konkurrierende Inline-`opacity`
 *  setzen (s. `opazitaetsWert` für den Gegenfall, z.B. `KButton`). */
export function opazitaetsKlasse(stufe: FokusStufe): string {
  return `k-opazitaet-${stufe}`;
}

const OPAZITAET_WERT: Record<FokusStufe, number> = { primaer: 1, sekundaer: 0.92, selten: 0.6 };

/**
 * Numerischer Opazitätswert einer Stufe (spiegelt `aura.css` `.k-primaer`/
 * `.k-sekundaer`/`.k-selten`) — für die Pro-Kind-Hebung auf Komponenten wie
 * `KButton` (`packages/kosmo-ui/src/components.tsx`), die selbst IMMER eine
 * explizite Inline-`opacity` setzen (`opacity: disabled ? 0.45 : 1`). Eine
 * externe CSS-Klasse (auch `opazitaetsKlasse`) kann diese bereits gesetzte
 * Inline-Eigenschaft NIE überschreiben — die CSS-Kaskade lässt Inline-Styles
 * grundsätzlich vor jeder nicht-`!important`-Stylesheet-Regel gewinnen. Der
 * numerische Wert muss darum selbst als `style.opacity` durchgereicht werden
 * (DesignWorkspace tut das über `elementStil`), nicht als className.
 */
export function opazitaetsWert(stufe: FokusStufe): number {
  return OPAZITAET_WERT[stufe];
}

function topElementeDerGruppe(gruppe: LeistenGruppe, nutzung: NutzungsProfil, n: number): [string, number][] {
  return Object.entries(nutzung.zaehler)
    .filter(([id]) => gruppeVonElement(id) === gruppe)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n);
}

/**
 * Welches Element (falls eines) ist in `gruppe` unter den Top-3 UND oft genug
 * genutzt (>= NUTZUNG_SCHWELLE), um SICH SELBST — nicht die ganze Gruppe —
 * eine Stufe über die aktuelle Gruppen-Stufe zu heben? Liefert höchstens EIN
 * Element (das meistgenutzte, das die Schwelle erreicht); "ein oft genutztes
 * Element" (2.2, Schlussabsatz) ist bewusst Einzahl — bei einem Gleichstand
 * gewinnt das zuerst in `Object.entries`-Reihenfolge gefundene, was für
 * `Record`-Einträge stabil die Einfügereihenfolge ist. Rein, kennt keinen
 * Store.
 */
export function gehobenesElementDerGruppe(gruppe: LeistenGruppe, nutzung: NutzungsProfil): string | undefined {
  const top = topElementeDerGruppe(gruppe, nutzung, TOP_N);
  return top.find(([, anzahl]) => anzahl >= NUTZUNG_SCHWELLE)?.[0];
}

/**
 * Element-Fokus-Stufe: ist `elementId` das gehobene Element seiner Gruppe
 * (`gehobenesElement`, aus `gehobenesElementDerGruppe`)? → eine Stufe über
 * `gruppenStufe` (gedeckelt auf primär, `stufeAnheben`). Sonst unverändert —
 * bleibt exakt auf der Gruppen-Stufe. Rein, testbar.
 */
export function elementFokusStufe(
  elementId: string,
  gruppenStufe: FokusStufe,
  gehobenesElement: string | undefined,
): FokusStufe {
  return elementId === gehobenesElement ? stufeAnheben(gruppenStufe) : gruppenStufe;
}

/**
 * J3b: leitet den `TaetigkeitsKontext` aus dem in DesignWorkspace vorhandenen
 * State ab — reine Funktion, unit-testbar ohne React/DOM (Muster A4,
 * `sketch-3d.ts`). `aktionLaeuft` ist wahr, solange eine Punktkette offen ist
 * ODER ein Element per 2D-Drag gezogen wird (`onMoveStart…onMoveEnd`).
 *
 * **Ehrliche Restgrenze:** ein im 3D-Viewport laufender Freihand-Strich
 * (`sketchPending` in `Viewport3D.tsx`) ist von hier aus nicht sichtbar —
 * `Viewport3D.tsx` ist die heisse Datei der Viewport-Spur (J1a/J2/J1b) und
 * bleibt in J3b bewusst unangetastet, um keinen Datei-Konflikt mit dem
 * parallel laufenden J1b zu riskieren. Die Punktketten-/Drag-Wache deckt den
 * weit häufigeren 2D-/Klick-Fall vollständig ab.
 */
export function leiteTaetigkeitsKontextAb(params: {
  tool: string;
  phase: 'vorprojekt' | 'bauprojekt' | 'werkplan';
  punkteOffen: boolean;
  ziehtElement: boolean;
  /** Fable-Review-2-Auflage (J3c-0b): irgendein Ebenen-Panel gerade offen. */
  panelOffen: boolean;
}): TaetigkeitsKontext {
  return {
    tool: params.tool,
    phase: params.phase,
    aktionLaeuft: params.punkteOffen || params.ziehtElement,
    panelOffen: params.panelOffen,
  };
}

// ---------------------------------------------------------------------------
// Laufzeit-Store (localStorage, Versionsschlüssel kosmo.adaption.v1)
// ---------------------------------------------------------------------------

const STORAGE_KEY = 'kosmo.adaption.v1';
const HALBWERTSZEIT_TAGE = 7;
const MS_PRO_TAG = 24 * 60 * 60 * 1000;
/** Reste unterhalb dieser Schwelle werden beim Verfall ganz entfernt. */
const VERFALL_MINIMUM = 0.01;

interface AdaptionSpeicher {
  version: 1;
  /** Opt-out-Schalter — Default an. */
  aktiv: boolean;
  profil: NutzungsProfil;
  /** ms-Zeitstempel der letzten Speicherung, Grundlage für den Verfall beim Laden. */
  gespeichertAm: number;
}

function leeresProfil(): NutzungsProfil {
  return { zaehler: {}, zuletzt: {} };
}

function basiszustand(): AdaptionSpeicher {
  return { version: 1, aktiv: true, profil: leeresProfil(), gespeichertAm: Date.now() };
}

/**
 * Minimaler In-Memory-Ersatz, falls die Laufzeit kein `localStorage` kennt
 * (z.B. Vitest ohne jsdom). Echte Browser-/Electron-Umgebungen bringen ihr
 * eigenes `localStorage` mit — dieser Ersatz füllt nur die Lücke, wenn
 * keins da ist, und überschreibt nie ein vorhandenes.
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

/** Defensiver Lese-Weg: kaputtes JSON/falsche Form → Basiszustand, kein Crash. */
function ladeSpeicherRoh(): AdaptionSpeicher {
  const storage = holeStorage();
  if (!storage) return basiszustand();
  let roh: string | null;
  try {
    roh = storage.getItem(STORAGE_KEY);
  } catch {
    return basiszustand();
  }
  if (!roh) return basiszustand();
  try {
    const geparst: unknown = JSON.parse(roh);
    if (!istGueltigerSpeicher(geparst)) return basiszustand();
    return geparst;
  } catch {
    return basiszustand();
  }
}

function istGueltigerSpeicher(wert: unknown): wert is AdaptionSpeicher {
  if (typeof wert !== 'object' || wert === null) return false;
  const w = wert as Record<string, unknown>;
  if (w['version'] !== 1) return false;
  if (typeof w['aktiv'] !== 'boolean') return false;
  if (typeof w['gespeichertAm'] !== 'number') return false;
  const profil = w['profil'];
  if (typeof profil !== 'object' || profil === null) return false;
  const p = profil as Record<string, unknown>;
  if (typeof p['zaehler'] !== 'object' || p['zaehler'] === null) return false;
  if (typeof p['zuletzt'] !== 'object' || p['zuletzt'] === null) return false;
  return true;
}

function schreibeSpeicher(speicher: AdaptionSpeicher): void {
  const storage = holeStorage();
  if (!storage) return;
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(speicher));
  } catch {
    // Privater Modus/volles Kontingent — Adaption bleibt einfach flüchtig.
  }
}

/** Verfall unter dieser Zeitspanne ist bedeutungslos (7-Tage-Halbwertszeit)
 *  und würde nur Fliesskomma-Rauschen einführen, wenn zwei `nutzungMelden`-
 *  Aufrufe innerhalb derselben Sekunde landen (z.B. zwei schnelle Klicks). */
const VERFALL_MINDESTABSTAND_MS = 1000;

/** Lädt den Speicher und wendet den Nutzungs-Verfall (Halbwertszeit 7 Tage)
 *  gemäss der seit `gespeichertAm` verstrichenen Zeit an. */
function ladeUndVerfalle(): AdaptionSpeicher {
  const speicher = ladeSpeicherRoh();
  const jetzt = Date.now();
  const deltaMs = jetzt - speicher.gespeichertAm;
  if (deltaMs < VERFALL_MINDESTABSTAND_MS) return speicher;
  return {
    ...speicher,
    profil: nutzungVerfallen(speicher.profil, deltaMs / MS_PRO_TAG),
    gespeichertAm: jetzt,
  };
}

/** Klick/Shortcut zählt: erhöht den gewichteten Zähler und aktualisiert
 *  den Zeitstempel für dieses Element. Wendet zuerst den fälligen Verfall an. */
export function nutzungMelden(elementId: string): void {
  const speicher = ladeUndVerfalle();
  const jetzt = Date.now();
  const zaehler = { ...speicher.profil.zaehler, [elementId]: (speicher.profil.zaehler[elementId] ?? 0) + 1 };
  const zuletzt = { ...speicher.profil.zuletzt, [elementId]: jetzt };
  schreibeSpeicher({ ...speicher, profil: { zaehler, zuletzt }, gespeichertAm: jetzt });
}

/** Reiner Verfall: Halbwertszeit 7 Tage. `tage` = seit der letzten
 *  Speicherung/dem letzten Laden verstrichene Tage. Sehr kleine Reste
 *  werden ganz entfernt statt endlos klein weitergeschleppt. */
export function nutzungVerfallen(profil: NutzungsProfil, tage: number): NutzungsProfil {
  if (tage <= 0) return profil;
  const faktor = 0.5 ** (tage / HALBWERTSZEIT_TAGE);
  const zaehler: Record<string, number> = {};
  for (const [id, wert] of Object.entries(profil.zaehler)) {
    const neu = wert * faktor;
    if (neu >= VERFALL_MINIMUM) zaehler[id] = neu;
  }
  return { zaehler, zuletzt: profil.zuletzt };
}

/**
 * Setzt NUR das gelernte Nutzungsprofil zurück (Häufigkeit + Zuletzt) —
 * Oberfläche fällt auf die Tätigkeits-Matrix (2.2) ohne Nutzer-Adaption
 * zurück. Der Opt-out-Schalter (`aktiv`) bleibt UNANGETASTET.
 *
 * Fable-Review-2-Auflage J3c-1: früher löschte dies den kompletten
 * `kosmo.adaption.v1`-Eintrag inklusive `aktiv` — ein Reset hätte damit ein
 * zuvor gesetztes Opt-out (Schalter aus) heimlich rückgängig gemacht. Die
 * Semantik ist jetzt getrennt: `adaptionZuruecksetzen()` rührt nie `aktiv`
 * an, `setAdaptionAktiv()` rührt nie `profil` an.
 */
export function adaptionZuruecksetzen(): void {
  const speicher = ladeUndVerfalle();
  schreibeSpeicher({ ...speicher, profil: leeresProfil(), gespeichertAm: Date.now() });
}

/** Opt-out-Schalter (Default an). Kaputter/fehlender Eintrag → an. */
export function adaptionAktiv(): boolean {
  return ladeSpeicherRoh().aktiv;
}

/**
 * Setzt NUR den Opt-out-Schalter — schreibt nie das gelernte Profil (auch
 * nicht implizit über einen Basiszustand-Fallback). Damit ein Reset (s.o.)
 * nie versehentlich ein Opt-out zurücknimmt und umgekehrt ein Umschalten
 * nie das Profil wischt (Fable-Review-2-Auflage J3c-1).
 */
export function setAdaptionAktiv(aktiv: boolean): void {
  const speicher = ladeUndVerfalle();
  schreibeSpeicher({ ...speicher, aktiv, gespeichertAm: Date.now() });
}

/**
 * Fable-Review-1-Auflage: Getter für das persistierte, bereits verfallene
 * Nutzungsprofil — damit Aufrufer (J3b) `adaptiveFokusStufe(...)` mit dem
 * echten gelernten Profil füttern können, statt selbst den Store zu lesen.
 */
export function nutzungsProfil(): NutzungsProfil {
  return ladeUndVerfalle().profil;
}
