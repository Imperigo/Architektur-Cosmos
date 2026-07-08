import type { StudienVariante } from './volumenstudie';
import type { RaumprogrammPosten } from '../model/doc';

/**
 * Programm-Erfüllungsgrad je Volumenstudien-Variante (Wettbewerb-Konzept
 * Entscheid D-E5, `docs/WETTBEWERB-KONZEPT.md` — Batch D3). Reine Ableitung,
 * kein Doc-Zugriff: vergleicht das Gesamt-GF jeder Extremvariante
 * (`StudienVariante.gf`, aus `derive/volumenstudie.ts`) gegen die
 * Soll-GF-Summe des Wettbewerbs-Raumprogramms.
 *
 * EHRLICHE GRENZE (D-E5): `StudienKoerper.program` trägt bei jeder Variante
 * immer den festen String `'studie'` (`volumenstudie.ts`) — es gibt keine
 * automatische Typenzuordnung (marktgerecht/preisguenstig/alterswohnen/…) je
 * Extremvariante. Diese Ableitung vergleicht deshalb bewusst NUR die
 * Gesamt-GF gegen die Gesamt-Soll-GF, nie einzelne Raumtypen — eine
 * Typen-Erfüllung vorzutäuschen wäre falsch. Die echte Typenverteilung
 * bleibt Aufgabe des Segmentierers (`derive/segmentierer.ts`, `sollMix`) auf
 * der EINEN Variante, die der Architekt danach wählt und ins Doc übernimmt.
 *
 * HNF→GF-Weg: identisch zu `deriveBerechnungsliste`
 * (`derive/berechnungsliste.ts`, `ProgrammZeile.agfZiel`):
 * `agfZiel = hnfSoll * programmFaktor` (Owner-Default 1.22,
 * `doc.settings.programmFaktor`). Kein eigener Faktor — dieselbe Formel,
 * hier über alle `RaumprogrammPosten` aufsummiert statt je Typ.
 */

export interface ProgrammErfuellung {
  varianteId: string;
  varianteName: string;
  /** Erreichte Gesamt-GF der Variante (`StudienVariante.gf`, m²). */
  gf: number;
  /** Soll-GF-Summe des Raumprogramms: Σ hnfSoll × programmFaktor (m²), auf 1 Dezimale gerundet. */
  sollGf: number;
  /**
   * gf / sollGf × 100 (%), auf 1 Dezimale gerundet.
   * `null` wenn sollGf === 0 (kein Raumprogramm hinterlegt oder Soll-Summe
   * null) — eine Quote gegen ein leeres Programm ist nicht definierbar,
   * statt eine falsche Zahl (0 % oder Infinity) auszugeben.
   */
  erfuellungProzent: number | null;
  /** gf − sollGf (m²); positiv = über Soll, negativ = unter Soll. */
  deltaAbsolut: number;
  /** Ehrlichkeits-Hinweis (D-E5): Gesamt-GF-Vergleich, keine Typenzuordnung. */
  hinweis: string;
}

export const PROGRAMM_ERFUELLUNG_HINWEIS =
  'Gesamt-GF-Vergleich — keine Raumtypen-Zuordnung (Studie)';

/**
 * Je Variante: Gesamt-GF vs. Soll-GF-Summe des Raumprogramms.
 *
 * - `varianten = []` → `[]` (keine Studien, kein Vergleich).
 * - `raumprogramm = []` (oder Σ hnfSoll×programmFaktor === 0) → für jede
 *   Variante ein Eintrag mit `sollGf: 0`, `erfuellungProzent: null`,
 *   `deltaAbsolut: gf` — klar definiertes Verhalten statt Verwerfen der
 *   Varianten, weil die Varianten selbst weiterhin gültig sind, nur ohne
 *   Soll-Bezug.
 * - Deterministisch: reine Funktion, keine Zeit-/Zufalls-/Doc-Abhängigkeit.
 */
export function programmErfuellungJeVariante(
  varianten: StudienVariante[],
  raumprogramm: RaumprogrammPosten[],
  programmFaktor: number,
): ProgrammErfuellung[] {
  const sollGfRoh = raumprogramm.reduce((summe, posten) => summe + posten.hnfSoll * programmFaktor, 0);
  const sollGf = Math.round(sollGfRoh * 10) / 10;

  return varianten.map((variante): ProgrammErfuellung => ({
    varianteId: variante.id,
    varianteName: variante.name,
    gf: variante.gf,
    sollGf,
    erfuellungProzent: sollGf === 0 ? null : Math.round((variante.gf / sollGf) * 1000) / 10,
    deltaAbsolut: Math.round((variante.gf - sollGf) * 10) / 10,
    hinweis: PROGRAMM_ERFUELLUNG_HINWEIS,
  }));
}
