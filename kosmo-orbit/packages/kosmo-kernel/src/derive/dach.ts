import type { Roof, Storey } from '../model/entities';
import type { Pt } from '../model/units';
import { offsetPolygon } from '../geometry/clip';
import { convexSkeleton } from '../geometry/skeleton';

/**
 * Gemeinsamer Dach-Geometrie-Helfer für Grundriss (plan.ts) und Schnitt
 * (section.ts) — Stream A / v0.6.8 (ROADMAP «Dach im 2D-Plan & Schnitt»).
 *
 * Grundriss und Schnitt leiten ihre 2D-Darstellung aus DENSELBEN
 * Dach-Parametern (Umriss/Neigung/Form/Überstand/Firstrichtung) ab wie die
 * 3D-Ableitung (derive/scene.ts: deriveRoof/deriveSatteldach) — Walm über
 * die Straight-Skeleton-Höhenformel (o·tan Neigung), Sattel über die
 * First-Ebenen-Teilung nach Quer-Koordinate (siehe die ausführliche
 * Herleitung dort). derive/scene.ts bleibt UNVERÄNDERT (dünne
 * Aufsichtsfläche für den 3D-Viewport, kein Volumen); dieser Helfer wendet
 * dieselben Formeln zusätzlich zweifach aus:
 *
 *  1. `dachGeometrie(...).kanten` — dieselben Kanten wie deriveRoof/
 *     deriveSatteldach, hier zusätzlich KLASSIFIZIERT (First/Traufe/
 *     Ortgang/Grat) für die Grundriss-Aufsicht (die 3D-Ableitung kennt nur
 *     eine flache, unklassifizierte edges-Liste — für den 3D-Viewport
 *     reicht das, für die SIA-Linienhierarchie im Plan nicht).
 *  2. `dachGeometrie(...).dreiecke` — dieselbe Flächengeometrie, künstlich
 *     um `DACH_SCHNITT_DICKE_MM` entlang der Flächennormalen verdickt zu
 *     einem wasserdichten Prisma. Ein Roof trägt (anders als eine Wand)
 *     keine Schicht-Assembly mit realer Dicke — die 3D-Ableitung braucht
 *     nur die Aussenhaut. Für eine geschnittene Poché-Fläche im Schnitt
 *     (SIA-symbolisch, wie die ganze derive-Pipeline: „nie aus dem Mesh“)
 *     braucht es aber ein Volumen; die Konstante ist ein dokumentierter,
 *     bewusst gewählter Symbolwert (Sparren+Dämmung+Lattung+Deckung liegen
 *     üblicherweise in dieser Grössenordnung).
 */

export const DACH_SCHNITT_DICKE_MM = 300;

export type DachKantenArt = 'first' | 'traufe' | 'ortgang' | 'grat';

export interface Pt3 {
  x: number;
  y: number;
  z: number;
}

export interface DachKante {
  a: Pt3;
  b: Pt3;
  art: DachKantenArt;
}

/** Dreieck als 3 Eckpunkte (kein Index-Puffer — die Prismen sind klein,
 * Index-Sharing lohnt sich nicht und hält das Slicing simpel). */
export type DachDreieck = readonly [Pt3, Pt3, Pt3];

export interface DachGeometrie {
  /** Aussenring (Traufe inkl. Überstand), flach — für den «Geschoss
   * darunter»-Umriss (gestrichelte Überzeichnung). */
  aussenring: Pt[];
  /** Klassifizierte Kanten für die Dachaufsicht (First/Traufe/Ortgang/Grat). */
  kanten: DachKante[];
  /** Wasserdichte Prismen (je Dachfläche eines), verdickt um
   * DACH_SCHNITT_DICKE_MM entlang der Flächennormalen — für die
   * Schnittflächen-Poché. */
  dreiecke: DachDreieck[];
}

const EPS = 1e-6;

/** Flächennormale aus 3 Punkten, nach oben orientiert (nz ≥ 0) — exakt wie
 * deriveRoof/deriveSatteldach (scene.ts) es für den 3D-Viewport tun. */
