import type { KosmoDoc } from '../model/doc';
import type { ZonenTuer, Opening, Stair, Wall, Zone } from '../model/entities';
import { polygonArea, type Pt } from '../model/units';
import { axisDirection } from '../geometry/wall';

/**
 * Raumgraph (V2-F1, Finch-Essenz) + Fluchtweg (V2-F2).
 *
 * Knoten = Zonen eines Geschosses, Kanten = Türen (Öffnung verbindet die
 * Zonen beidseits der Wand) und offene Übergänge (gemeinsame Umriss-Kante
 * ohne Wand dazwischen). Fluchtweg: kürzester Portal-Pfad einer Zone zum
 * nächsten Treppenhaus; Weglängen sind Luftlinien zwischen Portalen je Zone
 * (ehrliche V1-Näherung der Korridor-Mittelachse — Richtwert, kein Normersatz).
 */

export type RaumTyp =
  | 'zimmer'
  | 'wohnen'
  | 'kueche'
  | 'bad'
  | 'korridor'
  | 'treppenhaus'
  | 'abstellraum'
  | 'balkon'
  | 'technik'
  | 'gewerbe';

export interface RaumKante {
  a: string;
  b: string;
  art: 'tuer' | 'offen';
  /** Verbindungspunkt im Grundriss (Türmitte bzw. Mitte des Übergangs). */
  punkt: Pt;
  openingId?: string;
}

export interface RaumGraph {
  zonen: Zone[];
  kanten: RaumKante[];
  /** zoneId → enthaltene Treppen (Fluchtziele). */
  treppen: Map<string, Stair[]>;
}

function imPolygon(p: Pt, poly: readonly Pt[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i]!;
    const b = poly[j]!;
    if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) {
      inside = !inside;
    }
  }
  return inside;
}

const dist = (a: Pt, b: Pt) => Math.hypot(a.x - b.x, a.y - b.y);

/** Überlappung zweier kollinearer Segmente (Projektion auf die Achse). */
function offeneKante(a1: Pt, a2: Pt, b1: Pt, b2: Pt): Pt | null {
  const d = { x: a2.x - a1.x, y: a2.y - a1.y };
  const len = Math.hypot(d.x, d.y);
  if (len < 1) return null;
  const e = { x: d.x / len, y: d.y / len };
  const n = { x: -e.y, y: e.x };
  // b-Segment muss auf derselben Geraden liegen (Abstand < 60 mm)
  const abst1 = Math.abs((b1.x - a1.x) * n.x + (b1.y - a1.y) * n.y);
  const abst2 = Math.abs((b2.x - a1.x) * n.x + (b2.y - a1.y) * n.y);
  if (abst1 > 60 || abst2 > 60) return null;
  const s1 = (b1.x - a1.x) * e.x + (b1.y - a1.y) * e.y;
  const s2 = (b2.x - a1.x) * e.x + (b2.y - a1.y) * e.y;
  const von = Math.max(0, Math.min(s1, s2));
  const bis = Math.min(len, Math.max(s1, s2));
  if (bis - von < 600) return null; // begehbar erst ab 60 cm
  const mitte = (von + bis) / 2;
  return { x: a1.x + e.x * mitte, y: a1.y + e.y * mitte };
}

/** Liegt entlang des Punkts eine Wand (kollinear, Punkt im Wandbereich)? */
function wandDazwischen(punkt: Pt, waende: Wall[]): boolean {
  for (const w of waende) {
    const d = axisDirection(w);
    const len = dist(w.a, w.b);
    const s = (punkt.x - w.a.x) * d.x + (punkt.y - w.a.y) * d.y;
    if (s < -100 || s > len + 100) continue;
    const quer = Math.abs((punkt.x - w.a.x) * -d.y + (punkt.y - w.a.y) * d.x);
    if (quer < 300) return true;
  }
  return false;
}

