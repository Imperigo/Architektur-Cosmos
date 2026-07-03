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
export function parzelleZuOutline(rings: number[][][]): ParzellenImport | null {
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
  if (!bester) return null;
  let e = 0, n = 0;
  for (const p of bester.ring) {
    e += p[0]!;
    n += p[1]!;
  }
  e /= bester.ring.length;
  n /= bester.ring.length;
  // Duplizierten Schlusspunkt weglassen
  const roh = bester.ring;
  const letzte = roh[roh.length - 1]!;
  const punkte = letzte[0] === roh[0]![0] && letzte[1] === roh[0]![1] ? roh.slice(0, -1) : roh;
  return {
    outline: punkte.map((p) => ({ x: Math.round((p[0]! - e) * 1000), y: Math.round((p[1]! - n) * 1000) })),
    zentrum: { e: Math.round(e * 100) / 100, n: Math.round(n * 100) / 100 },
    flaeche: Math.round(bester.flaeche),
  };
}
