/**
 * Adaptions-KERN (Serie J2 / Batch B1 — docs/SERIE-J2-IMMERSIVE-OBERFLAECHE.md
 * Abschnitt 3.1/4). Stationsneutrale Extraktion aus `oberflaeche-adaption.ts`
 * (Serie J / J3a-c, KosmoDesign-Ursprung): der komplette localStorage-Layer,
 * die Rang-/Opazitäts-Helfer und die drei Primitive, aus denen der frühere
 * Design-Monolith `adaptiveFokusStufe()` bestand — jetzt so geschnitten, dass
 * JEDE Station (KosmoDesign zuerst, KosmoData ab B1, weitere folgen) dieselben
 * Bausteine mit ihrer eigenen Gruppen-/Matrix-Konfiguration komponiert.
 *
 * **Laufzeit ≠ Modell:** wie zuvor lebt die Adaption in `localStorage`
 * (`kosmo.adaption.v1`), geht NIE ins Doc/Yjs/Undo, berührt keine Goldens.
 * **EIN globaler Speicher, EIN Schalter, EIN Reset** (Entscheid 2): alle
 * Stationen teilen denselben Schlüssel — kollisionsfrei, weil jede Station
 * ihre eigene, disjunkte Gruppen-Namensmenge benutzt (`elementId` beginnt mit
 * `"<gruppe>:"`, und die Gruppen-Listen der Stationen überschneiden sich
 * nicht: Design `zeichnen/ansicht/export/ebenen/projekt/verlauf`, Data
 * `navigation/suche/sync/dossier`).
 *
 * **Kern kennt keine Station:** kein `LeistenGruppe`, kein `TaetigkeitsKontext`,
 * kein `tool`/`phase` — nur `FokusStufe`, `NutzungsProfil`, generische
 * Gruppen-Parameter (`G extends string`) und die zwei universellen
 * Tätigkeits-Felder `aktionLaeuft`/`panelOffen` (Entscheid 3), die JEDE
 * Station selbst aus ihrem eigenen State ableitet.
 */

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import type { FokusStufe } from './fokus';

export type { FokusStufe } from './fokus';

export interface NutzungsProfil {
  /** elementId → gewichteter Zähler. Konvention: `"<gruppe>:<name>"`, z.B. `"ebenen:sonne"`. */
  zaehler: Record<string, number>;
  /** elementId → Zeitstempel (ms) der letzten Nutzung. */
  zuletzt: Record<string, number>;
}

// ---------------------------------------------------------------------------
// Rang-/Opazitäts-Helfer (1:1 aus oberflaeche-adaption.ts Z. 126–298 verschoben)
// ---------------------------------------------------------------------------

const STUFEN_RANG: Record<FokusStufe, number> = { selten: 0, sekundaer: 1, primaer: 2 };
const RANG_STUFE: FokusStufe[] = ['selten', 'sekundaer', 'primaer'];

/** Ist `stufe` niedriger als `basis`? Für den Adaptions-Hinweis (2.3.5). */
export function istUnterBasis(stufe: FokusStufe, basis: FokusStufe): boolean {
  return STUFEN_RANG[stufe] < STUFEN_RANG[basis];
}

/**
 * Rang-Maximum zweier Stufen — Grundlage der Anti-Dimm-Wache
 * (`wendeAntiDimmAn`, s.u.): ein aktives Element/Panel fällt nie unter die
 * übergebene Ziel-Stufe.
 */
export function stufeMax(a: FokusStufe, b: FokusStufe): FokusStufe {
  return STUFEN_RANG[a] >= STUFEN_RANG[b] ? a : b;
}

/** Rang-Minimum zweier Stufen — für lokale, stationsspezifische
 *  Sonderfälle (z.B. Designs Werkplan-Phasen-Hebung), die eine Anhebung
 *  auf eine übergebene Decke kappen wollen. Zusätzlich zum B1-API-Schnitt
 *  exportiert, damit solche Sonderfälle keine eigene Rang-Arithmetik
 *  duplizieren müssen — die REGEL selbst bleibt lokal in der jeweiligen
 *  Station, nur die Arithmetik ist geteilt. */
export function stufeMin(a: FokusStufe, b: FokusStufe): FokusStufe {
  return STUFEN_RANG[a] <= STUFEN_RANG[b] ? a : b;
}

