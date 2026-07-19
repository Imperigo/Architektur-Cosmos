import type { KosmoDoc } from '../model/doc';
import type { Assembly, LayerFunction, Opening, Roof, Slab, Storey, Terrain, Wall } from '../model/entities';
import { dir, normal, polygonArea, type Pt } from '../model/units';
import { openingRects, pointOnAxis, wallFrame } from '../geometry/wall';
import { difference, intersect } from '../geometry/clip';
import { materialPrioritaet } from '../model/prioritaet';
import { deriveAll, FENSTER_RAHMEN_DEFAULT_MM } from './scene';
import { clipEdges, type HlEdge, type HlTriInput } from './hiddenline';
import { dachGeometrie } from './dach';
import { abVorprojekt } from './stilblatt';

/**
 * Schnitt/Ansicht-Derivation — Mesh-Slicing mit Verdeckungsrechnung.
 *
 * Schnittebene: vertikal durch die Linie a→b. Blickrichtung = linke Normale.
 * Kanal «cut»: Dreieck∩Ebene-Segmente (schwerer Stift).
 * Kanal «projection»: Kanten der Körper vor der Ebene (feiner Stift),
 * Hidden-Line über den gemeinsamen Kern (derive/hiddenline.ts):
 * Bild = (s, z), Betrachter-Nähe w = −t (t = Abstand hinter der Ebene).
 */

export interface SectionLine2D {
  /** (s, z)-Koordinaten: s entlang der Schnittlinie ab Punkt a, z = Höhe. */
  a: { s: number; z: number };
  b: { s: number; z: number };
  classes: string[];
}

/** Geschlossene Schnittfläche eines Bauteils (Loops evenodd; Loch = eigener Loop). */
export interface SectionFace {
  loops: { s: number; z: number }[][];
  material: string;
  functionKey?: LayerFunction;
  classes: string[];
}

/**
 * SectionFace + Bauteil-Art — nur intern für die Wand↔Decke-Verschneidung
 * unten (A5); die Art bestimmt, welche Flächen gegeneinander geschnitten
 * werden, ohne dass sie Teil der öffentlichen SectionFace-Form wird.
 *
 * `entityId` (v0.8.9 E1, A1-Rest): welche Entität (Wand/Decke/Dach) die
 * Fläche erzeugt hat — für `wandWandVerschneiden` unten die einzige sichere
 * Grundlage, um bei einer Überlapp-Gruppe die Zahl der BETEILIGTEN WÄNDE zu
 * zählen (nicht die Zahl der Faces: eine Wand liefert bei mehrschichtigem
 * Aufbau mehrere Faces, die sich untereinander per Konstruktion nie
 * überlappen — `wallLayerFaces` teilt sie in disjunkte s-Bänder). Ohne diese
 * ID liesse sich ein Mehrschicht-Zweiwand-Stoss nicht von einem echten
 * >2-Wand-Knoten unterscheiden (Sanktion 5 verlangt genau diese Trennschärfe).
 */
interface RawFace extends SectionFace {
  entityKind: 'wall' | 'slab' | 'roof' | 'other';
  entityId: string;
}

export interface SectionGraphic {
  cuts: SectionLine2D[];
  projections: SectionLine2D[];
  /** Schnittflächen für Material-Poché (SIA-Schraffuren). */
  faces: SectionFace[];
  /** Terrainprofile (A2), auf die Schnittebene projiziert — leer = kein Terrain
   * gesetzt, die Renderer zeichnen dann die flache Linie bei z = 0. */
  terrain: { typ: 'gewachsen' | 'neu'; pts: { s: number; z: number }[] }[];
  /** SIA-Öffnungssymbolik (v0.7.1 E5/4B): Dreieck-/Pfeil-Linien für Fenster
   * mit gesetztem `fluegelTyp`, in derselben (s,z)-Ebene wie cuts/projections.
   * Leer, solange KEINE Öffnung ein `fluegelTyp` trägt — bestehende
   * Ansichten/Schnitte bleiben dadurch byte-identisch (Goldens-Guard). */
  fenstersymbole: SectionLine2D[];
  /** D2-Leibungslinien (v0.7.3 D1-Sammelwechsel, GOLDEN-WECHSEL-D1.md §2):
   * ab Vorprojekt (`abVorprojekt()`, Stilblatt-Weiche) trägt JEDE Öffnung im
   * Sichtbereich vor der Schnittebene ihr Öffnungsrechteck (Klasse
   * `leibung`); der Werkplan ergänzt die Rahmenlinie (Innenrechteck, Inset
   * `rahmenbreite ?? FENSTER_RAHMEN_DEFAULT_MM`, Klasse `rahmen`). Löst
   * §11.3 «konturlose Lochungen». Leer im Wettbewerb (Weiche) — dieselben
   * ehrlichen Grenzen wie `fenstersymbole` (keine Hidden-Line-Verdeckung;
   * geschnittene Öffnungen erhalten keine Leibung). */
  leibungen: SectionLine2D[];
  bounds: { minS: number; maxS: number; minZ: number; maxZ: number } | null;
}

export interface SectionSpec {
  a: Pt;
  b: Pt;
  /** Sichttiefe in mm (wie weit hinter der Ebene projiziert wird). */
  depth: number;
  /** Blick zur linken Normalen (true) oder rechten (false). */
  lookLeft: boolean;
  /** Verdeckungsrechnung (Standard an); aus = alle Kanten im Tiefenbereich. */
  hiddenLine?: boolean;
}

