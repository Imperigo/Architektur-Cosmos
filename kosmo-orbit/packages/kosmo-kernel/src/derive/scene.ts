import { columnOutline, type Assembly, type Beam, type Column, type FreeMesh, type Gelaender, type MassBody, type Opening, type Rampe, type Roof, type Slab, type Stair, type Storey, type Terrain, type Wall } from '../model/entities';
import type { KosmoDoc } from '../model/doc';
import { dist, type Pt } from '../model/units';
import { openingRects, wallFrame, axisDirection } from '../geometry/wall';
import { treppenTeile } from './treppe';
import { rampenTeile } from './rampe';
import { gelaenderTeile } from './gelaender';
import { extrudePolygon, extrudeTerrainBand, extrudeWallWithOpenings, type GeometryArtifact } from './mesh';
import { featureKanten, flaechenNormale } from './mesh-topo';
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
  else if (e.kind === 'ramp') artifact = deriveRamp(doc, e);
  else if (e.kind === 'column') artifact = deriveColumn(doc, e);
  else if (e.kind === 'beam') artifact = deriveBeam(doc, e);
  else if (e.kind === 'freemesh') artifact = deriveFreeMesh(doc, e);
  else if (e.kind === 'gelaender') artifact = deriveGelaender(doc, e);

  if (artifact) cache.set(id, { revision: doc.revision, artifact });
  return artifact;
}

export function deriveAll(doc: KosmoDoc): GeometryArtifact[] {
  const out: GeometryArtifact[] = [];
  for (const e of doc.entities.values()) {
    if (e.kind === 'wall' || e.kind === 'slab' || e.kind === 'mass' || e.kind === 'roof' || e.kind === 'stair' || e.kind === 'ramp' || e.kind === 'column' || e.kind === 'beam' || e.kind === 'freemesh' || e.kind === 'gelaender') {
      const a = deriveEntity(doc, e.id);
      if (a) out.push(a);
    }
  }
  out.push(...deriveKnotenstuecke(doc));
  out.push(...deriveFensterProfile(doc));
  out.push(...deriveTerrainBaender(doc));
  return out;
}

/**
 * v0.7.1 E5 Stream 4A (docs/V071-KONZEPT.md «Fenster echt»): `deriveAll`
 * bleibt für Schnitt/Axo/GLTF-Export/Kamera-Einpassung UNVERÄNDERT (Vertrags-
 * Audit-Guard: «Glas-Artefakte ändern PLAN nicht» — jene Ableitungen
 * schneiden/zählen JEDES `deriveAll`-Artefakt generisch, ein zusätzliches
 * 10-mm-Glas oder ein Standard-Rahmen-Loop je Fenster würde dort ungewollt
 * neue Schnittlinien/Meshes erzeugen). Der 3D-Viewport dagegen SOLL die
 * neuen Fenster-Details zeigen — additive Erweiterung NUR für diesen einen
 * Aufrufer, kein zweiter Koordinaten-Pfad (dieselben `deriveFensterGlas`/
 * `deriveFensterRahmenStandard`-Funktionen, nur ausserhalb von `deriveAll`
 * gehalten).
 */
export function deriveAllMitFensterdetails(doc: KosmoDoc): GeometryArtifact[] {
  const out = deriveAll(doc);
  out.push(...deriveFensterGlas(doc));
  out.push(...deriveFensterRahmenStandard(doc));
  return out;
}

/**
 * Bandbreite des Terrain-Geländemeshs (v0.7.1 E4). ANNAHME (dokumentiert,
 * s. extrudeTerrainBand-Kommentar in mesh.ts): fest, nicht von der
 * Gebäudebreite abgeleitet — Terrain ist ein projektglobales Entity ohne
 * Bezug zu Storey/Wand-Ausdehnung, ein von anderen Entities unabhängiger
 * fixer Wert hält die Ableitung einfach und deterministisch.
 */
export const TERRAIN_BAND_BREITE_MM = 8000;

