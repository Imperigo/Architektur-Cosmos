import type { Assembly, Opening, Storey, Wall } from '../model/entities';
import type { KosmoDoc } from '../model/doc';
import { difference, union, type Poly } from '../geometry/clip';
import {
  axisDirection,
  openingRects,
  wallFrame,
  wallLayerOutlines,
  pointOnAxis,
} from '../geometry/wall';
import { dist, type Pt } from '../model/units';

/**
 * Grundriss-Derivation — symbolisch aus der Parametrik (nie aus dem Mesh).
 *
 * Bonsai-Muster: zwei Kanäle (cut/projection) + semantische Klassen, Stile
 * kommen aus dem Stiftsatz (CSS), nicht aus der Geometrie. Join-Criteria:
 * tragende Schichten gleichen Materials werden vereinigt (Poché-Konvention).
 */

export interface PlanRegion {
  /** Ringe: erster = Umriss, weitere = Löcher (SVG evenodd). */
  rings: Pt[][];
  /** Semantische Klassen, z.B. ['cut', 'material-beton', 'tragend']. */
  classes: string[];
}

export interface PlanLine {
  a: Pt;
  b: Pt;
  classes: string[];
}

export interface PlanArc {
  center: Pt;
  radius: number;
  startAngle: number;
  endAngle: number;
  classes: string[];
}

export interface PlanGraphic {
  storeyId: string;
  regions: PlanRegion[];
  lines: PlanLine[];
  arcs: PlanArc[];
  /** Bounding-Box in mm (für viewBox). */
  bounds: { minX: number; minY: number; maxX: number; maxY: number } | null;
}

/** Öffnungs-Ausschnitt im Grundriss: Streifen quer durch die Wanddicke. */
function openingStrip(wall: Wall, assembly: Assembly, s0: number, s1: number): Pt[] {
  const { offsetLeft, offsetRight } = wallFrame(wall, assembly);
  const d = axisDirection(wall);
  const n = { x: -d.y, y: d.x };
  const P = (s: number, off: number): Pt => ({
    x: Math.round(wall.a.x + d.x * s + n.x * off),
    y: Math.round(wall.a.y + d.y * s + n.y * off),
  });
  // minim überlappen, damit die Differenz sauber schneidet
  return [P(s0, offsetLeft + 2), P(s1, offsetLeft + 2), P(s1, -offsetRight - 2), P(s0, -offsetRight - 2)];
}

