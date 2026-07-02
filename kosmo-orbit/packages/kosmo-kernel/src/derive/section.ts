import type { KosmoDoc } from '../model/doc';
import { dir, type Pt } from '../model/units';
import { deriveAll } from './scene';

/**
 * Schnitt/Ansicht-Derivation — Mesh-Slicing mit Verdeckungsrechnung.
 *
 * Schnittebene: vertikal durch die Linie a→b. Blickrichtung = linke Normale.
 * Kanal «cut»: Dreieck∩Ebene-Segmente (schwerer Stift).
 * Kanal «projection»: Kanten der Körper vor der Ebene (feiner Stift),
 * gegen die davorliegenden Dreiecke verdeckungsgerechnet (Hidden-Line):
 * jede Kante wird als Intervall parametrisiert und die von näheren Dreiecken
 * abgedeckten Teilintervalle werden abgezogen — übrig bleiben die sichtbaren
 * Teilstücke.
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

/** Kanten müssen mindestens so weit (mm) hinter einer Fläche liegen, um als
 * verdeckt zu gelten — Kanten AUF ihrer eigenen Fläche bleiben sichtbar. */
const EPS_T = 5;
/** Sichtbare Teilstücke unter dieser (s,z)-Länge (mm) werden verworfen. */
const MIN_SEG = 2;
/** Obergrenze Kanten×Dreiecke, darüber fällt V1 auf ungerechnete Kanten zurück. */
const MAX_PAIRS = 40_000_000;

/** Dreieck in Ebenen-Koordinaten, als Verdecker aufbereitet. */
interface OccluderTri {
  // Eckpunkte (s, z, t)
  as: number; az: number; at: number;
  bs: number; bz: number; bt: number;
  cs: number; cz: number; ct: number;
  // (s,z)-Bounding-Box + minimales t (für schnelle Verwerfung)
  minS: number; maxS: number; minZ: number; maxZ: number; minT: number;
  // Orientierungsvorzeichen der (s,z)-Projektion
  orient: number;
  // Ebenen-Gradienten: t(P) = at + (P.s−as)·gs + (P.z−az)·gz
  gs: number; gz: number;
}

/** Intervall [0,1] minus Vereinigung der abgedeckten Intervalle. */
function subtractIntervals(covered: [number, number][]): [number, number][] {
  if (covered.length === 0) return [[0, 1]];
  covered.sort((p, q) => p[0] - q[0]);
  const out: [number, number][] = [];
  let cursor = 0;
  for (const [u0, u1] of covered) {
    if (u0 > cursor) out.push([cursor, u0]);
    cursor = Math.max(cursor, u1);
    if (cursor >= 1) return out;
  }
  if (cursor < 1) out.push([cursor, 1]);
  return out;
}

/** u-Intervall in [0,1], auf dem die lineare Funktion g0 + u·(g1−g0) ≥ 0 ist. */
function positiveInterval(g0: number, g1: number): [number, number] | null {
  if (g0 >= 0 && g1 >= 0) return [0, 1];
  if (g0 < 0 && g1 < 0) return null;
  const cross = g0 / (g0 - g1);
  return g0 < 0 ? [cross, 1] : [0, cross];
}

