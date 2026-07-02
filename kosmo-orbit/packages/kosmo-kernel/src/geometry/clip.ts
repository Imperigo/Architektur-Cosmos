import {
  Clipper,
  EndType,
  FillRule,
  JoinType,
  type Path64,
  type Paths64,
} from 'clipper2-ts';
import type { Pt } from '../model/units';

/**
 * Dünner Wrapper über Clipper2 (int64-exakt) — alle 2D-Booleschen Operationen
 * und Offsets des Kerns laufen hier durch. Polygone: gegen den Uhrzeigersinn
 * positiv, in mm-Integern.
 */

export type Poly = readonly Pt[];

function toPath(poly: Poly): Path64 {
  return poly.map((p) => ({ x: p.x, y: p.y }));
}

function fromPaths(paths: Paths64): Pt[][] {
  return paths.map((path) => path.map((p) => ({ x: p.x, y: p.y })));
}

export function union(polys: Poly[]): Pt[][] {
  if (polys.length === 0) return [];
  return fromPaths(Clipper.union(polys.map(toPath), FillRule.NonZero));
}

export function difference(subject: Poly[], clip: Poly[]): Pt[][] {
  return fromPaths(
    Clipper.difference(subject.map(toPath), clip.map(toPath), FillRule.NonZero),
  );
}

export function intersect(subject: Poly[], clip: Poly[]): Pt[][] {
  return fromPaths(
    Clipper.intersect(subject.map(toPath), clip.map(toPath), FillRule.NonZero),
  );
}

/** Polygon-Offset (positiv = nach aussen), mit Gehrungs-Ecken wie im Bau üblich. */
export function offsetPolygon(poly: Poly, delta: number): Pt[][] {
  return fromPaths(
    Clipper.inflatePaths([toPath(poly)], delta, JoinType.Miter, EndType.Polygon, 2),
  );
}

/**
 * Offene Polylinie zu Fläche aufdicken (Wandachse → Wandkörper):
 * Breite = 2×delta, gerade Enden (Butt), Gehrung an Knicken.
 */
export function thickenPolyline(line: Poly, halfWidth: number): Pt[][] {
  return fromPaths(
    Clipper.inflatePaths([toPath(line)], halfWidth, JoinType.Miter, EndType.Butt, 2),
  );
}
