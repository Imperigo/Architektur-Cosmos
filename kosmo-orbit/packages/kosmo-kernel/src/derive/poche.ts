import type { BauPhase } from '../model/doc';
import { schraffurFuer } from './schraffur';

/**
 * Zentrale Poché-Utility (v0.7.0, `docs/V070-KONZEPT.md` E2) — EINE Stelle
 * entscheidet, wie eine geschnittene Fläche (Grundriss-Region oder
 * Schnitt-Fläche) gefüllt wird. Ersetzt die verstreuten Phasen-/Umbau-/
 * Themenplan-Weichen in `plansvg.ts` (Grundriss-Fill, Schnitt-Fill) und die
 * `phase === 'vorprojekt'`-Abfrage in `plan.ts` (dort nur `einDeckung`).
 *
 * Owner-Auftrag «Schwarz auf Weiss»: SIA-Phasen vom Wettbewerb bis und mit
 * Baueingabe zeichnen SCHWARZ (ein Poché in Wettbewerb/Vorprojekt, Schichten
 * schwarz/grau ab Bauprojekt/Baueingabe); Werkplan bleibt beim heutigen
 * Material-Verhalten (Tints aus `schraffurFuer()`, echte Schraffurlinien).
 * `pocheModus` überschreibt die Phase: `'schwarz'` erzwingt die Schwarz-Regeln
 * überall, `'material'` erzwingt das heutige Verhalten überall (auch früh im
 * SIA-Zyklus) — **byte-identischer Refactor** für `phase === 'werkplan'`
 * bzw. `modus === 'material'`, bewiesen über die 16 Alt-Goldens.
 */

export type PocheModus = 'phase' | 'schwarz' | 'material';

export interface PocheEntscheid {
  /** Welche Regel gegriffen hat (rein informativ/testbar, kein SVG-Feld). */
  art: 'schwarz' | 'grau' | 'daemmung' | 'tint' | 'umbau' | 'thema' | 'none';
  /** Konkrete Farbe für den SVG-Export; `null` = keine Füllung (Aufrufer
   * setzt in dem Fall `'none'`). */
  fill: string | null;
  /** Echte Schraffurlinien zeichnen (nur werkplan bzw. modus 'material') —
   * in Schwarz-Phasen bleibt die Fläche ungeschraffiert solid. */
  schraffurLinien: boolean;
  /** EIN Poché über die Gesamtdicke (statt Schichten) — nur Wettbewerb/
   * Vorprojekt (bzw. `modus: 'schwarz'` in diesen Phasen); der Aufrufer in
   * `plan.ts` verwendet dieses Feld VOR der Schichtbildung (Geometrie), die
   * übrigen Felder gelten erst danach (Füllung je Region/Fläche). */
  einDeckung: boolean;
}

/**
 * Schwarz-Regeln greifen für Wettbewerb…Baueingabe (Modus 'phase') bzw.
 * IMMER (Modus 'schwarz'); Modus 'material' schaltet sie nie ein — auch
 * nicht in frühen Phasen (E2: «modus 'material' in JEDER Phase» = heutiges
 * Verhalten).
 */
function istSchwarzModus(phase: BauPhase, modus: PocheModus): boolean {
  if (modus === 'material') return false;
  if (modus === 'schwarz') return true;
  return phase !== 'werkplan';
}

