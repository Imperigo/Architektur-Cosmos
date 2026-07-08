/**
 * Starter-Guide — reine Schritt-Logik (V1.6 Block E, docs/V16-AUFTRAG-PLAN.md
 * Block E + docs/SERIE-G-KOSMO-ALS-BENUTZERGUIDE.md).
 *
 * DOM-frei mit Absicht: Reihenfolge, «ist dieser Schritt erfüllt?»-Prädikate
 * und Fortschritt sind reine Funktionen eines expliziten Zustands-Schnapp-
 * schusses (`GuideZustand`) — die Komponente `StarterGuide.tsx` liest den
 * echten App-Zustand (Screen, Kosmo-Panel, Wand-Anzahl) und reicht ihn hier
 * herein. So bleibt die Logik ohne React/DOM testbar (Muster wie
 * `state/oberflaeche-adaption.ts`).
 *
 * Ehrlich «dynamisch»: die Schritte 3–5 (KosmoDesign öffnen, Wand zeichnen,
 * Kosmo-Panel) erkennen SELBST, wenn der Nutzer die Mini-Aufgabe erledigt
 * hat — kein reines «Weiter»-Klicken. Willkommen/Zentrale/Fertig sind
 * erklärende Schritte ohne automatische Erkennung; «Weiter» bleibt dort der
 * einzige (aber jederzeit sichtbare) Weg. Der Guide erzwingt nichts:
 * «Überspringen» funktioniert in jedem Schritt.
 */

/** Schnappschuss des App-Zustands, den die Erfüllt-Prädikate brauchen. */
export interface GuideZustand {
  /** Aktueller Screen der Zentrale/App ('home' | 'design' | …). */
  screen: string;
  /** Ist das Kosmo-Panel gerade geöffnet? */
  kosmoOffen: boolean;
  /**
   * Wurde seit Start dieses Guide-Laufs mindestens eine Wand gezeichnet?
   * Die Komponente vergleicht die Wand-Anzahl beim Schritt-Eintritt gegen
   * die aktuelle (`wandWurdeGezeichnet`) — so zählt auch ein Demo-Projekt
   * mit bestehenden Wänden nicht fälschlich als «erledigt».
   */
  waendeGezeichnet: boolean;
}

export interface StarterGuideSchritt {
  /** Stabile Id (auch als React-Key/Analytics-Anker geeignet). */
  id: string;
  /** Kurztitel, in der Karte gross. */
  titel: string;
  /** Erklärender Fliesstext. */
  text: string;
  /**
   * Trägt dieser Schritt eine automatische Erfüllt-Erkennung? Nur wenn
   * `automatisch` true ist, wird `erfuellt(zustand)` zum Weiterschalten
   * herangezogen — erklärende Schritte schalten ausschliesslich per Klick.
   */
  automatisch: boolean;
  /** Reines Prädikat: ist die Mini-Aufgabe dieses Schritts erledigt? */
  erfuellt: (zustand: GuideZustand) => boolean;
}

/**
 * Die sechs Schritte des Rundgangs (Owner-Auftrag P5): Willkommen →
 * Zentrale/Stationen erklären → «Öffne KosmoDesign» (Mini-Aufgabe) →
 * «Zeichne eine Wand» (Mini-Aufgabe) → Kosmo-Panel zeigen → fertig.
 */
export const STARTER_GUIDE_SCHRITTE: readonly StarterGuideSchritt[] = [
  {
    id: 'willkommen',
    titel: 'Willkommen bei KosmoOrbit',
    text:
      'Kosmo führt dich kurz durch das Programm — nicht als starre Tour, sondern indem er sieht, was du tust. Du kannst jederzeit weiterklicken, überspringen oder einfach loslegen.',
    automatisch: false,
    erfuellt: () => false,
  },
  {
    id: 'zentrale',
    titel: 'Die Zentrale',
    text:
      'Hier sind alle Stationen versammelt — KosmoDesign zum Entwerfen, KosmoData für Referenzen und Wissen, KosmoVis fürs Rendern, dazu die Büro-Stationen. Kosmo selbst ist immer erreichbar, unabhängig von der Station.',
    automatisch: false,
    erfuellt: () => false,
  },
  {
    id: 'design-oeffnen',
    titel: 'Mini-Aufgabe: Öffne KosmoDesign',
    text: 'Klicke auf die Kachel «KosmoDesign» — Kosmo merkt, sobald du drin bist, und geht dann automatisch weiter.',
    automatisch: true,
    erfuellt: (z) => z.screen === 'design',
  },
  {
    id: 'wand-zeichnen',
    titel: 'Mini-Aufgabe: Zeichne eine Wand',
    text:
      'Wähle das Werkzeug «Wand» in der Werkzeugleiste und setze zwei Punkte im Grundriss. Sobald die erste Wand steht, geht der Rundgang von selbst weiter.',
    automatisch: true,
    erfuellt: (z) => z.waendeGezeichnet,
  },
  {
    id: 'kosmo-panel',
    titel: 'Kosmo fragen',
    text:
      'Rechts sitzt Kosmo — sprich ihn direkt an, z. B. «Zeichne eine Wand von 0,0 nach 8,0». Vorschläge kommen als Karte, du entscheidest, Rückgängig gilt immer. Öffne das Panel, wenn es noch zu ist.',
    automatisch: true,
    erfuellt: (z) => z.kosmoOffen,
  },
  {
    id: 'fertig',
    titel: 'Das war der Rundgang',
    text: 'Du kennst jetzt die Zentrale, KosmoDesign und Kosmo. Über das «?» in der Kopfleiste startest du den Rundgang jederzeit erneut.',
    automatisch: false,
    erfuellt: () => false,
  },
] as const;