export function raumGraph(doc: KosmoDoc, storeyId: string): RaumGraph {
  const zonen = doc.byKind<Zone>('zone').filter((z) => z.storeyId === storeyId);
  const waende = doc.byKind<Wall>('wall').filter((w) => w.storeyId === storeyId);
  const kanten: RaumKante[] = [];

  // Tür-Kanten: Punkt beidseits der Wand → Zonen, die ihn enthalten
  for (const w of waende) {
    const d = axisDirection(w);
    const n = { x: -d.y, y: d.x };
    for (const o of doc.openingsOf(w.id) as Opening[]) {
      if (o.openingType !== 'tuer') continue;
      const mitte = { x: w.a.x + d.x * o.center, y: w.a.y + d.y * o.center };
      const AUS = 400; // halber Wandbereich + Spielraum
      // Räume (mit Raumtyp) haben Vorrang — sonst gewinnt beidseits der
      // Wohnungs-Container und die Kante fällt weg
      const treffer = (p2: { x: number; y: number }) =>
        zonen.find((z) => z.raumTyp && imPolygon(p2, z.outline)) ??
        zonen.find((z) => imPolygon(p2, z.outline));
      const links = treffer({ x: mitte.x + n.x * AUS, y: mitte.y + n.y * AUS });
      const rechts = treffer({ x: mitte.x - n.x * AUS, y: mitte.y - n.y * AUS });
      if (links && rechts && links.id !== rechts.id) {
        kanten.push({ a: links.id, b: rechts.id, art: 'tuer', punkt: mitte, openingId: o.id });
      }
    }
  }

  // Offene Übergänge: gemeinsame Umriss-Kanten ohne Wand dazwischen
  for (let i = 0; i < zonen.length; i++) {
    for (let j = i + 1; j < zonen.length; j++) {
      const A = zonen[i]!.outline;
      const B = zonen[j]!.outline;
      let punkt: Pt | null = null;
      for (let ai = 0; ai < A.length && !punkt; ai++) {
        for (let bi = 0; bi < B.length && !punkt; bi++) {
          punkt = offeneKante(A[ai]!, A[(ai + 1) % A.length]!, B[bi]!, B[(bi + 1) % B.length]!);
        }
      }
      if (punkt && !wandDazwischen(punkt, waende)) {
        kanten.push({ a: zonen[i]!.id, b: zonen[j]!.id, art: 'offen', punkt });
      }
    }
  }

  // Treppen den Zonen zuordnen (Laufmitte im Umriss)
  const treppen = new Map<string, Stair[]>();
  for (const st of doc.byKind<Stair>('stair')) {
    if (st.storeyId !== storeyId) continue;
    const mitte = { x: (st.a.x + st.b.x) / 2, y: (st.a.y + st.b.y) / 2 };
    const zone = zonen.find((z) => imPolygon(mitte, z.outline));
    if (zone) treppen.set(zone.id, [...(treppen.get(zone.id) ?? []), st]);
  }
  // Zonentüren (V2): eine Tür auf der gemeinsamen Kante macht aus «offen»
  // eine ehrliche «tuer»-Verbindung — bzw. stiftet sie, wo keine offene
  // Kante erkannt wurde (Punktprobe beidseits der Tür).
  for (const t of doc.byKind<ZonenTuer>('zonentuer')) {
    if (t.storeyId !== storeyId) continue;
    const treffer = zonen.filter((z) =>
      [{ x: 300, y: 0 }, { x: -300, y: 0 }, { x: 0, y: 300 }, { x: 0, y: -300 }].some((d) =>
        imPolygon({ x: t.at.x + d.x, y: t.at.y + d.y }, z.outline),
      ),
    );
    if (treffer.length < 2) continue;
    const [za, zb] = [treffer[0]!, treffer[1]!];
    const alt2 = kanten.findIndex(
      (k) => (k.a === za.id && k.b === zb.id) || (k.a === zb.id && k.b === za.id),
    );
    if (alt2 >= 0) {
      kanten[alt2] = { a: za.id, b: zb.id, art: 'tuer', punkt: t.at, openingId: t.id };
    } else {
      kanten.push({ a: za.id, b: zb.id, art: 'tuer', punkt: t.at, openingId: t.id });
    }
  }


  return { zonen, kanten, treppen };
}

export interface Fluchtweg {
  zoneId: string;
  /** Weglänge in mm bis zur Treppe/zum Treppenhaus; Infinity = kein Weg. */
  distanz: number;
  /** Portal-Punkte des Wegs (für die Plan-Darstellung). */
  pfad: Pt[];
}

/**
 * Kürzester Weg jeder Zone zum nächsten Fluchtziel (Zone mit Treppe oder
 * Raumtyp «treppenhaus»). Innerhalb einer Zone zählt die Luftlinie zwischen
 * Portalen; Startzuschlag = entfernteste Umriss-Ecke bis zum Startportal.
 */
export function fluchtwege(doc: KosmoDoc, storeyId: string): Fluchtweg[] {
  const graph = raumGraph(doc, storeyId);
  const ziele = new Set(
    graph.zonen
      .filter((z) => graph.treppen.has(z.id) || z.raumTyp === 'treppenhaus')
      .map((z) => z.id),
  );

  // Dijkstra über Portale: Knoten = Kanten des Raumgraphs
  const portale = graph.kanten.map((k, i) => ({ ...k, index: i }));
  const distanz = new Array<number>(portale.length).fill(Infinity);
  const vor = new Array<number>(portale.length).fill(-1);
  const offen: number[] = [];
  for (const p of portale) {
    if (ziele.has(p.a) || ziele.has(p.b)) {
      // Zuschlag: vom Portal zur Treppe innerhalb der Zielzone
      const zielZone = ziele.has(p.a) ? p.a : p.b;
      const treppe = graph.treppen.get(zielZone)?.[0];
      const bis = treppe
        ? dist(p.punkt, { x: (treppe.a.x + treppe.b.x) / 2, y: (treppe.a.y + treppe.b.y) / 2 })
        : 0;
      distanz[p.index] = bis;
      offen.push(p.index);
    }
  }
  while (offen.length > 0) {
    offen.sort((x, y) => distanz[x]! - distanz[y]!);
    const i = offen.shift()!;
    const pi = portale[i]!;
    for (const pj of portale) {
      if (pj.index === i) continue;
      const gemeinsam = [pi.a, pi.b].filter((z) => z === pj.a || z === pj.b);
      if (gemeinsam.length === 0) continue;
      const neu = distanz[i]! + dist(pi.punkt, pj.punkt);
      if (neu < distanz[pj.index]!) {
        distanz[pj.index] = neu;
        vor[pj.index] = i;
        if (!offen.includes(pj.index)) offen.push(pj.index);
      }
    }
  }

  const raus: Fluchtweg[] = [];
  for (const z of graph.zonen) {
    if (ziele.has(z.id)) {
      raus.push({ zoneId: z.id, distanz: 0, pfad: [] });
      continue;
    }
    let beste = Infinity;
    let start = -1;
    for (const p of portale) {
      if (p.a !== z.id && p.b !== z.id) continue;
      // Startzuschlag: entfernteste Ecke der Zone bis zu diesem Portal
      const ecke = Math.max(...z.outline.map((e) => dist(e, p.punkt)));
      const gesamt = ecke + distanz[p.index]!;
      if (gesamt < beste) {
        beste = gesamt;
        start = p.index;
      }
    }
    const pfad: Pt[] = [];
    for (let i = start; i >= 0; i = vor[i]!) pfad.push(portale[i]!.punkt);
    raus.push({ zoneId: z.id, distanz: beste, pfad });
  }
  return raus;
}