/**
 * Terrain-Entities → Gelände-Band-Artefakte (Daten-Guard: keine
 * Terrain-Entity mit ≥2 Stützpunkten ⇒ leeres Array, deriveAll bleibt
 * byte-identisch zum Vor-E4-Stand). materialKey 'terrain' markiert das
 * Artefakt für den Viewport (Matt-Material, Raycast-Bevorzugung).
 */
function deriveTerrainBaender(doc: KosmoDoc): GeometryArtifact[] {
  const out: GeometryArtifact[] = [];
  for (const t of doc.byKind<Terrain>('terrain')) {
    if (t.punkte.length < 2) continue;
    out.push(extrudeTerrainBand(t.id, 'terrain', t.punkte, TERRAIN_BAND_BREITE_MM / 2));
  }
  return out;
}

/** Default-Profilbreite parametrischer Fenster (docs/FENSTER-KONZEPT.md). */
export const FENSTER_RAHMEN_DEFAULT_MM = 60;

/**
 * Rahmen-/Pfosten-Riegel-Profile parametrischer Fenster (v0.6.9 Stream A,
 * docs/FENSTER-KONZEPT.md): je Opening mit gesetztem fensterTyp entstehen
 * schlanke Boxen (extrudePolygon) in der Öffnungsebene — Blendrahmen
 * umlaufend, Pfosten/Riegel nach teilung (Fensterband = viele Pfosten).
 * Tiefe = halbe Wanddicke, zentriert auf die Wandmitte (dort liegt auch die
 * Plan-Glasebene). Pfosten und Riegel kreuzen sich als durchlaufende Boxen —
 * die Überlappung am Kreuzungspunkt ist bewusst (gleiches Material, im
 * Schnitt deckungsgleiches Poché, keine sichtbare Doppelkante). Öffnungen
 * OHNE fensterTyp liefern NICHTS — bestehende Szenen/Schnitte/Ansichten
 * bleiben byte-identisch (Goldens-Guard).
 */
function deriveFensterProfile(doc: KosmoDoc): GeometryArtifact[] {
  const out: GeometryArtifact[] = [];
  for (const o of doc.byKind<Opening>('opening')) {
    if (o.openingType !== 'fenster' || !o.fensterTyp) continue;
    const wall = doc.get<Wall>(o.wallId);
    if (!wall || wall.kind !== 'wall') continue;
    const storey = doc.get<Storey>(wall.storeyId);
    const assembly = doc.get<Assembly>(wall.assemblyId);
    if (!storey || storey.kind !== 'storey' || !assembly || assembly.kind !== 'assembly') continue;
    const r = openingRects(wall, [o])[0];
    if (!r) continue;
    const { offsetLeft, offsetRight } = wallFrame(wall, assembly);
    const dicke = offsetLeft + offsetRight;
    const midOff = (offsetLeft - offsetRight) / 2;
    const oA = midOff + dicke / 4;
    const oB = midOff - dicke / 4;
    const d = axisDirection(wall);
    const nrm = { x: -d.y, y: d.x };
    const P = (s: number, off: number): Pt => ({
      x: Math.round(wall.a.x + d.x * s + nrm.x * off),
      y: Math.round(wall.a.y + d.y * s + nrm.y * off),
    });
    // Grundriss-Rechteck des Profils, CCW ausgerichtet (extrudePolygon
    // erwartet positive Fläche — wie deriveKnotenstuecke).
    const quad = (sA: number, sB: number): Pt[] => {
      const poly = [P(sA, oA), P(sB, oA), P(sB, oB), P(sA, oB)];
      let f = 0;
      for (let i = 0; i < poly.length; i++) {
        const p1 = poly[i]!;
        const p2 = poly[(i + 1) % poly.length]!;
        f += p1.x * p2.y - p2.x * p1.y;
      }
      return f >= 0 ? poly : poly.reverse();
    };
    const rb = o.rahmenbreite ?? FENSTER_RAHMEN_DEFAULT_MM;
    const z0 = storey.elevation + r.z0;
    const z1 = storey.elevation + r.z1;
    // Entartete Öffnungen (kleiner als der doppelte Rahmen) bekommen kein Profil
    if (r.s1 - r.s0 <= 2 * rb || z1 - z0 <= 2 * rb) continue;
    let teil = 0;
    const push = (sA: number, sB: number, zA: number, zB: number): void => {
      if (sB - sA < 1 || zB - zA < 1) return;
      out.push(extrudePolygon(`${o.id}:rahmen:${teil++}`, 'fenster-rahmen', quad(sA, sB), [], zA, zB));
    };
    const n = Math.max(1, o.teilung?.n ?? (o.fensterTyp === 'zweifluegel' ? 2 : 1));
    const m = Math.max(1, o.teilung?.m ?? 1);
    // Vertikal: Blendrahmen beidseits + Pfosten an den Teilungspunkten
    push(r.s0, r.s0 + rb, z0, z1);
    push(r.s1 - rb, r.s1, z0, z1);
    const feldB = (r.s1 - r.s0) / n;
    for (let i = 1; i < n; i++) {
      const s = r.s0 + i * feldB;
      push(s - rb / 2, s + rb / 2, z0, z1);
    }
    // Horizontal: Brüstungs-/Sturzriegel zwischen den Blendrahmen + Zwischenriegel
    push(r.s0 + rb, r.s1 - rb, z0, z0 + rb);
    push(r.s0 + rb, r.s1 - rb, z1 - rb, z1);
    const feldH = (z1 - z0) / m;
    for (let j = 1; j < m; j++) {
      const z = z0 + j * feldH;
      push(r.s0 + rb, r.s1 - rb, z - rb / 2, z + rb / 2);
    }
  }
  return out;
}