export function pocheEntscheid(args: {
  phase: BauPhase;
  modus: PocheModus;
  material?: string;
  klassen: { tragend: boolean; daemmung: boolean; projektion: boolean };
  umbau?: 'bestand' | 'abbruch' | 'neu';
  themaFarbe?: string;
  kontext: 'grundriss' | 'schnitt';
}): PocheEntscheid {
  const { phase, modus, material, klassen, umbau, themaFarbe, kontext } = args;
  const schwarz = istSchwarzModus(phase, modus);
  const einDeckung = schwarz && (phase === 'wettbewerb' || phase === 'vorprojekt');
  // Schraffurlinien nur im Material-Stil (werkplan bzw. modus 'material') —
  // Schwarz-Phasen bleiben solid, keine Materialschraffur auf einer
  // Symbolfarbe.
  const schraffurLinien = !schwarz;

  // Präzedenz (fix, E2): themaFarbe > Umbau (SIA 400 B.8.11, gewinnt AUCH in
  // Schwarz-Phasen — Baugesuch braucht rot/gelb) > Phasen-Schwarz > heutige
  // Tints/Grau.
  if (themaFarbe) {
    return { art: 'thema', fill: themaFarbe, schraffurLinien, einDeckung };
  }
  if (umbau === 'neu') {
    return { art: 'umbau', fill: klassen.projektion ? null : '#e9c8c5', schraffurLinien, einDeckung };
  }
  if (umbau === 'abbruch') {
    return { art: 'umbau', fill: '#f3e29b', schraffurLinien, einDeckung };
  }
  if (umbau === 'bestand') {
    return { art: 'umbau', fill: klassen.projektion ? null : '#c9c9c9', schraffurLinien, einDeckung };
  }

  if (schwarz) {
    // Projektion (z.B. Treppe über Schnitthöhe) bleibt in jeder Phase offen.
    if (klassen.projektion) return { art: 'none', fill: null, schraffurLinien, einDeckung };
    // Wettbewerb/Vorprojekt: einDeckung=true — ALLE geschnittenen Bauteile
    // EIN schwarzes Poché, unabhängig von Schicht/Funktion (der Grundriss
    // merged sie ohnehin zu einer Fläche, s. plan.ts; der Schnitt kennt bei
    // einDeckung keine verlässliche Schicht-Funktion je Face).
    if (einDeckung) return { art: 'schwarz', fill: '#1a1a1a', schraffurLinien, einDeckung };
    // Bauprojekt/Baueingabe (oder modus 'schwarz' in diesen bzw. werkplan):
    // Schichten — tragend schwarz, Dämmung weiss ohne Schraffur, alles
    // andere («nichttragend») grau.
    if (klassen.tragend) return { art: 'schwarz', fill: '#1a1a1a', schraffurLinien, einDeckung };
    if (klassen.daemmung) return { art: 'daemmung', fill: '#ffffff', schraffurLinien, einDeckung };
    return { art: 'grau', fill: '#c9c9c9', schraffurLinien, einDeckung };
  }

  // Material-Stil (werkplan bzw. modus 'material') — heutiges Verhalten.
  if (kontext === 'grundriss') {
    if (klassen.tragend) return { art: 'grau', fill: '#c9c9c9', schraffurLinien, einDeckung };
    if (klassen.daemmung) return { art: 'daemmung', fill: '#efefef', schraffurLinien, einDeckung };
    if (klassen.projektion) return { art: 'none', fill: null, schraffurLinien, einDeckung };
    return { art: 'tint', fill: 'white', schraffurLinien, einDeckung };
  }
  // kontext === 'schnitt': Material-Tint aus schraffurFuer(). Der genaue
  // Schicht-Funktionsschlüssel (bekleidung/dichtung/hohlraum) ist über
  // `klassen` nicht 1:1 abbildbar (nur tragend/daemmung/projektion, exakte
  // E2-Signatur) — `plansvg.ts`s `sectionInnerSvg` ruft `schraffurFuer()`
  // deshalb selbst mit dem echten `functionKey` auf und nimmt bei
  // `art === 'tint'` DESSEN Tint statt diesem hier (byte-identischer
  // Material-Stil, unabhängig von dieser Vereinfachung).
  const functionKey = klassen.tragend ? 'tragend' : klassen.daemmung ? 'daemmung' : undefined;
  const spec = schraffurFuer(material ?? '', functionKey);
  return { art: spec.tint ? 'tint' : 'none', fill: spec.tint, schraffurLinien, einDeckung };
}
