import type { Pt } from '../model/units';
import {
  segmentiere,
  schneideBand,
  ergebnisAusWohnungen,
  type Band,
  type GeschnitteneWohnung,
  type WohnungsTypSoll,
  type SegmentierOptionen,
} from './segmentierer';

/**
 * Anytime-Variantensuche (V070-KONZEPT E5-i, Stream 4A) — der ehrliche
 * KosmoOrbit-Gegenentwurf zu Finchs «tausende Echtzeit-Varianten» (Cloud-
 * Metaheuristik hinter Login, Optimierer-Interna nicht offengelegt,
 * RE-FINCH.md §3.2/§8): ein DETERMINISTISCHER, seeded, synchroner Generator
 * ohne Worker/Netzwerk. `derive/segmentierer.ts` liefert bereits eine gute
 * erste Lösung (Greedy-DP); dieser Generator verbessert/erkundet SIE WEITER
 * mit Ruin-&-Recreate-Zügen, solange der Konsument (5A, `requestIdleCallback`-
 * Zeitscheiben) `.next()` aufruft. Kein Blackbox-Batch: jede Ausbeute ist
 * eine vollständige, gültige `SegmentVariante`.
 *
 * ## API-Vertrag (für 5A — bitte NICHT anders interpretieren)
 *
 * `variantenSuche(eingabe, gewichte, seed)` gibt einen `Generator<SegmentVariante>`
 * zurück, der (praktisch) UNENDLICH viele Varianten liefert:
 * - **1. Ausbeute** = exakt `segmentiere(eingabe.footprint, eingabe.korridor,
 *   eingabe.mix, eingabe.opts)` (byte-identisch zum bisherigen Greedy-DP-Weg,
 *   `zug: 'start'`) — der Generator dupliziert die Schnitt-Mathematik NICHT,
 *   er importiert `segmentiere`/`schneideBand`/`ergebnisAusWohnungen` aus
 *   `segmentierer.ts`.
 * - **Jede weitere Ausbeute** ist ein valider Ruin-&-Recreate-Zug AUF DEM
 *   BESTEN BISHER GESEHENEN STAND (nicht auf der 1. Ausbeute — echtes
 *   Hill-Climbing: verbessert ein Zug den Score, wird er zur neuen Basis für
 *   die folgenden Züge; verschlechtert er ihn, wird trotzdem GELIEFERT —
 *   Exploration ist erwünscht — aber NICHT zur neuen Basis).
 * - Der Generator wirft NIE. Ungültige/wirkungslose Zug-VERSUCHE (verletzte
 *   Mindestbreite, kein Nachbar zum Tauschen/Verschmelzen …) werden intern
 *   verworfen und durch einen erneuten internen Versuch ersetzt, bevor
 *   `yield` läuft — der Konsument sieht nie das Zwischenergebnis eines
 *   verworfenen Zugs. EINZIGE Ausnahme, in der `wohnungen: []` doch
 *   geliefert wird: die EINGABE selbst ist geometrisch degeneriert (kein
 *   Band, siehe `'stagnation'` unten) — das ist dann bereits
 *   `segmentiere()`s eigenes ehrliches Ergebnis, keine Erfindung dieses
 *   Generators.
 * - **Determinismus:** derselbe `seed` ⇒ byte-identische Sequenz (inkl.
 *   `zug`-Reihenfolge, Fliesskomma-Werte). Andere `seed`-Werte ⇒ andere
 *   Sequenz. PRNG = Mulberry32 (unten), NIE `Math.random`/`Date.now`.
 * - Der Generator terminiert nie von selbst — 5A steuert die Anzahl
 *   Iterationen (Zeitscheibe) über `.next()`-Aufrufe und bricht ab, wann sie
 *   will (`return()` oder einfach aufhören zu ziehen).
 * - **Kein UI, kein Worker, keine Persistenz** in diesem Modul — reine
 *   Funktion auf ihren Argumenten, wie jede `derive/`-Datei.
 *
 * ## Score-Modell
 *
 * `score = (Σ_k gewicht_k · teilScore_k) / (Σ_k gewicht_k)`, `0` falls alle
 * Gewichte ≤ 0. Jeder `teilScore_k` ist auf `[0, 1]` normiert — die
 * Normierungsgrenzen sind PRÄZISE dokumentiert (nicht "irgendwie 0..1"),
 * siehe `berechneTeilScores()` unten. Vier Kriterien, alle direkt aus dem
 * `SegmentierungsErgebnis` ableitbar (kein Doc-Zugriff, keine Simulation —
 * dieselbe Ehrlichkeitsgrenze wie `sia416.ts`/`programmerfuellung.ts`):
 *
 * 1. **programmErfuellung** — Soll-Mix-Treffer (Anzahl je Typ).
 * 2. **kompaktheit** — Quadratizität der geschnittenen Rechtecke (Proxy für
 *    "gut proportioniert", NICHT Tageslicht/Besonnung — das wäre eine
 *    andere, hier NICHT behauptete Kennzahl).
 * 3. **mixTreue** — Flächentreffer je Wohnung gegen ihre Zielgrösse.
 * 4. **flaechenNutzung** — Anteil NICHT als Restfläche ("Opfer-Wohnung")
 *    ausgewiesener Fläche.
 *
 * ## Zug-Katalog (`SegmentVariante.zug`)
 *
 * - `'start'` — 1. Ausbeute, reiner `segmentiere()`-Aufruf.
 * - `'zielgroesseJittern'` — EIN Wohnungstyp bekommt eine neue Zielgrösse
 *   (±6 % pro Schritt, kumulativ über die Suche, hart begrenzt auf ±50 % der
 *   ursprünglichen Zielgrösse), danach kompletter `segmentiere()`-Neulauf.
 *   Wirkt wie ein Jitter der Schnittstationen, weil `schneideBand()` die
 *   Kandidat-Breite aus der Zielgrösse ableitet (`RASTER`-gerundet) — es wird
 *   NIE eine Koordinate direkt verschoben, der Effekt ist indirekt über die
 *   Zielgrösse (ehrlich benannt, kein Missverständnis vortäuschen).
 * - `'mixPermutation'` — die Bearbeitungsreihenfolge der Wohnungstypen wird
 *   zufällig permutiert, danach `segmentiere()`-Neulauf. Wirkt NUR bei
 *   Gleichstand (gleicher offener Bedarf UND gleiche Zielbreite zweier
 *   Typen) — sonst ist der Zug ein dokumentierter No-op (trotzdem gültig,
 *   trotzdem geliefert; kein Fehler).
 * - `'typTausch'` — zwei GEOMETRISCH BENACHBARTE, unterschiedlich getypte
 *   Wohnungen tauschen ihr Typ-Label (Geometrie bleibt exakt gleich, nur
 *   `typ`/`abweichung` ändern sich). Nur verfügbar, wenn der aktuelle Stand
 *   ≥ 2 benachbarte, unterschiedlich getypte Stücke hat.
 * - `'mergeResplit'` — zwei benachbarte Stücke (auch Restflächen) werden zu
 *   einem Band-Abschnitt verschmolzen und über `schneideBand()` NEU
 *   geschnitten (mit den ursprünglich dort sitzenden Typen als Bedarf, plus
 *   ggf. einem zusätzlichen offenen Typ bei einer Restflächen-Seite). Nur
 *   verfügbar, wenn der aktuelle Stand ≥ 2 benachbarte Stücke hat.
 * - `'stagnation'` — Rand-Fall-Zug: entweder (a) KEIN Wohnungstyp vorhanden
 *   UND keine benachbarten Stücke (z. B. leerer Soll-Mix), oder (b) die
 *   Eingabe ist geometrisch degeneriert (kein Band ≥ 3 m Tiefe neben dem
 *   Korridor, oder jedes Band zu kurz für auch nur eine Restfläche ≥ 2 m —
 *   `segmentiere()`s eigene ehrliche Fehlschläge) — dann liefert schon die
 *   1. Ausbeute `wohnungen: []`, und JEDE weitere Ausbeute bleibt für immer
 *   `'stagnation'`. Liefert in beiden Fällen den unveränderten aktuellen
 *   Stand erneut (gültig, deterministisch, aber nicht explorierend) —
 *   EHRLICH benannt statt eine Endlosschleife zu verstecken.
 *
 * ## Ehrlichkeitsgrenzen (was diese v1 NICHT ist)
 *
 * - KEINE Cloud-Metaheuristik, kein simulated annealing mit Temperatur-Plan,
 *   kein genetischer Algorithmus mit Population — ein einzelner
 *   Hill-Climber mit vier simplen, nachvollziehbaren Zugarten. "Tausende
 *   Varianten" (Finch-Marketing) sind hier tausende DETERMINISTISCHE,
 *   reproduzierbare, aber lokal verwandte Nachbarn — kein globales
 *   Populations-Sampling.
 * - `kompaktheit` ist eine reine Bounding-Box-Quadratizität, KEIN
 *   Tageslicht-/Besonnungsproxy (Finchs "Daylight ≈ Fassadenlänge/Fläche"
 *   wird hier NICHT nachgebaut — das wäre eine 5. Kennzahl, bewusst
 *   ausgelassen, siehe `besonnungsvergleich.ts` für die echte
 *   Sonnenstands-Ableitung an anderer Stelle im Kernel).
 * - Kein Egress-/Fluchtweg-Kriterium in der Score (das ist `checks.ts`s
 *   Aufgabe auf dem fertig übernommenen Grundriss, nicht der Suche selbst).
 * - `mergeResplit`/`typTausch` kennen nur den GEOMETRISCHEN Nachbarschafts-
 *   begriff (gemeinsame Kante der achsparallelen Bounding-Box) — keine
 *   Adjazenzgraph-Semantik (`raumgraph.ts`).
 */

