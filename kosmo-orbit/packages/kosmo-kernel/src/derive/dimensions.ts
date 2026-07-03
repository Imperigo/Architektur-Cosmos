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
  /** Öffnungskette / Gesamtmass (aussen) oder Innenkette auf der Wandachse. */
  role: 'oeffnung' | 'gesamt' | 'innen';
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

  const stil = doc.settings.bemassung;
  const chains: DimensionChain[] = [];

  // Ticks einer Wand entlang ihrer Achse: Enden + Öffnungs-Leibungen
  const wandTicks = (w: Wall, achse: 'x' | 'y'): Mm[] => {
    const ticks = new Set<Mm>([w.a[achse], w.b[achse]]);
    const sign = w.b[achse] >= w.a[achse] ? 1 : -1;
    for (const r of openingRects(w, doc.openingsOf(w.id))) {
      ticks.add(Math.round(w.a[achse] + sign * r.s0));
      ticks.add(Math.round(w.a[achse] + sign * r.s1));
    }
    return [...ticks].sort((a, b) => a - b);
  };
  const dedupe = (arr: Mm[]) => arr.filter((v, i) => i === 0 || v - arr[i - 1]! > 10);

  // Aussenketten: horizontale Wände nahe der Südkante → x-Kette; vertikale nahe Westkante → y-Kette
  if (stil.aussenKetten !== 'keine') {
    const xTicks = new Set<Mm>();
    const yTicks = new Set<Mm>();
    for (const w of walls) {
      const horizontal = Math.abs(w.a.y - w.b.y) <= AXIS_TOL;
      const vertical = Math.abs(w.a.x - w.b.x) <= AXIS_TOL;
      if (horizontal && Math.min(w.a.y, w.b.y) <= minY + AXIS_TOL) {
        for (const t of wandTicks(w, 'x')) xTicks.add(t);
      }
      if (vertical && Math.min(w.a.x, w.b.x) <= minX + AXIS_TOL) {
        for (const t of wandTicks(w, 'y')) yTicks.add(t);
      }
    }
    const xs = dedupe([...xTicks].sort((a, b) => a - b));
    const ys = dedupe([...yTicks].sort((a, b) => a - b));
    const beide = stil.aussenKetten === 'beide';
    if (xs.length >= 2) {
      if (beide) chains.push({ axis: 'x', offset: minY - 1200, ticks: xs, role: 'oeffnung' });
      // Gesamtmass nur, wenn die Öffnungskette mehr als die Endpunkte hat (bzw. immer bei «gesamt»)
      if (!beide || xs.length > 2) {
        chains.push({ axis: 'x', offset: minY - (beide ? 2000 : 1200), ticks: [xs[0]!, xs[xs.length - 1]!], role: 'gesamt' });
      }
    }
    if (ys.length >= 2) {
      if (beide) chains.push({ axis: 'y', offset: minX - 1200, ticks: ys, role: 'oeffnung' });
      if (!beide || ys.length > 2) {
        chains.push({ axis: 'y', offset: minX - (beide ? 2000 : 1200), ticks: [ys[0]!, ys[ys.length - 1]!], role: 'gesamt' });
      }
    }
  }

  // Innenketten (Werkplan): jede Innenwand bemasst sich auf ihrer eigenen Achse
  if (stil.innenKetten) {
    for (const w of walls) {
      const horizontal = Math.abs(w.a.y - w.b.y) <= AXIS_TOL;
      const vertical = Math.abs(w.a.x - w.b.x) <= AXIS_TOL;
      // «innen» = nicht an einer Bbox-Kante (weder Süd/West noch Nord/Ost)
      if (
        horizontal &&
        Math.min(w.a.y, w.b.y) > minY + AXIS_TOL &&
        Math.max(w.a.y, w.b.y) < maxY - AXIS_TOL
      ) {
        const ticks = dedupe(wandTicks(w, 'x'));
        if (ticks.length >= 2) chains.push({ axis: 'x', offset: Math.round((w.a.y + w.b.y) / 2), ticks, role: 'innen' });
      }
      if (
        vertical &&
        Math.min(w.a.x, w.b.x) > minX + AXIS_TOL &&
        Math.max(w.a.x, w.b.x) < maxX - AXIS_TOL
      ) {
        const ticks = dedupe(wandTicks(w, 'y'));
        if (ticks.length >= 2) chains.push({ axis: 'y', offset: Math.round((w.a.x + w.b.x) / 2), ticks, role: 'innen' });
      }
    }
  }

  return { chains };
}

/** Masszahl zwischen zwei Ticks — Zentimeter-Konvention des Hochbaus (z.B. 361.5). */
const HOCH = '\u2070\u00b9\u00b2\u00b3\u2074\u2075\u2076\u2077\u2078\u2079';

/** Masszahl in cm, mm-Rest hochgestellt: 3615 mm → «361⁵» (SIA 400 B.5.2). */
export function dimensionLabel(a: Mm, b: Mm): string {
  const mm = Math.round(Math.abs(b - a));
  const cm = Math.floor(mm / 10);
  const rest = mm % 10;
  return rest === 0 ? String(cm) : `${cm}${HOCH[rest]!}`;
}
