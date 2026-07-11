import earcut from 'earcut';
import type { Pt } from '../model/units';

/**
 * Mesh-Bausteine — transferable typed arrays, KEIN three.js-Import im Kern.
 * Der Kern läuft im Worker; der Viewport wickelt die Arrays kopierfrei in
 * BufferGeometry.
 */

export interface MeshData {
  positions: Float32Array;
  normals: Float32Array;
  indices: Uint32Array;
}

export interface GeometryArtifact extends MeshData {
  entityId: string;
  /** Kanten für Linien-Overlay (Paare von xyz-Punkten). */
  edges: Float32Array;
  materialKey: string;
}

class MeshBuilder {
  pos: number[] = [];
  nor: number[] = [];
  idx: number[] = [];
  edge: number[] = [];

  vertex(x: number, y: number, z: number, nx: number, ny: number, nz: number): number {
    this.pos.push(x, y, z);
    this.nor.push(nx, ny, nz);
    return this.pos.length / 3 - 1;
  }

  tri(a: number, b: number, c: number): void {
    this.idx.push(a, b, c);
  }

  edgeLine(x1: number, y1: number, z1: number, x2: number, y2: number, z2: number): void {
    this.edge.push(x1, y1, z1, x2, y2, z2);
  }

  build(entityId: string, materialKey: string): GeometryArtifact {
    return {
      entityId,
      materialKey,
      positions: new Float32Array(this.pos),
      normals: new Float32Array(this.nor),
      indices: new Uint32Array(this.idx),
      edges: new Float32Array(this.edge),
    };
  }
}

/**
 * Prisma aus Polygon (mit Löchern) zwischen z0 und z1.
 * Alle Koordinaten in mm; y-Weltachse des Plans wird zur -z-Achse des 3D
 * NICHT hier gemappt — der Kern bleibt in (x, y, zHöhe); das Mapping in die
 * three.js-Konvention (y-up) macht der Viewport.
 */
export function extrudePolygon(
  entityId: string,
  materialKey: string,
  outline: readonly Pt[],
  holes: readonly (readonly Pt[])[],
  z0: number,
  z1: number,
): GeometryArtifact {
  const b = new MeshBuilder();
  // Earcut-Eingabe: flaches Array + Lochindizes
  const flat: number[] = [];
  for (const p of outline) flat.push(p.x, p.y);
  const holeIdx: number[] = [];
  for (const h of holes) {
    holeIdx.push(flat.length / 2);
    for (const p of h) flat.push(p.x, p.y);
  }
  const tris = earcut(flat, holeIdx.length ? holeIdx : undefined, 2);
  const nPts = flat.length / 2;

  // Deckel oben (+z) und unten (−z)
  const topBase = b.pos.length / 3;
  for (let i = 0; i < nPts; i++) b.vertex(flat[i * 2]!, flat[i * 2 + 1]!, z1, 0, 0, 1);
  for (let i = 0; i < tris.length; i += 3) {
    b.tri(topBase + tris[i]!, topBase + tris[i + 1]!, topBase + tris[i + 2]!);
  }
  const botBase = b.pos.length / 3;
  for (let i = 0; i < nPts; i++) b.vertex(flat[i * 2]!, flat[i * 2 + 1]!, z0, 0, 0, -1);
  for (let i = 0; i < tris.length; i += 3) {
    // umgekehrte Windung für die Unterseite
    b.tri(botBase + tris[i]!, botBase + tris[i + 2]!, botBase + tris[i + 1]!);
  }

  // Seitenflächen pro Ring
  const rings: (readonly Pt[])[] = [outline, ...holes];
  for (const ring of rings) {
    for (let i = 0; i < ring.length; i++) {
      const a = ring[i]!;
      const c = ring[(i + 1) % ring.length]!;
      const dx = c.x - a.x;
      const dy = c.y - a.y;
      const len = Math.hypot(dx, dy) || 1;
      const nx = dy / len;
      const ny = -dx / len;
      const v0 = b.vertex(a.x, a.y, z0, nx, ny, 0);
      const v1 = b.vertex(c.x, c.y, z0, nx, ny, 0);
      const v2 = b.vertex(c.x, c.y, z1, nx, ny, 0);
      const v3 = b.vertex(a.x, a.y, z1, nx, ny, 0);
      b.tri(v0, v1, v2);
      b.tri(v0, v2, v3);
      // vertikale Kante + obere/untere Umrisskante
      b.edgeLine(a.x, a.y, z0, a.x, a.y, z1);
      b.edgeLine(a.x, a.y, z1, c.x, c.y, z1);
      b.edgeLine(a.x, a.y, z0, c.x, c.y, z0);
    }
  }
  return b.build(entityId, materialKey);
}

/**
 * Wandkörper mit Öffnungen: Profil in der (s,z)-Wandebene (s entlang der
 * Achse), Öffnungen als Löcher, dann quer zur Dicke extrudiert und in
 * Weltkoordinaten gedreht.
 */