export function deriveSection(doc: KosmoDoc, spec: SectionSpec): SectionGraphic {
  const d = dir(spec.a, spec.b);
  const n = spec.lookLeft ? { x: -d.y, y: d.x } : { x: d.y, y: -d.x };
  const cuts: SectionLine2D[] = [];
  const projections: SectionLine2D[] = [];

  // Ebenen-Koordinaten: s = (p−a)·d, t = (p−a)·n (t>0 = vor der Kamera/hinter der Ebene)
  const toS = (x: number, y: number) => (x - spec.a.x) * d.x + (y - spec.a.y) * d.y;
  const toT = (x: number, y: number) => (x - spec.a.x) * n.x + (y - spec.a.y) * n.y;

  const edges: HlEdge[] = [];
  const tris: HlTriInput[] = [];
  const rawFaces: RawFace[] = [];

  for (const artifact of deriveAll(doc)) {
    const pos = artifact.positions;
    const idx = artifact.indices;
    const artSegs: Seg[] = [];
    // Cut: Dreiecke gegen t=0 schneiden
    for (let i = 0; i < idx.length; i += 3) {
      const pts: { s: number; t: number; z: number }[] = [];
      for (let k = 0; k < 3; k++) {
        const vi = idx[i + k]! * 3;
        const x = pos[vi]!;
        const y = pos[vi + 1]!;
        const z = pos[vi + 2]!;
        pts.push({ s: toS(x, y), t: toT(x, y), z });
      }
      const hits: { s: number; z: number }[] = [];
      for (let k = 0; k < 3; k++) {
        const p = pts[k]!;
        const q = pts[(k + 1) % 3]!;
        if ((p.t <= 0 && q.t > 0) || (p.t > 0 && q.t <= 0)) {
          const f = p.t / (p.t - q.t);
          hits.push({ s: p.s + (q.s - p.s) * f, z: p.z + (q.z - p.z) * f });
        }
      }
      if (hits.length === 2) {
        cuts.push({ a: hits[0]!, b: hits[1]!, classes: ['cut', artifact.materialKey] });
        artSegs.push({ a: hits[0]!, b: hits[1]! });
      }
      // Verdecker: Dreiecke, die (teilweise) vor der Ebene liegen — w = −t
      const [pa, pb, pc] = [pts[0]!, pts[1]!, pts[2]!];
      if (pa.t > 0 || pb.t > 0 || pc.t > 0) {
        tris.push({
          au: pa.s, av: pa.z, aw: -pa.t,
          bu: pb.s, bv: pb.z, bw: -pb.t,
          cu: pc.s, cv: pc.z, cw: -pc.t,
        });
      }
    }
    // Schnittflächen: Segmente zu Loops verketten, Wände nach Schichten teilen
    // (Vorprojekt: EIN Poché je Bauteil — Schichten erst ab Bauprojekt)
    if (artSegs.length) {
      const loops = stitchLoops(artSegs);
      if (loops.length) {
        const wall = doc.get<Wall>(artifact.entityId);
        const assembly = wall?.kind === 'wall' ? doc.get<Assembly>(wall.assemblyId) : undefined;
        const entityKind: RawFace['entityKind'] =
          wall?.kind === 'wall' ? 'wall' : doc.get<Slab>(artifact.entityId)?.kind === 'slab' ? 'slab' : 'other';
        if (
          doc.settings.phase !== 'vorprojekt' &&
          wall?.kind === 'wall' &&
          assembly?.kind === 'assembly' &&
          assembly.layers.length > 0
        ) {
          for (const f of wallLayerFaces(wall, assembly, loops, spec.a, d)) {
            rawFaces.push({ ...f, entityKind, entityId: wall.id });
          }
        } else {
          rawFaces.push({
            loops,
            material: artifact.materialKey,
            classes: ['cut-face', artifact.materialKey],
            entityKind,
            entityId: artifact.entityId,
          });
        }
      }
    }
    // Projektion: Kanten vollständig im Tiefenbereich (0 < t ≤ depth)
    const e = artifact.edges;
    for (let i = 0; i < e.length; i += 6) {
      const t1 = toT(e[i]!, e[i + 1]!);
      const t2 = toT(e[i + 3]!, e[i + 4]!);
      if (t1 > 0 && t2 > 0 && t1 <= spec.depth && t2 <= spec.depth) {
        edges.push({
          u1: toS(e[i]!, e[i + 1]!), v1: e[i + 2]!, w1: -t1,
          u2: toS(e[i + 3]!, e[i + 4]!), v2: e[i + 5]!, w2: -t2,
        });
      }
    }
  }

  // Dach (Stream A / v0.6.8, SIM-Befund H-18): scene.ts liefert für ein Roof
  // nur eine dünne Aufsichtsfläche (kein Volumen — siehe deriveRoof/
  // deriveSatteldach dort), darum liefert die generische Dreieck×Ebene-
  // Schneidung oben zwar Randlinien (bereits vorher: `cuts` enthält Dach-
  // Segmente), aber KEIN geschlossenes Poché — stitchLoops braucht einen
  // umlaufenden Rand, eine offene Schale liefert nur offene Enden.
  // derive/dach.ts verdickt dieselbe Geometrie NUR für diesen Zweck künstlich
  // zu einem wasserdichten Prisma je Dachfläche (DACH_SCHNITT_DICKE_MM,
  // symbolisch — ein Roof trägt keine Schicht-Assembly wie eine Wand).
  // Bewusst ein eigener, kleiner Block statt den Haupt-Loop oben umzubauen:
  // der bleibt unverändert, bestehende Golden-Schnitte/-Ansichten bleiben
  // dadurch byte-identisch (siehe Abschlussbericht).
  for (const roof of doc.byKind<Roof>('roof')) {
    const storey = doc.get<Storey>(roof.storeyId);
    if (!storey || storey.kind !== 'storey') continue;
    const geom = dachGeometrie(roof, storey);
    if (!geom || geom.dreiecke.length === 0) continue;
    const artSegs: Seg[] = [];
    for (const [pa, pb, pc] of geom.dreiecke) {
      const pts = [pa, pb, pc].map((p) => ({ s: toS(p.x, p.y), t: toT(p.x, p.y), z: p.z }));
      const hits: { s: number; z: number }[] = [];
      for (let k = 0; k < 3; k++) {
        const p = pts[k]!;
        const q = pts[(k + 1) % 3]!;
        if ((p.t <= 0 && q.t > 0) || (p.t > 0 && q.t <= 0)) {
          const f = p.t / (p.t - q.t);
          hits.push({ s: p.s + (q.s - p.s) * f, z: p.z + (q.z - p.z) * f });
        }
      }
      if (hits.length === 2) {
        const seg: Seg = { a: hits[0]!, b: hits[1]! };
        cuts.push({ a: seg.a, b: seg.b, classes: ['cut', 'dach'] });
        artSegs.push(seg);
      }
    }
    if (artSegs.length === 0) continue;
    const loops = stitchLoops(artSegs);
    if (loops.length) {
      rawFaces.push({ loops, material: 'dach', classes: ['cut-face', 'dach'], entityKind: 'roof', entityId: roof.id });
    }
  }

  // E1 (v0.8.9, A1-Rest): Wand↔Wand VOR Wand↔Decke/Dach — löst zuerst die
  // gruppen-INTERNEN Wand-Konflikte (degenerierte miterWallEnds-Fälle in
  // scene.ts: flacher T-Stoss-Winkel, Gehrungs-Exzess, entarteter
  // Mehrfachknoten — dort bewusst "stumpf" belassen), damit
  // wandDeckeVerschneiden im Anschluss mit der bereits bereinigten
  // Wandform gegen Decke/Dach schneidet. Mutiert die betroffenen
  // RawFace.loops in place (wie schneideZurueck unten) — dieselben
  // RawFace-Objekte stecken in `rawFaces`, die Änderung ist dort sichtbar.
  wandWandVerschneiden(doc, rawFaces.filter((f) => f.entityKind === 'wall'));
  const faces = wandDeckeVerschneiden(doc, rawFaces);

  const segments = clipEdges(edges, tris, {
    // Verdecker nur im sichtbaren Halbraum (w ≤ 0 ⇔ t ≥ 0 — weggeschnittenes zählt nicht)
    wClipMax: 0,
    ...(spec.hiddenLine === false ? { maxPairs: -1 } : {}),
  });
  for (const s of segments) {
    projections.push({
      a: { s: s.a.u, z: s.a.v },
      b: { s: s.b.u, z: s.b.v },
      classes: ['projection'],
    });
  }

  // Terrainprofile: Stützpunkte auf die Ebene projizieren (Reihenfolge bleibt)
  const terrain: SectionGraphic['terrain'] = doc
    .byKind<Terrain>('terrain')
    .filter((t) => t.punkte.length >= 2)
    .map((t) => ({ typ: t.typ, pts: t.punkte.map((p) => ({ s: toS(p.x, p.y), z: p.z })) }));

  // SIA-Öffnungssymbolik (v0.7.1 E5/4B, docs/V071-KONZEPT.md): Fenster mit
  // gesetztem `fluegelTyp` bekommen die übliche Dreieck-/Pfeil-Konvention in
  // Ansicht/Schnitt. Die Öffnungsrechtecke werden UNABHÄNGIG vom generischen
  // Mesh-Dreieck-Kanal direkt aus Wand+Opening berechnet (dieselbe Quelle
  // wie das 3D-Rahmenprofil in `derive/scene.ts`: `openingRects` + Storey-
  // Elevation) und mit toS/toT in dieselbe (s,z)-Ebene projiziert.
  //
  // Konvention (Spitze = Bandseite, Schenkel = Griff-/Gegenseite):
  //  – 'dreh': Spitze an der Bandkante (Mitte der Höhe), Schenkel zu den
  //    BEIDEN Ecken der Griffseite. Die Bandseite kommt aus `Opening.swing`
  //    (Angelseite, 0.6.9) — dieselbe Quelle wie der Flügelbogen im
  //    Grundriss, sonst widersprächen sich Grundriss und Ansicht. Die Spitze
  //    sitzt an der PROJEKTION des Bandpunkts (s des Wandachsen-Endes), nicht
  //    am Bildschirm-Minimum: von der Rückseite betrachtet erscheint ein
  //    links angeschlagenes Fenster korrekt rechts angeschlagen.
  //    `swing` fehlend = 'links' (derselbe Default wie im Grundriss).
  //  – 'kipp': Band unten — Spitze an der Unterkante (Mitte der Breite),
  //    Schenkel zu den beiden OBEREN Ecken (öffnet oben zur Raumseite).
  //  – 'drehkipp': beide Dreiecke gleichzeitig.
  //  – 'schiebe': waagrechter Doppelpfeil auf halber Höhe (Schieberichtung
  //    offen — ein Pfeil deutet «verschieblich», nicht «genau diese Seite»).
  //  – 'fest'/undefined: keine Symbolik.
  // Sichtbarkeit: wie der generische Projektions-Kanal oben nur, wenn die
  // Öffnung vor der Schnittebene liegt (0 < t ≤ depth) — KEINE volle
  // Hidden-Line-Verdeckung gegen davorstehende Bauteile (ehrlich benannt im
  // Abschlussbericht: eine verdeckte Öffnung wird nicht ausgeblendet).
  const fenstersymbole: SectionLine2D[] = [];
  for (const o of doc.byKind<Opening>('opening')) {
    if (o.openingType !== 'fenster' || !o.fluegelTyp || o.fluegelTyp === 'fest') continue;
    const wall = doc.get<Wall>(o.wallId);
    if (!wall || wall.kind !== 'wall') continue;
    const storey = doc.get<Storey>(wall.storeyId);
    if (!storey || storey.kind !== 'storey') continue;
    const r = openingRects(wall, [o])[0];
    if (!r) continue;
    const pLinks = pointOnAxis(wall, r.s0);
    const pRechts = pointOnAxis(wall, r.s1);
    const tLinks = toT(pLinks.x, pLinks.y);
    const tRechts = toT(pRechts.x, pRechts.y);
    if (!(tLinks > 0 && tRechts > 0 && tLinks <= spec.depth && tRechts <= spec.depth)) continue;
    const sA = toS(pLinks.x, pLinks.y);
    const sB = toS(pRechts.x, pRechts.y);
    const s0 = Math.min(sA, sB);
    const s1 = Math.max(sA, sB);
    const z0 = storey.elevation + r.z0;
    const z1 = storey.elevation + r.z1;
    const sMid = (s0 + s1) / 2;
    const zMid = (z0 + z1) / 2;
    // D2-Vollkonvention (v0.7.3, docs/V073-GESTALTUNG-SPEZ.md §D2, Soll 3a):
    // durchgezogen = öffnet zum Betrachter (innen, Default) — gestrichelt
    // (Kadenz 2–1 mm, `plansvg.ts` `sectionInnerSvg`) = öffnet weg (aussen,
    // `Opening.oeffnetNachAussen`). Gilt für JEDE Flügellinie dieser Öffnung
    // (Dreh/Kipp/Drehkipp/Schiebe gleichermassen), nicht nur den Dreh-Fall.
    const linie = (pA: { s: number; z: number }, pB: { s: number; z: number }, klasse: string): void => {
      fenstersymbole.push({ a: pA, b: pB, classes: ['symbol', klasse, ...(o.oeffnetNachAussen ? ['aussen'] : [])] });
    };
    if (o.fluegelTyp === 'dreh' || o.fluegelTyp === 'drehkipp') {
      const sBand = o.swing === 'rechts' ? sB : sA;
      const sGriff = o.swing === 'rechts' ? sA : sB;
      linie({ s: sBand, z: zMid }, { s: sGriff, z: z0 }, 'fluegel-dreh');
      linie({ s: sBand, z: zMid }, { s: sGriff, z: z1 }, 'fluegel-dreh');
    }
    if (o.fluegelTyp === 'kipp' || o.fluegelTyp === 'drehkipp') {
      linie({ s: sMid, z: z0 }, { s: s0, z: z1 }, 'fluegel-kipp');
      linie({ s: sMid, z: z0 }, { s: s1, z: z1 }, 'fluegel-kipp');
    }
    if (o.fluegelTyp === 'schiebe') {
      // D2-Vollkonvention: Doppelpfeil über die VOLLE Flügelbreite (vorher
      // auf 400mm/70% der Breite gekappt — das zeigte auf breiten Fenstern
      // nur einen kleinen Pfeil in der Mitte statt der SIA-üblichen
      // Vollbreiten-Konvention, s. Soll 3a «SCHIEBE»).
      const laenge = s1 - s0;
      const spitze = Math.min(laenge * 0.12, 150);
      const sLinks = s0;
      const sRechts = s1;
      linie({ s: sLinks, z: zMid }, { s: sRechts, z: zMid }, 'fluegel-schiebe');
      linie({ s: sLinks, z: zMid }, { s: sLinks + spitze, z: zMid + spitze / 2 }, 'fluegel-schiebe');
      linie({ s: sLinks, z: zMid }, { s: sLinks + spitze, z: zMid - spitze / 2 }, 'fluegel-schiebe');
      linie({ s: sRechts, z: zMid }, { s: sRechts - spitze, z: zMid + spitze / 2 }, 'fluegel-schiebe');
      linie({ s: sRechts, z: zMid }, { s: sRechts - spitze, z: zMid - spitze / 2 }, 'fluegel-schiebe');
    }
  }

  // D2-Leibungslinien (v0.7.3, s. SectionGraphic.leibungen): ab Vorprojekt
  // das Öffnungsrechteck jeder sichtbaren Öffnung (Fenster UND Türen),
  // Werkplan zusätzlich die Rahmenlinie. Dieselbe Sichtbarkeitsregel wie die
  // Flügelsymbolik oben (beide Enden 0 < t ≤ depth) — eine GESCHNITTENE
  // Öffnung (t-Vorzeichenwechsel) ist Schnitt, nicht Ansicht, und erhält
  // keine Leibung.
  const leibungen: SectionLine2D[] = [];
  if (abVorprojekt(doc.settings.phase)) {
    for (const o of doc.byKind<Opening>('opening')) {
      const wall = doc.get<Wall>(o.wallId);
      if (!wall || wall.kind !== 'wall') continue;
      const storey = doc.get<Storey>(wall.storeyId);
      if (!storey || storey.kind !== 'storey') continue;
      const r = openingRects(wall, [o])[0];
      if (!r) continue;
      const pLinks = pointOnAxis(wall, r.s0);
      const pRechts = pointOnAxis(wall, r.s1);
      const tLinks = toT(pLinks.x, pLinks.y);
      const tRechts = toT(pRechts.x, pRechts.y);
      if (!(tLinks > 0 && tRechts > 0 && tLinks <= spec.depth && tRechts <= spec.depth)) continue;
      const sA = toS(pLinks.x, pLinks.y);
      const sB = toS(pRechts.x, pRechts.y);
      const s0 = Math.min(sA, sB);
      const s1 = Math.max(sA, sB);
      const z0 = storey.elevation + r.z0;
      const z1 = storey.elevation + r.z1;
      const rechteck = (sMin: number, sMax: number, zMin: number, zMax: number, klasse: string): void => {
        const ecken = [
          { s: sMin, z: zMin },
          { s: sMax, z: zMin },
          { s: sMax, z: zMax },
          { s: sMin, z: zMax },
        ];
        for (let i = 0; i < 4; i++) {
          leibungen.push({ a: ecken[i]!, b: ecken[(i + 1) % 4]!, classes: ['symbol', klasse] });
        }
      };
      rechteck(s0, s1, z0, z1, 'leibung');
      if (doc.settings.phase === 'werkplan') {
        const rb = o.rahmenbreite ?? FENSTER_RAHMEN_DEFAULT_MM;
        if (s1 - s0 > 2 * rb && z1 - z0 > 2 * rb) {
          rechteck(s0 + rb, s1 - rb, z0 + rb, z1 - rb, 'rahmen');
        }
      }
    }
  }

  let bounds: SectionGraphic['bounds'] = null;
  for (const l of [...cuts, ...projections, ...fenstersymbole, ...leibungen]) {
    if (!bounds) {
      bounds = { minS: l.a.s, maxS: l.a.s, minZ: l.a.z, maxZ: l.a.z };
    }
    for (const p of [l.a, l.b]) {
      bounds.minS = Math.min(bounds.minS, p.s);
      bounds.maxS = Math.max(bounds.maxS, p.s);
      bounds.minZ = Math.min(bounds.minZ, p.z);
      bounds.maxZ = Math.max(bounds.maxZ, p.z);
    }
  }
  return { cuts, projections, faces, terrain, fenstersymbole, leibungen, bounds };
}

