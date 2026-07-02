import type { Assembly, MassBody, Roof, Slab, Stair, Storey, Wall } from '../model/entities';
import type { KosmoDoc } from '../model/doc';
import { dist } from '../model/units';
import { openingRects, wallFrame, axisDirection } from '../geometry/wall';
import { stairSpec } from '../commands/design';
import { extrudePolygon, extrudeWallWithOpenings, type GeometryArtifact } from './mesh';
import { convexSkeleton } from '../geometry/skeleton';
import { offsetPolygon } from '../geometry/clip';

/**
 * Derive-3D — Entities → GeometryArtifacts (transferable Arrays).
 * V1: vollständige Neuableitung pro Aufruf mit Cache über (revision, id);
 * inkrementelle Dirty-Verfolgung folgt, sobald die Modelle grösser werden.
 */

const cache = new Map<string, { revision: number; artifact: GeometryArtifact }>();

export function deriveEntity(doc: KosmoDoc, id: string): GeometryArtifact | null {
  const hit = cache.get(id);
  if (hit && hit.revision === doc.revision) return hit.artifact;
  const e = doc.get(id);
  if (!e) return null;
  let artifact: GeometryArtifact | null = null;

  if (e.kind === 'wall') artifact = deriveWall(doc, e);
  else if (e.kind === 'slab') artifact = deriveSlab(doc, e);
  else if (e.kind === 'mass') artifact = deriveMass(doc, e);
  else if (e.kind === 'roof') artifact = deriveRoof(doc, e);
  else if (e.kind === 'stair') artifact = deriveStair(doc, e);

  if (artifact) cache.set(id, { revision: doc.revision, artifact });
  return artifact;
}

export function deriveAll(doc: KosmoDoc): GeometryArtifact[] {
  const out: GeometryArtifact[] = [];
  for (const e of doc.entities.values()) {
    if (e.kind === 'wall' || e.kind === 'slab' || e.kind === 'mass' || e.kind === 'roof' || e.kind === 'stair') {
      const a = deriveEntity(doc, e.id);
      if (a) out.push(a);
    }
  }
  return out;
}

function wallHeights(doc: KosmoDoc, wall: Wall, storey: Storey): { zBase: number; zTop: number } {
  const zBase = storey.elevation + wall.baseOffset;
  if (wall.heightMode === 'fix' && wall.height) return { zBase, zTop: zBase + wall.height };
  return { zBase, zTop: storey.elevation + storey.height };
}

function deriveWall(doc: KosmoDoc, wall: Wall): GeometryArtifact | null {
  const storey = doc.get<Storey>(wall.storeyId);
  const assembly = doc.get<Assembly>(wall.assemblyId);
  if (!storey || !assembly || storey.kind !== 'storey' || assembly.kind !== 'assembly') return null;
  const { offsetLeft, offsetRight } = wallFrame(wall, assembly);
  const { zBase, zTop } = wallHeights(doc, wall, storey);
  const length = Math.round(dist(wall.a, wall.b));
  if (length === 0 || zTop <= zBase) return null;
  const rects = openingRects(wall, doc.openingsOf(wall.id)).map((r) => ({
    s0: r.s0,
    s1: r.s1,
    z0: storey.elevation + r.z0,
    z1: storey.elevation + r.z1,
  }));
  const core = assembly.layers.find((l) => l.function === 'tragend') ?? assembly.layers[0];
  return extrudeWallWithOpenings(
    wall.id,
    core?.material ?? 'beton',
    wall.a,
    axisDirection(wall),
    length,
    offsetLeft,
    offsetRight,
    zBase,
    zTop,
    rects,
  );
}

function deriveSlab(doc: KosmoDoc, slab: Slab): GeometryArtifact | null {
  const storey = doc.get<Storey>(slab.storeyId);
  if (!storey || storey.kind !== 'storey' || slab.outline.length < 3) return null;
  const zTop = storey.elevation + slab.topOffset;
  return extrudePolygon(
    slab.id,
    'beton',
    slab.outline,
    slab.holes ?? [],
    zTop - slab.thickness,
    zTop,
  );
}

function deriveMass(doc: KosmoDoc, mass: MassBody): GeometryArtifact | null {
  const storey = doc.get<Storey>(mass.storeyId);
  if (!storey || storey.kind !== 'storey' || mass.outline.length < 3) return null;
  const z0 = storey.elevation + mass.baseOffset;
  return extrudePolygon(mass.id, 'masse', mass.outline, [], z0, z0 + mass.height);
}