export function derivePlan(doc: KosmoDoc, storeyId: string): PlanGraphic {
  const storey = doc.get<Storey>(storeyId);
  const regions: PlanRegion[] = [];
  const lines: PlanLine[] = [];
  const arcs: PlanArc[] = [];
  if (!storey || storey.kind !== 'storey') {
    return { storeyId, regions, lines, arcs, bounds: null };
  }

  const walls = doc
    .byKind<Wall>('wall')
    .filter((w) => w.storeyId === storeyId);

  // Schichten sammeln: tragend gruppiert nach Material (Join), Rest pro Wand
  const coreByMaterial = new Map<string, Poly[]>();
  const otherLayers: { material: string; fn: string; polys: Poly[] }[] = [];

  for (const wall of walls) {
    const assembly = doc.get<Assembly>(wall.assemblyId);
    if (!assembly || assembly.kind !== 'assembly') continue;
    const rects = openingRects(wall, doc.openingsOf(wall.id)).filter(
      // Öffnung schneidet den Grundriss nur, wenn die Schnitthöhe sie trifft
      (r) => r.z0 < storey.cutHeight && r.z1 > storey.cutHeight,
    );
    const strips = rects.map((r) => openingStrip(wall, assembly, r.s0, r.s1));

    for (const layer of wallLayerOutlines(wall, assembly)) {
      const meta = assembly.layers.find((l) => l.material === layer.material);
      const cutPolys: Poly[] =
        strips.length > 0 ? difference([layer.outline], strips) : [layer.outline];
      if (meta?.function === 'tragend') {
        const arr = coreByMaterial.get(layer.material) ?? [];
        arr.push(...cutPolys);
        coreByMaterial.set(layer.material, arr);
      } else if (meta) {
        otherLayers.push({ material: layer.material, fn: meta.function, polys: cutPolys });
      }
    }

    // Öffnungs-Symbole
    const assemblyD = wallFrame(wall, assembly);
    const d = axisDirection(wall);
    const n = { x: -d.y, y: d.x };
    for (const r of rects) {
      const o: Opening = r.opening;
      const at = (s: number, off: number): Pt => ({
        x: Math.round(wall.a.x + d.x * s + n.x * off),
        y: Math.round(wall.a.y + d.y * s + n.y * off),
      });
      const L = assemblyD.offsetLeft;
      const R = -assemblyD.offsetRight;
      // Leibungslinien quer zur Wand
      lines.push({ a: at(r.s0, L), b: at(r.s0, R), classes: ['symbol', 'leibung'] });
      lines.push({ a: at(r.s1, L), b: at(r.s1, R), classes: ['symbol', 'leibung'] });
      if (o.openingType === 'fenster') {
        // Fenstersymbol: zwei feine Linien (Glasebene) in Wandmitte
        const mid = (L + R) / 2;
        lines.push({ a: at(r.s0, mid - 25), b: at(r.s1, mid - 25), classes: ['symbol', 'fenster'] });
        lines.push({ a: at(r.s0, mid + 25), b: at(r.s1, mid + 25), classes: ['symbol', 'fenster'] });
      } else {
        // Türsymbol: Flügel senkrecht zur Wand + 90°-Schwenkbogen
        const width = r.s1 - r.s0;
        const hingeS = o.swing === 'rechts' ? r.s1 : r.s0;
        const hingePt = at(hingeS, L);
        const leafEnd: Pt = {
          x: Math.round(hingePt.x + n.x * width),
          y: Math.round(hingePt.y + n.y * width),
        };
        lines.push({ a: hingePt, b: leafEnd, classes: ['symbol', 'tuer'] });
        const normalAngle = Math.atan2(n.y, n.x);
        const towardOpening = o.swing === 'rechts' ? Math.atan2(-d.y, -d.x) : Math.atan2(d.y, d.x);
        arcs.push({
          center: hingePt,
          radius: width,
          startAngle: Math.min(normalAngle, towardOpening),
          endAngle: Math.max(normalAngle, towardOpening),
          classes: ['symbol', 'tuer-bogen'],
        });
      }
    }
  }

  // Join: tragende Schichten gleichen Materials vereinigen
  for (const [material, polys] of coreByMaterial) {
    const merged = union(polys as Poly[]);
    if (merged.length === 0) continue;
    regions.push({
      rings: groupRings(merged),
      classes: ['cut', 'tragend', `material-${material}`],
    });
  }
  for (const layer of otherLayers) {
    if (layer.polys.length === 0) continue;
    regions.push({
      rings: groupRings(layer.polys.map((p) => [...p])),
      classes: ['cut', layer.fn, `material-${layer.material}`],
    });
  }

  // Volumen & Zonen als Projektion (feine Kontur)
  for (const e of doc.inStorey(storeyId)) {
    if (e.kind === 'mass' || e.kind === 'zone') {
      regions.push({
        rings: [e.outline.map((p) => ({ ...p }))],
        classes: ['projection', e.kind === 'mass' ? 'volumen' : 'zone'],
      });
    } else if (e.kind === 'slab') {
      regions.push({
        rings: [e.outline.map((p) => ({ ...p })), ...(e.holes ?? []).map((h) => h.map((p) => ({ ...p })))],
        classes: ['projection', 'decke'],
      });
    }
  }

  return { storeyId, regions, lines, arcs, bounds: computeBounds(regions, lines) };
}

/** Clipper liefert flache Ring-Listen; Löcher haben umgekehrte Orientierung. */
function groupRings(paths: Pt[][]): Pt[][] {
  return paths.map((p) => p.map((q) => ({ ...q })));
}

function computeBounds(regions: PlanRegion[], lines: PlanLine[]) {
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  const eat = (p: Pt) => {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  };
  for (const r of regions) for (const ring of r.rings) for (const p of ring) eat(p);
  for (const l of lines) {
    eat(l.a);
    eat(l.b);
  }
  if (minX === Infinity) return null;
  return { minX, minY, maxX, maxY };
}

/** SVG-Pfaddaten eines Regions-Rings (evenodd, y-Achse gespiegelt: Norden oben). */
export function regionToPath(region: PlanRegion): string {
  return region.rings
    .map(
      (ring) =>
        `M ${ring.map((p) => `${p.x} ${-p.y}`).join(' L ')} Z`,
    )
    .join(' ');
}

/** Wandachsen-Snapping-Punkte des Geschosses (Endpunkte) für Werkzeuge. */
export function snapPoints(doc: KosmoDoc, storeyId: string): Pt[] {
  const pts: Pt[] = [];
  for (const w of doc.byKind<Wall>('wall')) {
    if (w.storeyId !== storeyId) continue;
    pts.push(w.a, w.b);
    // Öffnungsmitten als Snap-Ziele
    for (const o of doc.openingsOf(w.id)) {
      if (dist(w.a, w.b) > 0) pts.push(pointOnAxis(w, o.center));
    }
  }
  return pts;
}
