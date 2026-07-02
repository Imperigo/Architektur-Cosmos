import type { Pt } from '../model/units';
import { polygonArea } from '../model/units';

/**
 * Straight Skeleton für KONVEXE Polygone — eigene Implementierung
 * (Event-basiertes Schrumpfen; npm-Pakete scheiden aus: CGAL-GPL-Falle).
 *
 * Jede Ecke wandert mit Offset t entlang ihrer inneren Winkelhalbierenden
 * (Geschwindigkeit 1/sin(α/2)); kollabiert eine Kante, verschmelzen ihre
 * Ecken. Für konvexe Polygone treten nur Kanten-Events auf — exakt genug
 * fürs Walmdach (Hip-Flächen + First). z(t) = t·tan(Dachneigung).
 */

interface SkelVertex {
  /** Position bei Stage-Beginn. */
  x: number;
  y: number;
  /** Bisector-Bewegung pro Offset-Einheit. */
  bx: number;
  by: number;
  /** Stabiler Index für Face-Zuordnung über Stages. */
  id: number;
}

export interface SkeletonFace {
  /** Dachfläche als Polygon mit (x, y, offset) — offset · tan(pitch) = Höhe. */
  ring: { x: number; y: number; o: number }[];
}

export interface SkeletonResult {
  faces: SkeletonFace[];
  /** First-/Grat-Kanten (Skelett-Kanten) mit Offsets. */
  ridges: { a: { x: number; y: number; o: number }; b: { x: number; y: number; o: number } }[];
  maxOffset: number;
}

export function isConvex(poly: readonly Pt[]): boolean {
  const n = poly.length;
  if (n < 3) return false;
  let sign = 0;
  for (let i = 0; i < n; i++) {
    const a = poly[i]!;
    const b = poly[(i + 1) % n]!;
    const c = poly[(i + 2) % n]!;
    const cross = (b.x - a.x) * (c.y - b.y) - (b.y - a.y) * (c.x - b.x);
    if (Math.abs(cross) < 1e-6) continue;
    const s = Math.sign(cross);
    if (sign === 0) sign = s;
    else if (s !== sign) return false;
  }
  return true;
}

function buildVertices(poly: { x: number; y: number }[], startId: number): SkelVertex[] {
  const n = poly.length;
  const out: SkelVertex[] = [];
  for (let i = 0; i < n; i++) {
    const prev = poly[(i - 1 + n) % n]!;
    const cur = poly[i]!;
    const next = poly[(i + 1) % n]!;
    // Einheitsnormalen der angrenzenden Kanten (nach innen, CCW-Polygon)
    const e1 = norm(cur.x - prev.x, cur.y - prev.y);
    const e2 = norm(next.x - cur.x, next.y - cur.y);
    const n1 = { x: -e1.y, y: e1.x };
    const n2 = { x: -e2.y, y: e2.x };
    // Bisector: Ecke bleibt auf beiden um t versetzten Kantenlinien
    const sum = { x: n1.x + n2.x, y: n1.y + n2.y };
    const denom = 1 + (n1.x * n2.x + n1.y * n2.y);
    const bx = sum.x / denom;
    const by = sum.y / denom;
    out.push({ x: cur.x, y: cur.y, bx, by, id: startId + i });
  }
  return out;
}

function norm(x: number, y: number): { x: number; y: number } {
  const l = Math.hypot(x, y) || 1;
  return { x: x / l, y: y / l };
}