/** Eine Stufe anheben, gedeckelt auf `primaer`. Siehe `stufeMin` — derselbe
 *  Grund für den Zusatz-Export. */
export function stufeAnheben(stufe: FokusStufe): FokusStufe {
  return RANG_STUFE[Math.min(STUFEN_RANG[stufe] + 1, 2)]!;
}

/** Ab dieser gewichteten Nutzung zählt ein Element als "oft genutzt" genug,
 *  um für die Top-3-Hebung seiner Gruppe zu zählen (ein einzelner Klick
 *  hebt noch nichts). */
const NUTZUNG_SCHWELLE = 3;
/** "Top-3 ihrer Gruppe" (2.2, Schlussabsatz). */
const TOP_N = 3;

/**
 * Generalisiert (B1, Abschnitt 3.1): nimmt die Gruppen-Liste jetzt als
 * Parameter, statt eine fest verdrahtete Modul-Konstante (`LEISTEN_GRUPPEN`)
 * zu lesen — das war die zweite, kleinere Design-spezifische Verschmelzung
 * im Ist-Stand.
 */
function gruppeVonElement<G extends string>(elementId: string, alleGruppen: readonly G[]): G | undefined {
  const praefix = elementId.split(':', 1)[0];
  return (alleGruppen as readonly string[]).includes(praefix ?? '') ? (praefix as G) : undefined;
}

/** Ist mindestens eines der Top-3-genutzten Elemente dieser Gruppe oft
 *  genug genutzt (>= NUTZUNG_SCHWELLE), um die ganze Gruppe zu heben? */
export function gruppeIstOftGenutzt<G extends string>(
  gruppe: G,
  alleGruppen: readonly G[],
  nutzung: NutzungsProfil,
): boolean {
  const eintraege = Object.entries(nutzung.zaehler)
    .filter(([id]) => gruppeVonElement(id, alleGruppen) === gruppe)
    .sort((a, b) => b[1] - a[1])
    .slice(0, TOP_N);
  return eintraege.some(([, anzahl]) => anzahl >= NUTZUNG_SCHWELLE);
}

function topElementeDerGruppe<G extends string>(
  gruppe: G,
  alleGruppen: readonly G[],
  nutzung: NutzungsProfil,
  n: number,
): [string, number][] {
  return Object.entries(nutzung.zaehler)
    .filter(([id]) => gruppeVonElement(id, alleGruppen) === gruppe)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n);
}

/**
 * Welches Element (falls eines) ist in `gruppe` unter den Top-3 UND oft genug
 * genutzt (>= NUTZUNG_SCHWELLE), um SICH SELBST — nicht die ganze Gruppe —
 * eine Stufe über die aktuelle Gruppen-Stufe zu heben? Liefert höchstens EIN
 * Element (das meistgenutzte, das die Schwelle erreicht). Rein, kennt keinen
 * Store. Generalisiert (B1): `alleGruppen` als Parameter statt Modul-Konstante.
 */
export function gehobenesElementDerGruppe<G extends string>(
  gruppe: G,
  alleGruppen: readonly G[],
  nutzung: NutzungsProfil,
): string | undefined {
  const top = topElementeDerGruppe(gruppe, alleGruppen, nutzung, TOP_N);
  return top.find(([, anzahl]) => anzahl >= NUTZUNG_SCHWELLE)?.[0];
}

/** Reine Opazitäts-Klasse ohne Font-Kopplung (aura.css `.k-opazitaet-*`) —
 *  Gegenstück zu `fokusKlasse` (state/fokus.ts). */
export function opazitaetsKlasse(stufe: FokusStufe): string {
  return `k-opazitaet-${stufe}`;
}

const OPAZITAET_WERT: Record<FokusStufe, number> = { primaer: 1, sekundaer: 0.92, selten: 0.6 };

/** Numerischer Opazitätswert einer Stufe (spiegelt `aura.css`) — für
 *  Komponenten wie `KButton`, die selbst immer eine Inline-`opacity` setzen
 *  (s. Kommentar in `oberflaeche-adaption.ts`, unverändert übernommen). */
export function opazitaetsWert(stufe: FokusStufe): number {
  return OPAZITAET_WERT[stufe];
}