// ---------------------------------------------------------------------------
// Schnittflächen — aus den Cut-Segmenten eines Artefakts

interface Seg {
  a: { s: number; z: number };
  b: { s: number; z: number };
}

const STITCH_EPS = 0.5; // mm — Endpunkte auf diesem Raster verschmelzen

function stitchKey(p: { s: number; z: number }): string {
  return `${Math.round(p.s / STITCH_EPS)}:${Math.round(p.z / STITCH_EPS)}`;
}

/**
 * Segmente zu geschlossenen Loops verketten. Wasserdichte Meshes liefern an
 * jeder Schnittkante genau zwei Segment-Enden; offene Reste (degenerierte
 * Dreiecke, tangentiale Berührungen) werden ehrlich verworfen statt geflickt.
 */
function stitchLoops(segs: Seg[]): { s: number; z: number }[][] {
  const brauchbar = segs.filter((s) => Math.hypot(s.a.s - s.b.s, s.a.z - s.b.z) > STITCH_EPS);
  const anEnde = new Map<string, { seg: number; ende: 0 | 1 }[]>();
  for (let i = 0; i < brauchbar.length; i++) {
    for (const ende of [0, 1] as const) {
      const k = stitchKey(ende === 0 ? brauchbar[i]!.a : brauchbar[i]!.b);
      const list = anEnde.get(k) ?? [];
      list.push({ seg: i, ende });
      anEnde.set(k, list);
    }
  }
  const benutzt = new Array<boolean>(brauchbar.length).fill(false);
  const loops: { s: number; z: number }[][] = [];
  for (let start = 0; start < brauchbar.length; start++) {
    if (benutzt[start]) continue;
    benutzt[start] = true;
    const s0 = brauchbar[start]!;
    const loop = [s0.a, s0.b];
    const startKey = stitchKey(s0.a);
    let cursorKey = stitchKey(s0.b);
    let geschlossen = false;
    for (let schritt = 0; schritt < brauchbar.length; schritt++) {
      if (cursorKey === startKey) {
        geschlossen = true;
        break;
      }
      const next = (anEnde.get(cursorKey) ?? []).find((e) => !benutzt[e.seg]);
      if (!next) break;
      benutzt[next.seg] = true;
      const seg = brauchbar[next.seg]!;
      const weiter = next.ende === 0 ? seg.b : seg.a;
      loop.push(weiter);
      cursorKey = stitchKey(weiter);
    }
    if (geschlossen && loop.length >= 4) {
      loop.pop(); // Schlusspunkt = Startpunkt — nicht doppelt führen
      loops.push(loop);
    }
  }
  return loops;
}

