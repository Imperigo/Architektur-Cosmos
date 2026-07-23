import { columnOutline, type Aussparung, type Beam, type Boundary, type Assembly, type Column, type Gelaender, type GridAxis, type MassKette, type Opening, type Rampe, type Roof, type Stair, type Storey, type Wall, type Zone, type ZonenTuer } from '../model/entities';
import type { KosmoDoc } from '../model/doc';
import { difference, intersect, union, type Poly } from '../geometry/clip';
import { materialPrioritaet } from '../model/prioritaet';
import {
  axisDirection,
  openingRects,
  wallFrame,
  pointOnAxis,
} from '../geometry/wall';
import { dist, formatLength, normal, polygonArea, pt, type Pt } from '../model/units';
import { treppenTeile } from './treppe';
import { gelaenderTeile } from './gelaender';
import { rampenTeile } from './rampe';
import { meshSchnittRinge } from './mesh-topo';
import { dachGeometrie } from './dach';
import { pocheEntscheid } from './poche';
import { fruehePhase, type BauPhase } from '../model/doc';
import { beschlagTyp } from './beschlag';

/** Standard-Schnitthöhe des Grundrisses über Geschoss-OK (SIA-üblich 1 m) —
 * die Ebene, auf der FreeMesh-Körper ihre ehrliche Schnittfigur zeigen. */
export const PLAN_SCHNITTHOEHE = 1000;

/**
 * D3-Kontext-LOD-Treppe (v0.7.3 §D3, `docs/V073-GESTALTUNG-SPEZ.md`, Soll
 * 4b): welche Darstellungsstufe Nachbar-Kontext in einer `BauPhase` verlangt
 * — `'fill'` (Wettbewerb/Vorprojekt) · `'umriss'` (Bauprojekt/Baueingabe,
 * nur Kontur) · `'aus'` (Werkplan, Nachbarn ganz weg). Reine, kleine
 * Hilfsfunktion — der Druckweg (`plansvg.ts` `planInnerSvg`) verdrahtet sie
 * bereits; der Live-Plan (`PlanView.tsx` `plan-kontext`-Layer, S1-Revier)
 * liest die Zonen bisher direkt aus dem Doc statt über `derivePlan` (eigener
 * Overlay, Kommentar dort «fliessen nicht durch derivePlan») und braucht
 * darum eine EIGENE Verdrahtung dieser Funktion — s. GOLDEN-WECHSEL-S4.md
 * §Offene Punkte, nicht Teil dieses Streams (S4 darf `PlanView.tsx` nicht
 * ändern). Der Aufrufer wählt dann nur noch die Farbe («Papier ist Papier»:
 * Druck hart kodiert, Live-Plan `var()`), die Stufe kommt von hier.
 */
export type KontextStufe = 'fill' | 'umriss' | 'aus';
export function nachbarKontextStufe(phase: BauPhase): KontextStufe {
  if (phase === 'werkplan') return 'aus';
  if (phase === 'wettbewerb' || phase === 'vorprojekt') return 'fill';
  return 'umriss';
}

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
  /** Zeilen-Index für mehrzeilige Beschriftungen (A6) — der Renderer
   * versetzt um zeile × Zeilenhöhe (massstabsabhängig); fehlt = 0. */
  zeile?: number;
}

/** K18 (v0.9.0, Owner-Register): EIN Masskette-Segment in Weltkoordinaten.
 * Die Ableitung liefert nur die MESSPUNKTE + das fertige Mass — die
 * Zeichen-Geometrie (Masslinie mit Papier-Abstand, Verlängerungslinien)
 * entsteht massstabsbewusst erst im Renderer (`plansvg.ts`), weil der
 * «gesunde Abstand» ein Papiermass ist und derivePlan keinen Massstab
 * kennt. */
export interface PlanMasskette {
  a: Pt;
  b: Pt;
  /** Fertig formatiertes Mass (mm gerundet, `formatLength`). */
  label: string;
}

export interface PlanGraphic {
  storeyId: string;
  regions: PlanRegion[];
  lines: PlanLine[];
  arcs: PlanArc[];
  axes: PlanAxis[];
  texte: PlanText[];
  /** K18: Masskette-Segmente (Daten-Guard: leer ohne MassKette-Entität). */
  massketten: PlanMasskette[];
  /** Bounding-Box in mm (für viewBox). */
  bounds: { minX: number; minY: number; maxX: number; maxY: number } | null;
}

/** Beschlag-Katalog S0 (v0.7.3 §D6): trägt die Öffnung mindestens eines der
 * additiven Beschlag-Felder? Daten-Guard für den Werkplan-Beschlag-Block
 * unten — ohne diese Felder bleibt der Grundriss byte-identisch. */