/**
 * Element-Fokus-Stufe: ist `elementId` das gehobene Element seiner Gruppe?
 * → eine Stufe über `gruppenStufe`. Sonst unverändert. Rein, testbar.
 */
export function elementFokusStufe(
  elementId: string,
  gruppenStufe: FokusStufe,
  gehobenesElement: string | undefined,
): FokusStufe {
  return elementId === gehobenesElement ? stufeAnheben(gruppenStufe) : gruppenStufe;
}

// ---------------------------------------------------------------------------
// NEU (B1): die drei Primitive, aus dem Design-Monolithen `adaptiveFokusStufe()`
// herausgezogen (Ist-Stand Z. 184–213) — jede Station komponiert sie mit ihrer
// eigenen Matrix zu ihrer eigenen `adaptiveXFokusStufe()`.
// ---------------------------------------------------------------------------

/**
 * Schritt 1: Matrix-Regel anwenden. `'basis'` heisst "keine Verschiebung,
 * bleibt auf der übergebenen Basis-Stufe" — die Regel-Zeile selbst
 * (wann eine Gruppe überhaupt eine Nicht-Basis-Stufe bekommt) bleibt Sache
 * der Station.
 */
export function stufeAusRegel(regelStufe: FokusStufe | 'basis', basis: FokusStufe): FokusStufe {
  return regelStufe === 'basis' ? basis : regelStufe;
}

/**
 * Schritt 2: Anti-Dimm-Wache — solange `aktiv` wahr ist, wird `stufe`
 * niemals unter `ziel` gedimmt (Rang-Maximum). `ziel` ist bewusst ein
 * Parameter, keine feste Grösse: Design ruft dies mit der T7-Basis der
 * Gruppe auf ("nie unter die eigene Basis"), Data ruft es mit `'primaer'`
 * auf ("während aktiv genutzt, volle Prominenz") — beides ist derselbe
 * Mechanismus, nur mit einer anderen Ziel-Stufe.
 */
export function wendeAntiDimmAn(stufe: FokusStufe, ziel: FokusStufe, aktiv: boolean): FokusStufe {
  return aktiv ? stufeMax(stufe, ziel) : stufe;
}

/**
 * Schritt 3: Top-3-Nutzer-Hebung — eine zurückgestellte (`selten`) Gruppe
 * mit oft genutztem Top-3-Element hebt sich auf `sekundaer` (2.2,
 * Schlussabsatz). Max. eine Stufe, nie über primär (weil sie ausschliesslich
 * von `selten` ausgeht) — 1:1 dieselbe Bedingung wie im früheren
 * Design-Monolithen, jetzt generisch über `G extends string`.
 */
export function wendeNutzerHebungAn<G extends string>(
  stufe: FokusStufe,
  gruppe: G,
  alleGruppen: readonly G[],
  nutzung: NutzungsProfil,
): FokusStufe {
  if (stufe === 'selten' && gruppeIstOftGenutzt(gruppe, alleGruppen, nutzung)) {
    return 'sekundaer';
  }
  return stufe;
}

/** Anti-Nerv-Wache: bei laufender Aktion wird NIE neu berechnet. Nimmt jetzt
 *  `aktionLaeuft` direkt statt eines stationsspezifischen `TaetigkeitsKontext`
 *  — der Kern kennt dessen Form nicht. */
export function darfUmordnen(aktionLaeuft: boolean): boolean {
  return !aktionLaeuft;
}

// ---------------------------------------------------------------------------
// Laufzeit-Store (localStorage, Versionsschlüssel kosmo.adaption.v1) — 1:1
// aus oberflaeche-adaption.ts (Z. 330–525) verschoben, unverändert.
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
 * Oberfläche fällt auf die Tätigkeits-Matrix ohne Nutzer-Adaption zurück.
 * Der Opt-out-Schalter (`aktiv`) bleibt UNANGETASTET (J3c-1: Reset und
 * Opt-out sind getrennte Semantiken, keins rührt die Grösse des anderen an).
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
 * nicht implizit über einen Basiszustand-Fallback).
 */
export function setAdaptionAktiv(aktiv: boolean): void {
  const speicher = ladeUndVerfalle();
  schreibeSpeicher({ ...speicher, aktiv, gespeichertAm: Date.now() });
}

/** Getter für das persistierte, bereits verfallene Nutzungsprofil. */
export function nutzungsProfil(): NutzungsProfil {
  return ladeUndVerfalle().profil;
}

