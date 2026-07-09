import type { KosmoDoc } from '../model/doc';
import type { Column, GridAxis, Stair, Wall } from '../model/entities';
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

/**
 * Element-Fang (v0.6.4 F4, Owner-Befund wörtlich: «beim modellieren eines
 * grundrisses muss die maus auf die anderen wände oder elemente snappen …
 * sichtbarer punkt der beim hovern anzeigt») — pur und testbar wie der
 * Rasterfang oben. Kandidaten aus den GEZEICHNETEN Bauteilen eines Geschosses:
 * Wand-/Treppen-Enden, Wandmitten, Stützen, Polygon-Ecken (Zone/Volumen/Dach/
 * Decke) als Punkte; Wand-/Treppenachsen und Polygon-Kanten als Kanten.
 * Der Typ des Treffers wandert bis ins Overlay (unterschiedliche Marker wie
 * in ArchiCAD: Endpunkt ≠ Mitte ≠ Kante).
 */
export type ElementFangTyp = 'endpunkt' | 'mitte' | 'kante';

export interface ElementFangPunkt {
  p: Pt;
  typ: ElementFangTyp;
  /** Herkunfts-Bauteil — fürs Overlay/Debugging, nicht fürs Fangen selbst. */
  entityId: string;
}

export interface ElementFangKandidaten {
  punkte: ElementFangPunkt[];
  kanten: { a: Pt; b: Pt; entityId: string }[];
}

export function elementFangKandidaten(doc: KosmoDoc, storeyId: string): ElementFangKandidaten {
  const punkte: ElementFangPunkt[] = [];
  const kanten: { a: Pt; b: Pt; entityId: string }[] = [];
  const strecke = (id: string, a: Pt, b: Pt, mitMitte: boolean) => {
    punkte.push({ p: a, typ: 'endpunkt', entityId: id }, { p: b, typ: 'endpunkt', entityId: id });
    if (mitMitte) {
      punkte.push({
        p: { x: Math.round((a.x + b.x) / 2), y: Math.round((a.y + b.y) / 2) },
        typ: 'mitte',
        entityId: id,
      });
    }
    kanten.push({ a, b, entityId: id });
  };
  for (const w of doc.byKind<Wall>('wall')) if (w.storeyId === storeyId) strecke(w.id, w.a, w.b, true);
  for (const s of doc.byKind<Stair>('stair')) if (s.storeyId === storeyId) strecke(s.id, s.a, s.b, false);
  for (const c of doc.byKind<Column>('column')) {
    if (c.storeyId === storeyId) punkte.push({ p: c.at, typ: 'endpunkt', entityId: c.id });
  }
  for (const e of doc.inStorey(storeyId)) {
    if (e.kind === 'zone' || e.kind === 'mass' || e.kind === 'roof' || e.kind === 'slab') {
      const outline = e.outline;
      for (let i = 0; i < outline.length; i++) {
        punkte.push({ p: outline[i]!, typ: 'endpunkt', entityId: e.id });
        kanten.push({ a: outline[i]!, b: outline[(i + 1) % outline.length]!, entityId: e.id });
      }
    }
  }
  return { punkte, kanten };
}

/**
 * Element-Fang: Punkt-Kandidaten (Endpunkt vor Mitte bei gleicher Distanz)
 * gewinnen vor dem Fusspunkt auf einer Kante; ausserhalb des Radius null —
 * dann greifen Stützenraster-Magnet/Fluchtlinien/250er-Raster wie bisher.
 */
export function elementFang(
  p: Pt,
  kandidaten: ElementFangKandidaten,
  radius = 400,
): ElementFangPunkt | null {
  const RANG: Record<ElementFangTyp, number> = { endpunkt: 0, mitte: 1, kante: 2 };
  let best: { d: number; t: ElementFangPunkt } | null = null;
  for (const k of kandidaten.punkte) {
    const d = Math.hypot(k.p.x - p.x, k.p.y - p.y);
    if (d > radius) continue;
    if (!best || d < best.d - 1e-9 || (Math.abs(d - best.d) <= 1e-9 && RANG[k.typ] < RANG[best.t.typ])) {
      best = { d, t: k };
    }
  }
  if (best) return best.t;
  for (const g of kandidaten.kanten) {
    const f = fusspunkt(p, g);
    const d = Math.hypot(f.x - p.x, f.y - p.y);
    if (d <= radius && (!best || d < best.d)) {
      best = { d, t: { p: f, typ: 'kante', entityId: g.entityId } };
    }
  }
  return best?.t ?? null;
}