/** Dicke der Glas-Ebene (v0.7.1 E5 Stream 4A, docs/V071-KONZEPT.md «Fenster echt»). */
export const FENSTER_GLAS_DICKE_MM = 10;

/**
 * Glas-Ebene je Fenster-Öffnung (v0.7.1 E5 Stream 4A): eine dünne Box
 * (~10 mm) mittig in der Wanddicke — derselbe `midOff` wie die Rahmenprofile
 * oben in deriveFensterProfile (dort dokumentiert: «dort liegt auch die
 * Plan-Glasebene») und derselbe Weltkoordinaten-Weg (P(s, off) über
 * axisDirection + Normale) — KEIN zweiter Berechnungspfad. Ausdehnung =
 * Öffnungsrechteck (s0..s1, z0..z1 aus openingRects) — ALLE Fenster-
 * Öffnungen bekommen Glas, parametrisch UND einfach (Türen NICHT:
 * openingType-Guard). Daten-Guard: keine Fenster-Öffnung ⇒ leeres Array
 * (Szene ohne Fenster bleibt byte-identisch).
 */
function deriveFensterGlas(doc: KosmoDoc): GeometryArtifact[] {
  const out: GeometryArtifact[] = [];
  for (const o of doc.byKind<Opening>('opening')) {
    if (o.openingType !== 'fenster') continue;
    const wall = doc.get<Wall>(o.wallId);
    if (!wall || wall.kind !== 'wall') continue;
    const storey = doc.get<Storey>(wall.storeyId);
    const assembly = doc.get<Assembly>(wall.assemblyId);
    if (!storey || storey.kind !== 'storey' || !assembly || assembly.kind !== 'assembly') continue;
    const r = openingRects(wall, [o])[0];
    if (!r) continue;
    const { offsetLeft, offsetRight } = wallFrame(wall, assembly);
    const midOff = (offsetLeft - offsetRight) / 2;
    const halb = FENSTER_GLAS_DICKE_MM / 2;
    const d = axisDirection(wall);
    const nrm = { x: -d.y, y: d.x };
    const P = (s: number, off: number): Pt => ({
      x: Math.round(wall.a.x + d.x * s + nrm.x * off),
      y: Math.round(wall.a.y + d.y * s + nrm.y * off),
    });
    const poly = [P(r.s0, midOff + halb), P(r.s1, midOff + halb), P(r.s1, midOff - halb), P(r.s0, midOff - halb)];
    let f = 0;
    for (let i = 0; i < poly.length; i++) {
      const p1 = poly[i]!;
      const p2 = poly[(i + 1) % poly.length]!;
      f += p1.x * p2.y - p2.x * p1.y;
    }
    const ccw = f >= 0 ? poly : poly.reverse();
    const z0 = storey.elevation + r.z0;
    const z1 = storey.elevation + r.z1;
    if (r.s1 - r.s0 < 1 || z1 - z0 < 1) continue;
    out.push(extrudePolygon(`${o.id}:glas`, 'glas', ccw, [], z0, z1));
  }
  return out;
}

