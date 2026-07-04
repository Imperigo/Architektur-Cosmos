import { columnOutline, type Assembly, type Beam, type Column, type MassBody, type Roof, type Slab, type Stair, type Storey, type Wall } from '../model/entities';
import type { KosmoDoc } from '../model/doc';
import { dist, type Pt } from '../model/units';
import { openingRects, wallFrame, axisDirection } from '../geometry/wall';
import { treppenTeile } from './treppe';
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
  else if (e.kind === 'column') artifact = deriveColumn(doc, e);
  else if (e.kind === 'beam') artifact = deriveBeam(doc, e);

  if (artifact) cache.set(id, { revision: doc.revision, artifact });
  return artifact;
}

export function deriveAll(doc: KosmoDoc): GeometryArtifact[] {
  const out: GeometryArtifact[] = [];
  for (const e of doc.entities.values()) {
    if (e.kind === 'wall' || e.kind === 'slab' || e.kind === 'mass' || e.kind === 'roof' || e.kind === 'stair' || e.kind === 'column' || e.kind === 'beam') {
      const a = deriveEntity(doc, e.id);
      if (a) out.push(a);
    }
  }
  out.push(...deriveKnotenstuecke(doc));
  return out;
}

/**
 * Knotenstücke: an Mehrfachknoten (3+ Wandenden) ziehen sich die Wände auf
 * ihre Fugenecken zurück (miterWallEnds) — das Eckenpolygon dazwischen wird
 * hier als eigener Körper gefüllt: kein Loch, kein Überlappen, saubere
 * Kanten in Plan, Schnitt und Axo (gleiche Ableitung überall).
 */
