import type { Pt } from '@kosmo/kernel';

/**
 * KosmoSketch — Strich-Fitting: Freihandzüge → Wandachsen.
 * Ramer–Douglas–Peucker-Vereinfachung, Winkel-Snap (0/45/90°),
 * Länge aufs Zeichenraster. Vorschläge bleiben gated (Architekt übernimmt).
 */

export interface Stroke {
  /** Punkte in Weltkoordinaten (mm) mit Druck 0..1. */
  points: { x: number; y: number; pressure: number }[];
}

function rdp(pts: Pt[], epsilon: number): Pt[] {
  if (pts.length < 3) return pts;
  const first = pts[0]!;
  const last = pts[pts.length - 1]!;
  let maxDist = 0;
  let maxIdx = 0;
  const dx = last.x - first.x;
  const dy = last.y - first.y;
  const len = Math.hypot(dx, dy) || 1;
  for (let i = 1; i < pts.length - 1; i++) {
    const p = pts[i]!;
    const d = Math.abs((p.x - first.x) * dy - (p.y - first.y) * dx) / len;
    if (d > maxDist) {
      maxDist = d;
      maxIdx = i;
    }
  }
  if (maxDist <= epsilon) return [first, last];
  const left = rdp(pts.slice(0, maxIdx + 1), epsilon);
  const right = rdp(pts.slice(maxIdx), epsilon);
  return [...left.slice(0, -1), ...right];
}

/** Winkel auf 45°-Raster snappen, Endpunkt entsprechend rotieren. */
function snapAngle(a: Pt, b: Pt): Pt {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy);
  if (len < 1) return b;
  const angle = Math.atan2(dy, dx);
  const snapped = (Math.round(angle / (Math.PI / 4)) * Math.PI) / 4;
  // nur snappen, wenn nahe genug (±10°) — sonst gewollte freie Richtung
  if (Math.abs(angle - snapped) > (10 * Math.PI) / 180) return b;
  return {
    x: Math.round(a.x + Math.cos(snapped) * len),
    y: Math.round(a.y + Math.sin(snapped) * len),
  };
}

function snapGrid(p: Pt, grid: number): Pt {
  return { x: Math.round(p.x / grid) * grid, y: Math.round(p.y / grid) * grid };
}

export interface FittedSegment {
  a: Pt;
  b: Pt;
}

/**
 * Strich → Wandsegmente. tolerance: wie stark der Zug vereinfacht wird
 * (mm; grosszügig, Handskizzen sind grob). minLength filtert Zitterstriche.
 */
export function fitStroke(
  stroke: Stroke,
  opts: { tolerance?: number; grid?: number; minLength?: number } = {},
): FittedSegment[] {
  const tolerance = opts.tolerance ?? 350;
  const grid = opts.grid ?? 250;
  const minLength = opts.minLength ?? 600;

  const raw: Pt[] = stroke.points.map((p) => ({ x: Math.round(p.x), y: Math.round(p.y) }));
  if (raw.length < 2) return [];
  const simplified = rdp(raw, tolerance);

  const segments: FittedSegment[] = [];
  let cursor = snapGrid(simplified[0]!, grid);
  for (let i = 1; i < simplified.length; i++) {
    let end = snapAngle(cursor, simplified[i]!);
    end = snapGrid(end, grid);
    if (Math.hypot(end.x - cursor.x, end.y - cursor.y) >= minLength) {
      segments.push({ a: cursor, b: end });
      cursor = end;
    }
  }
  // Beinahe-geschlossene Züge schliessen (Skizzen-Rechtecke!)
  if (segments.length >= 2) {
    const first = segments[0]!;
    const last = segments[segments.length - 1]!;
    const gap = Math.hypot(last.b.x - first.a.x, last.b.y - first.a.y);
    if (gap > 0 && gap < 1200) {
      last.b = first.a;
    }
  }
  return segments;
}