export function extrudeWallWithOpenings(
  entityId: string,
  materialKey: string,
  origin: Pt,
  dirX: { x: number; y: number },
  length: number,
  offsetLeft: number,
  offsetRight: number,
  zBase: number,
  zTop: number,
  openings: readonly { s0: number; s1: number; z0: number; z1: number }[],
): GeometryArtifact {
  const b = new MeshBuilder();
  const nx = -dirX.y; // Normale links der Achse
  const ny = dirX.x;

  // Weltposition aus (s, offset, z)
  const P = (s: number, off: number, z: number): [number, number, number] => [
    origin.x + dirX.x * s + nx * off,
    origin.y + dirX.y * s + ny * off,
    z,
  ];

  // Profil (s,z) mit Öffnungslöchern triangulieren
  const flat: number[] = [0, zBase, length, zBase, length, zTop, 0, zTop];
  const holeIdx: number[] = [];
  const clamped = openings
    .map((o) => ({
      s0: Math.max(1, o.s0),
      s1: Math.min(length - 1, o.s1),
      z0: Math.max(zBase + 1, o.z0),
      z1: Math.min(zTop - 1, o.z1),
    }))
    .filter((o) => o.s1 > o.s0 && o.z1 > o.z0);
  for (const o of clamped) {
    holeIdx.push(flat.length / 2);
    flat.push(o.s0, o.z0, o.s1, o.z0, o.s1, o.z1, o.s0, o.z1);
  }
  const tris = earcut(flat, holeIdx.length ? holeIdx : undefined, 2);
  const nPts = flat.length / 2;

  // Zwei Wandflächen (links off=+offsetLeft, rechts off=−offsetRight).
  // Achtung: die Profil-Ebene (s,z) liegt gespiegelt in der rechten Fläche
  // (Blick von aussen kehrt die s-Achse um) — die earcut-Rohwindung passt
  // daher nur nach Flip zur deklarierten Normalen; ungeflippt zeigt die
  // Dreieckswindung nach innen und die Fläche wird von aussen weggeculled
  // (nur die Innenseite blieb sichtbar — der gemeldete Wand-Bug).
  for (const side of [
    { off: offsetLeft, n: [nx, ny, 0] as const, flip: true },
    { off: -offsetRight, n: [-nx, -ny, 0] as const, flip: false },
  ]) {
    const base = b.pos.length / 3;
    for (let i = 0; i < nPts; i++) {
      const [x, y, z] = P(flat[i * 2]!, side.off, flat[i * 2 + 1]!);
      b.vertex(x, y, z, side.n[0], side.n[1], side.n[2]);
    }
    for (let i = 0; i < tris.length; i += 3) {
      if (side.flip) b.tri(base + tris[i]!, base + tris[i + 2]!, base + tris[i + 1]!);
      else b.tri(base + tris[i]!, base + tris[i + 1]!, base + tris[i + 2]!);
    }
  }

  // Randflächen: Stirnseiten, Ober-/Unterkante, Öffnungsleibungen
  const quad = (
    a: [number, number, number],
    c: [number, number, number],
    d: [number, number, number],
    e: [number, number, number],
    n: [number, number, number],
  ) => {
    const v0 = b.vertex(...a, ...n);
    const v1 = b.vertex(...c, ...n);
    const v2 = b.vertex(...d, ...n);
    const v3 = b.vertex(...e, ...n);
    b.tri(v0, v1, v2);
    b.tri(v0, v2, v3);
  };

  // Unterkante/Oberkante
  quad(P(0, offsetLeft, zBase), P(length, offsetLeft, zBase), P(length, -offsetRight, zBase), P(0, -offsetRight, zBase), [0, 0, -1]);
  quad(P(0, -offsetRight, zTop), P(length, -offsetRight, zTop), P(length, offsetLeft, zTop), P(0, offsetLeft, zTop), [0, 0, 1]);
  // Stirnseiten
  quad(P(0, -offsetRight, zBase), P(0, -offsetRight, zTop), P(0, offsetLeft, zTop), P(0, offsetLeft, zBase), [-dirX.x, -dirX.y, 0]);
  quad(P(length, offsetLeft, zBase), P(length, offsetLeft, zTop), P(length, -offsetRight, zTop), P(length, -offsetRight, zBase), [dirX.x, dirX.y, 0]);
  // Leibungen der Öffnungen
  for (const o of clamped) {
    quad(P(o.s0, offsetLeft, o.z0), P(o.s0, -offsetRight, o.z0), P(o.s1, -offsetRight, o.z0), P(o.s1, offsetLeft, o.z0), [0, 0, 1]); // Sturz unten? nein: Brüstung oben
    quad(P(o.s0, offsetLeft, o.z1), P(o.s1, offsetLeft, o.z1), P(o.s1, -offsetRight, o.z1), P(o.s0, -offsetRight, o.z1), [0, 0, -1]); // Sturz
    // Leibungswindung war invertiert (gleicher Ursache wie oben) — reihenfolge
    // gedreht, damit die Dreiecksnormale zur deklarierten Normalen passt.
    quad(P(o.s0, offsetLeft, o.z0), P(o.s0, -offsetRight, o.z0), P(o.s0, -offsetRight, o.z1), P(o.s0, offsetLeft, o.z1), [-dirX.x, -dirX.y, 0]);
    quad(P(o.s1, -offsetRight, o.z0), P(o.s1, offsetLeft, o.z0), P(o.s1, offsetLeft, o.z1), P(o.s1, -offsetRight, o.z1), [dirX.x, dirX.y, 0]);
    // Öffnungskanten für das Linien-Overlay
    b.edgeLine(...P(o.s0, offsetLeft, o.z0), ...P(o.s1, offsetLeft, o.z0));
    b.edgeLine(...P(o.s1, offsetLeft, o.z0), ...P(o.s1, offsetLeft, o.z1));
    b.edgeLine(...P(o.s1, offsetLeft, o.z1), ...P(o.s0, offsetLeft, o.z1));
    b.edgeLine(...P(o.s0, offsetLeft, o.z1), ...P(o.s0, offsetLeft, o.z0));
  }

  // Aussenkanten
  for (const off of [offsetLeft, -offsetRight]) {
    b.edgeLine(...P(0, off, zBase), ...P(length, off, zBase));
    b.edgeLine(...P(0, off, zTop), ...P(length, off, zTop));
    b.edgeLine(...P(0, off, zBase), ...P(0, off, zTop));
    b.edgeLine(...P(length, off, zBase), ...P(length, off, zTop));
  }

  return b.build(entityId, materialKey);
}

