import type { KosmoDoc } from '../model/doc';
import type { Wall } from '../model/entities';
import type { Mm } from '../model/units';
import { openingRects } from '../geometry/wall';

/**
 * Assoziative Aussenbemassung — automatisch aus der Parametrik.
 * Zwei Ketten pro Seite (ArchiCAD-Konvention): innen die Öffnungskette
 * (Wandenden + Leibungen), aussen das Gesamtmass. Ändert sich das Modell,
 * ändern sich die Ketten — sie sind abgeleitet, nie gezeichnet.
 */

export interface DimensionChain {
  /** 'x': horizontale Kette (unten), 'y': vertikale Kette (links). */
  axis: 'x' | 'y';
  /** Lage der Masslinie (y- bzw. x-Koordinate in mm). */
  offset: Mm;
  /** Tick-Positionen entlang der Achse, sortiert. */
  ticks: Mm[];
}

export interface DimensionSet {
  chains: DimensionChain[];
}

const AXIS_TOL = 300; // Wand gilt als achsparallel, wenn Achsabweichung klein

export function deriveDimensions(doc: KosmoDoc, storeyId: string): DimensionSet {
  const walls = doc.byKind<Wall>('wall').filter((w) => w.storeyId === storeyId);
  if (walls.length === 0) return { chains: [] };

  let minX = Infinity,
    maxX = -Infinity,
    minY = Infinity,
    maxY = -Infinity;
  for (const w of walls) {
    for (const p of [w.a, w.b]) {
      minX = Math.min(minX, p.x);
      maxX = Math.max(maxX, p.x);
      minY = Math.min(minY, p.y);
      maxY = Math.max(maxY, p.y);
    }
  }

  // Kandidaten: horizontale Wände nahe der Südkante → x-Kette; vertikale nahe Westkante → y-Kette
  const xTicks = new Set<Mm>();
  const yTicks = new Set<Mm>();

  for (const w of walls) {
    const horizontal = Math.abs(w.a.y - w.b.y) <= AXIS_TOL;
    const vertical = Math.abs(w.a.x - w.b.x) <= AXIS_TOL;
    const rects = openingRects(w, doc.openingsOf(w.id));

    if (horizontal && Math.min(w.a.y, w.b.y) <= minY + AXIS_TOL) {
      xTicks.add(w.a.x);
      xTicks.add(w.b.x);
      const sign = w.b.x >= w.a.x ? 1 : -1;
      for (const r of rects) {
        // s zählt ab Punkt a entlang der Achse
        xTicks.add(Math.round(w.a.x + sign * r.s0));
        xTicks.add(Math.round(w.a.x + sign * r.s1));
      }
    }
    if (vertical && Math.min(w.a.x, w.b.x) <= minX + AXIS_TOL) {
      yTicks.add(w.a.y);
      yTicks.add(w.b.y);
      const sign = w.b.y >= w.a.y ? 1 : -1;
      for (const r of rects) {
        yTicks.add(Math.round(w.a.y + sign * r.s0));
        yTicks.add(Math.round(w.a.y + sign * r.s1));
      }
    }
  }

  const chains: DimensionChain[] = [];
  const xs = [...xTicks].sort((a, b) => a - b).filter((v, i, arr) => i === 0 || v - arr[i - 1]! > 10);
  const ys = [...yTicks].sort((a, b) => a - b).filter((v, i, arr) => i === 0 || v - arr[i - 1]! > 10);

  if (xs.length >= 2) {
    chains.push({ axis: 'x', offset: minY - 1200, ticks: xs });
    // Gesamtmass nur, wenn die Öffnungskette mehr als die Endpunkte hat
    if (xs.length > 2) chains.push({ axis: 'x', offset: minY - 2000, ticks: [xs[0]!, xs[xs.length - 1]!] });
  }
  if (ys.length >= 2) {
    chains.push({ axis: 'y', offset: minX - 1200, ticks: ys });
    if (ys.length > 2) chains.push({ axis: 'y', offset: minX - 2000, ticks: [ys[0]!, ys[ys.length - 1]!] });
  }
  return { chains };
}

/** Masszahl zwischen zwei Ticks — Zentimeter-Konvention des Hochbaus (z.B. 361.5). */
export function dimensionLabel(a: Mm, b: Mm): string {
  const cm = Math.abs(b - a) / 10;
  return Number.isInteger(cm) ? String(cm) : cm.toFixed(1);
}
