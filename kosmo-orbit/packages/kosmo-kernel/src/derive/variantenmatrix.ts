import type { StudienVariante } from './volumenstudie';
import type { SegmentVariante } from './variantensuche';

/**
 * Varianten-Matrix (V2-V3/F4 Volumenstudien, verallgemeinert v0.7.0 E5-iii,
 * Stream 5A) — Parallel-Axis-Datensatz: je Variante eine Linie über
 * normierte Achsen. Reine Ableitung; das SVG zeichnet die App.
 *
 * ## Verallgemeinerung (E5-iii)
 *
 * Der Kern ist jetzt QUELLENUNABHÄNGIG: `kennzahlMatrix(eintraege, spalten)`
 * kennt weder Volumenstudien noch die Variantensuche — sie nimmt eine
 * generische `MatrixEintrag[]`-Liste (Name + benannte Rohwerte) und eine
 * Spaltenauswahl entgegen. Zwei dünne Adapter bauen die generische Quelle:
 * - `variantenMatrix()` — Volumenstudien (F4, UNVERÄNDERTES Verhalten,
 *   byte-identisch zur bisherigen Fassung: gleiche Achsen, gleiche
 *   Rundung, gleiche Bereiche-Berechnung — nur die Achsen-Iteration selbst
 *   läuft jetzt über `kennzahlMatrix`).
 * - `segmentVariantenMatrix()` — NEU: Ergebnisse von `variantenSuche()`
 *   (derive/variantensuche.ts, Stream 4A/5A), Spalten = Score + die vier
 *   Teilscores.
 */

export interface MatrixAchse {
  key: string;
  label: string;
  /** true: kleiner ist besser (Achse wird fürs Zeichnen invertiert). */
  kleinerBesser?: boolean;
}

export interface MatrixZeile {
  id: string;
  name: string;
  /** Rohwerte in Achsen-Reihenfolge; null = nicht anwendbar. */
  werte: (number | null)[];
  passt: boolean;
}

export interface VariantenMatrix {
  achsen: MatrixAchse[];
  zeilen: MatrixZeile[];
  /** Min/Max je Achse über alle Zeilen (fürs Normieren; null-Werte ignoriert). */
  bereiche: { min: number; max: number }[];
}

/**
 * Generische Matrix-Quelle: eine Variante ist ein Name + benannte Rohwerte.
 * Ein fehlender Schlüssel in `werte` heisst «auf dieser Variante nicht
 * anwendbar» (wird in der Zeile zu `null`, wie bisher bei Volumenstudien
 * z.B. `fussabdruck`/`besonnung` ohne Geschosse/Sonnenangabe) — deshalb
 * bleibt `werte` ein einfaches `Record<string, number>` statt `number | null`
 * je Feld: Abwesenheit IST das «nicht anwendbar».
 */
export interface MatrixEintrag {
  id: string;
  name: string;
  werte: Record<string, number>;
  passt: boolean;
}

/** Spaltenauswahl für `kennzahlMatrix` — inhaltlich identisch zu `MatrixAchse`,
 *  eigener Name an der Aufrufstelle (`spalten` statt `achsen`), weil die
 *  Achsen hier von aussen GEWÄHLT werden, nicht aus einer festen Quelle
 *  abgeleitet sind. */
export type MatrixSpalte = MatrixAchse;

/**
 * Reiner Kern: baut Zeilen + Achsen-Bereiche aus generischen Einträgen und
 * einer Spaltenauswahl. Kennt keine Quelle (Volumenstudie/Variantensuche/
 * irgendwas anderes) — die Adapter unten liefern beides.
 */
export function kennzahlMatrix(eintraege: MatrixEintrag[], spalten: MatrixSpalte[]): VariantenMatrix {
  const zeilen: MatrixZeile[] = eintraege.map((e) => ({
    id: e.id,
    name: e.name,
    passt: e.passt,
    werte: spalten.map((s) => (Object.prototype.hasOwnProperty.call(e.werte, s.key) ? e.werte[s.key]! : null)),
  }));
  const bereiche = spalten.map((_, i) => {
    const werte = zeilen.map((z) => z.werte[i]).filter((w): w is number => w !== null);
    if (werte.length === 0) return { min: 0, max: 1 };
    const min = Math.min(...werte);
    const max = Math.max(...werte);
    return { min, max: max === min ? min + 1 : max };
  });
  return { achsen: spalten, zeilen, bereiche };
}

/**
 * Adapter 1/2 — Volumenstudien (F4). Verhalten BYTE-IDENTISCH zur
 * Vorgänger-Fassung (bestehende Golden-/Unit-Tests bleiben unverändert):
 * gleiche Achsen-Liste, gleiche Rundung, gleiche Bereiche-Berechnung.
 */
export function variantenMatrix(varianten: StudienVariante[], zielGf?: number | null): VariantenMatrix {
  const spalten: MatrixSpalte[] = [
    { key: 'gf', label: 'GF m²' },
    ...(zielGf ? [{ key: 'delta', label: 'Δ Ziel m²', kleinerBesser: true }] : []),
    { key: 'geschosse', label: 'Geschosse' },
    { key: 'hoehe', label: 'Höhe m', kleinerBesser: true },
    { key: 'fussabdruck', label: 'Fussabdruck m²', kleinerBesser: true },
    { key: 'besonnung', label: 'Besonnungsreserve m' },
  ];
  const eintraege: MatrixEintrag[] = varianten.map((v) => {
    const werte: Record<string, number> = {
      gf: v.gf,
      geschosse: v.geschosse,
      hoehe: v.hoehe / 1000,
    };
    if (zielGf) werte['delta'] = Math.abs(v.gf - zielGf);
    if (v.geschosse > 0) werte['fussabdruck'] = Math.round(v.gf / v.geschosse);
    if (v.besonnung) werte['besonnung'] = (v.besonnung.ist - v.besonnung.noetig) / 1000;
    return { id: v.id, name: v.name, passt: v.passt, werte };
  });
  return kennzahlMatrix(eintraege, spalten);
}

/**
 * Adapter 2/2 — NEU (E5-iii): Ergebnisse von `variantenSuche()`
 * (derive/variantensuche.ts) als Matrix. Spalten = Score + die vier
 * Teilscores, alle bereits auf `[0, 1]` normiert (siehe Modulkopf dort) —
 * `kleinerBesser` bleibt überall weg, weil bei allen fünf Spalten grösser
 * gleich besser ist. `id`/`name` sind hier synthetisch (die Variante selbst
 * trägt keine — `zug` + laufender Index identifizieren sie eindeutig genug
 * fürs Diagramm).
 */
export function segmentVariantenMatrix(varianten: SegmentVariante[]): VariantenMatrix {
  const spalten: MatrixSpalte[] = [
    { key: 'score', label: 'Score' },
    { key: 'programmErfuellung', label: 'Programm' },
    { key: 'kompaktheit', label: 'Kompaktheit' },
    { key: 'mixTreue', label: 'Mix-Treue' },
    { key: 'flaechenNutzung', label: 'Flächennutzung' },
  ];
  const eintraege: MatrixEintrag[] = varianten.map((v, i) => ({
    id: `variante-${i}`,
    name: `#${i + 1} (${v.zug})`,
    passt: v.wohnungen.length > 0,
    werte: {
      score: v.score,
      programmErfuellung: v.teilScores.programmErfuellung,
      kompaktheit: v.teilScores.kompaktheit,
      mixTreue: v.teilScores.mixTreue,
      flaechenNutzung: v.teilScores.flaechenNutzung,
    },
  }));
  return kennzahlMatrix(eintraege, spalten);
}