/** Index des ersten Schritts — einzige Quelle, statt überall die 0 zu wiederholen. */
export const ERSTER_SCHRITT_INDEX = 0;

/** Letzter gültiger Schritt-Index (der «fertig»-Schritt). */
export function letzterSchrittIndex(): number {
  return STARTER_GUIDE_SCHRITTE.length - 1;
}

/** Ist der übergebene Index der Schritt-Liste der letzte (fertig-Schritt)? */
export function istLetzterSchritt(index: number): boolean {
  return index >= letzterSchrittIndex();
}

/**
 * Ist der Schritt an `index` — laut seinem eigenen Prädikat — bereits
 * erledigt? Erklärende (nicht-automatische) Schritte liefern immer false,
 * sie schalten nur per Klick weiter.
 */
export function istSchrittErfuellt(index: number, zustand: GuideZustand): boolean {
  const schritt = STARTER_GUIDE_SCHRITTE[index];
  if (!schritt || !schritt.automatisch) return false;
  return schritt.erfuellt(zustand);
}

/**
 * Dynamisches Weiterschalten: liefert den nächsten Index, wenn der aktuelle
 * Schritt automatisch ist UND laut Zustand erfüllt — sonst bleibt der Index
 * unverändert. Reine Funktion, von `StarterGuide.tsx` in einem `useEffect`
 * aufgerufen, sooft sich der App-Zustand ändert.
 */
export function naechsterAutomatischerIndex(index: number, zustand: GuideZustand): number {
  if (istLetzterSchritt(index)) return index;
  return istSchrittErfuellt(index, zustand) ? index + 1 : index;
}

/** Fortschritt in Prozent (1-basiert: Schritt 1 von N ist bereits > 0 %). */
export function fortschrittProzent(index: number): number {
  const gesamt = STARTER_GUIDE_SCHRITTE.length;
  const geklemmt = Math.min(Math.max(index, 0), gesamt - 1);
  return Math.round(((geklemmt + 1) / gesamt) * 100);
}

/**
 * Hilfsprädikat für die «Wand zeichnen»-Mini-Aufgabe: erledigt ist sie erst,
 * wenn NACH dem Schritt-Eintritt eine neue Wand entsteht — ein Demo-Projekt
 * mit bereits vorhandenen Wänden zählt nicht automatisch als «erledigt».
 */
export function wandWurdeGezeichnet(anzahlBeiSchrittEintritt: number, anzahlJetzt: number): boolean {
  return anzahlJetzt > anzahlBeiSchrittEintritt;
}

// ---------------------------------------------------------------------------
// Laufzeit-Flag (localStorage) — getrennt vom bestehenden `kosmo.onboarded`.
// ---------------------------------------------------------------------------

/**
 * Eigenes Flag (V1.6 Block E): `kosmo.onboarded` schaltet nur die statische
 * «Erste Schritte»-Karte der Zentrale aus, der Starter-Guide ist ein
 * eigenständiger, wiederholbarer Rundgang mit eigenem Gedächtnis.
 */
export const STARTER_GUIDE_STORAGE_KEY = 'kosmo.starterGuide.done';

/**
 * Minimaler In-Memory-Ersatz, falls die Laufzeit kein `localStorage` kennt
 * (z. B. Vitest ohne jsdom) — selbes Muster wie
 * `state/oberflaeche-adaption.ts`: füllt nur die Lücke, überschreibt nie ein
 * vorhandenes `localStorage`.
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

/** Hat der Nutzer den Rundgang schon einmal beendet (fertig oder übersprungen)? */
export function istStarterGuideAbgeschlossen(): boolean {
  return holeStorage()?.getItem(STARTER_GUIDE_STORAGE_KEY) === '1';
}

/** Markiert den Rundgang als abgeschlossen — verhindert den Auto-Start künftig. */
export function starterGuideAlsAbgeschlossenMarkieren(): void {
  holeStorage()?.setItem(STARTER_GUIDE_STORAGE_KEY, '1');
}

/**
 * «Erneut»-Start (das dezente «?» in der Kopfleiste): fängt IMMER beim
 * ersten Schritt an, unabhängig vom gespeicherten Abgeschlossen-Flag — das
 * Flag steuert nur den automatischen Erststart, nie die manuelle Wiederholung.
 */
export function starterGuideErneutStarten(): number {
  return ERSTER_SCHRITT_INDEX;
}
