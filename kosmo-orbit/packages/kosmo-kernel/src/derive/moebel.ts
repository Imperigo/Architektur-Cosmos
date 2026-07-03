import type { KosmoDoc } from '../model/doc';
import type { Furniture, Wall } from '../model/entities';
import type { Pt } from '../model/units';

/**
 * Möbel-Katalog (V2-F8): parametrisch gezeichnete Symbole (mm) plus
 * Bewegungsfläche nach SIA 500 (hindernisfreie Bauten) als Richtwerte —
 * die Bewegungsfläche liegt VOR dem Möbel (+y vor Rotation) und darf
 * keine Wand schneiden, sonst meldet der Check.
 */

export interface MoebelTyp {
  key: string;
  name: string;
  /** Korpus b × t (mm). */
  b: number;
  t: number;
  /** Bewegungsfläche vor dem Möbel b × t (mm), SIA-500-Richtwert. */
  bwB: number;
  bwT: number;
}

export const MOEBEL_KATALOG: MoebelTyp[] = [
  { key: 'bett-doppel', name: 'Doppelbett', b: 1800, t: 2000, bwB: 1800, bwT: 1200 },
  { key: 'bett-einzel', name: 'Einzelbett', b: 900, t: 2000, bwB: 900, bwT: 1200 },
  { key: 'kuechenzeile', name: 'Küchenzeile', b: 3000, t: 600, bwB: 3000, bwT: 1200 },
  { key: 'wc', name: 'WC', b: 400, t: 700, bwB: 1400, bwT: 1400 },
  { key: 'lavabo', name: 'Lavabo', b: 600, t: 500, bwB: 1400, bwT: 1400 },
  { key: 'dusche', name: 'Dusche', b: 1200, t: 1200, bwB: 1200, bwT: 1200 },
  { key: 'esstisch', name: 'Esstisch 6P', b: 2000, t: 900, bwB: 2000, bwT: 900 },
  { key: 'schrank', name: 'Schrank', b: 1800, t: 600, bwB: 1800, bwT: 900 },
];

export function moebelTyp(key: string): MoebelTyp | undefined {
  return MOEBEL_KATALOG.find((t) => t.key === key);
}

function rotiere(p: Pt, grad: number): Pt {
  const a = (grad * Math.PI) / 180;
  return { x: p.x * Math.cos(a) - p.y * Math.sin(a), y: p.x * Math.sin(a) + p.y * Math.cos(a) };
}

/** Korpus- und Bewegungsflächen-Polygone eines Möbels in Weltkoordinaten. */
export function moebelGeometrie(f: Furniture): { korpus: Pt[]; bewegung: Pt[] } | null {
  const t = moebelTyp(f.typ);
  if (!t) return null;
  const lokal = (b: number, tiefe: number, y0: number): Pt[] => [
    { x: -b / 2, y: y0 },
    { x: b / 2, y: y0 },
    { x: b / 2, y: y0 + tiefe },
    { x: -b / 2, y: y0 + tiefe },
  ];
  const w = (poly: Pt[]) =>
    poly.map((p) => {
      const r = rotiere(p, f.rotationGrad);
      return { x: Math.round(f.at.x + r.x), y: Math.round(f.at.y + r.y) };
    });
  return {
    korpus: w(lokal(t.b, t.t, 0)),
    bewegung: w(lokal(t.bwB, t.bwT, t.t)),
  };
}

/** Segment-Schnitt für den Kollisions-Check (Bewegungsfläche ↔ Wandachse). */
function schneidet(a: Pt, b: Pt, c: Pt, d: Pt): boolean {
  const kreuz = (o: Pt, p: Pt, q: Pt) => (p.x - o.x) * (q.y - o.y) - (p.y - o.y) * (q.x - o.x);
  const d1 = kreuz(c, d, a);
  const d2 = kreuz(c, d, b);
  const d3 = kreuz(a, b, c);
  const d4 = kreuz(a, b, d);
  return ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0));
}

export interface MoebelBefund {
  furnitureId: string;
  text: string;
}

/** SIA-500-Check: Bewegungsflächen dürfen keine Wandachse schneiden. */
export function pruefeBewegungsflaechen(doc: KosmoDoc, storeyId: string): MoebelBefund[] {
  const befunde: MoebelBefund[] = [];
  const waende = doc.byKind<Wall>('wall').filter((w) => w.storeyId === storeyId);
  for (const f of doc.byKind<Furniture>('furniture')) {
    if (f.storeyId !== storeyId) continue;
    const g = moebelGeometrie(f);
    if (!g) continue;
    const poly = g.bewegung;
    const drin = (p: Pt): boolean => {
      let inside = false;
      for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
        const a = poly[i]!;
        const b = poly[j]!;
        if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) inside = !inside;
      }
      return inside;
    };
    const getroffen = waende.some(
      (w) =>
        poly.some((p, i) => schneidet(p, poly[(i + 1) % poly.length]!, w.a, w.b)) ||
        drin(w.a) || drin(w.b) || drin({ x: (w.a.x + w.b.x) / 2, y: (w.a.y + w.b.y) / 2 }),
    );
    if (getroffen) {
      const t = moebelTyp(f.typ)!;
      befunde.push({
        furnitureId: f.id,
        text: `${t.name}: Bewegungsfläche (${(t.bwB / 1000).toFixed(1)} × ${(t.bwT / 1000).toFixed(1)} m, SIA-500-Richtwert) kollidiert mit einer Wand`,
      });
    }
  }
  return befunde;
}
