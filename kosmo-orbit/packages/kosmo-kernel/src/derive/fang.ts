import type { KosmoDoc } from '../model/doc';
import type { GridAxis } from '../model/entities';
import type { Pt } from '../model/units';

/**
 * Magnetfang auf das Stützenraster (V2-A3) — pur und testbar.
 * Kandidaten aus den Grid-Entities eines Geschosses; der Fang bevorzugt
 * Achskreuzungen vor Achslinien und lässt sonst den Rasterfang der App greifen.
 */

export interface FangKandidaten {
  kreuzungen: Pt[];
  achsen: { a: Pt; b: Pt }[];
}

export function fangKandidaten(doc: KosmoDoc, storeyId: string): FangKandidaten {
  const achsen = doc
    .byKind<GridAxis>('grid')
    .filter((g) => g.storeyId === storeyId)
    .map((g) => ({ a: g.a, b: g.b }));
  const kreuzungen: Pt[] = [];
  for (let i = 0; i < achsen.length; i++) {
    for (let j = i + 1; j < achsen.length; j++) {
      const s = segmentSchnitt(achsen[i]!, achsen[j]!);
      if (s) kreuzungen.push(s);
    }
  }
  return { kreuzungen, achsen };
}

function segmentSchnitt(g: { a: Pt; b: Pt }, h: { a: Pt; b: Pt }): Pt | null {
  const r = { x: g.b.x - g.a.x, y: g.b.y - g.a.y };
  const s = { x: h.b.x - h.a.x, y: h.b.y - h.a.y };
  const det = r.x * s.y - r.y * s.x;
  if (Math.abs(det) < 1e-9) return null;
  const dx = h.a.x - g.a.x;
  const dy = h.a.y - g.a.y;
  const t = (dx * s.y - dy * s.x) / det;
  const u = (dx * r.y - dy * r.x) / det;
  if (t < 0 || t > 1 || u < 0 || u > 1) return null;
  return { x: Math.round(g.a.x + t * r.x), y: Math.round(g.a.y + t * r.y) };
}

/**
 * Magnetfang: Kreuzung gewinnt vor Achslinie (Fusspunkt); ausserhalb des
 * Radius null — dann greift der gewöhnliche Rasterfang der App.
 */
export function magnetFang(p: Pt, kandidaten: FangKandidaten, radius = 400): Pt | null {
  let best: { d: number; p: Pt } | null = null;
  for (const k of kandidaten.kreuzungen) {
    const d = Math.hypot(k.x - p.x, k.y - p.y);
    if (d <= radius && (!best || d < best.d)) best = { d, p: k };
  }
  if (best) return best.p;
  for (const g of kandidaten.achsen) {
    const f = fusspunkt(p, g);
    const d = Math.hypot(f.x - p.x, f.y - p.y);
    if (d <= radius && (!best || d < best.d)) best = { d, p: f };
  }
  return best?.p ?? null;
}

function fusspunkt(p: Pt, g: { a: Pt; b: Pt }): Pt {
  const r = { x: g.b.x - g.a.x, y: g.b.y - g.a.y };
  const len2 = r.x * r.x + r.y * r.y;
  if (len2 === 0) return g.a;
  const t = Math.max(0, Math.min(1, ((p.x - g.a.x) * r.x + (p.y - g.a.y) * r.y) / len2));
  return { x: Math.round(g.a.x + t * r.x), y: Math.round(g.a.y + t * r.y) };
}