function deriveKnotenstuecke(doc: KosmoDoc): GeometryArtifact[] {
  const out: GeometryArtifact[] = [];
  const gesehen = new Set<string>();
  for (const w of doc.byKind<Wall>('wall')) {
    for (const P of [w.a, w.b]) {
      const key = `${w.storeyId}:${Math.round(P.x)}:${Math.round(P.y)}`;
      if (gesehen.has(key)) continue;
      gesehen.add(key);
      const glieder = knotenGlieder(doc, w.storeyId, P);
      if (glieder.length < 3) continue;
      const ecken = knotenEcken(glieder, P);
      if (!ecken || ecken.ecken.length < 3) continue;
      // Höhe: gemeinsamer Bereich aller beteiligten Wände
      let zBase = -Infinity;
      let zTop = Infinity;
      let material = 'beton';
      for (const g of glieder) {
        const storey = doc.get<Storey>(g.wall.storeyId);
        const asm = doc.get<Assembly>(g.wall.assemblyId);
        if (!storey || storey.kind !== 'storey' || !asm || asm.kind !== 'assembly') continue;
        const h = wallHeights(doc, g.wall, storey);
        zBase = Math.max(zBase, h.zBase);
        zTop = Math.min(zTop, h.zTop);
        const core = asm.layers.find((l) => l.function === 'tragend') ?? asm.layers[0];
        if (core) material = core.material;
      }
      if (!Number.isFinite(zBase) || zTop <= zBase) continue;
      // Polygon CCW ausrichten (extrudePolygon erwartet positive Fläche)
      let flaeche = 0;
      const e = ecken.ecken;
      for (let i = 0; i < e.length; i++) {
        const a = e[i]!;
        const b = e[(i + 1) % e.length]!;
        flaeche += a.x * b.y - b.x * a.y;
      }
      const poly = flaeche >= 0 ? e : [...e].reverse();
      const art = extrudePolygon(`knoten:${key}`, material, poly, [], zBase, zTop);
      if (art) out.push(art);
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
  const artifact = extrudeWallWithOpenings(
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
  if (artifact) miterWallEnds(artifact, doc, wall, length);
  return artifact;
}

/** Wandende an einem Knoten: Richtung in den Körper + Fugenabstände beidseits. */
interface KnotenGlied {
  wall: Wall;
  endIdx: 0 | 1;
  /** Richtung vom Knoten in den Wandkörper (Einheitsvektor). */
  v: { x: number; y: number };
  /** Fugenabstand der Fläche links von v (CCW-Seite). */
  ccwDist: number;
  /** Fugenabstand der Fläche rechts von v (CW-Seite). */
  cwDist: number;
}

function knotenGlieder(doc: KosmoDoc, storeyId: string, P: Pt): KnotenGlied[] {
  const out: KnotenGlied[] = [];
  for (const w of doc.byKind<Wall>('wall')) {
    if (w.storeyId !== storeyId) continue;
    const asm = doc.get<Assembly>(w.assemblyId);
    if (!asm || asm.kind !== 'assembly') continue;
    const d = axisDirection(w);
    const { offsetLeft, offsetRight } = wallFrame(w, asm);
    for (const endIdx of [0, 1] as const) {
      const Q = endIdx === 0 ? w.a : w.b;
      if (Math.abs(Q.x - P.x) > 1 || Math.abs(Q.y - P.y) > 1) continue;
      const v = endIdx === 0 ? d : { x: -d.x, y: -d.y };
      // left(v): Ende a → n, Ende b → −n ⇒ CCW-Abstand wechselt die Seite
      out.push({
        wall: w,
        endIdx,
        v,
        ccwDist: endIdx === 0 ? offsetLeft : offsetRight,
        cwDist: endIdx === 0 ? offsetRight : offsetLeft,
      });
    }
  }
  return out;
}

/**
 * Ecken eines Mehrfachknotens: Glieder CCW sortieren; zwischen Nachbar i
 * (seine CCW-Fläche) und i+1 (seine CW-Fläche) liegt genau eine Ecke —
 * der Schnittpunkt der beiden Fugenlinien. sI/uI sind die Achsabstände
 * der Ecke vom Knoten (für Rückzug und Kappung).
 */
function knotenEcken(
  glieder: KnotenGlied[],
  P: Pt,
): { ecken: Pt[]; s: number[]; u: number[] } | null {
  const KAPPE = 2000;
  const sortiert = [...glieder].sort(
    (a, b) => Math.atan2(a.v.y, a.v.x) - Math.atan2(b.v.y, b.v.x),
  );
  const N = sortiert.length;
  const ecken: Pt[] = [];
  const sArr: number[] = [];
  const uArr: number[] = [];
  for (let i = 0; i < N; i++) {
    const gi = sortiert[i]!;
    const gj = sortiert[(i + 1) % N]!;
    const Li = { x: -gi.v.y, y: gi.v.x };
    const Lj = { x: -gj.v.y, y: gj.v.x };
    // P + s·vi + ccwDist_i·Li  =  P + u·vj − cwDist_j·Lj
    const rx = -gi.ccwDist * Li.x - gj.cwDist * Lj.x;
    const ry = -gi.ccwDist * Li.y - gj.cwDist * Lj.y;
    const det = gj.v.x * gi.v.y - gi.v.x * gj.v.y;
    if (Math.abs(det) < 1e-6) {
      // Gegenläufig kolinear (durchlaufende Wand mit Abzweig): fallen die
      // beiden Fugen zusammen, liegt die Ecke auf dem Fusspunkt (s = u = 0);
      // sonst (verschiedene Dicken) bleibt der Knoten stumpf.
      const diff =
        (-gj.cwDist * Lj.x - gi.ccwDist * Li.x) * Li.x +
        (-gj.cwDist * Lj.y - gi.ccwDist * Li.y) * Li.y;
      if (Math.abs(diff) > 1) return null;
      ecken.push({ x: P.x + gi.ccwDist * Li.x, y: P.y + gi.ccwDist * Li.y });
      sArr.push(0);
      uArr.push(0);
      continue;
    }
    const sI = (rx * -gj.v.y - -gj.v.x * ry) / det;
    const uI = (gi.v.x * ry - rx * gi.v.y) / det;
    if (Math.abs(sI) > KAPPE || Math.abs(uI) > KAPPE) return null;
    ecken.push({
      x: P.x + sI * gi.v.x + gi.ccwDist * Li.x,
      y: P.y + sI * gi.v.y + gi.ccwDist * Li.y,
    });
    sArr.push(sI);
    uArr.push(uI);
  }
  // Glieder-Reihenfolge der Sortierung zurückgeben (Index-Zuordnung via Referenz)
  glieder.length = 0;
  glieder.push(...sortiert);
  return { ecken, s: sArr, u: uArr };
}

/**
 * Wandknoten: Gehrung an Ecken. Treffen sich genau zwei Wandenden in einem
 * Punkt, wird die Stirnfläche auf die Winkelhalbierende geschert — beide
 * Körper teilen dieselbe Fugenebene (kein Überlappen, kein Loch, keine
 * z-kämpfenden Deckflächen). T-Stösse stossen bündig an die nahe Fläche
 * der Zielwand. Mehrfachknoten (3+): jede Wand zieht sich auf ihre beiden
 * Fugenecken zurück; das verbleibende Knotenpolygon füllt deriveAll als
 * eigenes Knotenstück.
 */
function miterWallEnds(artifact: GeometryArtifact, doc: KosmoDoc, wall: Wall, length: number): void {
  const d = axisDirection(wall);
  const n = { x: -d.y, y: d.x };
  // Längsversatz je Ende als affine Funktion des Querabstands: t(o) = A + B·o
  const tA: [number, number] = [0, 0];
  const tB: [number, number] = [0, 0];
  const active: [boolean, boolean] = [false, false];

  const ends: [Pt, Pt] = [wall.a, wall.b];
  for (let endIdx = 0 as 0 | 1; endIdx <= 1; endIdx++) {
    const P = ends[endIdx]!;
    // Nachbarn: Wandenden desselben Geschosses am selben Punkt (±1 mm)
    const outgoing: { x: number; y: number }[] = [];
    for (const other of doc.byKind<Wall>('wall')) {
      if (other.id === wall.id || other.storeyId !== wall.storeyId) continue;
      for (const [Q, R] of [
        [other.a, other.b],
        [other.b, other.a],
      ] as const) {
        if (Math.abs(Q.x - P.x) <= 1 && Math.abs(Q.y - P.y) <= 1) {
          const len = Math.hypot(R.x - Q.x, R.y - Q.y);
          if (len > 0) outgoing.push({ x: (R.x - Q.x) / len, y: (R.y - Q.y) / len });
        }
      }
    }
    if (outgoing.length === 0) {
      // T-Stoss: Ende liegt im Inneren einer fremden Wandachse → bündig
      // an deren nahe Fläche stossen statt hindurchdringen
      const dLoc = endIdx === 1 ? d : { x: -d.x, y: -d.y };
      for (const other of doc.byKind<Wall>('wall')) {
        if (other.id === wall.id || other.storeyId !== wall.storeyId) continue;
        const asm = doc.get<Assembly>(other.assemblyId);
        if (!asm || asm.kind !== 'assembly') continue;
        const ux = other.b.x - other.a.x;
        const uy = other.b.y - other.a.y;
        const ul = Math.hypot(ux, uy);
        if (ul < 1) continue;
        const t = ((P.x - other.a.x) * ux + (P.y - other.a.y) * uy) / (ul * ul);
        if (t < 0.05 || t > 0.95) continue; // Endpunkt-Fälle macht die Gehrung
        const m = { x: -uy / ul, y: ux / ul };
        const a0 = (P.x - other.a.x) * m.x + (P.y - other.a.y) * m.y;
        const { offsetLeft, offsetRight } = wallFrame(other, asm);
        if (a0 > offsetLeft + 1 || a0 < -offsetRight - 1) continue; // liegt nicht im Körper
        const dm = dLoc.x * m.x + dLoc.y * m.y;
        if (Math.abs(dm) < 0.3) continue; // streifender Winkel — stumpf lassen
        const ziel = dm < 0 ? offsetLeft : -offsetRight; // nahe Fläche auf unserer Seite
        const w = (ziel - a0) / dm;
        if (Math.abs(w) > Math.min(length * 0.9, 2000)) continue;
        tA[endIdx] = endIdx === 1 ? w : -w;
        active[endIdx] = true;
        break;
      }
      continue;
    }
    if (outgoing.length > 1) {
      // Mehrfachknoten: Rückzug auf die beiden Fugenecken (affiner Versatz)
      const glieder = knotenGlieder(doc, wall.storeyId, P);
      if (glieder.length < 3) continue;
      const ecken = knotenEcken(glieder, P);
      if (!ecken) continue; // degeneriert — stumpf wie bisher
      const idx = glieder.findIndex((g) => g.wall.id === wall.id && g.endIdx === endIdx);
      if (idx < 0) continue;
      const prev = (idx - 1 + glieder.length) % glieder.length;
      // t entlang dLoc (über den Knoten hinaus positiv): Ecke bei Achsabstand s ⇒ t = −s
      // t entlang dLoc; die Scherung arbeitet entlang +d → Ende a spiegeln
      const f = endIdx === 1 ? 1 : -1;
      const tCcw = f * -ecken.s[idx]!;
      const tCw = f * -ecken.u[prev]!;
      const g = glieder[idx]!;
      // Quer-Offsets der beiden Seiten im Wand-Frame (o entlang n)
      const oCcw = endIdx === 0 ? g.ccwDist : -g.ccwDist;
      const oCw = endIdx === 0 ? -g.cwDist : g.cwDist;
      if (Math.abs(oCcw - oCw) < 1e-6) continue;
      tB[endIdx] = (tCcw - tCw) / (oCcw - oCw);
      tA[endIdx] = tCcw - tB[endIdx]! * oCcw;
      active[endIdx] = true;
      continue;
    }
    if (outgoing.length !== 1) continue;
    const e = outgoing[0]!;
    const dLoc = endIdx === 1 ? d : { x: -d.x, y: -d.y };
    const bis = { x: -dLoc.x + e.x, y: -dLoc.y + e.y };
    const bl = Math.hypot(bis.x, bis.y);
    if (bl < 1e-6) continue; // durchlaufende Wand (180°)
    const bn = (bis.x * n.x + bis.y * n.y) / bl;
    const bd = (bis.x * dLoc.x + bis.y * dLoc.y) / bl;
    if (Math.abs(bn) < 0.2) continue; // fast kolinear — keine Gehrung
    const k = bd / bn;
    if (Math.abs(k) > 3) continue; // spitzer Winkel — Gehrungs-Exzess vermeiden
    tB[endIdx] = endIdx === 1 ? k : -k;
    active[endIdx] = true;
  }
  if (!active[0] && !active[1]) return;

  const shear = (arr: Float32Array) => {
    for (let i = 0; i < arr.length; i += 3) {
      const rx = arr[i]! - wall.a.x;
      const ry = arr[i + 1]! - wall.a.y;
      const s = rx * d.x + ry * d.y;
      const o = rx * n.x + ry * n.y;
      let t = 0;
      if (active[0] && s < 1) t = tB[0] * o + tA[0];
      else if (active[1] && s > length - 1) t = tB[1] * o + tA[1];
      if (t !== 0) {
        arr[i] = arr[i]! + d.x * t;
        arr[i + 1] = arr[i + 1]! + d.y * t;
      }
    }
  };
  shear(artifact.positions);
  shear(artifact.edges);
}

/** Stütze: Profil-Extrusion vom Geschossboden bis OK Geschoss (A3). */
function deriveColumn(doc: KosmoDoc, column: Column): GeometryArtifact | null {
  const storey = doc.get<Storey>(column.storeyId);
  if (!storey || storey.kind !== 'storey') return null;
  return extrudePolygon(
    column.id,
    column.material,
    columnOutline(column), // CCW = positive Fläche
    [],
    storey.elevation,
    storey.elevation + storey.height,
  );
}

/** Unterzug: Balken unter der Decke — Oberkante = OK Geschoss (A3). */
function deriveBeam(doc: KosmoDoc, beam: Beam): GeometryArtifact | null {
  const storey = doc.get<Storey>(beam.storeyId);
  if (!storey || storey.kind !== 'storey') return null;
  const len = dist(beam.a, beam.b);
  if (len < 1) return null;
  const d = { x: (beam.b.x - beam.a.x) / len, y: (beam.b.y - beam.a.y) / len };
  const n = { x: -d.y, y: d.x };
  const h = beam.breite / 2;
  const P = (p: Pt, off: number): Pt => ({ x: p.x + n.x * off, y: p.y + n.y * off });
  const zTop = storey.elevation + storey.height;
  return extrudePolygon(
    beam.id,
    beam.material,
    [P(beam.a, -h), P(beam.b, -h), P(beam.b, h), P(beam.a, h)],
    [],
    zTop - beam.hoehe,
    zTop,
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
    // Traufkante (beide o≈0) und Grat (Traufe→First) als Linien;
    // Firstkanten (beide o>0) kommen aus skel.ridges
    for (let i = 0; i < ring.length; i++) {
      const q1 = ring[i]!;
      const q2 = ring[(i + 1) % ring.length]!;
      const unten1 = q1.o < 1e-6;
      const unten2 = q2.o < 1e-6;
      if (unten1 && unten2) {
        edges.push(q1.x, q1.y, zBase, q2.x, q2.y, zBase);
      } else if (unten1 !== unten2) {
        edges.push(q1.x, q1.y, zBase + q1.o * tan, q2.x, q2.y, zBase + q2.o * tan);
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
  if (Math.hypot(stair.b.x - stair.a.x, stair.b.y - stair.a.y) < 1) return null;
  const teile = treppenTeile(stair, storey.height, storey.elevation);
  const half = stair.width / 2;

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

  // Läufe: Stufenpakete je Lauf (letzte Steigung des letzten Laufs = OK Decke)
  for (const lauf of teile.laeufe) {
    const len = Math.hypot(lauf.b.x - lauf.a.x, lauf.b.y - lauf.a.y);
    if (len < 1) continue;
    const d = { x: (lauf.b.x - lauf.a.x) / len, y: (lauf.b.y - lauf.a.y) / len };
    const n = { x: -d.y, y: d.x };
    const P = (s: number, off: number, z: number): [number, number, number] => [
      lauf.a.x + d.x * s + n.x * off,
      lauf.a.y + d.y * s + n.y * off,
      z,
    ];
    for (let i = 0; i < lauf.steigungen - 1; i++) {
      const s0 = Math.min(i * lauf.going, len);
      const s1 = Math.min((i + 1) * lauf.going, len);
      if (s1 - s0 < 1) continue;
      const zt = lauf.z0 + (i + 1) * lauf.riser;
      const zb = lauf.z0 + i * lauf.riser;
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
  }

  // Podeste: flache Platten (Oberkante auf Zwischenhöhe, 200 mm stark)
  for (const podest of teile.podeste) {
    const o = podest.outline;
    if (o.length < 3) continue;
    const zt = podest.z;
    const zb = podest.z - 200;
    const top = o.map((p) => [p.x, p.y, zt] as const);
    const bot = o.map((p) => [p.x, p.y, zb] as const);
    // Deck- und Bodenfläche als Fächer (Podeste sind konvex)
    for (let i = 1; i + 1 < o.length; i++) {
      const base = pos.length / 3;
      for (const p of [top[0]!, top[i]!, top[i + 1]!]) { pos.push(...p); nor.push(0, 0, 1); }
      idx.push(base, base + 1, base + 2);
      const base2 = pos.length / 3;
      for (const p of [bot[0]!, bot[i + 1]!, bot[i]!]) { pos.push(...p); nor.push(0, 0, -1); }
      idx.push(base2, base2 + 1, base2 + 2);
    }
    for (let i = 0; i < o.length; i++) {
      const j = (i + 1) % o.length;
      const nx = o[j]!.y - o[i]!.y;
      const ny = -(o[j]!.x - o[i]!.x);
      const l = Math.hypot(nx, ny) || 1;
      quad(bot[i]!, bot[j]!, top[j]!, top[i]!, nx / l, ny / l, 0);
      edges.push(...top[i]!, ...top[j]!);
    }
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