/**
 * Wand-Schnittfläche nach Schichten teilen. Schichtgrenzen sind Ebenen
 * parallel zur Wandachse; ihr Schnitt mit der Schnittebene ist im (s,z)-Bild
 * eine SENKRECHTE Linie s = const — die Fläche wird exakt in s-Bänder
 * zerlegt. Der Versatz quer zur Wand ist affin in s: o(s) = o0 + k·s.
 */
function wallLayerFaces(
  wall: Wall,
  assembly: Assembly,
  loops: { s: number; z: number }[][],
  secA: Pt,
  secDir: { x: number; y: number },
): SectionFace[] {
  const nw = normal(wall.a, wall.b);
  const o0 = (secA.x - wall.a.x) * nw.x + (secA.y - wall.a.y) * nw.y;
  const k = secDir.x * nw.x + secDir.y * nw.y;
  const { offsetLeft } = wallFrame(wall, assembly);

  const einFace = (l: typeof loops, layer?: Assembly['layers'][number]): SectionFace => ({
    loops: l,
    material: layer?.material ?? assembly.layers[0]!.material,
    ...(layer ? { functionKey: layer.function } : {}),
    classes: ['cut-face', layer?.material ?? assembly.layers[0]!.material],
  });

  // Schnittlinie (fast) parallel zur Wand: die ganze Fläche liegt in EINER
  // Schicht — der Versatz o ist konstant; die Schicht darüber bestimmen.
  if (Math.abs(k) < 1e-6) {
    let cursor = offsetLeft;
    for (const layer of assembly.layers) {
      const lo = cursor - layer.thickness;
      if (o0 <= cursor + STITCH_EPS && o0 >= lo - STITCH_EPS) return [einFace(loops, layer)];
      cursor = lo;
    }
    return [einFace(loops)];
  }

  const out: SectionFace[] = [];
  let cursor = offsetLeft;
  for (const layer of assembly.layers) {
    const lo = cursor - layer.thickness;
    // o-Band [lo, cursor] → s-Intervall
    const s1 = (cursor - o0) / k;
    const s2 = (lo - o0) / k;
    const sMin = Math.min(s1, s2);
    const sMax = Math.max(s1, s2);
    const geclippt = loops
      .map((loop) => clipLoopSBand(loop, sMin, sMax))
      .filter((l) => l.length >= 3 && Math.abs(loopFlaeche(l)) > STITCH_EPS * STITCH_EPS);
    if (geclippt.length) out.push(einFace(geclippt, layer));
    cursor = lo;
  }
  return out;
}

