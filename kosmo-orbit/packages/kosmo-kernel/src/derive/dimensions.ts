import type { KosmoDoc } from '../model/doc';
import type { Assembly, GridAxis, Wall } from '../model/entities';
import { normal, type Mm } from '../model/units';
import { openingRects, wallFrame } from '../geometry/wall';

/**
 * Assoziative Aussenbemassung — automatisch aus der Parametrik.
 * Werkplan-Masslinienordnung (Hochbauzeichner-Konvention, B1):
 *   1. Kette Öffnungen (mit Höhenmass h/BH als Zweitzeile),
 *   2. Kette Achsmasse (wenn ein Stützenraster gesetzt ist),
 *   3. Kette Rohkonstruktion (opt-in «rohKette»: tragende Schichtkanten),
 *   äusserste Kette Gesamtmass.
 * Ändert sich das Modell, ändern sich die Ketten — abgeleitet, nie gezeichnet.
 */

export interface DimensionChain {
  /** 'x': horizontale Kette (unten), 'y': vertikale Kette (links). */
  axis: 'x' | 'y';
  /** Lage der Masslinie (y- bzw. x-Koordinate in mm). */
  offset: Mm;
  /** Tick-Positionen entlang der Achse, sortiert. */
  ticks: Mm[];
  /** Kettenrolle in der Masslinienordnung (aussen) oder Innenkette auf der Wandachse. */
  role: 'oeffnung' | 'achse' | 'roh' | 'gesamt' | 'innen';
  /** Zweitzeile je Segment (B1: Öffnungs-Höhenmasse «h/BH»), null = keine. */
  zusatz?: (string | null)[];
}

export interface DimensionSet {
  chains: DimensionChain[];
}

const AXIS_TOL = 300; // Wand gilt als achsparallel, wenn Achsabweichung klein