// ---------------------------------------------------------------------------
// NEU (B1, Entscheid 4): `useAdaptionsSteuerung()` — die ~100 Zeilen
// React-Verdrahtung aus DesignWorkspace.tsx (Z. 710–826: stabilerKontext-
// State, Debounce-Timer, adaptionIstAn-State, elementStil, gedaempfteGruppen)
// generisch über `G extends string`, damit jede weitere Station sie
// wiederverwendet statt denselben Code neu zu schreiben. DesignWorkspace.tsx
// selbst bleibt in B1 unverändert (Regression = null) — diese Zeilen sind
// das verbindliche Verhalten, das der Hook 1:1 reproduziert; KosmoData
// (DataWorkspace.tsx) ist der erste tatsächliche Konsument.
// ---------------------------------------------------------------------------

/** Regel 2.3.2: 2s Debounce nach Aktionsende, bevor eine Demotion wieder
 *  greift. Geteilte Quelle statt einer lokalen Kopie je Station (die
 *  Data-E2E-Suite importiert dieselbe Konstante statt sie zu duplizieren). */
export const ADAPTION_DEBOUNCE_MS = 2000;

const LEERES_NUTZUNGSPROFIL: NutzungsProfil = { zaehler: {}, zuletzt: {} };

export interface AdaptionsSteuerungOptions<G extends string, K extends { aktionLaeuft: boolean }> {
  /** Der stationsspezifische Tätigkeitskontext, frisch aus dem Component-State
   *  abgeleitet (z.B. `leiteDatenTaetigkeitsKontextAb(...)`). */
  taetigkeitsKontext: K;
  /** Alle Gruppen dieser Station, in fester Reihenfolge (für Top-3-Hebung
   *  und `gehobenesElementDerGruppe`). */
  alleGruppen: readonly G[];
  /** T7-Basis je Gruppe dieser Station. */
  basisProGruppe: Record<G, FokusStufe>;
  /** Die stationsspezifische Matrix-Funktion (z.B. `adaptiveDatenFokusStufe`). */
  adaptiveStufe: (gruppe: G, basis: FokusStufe, kontext: K, nutzung: NutzungsProfil) => FokusStufe;
  /** Debounce-Fenster nach Aktionsende (Default: `ADAPTION_DEBOUNCE_MS`). */
  debounceMs?: number;
}

export interface AdaptionsSteuerung<G extends string> {
  /** Opt-out-Schalter, Default an (`adaptionAktiv()` beim ersten Render). */
  adaptionIstAn: boolean;
  /** Schreibt NUR den Schalter, wirkt sofort ohne Reload (J3c-1/J3c-5). */
  adaptionUmschalten: (aktiv: boolean) => void;
  /** Löscht NUR das gelernte Profil, lässt den Schalter unangetastet. */
  adaptionZuruecksetzenUndAuffrischen: () => void;
  /** Die adaptive Fokus-Stufe einer Gruppe (Basis, wenn Adaption ausgeschaltet). */
  stufeFuerGruppe: (gruppe: G) => FokusStufe;
  /** Alle Gruppen, die gerade unter ihre T7-Basis gedimmt sind (2.3.5). */
  gedaempfteGruppen: G[];
  /** Kurzform für `gedaempfteGruppen.length > 0`. */
  adaptionHinweisSichtbar: boolean;
  /** Inline-Style für EIN Element (`gruppe:name`) — trägt die numerische
   *  Opazität nur, wenn die Gruppe ein gehobenes Element hat (J3c-2). */
  elementStil: (gruppe: G, name: string) => { style?: CSSProperties };
  /** Hat `gruppe` gerade ein gehobenes Element? Der Gruppen-Wrapper
   *  neutralisiert dann seine eigene Opazität (`opacity: 1`), damit das
   *  Kind seine eigene (höhere) Opazität durchsetzen kann (J3c-2). */
  gruppeHatGehobenesElement: (gruppe: G) => boolean;
}

/**
 * Geteilte React-Steuerung für die adaptive Werkzeug-/Tabsleiste einer
 * Station. Kapselt exakt das Verhalten, das DesignWorkspace.tsx (Z. 710–826)
 * heute inline berechnet: Freeze während einer laufenden Aktion + 2s-
 * Debounce danach (Regel 2.3.2), ein expliziter Opt-out-React-State (J3c-1),
 * Top-3-Element-Hebung ohne die multiplikative CSS-opacity-Falle (J3c-2).
 */