function loopFlaeche(loop: { s: number; z: number }[]): number {
  let f = 0;
  for (let i = 0; i < loop.length; i++) {
    const a = loop[i]!;
    const b = loop[(i + 1) % loop.length]!;
    f += a.s * b.z - b.s * a.z;
  }
  return f / 2;
}

/** Sutherland–Hodgman gegen das senkrechte Band sMin ≤ s ≤ sMax (konvex ⇒ Loop bleibt Loop). */
function clipLoopSBand(loop: { s: number; z: number }[], sMin: number, sMax: number): { s: number; z: number }[] {
  const halb = (pts: { s: number; z: number }[], innen: (p: { s: number; z: number }) => number) => {
    const out: { s: number; z: number }[] = [];
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i]!;
      const q = pts[(i + 1) % pts.length]!;
      const dp = innen(p);
      const dq = innen(q);
      if (dp >= 0) out.push(p);
      if ((dp < 0) !== (dq < 0)) {
        const f = dp / (dp - dq);
        out.push({ s: p.s + (q.s - p.s) * f, z: p.z + (q.z - p.z) * f });
      }
    }
    return out;
  };
  return halb(halb(loop, (p) => p.s - sMin), (p) => sMax - p.s);
}

// ---------------------------------------------------------------------------
// Wand↔Decke-Verschneidung im Schnitt (V2-A5)
//
// Wände laufen per Default über die volle Geschosshöhe (wallHeights in
// derive/scene.ts), Decken liegen mit ihrer Oberkante auf OK Boden IHRES
// Geschosses (topOffset 0) und ragen mit ihrer Dicke nach unten. Steht eine
// Decke im Geschoss darüber, fällt ihr unterstes Band exakt in das oberste
// Band der Wand darunter — dieselbe (s,z)-Fläche gehört dann zu ZWEI
// Bauteilen gleichzeitig (Wandschicht UND Deckenkörper). Ohne Verschneidung
// überlagern sich Schnittfläche und Schraffur dort einfach.
//
// Löst dasselbe Problem wie der Grundriss-Poché-Join (RE-ARCHICAD A1,
// derive/plan.ts): das Material mit der HÖHEREN Priorität gewinnt die Ecke,
// das andere weicht zurück — dieselbe Prioritätstabelle (materialPrioritaet),
// nicht neu erfunden. Geschnitten wird mit der UNGESCHNITTENEN Form der
// jeweils anderen Seite (ArchiCAD-Semantik) und nur bei echter Überlappung —
// eine feste Flächenschwelle lässt reines Berühren (der häufige Normalfall:
// Wand und Decke stossen exakt an derselben Kote an, ohne Überlapp) byte-
// identisch. Gleiche Priorität (z.B. Beton-Wand trifft Beton-Decke) bleibt
// bewusst ungeschnitten — wie im Grundriss-Join.
const SZ_FUGE_FLAECHE_MM2 = 25; // 5×5 mm — Rundungsrauschen aus der (s,z)-Projektion bleibt liegen

