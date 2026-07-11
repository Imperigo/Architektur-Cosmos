import type { Pt } from '../model/units';

/**
 * CH-Standort-Kontext (V2-V4): LV95-Parzellengeometrie (geo.admin.ch
 * identify, Meter) → lokales Modell-Koordinatensystem (mm). Nord bleibt
 * +y (LV95-Nordachse = Modell-y), der Ursprung wandert ins Zentrum der
 * Parzelle — damit landet die Geometrie zeichenbar nahe 0/0.
 */

export interface ParzellenImport {
  outline: Pt[];
  /** LV95-Zentrum (m) — als Anker, um später weitere Geometrie zu georeferenzieren. */
  zentrum: { e: number; n: number };
  /** Fläche in m² (zur Plausibilisierung: Gemeindegrenzen sind KEINE Parzellen). */
  flaeche: number;
}

/** Kleinsten Ring aus identify-Resultaten wählen (Punkt trifft oft auch Gemeinde). */
function waehleBestesRing(rings: number[][][]): { ring: number[][]; flaeche: number } | null {
  let bester: { ring: number[][]; flaeche: number } | null = null;
  for (const ring of rings) {
    if (ring.length < 4) continue;
    let a2 = 0;
    for (let i = 0; i < ring.length; i++) {
      const p = ring[i]!;
      const q = ring[(i + 1) % ring.length]!;
      a2 += p[0]! * q[1]! - q[0]! * p[1]!;
    }
    const flaeche = Math.abs(a2) / 2;
    if (flaeche > 1 && (!bester || flaeche < bester.flaeche)) bester = { ring, flaeche };
  }
  return bester;
}

/**
 * Ring→mm-Transformation (v0.7.1 E2/1B, Anker-Refactor): wählt aus mehreren
 * identify-Ringen den kleinsten (s. `waehleBestesRing`), verwirft den
 * duplizierten Schlusspunkt und projiziert die verbleibenden Punkte auf das
 * lokale mm-Koordinatensystem — Nullpunkt am übergebenen `anker` (LV95-Meter),
 * Nord bleibt +y. Reine Funktion, KEIN interner Zentrums-Mittelwert mehr —
 * das erlaubt, mehrere Geometrien (Parzelle UND Nachbargebäude) an EINEM
 * gemeinsamen Anker zu verankern (s. `nachbarnZuOutlines` unten).
 * Kein passender Ring (z.B. alle < 4 Punkte oder Fläche ≤ 1 m²) ⇒ `[]`.
 */
export function ringsZuOutline(rings: number[][][], anker: { e: number; n: number }): Pt[] {
  const bester = waehleBestesRing(rings);
  if (!bester) return [];
  // Duplizierten Schlusspunkt weglassen
  const roh = bester.ring;
  const letzte = roh[roh.length - 1]!;
  const punkte = letzte[0] === roh[0]![0] && letzte[1] === roh[0]![1] ? roh.slice(0, -1) : roh;
  return punkte.map((p) => ({
    x: Math.round((p[0]! - anker.e) * 1000),
    y: Math.round((p[1]! - anker.n) * 1000),
  }));
}

/**
 * Parzellen-Import: wählt den kleinsten Ring, verankert am EIGENEN Zentrum
 * (Mittelwert der Ringpunkte) — Bestandsverhalten seit v0.7.0, byte-gleich
 * gehalten durchs Anker-Refactor (die Punkt-Transformation läuft über das
 * ungerundete Zentrum, exakt wie vor dem Refactor; `zentrum` im Ergebnis
 * bleibt wie bisher auf 2 Nachkommastellen gerundet).
 */
export function parzelleZuOutline(rings: number[][][]): ParzellenImport | null {
  const bester = waehleBestesRing(rings);
  if (!bester) return null;
  let e = 0, n = 0;
  for (const p of bester.ring) {
    e += p[0]!;
    n += p[1]!;
  }
  e /= bester.ring.length;
  n /= bester.ring.length;
  return {
    // Ungerundetes e/n für die Punkt-Transformation — identisch zum
    // Verhalten vor dem Refactor (die gerundete `zentrum`-Angabe unten war
    // schon immer NUR die Anzeige-/Rückgabegrösse, nie die Rechenbasis).
    outline: ringsZuOutline(rings, { e, n }),
    zentrum: { e: Math.round(e * 100) / 100, n: Math.round(n * 100) / 100 },
    flaeche: Math.round(bester.flaeche),
  };
}

/**
 * Nachbargebäude-Ringe (v0.7.1 E2/1B): transformiert mehrere Gebäude-Ringlisten
 * an EINEM gemeinsamen Anker — dem Parzellen-Zentrum (`ParzellenImport.
 * zentrum`), NICHT dem jeweils eigenen Gebäude-Schwerpunkt. So landen Nachbar-
 * Footprints und die eigene Parzelle im selben lokalen Koordinatensystem.
 * Ringlisten ohne gültigen Ring (z.B. leer) liefern ein leeres Outline `[]` an
 * ihrer Stelle — kein Eintrag wird stillschweigend übersprungen (Aufrufer
 * kann 1:1 mit der Eingabe-Reihenfolge weiterarbeiten).
 */
export function nachbarnZuOutlines(
  ringsListe: number[][][][],
  anker: { e: number; n: number },
): Pt[][] {
  return ringsListe.map((rings) => ringsZuOutline(rings, anker));
}
