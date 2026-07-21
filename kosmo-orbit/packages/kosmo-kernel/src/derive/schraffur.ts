/**
 * SIA-Materialschraffuren — Poché als echte Liniengeometrie.
 *
 * Kein SVG-<pattern>: svg2pdf rendert Patterns nicht zuverlässig (gleiche
 * Erfahrung wie beim Grundriss-Poché). Der Generator schneidet rotierte
 * Scanlines gegen das Schnittpolygon (evenodd über alle Loops) — dieselben
 * Linien landen identisch in App-SVG, Export-SVG und PDF.
 */

export type SchraffurMuster = 'diagonal' | 'kreuz' | 'wellen' | 'voll' | 'keine';

export interface SchraffurSpec {
  muster: SchraffurMuster;
  /** Linienabstand in Papier-mm. */
  abstand: number;
  winkelGrad: number;
  /** Flächen-Tönung (hex) oder null für weiss/offen. */
  tint: string | null;
  /**
   * Statt `winkelGrad` läuft das Muster entlang der Bauteilachse — dem
   * Winkel der längsten Loop-Kante (dünne Schicht: lange Achse = Achse des
   * Bauteils). Dämmwelle in der Wand steht, im Dach folgt sie der Neigung.
   */
  folgtBauteilachse?: boolean;
}

const KATALOG: Record<string, SchraffurSpec> = {
  beton: { muster: 'diagonal', abstand: 1.8, winkelGrad: 45, tint: '#dad7d1' },
  stahlbeton: { muster: 'diagonal', abstand: 1.8, winkelGrad: 45, tint: '#dad7d1' },
  mauerwerk: { muster: 'diagonal', abstand: 2.6, winkelGrad: 45, tint: null },
  backstein: { muster: 'diagonal', abstand: 2.6, winkelGrad: 45, tint: null },
  kalksandstein: { muster: 'kreuz', abstand: 3.0, winkelGrad: 45, tint: null },
  holz: { muster: 'kreuz', abstand: 2.4, winkelGrad: 45, tint: '#e7ddcf' },
  masse: { muster: 'voll', abstand: 0, winkelGrad: 0, tint: '#dcd9d3' },
  dach: { muster: 'diagonal', abstand: 2.4, winkelGrad: 45, tint: null },
};

const FUNKTION: Record<string, SchraffurSpec> = {
  tragend: { muster: 'diagonal', abstand: 1.8, winkelGrad: 45, tint: '#dad7d1' },
  daemmung: { muster: 'wellen', abstand: 2.8, winkelGrad: 0, tint: null, folgtBauteilachse: true },
  bekleidung: { muster: 'voll', abstand: 0, winkelGrad: 0, tint: '#eceae6' },
  dichtung: { muster: 'voll', abstand: 0, winkelGrad: 0, tint: '#b9b5ae' },
  hohlraum: { muster: 'keine', abstand: 0, winkelGrad: 0, tint: null },
};

/**
 * Materialschlüssel sind freie Strings («daemmung-mw», «beton C25/30») —
 * erst exakter Treffer, dann Präfix, dann die Schichtfunktion als Rückfall.
 */
export function schraffurFuer(material: string, functionKey?: string): SchraffurSpec {
  const key = material.toLowerCase();
  const exakt = KATALOG[key];
  if (exakt) return exakt;
  for (const [k, spec] of Object.entries(KATALOG)) {
    if (key.startsWith(k)) return spec;
  }
  if (key.startsWith('daemm') || key.startsWith('iso')) return FUNKTION.daemmung!;
  if (functionKey && FUNKTION[functionKey]) return FUNKTION[functionKey]!;
  return { muster: 'voll', abstand: 0, winkelGrad: 0, tint: '#e3e0da' };
}

export interface SzPt {
  s: number;
  z: number;
}

/**
 * Schraffurlinien für ein Loop-Set (evenodd) im (s,z)-Bild.
 * `scale` = Plan-Massstab (Welt-mm pro Papier-mm); Rückgabe: Polylinien in
 * Welt-mm — Diagonalen als Zweipunkt-Linien, Wellen als Zickzack.
 */
