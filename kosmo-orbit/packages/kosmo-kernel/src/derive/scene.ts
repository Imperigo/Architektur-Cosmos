import type { Assembly, MassBody, Slab, Storey, Wall } from '../model/entities';
import type { KosmoDoc } from '../model/doc';
import { dist } from '../model/units';
import { openingRects, wallFrame, axisDirection } from '../geometry/wall';
import { extrudePolygon, extrudeWallWithOpenings, type GeometryArtifact } from './mesh';

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

  if (artifact) cache.set(id, { revision: doc.revision, artifact });
  return artifact;
}

export function deriveAll(doc: KosmoDoc): GeometryArtifact[] {
  const out: GeometryArtifact[] = [];
  for (const e of doc.entities.values()) {
    if (e.kind === 'wall' || e.kind === 'slab' || e.kind === 'mass') {
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
