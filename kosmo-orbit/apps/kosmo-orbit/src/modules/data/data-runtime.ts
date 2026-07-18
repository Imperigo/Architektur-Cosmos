import { create } from 'zustand';
import type { Learning } from '@kosmo/ai';
import type { RefEntry } from '@kosmo/data';

/**
 * KosmoData-Laufzeit (v0.6.8 K1, «KosmoData sichtbar») — Laufzeit-Blob-Store
 * für Referenz-Hero-Bilder, nach dem Muster von `modules/vis/vis-runtime.ts`:
 * Laufzeit ≠ Modell. Objekt-URLs/Blobs leben NIE im Doc/Yjs/Undo — sie werden
 * on-demand geholt (nur wenn die Karte sichtbar wird und der Nutzer das
 * Online-Laden nicht deaktiviert hat) und bleiben für die Sitzungsdauer im
 * Speicher (kein `revokeObjectURL` pro Bild — der Cache IST der Zweck).
 *
 * Ehrlichkeits-Vertrag (Owner-Mandat): schlägt der Abruf fehl oder ist er
 * nicht erlaubt, zeigt die Karte KEIN kaputtes `<img>`, sondern den
 * deterministischen Tusche-Platzhalter je Typologie plus die ehrliche Zeile
 * «Bild nicht lokal — Quelle: <domain>».
 */

/** Nutzer-Schalter: '0' = Online-Bildabruf aus (Default: an). */
export const BILDER_ONLINE_KEY = 'kosmo.data.bilderOnline';

export type HeroBildZustand =
  | { status: 'laedt' }
  | { status: 'lokal'; objectUrl: string }
  | { status: 'nichtLokal'; quelle: string };

interface DataRuntime {
  bilder: Record<string, HeroBildZustand>;
  setzeBild: (refId: string, zustand: HeroBildZustand) => void;
}

export const useDataRuntime = create<DataRuntime>((set) => ({
  bilder: {},
  setzeBild: (refId, zustand) => set((s) => ({ bilder: { ...s.bilder, [refId]: zustand } })),
}));

/** true, wenn die URL einen fremden Host anspricht (http/https absolut). */
export function istExterneUrl(url: string): boolean {
  return /^https?:\/\//i.test(url);
}

/**
 * Ehrliche Quellen-Angabe für die «Bild nicht lokal»-Zeile: bei externen
 * URLs der Hostname (z.B. `upload.wikimedia.org`), bei relativen Pfaden der
 * eingebaute Build-Bestand (die Datei fehlt dann schlicht im Build).
 */
export function bildQuelle(url: string): string {
  if (istExterneUrl(url)) {
    try {
      return new URL(url).hostname;
    } catch {
      return url;
    }
  }
  return 'Build-Bestand';
}

/**
 * Darf die Laufzeit externe Bild-URLs abrufen? Drei ehrliche Neins:
 *  1. Unter Playwright/WebDriver NIE (E2E dürfen keinen fetch nach aussen
 *     machen — `navigator.webdriver` ist dort immer gesetzt).
 *  2. Wenn der Nutzer das Online-Laden abgeschaltet hat (`kosmo.data.
 *     bilderOnline` = '0', Laufzeit-Einstellung, kein Doc-Zustand).
 *  3. Wenn der Browser offline ist (der Versuch wäre nur ein Fehler-Toast).
 */
export function onlineBilderErlaubt(): boolean {
  if (typeof navigator !== 'undefined' && navigator.webdriver) return false;
  try {
    if (localStorage.getItem(BILDER_ONLINE_KEY) === '0') return false;
  } catch {
    /* privates Fenster — Default gilt */
  }
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return false;
  return true;
}

/**
 * Holt das Hero-Bild einer Referenz on-demand in den Laufzeit-Store —
 * idempotent (ein zweiter Aufruf für dieselbe Referenz ist ein No-Op, auch
 * während des Ladens). Relative Pfade (eigener Build) werden immer
 * versucht (same-origin, kein Netz nach aussen); externe URLs nur, wenn
 * `onlineBilderErlaubt()` — sonst sofort ehrlich `nichtLokal`.
 */