function loopsToXY(loops: { s: number; z: number }[][]): Pt[][] {
  // Clipper2 ist int64-exakt; s ist eine Gleitkomma-Projektion (dir() liefert
  // Einheitsvektoren, keine ganzen mm) — auf den ganzen mm runden wie beim
  // Loop-Stitching oben (STITCH_EPS-Raster).
  return loops.map((loop) => loop.map((p) => ({ x: Math.round(p.s), y: Math.round(p.z) })));
}

function xyToLoops(polys: readonly (readonly Pt[])[]): { s: number; z: number }[][] {
  return polys.map((poly) => poly.map((p) => ({ s: p.x, z: p.y })));
}

/**
 * Schneidet bei ECHTER Überlappung die Flächen der niedriger priorisierten
 * Seite an der jeweils höher priorisierten zurück (allseitig: eine
 * Wandschicht kann eine Decke zurückschneiden UND umgekehrt, je nach
 * Material — seit Stream A / v0.6.8 ebenso zwischen Wand/Decke und Dach:
 * die Traufe eines Roof-Prismas (derive/dach.ts) fällt konstruktionsbedingt
 * exakt auf OK der tragenden Aussenwand, dieselbe ArchiCAD-Lücke A1 wie beim
 * Wand↔Decke-Fall).
 */