export interface SegmentierEingabe {
  footprint: Pt[];
  korridor: Pt[];
  mix: WohnungsTypSoll[];
  opts?: SegmentierOptionen;
}

export interface VariantenGewichte {
  /** Anteil erfüllter Soll-Wohnungen je Typ (gedeckelt bei 100 % je Typ). */
  programmErfuellung: number;
  /** Quadratizität der geschnittenen Rechtecke (1 = quadratisch). */
  kompaktheit: number;
  /** Flächentreffer je Wohnung gegen ihre Zielgrösse. */
  mixTreue: number;
  /** Anteil NICHT als Restfläche ausgewiesener Fläche. */
  flaechenNutzung: number;
}

export interface SegmentVariante {
  wohnungen: GeschnitteneWohnung[];
  /** Gewichteter Gesamtscore, [0, 1] (0 falls Σ Gewichte ≤ 0). */
  score: number;
  /** Die vier Einzelscores vor der Gewichtung, je [0, 1]. */
  teilScores: Record<'programmErfuellung' | 'kompaktheit' | 'mixTreue' | 'flaechenNutzung', number>;
  seed: number;
  zug: 'start' | 'zielgroesseJittern' | 'mixPermutation' | 'typTausch' | 'mergeResplit' | 'stagnation';
}