export function useAdaptionsSteuerung<G extends string, K extends { aktionLaeuft: boolean }>(
  opts: AdaptionsSteuerungOptions<G, K>,
): AdaptionsSteuerung<G> {
  const { taetigkeitsKontext, alleGruppen, basisProGruppe, adaptiveStufe, debounceMs = ADAPTION_DEBOUNCE_MS } = opts;

  const [stabilerKontext, setStabilerKontext] = useState<K>(taetigkeitsKontext);
  const [nutzungSnapshot, setNutzungSnapshot] = useState<NutzungsProfil>(() => nutzungsProfil());
  const freezeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (taetigkeitsKontext.aktionLaeuft) {
      // Anti-Nerv-Wache: eine laufende Aktion wird SOFORT übernommen (die
      // Anti-Dimm-Wache in `adaptiveStufe` hebt die betroffene Gruppe da
      // ohnehin auf ihre Ziel-Stufe — nie eine Dimmung mitten in der Aktion).
      if (freezeTimer.current) {
        clearTimeout(freezeTimer.current);
        freezeTimer.current = null;
      }
      setStabilerKontext(taetigkeitsKontext);
      return;
    }
    if (stabilerKontext.aktionLaeuft) {
      // Aktion endet gerade: eine neue, tiefere Stufe wartet `debounceMs`,
      // bevor sie einfällt (Regel 2.3.2).
      freezeTimer.current = setTimeout(() => {
        setStabilerKontext(taetigkeitsKontext);
        setNutzungSnapshot(nutzungsProfil());
      }, debounceMs);
      return () => {
        if (freezeTimer.current) clearTimeout(freezeTimer.current);
      };
    }
    // Reiner Wechsel im Ruhezustand (kein vorheriges `aktionLaeuft`): sofort,
    // kein künstliches Warten.
    setStabilerKontext(taetigkeitsKontext);
    setNutzungSnapshot(nutzungsProfil());
    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taetigkeitsKontext]);

  const [adaptionIstAn, setAdaptionIstAnState] = useState(() => adaptionAktiv());
  const adaptionUmschalten = (aktiv: boolean) => {
    setAdaptionAktiv(aktiv);
    setAdaptionIstAnState(aktiv);
  };
  const adaptionZuruecksetzenUndAuffrischen = () => {
    adaptionZuruecksetzen();
    setNutzungSnapshot(nutzungsProfil());
  };

  const nutzung = adaptionIstAn ? nutzungSnapshot : LEERES_NUTZUNGSPROFIL;
  const stufeFuerGruppe = (gruppe: G): FokusStufe => {
    const basis = basisProGruppe[gruppe];
    return adaptionIstAn ? adaptiveStufe(gruppe, basis, stabilerKontext, nutzung) : basis;
  };
  const gedaempfteGruppen = alleGruppen.filter((g) => istUnterBasis(stufeFuerGruppe(g), basisProGruppe[g]));
  const adaptionHinweisSichtbar = gedaempfteGruppen.length > 0;

  const gehobenNachGruppe = Object.fromEntries(
    alleGruppen.map((g) => [g, adaptionIstAn ? gehobenesElementDerGruppe(g, alleGruppen, nutzung) : undefined]),
  ) as Record<G, string | undefined>;

  function elementStil(gruppe: G, name: string): { style?: CSSProperties } {
    const gehoben = gehobenNachGruppe[gruppe];
    if (!gehoben) return {};
    const stufe = elementFokusStufe(`${gruppe}:${name}`, stufeFuerGruppe(gruppe), gehoben);
    return { style: { opacity: opazitaetsWert(stufe) } };
  }

  function gruppeHatGehobenesElement(gruppe: G): boolean {
    return gehobenNachGruppe[gruppe] !== undefined;
  }

  return {
    adaptionIstAn,
    adaptionUmschalten,
    adaptionZuruecksetzenUndAuffrischen,
    stufeFuerGruppe,
    gedaempfteGruppen,
    adaptionHinweisSichtbar,
    elementStil,
    gruppeHatGehobenesElement,
  };
}