function wandDeckeVerschneiden(doc: KosmoDoc, rawFaces: RawFace[]): SectionFace[] {
  const wandFaces = rawFaces.filter((f) => f.entityKind === 'wall');
  const deckeFaces = rawFaces.filter((f) => f.entityKind === 'slab');
  const dachFaces = rawFaces.filter((f) => f.entityKind === 'roof');
  const gruppenBesetzt =
    (wandFaces.length > 0 ? 1 : 0) + (deckeFaces.length > 0 ? 1 : 0) + (dachFaces.length > 0 ? 1 : 0);
  if (gruppenBesetzt > 1) {
    // Ungeschnittene Ausgangsform je Gruppe sichern — die Verschneidung
    // schneidet immer gegen die ORIGINAL-Geometrie der anderen Seite(n), nie
    // gegen eine bereits zurückgeschnittene (Reihenfolge-Unabhängigkeit, wie
    // im Grundriss-Join).
    const wandOrig = wandFaces.map((f) => loopsToXY(f.loops));
    const deckeOrig = deckeFaces.map((f) => loopsToXY(f.loops));
    const dachOrig = dachFaces.map((f) => loopsToXY(f.loops));
    const schneideZurueck = (ziel: RawFace[], andere: { faces: RawFace[]; orig: Pt[][][] }[]) => {
      for (let i = 0; i < ziel.length; i++) {
        const f = ziel[i]!;
        const prio = materialPrioritaet(doc, f.material);
        const hoeher: Pt[][] = [];
        for (const { faces, orig } of andere) {
          for (let j = 0; j < faces.length; j++) {
            if (materialPrioritaet(doc, faces[j]!.material) > prio) hoeher.push(...orig[j]!);
          }
        }
        if (hoeher.length === 0) continue;
        const polys = loopsToXY(f.loops);
        const ueberlapp = intersect(polys, hoeher);
        const flaeche = ueberlapp.reduce((a, p) => a + Math.abs(polygonArea(p)), 0);
        if (flaeche < SZ_FUGE_FLAECHE_MM2) continue;
        f.loops = xyToLoops(difference(polys, hoeher));
      }
    };
    // Reihenfolge wie zuvor (Wand zuerst, dann Decke) + Dach neu dazu —
    // jede Gruppe schneidet gegen die ORIGINALE der jeweils ANDEREN
    // beiden, darum ist die Aufruf-Reihenfolge hier ohne Wirkung.
    schneideZurueck(wandFaces, [
      { faces: deckeFaces, orig: deckeOrig },
      { faces: dachFaces, orig: dachOrig },
    ]);
    schneideZurueck(deckeFaces, [
      { faces: wandFaces, orig: wandOrig },
      { faces: dachFaces, orig: dachOrig },
    ]);
    schneideZurueck(dachFaces, [
      { faces: wandFaces, orig: wandOrig },
      { faces: deckeFaces, orig: deckeOrig },
    ]);
  }
  const faces: SectionFace[] = [];
  for (const raw of rawFaces) {
    if (raw.loops.length === 0) continue;
    faces.push({
      loops: raw.loops,
      material: raw.material,
      ...(raw.functionKey !== undefined ? { functionKey: raw.functionKey } : {}),
      classes: raw.classes,
    });
  }
  return faces;
}

