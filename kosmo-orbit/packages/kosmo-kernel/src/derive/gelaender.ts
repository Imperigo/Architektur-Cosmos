import type { Gelaender } from '../model/entities';
import type { Pt } from '../model/units';

/**
 * Geländer-Geometrie (v0.9.1 P-A1, `docs/V091-SPEZ.md` K24) — EINE Zerlegung
 * einer Geländer-Polylinie in Pfosten-Positionen und Handlauf-Segmente, nach
 * demselben Baumuster wie `derive/treppe.ts` (`treppenTeile`): eine reine,
 * seiteneffektfreie Funktion, die aus dem gespeicherten Entity die Bausteine
 * liefert, aus denen sowohl die 3D-Ableitung (`derive/scene.ts`) als auch der
 * spätere Plan-Zweig (P-B3, NICHT Teil dieses Pakets) dieselbe Wahrheit
 * lesen — kein zweiter, abweichender Berechnungsweg für dieselbe Geometrie.
 *
 * **Pfosten-Regel:** die Polylinie besteht aus geraden Segmenten zwischen
 * `punkte[i]` und `punkte[i+1]`. An JEDEM Punkt der Polylinie — beide Enden
 * UND jeder innenliegende Knick — steht zwingend ein Pfosten (Statik-/
 * Montagegrund: ein Richtungswechsel ohne Pfosten wäre ein unmöglicher
 * Handlauf-Knick in der Luft). Ist ein Segment länger als die Teilung
 * (~1200 mm), werden zusätzliche Zwischenpfosten in gleichmässigem Abstand
 * (`Segmentlänge / n`, `n = ceil(Segmentlänge / 1200)`, also stets ≤ 1200 mm)
 * eingefügt. Jeder Polylinien-Knick wird dabei NUR einmal als Pfosten
 * gezählt: er ist zugleich Endpunkt des vorherigen und Startpunkt des
 * nächsten Segments, die zweite (redundante) Nennung entfällt.
 *
 * **Handlauf-Regel:** ein Handlauf-Segment je Polylinien-Segment (a→b,
 * `punkte[i]` → `punkte[i+1]`) — der Handlauf läuft durchgehend über die
 * ganze Polylinie, unabhängig von der feineren Pfosten-Teilung.
 */

export const GELAENDER_PFOSTEN_TEILUNG_MM = 1200;

export interface GelaenderTeile {
  /** Pfosten-Positionen: beide Enden + jeder Knick zwingend, dazwischen
   * gleichmässig geteilt (≤ 1200 mm), jeder Punkt genau einmal. */
  pfosten: Pt[];
  /** Ein gerades Handlauf-Segment je Polylinien-Abschnitt. */
  handlaufSegmente: { a: Pt; b: Pt }[];
}

/** Reine Zerlegung: Geländer-Polylinie → Pfosten + Handlauf-Segmente. */
export function gelaenderTeile(g: Gelaender): GelaenderTeile {
  const punkte = g.punkte;
  const handlaufSegmente: { a: Pt; b: Pt }[] = [];
  for (let i = 1; i < punkte.length; i++) {
    handlaufSegmente.push({ a: punkte[i - 1]!, b: punkte[i]! });
  }

  const pfosten: Pt[] = [];
  for (let i = 0; i < punkte.length - 1; i++) {
    const a = punkte[i]!;
    const b = punkte[i + 1]!;
    const segLen = Math.hypot(b.x - a.x, b.y - a.y);
    const n = Math.max(1, Math.ceil(segLen / GELAENDER_PFOSTEN_TEILUNG_MM));
    // k=0 (Segmentanfang) NUR im allerersten Segment aufnehmen — bei jedem
    // weiteren Segment ist a bereits als Segmentende des vorherigen
    // Durchlaufs (k=n dort) im Array, sonst gäbe es am Knick einen Doppel-
    // eintrag.
    const startK = i === 0 ? 0 : 1;
    for (let k = startK; k <= n; k++) {
      const t = k / n;
      pfosten.push({
        x: Math.round(a.x + (b.x - a.x) * t),
        y: Math.round(a.y + (b.y - a.y) * t),
      });
    }
  }

  return { pfosten, handlaufSegmente };
}