/**
 * Gelände-Band aus einem Terrain-Profil (v0.7.1 E4, docs/V071-KONZEPT.md;
 * Vision A2-Rest, ROADMAP «Terrain-Entities fliessen in Schnitt/Plan, nicht
 * in scene.ts»). `Terrain.punkte` ist eine echte 3D-Polylinie über das
 * Grundstück (x/y frei, kein reines Höhenprofil entlang einer Achse) — die
 * kleinste ehrliche Triangulation ist ein Quad-Streifen: pro Segment wird
 * eine HORIZONTALE Querrichtung (Normale der Segmentrichtung in der
 * xy-Ebene) um `halfWidthMm` nach beiden Seiten aufgespannt. ANNAHME
 * (dokumentiert, kein DGM/swisstopo-Ausbau vorhanden): die Querneigung wird
 * nicht simuliert — der Querschnitt bleibt an jedem Punkt horizontal, nur
 * der Verlauf ENTLANG des Profils folgt den gesetzten Höhen. Jedes Segment
 * bildet ein exaktes Parallelogramm (Quer-Offset ist pro Segment konstant),
 * die Flächennormale ist daher pro Segment eindeutig und wird real aus den
 * Eckpunkten berechnet (kein Fake-«nach oben»).
 */
export function extrudeTerrainBand(
  entityId: string,
  materialKey: string,
  punkte: readonly { x: number; y: number; z: number }[],
  halfWidthMm: number,
): GeometryArtifact {
  const b = new MeshBuilder();
  if (punkte.length < 2) return b.build(entityId, materialKey);

  for (let i = 0; i < punkte.length - 1; i++) {
    const p0 = punkte[i]!;
    const p1 = punkte[i + 1]!;
    const dx = p1.x - p0.x;
    const dy = p1.y - p0.y;
    const dz = p1.z - p0.z;
    const len = Math.hypot(dx, dy) || 1;
    // Horizontale Normale der Segmentrichtung (Querrichtung des Bands).
    const nx = (-dy / len) * halfWidthMm;
    const ny = (dx / len) * halfWidthMm;

    const left0: [number, number, number] = [p0.x + nx, p0.y + ny, p0.z];
    const right0: [number, number, number] = [p0.x - nx, p0.y - ny, p0.z];
    const left1: [number, number, number] = [p1.x + nx, p1.y + ny, p1.z];
    const right1: [number, number, number] = [p1.x - nx, p1.y - ny, p1.z];

    // Echte Flächennormale des (planaren) Parallelogramms: Segmentrichtung
    // × Querrichtung, auf Aufwärts (z ≥ 0) normiert.
    const cx = dy * 0 - dz * ny;
    const cy = dz * nx - dx * 0;
    const cz = dx * ny - dy * nx;
    const clen = Math.hypot(cx, cy, cz) || 1;
    const n: [number, number, number] = [cx / clen, cy / clen, cz / clen];

    const vLeft0 = b.vertex(...left0, ...n);
    const vRight0 = b.vertex(...right0, ...n);
    const vLeft1 = b.vertex(...left1, ...n);
    const vRight1 = b.vertex(...right1, ...n);
    b.tri(vLeft0, vRight0, vRight1);
    b.tri(vLeft0, vRight1, vLeft1);

    b.edgeLine(...left0, ...left1);
    b.edgeLine(...right0, ...right1);
    if (i === 0) b.edgeLine(...left0, ...right0);
    if (i === punkte.length - 2) b.edgeLine(...left1, ...right1);
  }

  return b.build(entityId, materialKey);
}
