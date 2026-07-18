import type { RefEntry } from '@kosmo/data';
import { bm25Scores } from '../modules/prepare/knowledge';
import { loadReferences } from '../modules/data/DataWorkspace';

/**
 * Referenz-Index (v0.8.3/P2, `docs/V083-SPEZ.md` §6.1/E6a) — EIN gecachter
 * BM25-Index über die KosmoData-Referenzbibliothek (`loadReferences()`,
 * 112(+N) kuratierte Bauwerke), geteilt zwischen `state/quellen.ts`
 * (`sucheQuellen()`s Referenz-Zweig, [Qn]-fähig) UND dem
 * `referenzen_suchen`-Werkzeug (`shell/KosmoPanel.tsx`). Beide Konsumenten
 * rufen `sucheReferenzen()` auf — dieselbe Funktion, derselbe Index, damit
 * eine Anfrage in BEIDEN Wegen exakt dieselbe Rangfolge liefert (Gate:
 * BM25-Paritätstest). Ersetzt den vormals naiven `.includes()`-Treffer in
 * `referenzen_suchen` (`KosmoPanel.tsx:825`, geprüft `V083-SPEZ.md` §14
 * Beleg 19).
 *
 * Caching (§6.1 wörtlich: «der Index wird einmal pro `loadReferences()`-
 * Ergebnis gebaut … nicht bei jeder Suche neu»): `loadReferences()` selbst
 * hält bereits einen Modul-Cache (`DataWorkspace.tsx`, `let cache`) — das
 * hier gebaute Such-Vorfeld (die aus jeder Referenz vorberechnete
 * BM25-Heuhaufen-Zeile) wird zusätzlich per Objekt-Referenz auf das
 * geladene Array memoisiert: solange `loadReferences()` dasselbe Array
 * zurückgibt (Normalfall — der Seed ändert sich nie zur Laufzeit), baut
 * `sucheReferenzen()` die Heuhaufen-Zeilen NICHT erneut, nur `bm25Scores()`
 * (die eigentliche Query-Bewertung, zwingend pro Anfrage) läuft jedes Mal.
 */

export interface ReferenzTreffer {
  entry: RefEntry;
  score: number;
}

interface ReferenzIndex {
  quelle: RefEntry[];
  hays: string[];
}

let indexCache: ReferenzIndex | null = null;
/** NUR für Tests: zählt, wie oft der Heuhaufen tatsächlich neu gebaut wurde (Cache-Treffer-Beweis). */
let bauZaehler = 0;

/**
 * EIN kanonischer Heuhaufen je Referenz — vereint die Felder, die vorher an
 * zwei Stellen leicht unterschiedlich zusammengesetzt wurden (`quellen.ts`
 * ohne `style_sector`/`program`, `referenzen_suchen` mit beiden, s. §14 Beleg
 * 18/19): Titel, Ort, Land, Sparte, Programm, Autoren, Themen, Material,
 * Kurz-/Beschreibungstext. Eine einzige Definition — keine Drift mehr
 * zwischen den beiden Konsumenten.
 */
function hayFuerReferenz(r: RefEntry): string {
  return [
    r.title,
    r.city,
    r.country,
    r.style_sector,
    r.program,
    ...(r.authors ?? []),
    ...(r.themes ?? []),
    ...(r.materials ?? []),
    r.one_sentence,
    r.short_description,
  ]
    .filter(Boolean)
    .join(' ');
}

async function ladeIndex(): Promise<ReferenzIndex> {
  const entries = await loadReferences();
  if (indexCache && indexCache.quelle === entries) return indexCache;
  bauZaehler++;
  const index: ReferenzIndex = { quelle: entries, hays: entries.map(hayFuerReferenz) };
  indexCache = index;
  return index;
}

/**
 * Durchsucht die Referenzbibliothek per BM25 (IDF + Sättigung + Längen-
 * Normalisierung, dieselbe `bm25Scores`-Maschinerie wie die Wissensbasis-
 * Suche). `limit` unbesetzt → alle Treffer mit `score > 0`, absteigend
 * sortiert (Verhalten, das `quellen.ts` für sein eigenes globales
 * Kategorien-Mischen + -Kappen braucht); gesetzt → auf `limit` gekappt
 * (Verhalten, das `referenzen_suchen` für seine Werkzeug-Ausgabe braucht).
 */
export async function sucheReferenzen(query: string, limit?: number): Promise<ReferenzTreffer[]> {
  const { quelle, hays } = await ladeIndex();
  const scores = bm25Scores(hays, query);
  const treffer = quelle
    .map((entry, i) => ({ entry, score: scores[i]! }))
    .filter((t) => t.score > 0)
    .sort((a, b) => b.score - a.score);
  return limit !== undefined ? treffer.slice(0, limit) : treffer;
}

/** NUR für Tests: Anzahl der tatsächlichen Index-Neubauten seit Prozessstart/letztem Reset. */
export function referenzIndexBauZaehlerFuerTests(): number {
  return bauZaehler;
}

/** NUR für Tests: erzwingt einen Neu-Aufbau beim nächsten Aufruf (z.B. nach manuellem `loadReferences()`-Cache-Reset). */
export function resetReferenzIndexFuerTests(): void {
  indexCache = null;
  bauZaehler = 0;
}