export function schraffurLinien(loops: readonly (readonly SzPt[])[], spec: SchraffurSpec, scale: number): SzPt[][] {
  if (spec.muster === 'voll' || spec.muster === 'keine') return [];
  const basis = spec.folgtBauteilachse ? (bauteilachseWinkelGrad(loops) ?? spec.winkelGrad) : spec.winkelGrad;
  const winkel = spec.muster === 'kreuz' ? [basis, basis + 90] : [basis];
  const out: SzPt[][] = [];
  for (const w of winkel) {
    out.push(...scanlines(loops, spec.abstand * scale, (w * Math.PI) / 180, spec.muster === 'wellen', scale));
  }
  return out;
}

/**
 * Bauteilachse eines Loop-Sets: Winkel (Grad) der LÄNGSTEN Kante, normiert
 * auf [0°, 180°). Eine exakt horizontale Kante ergibt exakt 0 — derselbe
 * Wert wie der bisherige Fixwinkel, flache Schichten bleiben byte-still.
 */
function bauteilachseWinkelGrad(loops: readonly (readonly SzPt[])[]): number | null {
  let best = 0;
  let winkel: number | null = null;
  for (const loop of loops) {
    for (let i = 0; i < loop.length; i++) {
      const p = loop[i]!;
      const q = loop[(i + 1) % loop.length]!;
      const ds = q.s - p.s;
      const dz = q.z - p.z;
      const l2 = ds * ds + dz * dz;
      if (l2 > best) {
        best = l2;
        winkel = Math.atan2(dz, ds);
      }
    }
  }
  if (winkel === null) return null;
  return ((((winkel * 180) / Math.PI) % 180) + 180) % 180;
}

function scanlines(
  loops: readonly (readonly SzPt[])[],
  abstand: number,
  winkel: number,
  wellen: boolean,
  scale: number,
): SzPt[][] {
  if (abstand <= 0) return [];
  const u = { s: Math.cos(winkel), z: Math.sin(winkel) };
  const m = { s: -u.z, z: u.s };
  let cMin = Infinity;
  let cMax = -Infinity;
  for (const loop of loops) {
    for (const p of loop) {
      const c = p.s * m.s + p.z * m.z;
      cMin = Math.min(cMin, c);
      cMax = Math.max(cMax, c);
    }
  }
  if (!Number.isFinite(cMin) || cMax - cMin < abstand * 0.25) return [];
  const out: SzPt[][] = [];
  // halbe Teilung Rand-Abstand, damit die erste Linie nicht auf der Kante liegt
  for (let c = Math.ceil((cMin + abstand / 2) / abstand) * abstand; c < cMax; c += abstand) {
    const ts: number[] = [];
    for (const loop of loops) {
      for (let i = 0; i < loop.length; i++) {
        const p = loop[i]!;
        const q = loop[(i + 1) % loop.length]!;
        const cp = p.s * m.s + p.z * m.z - c;
        const cq = q.s * m.s + q.z * m.z - c;
        if ((cp <= 0 && cq > 0) || (cp > 0 && cq <= 0)) {
          const f = cp / (cp - cq);
          const x = p.s + (q.s - p.s) * f;
          const y = p.z + (q.z - p.z) * f;
          ts.push(x * u.s + y * u.z);
        }
      }
    }
    ts.sort((a, b) => a - b);
    for (let i = 0; i + 1 < ts.length; i += 2) {
      const t0 = ts[i]!;
      const t1 = ts[i + 1]!;
      if (t1 - t0 < abstand * 0.2) continue;
      const punkt = (t: number, off: number): SzPt => ({
        s: u.s * t + m.s * (c + off),
        z: u.z * t + m.z * (c + off),
      });
      if (!wellen) {
        out.push([punkt(t0, 0), punkt(t1, 0)]);
      } else {
        // Dämmungs-Welle: Zickzack mit ~1.4 Papier-mm Schrittweite
        const schritt = 1.4 * scale;
        const amp = abstand * 0.32;
        const n = Math.max(2, Math.round((t1 - t0) / schritt));
        const linie: SzPt[] = [punkt(t0, 0)];
        for (let k = 1; k < n; k++) {
          linie.push(punkt(t0 + ((t1 - t0) * k) / n, k % 2 === 1 ? amp : -amp));
        }
        linie.push(punkt(t1, 0));
        out.push(linie);
      }
    }
  }
  return out;
}