// ---------------------------------------------------------------------------
// Seeded PRNG — Mulberry32. Deterministisch, KEIN Math.random.
// ---------------------------------------------------------------------------

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function rnd() {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------------------------------------------------------------------------
// Geometrie-Helfer: alle Segmentierer-Stücke sind achsparallele Rechtecke
// (Bänder haben immer d/n ∈ {(±1,0),(0,±1)}) — Nachbarschaft und Kompaktheit
// lassen sich daher rein über die Bounding-Box bestimmen, unabhängig von der
// Punkt-Reihenfolge/Wicklung des Outlines.
// ---------------------------------------------------------------------------

interface BBox {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

function bbox(outline: Pt[]): BBox {
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const p of outline) {
    minX = Math.min(minX, p.x);
    maxX = Math.max(maxX, p.x);
    minY = Math.min(minY, p.y);
    maxY = Math.max(maxY, p.y);
  }
  return { minX, maxX, minY, maxY };
}

/** Teilen zwei Rechtecke eine volle Kante? 'x' = nebeneinander, 'y' = übereinander, sonst null. */
function nachbarschaft(a: BBox, b: BBox): 'x' | 'y' | null {
  if (a.minY === b.minY && a.maxY === b.maxY && (a.maxX === b.minX || b.maxX === a.minX)) return 'x';
  if (a.minX === b.minX && a.maxX === b.maxX && (a.maxY === b.minY || b.maxY === a.minY)) return 'y';
  return null;
}

interface NachbarPaar {
  i: number;
  j: number;
  achse: 'x' | 'y';
}

/** Alle benachbarten Indexpaare in `wohnungen` (O(n²), n = Wohnungen je Geschoss — unkritisch). */
function findeNachbarn(wohnungen: GeschnitteneWohnung[]): NachbarPaar[] {
  const boxen = wohnungen.map((w) => bbox(w.outline));
  const paare: NachbarPaar[] = [];
  for (let i = 0; i < wohnungen.length; i++) {
    for (let j = i + 1; j < wohnungen.length; j++) {
      const achse = nachbarschaft(boxen[i]!, boxen[j]!);
      if (achse) paare.push({ i, j, achse });
    }
  }
  return paare;
}

// ---------------------------------------------------------------------------
// Score-Berechnung
// ---------------------------------------------------------------------------

/**
 * Vier Teilscores aus einer Wohnungsliste ableiten, IMMER gegen die
 * kanonischen Zielgrössen `mixSollOriginal` gemessen (nicht gegen etwaige
 * intern gejitterte Zielgrössen — sonst würde ein Jitter-Zug seinen eigenen
 * Massstab verschieben und sich künstlich "verbessern").
 *
 * Normierungsgrenzen (präzise, für 5A):
 * - `programmErfuellung` = Σ min(ist, soll) / Σ soll, geklemmt auf [0, 1].
 *   Σ soll = 0 (kein Programm) ⇒ 1 (nichts gefordert = nichts offen).
 * - `kompaktheit` = Mittelwert über ALLE Stücke (auch Restflächen) von
 *   min(Breite, Tiefe) / max(Breite, Tiefe) der achsparallelen Bounding-Box;
 *   1 = perfektes Quadrat, → 0 = sehr lang/schmal. 0 Stücke ⇒ 0.
 * - `mixTreue` = Mittelwert über GETYPTE Stücke von
 *   max(0, 1 − |abweichung| / zielgrösse), d. h. eine Abweichung ≥ 100 % der
 *   Zielgrösse zählt als 0 (kein negativer Score). 0 getypte Stücke ⇒ 0.
 * - `flaechenNutzung` = 1 − (Σ Restflächen / Σ aller Flächen). Gesamtfläche
 *   0 ⇒ 0 (defensiv; bei einer gültigen Variante mit ≥ 1 Stück kommt das
 *   nicht vor).
 */
function berechneTeilScores(
  wohnungen: GeschnitteneWohnung[],
  mixSollOriginal: WohnungsTypSoll[],
): SegmentVariante['teilScores'] {
  const sollSumme = mixSollOriginal.reduce((s, m) => s + m.anzahl, 0);
  const { mix: mixIst } = ergebnisAusWohnungen(wohnungen, mixSollOriginal);
  const programmErfuellung =
    sollSumme === 0
      ? 1
      : Math.min(1, mixIst.reduce((s, m) => s + Math.min(m.ist, m.soll), 0) / sollSumme);

  const kompaktheitWerte = wohnungen.map((w) => {
    const b = bbox(w.outline);
    const breite = b.maxX - b.minX;
    const tiefe = b.maxY - b.minY;
    const gross = Math.max(breite, tiefe);
    return gross > 0 ? Math.min(breite, tiefe) / gross : 0;
  });
  const kompaktheit = kompaktheitWerte.length
    ? kompaktheitWerte.reduce((a, b) => a + b, 0) / kompaktheitWerte.length
    : 0;

  const zielgroesseByTyp = new Map(mixSollOriginal.map((m) => [m.typ, m.groesse]));
  const getypte = wohnungen.filter((w) => w.typ !== null);
  const mixTreue = getypte.length
    ? getypte.reduce((s, w) => {
        const ziel = zielgroesseByTyp.get(w.typ!) ?? w.flaeche;
        const relAbw = ziel > 0 ? Math.abs(w.abweichung ?? 0) / ziel : 0;
        return s + Math.max(0, 1 - Math.min(relAbw, 1));
      }, 0) / getypte.length
    : 0;

  const gesamtFlaeche = wohnungen.reduce((s, w) => s + w.flaeche, 0);
  const restFlaeche = wohnungen.filter((w) => w.typ === null).reduce((s, w) => s + w.flaeche, 0);
  const flaechenNutzung = gesamtFlaeche > 0 ? 1 - restFlaeche / gesamtFlaeche : 0;

  return { programmErfuellung, kompaktheit, mixTreue, flaechenNutzung };
}

function gewichteterScore(teil: SegmentVariante['teilScores'], gewichte: VariantenGewichte): number {
  const eintraege: [number, number][] = [
    [gewichte.programmErfuellung, teil.programmErfuellung],
    [gewichte.kompaktheit, teil.kompaktheit],
    [gewichte.mixTreue, teil.mixTreue],
    [gewichte.flaechenNutzung, teil.flaechenNutzung],
  ];
  const summeGewichte = eintraege.reduce((s, [w]) => s + Math.max(0, w), 0);
  if (summeGewichte <= 0) return 0;
  const summe = eintraege.reduce((s, [w, v]) => s + Math.max(0, w) * v, 0);
  return summe / summeGewichte;
}

// ---------------------------------------------------------------------------
// Ruin-&-Recreate-Züge
// ---------------------------------------------------------------------------

const JITTER_ANTEIL = 0.06; // ±6 % der aktuellen Zielgrösse je Zug
const JITTER_GRENZE = 0.5; // hart begrenzt auf ±50 % der URSPRÜNGLICHEN Zielgrösse

interface Stand {
  wohnungen: GeschnitteneWohnung[];
  /** Aktuelle (ggf. gejitterte) Zielgrössen je Typ — nur Such-Zustand, NICHT der Score-Massstab. */
  groessenAktuell: Record<string, number>;
  /** Aktuelle Bearbeitungsreihenfolge der Typen (mixPermutation mutiert das). */
  mixReihenfolge: WohnungsTypSoll[];
  minBreite: number;
}

function neuLaufSegmentiere(eingabe: SegmentierEingabe, stand: Stand): GeschnitteneWohnung[] {
  const opts: SegmentierOptionen = {
    ...eingabe.opts,
    groessen: stand.groessenAktuell,
    minBreite: stand.minBreite,
  };
  return segmentiere(eingabe.footprint, eingabe.korridor, stand.mixReihenfolge, opts).wohnungen;
}

function zugZielgroesseJittern(
  eingabe: SegmentierEingabe,
  stand: Stand,
  mixSollOriginal: WohnungsTypSoll[],
  rnd: () => number,
): { wohnungen: GeschnitteneWohnung[]; stand: Stand } {
  const typen = mixSollOriginal.map((m) => m.typ);
  const typ = typen[Math.floor(rnd() * typen.length)]!;
  const original = mixSollOriginal.find((m) => m.typ === typ)!.groesse;
  const aktuell = stand.groessenAktuell[typ] ?? original;
  const delta = (rnd() * 2 - 1) * JITTER_ANTEIL * aktuell;
  const min = original * (1 - JITTER_GRENZE);
  const max = original * (1 + JITTER_GRENZE);
  const neueGroesse = Math.min(max, Math.max(min, aktuell + delta));
  const neuerStand: Stand = {
    ...stand,
    groessenAktuell: { ...stand.groessenAktuell, [typ]: neueGroesse },
  };
  return { wohnungen: neuLaufSegmentiere(eingabe, neuerStand), stand: neuerStand };
}

function zugMixPermutation(
  eingabe: SegmentierEingabe,
  stand: Stand,
  rnd: () => number,
): { wohnungen: GeschnitteneWohnung[]; stand: Stand } {
  const permutiert = [...stand.mixReihenfolge];
  // Fisher-Yates, seeded.
  for (let i = permutiert.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [permutiert[i], permutiert[j]] = [permutiert[j]!, permutiert[i]!];
  }
  const neuerStand: Stand = { ...stand, mixReihenfolge: permutiert };
  return { wohnungen: neuLaufSegmentiere(eingabe, neuerStand), stand: neuerStand };
}

function zugTypTausch(
  wohnungen: GeschnitteneWohnung[],
  mixSollOriginal: WohnungsTypSoll[],
  rnd: () => number,
): GeschnitteneWohnung[] | null {
  const zielByTyp = new Map(mixSollOriginal.map((m) => [m.typ, m.groesse]));
  const kandidaten = findeNachbarn(wohnungen).filter(
    ({ i, j }) => wohnungen[i]!.typ !== null && wohnungen[j]!.typ !== null && wohnungen[i]!.typ !== wohnungen[j]!.typ,
  );
  if (kandidaten.length === 0) return null;
  const { i, j } = kandidaten[Math.floor(rnd() * kandidaten.length)]!;
  const neu = wohnungen.map((w) => ({ ...w }));
  const a = neu[i]!;
  const b = neu[j]!;
  const typA = a.typ;
  const typB = b.typ;
  a.typ = typB;
  b.typ = typA;
  const zielA = zielByTyp.get(typB!) ?? a.flaeche;
  const zielB = zielByTyp.get(typA!) ?? b.flaeche;
  a.abweichung = Math.round((a.flaeche - zielA) * 10) / 10;
  b.abweichung = Math.round((b.flaeche - zielB) * 10) / 10;
  return neu;
}

function zugMergeResplit(
  wohnungen: GeschnitteneWohnung[],
  mixSollOriginal: WohnungsTypSoll[],
  minBreite: number,
  rnd: () => number,
): GeschnitteneWohnung[] | null {
  const paare = findeNachbarn(wohnungen);
  if (paare.length === 0) return null;
  const { i, j, achse } = paare[Math.floor(rnd() * paare.length)]!;
  const a = wohnungen[i]!;
  const b = wohnungen[j]!;
  const ba = bbox(a.outline);
  const bb = bbox(b.outline);

  // Bedarf für den Neuschnitt: die Typen, die vorher hier sassen. Sass eine
  // Seite auf einer Restfläche (typ null), wird — falls global noch Bedarf
  // offen ist — EIN zusätzlicher Typ mit offenem Soll probiert (ehrlich:
  // kann denselben Nachbarn wieder als Restfläche zurückgeben, wenn er nicht
  // passt — `schneideBand()` entscheidet, nicht diese Funktion).
  const { mix: mixIst } = ergebnisAusWohnungen(wohnungen, mixSollOriginal);
  const offen = mixSollOriginal.filter((m) => (mixIst.find((x) => x.typ === m.typ)?.ist ?? 0) < m.anzahl);
  const typen = [a.typ, b.typ].filter((t): t is string => t !== null);
  if (typen.length === 0) {
    if (offen.length === 0) return null;
    typen.push(offen[Math.floor(rnd() * offen.length)]!.typ);
  }
  const zielByTyp = new Map(mixSollOriginal.map((m) => [m.typ, m.groesse]));
  const bedarf = new Map<string, { groesse: number; rest: number }>();
  for (const t of typen) {
    const groesse = zielByTyp.get(t) ?? 0;
    const eintrag = bedarf.get(t);
    bedarf.set(t, { groesse, rest: (eintrag?.rest ?? 0) + 1 });
  }

  let synth: Band;
  if (achse === 'x') {
    const minX = Math.min(ba.minX, bb.minX);
    const maxX = Math.max(ba.maxX, bb.maxX);
    synth = { o: { x: minX, y: ba.minY }, d: { x: 1, y: 0 }, n: { x: 0, y: 1 }, laenge: maxX - minX, tiefe: ba.maxY - ba.minY };
  } else {
    const minY = Math.min(ba.minY, bb.minY);
    const maxY = Math.max(ba.maxY, bb.maxY);
    synth = { o: { x: ba.minX, y: minY }, d: { x: 0, y: 1 }, n: { x: 1, y: 0 }, laenge: maxY - minY, tiefe: ba.maxX - ba.minX };
  }
  const neuGeschnitten = schneideBand(synth, bedarf, minBreite);
  if (neuGeschnitten.length === 0) return null;

  const rest = wohnungen.filter((_, idx) => idx !== i && idx !== j);
  return [...rest, ...neuGeschnitten];
}

// ---------------------------------------------------------------------------
// Generator
// ---------------------------------------------------------------------------

/**
 * Seeded Anytime-Generator. Siehe Modulkopf für den vollen API-Vertrag.
 * Synchron, kein Worker — 5A ruft `.next()` in eigenen Zeitscheiben auf.
 */
export function* variantenSuche(
  eingabe: SegmentierEingabe,
  gewichte: VariantenGewichte,
  seed: number,
): Generator<SegmentVariante, never, unknown> {
  const rnd = mulberry32(seed);

  // Kanonischer Score-Massstab: Zielgrössen EINMALIG aus eingabe.opts.groessen
  // aufgelöst (identische Logik zu segmentiere()s eigener Auflösung) —
  // bleibt über die GANZE Suche fix, damit kein Zug seinen eigenen Massstab
  // verschiebt.
  const mixSollOriginal: WohnungsTypSoll[] = eingabe.mix.map((m) =>
    eingabe.opts?.groessen?.[m.typ] ? { ...m, groesse: eingabe.opts.groessen[m.typ]! } : m,
  );

  let stand: Stand = {
    wohnungen: [],
    groessenAktuell: Object.fromEntries(mixSollOriginal.map((m) => [m.typ, m.groesse])),
    mixReihenfolge: [...eingabe.mix],
    minBreite: eingabe.opts?.minBreite ?? 4500,
  };

  const startWohnungen = segmentiere(eingabe.footprint, eingabe.korridor, eingabe.mix, eingabe.opts).wohnungen;
  stand = { ...stand, wohnungen: startWohnungen };

  let bester: SegmentVariante = {
    wohnungen: startWohnungen,
    teilScores: berechneTeilScores(startWohnungen, mixSollOriginal),
    score: 0,
    seed,
    zug: 'start',
  };
  bester = { ...bester, score: gewichteterScore(bester.teilScores, gewichte) };
  yield bester;

  if (startWohnungen.length === 0) {
    // Degenerierte Eingabe (kein Band ≥ 3 m Tiefe, oder jedes Band zu kurz
    // für auch nur eine Restfläche ≥ 2 m — `segmentiere()`s eigene, ehrliche
    // Fehlschläge, siehe `ergebnis.diagnose`): es gibt geometrisch NICHTS zu
    // erkunden. Ohne diese Weiche würden zielgroesseJittern/mixPermutation
    // für immer leere Ergebnisse produzieren und NIE liefern (Hang in
    // `.next()`), weil `jitterVerfuegbar` allein von `mixSollOriginal.length`
    // abhängt, nicht von Bandexistenz. Ehrlich als Dauer-Stagnation ausweisen.
    for (;;) yield { ...bester, zug: 'stagnation' };
  }

  for (;;) {
    const nachbarn = findeNachbarn(stand.wohnungen);
    const typTauschVerfuegbar = nachbarn.some(
      ({ i, j }) =>
        stand.wohnungen[i]!.typ !== null &&
        stand.wohnungen[j]!.typ !== null &&
        stand.wohnungen[i]!.typ !== stand.wohnungen[j]!.typ,
    );
    const mergeVerfuegbar = nachbarn.length > 0;
    const jitterVerfuegbar = mixSollOriginal.length > 0;

    const verfuegbareZuege: SegmentVariante['zug'][] = [];
    if (jitterVerfuegbar) verfuegbareZuege.push('zielgroesseJittern', 'mixPermutation');
    if (typTauschVerfuegbar) verfuegbareZuege.push('typTausch');
    if (mergeVerfuegbar) verfuegbareZuege.push('mergeResplit');

    if (verfuegbareZuege.length === 0) {
      // Rand-Fall (kein Programm, keine Nachbarschaft): ehrlich als
      // Stagnation ausweisen statt eine verdeckte Endlosschleife zu bauen.
      yield { ...bester, zug: 'stagnation' };
      continue;
    }

    const zug = verfuegbareZuege[Math.floor(rnd() * verfuegbareZuege.length)]!;
    let neueWohnungen: GeschnitteneWohnung[] | null = null;
    let neuerStand = stand;

    if (zug === 'zielgroesseJittern') {
      const r = zugZielgroesseJittern(eingabe, stand, mixSollOriginal, rnd);
      neueWohnungen = r.wohnungen;
      neuerStand = r.stand;
    } else if (zug === 'mixPermutation') {
      const r = zugMixPermutation(eingabe, stand, rnd);
      neueWohnungen = r.wohnungen;
      neuerStand = r.stand;
    } else if (zug === 'typTausch') {
      neueWohnungen = zugTypTausch(stand.wohnungen, mixSollOriginal, rnd);
    } else {
      neueWohnungen = zugMergeResplit(stand.wohnungen, mixSollOriginal, stand.minBreite, rnd);
    }

    if (!neueWohnungen || neueWohnungen.length === 0) {
      // Ungültiger/wirkungsloser Zugversuch — verwerfen, nicht liefern.
      continue;
    }

    const teilScores = berechneTeilScores(neueWohnungen, mixSollOriginal);
    const score = gewichteterScore(teilScores, gewichte);
    const kandidat: SegmentVariante = { wohnungen: neueWohnungen, score, teilScores, seed, zug };
    yield kandidat;

    if (score > bester.score) {
      bester = kandidat;
      stand = { ...neuerStand, wohnungen: neueWohnungen };
    }
  }
}