function kreuzNormale(a: Pt3, b: Pt3, c: Pt3): Pt3 {
  let nx = (b.y - a.y) * (c.z - a.z) - (b.z - a.z) * (c.y - a.y);
  let ny = (b.z - a.z) * (c.x - a.x) - (b.x - a.x) * (c.z - a.z);
  let nz = (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
  const l = Math.hypot(nx, ny, nz) || 1;
  nx /= l;
  ny /= l;
  nz /= l;
  if (nz < 0) {
    nx = -nx;
    ny = -ny;
    nz = -nz;
  }
  return { x: nx, y: ny, z: nz };
}

/**
 * Verdickt eine planare Dachfläche (Ring + konsistente Normale) zu einem
 * wasserdichten Prisma: Deckel oben (Original), Deckel unten (−Normale ×
 * Dicke), Zargen an jeder Ringkante. Fächer-Triangulation wie scene.ts
 * (Ring monoton/konvex genug — Dachflächen aus convexSkeleton bzw.
 * Sattel-Halbebenen sind das per Konstruktion).
 */
function verdicktesPrisma(ring: Pt3[], normale: Pt3, dicke: number): DachDreieck[] {
  if (ring.length < 3) return [];
  const unten = ring.map((p) => ({
    x: p.x - normale.x * dicke,
    y: p.y - normale.y * dicke,
    z: p.z - normale.z * dicke,
  }));
  const out: DachDreieck[] = [];
  for (let i = 1; i < ring.length - 1; i++) {
    out.push([ring[0]!, ring[i]!, ring[i + 1]!]);
    out.push([unten[0]!, unten[i + 1]!, unten[i]!]);
  }
  for (let i = 0; i < ring.length; i++) {
    const j = (i + 1) % ring.length;
    out.push([ring[i]!, ring[j]!, unten[j]!]);
    out.push([ring[i]!, unten[j]!, unten[i]!]);
  }
  return out;
}

/** Sutherland–Hodgman-Halbebenen-Clip — identisch zu scene.ts (dort nicht
 * exportiert, darum hier dieselbe kleine Funktion). */
function clipHalfPlane(poly: readonly Pt[], f: (p: Pt) => number): Pt[] {
  const n = poly.length;
  const out: Pt[] = [];
  for (let i = 0; i < n; i++) {
    const cur = poly[i]!;
    const next = poly[(i + 1) % n]!;
    const fc = f(cur);
    const fn = f(next);
    if (fc >= 0) out.push(cur);
    if (fc >= 0 !== fn >= 0) {
      const t = fc / (fc - fn);
      out.push({ x: cur.x + (next.x - cur.x) * t, y: cur.y + (next.y - cur.y) * t });
    }
  }
  return out;
}

function satteldach(roof: Roof, eave: Pt[], tan: number, zBase: number): DachGeometrie {
  const achse = roof.firstrichtung ?? 'x';
  const perp = (p: Pt) => (achse === 'x' ? p.y : p.x);
  const along = (p: Pt) => (achse === 'x' ? p.x : p.y);

  let perpMin = Infinity;
  let perpMax = -Infinity;
  for (const p of eave) {
    const v = perp(p);
    if (v < perpMin) perpMin = v;
    if (v > perpMax) perpMax = v;
  }
  const mid = (perpMin + perpMax) / 2;
  const halfSpan = (perpMax - perpMin) / 2;
  const hoehe = (p: Pt) => zBase + tan * (halfSpan - Math.abs(perp(p) - mid));

  const kanten: DachKante[] = [];
  const dreiecke: DachDreieck[] = [];
  let firstGezeichnet = false;

  for (const halb of [clipHalfPlane(eave, (p) => mid - perp(p)), clipHalfPlane(eave, (p) => perp(p) - mid)]) {
    if (halb.length < 3) continue;
    const ring3 = halb.map((p) => ({ x: p.x, y: p.y, z: hoehe(p) }));
    const normale = kreuzNormale(ring3[0]!, ring3[1]!, ring3[ring3.length - 1]!);
    dreiecke.push(...verdicktesPrisma(ring3, normale, DACH_SCHNITT_DICKE_MM));

    for (let i = 0; i < halb.length; i++) {
      const p1 = halb[i]!;
      const p2 = halb[(i + 1) % halb.length]!;
      const amMid1 = Math.abs(perp(p1) - mid) < EPS;
      const amMid2 = Math.abs(perp(p2) - mid) < EPS;
      if (amMid1 && amMid2) continue; // First separat, einmal (unten)
      kanten.push({
        a: { x: p1.x, y: p1.y, z: hoehe(p1) },
        b: { x: p2.x, y: p2.y, z: hoehe(p2) },
        art: amMid1 !== amMid2 ? 'ortgang' : 'traufe',
      });
    }
    if (!firstGezeichnet) {
      const ridgePts = halb.filter((p) => Math.abs(perp(p) - mid) < EPS);
      if (ridgePts.length >= 2) {
        let a = ridgePts[0]!;
        let b = ridgePts[0]!;
        for (const q of ridgePts) {
          if (along(q) < along(a)) a = q;
          if (along(q) > along(b)) b = q;
        }
        if (a !== b) {
          kanten.push({
            a: { x: a.x, y: a.y, z: hoehe(a) },
            b: { x: b.x, y: b.y, z: hoehe(b) },
            art: 'first',
          });
          firstGezeichnet = true;
        }
      }
    }
  }
  return { aussenring: eave, kanten, dreiecke };
}

function walmdach(eave: Pt[], tan: number, zBase: number): DachGeometrie {
  const skel = convexSkeleton(eave);
  const kanten: DachKante[] = [];
  const dreiecke: DachDreieck[] = [];

  for (const face of skel.faces) {
    const ring = face.ring;
    if (ring.length < 3) continue;
    const ring3 = ring.map((q) => ({ x: q.x, y: q.y, z: zBase + q.o * tan }));
    const normale = kreuzNormale(ring3[0]!, ring3[1]!, ring3[ring3.length - 1]!);
    dreiecke.push(...verdicktesPrisma(ring3, normale, DACH_SCHNITT_DICKE_MM));

    for (let i = 0; i < ring.length; i++) {
      const q1 = ring[i]!;
      const q2 = ring[(i + 1) % ring.length]!;
      const unten1 = q1.o < EPS;
      const unten2 = q2.o < EPS;
      if (unten1 && unten2) {
        kanten.push({
          a: { x: q1.x, y: q1.y, z: zBase },
          b: { x: q2.x, y: q2.y, z: zBase },
          art: 'traufe',
        });
      } else if (unten1 !== unten2) {
        kanten.push({
          a: { x: q1.x, y: q1.y, z: zBase + q1.o * tan },
          b: { x: q2.x, y: q2.y, z: zBase + q2.o * tan },
          art: 'grat',
        });
      }
    }
  }
  for (const r of skel.ridges) {
    kanten.push({
      a: { x: r.a.x, y: r.a.y, z: zBase + r.a.o * tan },
      b: { x: r.b.x, y: r.b.y, z: zBase + r.b.o * tan },
      art: 'first',
    });
  }
  return { aussenring: eave, kanten, dreiecke };
}

/**
 * Dachgeometrie (Aussenring, klassifizierte Kanten, Schnitt-Prismen) —
 * `null` bei zu kleinem/fehlendem Umriss (dieselbe Guard-Bedingung wie
 * deriveRoof in scene.ts, damit beide Ableitungen für dasselbe Dach
 * konsistent «nichts» liefern).
 */
export function dachGeometrie(roof: Roof, storey: Storey): DachGeometrie | null {
  if (roof.outline.length < 3) return null;
  const zBase = storey.elevation + roof.baseOffset;
  const tan = Math.tan((roof.pitch * Math.PI) / 180);
  const expanded = roof.overhang > 0 ? offsetPolygon(roof.outline, roof.overhang) : [roof.outline];
  const eave = expanded[0];
  if (!eave || eave.length < 3) return null;
  return roof.form === 'sattel' ? satteldach(roof, eave, tan, zBase) : walmdach(eave, tan, zBase);
}