export async function ladeHeroBild(refId: string, heroUrl: string): Promise<void> {
  const store = useDataRuntime.getState();
  if (store.bilder[refId]) return;
  const quelle = bildQuelle(heroUrl);
  if (istExterneUrl(heroUrl) && !onlineBilderErlaubt()) {
    store.setzeBild(refId, { status: 'nichtLokal', quelle });
    return;
  }
  store.setzeBild(refId, { status: 'laedt' });
  try {
    const res = await fetch(heroUrl);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const blob = await res.blob();
    if (!blob.type.startsWith('image/')) throw new Error(`kein Bild: ${blob.type || 'unbekannt'}`);
    const objectUrl = URL.createObjectURL(blob);
    useDataRuntime.getState().setzeBild(refId, { status: 'lokal', objectUrl });
  } catch {
    useDataRuntime.getState().setzeBild(refId, { status: 'nichtLokal', quelle });
  }
}

/* ------------------------------------------------------------------ */
/* K1 — deterministischer Tusche-Platzhalter je Typologie              */
/* ------------------------------------------------------------------ */

/**
 * Billiger, stabiler Hash (FNV-1a-artig) — macht den Platzhalter je
 * Referenz-Id deterministisch: dieselbe Referenz zeichnet über Sitzungen
 * und Geräte hinweg exakt dasselbe Piktogramm.
 */
