/**
 * Hidden-Line-Kern — gemeinsame Verdeckungsrechnung für Schnitt/Ansicht
 * (vertikale Ebene) und Axonometrie (Parallelprojektion): Kanten werden als
 * Intervall parametrisiert, davorliegende Dreiecke decken Teilintervalle ab
 * (alle Bedingungen linear in u). Koordinaten: (u,v) = Bild, w = Nähe zum
 * Betrachter (grösser = näher).
 */

export interface HlEdge {
  u1: number; v1: number; w1: number;
  u2: number; v2: number; w2: number;
}

export interface HlTriInput {
  au: number; av: number; aw: number;
  bu: number; bv: number; bw: number;
  cu: number; cv: number; cw: number;
}

export interface HlSegment {
  a: { u: number; v: number };
  b: { u: number; v: number };
}

export interface HlOptions {
  /** Kanten müssen mindestens so weit hinter einer Fläche liegen (Einheit = w). */
  eps?: number;
  /** Sichtbare Teilstücke unter dieser (u,v)-Länge werden verworfen. */
  minSeg?: number;
  /** Obergrenze Kanten×Dreiecke — darüber ehrlicher Fallback (keine Rechnung). */
  maxPairs?: number;
  /** Verdecker zählen nur mit w ≤ wClipMax (Schnitt: weggeschnittenes ausblenden). */
  wClipMax?: number;
}

interface Tri extends HlTriInput {
  minU: number; maxU: number; minV: number; maxV: number; maxW: number;
  orient: number;
  gu: number; gv: number;
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

/** u-Intervall in [0,1], auf dem die lineare Funktion g0 + t·(g1−g0) ≥ 0 ist. */
function positiveInterval(g0: number, g1: number): [number, number] | null {
  if (g0 >= 0 && g1 >= 0) return [0, 1];
  if (g0 < 0 && g1 < 0) return null;
  const cross = g0 / (g0 - g1);
  return g0 < 0 ? [cross, 1] : [0, cross];
}

export function prepareTris(tris: HlTriInput[]): Tri[] {
  const out: Tri[] = [];
  for (const t of tris) {
    const det = (t.bu - t.au) * (t.cv - t.av) - (t.cu - t.au) * (t.bv - t.av);
    if (Math.abs(det) <= 1) continue; // in der Projektion degeneriert — verdeckt keine Fläche
    const du1 = t.bu - t.au, dv1 = t.bv - t.av, dw1 = t.bw - t.aw;
    const du2 = t.cu - t.au, dv2 = t.cv - t.av, dw2 = t.cw - t.aw;
    out.push({
      ...t,
      minU: Math.min(t.au, t.bu, t.cu), maxU: Math.max(t.au, t.bu, t.cu),
      minV: Math.min(t.av, t.bv, t.cv), maxV: Math.max(t.av, t.bv, t.cv),
      maxW: Math.max(t.aw, t.bw, t.cw),
      orient: det > 0 ? 1 : -1,
      gu: (dw1 * dv2 - dw2 * dv1) / det,
      gv: (du1 * dw2 - du2 * dw1) / det,
    });
  }
  return out;
}

export function clipEdges(edges: HlEdge[], trisIn: HlTriInput[], opts: HlOptions = {}): HlSegment[] {
  const eps = opts.eps ?? 5;
  const minSeg = opts.minSeg ?? 2;
  const maxPairs = opts.maxPairs ?? 40_000_000;
  const wClipMax = opts.wClipMax;
  const tris = prepareTris(trisIn);
  const rechnen = edges.length * tris.length <= maxPairs;

  const out: HlSegment[] = [];
  for (const edge of edges) {
    if (!rechnen) {
      out.push({ a: { u: edge.u1, v: edge.v1 }, b: { u: edge.u2, v: edge.v2 } });
      continue;
    }
    const eMinU = Math.min(edge.u1, edge.u2);
    const eMaxU = Math.max(edge.u1, edge.u2);
    const eMinV = Math.min(edge.v1, edge.v2);
    const eMaxV = Math.max(edge.v1, edge.v2);
    const eMinW = Math.min(edge.w1, edge.w2);
    const covered: [number, number][] = [];
    for (const tri of tris) {
      // Schnelle Verwerfung: kein (u,v)-Überlapp oder Dreieck nie näher
      if (
        tri.minU > eMaxU || tri.maxU < eMinU ||
        tri.minV > eMaxV || tri.maxV < eMinV ||
        tri.maxW <= eMinW + eps
      ) {
        continue;
      }
      let lo = 0;
      let hi = 1;
      const clip = (g0: number, g1: number): boolean => {
        const iv = positiveInterval(g0, g1);
        if (!iv) return false;
        lo = Math.max(lo, iv[0]);
        hi = Math.min(hi, iv[1]);
        return lo < hi;
      };
      const edgeFn = (pu: number, pv: number, qu: number, qv: number): [number, number] => {
        const du = qu - pu;
        const dv = qv - pv;
        return [
          tri.orient * (du * (edge.v1 - pv) - dv * (edge.u1 - pu)),
          tri.orient * (du * (edge.v2 - pv) - dv * (edge.u2 - pu)),
        ];
      };
      let g: [number, number] = edgeFn(tri.au, tri.av, tri.bu, tri.bv);
      if (!clip(g[0], g[1])) continue;
      g = edgeFn(tri.bu, tri.bv, tri.cu, tri.cv);
      if (!clip(g[0], g[1])) continue;
      g = edgeFn(tri.cu, tri.cv, tri.au, tri.av);
      if (!clip(g[0], g[1])) continue;
      // Dreieck-Tiefe an den Kanten-Endpunkten (affine Fortsetzung der Ebene)
      const wTri1 = tri.aw + (edge.u1 - tri.au) * tri.gu + (edge.v1 - tri.av) * tri.gv;
      const wTri2 = tri.aw + (edge.u2 - tri.au) * tri.gu + (edge.v2 - tri.av) * tri.gv;
      // Verdecker liegt im gültigen Halbraum (Schnitt: nicht weggeschnitten) …
      if (wClipMax !== undefined && !clip(wClipMax - wTri1, wClipMax - wTri2)) continue;
      // … und echt vor der Kante (näher am Betrachter)
      if (!clip(wTri1 - edge.w1 - eps, wTri2 - edge.w2 - eps)) continue;
      covered.push([lo, hi]);
    }
    const edgeLen = Math.hypot(edge.u2 - edge.u1, edge.v2 - edge.v1);
    for (const [t0, t1] of subtractIntervals(covered)) {
      if ((t1 - t0) * edgeLen < minSeg) continue;
      out.push({
        a: { u: edge.u1 + t0 * (edge.u2 - edge.u1), v: edge.v1 + t0 * (edge.v2 - edge.v1) },
        b: { u: edge.u1 + t1 * (edge.u2 - edge.u1), v: edge.v1 + t1 * (edge.v2 - edge.v1) },
      });
    }
  }
  return out;
}
