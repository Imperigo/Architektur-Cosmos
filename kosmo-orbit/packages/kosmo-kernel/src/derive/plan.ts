import { columnOutline, type Aussparung, type Beam, type Boundary, type Assembly, type Column, type GridAxis, type Opening, type Stair, type Storey, type Wall, type Zone, type ZonenTuer } from '../model/entities';
import type { KosmoDoc } from '../model/doc';
import { difference, union, type Poly } from '../geometry/clip';
import {
  axisDirection,
  openingRects,
  wallFrame,
  wallLayerOutlines,
  wallOutline,
  pointOnAxis,
} from '../geometry/wall';
import { dist, type Pt } from '../model/units';
import { treppenTeile } from './treppe';

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

/** Rasterachse im Grundriss: strichpunktiert, Achskopf mit Label an beiden Enden. */
export interface PlanAxis {
  a: Pt;
  b: Pt;
  label: string;
  typ: 'haupt' | 'wohn';
}

/** Beschriftung im Plan (A3: Aussparungs-Koten «D 300×300 UK 1200»). */
export interface PlanText {
  at: Pt;
  text: string;
  classes: string[];
}

export interface PlanGraphic {
  storeyId: string;
  regions: PlanRegion[];
  lines: PlanLine[];
  arcs: PlanArc[];
  axes: PlanAxis[];
  texte: PlanText[];
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
  const axes: PlanAxis[] = [];
  const texte: PlanText[] = [];
  if (!storey || storey.kind !== 'storey') {
    return { storeyId, regions, lines, arcs, axes, texte, bounds: null };
  }

  const walls = doc
    .byKind<Wall>('wall')
    .filter((w) => w.storeyId === storeyId);

  // Schichten sammeln: tragend gruppiert nach Material (Join), Rest pro Wand.
  // Join-Schlüssel enthält den Umbau-Status: Neu vereinigt sich nur mit Neu,
  // Bestand mit Bestand — Abbruch bleibt pro Wand (Kreuz je Bauteil).
  const coreByMaterial = new Map<string, Poly[]>();
  const otherLayers: { material: string; fn: string; ren?: string; polys: Poly[] }[] = [];
  const renClasses = (ren?: string): string[] => (ren ? [`renovation-${ren}`] : []);

