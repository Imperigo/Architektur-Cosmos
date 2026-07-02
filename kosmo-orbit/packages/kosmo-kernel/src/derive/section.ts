import type { KosmoDoc } from '../model/doc';
import { dir, type Pt } from '../model/units';
import { deriveAll } from './scene';
import { clipEdges, type HlEdge, type HlTriInput } from './hiddenline';

/**
 * Schnitt/Ansicht-Derivation — Mesh-Slicing mit Verdeckungsrechnung.
 *
 * Schnittebene: vertikal durch die Linie a→b. Blickrichtung = linke Normale.
 * Kanal «cut»: Dreieck∩Ebene-Segmente (schwerer Stift).
 * Kanal «projection»: Kanten der Körper vor der Ebene (feiner Stift),
 * Hidden-Line über den gemeinsamen Kern (derive/hiddenline.ts):
 * Bild = (s, z), Betrachter-Nähe w = −t (t = Abstand hinter der Ebene).
 */

export interface SectionLine2D {
  /** (s, z)-Koordinaten: s entlang der Schnittlinie ab Punkt a, z = Höhe. */
  a: { s: number; z: number };
  b: { s: number; z: number };
  classes: string[];
}

export interface SectionGraphic {
  cuts: SectionLine2D[];
  projections: SectionLine2D[];
  bounds: { minS: number; maxS: number; minZ: number; maxZ: number } | null;
}

export interface SectionSpec {
  a: Pt;
  b: Pt;
  /** Sichttiefe in mm (wie weit hinter der Ebene projiziert wird). */
  depth: number;
  /** Blick zur linken Normalen (true) oder rechten (false). */
  lookLeft: boolean;
  /** Verdeckungsrechnung (Standard an); aus = alle Kanten im Tiefenbereich. */
  hiddenLine?: boolean;
}

export function deriveSection(doc: KosmoDoc, spec: SectionSpec): SectionGraphic {
  const d = dir(spec.a, spec.b);
  const n = spec.lookLeft ? { x: -d.y, y: d.x } : { x: d.y, y: -d.x };
  const cuts: SectionLine2D[] = [];
  const projections: SectionLine2D[] = [];

  // Ebenen-Koordinaten: s = (p−a)·d, t = (p−a)·n (t>0 = vor der Kamera/hinter der Ebene)
  const toS = (x: number, y: number) => (x - spec.a.x) * d.x + (y - spec.a.y) * d.y;
  const toT = (x: number, y: number) => (x - spec.a.x) * n.x + (y - spec.a.y) * n.y;

  const edges: HlEdge[] = [];
  const tris: HlTriInput[] = [];

  for (const artifact of deriveAll(doc)) {
    const pos = artifact.positions;
    const idx = artifact.indices;
    // Cut: Dreiecke gegen t=0 schneiden
    for (let i = 0; i < idx.length; i += 3) {
      const pts: { s: number; t: number; z: number }[] = [];
      for (let k = 0; k < 3; k++) {
        const vi = idx[i + k]! * 3;
        const x = pos[vi]!;
        const y = pos[vi + 1]!;
        const z = pos[vi + 2]!;
        pts.push({ s: toS(x, y), t: toT(x, y), z });
      }
      const hits: { s: number; z: number }[] = [];
      for (let k = 0; k < 3; k++) {
        const p = pts[k]!;
        const q = pts[(k + 1) % 3]!;
        if ((p.t <= 0 && q.t > 0) || (p.t > 0 && q.t <= 0)) {
          const f = p.t / (p.t - q.t);
          hits.push({ s: p.s + (q.s - p.s) * f, z: p.z + (q.z - p.z) * f });
        }
      }
      if (hits.length === 2) {
        cuts.push({ a: hits[0]!, b: hits[1]!, classes: ['cut', artifact.materialKey] });
      }
      // Verdecker: Dreiecke, die (teilweise) vor der Ebene liegen — w = −t
      const [pa, pb, pc] = [pts[0]!, pts[1]!, pts[2]!];
      if (pa.t > 0 || pb.t > 0 || pc.t > 0) {
        tris.push({
          au: pa.s, av: pa.z, aw: -pa.t,
          bu: pb.s, bv: pb.z, bw: -pb.t,
          cu: pc.s, cv: pc.z, cw: -pc.t,
        });
      }
    }
    // Projektion: Kanten vollständig im Tiefenbereich (0 < t ≤ depth)
    const e = artifact.edges;
    for (let i = 0; i < e.length; i += 6) {
      const t1 = toT(e[i]!, e[i + 1]!);
      const t2 = toT(e[i + 3]!, e[i + 4]!);
      if (t1 > 0 && t2 > 0 && t1 <= spec.depth && t2 <= spec.depth) {
        edges.push({
          u1: toS(e[i]!, e[i + 1]!), v1: e[i + 2]!, w1: -t1,
          u2: toS(e[i + 3]!, e[i + 4]!), v2: e[i + 5]!, w2: -t2,
        });
      }
    }
  }

  const segments = clipEdges(edges, tris, {
    // Verdecker nur im sichtbaren Halbraum (w ≤ 0 ⇔ t ≥ 0 — weggeschnittenes zählt nicht)
    wClipMax: 0,
    ...(spec.hiddenLine === false ? { maxPairs: -1 } : {}),
  });
  for (const s of segments) {
    projections.push({
      a: { s: s.a.u, z: s.a.v },
      b: { s: s.b.u, z: s.b.v },
      classes: ['projection'],
    });
  }

  let bounds: SectionGraphic['bounds'] = null;
  for (const l of [...cuts, ...projections]) {
    if (!bounds) {
      bounds = { minS: l.a.s, maxS: l.a.s, minZ: l.a.z, maxZ: l.a.z };
    }
    for (const p of [l.a, l.b]) {
      bounds.minS = Math.min(bounds.minS, p.s);
      bounds.maxS = Math.max(bounds.maxS, p.s);
      bounds.minZ = Math.min(bounds.minZ, p.z);
      bounds.maxZ = Math.max(bounds.maxZ, p.z);
    }
  }
  return { cuts, projections, bounds };
}
