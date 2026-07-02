import type { KosmoDoc } from '../model/doc';
import { deriveAll } from './scene';
import { clipEdges, type HlEdge, type HlTriInput } from './hiddenline';

/**
 * Axonometrie (Toolkit 4, vierter Plantyp) — Militärperspektive, wie sie
 * Architekten zeichnen: der Grundriss bleibt unverzerrt (um winkelGrad
 * gedreht), Höhen werden senkrecht nach oben abgetragen (× hoehenFaktor).
 *
 * Bild: u = x·cosα − y·sinα, v = (x·sinα + y·cosα) + z·f.
 * Alle Punkte auf der Projektionsrichtung D = (0, −1, 1/f) (im gedrehten
 * System) landen im selben Bildpunkt; Betrachter-Nähe w = −y' + z/f wächst
 * entlang D — dieselbe Hidden-Line-Rechnung wie im Schnitt (derive/hiddenline).
 */

export interface AxoLine2D {
  a: { u: number; v: number };
  b: { u: number; v: number };
  classes: string[];
}

export interface AxoGraphic {
  lines: AxoLine2D[];
  bounds: { minU: number; maxU: number; minV: number; maxV: number } | null;
}

export interface AxoSpec {
  /** Drehung des Grundrisses in Grad (Standard 30). */
  winkelGrad?: number;
  /** Höhenmassstab (Standard 1 = wahre Höhen). */
  hoehenFaktor?: number;
  /** Verdeckungsrechnung (Standard an). */
  hiddenLine?: boolean;
}

export function deriveAxo(doc: KosmoDoc, spec: AxoSpec = {}): AxoGraphic {
  const alpha = ((spec.winkelGrad ?? 30) * Math.PI) / 180;
  const f = spec.hoehenFaktor ?? 1;
  const cos = Math.cos(alpha);
  const sin = Math.sin(alpha);

  const proj = (x: number, y: number, z: number) => {
    const xr = x * cos - y * sin;
    const yr = x * sin + y * cos;
    return { u: xr, v: yr + z * f, w: -yr + z / f };
  };

  const edges: HlEdge[] = [];
  const tris: HlTriInput[] = [];
  for (const artifact of deriveAll(doc)) {
    const pos = artifact.positions;
    const idx = artifact.indices;
    for (let i = 0; i < idx.length; i += 3) {
      const p = [0, 1, 2].map((k) => {
        const vi = idx[i + k]! * 3;
        return proj(pos[vi]!, pos[vi + 1]!, pos[vi + 2]!);
      });
      tris.push({
        au: p[0]!.u, av: p[0]!.v, aw: p[0]!.w,
        bu: p[1]!.u, bv: p[1]!.v, bw: p[1]!.w,
        cu: p[2]!.u, cv: p[2]!.v, cw: p[2]!.w,
      });
    }
    const e = artifact.edges;
    for (let i = 0; i < e.length; i += 6) {
      const a = proj(e[i]!, e[i + 1]!, e[i + 2]!);
      const b = proj(e[i + 3]!, e[i + 4]!, e[i + 5]!);
      edges.push({ u1: a.u, v1: a.v, w1: a.w, u2: b.u, v2: b.v, w2: b.w });
    }
  }

  // eps klein: koplanare eigene Flächen liegen exakt auf der Kante (w-Diff 0);
  // grössere Epsilon liessen an Berührpunkten Millimeter-Splitter stehen.
  const segments = clipEdges(edges, tris, {
    eps: 0.5,
    minSeg: 10,
    ...(spec.hiddenLine === false ? { maxPairs: -1 } : {}),
  });
  const lines: AxoLine2D[] = segments.map((s) => ({ a: s.a, b: s.b, classes: ['projection'] }));

  let bounds: AxoGraphic['bounds'] = null;
  for (const l of lines) {
    if (!bounds) bounds = { minU: l.a.u, maxU: l.a.u, minV: l.a.v, maxV: l.a.v };
    for (const p of [l.a, l.b]) {
      bounds.minU = Math.min(bounds.minU, p.u);
      bounds.maxU = Math.max(bounds.maxU, p.u);
      bounds.minV = Math.min(bounds.minV, p.v);
      bounds.maxV = Math.max(bounds.maxV, p.v);
    }
  }
  return { lines, bounds };
}