function hatBeschlag(o: Opening): boolean {
  return o.band !== undefined || o.griffseite !== undefined || o.antrieb === true || o.absturzsicherung === true;
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

/**
 * A3/ROADMAP 149 — echte 2D-Eck-Miter im Grundriss-Poché.
 *
 * Ohne Miter endet jede Wandschicht flach am Achsendpunkt: an einer
 * Aussenecke überlappen sich die Rechtecke zweier Wände nur in einem Viertel
 * des Wanddicke×Wanddicke-Knotenstücks, der Rest bleibt Lücke (ROADMAP 141 T2
 * / docs/V1-TESTBEFUNDE-LAPTOP.md). Die Lösung: an jedem Wandende, das exakt
 * eine zweite Wand trifft, wird die flache Stirnkante durch den echten
 * Gehrungsschnitt ersetzt — den Schnittpunkt der verlängerten Schichtgrenzen
 * beider Wände. Für jede Schichtgrenze im Abstand o von der Wandachse gilt:
 * neuer Eckpunkt = Achsenpunkt + Verlängerungsrichtung·(k·o) + Normale·o,
 * wobei k aus dem 2×2-Gleichungssystem der beiden Wandrichtungen folgt (siehe
 * detectEndMiters) — linear in o, weil die Achsen sich immer bei o=0 treffen.
 *
 * Nur bei EXAKT zwei Wänden am selben Endpunkt, GLEICHEM Aufbau (assemblyId)
 * und GLEICHER Ausrichtung lösbar (die Versatz-Werte müssen für beide Wände
 * identisch sein) — sonst bleibt die Ecke ehrlich stumpf wie zuvor. Entartete
 * Winkel (nahe 0°/180°, oder eine Verlängerung, die unplausibel weit über die
 * Wandlänge hinausschiesst) fallen ebenfalls auf die alte flache Ecke zurück.
 */
interface EndMiter {
  /** Richtung, in der sich die Wand über den Achsenpunkt hinaus verlängert. */
  extDir: { x: number; y: number };
  /** Verlängerung Δ(o) = k·o entlang extDir, je Schichtgrenze im Abstand o. */
  k: number;
}

function endMiterKey(wallId: string, end: 'a' | 'b'): string {
  return `${wallId}:${end}`;
}

function detectEndMiters(doc: KosmoDoc, walls: readonly Wall[]): Map<string, EndMiter> {
  const result = new Map<string, EndMiter>();
  const byPoint = new Map<string, { wall: Wall; end: 'a' | 'b' }[]>();
  const keyOf = (p: Pt) => `${p.x},${p.y}`;
  for (const w of walls) {
    if (dist(w.a, w.b) < 1) continue; // entartete Wand ohne Länge
    for (const end of ['a', 'b'] as const) {
      const p = end === 'a' ? w.a : w.b;
      const k = keyOf(p);
      const arr = byPoint.get(k) ?? [];
      arr.push({ wall: w, end });
      byPoint.set(k, arr);
    }
  }
  for (const entries of byPoint.values()) {
    // Nur echte 2-Wand-Ecken — T-Stösse/Mehrfachknoten bleiben stumpf (kein
    // eindeutiger Gehrungspartner).
    if (entries.length !== 2) continue;
    const [ea, eb] = entries as [{ wall: Wall; end: 'a' | 'b' }, { wall: Wall; end: 'a' | 'b' }];
    if (ea.wall.id === eb.wall.id) continue;
    const wallA = ea.wall;
    const wallB = eb.wall;
    if (wallA.assemblyId !== wallB.assemblyId || wallA.alignment !== wallB.alignment) continue;
    const assembly = doc.get<Assembly>(wallA.assemblyId);
    if (!assembly || assembly.kind !== 'assembly' || assembly.layers.length === 0) continue;

    const dirA = axisDirection(wallA);
    const dirB = axisDirection(wallB);
    // Verlängerungsrichtung: über das Wandende hinaus, in die Ecke hinein.
    const extDirA = ea.end === 'b' ? dirA : { x: -dirA.x, y: -dirA.y };
    const extDirB = eb.end === 'b' ? dirB : { x: -dirB.x, y: -dirB.y };
    const cross = extDirA.x * extDirB.y - extDirA.y * extDirB.x;
    // |cross| < 0.08 ≈ Winkel < 4.6° oder > 175.4° — entartete Spitze bzw.
    // gerade Durchlauf-Fuge (dort ist die Ecke ohnehin schon lückenlos).
    if (Math.abs(cross) < 0.08) continue;

    const perpA = normal(wallA.a, wallA.b);
    const perpB = normal(wallB.a, wallB.b);
    // Wicklungs-Konsistenz: die «linke» Offset-Seite (+perp = offsetLeft) beider
    // Wände muss geometrisch dieselbe Gebäudeseite meinen. Eine Nachbarwand, die
    // «verkehrt» gezeichnet wurde (a/b vertauscht), trägt ihre asymmetrischen
    // Schichten schon in `wallOutline` auf der falschen Seite; die Gehrung würde
    // die beiden Umrisse dann zwar verbinden, aber die Schicht ins Gebäude-Innere
    // legen. Prüfung: die Away-Achse der jeweils ANDEREN Wand (vom Eckpunkt weg)
    // muss auf konsistenter Seite der eigenen +perp-Richtung liegen. Ist das
    // Produkt negativ (inkonsistent gewickelt), bleibt die Ecke ehrlich stumpf.
    const cornerA = ea.end === 'a' ? wallA.a : wallA.b;
    const cornerB = eb.end === 'a' ? wallB.a : wallB.b;
    const awayA = ea.end === 'a' ? wallA.b : wallA.a; // A's fernes Ende
    const awayB = eb.end === 'a' ? wallB.b : wallB.a; // B's fernes Ende
    const uA = { x: awayA.x - cornerA.x, y: awayA.y - cornerA.y };
    const uB = { x: awayB.x - cornerB.x, y: awayB.y - cornerB.y };
    const sideA = perpA.x * uB.x + perpA.y * uB.y;
    const sideB = perpB.x * uA.x + perpB.y * uA.y;
    if (sideA * sideB < 0) continue; // inkonsistente Wicklung → stumpfe Ecke
    const rhsX = perpB.x - perpA.x;
    const rhsY = perpB.y - perpA.y;
    const det = -cross;
    const kA = (rhsX * -extDirB.y - -extDirB.x * rhsY) / det;
    const kB = (extDirA.x * rhsY - rhsX * extDirA.y) / det;
    if (!Number.isFinite(kA) || !Number.isFinite(kB)) continue;

    const frame = wallFrame(wallA, assembly);
    const maxOffset = Math.max(frame.offsetLeft, frame.offsetRight, 1);
    const totalThickness = frame.offsetLeft + frame.offsetRight;
    const cap = Math.max(2000, 20 * totalThickness);
    const deltaA = Math.abs(kA) * maxOffset;
    const deltaB = Math.abs(kB) * maxOffset;
    const lenA = dist(wallA.a, wallA.b);
    const lenB = dist(wallB.a, wallB.b);
    // Ehrlicher Rückfall: eine Verlängerung, die die Kappungsgrenze oder gar
    // 90 % der eigenen Wandlänge übersteigt, ist kein plausibler Eckstoss
    // mehr (sehr spitzer Winkel) — dann bleibt die alte stumpfe Ecke.
    if (deltaA > cap || deltaB > cap || deltaA > lenA * 0.9 || deltaB > lenB * 0.9) continue;

    result.set(endMiterKey(wallA.id, ea.end), { extDir: extDirA, k: kA });
    result.set(endMiterKey(wallB.id, eb.end), { extDir: extDirB, k: kB });
  }
  return result;
}

/** Eckpunkt einer Schichtgrenze (Abstand o von der Achse) an einem Wandende —
 * mit Miter, falls `endMiters` einen Eintrag für dieses Ende trägt, sonst
 * exakt der alte flache Punkt (byte-identisch zu vorher). */
function miteredCorner(wall: Wall, end: 'a' | 'b', o: number, endMiters: Map<string, EndMiter>): Pt {
  const base = end === 'a' ? wall.a : wall.b;
  const perp = normal(wall.a, wall.b);
  const miter = endMiters.get(endMiterKey(wall.id, end));
  if (!miter) return pt(base.x + perp.x * o, base.y + perp.y * o);
  const delta = miter.k * o;
  return pt(
    base.x + miter.extDir.x * delta + perp.x * o,
    base.y + miter.extDir.y * delta + perp.y * o,
  );
}

/** Wie `wallOutline` (geometry/wall.ts), aber mit Eck-Miter an erkannten Wandenden. */
function wallOutlineMitered(wall: Wall, assembly: Assembly, endMiters: Map<string, EndMiter>): Pt[] {
  const { offsetLeft, offsetRight } = wallFrame(wall, assembly);
  return [
    miteredCorner(wall, 'a', offsetLeft, endMiters),
    miteredCorner(wall, 'b', offsetLeft, endMiters),
    miteredCorner(wall, 'b', -offsetRight, endMiters),
    miteredCorner(wall, 'a', -offsetRight, endMiters),
  ];
}

/** Wie `wallLayerOutlines` (geometry/wall.ts), aber mit Eck-Miter an erkannten Wandenden. */
function wallLayerOutlinesMitered(
  wall: Wall,
  assembly: Assembly,
  endMiters: Map<string, EndMiter>,
): { material: string; outline: Pt[] }[] {
  const { offsetLeft } = wallFrame(wall, assembly);
  const out: { material: string; outline: Pt[] }[] = [];
  let cursor = offsetLeft;
  for (const layer of assembly.layers) {
    const o1 = cursor;
    const o2 = cursor - layer.thickness;
    out.push({
      material: layer.material,
      outline: [
        miteredCorner(wall, 'a', o1, endMiters),
        miteredCorner(wall, 'b', o1, endMiters),
        miteredCorner(wall, 'b', o2, endMiters),
        miteredCorner(wall, 'a', o2, endMiters),
      ],
    });
    cursor = o2;
  }
  return out;
}

export function derivePlan(doc: KosmoDoc, storeyId: string): PlanGraphic {
  const storey = doc.get<Storey>(storeyId);
  const regions: PlanRegion[] = [];
  const lines: PlanLine[] = [];
  const arcs: PlanArc[] = [];
  const axes: PlanAxis[] = [];
  const texte: PlanText[] = [];
  const massketten: PlanMasskette[] = [];
  if (!storey || storey.kind !== 'storey') {
    return { storeyId, regions, lines, arcs, axes, texte, massketten, bounds: null };
  }

  const walls = doc
    .byKind<Wall>('wall')
    .filter((w) => w.storeyId === storeyId);

  // A3/ROADMAP 149: echte 2D-Eck-Miter — je Wandende, das exakt eine zweite
  // Wand mit gleichem Aufbau trifft, ersetzt die Verlängerungsrechnung die
  // flache Stirnkante (siehe detectEndMiters oben).
  const endMiters = detectEndMiters(doc, walls);

  // Schichten sammeln: tragend gruppiert nach Material (Join), Rest pro Wand.
  // Join-Schlüssel enthält den Umbau-Status: Neu vereinigt sich nur mit Neu,
  // Bestand mit Bestand — Abbruch bleibt pro Wand (Kreuz je Bauteil).
  const coreByMaterial = new Map<string, Poly[]>();
  // Dünnste beitragende Schichtdicke je Join-Schlüssel — die Verschneidungs-
  // schwelle unten skaliert damit (dünne Bekleidung braucht wenig Überlappungs-
  // länge, um an einer echten Ecke zu greifen).
  const coreDicke = new Map<string, number>();
  const otherLayers: { material: string; fn: string; ren?: string; polys: Poly[]; dicke: number }[] = [];
  const renClasses = (ren?: string): string[] => (ren ? [`renovation-${ren}`] : []);

  const phase = doc.settings.phase;
  // Poché-Geometrie (v0.7.0 E2, `derive/poche.ts`): EIN Poché über die
  // Gesamtdicke (Wettbewerb/Vorprojekt bzw. modus 'schwarz' in diesen
  // Phasen) statt der früheren reinen `phase === 'vorprojekt'`-Abfrage —
  // `klassen`/`kontext` sind hier ohne Bedeutung (nur `einDeckung` zählt,
  // eine Geometrie-Entscheidung VOR der Schichtbildung, unabhängig von der
  // späteren Füllung je Region in `plansvg.ts`).
  const einDeckung = pocheEntscheid({
    phase,
    modus: doc.settings.pocheModus ?? 'phase',
    klassen: { tragend: false, daemmung: false, projektion: false },
    kontext: 'grundriss',
  }).einDeckung;
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
      // Abbruch (SIA-Umbau-Lesart, K2-bereinigt): EIN Poché über die
      // Gesamtdicke — die Schichten sind egal, es kommt weg. Nicht vereinigt
      // (jedes Bauteil bleibt eine eigene Fläche). Owner-Rundgang 0.6.2 (S. 18):
      // KEIN Diagonalkreuz mehr über die ganze Wand (SIA 400 kennt die gelbe
      // Signatur als Fläche, kein Bauteil-X) — die gelbe Tönung + der
      // gestrichelte Abbruch-Stift (plansvg.ts/PlanView.tsx) sind Signatur genug.
      const outline = wallOutlineMitered(wall, assembly, endMiters);
      const cutPolys: Poly[] = strips.length > 0 ? difference([outline], strips) : [outline];
      const material = assembly.layers.find((l) => l.function === 'tragend')?.material ?? 'masse';
      if (cutPolys.length > 0) {
        regions.push({
          rings: groupRings(cutPolys.map((p) => [...p])),
          classes: ['cut', 'tragend', `material-${material}`, 'renovation-abbruch'],
        });
      }
    } else if (einDeckung) {
      // Wettbewerb/Vorprojekt (bzw. modus 'schwarz' in diesen Phasen, E2):
      // Wand als EIN Poché über die Gesamtdicke — keine Schichten
      const outline = wallOutlineMitered(wall, assembly, endMiters);
      const cutPolys: Poly[] = strips.length > 0 ? difference([outline], strips) : [outline];
      const key = `masse|${ren ?? ''}`;
      const arr = coreByMaterial.get(key) ?? [];
      arr.push(...cutPolys);
      coreByMaterial.set(key, arr);
      const dicke = assembly.layers.reduce((s, l) => s + l.thickness, 0);
      coreDicke.set(key, Math.min(coreDicke.get(key) ?? Infinity, dicke));
    } else {
      for (const layer of wallLayerOutlinesMitered(wall, assembly, endMiters)) {
        const meta = assembly.layers.find((l) => l.material === layer.material);
        const cutPolys: Poly[] =
          strips.length > 0 ? difference([layer.outline], strips) : [layer.outline];
        if (meta?.function === 'tragend') {
          const key = `${layer.material}|${ren ?? ''}`;
          const arr = coreByMaterial.get(key) ?? [];
          arr.push(...cutPolys);
          coreByMaterial.set(key, arr);
          coreDicke.set(key, Math.min(coreDicke.get(key) ?? Infinity, meta.thickness));
        } else if (meta) {
          otherLayers.push({
            material: layer.material,
            fn: meta.function,
            ...(ren ? { ren } : {}),
            polys: cutPolys,
            dicke: meta.thickness,
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
      if (fruehePhase(phase)) {
        // Wettbewerb/Vorprojekt: Öffnung als Aussparung — Fenster mit EINER Glaslinie, Tür ohne Symbol
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
        // v0.6.9 Stream A (docs/FENSTER-KONZEPT.md): parametrische Fenster —
        // Teilungslinien + Öffnungsflügel-Bogen NUR bei gesetztem fensterTyp
        // (Alt-Fenster ohne das Feld bleiben byte-identisch, Goldens-Guard).
        if (o.fensterTyp) {
          // Teilung: Zweiflügel ohne explizite Teilung = Mittelsprosse (n=2);
          // Fensterband trägt seine Pfostenzahl in teilung.n («Pfostentakt»
          // im Doppellinien-Band).
          const effN = Math.max(1, o.teilung?.n ?? (o.fensterTyp === 'zweifluegel' ? 2 : 1));
          const feld = (r.s1 - r.s0) / effN;
          for (let i = 1; i < effN; i++) {
            const s = r.s0 + i * feld;
            lines.push({ a: at(s, mid - 25), b: at(s, mid + 25), classes: ['symbol', 'fenster', ...oRen] });
          }
          // H-42: Öffnungsflügel-Bogen abschaltbar (Default an, s. `doc.ts`
          // `fensterBoegen`-Kommentar) — Owner-Schalter im Projekt-Menü.
          if (
            (o.fensterTyp === 'einfluegel' || o.fensterTyp === 'zweifluegel') &&
            doc.settings.fensterBoegen !== false
          ) {
            // Öffnungsbogen — dieselbe Winkelkonvention wie das Türsymbol
            // (Angel auf der L-Seite, Schwenk über die Wand-Normale), aber
            // eigene Klasse 'fenster-bogen' (Renderer/Export unterscheidbar).
            const fluegelBogen = (hingeS: number, radius: number, nachAnfang: boolean): void => {
              const hingePt = at(hingeS, L);
              const normalAngle = Math.atan2(n.y, n.x);
              const toward = nachAnfang ? Math.atan2(-d.y, -d.x) : Math.atan2(d.y, d.x);
              arcs.push({
                center: hingePt,
                radius,
                startAngle: Math.min(normalAngle, toward),
                endAngle: Math.max(normalAngle, toward),
                classes: ['symbol', 'fenster-bogen', ...oRen],
              });
            };
            const width = r.s1 - r.s0;
            if (o.fensterTyp === 'einfluegel') {
              // swing 'rechts': Angel am Öffnungsende, Flügel schwenkt zurück
              fluegelBogen(o.swing === 'rechts' ? r.s1 : r.s0, width, o.swing === 'rechts');
            } else {
              // Zweiflügel: beide Flügel schwenken zur Mitte
              fluegelBogen(r.s0, width / 2, false);
              fluegelBogen(r.s1, width / 2, true);
            }
          }
        }
        // v0.7.1 E5/4B (docs/V071-KONZEPT.md): Flügeltyp-Symbolik im
        // Grundriss — additiv, UNABHÄNGIG von fensterTyp (steht auf jeder
        // Fenster-Öffnung, ob parametrisch oder nicht). Bestehende
        // Flügelbögen + der `fensterBoegen`-Schalter (0.7.0) bleiben
        // unverändert; ohne `fluegelTyp` passiert HIER nichts (Goldens-Guard).
        if (o.fluegelTyp === 'kipp' || o.fluegelTyp === 'drehkipp') {
          // Kurzes Doppelstrich-Symbol am Flügel: zwei kurze, feine Striche
          // quer zur Wand, symmetrisch um die Öffnungsmitte (der Grundriss
          // kann die Bandseite eines Kipp-Flügels — Unterkante — nicht
          // zeigen, das leistet erst die Ansicht; das Doppelstrich-Symbol ist
          // hier reiner Typ-Hinweis, keine Bandrichtung).
          const sMitte = (r.s0 + r.s1) / 2;
          const tickAbstand = 120;
          const tickHalb = 30;
          lines.push({
            a: at(sMitte - tickAbstand / 2, mid - tickHalb),
            b: at(sMitte - tickAbstand / 2, mid + tickHalb),
            classes: ['symbol', 'fluegel-kipp', ...oRen],
          });
          lines.push({
            a: at(sMitte + tickAbstand / 2, mid - tickHalb),
            b: at(sMitte + tickAbstand / 2, mid + tickHalb),
            classes: ['symbol', 'fluegel-kipp', ...oRen],
          });
        }
        if (o.fluegelTyp === 'schiebe') {
          // Versetzte Doppellinie: zwei halbe Glaslinien, je zur Hälfte der
          // Öffnungsbreite, in der Mitte leicht überlappend und quer zur Wand
          // gegeneinander versetzt (off ±40 statt der einen Glasebene bei
          // ±25) — die klassische Grundriss-Symbolik zweier gegeneinander
          // verschieblicher Scheiben.
          const halbBreite = (r.s1 - r.s0) / 2;
          const ueberlapp = Math.min(halbBreite * 0.15, 150);
          lines.push({
            a: at(r.s0, mid - 40),
            b: at(r.s0 + halbBreite + ueberlapp, mid - 40),
            classes: ['symbol', 'fluegel-schiebe', ...oRen],
          });
          lines.push({
            a: at(r.s1 - halbBreite - ueberlapp, mid + 40),
            b: at(r.s1, mid + 40),
            classes: ['symbol', 'fluegel-schiebe', ...oRen],
          });
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
  const joinGruppen: { polys: Pt[][]; prio: number; classes: string[]; dicke: number }[] = [];
  for (const [key, polys] of coreByMaterial) {
    const merged = union(polys as Poly[]);
    if (merged.length === 0) continue;
    const [material, ren] = key.split('|');
    joinGruppen.push({
      polys: merged,
      prio: materialPrioritaet(doc, material!),
      classes: ['cut', 'tragend', `material-${material}`, ...renClasses(ren || undefined)],
      dicke: coreDicke.get(key) ?? 100,
    });
  }
  for (const layer of otherLayers) {
    if (layer.polys.length === 0) continue;
    joinGruppen.push({
      polys: layer.polys.map((p) => [...p]),
      prio: materialPrioritaet(doc, layer.material),
      classes: ['cut', layer.fn, `material-${layer.material}`, ...renClasses(layer.ren)],
      dicke: layer.dicke,
    });
  }
  // Verschneidungsprioritäten (RE-ARCHICAD A1): die höhere Priorität schneidet
  // die niedrigere — Beton stösst durch, Dämmung weicht. Geschnitten wird nur
  // bei ECHTER Überlappung, Fugen-Slivers zählen nicht; blosses Anstossen lässt
  // die Polygone byte-identisch (Golden-Verträglichkeit). Die Schwelle skaliert
  // mit der EIGENEN Schichtdicke (mm-Länge × Dicke) statt einer festen
  // Flächenzahl: eine feste 0.01-m²-Schwelle verlangt bei einer 15–20-mm-
  // Bekleidung (Putz) eine Überlappungslänge von 500–650 mm, damit blieb sie an
  // echten Aussenecken unbeschnitten und ragte sichtbar in die Nachbarwand
  // hinein («komische Ecke» — Putz/Dämmung eines Bauteils überlagerte den
  // Körper des anschliessenden). Mit der Dicke skaliert genügt schon wenige mm
  // Länge, um zu greifen — deutlich über jedem realistischen Rundungsrauschen.
  // Geschnitten wird mit den UNGESCHNITTENEN Flächen der höheren Gruppen
  // (ArchiCAD-Semantik: die Geometrie der höheren gewinnt überall).
  const FUGE_LAENGE_MM = 5;
  const original = joinGruppen.map((g) => g.polys);
  for (let i = 0; i < joinGruppen.length; i++) {
    const g = joinGruppen[i]!;
    const hoeher: Pt[][] = [];
    for (let j = 0; j < joinGruppen.length; j++) {
      if (joinGruppen[j]!.prio > g.prio) hoeher.push(...original[j]!);
    }
    if (hoeher.length === 0) continue;
    const ueberlapp = intersect(g.polys, hoeher);
    const flaeche = ueberlapp.reduce((a, p) => a + Math.abs(polygonArea(p)), 0);
    const schwelle = Math.max(g.dicke, 1) * FUGE_LAENGE_MM;
    if (flaeche < schwelle) continue;
    g.polys = difference(g.polys, hoeher);
  }
  for (const g of joinGruppen) {
    if (g.polys.length === 0) continue;
    regions.push({ rings: groupRings(g.polys), classes: g.classes });
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

  // v0.9.1 P-B3 (`docs/V091-SPEZ.md` §P-B3, GOLDEN-WECHSEL-091 — der EINE
  // Golden-Zug der Version): Geländer + Rampe im Druckweg, beide hinter
  // Daten-Guards (Muster MassKette unten, Golden-Politik §0.5) — keines der
  // 39 Bestands-SVG-Fixtures trägt eine gelaender-/ramp-Entität, alle
  // bleiben byte-identisch; der EINE neue Golden `gelaender-rampe-plan.svg`
  // beweist den aktiven Zweig. Die Geometrie kommt aus DENSELBEN
  // Zerlegungen wie 3D und App-Overlay (`gelaenderTeile`/`rampenTeile` —
  // eine Wahrheit, kein zweiter Rechenweg).
  //
  // Geländer: Polylinie + Pfosten-Ticks (kurzer Querstrich je Pfosten, quer
  // zum jeweiligen Segment — Hochbau-Konvention «Linie mit Ticks»). Jeder
  // Pfosten wird genau EINEM Segment zugeordnet (das erste, auf dem er
  // liegt) — Knick-Pfosten bekommen so genau einen Tick.
  for (const g of doc.byKind<Gelaender>('gelaender')) {
    if (g.storeyId !== storeyId) continue;
    if (g.punkte.length < 2) continue;
    const teile = gelaenderTeile(g);
    for (let i = 1; i < g.punkte.length; i++) {
      lines.push({ a: { ...g.punkte[i - 1]! }, b: { ...g.punkte[i]! }, classes: ['symbol', 'gelaender'] });
    }
    const vergeben = new Set<number>();
    for (let i = 1; i < g.punkte.length; i++) {
      const a = g.punkte[i - 1]!;
      const b = g.punkte[i]!;
      const len = Math.hypot(b.x - a.x, b.y - a.y);
      if (len < 1) continue;
      const d = { x: (b.x - a.x) / len, y: (b.y - a.y) / len };
      const nn = { x: -d.y, y: d.x };
      teile.pfosten.forEach((p, idx) => {
        if (vergeben.has(idx)) return;
        // liegt der Pfosten auf DIESEM Segment? (Projektion in [0,len],
        // Querabstand ~0 — die Zerlegung setzt ihn exakt auf die Achse)
        const s = (p.x - a.x) * d.x + (p.y - a.y) * d.y;
        const quer = Math.abs((p.x - a.x) * nn.x + (p.y - a.y) * nn.y);
        if (s < -0.5 || s > len + 0.5 || quer > 0.5) return;
        vergeben.add(idx);
        lines.push({
          a: { x: Math.round(p.x + nn.x * 80), y: Math.round(p.y + nn.y * 80) },
          b: { x: Math.round(p.x - nn.x * 80), y: Math.round(p.y - nn.y * 80) },
          classes: ['symbol', 'gelaender', 'gelaender-pfosten'],
        });
      });
    }
  }
  // Rampe: Kontur + gestrichelt gerenderte Lauflinie samt Steigungspfeil
  // (bergauf, Pfeilkopf-Masse wie die Treppen-Lauflinie oben) + %-Text.
  for (const r of doc.byKind<Rampe>('ramp')) {
    if (r.storeyId !== storeyId) continue;
    if (dist(r.a, r.b) < 1) continue;
    const teile = rampenTeile(r, storey.elevation);
    const { kontur, lauflinie, pfeil } = teile.plan;
    for (let i = 0; i < kontur.length; i++) {
      lines.push({ a: { ...kontur[i]! }, b: { ...kontur[(i + 1) % kontur.length]! }, classes: ['symbol', 'rampe'] });
    }
    lines.push({ a: { ...lauflinie.a }, b: { ...lauflinie.b }, classes: ['symbol', 'rampe', 'lauflinie'] });
    const l = dist(pfeil.schaft, pfeil.spitze) || 1;
    const d = { x: (pfeil.spitze.x - pfeil.schaft.x) / l, y: (pfeil.spitze.y - pfeil.schaft.y) / l };
    const nn = { x: -d.y, y: d.x };
    const spitze: Pt = { x: Math.round(pfeil.spitze.x - d.x * 300), y: Math.round(pfeil.spitze.y - d.y * 300) };
    lines.push({ a: { ...pfeil.spitze }, b: { x: Math.round(spitze.x - d.x * 350 + nn.x * 160), y: Math.round(spitze.y - d.y * 350 + nn.y * 160) }, classes: ['symbol', 'rampe', 'lauflinie'] });
    lines.push({ a: { ...pfeil.spitze }, b: { x: Math.round(spitze.x - d.x * 350 - nn.x * 160), y: Math.round(spitze.y - d.y * 350 - nn.y * 160) }, classes: ['symbol', 'rampe', 'lauflinie'] });
    const mitte = { x: (lauflinie.a.x + lauflinie.b.x) / 2, y: (lauflinie.a.y + lauflinie.b.y) / 2 };
    texte.push({
      at: { x: Math.round(mitte.x + nn.x * 260), y: Math.round(mitte.y + nn.y * 260) },
      text: pfeil.text,
      classes: ['rampe', 'rampe-steigung'],
    });
  }

  // Etiketten (A6): assoziativ — der Text kommt LIVE aus der Parametrik.
  // Werkplan-Beschriftung: sichtbar ab Bauprojekt.
  if (!fruehePhase(phase)) {
    for (const et of doc.byKind<import('../model/entities').Etikett>('etikett')) {
      if (et.storeyId !== storeyId) continue;
      const target = doc.get(et.targetId);
      if (!target) continue;
      let anker: Pt | null = null;
      let zeilen: string[] = [];
      if (target.kind === 'wall') {
        anker = { x: Math.round((target.a.x + target.b.x) / 2), y: Math.round((target.a.y + target.b.y) / 2) };
        const asm = doc.get<Assembly>(target.assemblyId);
        if (asm && asm.kind === 'assembly') {
          zeilen = [asm.name, `${asm.layers.map((l) => l.thickness).join(' / ')} mm`];
        }
      } else if (target.kind === 'slab') {
        const o = target.outline;
        anker = {
          x: Math.round(o.reduce((a, q) => a + q.x, 0) / o.length),
          y: Math.round(o.reduce((a, q) => a + q.y, 0) / o.length),
        };
        zeilen = [`Decke ${target.thickness} mm`];
      } else if (target.kind === 'column') {
        anker = target.at;
        zeilen = [target.profil === 'rund' ? `Stütze Ø ${target.b} ${target.material}` : `Stütze ${target.b}×${target.t ?? target.b} ${target.material}`];
      } else if (target.kind === 'beam') {
        anker = { x: Math.round((target.a.x + target.b.x) / 2), y: Math.round((target.a.y + target.b.y) / 2) };
        zeilen = [`UZ ${target.breite}×${target.hoehe} ${target.material}`];
      }
      if (!anker) continue;
      if (et.inhalt === 'keynote') zeilen = [et.keynote ?? '?'];
      if (zeilen.length === 0) continue;
      lines.push({ a: et.at, b: anker, classes: ['symbol', 'etikett'] });
      zeilen.forEach((text, i) =>
        texte.push({ at: et.at, text, classes: ['etikett'], ...(i > 0 ? { zeile: i } : {}) }),
      );
    }
  }

  // v0.8.11 P-B3 (docs/V0811-SPEZ.md §2 E5, V089-Nicht-Ziel eingelöst):
  // Schloss-Symbol an gesperrten Elementen (`meta.locked`, 0.8.9 E2) — die
  // Sperre war bisher im Plan unsichtbar. HARTER Daten-Guard: ohne ein
  // einziges gesperrtes Element im Geschoss entsteht KEINE Linie — alle 38
  // Bestands-Goldens bleiben byte-identisch (kein Fixture trägt locked,
  // grep-geprüft; der EINE neue Golden `plan-schloss.svg` beweist das
  // Symbol). Kleines Vorhängeschloss in Welt-mm am Element-Anker (Wand/
  // Unterzug: Achsen-Mitte · Stütze/Möbel: at · flächige: Umriss-Zentroid ·
  // Treppe: Lauflinien-Mitte), leicht nach rechts oben versetzt, damit es
  // nicht auf der Bauteilkante klebt. Klasse ['symbol','schloss'] — ein
  // späterer Druck-Filter kann daran ansetzen, ohne die Geometrie zu kennen.
  {
    const schlossAnker = (e: import('../model/entities').Entity): Pt | null => {
      if (e.kind === 'wall' || e.kind === 'stair' || e.kind === 'beam') {
        return { x: Math.round((e.a.x + e.b.x) / 2), y: Math.round((e.a.y + e.b.y) / 2) };
      }
      if (e.kind === 'column' || e.kind === 'furniture') return e.at;
      if (e.kind === 'zone' || e.kind === 'mass' || e.kind === 'roof' || e.kind === 'slab' || e.kind === 'boundary') {
        const o = e.outline;
        if (!o.length) return null;
        return {
          x: Math.round(o.reduce((a, q) => a + q.x, 0) / o.length),
          y: Math.round(o.reduce((a, q) => a + q.y, 0) / o.length),
        };
      }
      return null;
    };
    for (const e of doc.inStorey(storeyId)) {
      if (e.meta?.locked !== true) continue;
      const anker = schlossAnker(e);
      if (!anker) continue;
      // Körper 280×220 + Bügel, Ursprung unten links, versetzt +150/+150.
      const x = anker.x + 150;
      const y = anker.y + 150;
      const s: [Pt, Pt][] = [
        // Körper (Rechteck)
        [{ x, y }, { x: x + 280, y }],
        [{ x: x + 280, y }, { x: x + 280, y: y + 220 }],
        [{ x: x + 280, y: y + 220 }, { x, y: y + 220 }],
        [{ x, y: y + 220 }, { x, y }],
        // Bügel (drei Segmente über dem Körper)
        [{ x: x + 70, y: y + 220 }, { x: x + 70, y: y + 330 }],
        [{ x: x + 70, y: y + 330 }, { x: x + 210, y: y + 330 }],
        [{ x: x + 210, y: y + 330 }, { x: x + 210, y: y + 220 }],
      ];
      for (const [a, b] of s) lines.push({ a, b, classes: ['symbol', 'schloss'] });
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

  // Volumen & Zonen als Projektion (feine Kontur); Zonen tragen ihren
  // raumTyp als Klasse (A5: Themenplan-Kriterium). D3-Kontext-LOD-Treppe
  // (v0.7.3 §D3, docs/V073-GESTALTUNG-SPEZ.md, Soll 4b): Zonen mit
  // `zonenArt` (Modell/entities.ts) tragen zusätzlich eine `zone-<art>`-
  // Klasse, damit `plansvg.ts` sie phasenabhängig unterscheiden kann — reine
  // Zonen ohne `zonenArt` bleiben unverändert (Daten-Guard, byte-identisch).
  // Das Schwarzplan-Modul (`derive/schwarzplan.ts`) bleibt UNABHÄNGIG davon
  // unverändert («wie heute»); dies betrifft nur den Grundriss-Weg hier.
  for (const e of doc.inStorey(storeyId)) {
    if (e.kind === 'mass' || e.kind === 'zone') {
      regions.push({
        rings: [e.outline.map((p) => ({ ...p }))],
        classes: [
          'projection',
          e.kind === 'mass' ? 'volumen' : 'zone',
          ...(e.kind === 'zone' && e.raumTyp ? [`raumtyp-${e.raumTyp}`] : []),
          ...(e.kind === 'zone' && e.zonenArt ? [`zone-${e.zonenArt}`] : []),
        ],
      });
    } else if (e.kind === 'slab') {
      regions.push({
        rings: [e.outline.map((p) => ({ ...p })), ...(e.holes ?? []).map((h) => h.map((p) => ({ ...p })))],
        classes: ['projection', 'decke'],
      });
    } else if (e.kind === 'freemesh') {
      // FreeMesh (Block 3 / FM2, Buildplan E5): die ehrliche SCHNITTFIGUR bei
      // der Standard-Schnitthöhe 1 m über Geschoss-OK (Tri-Slice), NICHT eine
      // erfundene Footprint-Projektion. Ein Mesh, das die Schnitthöhe nicht
      // erreicht, erscheint im Grundriss nicht (Stufe-3-Grenze, dokumentiert)
      // — der Daten-Guard hält zugleich die Goldens byte-identisch (die
      // Fixtures enthalten keine Meshes).
      for (const ring of meshSchnittRinge(e.positions, e.faces, PLAN_SCHNITTHOEHE)) {
        regions.push({ rings: [ring], classes: ['projection', 'freemesh'] });
      }
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

  // Beschlag-Katalog S0 (v0.7.3 §D6, docs/V073-GESTALTUNG-SPEZ.md): sechs
  // Symbole je Öffnung (Band · Griffseite · Brüstungshöhe/BRH · Schiebe-Lauf
  // · Motorantrieb · Absturzsicherung), NUR im Werkplan, hinter dem
  // Daten-Guard `hatBeschlag()` unten — ohne die additiven Opening-Felder
  // (`band`/`griffseite`/`antrieb`/`absturzsicherung`) bleibt der Grundriss
  // byte-identisch. BRH trägt bewusst KEIN eigenes Feld (etikettiert das
  // bestehende `sill`); Schiebe-Lauf hat ebenfalls kein eigenes Feld
  // (abgeleitet aus dem bestehenden `fluegelTyp === 'schiebe'`). Ehrliche
  // Vereinfachung (S0, «Minimum statt Politur»): reine Katalog-Piktogramme
  // NEBEN der Öffnung (Draufsicht-Reihe ausserhalb der Wand), keine
  // Kreisgeometrie (Ecken/Quadrate statt echter Kreise) — Anschläge/RWA/
  // Dichtebene und die 12er-Ausbaustufe S1 bleiben bewusst vertagt.
  if (phase === 'werkplan') {
    for (const wall of walls) {
      const assembly = doc.get<Assembly>(wall.assemblyId);
      if (!assembly || assembly.kind !== 'assembly') continue;
      const frame = wallFrame(wall, assembly);
      const d = axisDirection(wall);
      const n = { x: -d.y, y: d.x };
      const at = (s: number, off: number): Pt => ({
        x: Math.round(wall.a.x + d.x * s + n.x * off),
        y: Math.round(wall.a.y + d.y * s + n.y * off),
      });
      // Basiszeile 500mm ausserhalb der Wandkante (Rechts-Offset-Seite) — frei
      // von der Poché, unabhängig von Öffnungsbreite/-tiefe.
      const basisOff = -(frame.offsetRight + 500);
      for (const o of doc.openingsOf(wall.id)) {
        if (o.openingType === 'leibung' || !hatBeschlag(o)) continue;
        const ICON = 300;
        const GAP = 150;
        const zeichner: Array<(mitte: number) => void> = [];
        const P = (mitte: number, dx: number, dy: number): Pt => at(mitte + dx, basisOff + dy);
        const linieAt = (mitte: number, a2: [number, number], b2: [number, number], klasse: string) =>
          lines.push({ a: P(mitte, ...a2), b: P(mitte, ...b2), classes: ['symbol', 'beschlag', klasse] });
        if (o.band) {
          zeichner.push((mitte) => {
            linieAt(mitte, [0, -150], [0, 150], 'beschlag-band');
            linieAt(mitte, [-30, -75], [30, -75], 'beschlag-band');
            linieAt(mitte, [-30, 75], [30, 75], 'beschlag-band');
          });
        }
        if (o.griffseite) {
          zeichner.push((mitte) => {
            const ecken: [number, number][] = [[-150, -100], [150, -100], [150, 100], [-150, 100]];
            for (let i = 0; i < 4; i++) linieAt(mitte, ecken[i]!, ecken[(i + 1) % 4]!, 'beschlag-griffseite');
            const px = o.griffseite === 'links' ? -110 : 110;
            regions.push({
              rings: [
                [P(mitte, px - 20, -20), P(mitte, px + 20, -20), P(mitte, px + 20, 20), P(mitte, px - 20, 20)],
              ],
              classes: ['beschlag', 'beschlag-griffseite-punkt'],
            });
          });
        }
        // BRH (Brüstungshöhe): reitet auf jeder Beschlag-aktiven Öffnung mit —
        // etikettiert das bestehende `sill`, kein eigenes Feld.
        zeichner.push((mitte) => {
          linieAt(mitte, [-150, 0], [150, 0], 'beschlag-brh');
          linieAt(mitte, [-150, -25], [-150, 25], 'beschlag-brh');
          linieAt(mitte, [150, -25], [150, 25], 'beschlag-brh');
          texte.push({ at: P(mitte, 0, -70), text: `BRH ${Math.round(o.sill / 10)}`, classes: ['beschlag', 'beschlag-brh'] });
        });
        if (o.fluegelTyp === 'schiebe') {
          zeichner.push((mitte) => {
            linieAt(mitte, [-150, -20], [150, -20], 'beschlag-schiebelauf');
            linieAt(mitte, [-150, 20], [150, 20], 'beschlag-schiebelauf');
            linieAt(mitte, [150, -20], [120, -35], 'beschlag-schiebelauf');
            linieAt(mitte, [150, -20], [120, -5], 'beschlag-schiebelauf');
          });
        }
        if (o.antrieb) {
          zeichner.push((mitte) => {
            const ecken: [number, number][] = [[-80, -80], [80, -80], [80, 80], [-80, 80]];
            for (let i = 0; i < 4; i++) linieAt(mitte, ecken[i]!, ecken[(i + 1) % 4]!, 'beschlag-antrieb');
            texte.push({ at: P(mitte, 0, 30), text: 'M', classes: ['beschlag', 'beschlag-antrieb'] });
          });
        }
        if (o.absturzsicherung) {
          zeichner.push((mitte) => {
            linieAt(mitte, [-150, -100], [150, -100], 'beschlag-absturzsicherung');
            linieAt(mitte, [-90, -100], [-90, 40], 'beschlag-absturzsicherung');
            linieAt(mitte, [90, -100], [90, 40], 'beschlag-absturzsicherung');
          });
        }
        const gesamt = zeichner.length * ICON + (zeichner.length - 1) * GAP;
        let cursor = o.center - gesamt / 2 + ICON / 2;
        for (const zeichne of zeichner) {
          zeichne(cursor);
          cursor += ICON + GAP;
        }
      }
    }
  }

  // Beschlag-Katalog S2 (v0.7.5 Welle 1 A1, `Opening.beschlaege`, Katalog
  // `derive/beschlag.ts` BESCHLAG_KATALOG): DXF-Pfad (Pfad A) — EIN
  // Text-Primitive je Öffnung mit den zugewiesenen Beschlag-Namen, Klasse
  // ['symbol','beschlag'] → landet automatisch auf dem bestehenden
  // DXF-Layer BESCHLAG (`dxf/export.ts`, keine Layer-Änderung nötig). Die
  // Piktogramme selbst (Pfad B, Bildschirm/PDF) zeichnet `derive/plansvg.ts`
  // direkt aus `beschlagSymbol()` — DXF zeigt bewusst NUR Text statt
  // Piktogramm (bestehende Grenze: DXF = CAD-Standardschrift, kein
  // SVG-Icon-Export). Eigener Guard `o.beschlaege?.length`, unabhängig vom
  // S0-Guard `hatBeschlag()` oben — ohne das Feld bleibt der Grundriss
  // (inkl. S0-Katalog) byte-identisch. Eigene Zeile 900mm ausserhalb der
  // Wandkante (weiter als die S0-Basiszeile bei 500mm), damit sich S0- und
  // S2-Beschriftung nicht optisch überlagern.
  if (phase === 'werkplan') {
    for (const wall of walls) {
      const assembly = doc.get<Assembly>(wall.assemblyId);
      if (!assembly || assembly.kind !== 'assembly') continue;
      const frame = wallFrame(wall, assembly);
      const d = axisDirection(wall);
      const n = { x: -d.y, y: d.x };
      const at = (s: number, off: number): Pt => ({
        x: Math.round(wall.a.x + d.x * s + n.x * off),
        y: Math.round(wall.a.y + d.y * s + n.y * off),
      });
      // 2700mm ausserhalb der Wandkante — jenseits der Aussen-/Innen-
      // Bemassungsketten (die zwischen ~1100 und ~2000mm liegen): der
      // zusammengesetzte Katalog-Namenstext ist ein langer String und
      // überlappte bei kleineren Abständen die Bemassungs-Beschriftung
      // (`svg-qa`-Text-Overlap-Check auf dem neuen Golden hat das gezeigt).
      const basisOffS2 = -(frame.offsetRight + 2700);
      for (const o of doc.openingsOf(wall.id)) {
        if (o.openingType === 'leibung' || !o.beschlaege?.length) continue;
        const namen = o.beschlaege.map((key) => beschlagTyp(key)?.name ?? key).join(' · ');
        texte.push({ at: at(o.center, basisOffS2), text: namen, classes: ['symbol', 'beschlag', 'beschlag-s2'] });
      }
    }
  }

  // Dach (Stream A / v0.6.8, SIM-Befunde H-2/H-18): im Geschoss, dem das
  // Dach zugeordnet ist, zeigt die Aufsicht First/Traufe/Ortgang/Grat
  // klassifiziert (dieselbe Geometrie wie die 3D-Ableitung, siehe
  // derive/dach.ts). Symbolische Linien (keine Poché) — First/Traufe/
  // Ortgang unterscheidbar über die Klasse `dach-<art>`, Strichstärke/
  // -art kommt aus dem Stiftsatz (Bonsai-Muster dieses Moduls, siehe
  // Kopfkommentar), nicht aus der Geometrie.
  for (const roof of doc.byKind<Roof>('roof')) {
    if (roof.storeyId !== storeyId) continue;
    const geom = dachGeometrie(roof, storey);
    if (!geom) continue;
    for (const k of geom.kanten) {
      lines.push({
        a: { x: k.a.x, y: k.a.y },
        b: { x: k.b.x, y: k.b.y },
        classes: ['symbol', 'dach', `dach-${k.art}`],
      });
    }
  }
  // Geschoss DARUNTER: Dachumriss gestrichelt — dieselbe Überzeichnungs-
  // Konvention wie die «ueber-schnitt»-Treppenteile oberhalb der
  // Schnitthöhe (Klasse `ueber-schnitt`, bereits im Renderer gestrichelt).
  {
    const storeysAsc = doc.storeysOrdered();
    const meinIndex = storeysAsc.findIndex((s) => s.id === storeyId);
    const obenStorey = meinIndex >= 0 ? storeysAsc[meinIndex + 1] : undefined;
    if (obenStorey) {
      for (const roof of doc.byKind<Roof>('roof')) {
        if (roof.storeyId !== obenStorey.id) continue;
        const geom = dachGeometrie(roof, obenStorey);
        if (!geom) continue;
        const ring = geom.aussenring;
        for (let i = 0; i < ring.length; i++) {
          lines.push({
            a: ring[i]!,
            b: ring[(i + 1) % ring.length]!,
            classes: ['symbol', 'dach', 'dach-traufe', 'ueber-schnitt'],
          });
        }
      }
    }
  }

  // Stützenraster: Achsen des Geschosses (Stil/Achskopf machen die Renderer)
  for (const g of doc.byKind<GridAxis>('grid')) {
    if (g.storeyId !== storeyId) continue;
    axes.push({ a: g.a, b: g.b, label: g.label, typ: g.typ ?? 'haupt' });
  }

  // v0.8.3 E2 (§2.3, docs/V083-SPEZ.md, Golden-Politik §0.5): MassKette-
  // Linien NUR, wenn mindestens eine MassKette-Entität im Geschoss existiert
  // (Daten-Guard) — keines der 35 Bestands-Fixtures hat eine `masskette`-
  // Entität, der Grundriss bleibt dort byte-identisch, unabhängig vom
  // Code-Zustand dieses Zweigs (Guard-Prinzip, CLAUDE.md «Eigenheiten»).
  // K18 (v0.9.0): nur noch STRUKTURIERTE Segmente (Messpunkte + Mass) —
  // Masslinie/Verlängerungslinien zeichnet der massstabsbewusste Renderer.
  const ketten = doc.byKind<MassKette>('masskette').filter((m) => m.storeyId === storeyId);
  for (const mk of ketten) {
    for (let i = 1; i < mk.punkte.length; i++) {
      const a = mk.punkte[i - 1]!;
      const b = mk.punkte[i]!;
      massketten.push({ a, b, label: formatLength(Math.round(dist(a, b))) });
    }
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
  // K18: Messpunkte in die Bounds aufnehmen (vormals implizit über die
  // masskette-`lines`) — die viewBox darf eine Randkette nicht verlieren.
  if (bounds) {
    for (const m of massketten) {
      for (const p of [m.a, m.b]) {
        bounds.minX = Math.min(bounds.minX, p.x);
        bounds.minY = Math.min(bounds.minY, p.y);
        bounds.maxX = Math.max(bounds.maxX, p.x);
        bounds.maxY = Math.max(bounds.maxY, p.y);
      }
    }
  }
  return { storeyId, regions, lines, arcs, axes, texte, massketten, bounds: bounds ?? axesBounds(axes) };
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