  const phase = doc.settings.phase;
  for (const wall of walls) {
    const assembly = doc.get<Assembly>(wall.assemblyId);
    if (!assembly || assembly.kind !== 'assembly') continue;
    const rects = openingRects(wall, doc.openingsOf(wall.id)).filter(
      // Öffnung schneidet den Grundriss nur, wenn die Schnitthöhe sie trifft
      (r) => r.z0 < storey.cutHeight && r.z1 > storey.cutHeight,
    );
    const strips = rects.map((r) => openingStrip(wall, assembly, r.s0, r.s1));
    const ren = wall.meta?.renovation;

    if (ren === 'abbruch') {
      // Abbruch (SIA-Umbau-Lesart): EIN Poché über die Gesamtdicke — die
      // Schichten sind egal, es kommt weg. Nicht vereinigt, Kreuz je Teilfläche.
      const outline = wallOutline(wall, assembly);
      const cutPolys: Poly[] = strips.length > 0 ? difference([outline], strips) : [outline];
      const material = assembly.layers.find((l) => l.function === 'tragend')?.material ?? 'masse';
      if (cutPolys.length > 0) {
        regions.push({
          rings: groupRings(cutPolys.map((p) => [...p])),
          classes: ['cut', 'tragend', `material-${material}`, 'renovation-abbruch'],
        });
      }
      for (const ring of cutPolys) {
        let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
        for (const p of ring) {
          x0 = Math.min(x0, p.x); y0 = Math.min(y0, p.y);
          x1 = Math.max(x1, p.x); y1 = Math.max(y1, p.y);
        }
        if (x0 === Infinity) continue;
        const kreuz = ['symbol', 'abbruch-kreuz', 'renovation-abbruch'];
        lines.push({ a: { x: x0, y: y0 }, b: { x: x1, y: y1 }, classes: kreuz });
        lines.push({ a: { x: x0, y: y1 }, b: { x: x1, y: y0 }, classes: kreuz });
      }
    } else if (phase === 'vorprojekt') {
      // Vorprojekt (SIA 31): Wand als EIN Poché über die Gesamtdicke — keine Schichten
      const outline = wallOutline(wall, assembly);
      const cutPolys: Poly[] = strips.length > 0 ? difference([outline], strips) : [outline];
      const key = `masse|${ren ?? ''}`;
      const arr = coreByMaterial.get(key) ?? [];
      arr.push(...cutPolys);
      coreByMaterial.set(key, arr);
    } else {
      for (const layer of wallLayerOutlines(wall, assembly)) {
        const meta = assembly.layers.find((l) => l.material === layer.material);
        const cutPolys: Poly[] =
          strips.length > 0 ? difference([layer.outline], strips) : [layer.outline];
        if (meta?.function === 'tragend') {
          const key = `${layer.material}|${ren ?? ''}`;
          const arr = coreByMaterial.get(key) ?? [];
          arr.push(...cutPolys);
          coreByMaterial.set(key, arr);
        } else if (meta) {
          otherLayers.push({
            material: layer.material,
            fn: meta.function,
            ...(ren ? { ren } : {}),
            polys: cutPolys,
          });
        }
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
      // Öffnungs-Symbole erben den Umbau-Status ihrer Wand oder tragen ihren eigenen
      const oRen = renClasses(o.meta?.renovation ?? ren);
      // Leibungslinien quer zur Wand
      lines.push({ a: at(r.s0, L), b: at(r.s0, R), classes: ['symbol', 'leibung', ...oRen] });
      lines.push({ a: at(r.s1, L), b: at(r.s1, R), classes: ['symbol', 'leibung', ...oRen] });
      if (phase === 'vorprojekt') {
        // Vorprojekt: Öffnung als Aussparung — Fenster mit EINER Glaslinie, Tür ohne Symbol
        if (o.openingType === 'fenster') {
          const mid = (L + R) / 2;
          lines.push({ a: at(r.s0, mid), b: at(r.s1, mid), classes: ['symbol', 'fenster', ...oRen] });
        }
      } else if (o.openingType === 'fenster') {
        // Fenstersymbol: zwei feine Linien (Glasebene) in Wandmitte
        const mid = (L + R) / 2;
        lines.push({ a: at(r.s0, mid - 25), b: at(r.s1, mid - 25), classes: ['symbol', 'fenster', ...oRen] });
        lines.push({ a: at(r.s0, mid + 25), b: at(r.s1, mid + 25), classes: ['symbol', 'fenster', ...oRen] });
        if (phase === 'werkplan') {
          // B4: Blockanschlag in der Leibung — Absatz von der Aussenkante (L)
          // bis zur Glasebene, Tiefe aus Opening.anschlag (Default 40 mm)
          const tiefe = o.anschlag ?? 40;
          lines.push({ a: at(r.s0 + tiefe, L), b: at(r.s0 + tiefe, mid + 25), classes: ['symbol', 'anschlag', ...oRen] });
          lines.push({ a: at(r.s1 - tiefe, L), b: at(r.s1 - tiefe, mid + 25), classes: ['symbol', 'anschlag', ...oRen] });
        }
      } else {
        // Türsymbol: Flügel senkrecht zur Wand + 90°-Schwenkbogen
        const width = r.s1 - r.s0;
        const hingeS = o.swing === 'rechts' ? r.s1 : r.s0;
        const hingePt = at(hingeS, L);
        const leafEnd: Pt = {
          x: Math.round(hingePt.x + n.x * width),
          y: Math.round(hingePt.y + n.y * width),
        };
        lines.push({ a: hingePt, b: leafEnd, classes: ['symbol', 'tuer', ...oRen] });
        const normalAngle = Math.atan2(n.y, n.x);
        const towardOpening = o.swing === 'rechts' ? Math.atan2(-d.y, -d.x) : Math.atan2(d.y, d.x);
        arcs.push({
          center: hingePt,
          radius: width,
          startAngle: Math.min(normalAngle, towardOpening),
          endAngle: Math.max(normalAngle, towardOpening),
          classes: ['symbol', 'tuer-bogen', ...oRen],
        });
      }
    }
  }

  // Join: tragende Schichten gleichen Materials UND gleichen Umbau-Status vereinigen
  for (const [key, polys] of coreByMaterial) {
    const merged = union(polys as Poly[]);
    if (merged.length === 0) continue;
    const [material, ren] = key.split('|');
    regions.push({
      rings: groupRings(merged),
      classes: ['cut', 'tragend', `material-${material}`, ...renClasses(ren || undefined)],
    });
  }
  for (const layer of otherLayers) {
    if (layer.polys.length === 0) continue;
    regions.push({
      rings: groupRings(layer.polys.map((p) => [...p])),
      classes: ['cut', layer.fn, `material-${layer.material}`, ...renClasses(layer.ren)],
    });
  }

  // Treppen (V2-A2/B3): Läufe mit Stufenlinien, Podeste, durchgehende
  // Lauflinie. B3: Der Grundriss schneidet die Treppe auf der Schnitthöhe —
  // unterhalb ausgezogen, oberhalb strichpunktiert («ueber-schnitt»), am
  // Schnitt eine Bruchlinie (Hochbauzeichner-Konvention).
  const cutZ = storey.elevation + storey.cutHeight;
  for (const st of doc.byKind<Stair>('stair')) {
    if (st.storeyId !== storeyId) continue;
    if (Math.hypot(st.b.x - st.a.x, st.b.y - st.a.y) < 1) continue;
    const teile = treppenTeile(st, storey.height, storey.elevation);
    const half = st.width / 2;
    const lauflinie: Pt[] = [];

    for (const lauf of teile.laeufe) {
      const len = Math.hypot(lauf.b.x - lauf.a.x, lauf.b.y - lauf.a.y);
      if (len < 1) continue;
      const d = { x: (lauf.b.x - lauf.a.x) / len, y: (lauf.b.y - lauf.a.y) / len };
      const nn = { x: -d.y, y: d.x };
      const at = (s: number, off: number): Pt => ({
        x: Math.round(lauf.a.x + d.x * s + nn.x * off),
        y: Math.round(lauf.a.y + d.y * s + nn.y * off),
      });
      // Kapp-Stelle: erste Steigung, deren Oberkante über der Schnitthöhe liegt
      const iCut = Math.ceil((cutZ - lauf.z0) / lauf.riser);
      const sCut = Math.min(Math.max(iCut * lauf.going, 0), len);
      const laufRect = (s0: number, s1: number, extra: string[]) =>
        regions.push({
          rings: [[at(s0, half), at(s1, half), at(s1, -half), at(s0, -half)]],
          classes: ['projection', 'treppe', ...extra],
        });
      if (sCut >= len - 1) {
        laufRect(0, len, []); // ganzer Lauf unter dem Schnitt
      } else if (sCut <= 1) {
        laufRect(0, len, ['ueber-schnitt']); // ganzer Lauf darüber
      } else {
        laufRect(0, sCut, []);
        laufRect(sCut, len, ['ueber-schnitt']);
        // Bruchlinie: Diagonale quer über die Laufbreite an der Kapp-Stelle
        lines.push({ a: at(sCut - 150, half), b: at(sCut + 150, -half), classes: ['symbol', 'bruchlinie'] });
      }
      for (let i = 1; i < lauf.steigungen; i++) {
        const s = Math.min(i * lauf.going, len);
        const oben = lauf.z0 + i * lauf.riser > cutZ;
        lines.push({ a: at(s, half), b: at(s, -half), classes: ['symbol', 'stufe', ...(oben ? ['ueber-schnitt'] : [])] });
      }
      lauflinie.push(at(0, 0), at(len, 0));
    }
    for (const podest of teile.podeste) {
      const oben = podest.z > cutZ;
      regions.push({
        rings: [podest.outline.map((p) => ({ ...p }))],
        classes: ['projection', 'treppe', 'podest', ...(oben ? ['ueber-schnitt'] : [])],
      });
    }
    // Lauflinie: Antritt → Podestmitten → Austritt, Pfeil am Ende
    for (let i = 0; i + 1 < lauflinie.length; i++) {
      lines.push({ a: lauflinie[i]!, b: lauflinie[i + 1]!, classes: ['symbol', 'lauflinie'] });
    }
    const ende = lauflinie[lauflinie.length - 1];
    const vor = lauflinie[lauflinie.length - 2];
    if (ende && vor) {
      const l = Math.hypot(ende.x - vor.x, ende.y - vor.y) || 1;
      const d = { x: (ende.x - vor.x) / l, y: (ende.y - vor.y) / l };
      const nn = { x: -d.y, y: d.x };
      const spitze: Pt = { x: Math.round(ende.x - d.x * 300), y: Math.round(ende.y - d.y * 300) };
      lines.push({ a: ende, b: { x: Math.round(spitze.x - d.x * 350 + nn.x * 160), y: Math.round(spitze.y - d.y * 350 + nn.y * 160) }, classes: ['symbol', 'lauflinie'] });
      lines.push({ a: ende, b: { x: Math.round(spitze.x - d.x * 350 - nn.x * 160), y: Math.round(spitze.y - d.y * 350 - nn.y * 160) }, classes: ['symbol', 'lauflinie'] });
    }
  }

  // Stützen (A3): geschosshoch → immer geschnitten, Material-Poché wie Wände
  for (const c of doc.byKind<Column>('column')) {
    if (c.storeyId !== storeyId) continue;
    regions.push({
      rings: [columnOutline(c)],
      classes: ['cut', 'stuetze', `material-${c.material}`, ...renClasses(c.meta?.renovation)],
    });
  }

  // Unterzüge (A3): über der Schnittebene → verdeckt gestrichelt (zwei
  // Flanken + Stirnkanten), Klasse «unterzug»
  for (const bm of doc.byKind<Beam>('beam')) {
    if (bm.storeyId !== storeyId) continue;
    const len = dist(bm.a, bm.b);
    if (len < 1) continue;
    const d = { x: (bm.b.x - bm.a.x) / len, y: (bm.b.y - bm.a.y) / len };
    const n = { x: -d.y, y: d.x };
    const h = bm.breite / 2;
    const P = (p: Pt, off: number): Pt => ({
      x: Math.round(p.x + n.x * off),
      y: Math.round(p.y + n.y * off),
    });
    const cls = ['symbol', 'unterzug', ...renClasses(bm.meta?.renovation)];
    lines.push({ a: P(bm.a, h), b: P(bm.b, h), classes: cls });
    lines.push({ a: P(bm.a, -h), b: P(bm.b, -h), classes: cls });
    lines.push({ a: P(bm.a, h), b: P(bm.a, -h), classes: cls });
    lines.push({ a: P(bm.b, h), b: P(bm.b, -h), classes: cls });
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

  // Baugrenze: geschlossener Linienzug (Stil via Klasse «baugrenze»)
  for (const g of doc.byKind<Boundary>('boundary')) {
    if (g.storeyId !== storeyId) continue;
    for (let i = 0; i < g.outline.length; i++) {
      const a = g.outline[i]!;
      const b = g.outline[(i + 1) % g.outline.length]!;
      lines.push({ a, b, classes: ['baugrenze'] });
    }
  }

  // Zonentüren (A4): Öffnungslücke + Flügel im Derive — der Druck erbt das
  // Symbol (bisher zeichnete es nur die Bildschirm-2D). Richtung über die
  // Zonen-Punktprobe: Zonenwechsel quer zur Kante bestimmt die Türlage.
  const raumZonen = doc.byKind<Zone>('zone').filter((z) => z.storeyId === storeyId && z.raumTyp);
  const zoneAt = (p: Pt): string | undefined =>
    raumZonen.find((z) => punktInPoly(p, z.outline))?.id;
  for (const t of doc.byKind<ZonenTuer>('zonentuer')) {
    if (t.storeyId !== storeyId) continue;
    const vertikal = zoneAt({ x: t.at.x - 300, y: t.at.y }) !== zoneAt({ x: t.at.x + 300, y: t.at.y });
    const h = t.breite / 2;
    if (vertikal) {
      lines.push({ a: { x: t.at.x, y: t.at.y - h }, b: { x: t.at.x, y: t.at.y + h }, classes: ['symbol', 'zonentuer-luecke'] });
      lines.push({ a: { x: t.at.x, y: t.at.y - h }, b: { x: t.at.x + t.breite, y: t.at.y - h }, classes: ['symbol', 'zonentuer-fluegel'] });
    } else {
      lines.push({ a: { x: t.at.x - h, y: t.at.y }, b: { x: t.at.x + h, y: t.at.y }, classes: ['symbol', 'zonentuer-luecke'] });
      lines.push({ a: { x: t.at.x - h, y: t.at.y }, b: { x: t.at.x - h, y: t.at.y + t.breite }, classes: ['symbol', 'zonentuer-fluegel'] });
    }
  }

  // Aussparungen/Durchbrüche (A3): nur im Werkplan — Kreuz + Kote, KEIN
  // Geometrieschnitt (Symbolik nach Hochbauzeichner-Konvention)
  if (phase === 'werkplan') {
    for (const a of doc.byKind<Aussparung>('aussparung')) {
      if (a.storeyId !== storeyId) continue;
      const host = doc.get(a.hostId);
      let ecken: Pt[] | null = null;
      let labelAt: Pt | null = null;
      if (host?.kind === 'wall' && a.center !== undefined) {
        const assembly = doc.get<Assembly>(host.assemblyId);
        if (!assembly || assembly.kind !== 'assembly') continue;
        const frame = wallFrame(host, assembly);
        const d = axisDirection(host);
        const n = { x: -d.y, y: d.x };
        const at = (s: number, off: number): Pt => ({
          x: Math.round(host.a.x + d.x * s + n.x * off),
          y: Math.round(host.a.y + d.y * s + n.y * off),
        });
        const s0 = a.center - a.breite / 2;
        const s1 = a.center + a.breite / 2;
        ecken = [at(s0, frame.offsetLeft), at(s1, frame.offsetLeft), at(s1, -frame.offsetRight), at(s0, -frame.offsetRight)];
        labelAt = at(a.center, frame.offsetLeft + 260);
      } else if (host?.kind === 'slab' && a.at) {
        const bh = a.breite / 2;
        const hh = a.hoehe / 2;
        ecken = [
          { x: a.at.x - bh, y: a.at.y - hh }, { x: a.at.x + bh, y: a.at.y - hh },
          { x: a.at.x + bh, y: a.at.y + hh }, { x: a.at.x - bh, y: a.at.y + hh },
        ];
        labelAt = { x: a.at.x, y: a.at.y + hh + 260 };
      }
      if (!ecken || !labelAt) continue;
      const cls = ['symbol', 'aussparung'];
      for (let i = 0; i < 4; i++) lines.push({ a: ecken[i]!, b: ecken[(i + 1) % 4]!, classes: cls });
      lines.push({ a: ecken[0]!, b: ecken[2]!, classes: cls }); // Diagonale (Schlitz)
      if (a.typ === 'durchbruch') lines.push({ a: ecken[1]!, b: ecken[3]!, classes: cls }); // volles Kreuz
      texte.push({
        at: labelAt,
        text: `${a.typ === 'schlitz' ? 'S' : 'D'} ${a.breite}×${a.hoehe}${a.sill !== undefined ? ` UK ${a.sill}` : ''}`,
        classes: ['aussparung'],
      });
    }
  }

  // Stützenraster: Achsen des Geschosses (Stil/Achskopf machen die Renderer)
  for (const g of doc.byKind<GridAxis>('grid')) {
    if (g.storeyId !== storeyId) continue;
    axes.push({ a: g.a, b: g.b, label: g.label, typ: g.typ ?? 'haupt' });
  }

  const bounds = computeBounds(regions, lines);
  for (const ax of axes) {
    if (!bounds) break;
    for (const p of [ax.a, ax.b]) {
      bounds.minX = Math.min(bounds.minX, p.x);
      bounds.minY = Math.min(bounds.minY, p.y);
      bounds.maxX = Math.max(bounds.maxX, p.x);
      bounds.maxY = Math.max(bounds.maxY, p.y);
    }
  }
  return { storeyId, regions, lines, arcs, axes, texte, bounds: bounds ?? axesBounds(axes) };
}

function axesBounds(axes: PlanAxis[]) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const ax of axes) {
    for (const p of [ax.a, ax.b]) {
      minX = Math.min(minX, p.x); minY = Math.min(minY, p.y);
      maxX = Math.max(maxX, p.x); maxY = Math.max(maxY, p.y);
    }
  }
  return minX === Infinity ? null : { minX, minY, maxX, maxY };
}

/** Clipper liefert flache Ring-Listen; Löcher haben umgekehrte Orientierung. */
function groupRings(paths: Pt[][]): Pt[][] {
  return paths.map((p) => p.map((q) => ({ ...q })));
}

/** Punkt-im-Polygon (Ray-Casting) für die Zonentür-Richtungsprobe. */
function punktInPoly(p: Pt, poly: readonly Pt[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i]!;
    const b = poly[j]!;
    if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
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