/**
 * Standard-Rahmen für Fenster-Öffnungen OHNE fensterTyp (v0.7.1 E5 Stream
 * 4A): ein einfacher Rahmen-Loop (4 Leisten, FENSTER_RAHMEN_DEFAULT_MM
 * breit) folgt der GESAMTEN Wandtiefe (anders als das parametrische Profil
 * oben in deriveFensterProfile, das nur die halbe Wanddicke zentriert auf
 * die Wandmitte nutzt) — ohne Teilung, ohne Pfosten/Riegel, reiner
 * Blendrahmen, der die Leibung komplett füllt. Öffnungen MIT fensterTyp
 * werden hier übersprungen (Guard `o.fensterTyp`) — sie behalten ihre
 * bestehenden Profile aus deriveFensterProfile, kein Doppelrahmen. Gleicher
 * materialKey 'fenster-rahmen' wie das parametrische Profil (derselbe
 * Bauteil-Charakter, dieselbe Viewport-Materialbehandlung).
 */
function deriveFensterRahmenStandard(doc: KosmoDoc): GeometryArtifact[] {
  const out: GeometryArtifact[] = [];
  for (const o of doc.byKind<Opening>('opening')) {
    if (o.openingType !== 'fenster' || o.fensterTyp) continue;
    const wall = doc.get<Wall>(o.wallId);
    if (!wall || wall.kind !== 'wall') continue;
    const storey = doc.get<Storey>(wall.storeyId);
    const assembly = doc.get<Assembly>(wall.assemblyId);
    if (!storey || storey.kind !== 'storey' || !assembly || assembly.kind !== 'assembly') continue;
    const r = openingRects(wall, [o])[0];
    if (!r) continue;
    const { offsetLeft, offsetRight } = wallFrame(wall, assembly);
    const d = axisDirection(wall);
    const nrm = { x: -d.y, y: d.x };
    const P = (s: number, off: number): Pt => ({
      x: Math.round(wall.a.x + d.x * s + nrm.x * off),
      y: Math.round(wall.a.y + d.y * s + nrm.y * off),
    });
    // Grundriss-Rechteck eines Leisten-Segments, über die GANZE Wandtiefe
    // (offsetLeft..−offsetRight) — CCW ausgerichtet wie überall in scene.ts.
    const quad = (sA: number, sB: number): Pt[] => {
      const poly = [P(sA, offsetLeft), P(sB, offsetLeft), P(sB, -offsetRight), P(sA, -offsetRight)];
      let f = 0;
      for (let i = 0; i < poly.length; i++) {
        const p1 = poly[i]!;
        const p2 = poly[(i + 1) % poly.length]!;
        f += p1.x * p2.y - p2.x * p1.y;
      }
      return f >= 0 ? poly : poly.reverse();
    };
    const rb = FENSTER_RAHMEN_DEFAULT_MM;
    const z0 = storey.elevation + r.z0;
    const z1 = storey.elevation + r.z1;
    // Entartete Öffnungen (kleiner als der doppelte Rahmen) bekommen keinen Loop
    if (r.s1 - r.s0 <= 2 * rb || z1 - z0 <= 2 * rb) continue;
    let teil = 0;
    const push = (sA: number, sB: number, zA: number, zB: number): void => {
      if (sB - sA < 1 || zB - zA < 1) return;
      out.push(extrudePolygon(`${o.id}:rahmen-std:${teil++}`, 'fenster-rahmen', quad(sA, sB), [], zA, zB));
    };
    // Vier Leisten: zwei stehende Blendrahmen + Brüstungs-/Sturzriegel dazwischen
    push(r.s0, r.s0 + rb, z0, z1);
    push(r.s1 - rb, r.s1, z0, z1);
    push(r.s0 + rb, r.s1 - rb, z0, z0 + rb);
    push(r.s0 + rb, r.s1 - rb, z1 - rb, z1);
  }
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

/** Pfosten-Querschnitt (v0.9.1 P-A1, V091-SPEZ). */
const GELAENDER_PFOSTEN_MM = 40;
/** Handlauf-Bandhöhe (v0.9.1 P-A1, V091-SPEZ). */
const GELAENDER_HANDLAUF_HOEHE_MM = 40;

/**
 * Mehrere Extrusionen einer Entity zu EINEM GeometryArtifact zusammenführen
 * — `deriveEntity` liefert genau ein Artefakt je Entity-Id (Cache-Schlüssel),
 * ein Geländer besteht aber aus mehreren Pfosten- und Handlauf-Boxen
 * (je eine `extrudePolygon`-Extrusion). Reines Konkatenieren der typisierten
 * Arrays, Indices werden um die bisherige Vertex-Zahl verschoben.
 */
function mergeArtifacts(entityId: string, materialKey: string, teile: readonly GeometryArtifact[]): GeometryArtifact | null {
  if (teile.length === 0) return null;
  const pos: number[] = [];
  const nor: number[] = [];
  const idx: number[] = [];
  const edges: number[] = [];
  for (const t of teile) {
    const base = pos.length / 3;
    pos.push(...t.positions);
    nor.push(...t.normals);
    for (const i of t.indices) idx.push(i + base);
    edges.push(...t.edges);
  }
  return {
    entityId,
    materialKey,
    positions: new Float32Array(pos),
    normals: new Float32Array(nor),
    indices: new Uint32Array(idx),
    edges: new Float32Array(edges),
  };
}

/**
 * Geländer (v0.9.1 P-A1, `docs/V091-SPEZ.md` K24): Pfosten als dünne
 * quadratische Extrusionen (~40×40 mm, Höhe g.hoehe ab OK Geschossboden) +
 * ein Handlauf-Band (~40 mm hoch) auf Höhe g.hoehe entlang jedes
 * Polylinien-Segments — Muster `deriveColumn`/`deriveBeam` (`extrudePolygon`).
 * Die Zerlegung (Pfosten-Positionen, Handlauf-Segmente) kommt aus
 * `derive/gelaender.ts` (`gelaenderTeile`) — EINE Wahrheit, kein zweiter
 * Berechnungsweg. `art` (staketen/handlauf/voll) unterscheidet die 3D-Form
 * bewusst NICHT (V091-SPEZ nennt nur Pfosten+Handlauf als P-A1-Umfang; eine
 * echte Staketen-/Voll-Füllung ist ausserhalb dieses Pakets).
 */
function deriveGelaender(doc: KosmoDoc, g: Gelaender): GeometryArtifact | null {
  const storey = doc.get<Storey>(g.storeyId);
  if (!storey || storey.kind !== 'storey' || g.punkte.length < 2) return null;
  const teile = gelaenderTeile(g);
  const z0 = storey.elevation;
  const z1 = z0 + g.hoehe;
  const parts: GeometryArtifact[] = [];

  const halbPfosten = GELAENDER_PFOSTEN_MM / 2;
  for (const p of teile.pfosten) {
    parts.push(
      extrudePolygon(
        g.id,
        'stahl',
        [
          { x: p.x - halbPfosten, y: p.y - halbPfosten },
          { x: p.x + halbPfosten, y: p.y - halbPfosten },
          { x: p.x + halbPfosten, y: p.y + halbPfosten },
          { x: p.x - halbPfosten, y: p.y + halbPfosten },
        ],
        [],
        z0,
        z1,
      ),
    );
  }

  const halbBand = GELAENDER_HANDLAUF_HOEHE_MM / 2;
  for (const seg of teile.handlaufSegmente) {
    const len = Math.hypot(seg.b.x - seg.a.x, seg.b.y - seg.a.y);
    if (len < 1) continue;
    const d = { x: (seg.b.x - seg.a.x) / len, y: (seg.b.y - seg.a.y) / len };
    const n = { x: -d.y, y: d.x };
    const P = (p: Pt, off: number): Pt => ({ x: p.x + n.x * off, y: p.y + n.y * off });
    parts.push(
      extrudePolygon(
        g.id,
        'stahl',
        [P(seg.a, -halbPfosten), P(seg.b, -halbPfosten), P(seg.b, halbPfosten), P(seg.a, halbPfosten)],
        [],
        z1 - halbBand,
        z1 + halbBand,
      ),
    );
  }

  return mergeArtifacts(g.id, 'stahl', parts);
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

/**
 * FreeMesh → GeometryArtifact (Block 3 / FM1, Buildplan E5): Dreiecke werden
 * für Flat-Shading «explodiert» (jedes Dreieck eigene Vertices mit
 * Flächennormale), Linien-Overlay aus den Feature-Kanten (Knick > 25° oder
 * offener Rand). z ist storey-relativ — hier kommt die Geschosshöhe dazu.
 * Daten-Guard: ohne gültige Dreiecke entsteht KEIN Artefakt (Golden-Gesetz).
 */
function deriveFreeMesh(doc: KosmoDoc, m: FreeMesh): GeometryArtifact | null {
  const storey = doc.get<Storey>(m.storeyId);
  if (!storey || storey.kind !== 'storey' || m.faces.length < 3) return null;
  const zOff = storey.elevation;
  const faceCount = m.faces.length / 3;
  const pos = new Float32Array(faceCount * 9);
  const nor = new Float32Array(faceCount * 9);
  const idx = new Uint32Array(faceCount * 3);
  for (let f = 0; f < faceCount; f++) {
    const n = flaechenNormale(m.positions, m.faces, f);
    for (let k = 0; k < 3; k++) {
      const v = m.faces[f * 3 + k]! * 3;
      const o = f * 9 + k * 3;
      pos[o] = m.positions[v]!;
      pos[o + 1] = m.positions[v + 1]!;
      pos[o + 2] = m.positions[v + 2]! + zOff;
      nor[o] = n[0];
      nor[o + 1] = n[1];
      nor[o + 2] = n[2];
      idx[f * 3 + k] = f * 3 + k;
    }
  }
  const kanten = featureKanten(m.positions, m.faces);
  const edges = new Float32Array(kanten.length);
  for (let i = 0; i < kanten.length; i += 3) {
    edges[i] = kanten[i]!;
    edges[i + 1] = kanten[i + 1]!;
    edges[i + 2] = kanten[i + 2]! + zOff;
  }
  return { entityId: m.id, materialKey: 'masse', positions: pos, normals: nor, indices: idx, edges };
}

/**
 * Satteldach (Giebeldach): First entlang firstrichtung durch die Mitte der
 * Traufe — Höhe hängt NUR von der Quer-Koordinate ab (Abstand zum First),
 * darum sind beide Dachhälften exakte Ebenen, unabhängig vom Grundriss
 * (auch bei nicht-rechteckigen, konvexen Grundrissen). Die schrägen Ortgang-
 * Kanten an den Schmalseiten (Giebel) entstehen automatisch aus derselben
 * Höhenformel — kein Sonderfall nötig. Zwei Flächen, ein First, kein
 * Straight-Skeleton (das bleibt exklusiv dem Walmdach vorbehalten).
 */
function clipHalfPlane(
  poly: readonly { x: number; y: number }[],
  f: (p: { x: number; y: number }) => number,
): { x: number; y: number }[] {
  const n = poly.length;
  const out: { x: number; y: number }[] = [];
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

function deriveSatteldach(
  roof: Roof,
  eave: { x: number; y: number }[],
  tan: number,
  zBase: number,
): GeometryArtifact {
  const achse = roof.firstrichtung ?? 'x';
  const perp = (p: { x: number; y: number }) => (achse === 'x' ? p.y : p.x);
  const along = (p: { x: number; y: number }) => (achse === 'x' ? p.x : p.y);

  let perpMin = Infinity;
  let perpMax = -Infinity;
  for (const p of eave) {
    const v = perp(p);
    if (v < perpMin) perpMin = v;
    if (v > perpMax) perpMax = v;
  }
  const mid = (perpMin + perpMax) / 2;
  const halfSpan = (perpMax - perpMin) / 2;
  const height = (p: { x: number; y: number }) => zBase + tan * (halfSpan - Math.abs(perp(p) - mid));

  const seiten = [
    clipHalfPlane(eave, (p) => mid - perp(p)),
    clipHalfPlane(eave, (p) => perp(p) - mid),
  ];

  const pos: number[] = [];
  const nor: number[] = [];
  const idx: number[] = [];
  const edges: number[] = [];
  const EPS = 1e-6;

  let ridgeGezeichnet = false;
  for (const ring of seiten) {
    if (ring.length < 3) continue;
    const P = (q: { x: number; y: number }) => [q.x, q.y, height(q)] as const;
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
    for (let i = 1; i < ring.length - 1; i++) {
      if (nz >= 0) idx.push(base, base + i, base + i + 1);
      else idx.push(base, base + i + 1, base + i);
    }
    // Traufe + Ortgang (First-First-Kanten separat, einmal, unten)
    for (let i = 0; i < ring.length; i++) {
      const q1 = ring[i]!;
      const q2 = ring[(i + 1) % ring.length]!;
      if (Math.abs(perp(q1) - mid) < EPS && Math.abs(perp(q2) - mid) < EPS) continue;
      edges.push(q1.x, q1.y, height(q1), q2.x, q2.y, height(q2));
    }
    // First-Endpunkte einsammeln (kleinster/grösster Wert entlang der Firstachse) —
    // beide Seiten teilen dieselbe Firstlinie, darum nur einmal zeichnen.
    if (!ridgeGezeichnet) {
      const ridgePts = ring.filter((q) => Math.abs(perp(q) - mid) < EPS);
      if (ridgePts.length >= 2) {
        let a = ridgePts[0]!;
        let b = ridgePts[0]!;
        for (const q of ridgePts) {
          if (along(q) < along(a)) a = q;
          if (along(q) > along(b)) b = q;
        }
        if (a !== b) {
          edges.push(a.x, a.y, height(a), b.x, b.y, height(b));
          ridgeGezeichnet = true;
        }
      }
    }
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

function deriveRoof(doc: KosmoDoc, roof: Roof): GeometryArtifact | null {
  const storey = doc.get<Storey>(roof.storeyId);
  if (!storey || storey.kind !== 'storey' || roof.outline.length < 3) return null;
  const zBase = storey.elevation + roof.baseOffset;
  const tan = Math.tan((roof.pitch * Math.PI) / 180);

  // Traufe = Umriss + Überstand
  const expanded = roof.overhang > 0 ? offsetPolygon(roof.outline, roof.overhang) : [roof.outline];
  const eave = expanded[0];
  if (!eave || eave.length < 3) return null;

  if (roof.form === 'sattel') return deriveSatteldach(roof, eave, tan, zBase);

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
      // Trittfläche (Windung war invertiert: die begehbare Oberseite culled
      // sich von oben weg, nur die Unterseite blieb sichtbar)
      quad(P(s0, half, zt), P(s0, -half, zt), P(s1, -half, zt), P(s1, half, zt), 0, 0, 1);
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

/**
 * Rampe (v0.9.1 P-A2) — geneigte Platte, von Hand gebaut wie `deriveStair`:
 * `extrudePolygon` kennt nur horizontale Deckel (Ober-/Unterkante dieselbe
 * Kontur), eine geneigte Fläche geht damit nicht. Die Lauffläche steigt
 * LINEAR von z0 (bei a, Geschossniveau) auf z1 = z0+hoehenDelta (bei b);
 * die Unterseite bleibt eben auf Geschossniveau. `rampenTeile` liefert
 * dieselbe Platte auch für ein künftiges Plan-Symbol (P-B3) — hier nur die
 * 3D-Extrusion daraus.
 */
function deriveRamp(doc: KosmoDoc, ramp: Rampe): GeometryArtifact | null {
  const storey = doc.get<Storey>(ramp.storeyId);
  if (!storey || storey.kind !== 'storey') return null;
  const laenge = dist(ramp.a, ramp.b);
  if (laenge < 1) return null;
  const teile = rampenTeile(ramp, storey.elevation);
  const { a, b, width, z0, z1 } = teile.platte;
  const d = { x: (b.x - a.x) / laenge, y: (b.y - a.y) / laenge };
  const n = { x: -d.y, y: d.x };
  const half = width / 2;

  const pos: number[] = [];
  const nor: number[] = [];
  const idx: number[] = [];
  const edges: number[] = [];
  const P = (s: number, off: number, z: number): [number, number, number] => [
    a.x + d.x * s + n.x * off,
    a.y + d.y * s + n.y * off,
    z,
  ];
  const quad = (
    p0: readonly [number, number, number],
    p1: readonly [number, number, number],
    p2: readonly [number, number, number],
    p3: readonly [number, number, number],
    nx: number, ny: number, nz: number,
  ) => {
    const base = pos.length / 3;
    for (const p of [p0, p1, p2, p3]) { pos.push(...p); nor.push(nx, ny, nz); }
    idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
  };
  const tri = (
    p0: readonly [number, number, number],
    p1: readonly [number, number, number],
    p2: readonly [number, number, number],
    nx: number, ny: number, nz: number,
  ) => {
    const base = pos.length / 3;
    for (const p of [p0, p1, p2]) { pos.push(...p); nor.push(nx, ny, nz); }
    idx.push(base, base + 1, base + 2);
  };

  // Echte Neigungsnormale der Deckfläche (kein blosses (0,0,1)).
  const along = { x: d.x * laenge, y: d.y * laenge, z: z1 - z0 };
  let dnx = n.y * along.z - 0 * along.y;
  let dny = 0 * along.x - n.x * along.z;
  let dnz = n.x * along.y - n.y * along.x;
  const dnl = Math.hypot(dnx, dny, dnz) || 1;
  dnx /= dnl; dny /= dnl; dnz /= dnl;
  if (dnz < 0) { dnx = -dnx; dny = -dny; dnz = -dnz; }

  // Lauffläche (Deck), geneigt von z0 (bei a) auf z1 (bei b)
  quad(P(0, half, z0), P(laenge, half, z1), P(laenge, -half, z1), P(0, -half, z0), dnx, dny, dnz);
  // Unterseite, eben auf Geschossniveau
  quad(P(0, half, z0), P(0, -half, z0), P(laenge, -half, z0), P(laenge, half, z0), 0, 0, -1);
  // Stirnseite am Kopfende (b), senkrecht
  quad(P(laenge, half, z0), P(laenge, half, z1), P(laenge, -half, z1), P(laenge, -half, z0), d.x, d.y, 0);
  // Wangen (Seiten) — Dreiecke: die Rampe beginnt am Fusspunkt (a) auf Bodenniveau
  tri(P(0, half, z0), P(laenge, half, z0), P(laenge, half, z1), n.x, n.y, 0);
  tri(P(0, -half, z0), P(laenge, -half, z1), P(laenge, -half, z0), -n.x, -n.y, 0);

  // Sichtlinien: geneigte Deckkanten + Stirnkante oben
  edges.push(...P(0, half, z0), ...P(laenge, half, z1));
  edges.push(...P(0, -half, z0), ...P(laenge, -half, z1));
  edges.push(...P(laenge, half, z1), ...P(laenge, -half, z1));

  return {
    entityId: ramp.id,
    materialKey: 'beton',
    positions: new Float32Array(pos),
    normals: new Float32Array(nor),
    indices: new Uint32Array(idx),
    edges: new Float32Array(edges),
  };
}
