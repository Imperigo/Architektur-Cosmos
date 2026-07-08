/**
 * Adaptions-Regelwerk — jetzt der KosmoDesign-ADAPTER auf den stationsneutralen
 * Kern (Serie J2 / Batch B1 — docs/SERIE-J2-IMMERSIVE-OBERFLAECHE.md
 * Abschnitt 3.1/4). Ursprünglich (Serie J / Batch J3a, docs/SERIE-J-BUILDPLAN.md
 * Abschnitt 2) ein einziges, in sich geschlossenes Modul; B1 hat den
 * stationsneutralen Teil (Storage-Layer, Rang-/Opazitäts-Helfer, die drei
 * Primitive hinter `adaptiveFokusStufe`) nach `oberflaeche-adaption-kern.ts`
 * verschoben. **Dieses Modul bleibt für KosmoDesign nach aussen identisch** —
 * exakt dieselben Exporte, exakt dieselben Signaturen, exakt dasselbe
 * Verhalten (Regression = null). `DesignWorkspace.tsx` braucht dafür KEINE
 * Änderung; `test/oberflaeche-adaption.test.ts` bleibt unverändert grün.
 *
 * **Laufzeit ≠ Modell:** Adaption ist Nutzer-/Gerätezustand, kein Projekt-
 * inhalt — sie lebt in `localStorage` unter dem Versionsschlüssel
 * `kosmo.adaption.v1` (geteilt mit jeder weiteren Station, Entscheid 2),
 * geht NIE ins Doc/Yjs/Undo und berührt keine Goldens.
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
import {
  gehobenesElementDerGruppe as gehobenesElementDerGruppeKern,
  stufeAnheben,
  stufeAusRegel,
  stufeMin,
  wendeAntiDimmAn,
  wendeNutzerHebungAn,
  darfUmordnen as darfUmordnenKern,
  type NutzungsProfil,
} from './oberflaeche-adaption-kern';

// Rein durchgereicht (B1: 1:1 aus dem Kern, keine Design-spezifische Logik
// mehr nötig) — siehe API-Schnitt SERIE-J2-IMMERSIVE-OBERFLAECHE.md 3.1.
export {
  istUnterBasis,
  opazitaetsKlasse,
  opazitaetsWert,
  elementFokusStufe,
  nutzungMelden,
  nutzungVerfallen,
  adaptionZuruecksetzen,
  adaptionAktiv,
  setAdaptionAktiv,
  nutzungsProfil,
} from './oberflaeche-adaption-kern';
export type { NutzungsProfil } from './oberflaeche-adaption-kern';

// ---------------------------------------------------------------------------
// Typen (API aus Abschnitt 2.1, exakt — unverändert seit J3a)
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

/**
 * DIE Regel: Basis-Stufe (T7) × Tätigkeit × Nutzung → Stufe. Rein, testbar,
 * kennt keinen Store.
 *
 * B1: komponiert jetzt die drei Kern-Primitive statt inline zu rechnen —
 * Reihenfolge unverändert: (1) Tätigkeits-Matrix (`stufeAusRegel`, Werkzeug
 * demotet export/ebenen beim Zeichnen) → (2) Anti-Dimm-Floor (`wendeAntiDimmAn`,
 * `aktionLaeuft` hebt nie unter die Basis-Stufe) → (2b) dieselbe Anti-Dimm-
 * Floor für ein offenes Ebenen-Panel (`panelOffen`, Fable-Review-2-Auflage
 * J3c-0b — zweiter `wendeAntiDimmAn`-Aufruf, nur falls (2) nicht schon griff)
 * → (3) Werkplan-Phase hebt eine zurückgestellte Export-Stufe einmal an,
 * gedeckelt auf die Basis-Stufe (bleibt LOKAL — nur Design kennt SIA-Phasen,
 * ist NICHT Teil des Kerns) → (4) Nutzer-Adaption (`wendeNutzerHebungAn`):
 * oft genutzte Top-3-Elemente heben die Gruppe maximal eine Stufe.
 */
export function adaptiveFokusStufe(
  gruppe: LeistenGruppe,
  basis: FokusStufe,
  kontext: TaetigkeitsKontext,
  nutzung: NutzungsProfil,
): FokusStufe {
  const regel = TAETIGKEITS_REGELN[gruppe];
  const regelStufe = istZeichenKontext(kontext.tool) ? regel.beimZeichnen : 'basis';
  let stufe = stufeAusRegel(regelStufe, basis);

  stufe = wendeAntiDimmAn(stufe, basis, kontext.aktionLaeuft);
  stufe = wendeAntiDimmAn(stufe, basis, !kontext.aktionLaeuft && gruppe === 'ebenen' && kontext.panelOffen);

  if (!kontext.aktionLaeuft && gruppe === 'export' && stufe === 'selten' && kontext.phase === 'werkplan') {
    // Werkplan-Phasen-Sonderfall — bleibt lokal, ist NICHT generisch (nur
    // Design kennt SIA-Phasen; die Rang-Arithmetik `stufeMin`/`stufeAnheben`
    // ist geteilt, die REGEL selbst gehört exklusiv hierher).
    stufe = stufeMin(stufeAnheben(stufe), basis);
  }

  return wendeNutzerHebungAn(stufe, gruppe, LEISTEN_GRUPPEN, nutzung);
}

/** Anti-Nerv-Wache: bei laufender Aktion wird NIE neu berechnet. */
export function darfUmordnen(kontext: TaetigkeitsKontext): boolean {
  return darfUmordnenKern(kontext.aktionLaeuft);
}

/**
 * Element-Hebung (J3c, 2.2 Schlussabsatz) — Design-Wrapper um die im Kern
 * generalisierte Funktion (die `alleGruppen` jetzt als Parameter statt einer
 * Modul-Konstante nimmt): reicht `LEISTEN_GRUPPEN` durch, damit die
 * öffentliche Design-Signatur (2 Argumente) unverändert bleibt.
 *
 * CSS-`opacity` ist multiplikativ: ein Kind mit `k-sekundaer` (0.92) innerhalb
 * einer `k-selten`-Gruppe (0.6) erscheint effektiv bei 0.6*0.92 ≈ 0.55 —
 * DUNKLER als die Gruppe selbst, nie heller. Eine Hebung "aufs Kind" ist also
 * wirkungslos (schlimmer: kontraproduktiv), solange die GRUPPE als Ganzes
 * dimmt. Die Lösung: die Dimmung wird — nur für Gruppen mit einem gehobenen
 * Element — pro Kind angewandt (`opazitaetsWert`/`opazitaetsKlasse`, aus dem
 * Kern re-exportiert), nicht mehr am Gruppen-Wrapper; DesignWorkspace
 * neutralisiert dafür dessen eigene Opacity (`style={{ opacity: 1 }}`, die
 * `fokusKlasse`-Klasse bleibt für Tests/Font-Neutralität unangetastet).
 */
export function gehobenesElementDerGruppe(gruppe: LeistenGruppe, nutzung: NutzungsProfil): string | undefined {
  return gehobenesElementDerGruppeKern(gruppe, LEISTEN_GRUPPEN, nutzung);
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