// ---------------------------------------------------------------------------
// Wand↔Wand-Verschneidung im Schnitt (v0.8.9 E1, A1-Rest)
//
// `miterWallEnds` (derive/scene.ts) gehrt die meisten Wandenden bereits
// korrekt: Winkelhalbierende bei genau zwei Wandenden, Fugenecken-Rückzug bei
// Mehrfachknoten (3+), T-Stoss bündig an die fremde Achse. Mehrere
// Degenerationsfälle bleiben dort AUSDRÜCKLICH "stumpf" (keine Retraktion,
// Kommentare dort: «streifender Winkel — stumpf lassen», «fast kolinear —
// keine Gehrung», «spitzer Winkel — Gehrungs-Exzess vermeiden», entarteter
// Mehrfachknoten mit oCcw≈oCw): der T-Stoss-Guard bei flachem Winkel
// (|dm|<0.3), der Fast-180°-Guard (|bl|<1e-6), der Gehrungs-Exzess-Guard
// (|k|>3) und `knotenEcken`, das bei singulärer Geometrie `null` liefert.
// In all diesen Fällen bleibt die Wand-Stirnfläche auf ihrer rohen
// Achsenkoordinate stehen — die 3D-Volumen zweier verschiedener Wände können
// sich dort durchdringen, und ihre Schnittflächen (RawFace, entityKind
// 'wall') überlappen echt im (s,z)-Bild. Das ist der ArchiCAD-A1-Rest für
// Wand↔Wand (Grundriss hat die Parität längst über `detectEndMiters`,
// ROADMAP 149/315).
//
// Löst wie `wandDeckeVerschneiden` oben nach `materialPrioritaet`: die höher
// priorisierte Wand bleibt unverändert (UNGESCHNITTENE Ausgangsform als
// Schnittpartner — Reihenfolge-Unabhängigkeit), die niedriger priorisierte
// weicht im Überlapp zurück. Dieselbe Fugen-Schwelle SZ_FUGE_FLAECHE_MM2
// (reines Berühren an der gemeinsamen Fuge bleibt byte-still). Zwei
// verschiedene Schichten DERSELBEN Wand überlappen sich per Konstruktion nie
// (`wallLayerFaces` teilt eine Wand in disjunkte s-Bänder) — jede über der
// Schwelle liegende Überlappung ist darum automatisch ein Zwei- (oder Mehr-)
// Wand-Fall, nie ein Selbst-Treffer (siehe entityId-Filter unten).
//
// Tie-Break-Entscheid (dokumentiert, wie verlangt): GLEICHE Priorität bleibt
// bewusst ungeschnitten — keine Wand gewinnt, keine weicht. Das ist exakt
// der Tie-Break, den `wandDeckeVerschneiden` bereits für Wand/Decke/Dach
// benutzt (strikt `>`, nicht `>=`) und den der Grundriss-Poché-Join für
// gleiche Priorität ebenso anwendet — hier bewusst NICHT neu erfunden:
// ein zweiter, abweichender Tie-Break im selben Modell wäre ein stiller
// Bruch der A1-Semantik-Parität zwischen Grundriss und Schnitt, ohne
// erkennbaren fachlichen Gewinn (byte-stiller Bestand ist im Zweifel die
// sicherere Wahl als ein erfundenes Gewinnkriterium wie ID- oder
// Erstellungsreihenfolge).
//
// Sanktion 5 (>2-Wand-Knoten kontrolliert auslassen, nie still falsch
// verschneiden): Faces bilden über die "echte Überlappung"-Relation
// Zusammenhangsgruppen (Transitivität — A überlappt B, B überlappt C ⇒ eine
// Gruppe). Zählt eine Gruppe MEHR als zwei verschiedene `entityId`s
// (Wand-Identität, nicht Face-Zahl — eine mehrschichtige Wand darf beide
// Nachbarn stellen), bleibt die GESAMTE Gruppe unangetastet: kein Face darin
// wird geschnitten, auch nicht die Paare, die isoliert betrachtet einen
// gültigen Zwei-Wand-Fall wären — sonst würde bei einem >2-Knoten ein
// willkürliches Teilpaar "gewinnen", je nach Bearbeitungsreihenfolge, und
// genau das verbietet Sanktion 5 ("kein stilles Falschbild").
function wandWandVerschneiden(doc: KosmoDoc, wallFaces: RawFace[]): void {
  if (wallFaces.length < 2) return;
  // Ungeschnittene Ausgangsform je Face sichern — jede Verschneidung im
  // Verlauf dieser Funktion schneidet gegen diesen Schnappschuss, nie gegen
  // eine bereits zurückgeschnittene Nachbarform (Reihenfolge-Unabhängigkeit,
  // wie in wandDeckeVerschneiden/schneideZurueck oben).
  const orig = wallFaces.map((f) => loopsToXY(f.loops));

  // Paarweise ECHTE Überlappung zwischen Faces verschiedener Wände einsammeln
  // (Fugen-Schwelle, keine blosse Berührung) — Grundlage für die
  // Zusammenhangsgruppen unten.
  const nachbarn = new Map<number, Set<number>>();
  const verbinde = (i: number, j: number): void => {
    if (!nachbarn.has(i)) nachbarn.set(i, new Set());
    if (!nachbarn.has(j)) nachbarn.set(j, new Set());
    nachbarn.get(i)!.add(j);
    nachbarn.get(j)!.add(i);
  };
  for (let i = 0; i < wallFaces.length; i++) {
    for (let j = i + 1; j < wallFaces.length; j++) {
      if (wallFaces[i]!.entityId === wallFaces[j]!.entityId) continue; // eigene Wand nie gegen sich selbst
      const ueberlapp = intersect(orig[i]!, orig[j]!);
      const flaeche = ueberlapp.reduce((a, p) => a + Math.abs(polygonArea(p)), 0);
      if (flaeche < SZ_FUGE_FLAECHE_MM2) continue;
      verbinde(i, j);
    }
  }
  if (nachbarn.size === 0) return;

  // Zusammenhangskomponenten über die Überlapp-Relation (BFS — die
  // Gruppengrössen sind winzig, ein eigener Union-Find wäre Overkill).
  const besucht = new Set<number>();
  for (const start of nachbarn.keys()) {
    if (besucht.has(start)) continue;
    const gruppe: number[] = [];
    const stack = [start];
    besucht.add(start);
    while (stack.length > 0) {
      const cur = stack.pop()!;
      gruppe.push(cur);
      for (const n of nachbarn.get(cur) ?? []) {
        if (!besucht.has(n)) {
          besucht.add(n);
          stack.push(n);
        }
      }
    }

    const wandIds = new Set(gruppe.map((i) => wallFaces[i]!.entityId));
    if (wandIds.size > 2) continue; // Sanktion 5 — kontrolliert auslassen, nie raten

    // Genau zwei Wände: jedes Face gegen die ORIGINAL-Faces der jeweils
    // ANDEREN Wand mit STRIKT höherer Priorität zurückschneiden (strikt `>`
    // — der dokumentierte Tie-Break oben).
    for (const i of gruppe) {
      const f = wallFaces[i]!;
      const prio = materialPrioritaet(doc, f.material);
      const hoeher: Pt[][] = [];
      for (const j of gruppe) {
        if (wallFaces[j]!.entityId === f.entityId) continue;
        if (materialPrioritaet(doc, wallFaces[j]!.material) > prio) hoeher.push(...orig[j]!);
      }
      if (hoeher.length === 0) continue;
      const polys = loopsToXY(f.loops);
      const ueberlapp = intersect(polys, hoeher);
      const flaeche = ueberlapp.reduce((a, p) => a + Math.abs(polygonArea(p)), 0);
      if (flaeche < SZ_FUGE_FLAECHE_MM2) continue;
      f.loops = xyToLoops(difference(polys, hoeher));
    }
  }
}