export function convexSkeleton(outlineIn: readonly Pt[]): SkeletonResult {
  // CCW erzwingen
  let poly = outlineIn.map((p) => ({ x: p.x, y: p.y }));
  if (polygonArea(outlineIn as Pt[]) < 0) poly = poly.reverse();

  const faces: SkeletonFace[] = [];
  const ridges: SkeletonResult['ridges'] = [];
  // Face pro Ursprungskante, identifiziert über (vertexId des Kantenanfangs)
  const faceByEdge = new Map<string, { x: number; y: number; o: number }[][]>();

  let idCounter = 0;
  let verts = buildVertices(poly, idCounter);
  idCounter += verts.length;
  // Kanten-Identität: Kante i gehört zur Ursprungskante — wandert mit
  let edgeKeys = verts.map((_, i) => `e${i}`);
  for (const k of edgeKeys) faceByEdge.set(k, []);

  let offset = 0;
  let guard = 0;

  while (verts.length >= 3 && guard++ < 200) {
    const n = verts.length;
    // Kollapszeit jeder Kante
    let minT = Infinity;
    for (let i = 0; i < n; i++) {
      const a = verts[i]!;
      const b = verts[(i + 1) % n]!;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const len = Math.hypot(dx, dy);
      if (len < 1e-6) continue;
      const ex = dx / len;
      const ey = dy / len;
      // Schrumpfrate der Kantenlänge
      const rate = (a.bx - b.bx) * ex + (a.by - b.by) * ey;
      if (rate > 1e-9) {
        const t = len / rate;
        if (t < minT) minT = t;
      }
    }
    if (!isFinite(minT)) break;

    const nextOffset = offset + minT;

    // Face-Streifen dieser Stage sammeln: pro Kante Quad (a0,b0,b1,a1)
    for (let i = 0; i < n; i++) {
      const a = verts[i]!;
      const b = verts[(i + 1) % n]!;
      const strip = faceByEdge.get(edgeKeys[i]!)!;
      strip.push([
        { x: a.x, y: a.y, o: offset },
        { x: b.x, y: b.y, o: offset },
        { x: b.x + b.bx * minT, y: b.y + b.by * minT, o: nextOffset },
        { x: a.x + a.bx * minT, y: a.y + a.by * minT, o: nextOffset },
      ]);
    }

    // Vorrücken + kollabierte Kanten verschmelzen
    const advanced = verts.map((v) => ({ ...v, x: v.x + v.bx * minT, y: v.y + v.by * minT }));
    const survivors: { x: number; y: number }[] = [];
    const survivorEdgeKeys: string[] = [];
    for (let i = 0; i < n; i++) {
      const a = advanced[i]!;
      const b = advanced[(i + 1) % n]!;
      if (Math.hypot(b.x - a.x, b.y - a.y) < 1e-4 * Math.max(1, minT)) {
        // Kante kollabiert: Grat-Knoten — Kante (und ihr Face) endet hier
        continue;
      }
      survivors.push({ x: a.x, y: a.y });
      survivorEdgeKeys.push(edgeKeys[i]!);
    }
    // Duplikate direkt aufeinanderfolgender Punkte entfernen
    const clean: { x: number; y: number }[] = [];
    const cleanKeys: string[] = [];
    for (let i = 0; i < survivors.length; i++) {
      const p = survivors[i]!;
      const prev = clean[clean.length - 1];
      if (prev && Math.hypot(p.x - prev.x, p.y - prev.y) < 1e-3) continue;
      clean.push(p);
      cleanKeys.push(survivorEdgeKeys[i]!);
    }

    offset = nextOffset;

    if (clean.length < 3) {
      // First: verbleibende Punkte bilden den Grat
      if (clean.length === 2) {
        ridges.push({
          a: { x: clean[0]!.x, y: clean[0]!.y, o: offset },
          b: { x: clean[1]!.x, y: clean[1]!.y, o: offset },
        });
      }
      break;
    }
    verts = buildVertices(clean, idCounter);
    idCounter += verts.length;
    edgeKeys = cleanKeys;
  }

  // Streifen pro Ursprungskante zu einer Dachfläche vereinigen
  for (const strips of faceByEdge.values()) {
    if (strips.length === 0) continue;
    // Fläche = unterer Rand aller Streifen + oberer Rand rückwärts
    const bottomStart = strips[0]![0]!;
    const bottomEnd = strips[0]![1]!;
    const ring: { x: number; y: number; o: number }[] = [bottomStart, bottomEnd];
    for (const s of strips) {
      ring.push(s[2]!);
    }
    for (let i = strips.length - 1; i >= 0; i--) {
      ring.push(strips[i]![3]!);
    }
    // Kollineare/doppelte Punkte grob filtern
    const dedup = ring.filter((p, i) => {
      const q = ring[(i + 1) % ring.length]!;
      return Math.hypot(p.x - q.x, p.y - q.y) > 1e-3 || Math.abs(p.o - q.o) > 1e-3;
    });
    if (dedup.length >= 3) faces.push({ ring: dedup });
  }

  return { faces, ridges, maxOffset: offset };
}