interface OeffSeg {
  p0: Mm;
  p1: Mm;
  label: string;
}

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
  // Öffnungs-Segmente einer Wand: Leibung→Leibung + Höhenmass-Label (h/BH)
  const wandOeffSegs = (w: Wall, achse: 'x' | 'y'): OeffSeg[] => {
    const raus: OeffSeg[] = [];
    const sign = w.b[achse] >= w.a[achse] ? 1 : -1;
    for (const r of openingRects(w, doc.openingsOf(w.id))) {
      const q0 = Math.round(w.a[achse] + sign * r.s0);
      const q1 = Math.round(w.a[achse] + sign * r.s1);
      const o = r.opening;
      const label =
        o.sill > 0
          ? `${dimensionLabel(0, o.height)}/${dimensionLabel(0, o.sill)}`
          : dimensionLabel(0, o.height);
      raus.push({ p0: Math.min(q0, q1), p1: Math.max(q0, q1), label });
    }
    return raus;
  };
  const dedupe = (arr: Mm[]) => arr.filter((v, i) => i === 0 || v - arr[i - 1]! > 10);
  const zusatzFuer = (ticks: Mm[], segs: OeffSeg[]): (string | null)[] | undefined => {
    if (segs.length === 0) return undefined;
    const z = ticks
      .slice(0, -1)
      .map((t, i) => segs.find((s) => Math.abs(s.p0 - t) <= 10 && Math.abs(s.p1 - ticks[i + 1]!) <= 10)?.label ?? null);
    return z.some(Boolean) ? z : undefined;
  };

  // Aussenketten: horizontale Wände nahe der Südkante → x-Kette; vertikale nahe Westkante → y-Kette
  if (stil.aussenKetten !== 'keine') {
    const xTicks = new Set<Mm>();
    const yTicks = new Set<Mm>();
    const xSegs: OeffSeg[] = [];
    const ySegs: OeffSeg[] = [];
    for (const w of walls) {
      const horizontal = Math.abs(w.a.y - w.b.y) <= AXIS_TOL;
      const vertical = Math.abs(w.a.x - w.b.x) <= AXIS_TOL;
      if (horizontal && Math.min(w.a.y, w.b.y) <= minY + AXIS_TOL) {
        for (const t of wandTicks(w, 'x')) xTicks.add(t);
        xSegs.push(...wandOeffSegs(w, 'x'));
      }
      if (vertical && Math.min(w.a.x, w.b.x) <= minX + AXIS_TOL) {
        for (const t of wandTicks(w, 'y')) yTicks.add(t);
        ySegs.push(...wandOeffSegs(w, 'y'));
      }
    }
    // 2. Kette: Achsmasse aus dem Stützenraster (nur wenn Achsen existieren)
    const grids = doc.byKind<GridAxis>('grid').filter((g) => g.storeyId === storeyId);
    const achsX = dedupe(
      [...new Set(grids.filter((g) => Math.abs(g.a.x - g.b.x) <= AXIS_TOL).map((g) => Math.round((g.a.x + g.b.x) / 2)))].sort((a, b) => a - b),
    );
    const achsY = dedupe(
      [...new Set(grids.filter((g) => Math.abs(g.a.y - g.b.y) <= AXIS_TOL).map((g) => Math.round((g.a.y + g.b.y) / 2)))].sort((a, b) => a - b),
    );
    // 3. Kette: Rohkonstruktion (opt-in) — Kanten der tragenden Schicht QUER zur Kette
    const rohX: Mm[] = [];
    const rohY: Mm[] = [];
    if (stil.rohKette) {
      for (const w of walls) {
        const asm = doc.get<Assembly>(w.assemblyId);
        if (!asm || asm.kind !== 'assembly') continue;
        const frame = wallFrame(w, asm);
        const n = normal(w.a, w.b);
        const faces: Mm[] = [];
        let cursor = frame.offsetLeft;
        for (const layer of asm.layers) {
          const lo = cursor - layer.thickness;
          if (layer.function === 'tragend') faces.push(cursor, lo);
          cursor = lo;
        }
        if (faces.length === 0) faces.push(frame.offsetLeft, -frame.offsetRight);
        const vertical = Math.abs(w.a.x - w.b.x) <= AXIS_TOL;
        const horizontal = Math.abs(w.a.y - w.b.y) <= AXIS_TOL;
        for (const off of faces) {
          if (vertical) rohX.push(Math.round(w.a.x + n.x * off));
          if (horizontal) rohY.push(Math.round(w.a.y + n.y * off));
        }
      }
    }

    const xs = dedupe([...xTicks].sort((a, b) => a - b));
    const ys = dedupe([...yTicks].sort((a, b) => a - b));
    const beide = stil.aussenKetten === 'beide';
    const kette = (
      axis: 'x' | 'y',
      basis: Mm,
      ticks: Mm[],
      segs: OeffSeg[],
      achsen: Mm[],
      roh: Mm[],
    ) => {
      if (ticks.length < 2) return;
      // Masslinienordnung von der Zeichnung weg: Öffnungen, Achsen, Roh, Gesamt
      let lage = basis - 1200;
      const schritt = 800;
      let zwischenKetten = 0;
      if (beide) {
        const z = zusatzFuer(ticks, segs);
        chains.push({ axis, offset: lage, ticks, role: 'oeffnung', ...(z ? { zusatz: z } : {}) });
        lage -= schritt;
        if (achsen.length >= 2) {
          chains.push({ axis, offset: lage, ticks: achsen, role: 'achse' });
          lage -= schritt;
          zwischenKetten++;
        }
        const rohTicks = dedupe([...new Set(roh)].sort((a, b) => a - b));
        if (rohTicks.length >= 2) {
          chains.push({ axis, offset: lage, ticks: rohTicks, role: 'roh' });
          lage -= schritt;
          zwischenKetten++;
        }
      }
      // Gesamtmass als äusserste Kette — entfällt nur, wenn es die Öffnungs-
      // kette exakt doppeln würde (Endpunkte, keine Zwischenketten)
      if (!beide || ticks.length > 2 || zwischenKetten > 0) {
        chains.push({ axis, offset: lage, ticks: [ticks[0]!, ticks[ticks.length - 1]!], role: 'gesamt' });
      }
    };
    kette('x', minY, xs, xSegs, achsX, rohX);
    kette('y', minX, ys, ySegs, achsY, rohY);
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
const HOCH = '⁰¹²³⁴⁵⁶⁷⁸⁹';

/** Masszahl in cm, mm-Rest hochgestellt: 3615 mm → «361⁵» (SIA 400 B.5.2). */
export function dimensionLabel(a: Mm, b: Mm): string {
  const mm = Math.round(Math.abs(b - a));
  const cm = Math.floor(mm / 10);
  const rest = mm % 10;
  return rest === 0 ? String(cm) : `${cm}${HOCH[rest]!}`;
}

/**
 * Wie `dimensionLabel`, aber in Ganzzahl- und Hochzahl-Teil zerlegt statt als
 * Unicode-String (v0.7.4 P1): Lato/IBM Plex Mono besitzen KEINE Glyphen für
 * die Unicode-Hochzahlen ⁴–⁹ (U+2074–U+2079) — im PDF-Pfad (eingebettete
 * TTF, `svg2pdf`) verschwindet der mm-Rest dadurch lautlos («361⁵» → «361»,
 * s. `apps/kosmo-orbit/public/fonts/pdf/README.md`). `plansvg.ts` baut daraus
 * einen echten hochgestellten `<tspan>` (normale Ziffer, kleiner, angehoben),
 * der mit jeder Schrift funktioniert. `dimensionLabel` selbst bleibt
 * unverändert (andere Aufrufer; ²³ als m²/m³-Hochzahlen sind in den Fonts
 * vorhanden, nur 4–9 fehlen).
 */
export function dimensionLabelParts(a: Mm, b: Mm): { cm: string; rest: string } {
  const mm = Math.round(Math.abs(b - a));
  const cm = Math.floor(mm / 10);
  const rest = mm % 10;
  return { cm: String(cm), rest: rest === 0 ? '' : String(rest) };
}