export function refHash(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * Strichpiktogramm je Typologie im Werkplan-Stil — monochrome SVG-Pfade
 * (viewBox 0 0 48 34, Stroke zeichnet der Aufrufer mit `--k-ink-faint`).
 * Deterministisch aus der Referenz-Id: der Hash variiert je Motiv mehrere
 * Parameter (Dachform, Linienzahl, Versatz, Grundform), erfindet aber nie
 * Inhalt — es bleibt ein ehrliches Piktogramm der Kategorie, kein Fake-Foto.
 *
 * H-39 (v0.6.9 Stream F): je Typologie 2–3 ZUSÄTZLICHE Hash-Varianten, damit
 * benachbarte Karten (oft dieselbe Typologie, z.B. mehrere `building`-
 * Einträge im selben Suchergebnis) sich im Signet stärker unterscheiden —
 * `object` und der `default`-Fall hatten vorher GAR keine Hash-Variation
 * (jede Referenz zeichnete dasselbe Motiv); alle anderen bekommen zusätzlich
 * zur bestehenden Variation einen zweiten unabhängigen Hash-Ausschnitt
 * (`h >> n`), damit die neue Varianz nicht einfach mit der alten korreliert.
 * Bleibt eine reine Funktion von `(id, entryType)` — dieselbe Id zeichnet
 * weiterhin exakt dasselbe Signet (kosmodata-sichtbar.spec.ts K1).
 */
export function tuschePfade(id: string, entryType?: string | undefined): string[] {
  const h = refHash(id);
  const boden = 'M4 30 H44';
  switch (entryType) {
    case 'building': {
      // Haus im Schnitt: zwei Wände, Decke, Dachform je Hash (5 statt 3
      // Formen: + Walmdach-Trapez, + Staffelgeschoss-Versatz).
      const dach = h % 5;
      const first =
        dach === 0
          ? 'M10 12 H38' // Flachdach
          : dach === 1
            ? 'M10 14 L24 5 L38 14' // Satteldach
            : dach === 2
              ? 'M10 15 L38 8' // Pultdach
              : dach === 3
                ? 'M10 13 L16 6 H32 L38 13' // Walmdach (Trapez-Silhouette)
                : 'M10 9 H24 V15 H38'; // Staffelgeschoss (Versatz)
      return [boden, 'M10 30 V12 M38 30 V12', first, 'M14 30 V22 H20 V30', 'M26 22 H33 V27 H26 Z'];
    }
    case 'urban_plan': {
      // Stadtraster: Blockfeld, ein Block je Hash betont (Schraffur-Kreuz).
      // 3 statt 2 Block-Höhen + gespiegelte Schraffur-Richtung als eigener
      // Hash-Ausschnitt (h >> 6) — mehr unterscheidbare Kombinationen.
      const bx = 8 + (h % 3) * 12;
      const by = 8 + ((h >> 4) % 3) * 7;
      const gespiegelt = (h >> 6) % 2 === 1;
      return [
        'M6 6 H42 V28 H6 Z',
        'M18 6 V28 M30 6 V28 M6 16 H42',
        gespiegelt ? `M${bx} ${by} l-8 6 M${bx - 8} ${by} l8 6` : `M${bx} ${by} l8 6 M${bx + 8} ${by} l-8 6`,
      ];
    }
    case 'landscape_project': {
      // Höhenlinien: 3–5 Kurven je Hash + 1–3 Bäume (vorher fest ein Baum)
      // aus einem eigenen Hash-Ausschnitt (h >> 9).
      const n = 3 + (h % 3);
      const kurven: string[] = [];
      for (let i = 0; i < n; i++) {
        const y = 26 - i * 5;
        const amp = 2 + ((h >> (i * 3)) % 3);
        kurven.push(`M4 ${y} Q16 ${y - amp} 24 ${y} T44 ${y}`);
      }
      const baeume = 1 + ((h >> 9) % 3);
      const baumSignet: string[] = [];
      for (let i = 0; i < baeume; i++) {
        const bx = 34 + i * 4;
        baumSignet.push(`M${bx} 12 l3 -6 l3 6 Z M${bx + 3} 12 V16`);
      }
      return [...kurven, ...baumSignet];
    }
    case 'infrastructure': {
      // Brücke: Fahrbahn, Bogen, Pfeiler (Pfeilerzahl je Hash 2–3). Neu: 3
      // Bogenhöhen (h >> 1) statt einer fixen Kurve — Betonbrücke flach bis
      // Stahlbrücke hoch gewölbt.
      const bogenY = 6 + ((h >> 1) % 3) * 4;
      return [
        'M4 14 H44',
        `M8 28 Q24 ${bogenY} 40 28`,
        h % 2 === 0 ? 'M16 14 V22 M32 14 V22' : 'M14 14 V24 M24 14 V17 M34 14 V24',
        boden,
      ];
    }
    case 'text': {
      // Schriftblock: Initial-Quadrat + Zeilen variabler Länge je Hash.
      // Neu: Initial-Quadrat-Grösse als eigener Hash-Ausschnitt (h >> 16).
      const zeilen: string[] = [];
      for (let i = 0; i < 4; i++) {
        const b = 24 + ((h >> (i * 4)) % 14);
        zeilen.push(`M18 ${9 + i * 5} H${Math.min(44, 18 + b)}`);
      }
      const initial = (h >> 16) % 3 === 0 ? 'M6 5 H15 V15 H6 Z' : 'M6 7 H13 V13 H6 Z';
      return [initial, ...zeilen, 'M6 29 H36'];
    }
    case 'theory': {
      // Diagramm: Kreis + Achsenkreuz, Sekante je Hash gedreht. Neu: ein
      // Datenpunkt auf dem Kreis an einer von 3 Positionen (h >> 2).
      const punktWinkel = [30, 150, 270][(h >> 2) % 3]! * (Math.PI / 180);
      const px = (24 + Math.cos(punktWinkel) * 11).toFixed(1);
      const py = (17 + Math.sin(punktWinkel) * 11).toFixed(1);
      return [
        'M24 17 m-11 0 a11 11 0 1 0 22 0 a11 11 0 1 0 -22 0',
        'M24 2 V32 M9 17 H39',
        h % 2 === 0 ? 'M15 8 L33 26' : 'M33 8 L15 26',
        `M${px} ${py} m-1.5 0 a1.5 1.5 0 1 0 3 0 a1.5 1.5 0 1 0 -3 0`,
      ];
    }
    case 'map': {
      // Karte: Rahmen, mäandrierender Weg je Hash, Nordpfeil. Neu: eine
      // zweite Wegkoordinate (h >> 3) variiert die Kurvenhöhe unabhängig
      // von der bestehenden x-Verschiebung.
      const kx = 12 + (h % 8);
      const ky = 17 + ((h >> 3) % 3);
      return [
        'M6 4 H42 V30 H6 Z',
        `M6 24 Q${kx} ${ky} 24 20 T42 10`,
        'M37 8 l2.5 6 l-2.5 -2 l-2.5 2 Z',
      ];
    }
    case 'object': {
      // Objekt: bisher IMMER derselbe Axo-Quader (keine Hash-Variation) —
      // jetzt 3 Grundformen je Hash (Quader/Zylinder/Pyramide), damit
      // benachbarte Objekt-Karten sich überhaupt unterscheiden.
      const form = h % 3;
      if (form === 1) {
        // Axo-Zylinder (rundes Objekt/Gefäss).
        return [
          'M24 6 m-10 0 a10 4 0 1 0 20 0 a10 4 0 1 0 -20 0',
          'M14 6 V24 M34 6 V24',
          'M14 24 a10 4 0 0 0 20 0',
        ];
      }
      if (form === 2) {
        // Axo-Pyramide (Skulptur/Denkmal).
        return ['M24 5 L38 27 H10 Z', 'M24 5 V27', 'M17 27 L24 16 L31 27'];
      }
      // Axo-Quader (bisheriges Referenz-Signet, kompakter).
      return ['M24 4 38 11 24 18 10 11Z', 'M38 11 V24 M24 18 V31 M10 11 V24', 'M38 24 24 31 10 24'];
    }
    case 'event': {
      // Ereignis: Punkt mit radialen Strichen. Neu: 3 statt 2 Strahlenzahlen
      // (h % 3) + eigener Radius-Ausschnitt (h >> 2) für den Innenkreis.
      const strahlen = h % 3;
      const winkel =
        strahlen === 0
          ? [0, 45, 90, 135, 180, 225, 270, 315]
          : strahlen === 1
            ? [0, 60, 120, 180, 240, 300]
            : [0, 72, 144, 216, 288];
      const radius = 6 + ((h >> 2) % 3);
      return [
        'M24 17 m-4 0 a4 4 0 1 0 8 0 a4 4 0 1 0 -8 0',
        winkel
          .map((g) => {
            const r = (g * Math.PI) / 180;
            const x1 = 24 + Math.cos(r) * radius;
            const y1 = 17 + Math.sin(r) * radius;
            const x2 = 24 + Math.cos(r) * (radius + 5);
            const y2 = 17 + Math.sin(r) * (radius + 5);
            return `M${x1.toFixed(1)} ${y1.toFixed(1)} L${x2.toFixed(1)} ${y2.toFixed(1)}`;
          })
          .join(' '),
      ];
    }
    default: {
      // Unbekannte Typologie: Messrahmen-Motiv (Rechteck + Achsenkreuz) —
      // bisher IMMER identisch. Neu: eine von 3 Eckmarken je Hash (oder
      // keine), analog zu den anderen Typologien.
      const ecke = h % 3;
      const rahmen = ['M8 6 H40 V28 H8 Z', 'M24 2 V32 M4 17 H44'];
      if (ecke === 1) return [...rahmen, 'M8 6 l6 6 M40 6 l-6 6'];
      if (ecke === 2) return [...rahmen, 'M8 28 l6 -6 M40 28 l-6 -6'];
      return rahmen;
    }
  }
}

/* ------------------------------------------------------------------ */
/* K8 — Gedächtnis-Querverweise (refId zuerst, Text-Match als Fallback) */
/* ------------------------------------------------------------------ */

/** Wie ein Gedächtnis-Eintrag zur Referenz gefunden wurde — ehrlich sichtbar
 * im UI (Meta-Zeile «verknüpft» vs. «Texttreffer»), statt beides zu vermengen. */
export type GedaechtnisMatchArt = 'verknuepft' | 'text';

export interface GedaechtnisTreffer extends Learning {
  /**
   * v0.6.9 (Stream B): 'verknuepft' = der Eintrag trägt `refId === referenz.id`
   * (persistierte Kante, seit die 👍/👎-Feedbackstellen im Referenz-Kontext
   * die aktive Referenz-Id mitschreiben). 'text' = Fallback für Alteinträge
   * ohne `refId` — der bisherige textbasierte Treffer (Titel/Id wörtlich im
   * Kontext oder in der Notiz genannt).
   */
  matchArt: GedaechtnisMatchArt;
}

/**
 * Gedächtnis-Einträge, die eine Referenz erwähnen. `refId`-Treffer (die
 * persistierte Kante) gehen IMMER vor — Text-Match (Titel/Id wörtlich im
 * Kontext/in der Notiz genannt, case-insensitiv) füllt nur auf, was die
 * Kante nicht liefert; Alteinträge ohne `refId` fallen automatisch auf den
 * bisherigen Weg zurück (keine Migration nötig). Neueste zuerst je Gruppe,
 * gedeckelt.
 */
export function gedaechtnisQuerverweise(
  eintraege: readonly Learning[],
  referenz: Pick<RefEntry, 'id' | 'title'>,
  max = 5,
): GedaechtnisTreffer[] {
  const verknuepft: GedaechtnisTreffer[] = eintraege
    .filter((e) => e.refId === referenz.id)
    .sort((a, b) => b.ts.localeCompare(a.ts))
    .map((e) => ({ ...e, matchArt: 'verknuepft' as const }));

  if (verknuepft.length >= max) return verknuepft.slice(0, max);

  const titel = referenz.title.trim().toLowerCase();
  const idKlein = referenz.id.toLowerCase();
  const verknuepfteTs = new Set(verknuepft.map((e) => e.ts));
  const textTreffer: GedaechtnisTreffer[] =
    titel.length < 3
      ? []
      : eintraege
          .filter((e) => !verknuepfteTs.has(e.ts))
          .filter((e) => {
            const text = `${e.context} ${e.note ?? ''}`.toLowerCase();
            return text.includes(titel) || text.includes(idKlein);
          })
          .sort((a, b) => b.ts.localeCompare(a.ts))
          .map((e) => ({ ...e, matchArt: 'text' as const }));

  return [...verknuepft, ...textTreffer].slice(0, max);
}

/* ------------------------------------------------------------------ */
/* P9 (v0.8.3, docs/V083-SPEZ.md §6.5/E6e) — eigene, importierte        */
/* Referenzen                                                          */
/* ------------------------------------------------------------------ */

/**
 * Eigene, per JSON-Import hinzugefügte Referenzen — ein Laufzeit-Store,
 * NICHT das Yjs-Doc (dieselbe «Laufzeit ≠ Modell»-Regel wie die Hero-Bild-
 * Blobs oben, `CLAUDE.md` Abschnitt «Eigenheiten»). Eigene IndexedDB
 * (`kosmo-eigene-referenzen`, Store `referenzen`), dasselbe
 * `openDb`/`reqResult`/`txDone`-Muster wie `state/archiv.ts`
 * (`kosmo-archiv`) und `modules/prepare/knowledge.ts` (`kosmo-wissen`).
 *
 * Jede eigene Referenz trägt `quelle: 'eigen'` — die sichtbare Kennzeichnung
 * im Dossier (`DataWorkspace.tsx`) UND die Unterscheidung vom kuratierten
 * Seed beim Merge in `loadReferences()` (`DataWorkspace.tsx`).
 *
 * In-Memory-Cache (`eigeneCache`): `loadReferences()` ruft
 * `listeEigeneReferenzen()` bei JEDEM Aufruf, bekommt aber dieselbe
 * Array-Referenz zurück, solange sich nichts geändert hat — das ist die
 * Grundlage für `state/referenz-index.ts`s Identitäts-Cache («der Index
 * wird einmal pro `loadReferences()`-Ergebnis gebaut, nicht bei jeder Suche
 * neu»): ein Import/Entfernen ändert die Referenz (→ Cache-Invalidierung),
 * ein reiner Re-Read nicht.
 *
 * Fehlt `indexedDB` (z.B. eine Node-Testumgebung ohne `fake-indexeddb/auto`)
 * oder schlägt der Zugriff fehl, bleibt die eigene Bibliothek ehrlich leer
 * statt den gesamten Referenz-Weg (inkl. Seed) mitzureissen — derselbe
 * Fehlertoleranz-Vertrag wie `onlineBilderErlaubt()` oben.
 */
export interface EigeneReferenz extends RefEntry {
  quelle: 'eigen';
  /** ISO-Zeitstempel des Imports — für eine stabile, chronologische Anzeige. */
  importiertAm: string;
}

/** true, wenn `entry` aus dem eigenen Import-Store stammt (statt aus dem kuratierten Seed). */
export function istEigeneReferenz(entry: RefEntry): entry is EigeneReferenz {
  return (entry as Partial<EigeneReferenz>).quelle === 'eigen';
}

const EIGENE_DB_NAME = 'kosmo-eigene-referenzen';
const EIGENE_DB_VERSION = 1;
const EIGENE_STORE = 'referenzen';

function eigeneIndexedDbVerfuegbar(): boolean {
  return typeof indexedDB !== 'undefined';
}

function openEigeneDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(EIGENE_DB_NAME, EIGENE_DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(EIGENE_STORE)) db.createObjectStore(EIGENE_STORE, { keyPath: 'id' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function eigeneTxDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

function eigeneReqResult<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

const EIGENE_LEER: readonly EigeneReferenz[] = [];
let eigeneCache: readonly EigeneReferenz[] | null = null;

/**
 * Alle eigenen Referenzen, neueste zuerst. In-Memory-gecacht — die
 * zurückgegebene Array-Referenz bleibt über mehrere Aufrufe stabil, solange
 * `importiereEigeneReferenzen`/`entferneEigeneReferenz` nicht dazwischen
 * liefen (Grundlage für `DataWorkspace.tsx`s `loadReferences()`-Merge-Cache
 * und darüber für `state/referenz-index.ts`s Identitäts-Cache).
 */
export async function listeEigeneReferenzen(): Promise<readonly EigeneReferenz[]> {
  if (eigeneCache) return eigeneCache;
  if (!eigeneIndexedDbVerfuegbar()) {
    eigeneCache = EIGENE_LEER;
    return eigeneCache;
  }
  try {
    const db = await openEigeneDb();
    const tx = db.transaction(EIGENE_STORE, 'readonly');
    const alle = await eigeneReqResult(tx.objectStore(EIGENE_STORE).getAll() as IDBRequest<EigeneReferenz[]>);
    db.close();
    eigeneCache = [...alle].sort((a, b) => b.importiertAm.localeCompare(a.importiertAm));
  } catch {
    // Ehrlich leer statt Absturz — der Seed bleibt trotzdem voll nutzbar.
    eigeneCache = EIGENE_LEER;
  }
  return eigeneCache;
}

/**
 * Importiert einen bereits validierten Batch (s. `validiereRefImportBatch`,
 * `@kosmo/data`) in den eigenen Store — jede Referenz bekommt `quelle:
 * 'eigen'` + einen Import-Zeitstempel. Ein leerer Batch ist kein Fehler, nur
 * ein No-Op (0 zurück). Wirft ehrlich, wenn `indexedDB` in dieser Umgebung
 * fehlt — anders als beim Lesen ist ein stiller Fehlschlag beim SCHREIBEN
 * nicht akzeptabel (der Nutzer erwartet, dass sein Import ankommt).
 */
export async function importiereEigeneReferenzen(eintraege: readonly RefEntry[]): Promise<number> {
  if (eintraege.length === 0) return 0;
  if (!eigeneIndexedDbVerfuegbar()) {
    throw new Error('IndexedDB nicht verfügbar — der Import kann in dieser Umgebung nicht gespeichert werden.');
  }
  const jetzt = new Date().toISOString();
  const db = await openEigeneDb();
  const tx = db.transaction(EIGENE_STORE, 'readwrite');
  const store = tx.objectStore(EIGENE_STORE);
  for (const roh of eintraege) {
    const eintrag: EigeneReferenz = { ...roh, quelle: 'eigen', importiertAm: jetzt };
    store.put(eintrag);
  }
  await eigeneTxDone(tx);
  db.close();
  eigeneCache = null; // erzwingt einen frischen Read beim nächsten `listeEigeneReferenzen()`
  return eintraege.length;
}

/** Entfernt eine eigene Referenz aus dem Import-Store (der Seed selbst ist nie Ziel dieser Funktion). */
export async function entferneEigeneReferenz(id: string): Promise<void> {
  if (!eigeneIndexedDbVerfuegbar()) return;
  const db = await openEigeneDb();
  const tx = db.transaction(EIGENE_STORE, 'readwrite');
  tx.objectStore(EIGENE_STORE).delete(id);
  await eigeneTxDone(tx);
  db.close();
  eigeneCache = null;
}

/** NUR für Tests: setzt den In-Memory-Cache zurück (nach direkten IndexedDB-Manipulationen im Test). */
export function resetEigeneReferenzenCacheFuerTests(): void {
  eigeneCache = null;
}
