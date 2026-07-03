import type { KosmoDoc } from '../model/doc';
import type { Assembly, LayerFunction, Wall } from '../model/entities';
import { dir, normal, type Pt } from '../model/units';
import { wallFrame } from '../geometry/wall';
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

/** Geschlossene Schnittfläche eines Bauteils (Loops evenodd; Loch = eigener Loop). */
export interface SectionFace {
  loops: { s: number; z: number }[][];
  material: string;
  functionKey?: LayerFunction;
  classes: string[];
}

export interface SectionGraphic {
  cuts: SectionLine2D[];
  projections: SectionLine2D[];
  /** Schnittflächen für Material-Poché (SIA-Schraffuren). */
  faces: SectionFace[];
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
  const faces: SectionFace[] = [];

  for (const artifact of deriveAll(doc)) {
    const pos = artifact.positions;
    const idx = artifact.indices;
    const artSegs: Seg[] = [];
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
        artSegs.push({ a: hits[0]!, b: hits[1]! });
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
    // Schnittflächen: Segmente zu Loops verketten, Wände nach Schichten teilen
    if (artSegs.length) {
      const loops = stitchLoops(artSegs);
      if (loops.length) {
        const wall = doc.get<Wall>(artifact.entityId);
        const assembly = wall?.kind === 'wall' ? doc.get<Assembly>(wall.assemblyId) : undefined;
        if (wall?.kind === 'wall' && assembly?.kind === 'assembly' && assembly.layers.length > 0) {
          faces.push(...wallLayerFaces(wall, assembly, loops, spec.a, d));
        } else {
          faces.push({ loops, material: artifact.materialKey, classes: ['cut-face', artifact.materialKey] });
        }
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
  return { cuts, projections, faces, bounds };
}

// ---------------------------------------------------------------------------
// Schnittflächen — aus den Cut-Segmenten eines Artefakts

interface Seg {
  a: { s: number; z: number };
  b: { s: number; z: number };
}

const STITCH_EPS = 0.5; // mm — Endpunkte auf diesem Raster verschmelzen

function stitchKey(p: { s: number; z: number }): string {
  return `${Math.round(p.s / STITCH_EPS)}:${Math.round(p.z / STITCH_EPS)}`;
}

/**
 * Segmente zu geschlossenen Loops verketten. Wasserdichte Meshes liefern an
 * jeder Schnittkante genau zwei Segment-Enden; offene Reste (degenerierte
 * Dreiecke, tangentiale Berührungen) werden ehrlich verworfen statt geflickt.
 */
function stitchLoops(segs: Seg[]): { s: number; z: number }[][] {
  const brauchbar = segs.filter((s) => Math.hypot(s.a.s - s.b.s, s.a.z - s.b.z) > STITCH_EPS);
  const anEnde = new Map<string, { seg: number; ende: 0 | 1 }[]>();
  for (let i = 0; i < brauchbar.length; i++) {
    for (const ende of [0, 1] as const) {
      const k = stitchKey(ende === 0 ? brauchbar[i]!.a : brauchbar[i]!.b);
      const list = anEnde.get(k) ?? [];
      list.push({ seg: i, ende });
      anEnde.set(k, list);
    }
  }
  const benutzt = new Array<boolean>(brauchbar.length).fill(false);
  const loops: { s: number; z: number }[][] = [];
  for (let start = 0; start < brauchbar.length; start++) {
    if (benutzt[start]) continue;
    benutzt[start] = true;
    const s0 = brauchbar[start]!;
    const loop = [s0.a, s0.b];
    const startKey = stitchKey(s0.a);
    let cursorKey = stitchKey(s0.b);
    let geschlossen = false;
    for (let schritt = 0; schritt < brauchbar.length; schritt++) {
      if (cursorKey === startKey) {
        geschlossen = true;
        break;
      }
      const next = (anEnde.get(cursorKey) ?? []).find((e) => !benutzt[e.seg]);
      if (!next) break;
      benutzt[next.seg] = true;
      const seg = brauchbar[next.seg]!;
      const weiter = next.ende === 0 ? seg.b : seg.a;
      loop.push(weiter);
      cursorKey = stitchKey(weiter);
    }
    if (geschlossen && loop.length >= 4) {
      loop.pop(); // Schlusspunkt = Startpunkt — nicht doppelt führen
      loops.push(loop);
    }
  }
  return loops;
}

/**
 * Wand-Schnittfläche nach Schichten teilen. Schichtgrenzen sind Ebenen
 * parallel zur Wandachse; ihr Schnitt mit der Schnittebene ist im (s,z)-Bild
 * eine SENKRECHTE Linie s = const — die Fläche wird exakt in s-Bänder
 * zerlegt. Der Versatz quer zur Wand ist affin in s: o(s) = o0 + k·s.
 */
function wallLayerFaces(
  wall: Wall,
  assembly: Assembly,
  loops: { s: number; z: number }[][],
  secA: Pt,
  secDir: { x: number; y: number },
): SectionFace[] {
  const nw = normal(wall.a, wall.b);
  const o0 = (secA.x - wall.a.x) * nw.x + (secA.y - wall.a.y) * nw.y;
  const k = secDir.x * nw.x + secDir.y * nw.y;
  const { offsetLeft } = wallFrame(wall, assembly);

  const einFace = (l: typeof loops, layer?: Assembly['layers'][number]): SectionFace => ({
    loops: l,
    material: layer?.material ?? assembly.layers[0]!.material,
    ...(layer ? { functionKey: layer.function } : {}),
    classes: ['cut-face', layer?.material ?? assembly.layers[0]!.material],
  });

  // Schnittlinie (fast) parallel zur Wand: die ganze Fläche liegt in EINER
  // Schicht — der Versatz o ist konstant; die Schicht darüber bestimmen.
  if (Math.abs(k) < 1e-6) {
    let cursor = offsetLeft;
    for (const layer of assembly.layers) {
      const lo = cursor - layer.thickness;
      if (o0 <= cursor + STITCH_EPS && o0 >= lo - STITCH_EPS) return [einFace(loops, layer)];
      cursor = lo;
    }
    return [einFace(loops)];
  }

  const out: SectionFace[] = [];
  let cursor = offsetLeft;
  for (const layer of assembly.layers) {
    const lo = cursor - layer.thickness;
    // o-Band [lo, cursor] → s-Intervall
    const s1 = (cursor - o0) / k;
    const s2 = (lo - o0) / k;
    const sMin = Math.min(s1, s2);
    const sMax = Math.max(s1, s2);
    const geclippt = loops
      .map((loop) => clipLoopSBand(loop, sMin, sMax))
      .filter((l) => l.length >= 3 && Math.abs(loopFlaeche(l)) > STITCH_EPS * STITCH_EPS);
    if (geclippt.length) out.push(einFace(geclippt, layer));
    cursor = lo;
  }
  return out;
}

function loopFlaeche(loop: { s: number; z: number }[]): number {
  let f = 0;
  for (let i = 0; i < loop.length; i++) {
    const a = loop[i]!;
    const b = loop[(i + 1) % loop.length]!;
    f += a.s * b.z - b.s * a.z;
  }
  return f / 2;
}

/** Sutherland–Hodgman gegen das senkrechte Band sMin ≤ s ≤ sMax (konvex ⇒ Loop bleibt Loop). */
function clipLoopSBand(loop: { s: number; z: number }[], sMin: number, sMax: number): { s: number; z: number }[] {
  const halb = (pts: { s: number; z: number }[], innen: (p: { s: number; z: number }) => number) => {
    const out: { s: number; z: number }[] = [];
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i]!;
      const q = pts[(i + 1) % pts.length]!;
      const dp = innen(p);
      const dq = innen(q);
      if (dp >= 0) out.push(p);
      if ((dp < 0) !== (dq < 0)) {
        const f = dp / (dp - dq);
        out.push({ s: p.s + (q.s - p.s) * f, z: p.z + (q.z - p.z) * f });
      }
    }
    return out;
  };
  return halb(halb(loop, (p) => p.s - sMin), (p) => sMax - p.s);
}