export function deriveSection(doc: KosmoDoc, spec: SectionSpec): SectionGraphic {
  const d = dir(spec.a, spec.b);
  const n = spec.lookLeft ? { x: -d.y, y: d.x } : { x: d.y, y: -d.x };
  const cuts: SectionLine2D[] = [];
  const projections: SectionLine2D[] = [];

  // Ebenen-Koordinaten: s = (p−a)·d, t = (p−a)·n (t>0 = vor der Kamera/hinter der Ebene)
  const toS = (x: number, y: number) => (x - spec.a.x) * d.x + (y - spec.a.y) * d.y;
  const toT = (x: number, y: number) => (x - spec.a.x) * n.x + (y - spec.a.y) * n.y;

  // Rohkanten (mit t für die Verdeckungsrechnung) + Verdecker-Dreiecke sammeln
  const rawEdges: { s1: number; z1: number; t1: number; s2: number; z2: number; t2: number }[] = [];
  const tris: OccluderTri[] = [];

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
      // Verdecker: Dreiecke, die (teilweise) vor der Ebene liegen
      const [pa, pb, pc] = [pts[0]!, pts[1]!, pts[2]!];
      if (pa.t > 0 || pb.t > 0 || pc.t > 0) {
        const det = (pb.s - pa.s) * (pc.z - pa.z) - (pc.s - pa.s) * (pb.z - pa.z);
        if (Math.abs(det) > 1) {
          // Ebenen-Gradienten aus den beiden Kantenvektoren lösen
          const ds1 = pb.s - pa.s, dz1 = pb.z - pa.z, dt1 = pb.t - pa.t;
          const ds2 = pc.s - pa.s, dz2 = pc.z - pa.z, dt2 = pc.t - pa.t;
          tris.push({
            as: pa.s, az: pa.z, at: pa.t,
            bs: pb.s, bz: pb.z, bt: pb.t,
            cs: pc.s, cz: pc.z, ct: pc.t,
            minS: Math.min(pa.s, pb.s, pc.s), maxS: Math.max(pa.s, pb.s, pc.s),
            minZ: Math.min(pa.z, pb.z, pc.z), maxZ: Math.max(pa.z, pb.z, pc.z),
            minT: Math.min(pa.t, pb.t, pc.t),
            orient: det > 0 ? 1 : -1,
            gs: (dt1 * dz2 - dt2 * dz1) / det,
            gz: (ds1 * dt2 - ds2 * dt1) / det,
          });
        }
      }
    }
    // Projektion: Kanten vollständig im Tiefenbereich (0 < t ≤ depth)
    const e = artifact.edges;
    for (let i = 0; i < e.length; i += 6) {
      const t1 = toT(e[i]!, e[i + 1]!);
      const t2 = toT(e[i + 3]!, e[i + 4]!);
      if (t1 > 0 && t2 > 0 && t1 <= spec.depth && t2 <= spec.depth) {
        rawEdges.push({
          s1: toS(e[i]!, e[i + 1]!), z1: e[i + 2]!, t1,
          s2: toS(e[i + 3]!, e[i + 4]!), z2: e[i + 5]!, t2,
        });
      }
    }
  }

  const hiddenLine =
    (spec.hiddenLine ?? true) && rawEdges.length * tris.length <= MAX_PAIRS;

  for (const edge of rawEdges) {
    if (!hiddenLine) {
      projections.push({
        a: { s: edge.s1, z: edge.z1 },
        b: { s: edge.s2, z: edge.z2 },
        classes: ['projection'],
      });
      continue;
    }
    const eMinS = Math.min(edge.s1, edge.s2);
    const eMaxS = Math.max(edge.s1, edge.s2);
    const eMinZ = Math.min(edge.z1, edge.z2);
    const eMaxZ = Math.max(edge.z1, edge.z2);
    const eMaxT = Math.max(edge.t1, edge.t2);
    const covered: [number, number][] = [];
    for (const tri of tris) {
      // Schnelle Verwerfung: kein (s,z)-Überlapp oder Dreieck nie näher
      if (
        tri.minS > eMaxS || tri.maxS < eMinS ||
        tri.minZ > eMaxZ || tri.maxZ < eMinZ ||
        tri.minT >= eMaxT - EPS_T
      ) {
        continue;
      }
      // Alle Bedingungen sind linear in u — Intervalle schneiden:
      // innerhalb der drei Dreieckskanten (orientierte Kreuzprodukte ≥ 0)
      let lo = 0;
      let hi = 1;
      const clip = (g0: number, g1: number): boolean => {
        const iv = positiveInterval(g0, g1);
        if (!iv) return false;
        lo = Math.max(lo, iv[0]);
        hi = Math.min(hi, iv[1]);
        return lo < hi;
      };
      const edgeFn = (
        px: number, pz: number, qx: number, qz: number,
      ): [number, number] => {
        // Kreuzprodukt (q−p)×(E(u)−p), an u=0 und u=1 ausgewertet
        const dx = qx - px;
        const dz = qz - pz;
        return [
          tri.orient * (dx * (edge.z1 - pz) - dz * (edge.s1 - px)),
          tri.orient * (dx * (edge.z2 - pz) - dz * (edge.s2 - px)),
        ];
      };
      let g: [number, number] = edgeFn(tri.as, tri.az, tri.bs, tri.bz);
      if (!clip(g[0], g[1])) continue;
      g = edgeFn(tri.bs, tri.bz, tri.cs, tri.cz);
      if (!clip(g[0], g[1])) continue;
      g = edgeFn(tri.cs, tri.cz, tri.as, tri.az);
      if (!clip(g[0], g[1])) continue;
      // Dreieck-Tiefe an den Kanten-Endpunkten (affine Fortsetzung der Ebene)
      const tTri1 = tri.at + (edge.s1 - tri.as) * tri.gs + (edge.z1 - tri.az) * tri.gz;
      const tTri2 = tri.at + (edge.s2 - tri.as) * tri.gs + (edge.z2 - tri.az) * tri.gz;
      // Verdecker liegt im sichtbaren Halbraum (nicht weggeschnitten) …
      if (!clip(tTri1, tTri2)) continue;
      // … und echt vor der Kante
      if (!clip(edge.t1 - tTri1 - EPS_T, edge.t2 - tTri2 - EPS_T)) continue;
      covered.push([lo, hi]);
    }
    const edgeLen = Math.hypot(edge.s2 - edge.s1, edge.z2 - edge.z1);
    for (const [u0, u1] of subtractIntervals(covered)) {
      if ((u1 - u0) * edgeLen < MIN_SEG) continue;
      projections.push({
        a: { s: edge.s1 + u0 * (edge.s2 - edge.s1), z: edge.z1 + u0 * (edge.z2 - edge.z1) },
        b: { s: edge.s1 + u1 * (edge.s2 - edge.s1), z: edge.z1 + u1 * (edge.z2 - edge.z1) },
        classes: ['projection'],
      });
    }
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
