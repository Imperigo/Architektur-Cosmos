import type { Assembly, Opening, Wall } from '../model/entities';
import { dir, dist, lerp, normal, pt, type Mm, type Pt } from '../model/units';

/**
 * Wandgeometrie — von der Achse zum Körper.
 * Die Achse a→b liegt je nach Ausrichtung im Zentrum oder an der Kernkante;
 * die Gesamtdicke kommt aus dem Schichtaufbau.
 */

export function assemblyThickness(assembly: Assembly): Mm {
  return assembly.layers.reduce((s, l) => s + l.thickness, 0);
}

export interface WallFrame {
  /** Länge der Achse. */
  length: Mm;
  /** Achsversatz: Distanz Achse → Aussenkante (in Normalenrichtung links von a→b). */
  offsetLeft: Mm;
  offsetRight: Mm;
}

export function wallFrame(wall: Wall, assembly: Assembly): WallFrame {
  const t = assemblyThickness(assembly);
  const length = Math.round(dist(wall.a, wall.b));
  switch (wall.alignment) {
    case 'zentrum':
      return { length, offsetLeft: Math.round(t / 2), offsetRight: t - Math.round(t / 2) };
    case 'kern-aussen':
      // Achse an der Aussenkante (Referenzseite), Körper rechts der Achse
      return { length, offsetLeft: 0, offsetRight: t };
    case 'kern-innen':
      return { length, offsetLeft: t, offsetRight: 0 };
  }
}

/** Grundriss-Umriss der Wand als Rechteck (Junctions löst die Plan-Derivation per Union). */
export function wallOutline(wall: Wall, assembly: Assembly): Pt[] {
  const { offsetLeft, offsetRight } = wallFrame(wall, assembly);
  const n = normal(wall.a, wall.b);
  const l = { x: n.x * offsetLeft, y: n.y * offsetLeft };
  const r = { x: -n.x * offsetRight, y: -n.y * offsetRight };
  return [
    pt(wall.a.x + l.x, wall.a.y + l.y),
    pt(wall.b.x + l.x, wall.b.y + l.y),
    pt(wall.b.x + r.x, wall.b.y + r.y),
    pt(wall.a.x + r.x, wall.a.y + r.y),
  ];
}

/** Schichtgrenzen im Grundriss: pro Schicht ein Rechteck (für SIA-Schraffuren). */
export function wallLayerOutlines(wall: Wall, assembly: Assembly): { material: string; outline: Pt[] }[] {
  const { offsetLeft } = wallFrame(wall, assembly);
  const n = normal(wall.a, wall.b);
  const out: { material: string; outline: Pt[] }[] = [];
  let cursor = offsetLeft;
  for (const layer of assembly.layers) {
    const o1 = cursor;
    const o2 = cursor - layer.thickness;
    const p1 = { x: n.x * o1, y: n.y * o1 };
    const p2 = { x: n.x * o2, y: n.y * o2 };
    out.push({
      material: layer.material,
      outline: [
        pt(wall.a.x + p1.x, wall.a.y + p1.y),
        pt(wall.b.x + p1.x, wall.b.y + p1.y),
        pt(wall.b.x + p2.x, wall.b.y + p2.y),
        pt(wall.a.x + p2.x, wall.a.y + p2.y),
      ],
    });
    cursor = o2;
  }
  return out;
}

export interface OpeningRect {
  opening: Opening;
  /** Anfang/Ende entlang der Achse (s-Koordinate ab Punkt a). */
  s0: Mm;
  s1: Mm;
  /** Unter-/Oberkante relativ OK Boden des Geschosses. */
  z0: Mm;
  z1: Mm;
}

export function openingRects(wall: Wall, openings: readonly Opening[]): OpeningRect[] {
  const length = Math.round(dist(wall.a, wall.b));
  return openings
    .map((o) => ({
      opening: o,
      s0: Math.max(0, o.center - Math.round(o.width / 2)),
      s1: Math.min(length, o.center + Math.round(o.width / 2)),
      z0: o.sill,
      z1: o.sill + o.height,
    }))
    .filter((r) => r.s1 > r.s0);
}

/** Punkt auf der Achse bei s (mm ab a). */
export function pointOnAxis(wall: Wall, s: Mm): Pt {
  const length = dist(wall.a, wall.b);
  if (length === 0) return wall.a;
  return lerp(wall.a, wall.b, s / length);
}

export function axisDirection(wall: Wall): { x: number; y: number } {
  return dir(wall.a, wall.b);
}