function deriveRoof(doc: KosmoDoc, roof: Roof): GeometryArtifact | null {
  const storey = doc.get<Storey>(roof.storeyId);
  if (!storey || storey.kind !== 'storey' || roof.outline.length < 3) return null;
  const zBase = storey.elevation + roof.baseOffset;
  const tan = Math.tan((roof.pitch * Math.PI) / 180);

  // Traufe = Umriss + Überstand
  const expanded = roof.overhang > 0 ? offsetPolygon(roof.outline, roof.overhang) : [roof.outline];
  const eave = expanded[0];
  if (!eave || eave.length < 3) return null;

  const skel = convexSkeleton(eave);
  const pos: number[] = [];
  const nor: number[] = [];
  const idx: number[] = [];
  const edges: number[] = [];

  for (const face of skel.faces) {
    const ring = face.ring;
    if (ring.length < 3) continue;
    // Flächennormale aus den ersten drei Punkten
    const P = (q: { x: number; y: number; o: number }) => [q.x, q.y, zBase + q.o * tan] as const;
    const [ax, ay, az] = P(ring[0]!);
    const [bx, by, bz] = P(ring[1]!);
    const [cx, cy, cz] = P(ring[ring.length - 1]!);
    let nx = (by - ay) * (cz - az) - (bz - az) * (cy - ay);
    let ny = (bz - az) * (cx - ax) - (bx - ax) * (cz - az);
    let nz = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
    const nl = Math.hypot(nx, ny, nz) || 1;
    nx /= nl; ny /= nl; nz /= nl;
    if (nz < 0) { nx = -nx; ny = -ny; nz = -nz; }
    const base = pos.length / 3;
    for (const q of ring) {
      const [x, y, z] = P(q);
      pos.push(x, y, z);
      nor.push(nx, ny, nz);
    }
    // Fächer-Triangulation (Faces sind monoton/konvex genug)
    for (let i = 1; i < ring.length - 1; i++) {
      if (nz >= 0) idx.push(base, base + i, base + i + 1);
      else idx.push(base, base + i + 1, base + i);
    }
    // Traufkante (o≈0) als Linie
    for (let i = 0; i < ring.length; i++) {
      const q1 = ring[i]!;
      const q2 = ring[(i + 1) % ring.length]!;
      if (q1.o < 1e-6 && q2.o < 1e-6) {
        edges.push(q1.x, q1.y, zBase, q2.x, q2.y, zBase);
      }
    }
  }
  for (const r of skel.ridges) {
    edges.push(r.a.x, r.a.y, zBase + r.a.o * tan, r.b.x, r.b.y, zBase + r.b.o * tan);
  }

  return {
    entityId: roof.id,
    materialKey: 'dach',
    positions: new Float32Array(pos),
    normals: new Float32Array(nor),
    indices: new Uint32Array(idx),
    edges: new Float32Array(edges),
  };
}

function deriveStair(doc: KosmoDoc, stair: Stair): GeometryArtifact | null {
  const storey = doc.get<Storey>(stair.storeyId);
  if (!storey || storey.kind !== 'storey') return null;
  const len = Math.hypot(stair.b.x - stair.a.x, stair.b.y - stair.a.y);
  if (len < 1) return null;
  const spec = stairSpec(len, storey.height);
  const d = { x: (stair.b.x - stair.a.x) / len, y: (stair.b.y - stair.a.y) / len };
  const n = { x: -d.y, y: d.x };
  const half = stair.width / 2;
  const z0 = storey.elevation;

  const pos: number[] = [];
  const nor: number[] = [];
  const idx: number[] = [];
  const edges: number[] = [];
  const quad = (
    a: readonly [number, number, number],
    b: readonly [number, number, number],
    c: readonly [number, number, number],
    dd: readonly [number, number, number],
    nx: number, ny: number, nz: number,
  ) => {
    const base = pos.length / 3;
    for (const p of [a, b, c, dd]) { pos.push(...p); nor.push(nx, ny, nz); }
    idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
  };
  const P = (s: number, off: number, z: number): [number, number, number] => [
    stair.a.x + d.x * s + n.x * off,
    stair.a.y + d.y * s + n.y * off,
    z,
  ];

  for (let i = 0; i < spec.steps - 1; i++) {
    const s0 = i * spec.going;
    const s1 = (i + 1) * spec.going;
    const zt = z0 + (i + 1) * spec.riser;
    const zb = z0 + i * spec.riser;
    // Trittfläche
    quad(P(s0, half, zt), P(s1, half, zt), P(s1, -half, zt), P(s0, -half, zt), 0, 0, 1);
    // Setzstufe
    quad(P(s0, -half, zb), P(s0, -half, zt), P(s0, half, zt), P(s0, half, zb), -d.x, -d.y, 0);
    // Wangen (Seiten)
    quad(P(s0, half, zb), P(s0, half, zt), P(s1, half, zt), P(s1, half, zb), n.x, n.y, 0);
    quad(P(s1, -half, zb), P(s1, -half, zt), P(s0, -half, zt), P(s0, -half, zb), -n.x, -n.y, 0);
    // Trittkante
    edges.push(...P(s0, half, zt), ...P(s0, -half, zt));
  }
  return {
    entityId: stair.id,
    materialKey: 'beton',
    positions: new Float32Array(pos),
    normals: new Float32Array(nor),
    indices: new Uint32Array(idx),
    edges: new Float32Array(edges),
  };
}
