import type { KosmoDoc } from '../model/doc';
import type { DetailMarker } from '../model/entities';
import type { Pt } from '../model/units';
import { derivePlan, type PlanLine, type PlanRegion } from './plan';

/**
 * Detail-Ausschnitt-Ableitung (v0.9.2 P-D, `docs/V092-SPEZ.md` §P-D) — REINE
 * DATEN, kein SVG, kein Plan-/Druck-Einbau.
 *
 * V1-SCOPE EHRLICH BENANNT:
 *  - Quelle ist `derivePlan(doc, storeyId)` (Grundriss-Linien/-Regionen,
 *    Welt-mm, unskaliert — `derive/plan.ts` kennt selbst KEINEN Massstab,
 *    s. dortiger Kommentar bei `PlanMasskette`, Zeile ~96-98). Diese
 *    Funktion liest sie NUR, sie fliesst nicht in `plan.ts`/`plansvg.ts`
 *    ein (TABU dieses Postens) — ein Marker-Symbol im gedruckten Plan ist
 *    ein zweiter, eigenständiger Golden-Zug (Nicht-Ziel, s. `entities.ts`
 *    `DetailMarker`-Kopfkommentar).
 *  - AUSWAHL = FILTER, NICHT CLIP (bewusste v1-Vereinfachung, von der Spec
 *    ausdrücklich als Alternative zugelassen: «clippen ODER v1-ehrlich
 *    filtern»): eine Linie/ein Regionsring wird UNVERÄNDERT übernommen,
 *    sobald sie/er den Bereich schneidet oder ganz darin liegt — es wird
 *    NICHT auf die Bereichsgrenze zurückgeschnitten. Ein Wandzug, der nur
 *    mit einem Ende in den Bereich hineinragt, erscheint darum in voller
 *    Länge im Detail-Datensatz (ehrlich als Vereinfachung dokumentiert,
 *    keine verdeckte Präzision vorgetäuscht).
 *  - Regions-Test ist gröber als Linien-Test: eine Region gilt als
 *    «im Bereich», wenn mindestens ein Eckpunkt ihres Aussenrings im
 *    Bereich liegt ODER mindestens eine Kante des Aussenrings die
 *    Bereichsgrenze schneidet. Eine Region, die den GESAMTEN Bereich ohne
 *    eigenen Eckpunkt/eigene Kante darin umschliesst (Bereich komplett
 *    innerhalb der Region), wird v1 NICHT erkannt — seltener Randfall bei
 *    Architektur-Ausschnitten, wo der Marker i.d.R. kleiner als die
 *    umgebenden Bauteile ist; dokumentierte Grenze, keine stille Lücke.
 *  - Skalierung: `massstab` ist der Massstab-NENNER (Muster
 *    `SheetPlacement.scale`, `entities.ts` — z.B. 5 für 1:5). Der Plan
 *    selbst führt keinen eigenen Massstab (s.o.) — als Referenz gilt darum
 *    die von `derivePlan` gelieferte Welt-mm-Geometrie SELBST als
 *    Massstab-1-Basis (dieselbe Formel wie beim Blatt-Platzieren, `derive/
 *    sheet.ts:132` `f = 1/pl.scale`): `faktor = 1 / massstab`. Die
 *    zurückgegebenen Linien/Regionen sind bereits in dieses skalierte,
 *    auf den Bereichs-Ursprung (a/b-Minimum) verschobene Koordinatensystem
 *    übersetzt — Ursprung (0,0) = linke obere Ecke des Bereichs, direkt für
 *    eine Voransicht verwendbar (App-seitiges Inline-SVG, s.
 *    `PublishWorkspace.tsx`), ohne dass der Konsument selbst rechnen muss.
 */

/** Achsparalleles Rechteck in Welt-mm (aus `DetailMarker.a`/`.b` normalisiert). */
export interface DetailBereich {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

/** Linie im Detail-Ausschnitt — bereits skaliert (Massstab-Nenner) + auf den Bereichs-Ursprung verschoben. */
export interface DetailLinie {
  a: Pt;
  b: Pt;
  classes: string[];
}

/** Region (Ringe) im Detail-Ausschnitt — dieselbe Ring-Konvention wie `PlanRegion` (erster Ring = Umriss, weitere = Löcher, SVG evenodd), skaliert + verschoben. */
export interface DetailRegion {
  rings: Pt[][];
  classes: string[];
}

export interface DetailAbleitung {
  storeyId: string;
  meta: {
    name: string;
    /** Massstab-Nenner, z.B. 5 für 1:5. */
    massstab: number;
    /** Bereich in Welt-mm (unskaliert), wie im Modell gespeichert. */
    bereich: DetailBereich;
  };
  linien: DetailLinie[];
  regionen: DetailRegion[];
  /** Grösse des skalierten Ausschnitts (Breite/Höhe in Ausgabe-Einheiten, = Welt-mm × faktor). */
  groesse: { breite: number; hoehe: number };
}

/** a/b normalisieren (Reihenfolge egal, Muster jeder achsparallelen Rechteck-Nutzung). */
function normalisiereBereich(a: Pt, b: Pt): DetailBereich {
  return {
    minX: Math.min(a.x, b.x),
    minY: Math.min(a.y, b.y),
    maxX: Math.max(a.x, b.x),
    maxY: Math.max(a.y, b.y),
  };
}

function punktImBereich(p: Pt, r: DetailBereich): boolean {
  return p.x >= r.minX && p.x <= r.maxX && p.y >= r.minY && p.y <= r.maxY;
}

/** Segment-gegen-Rechteck-Schnitttest (Cohen-Sutherland-Aussencode-Prinzip,
 * ohne tatsächlichen Zuschnitt — reicht für den v1-Filter). */
function segmentSchneidetBereich(a: Pt, b: Pt, r: DetailBereich): boolean {
  if (punktImBereich(a, r) || punktImBereich(b, r)) return true;
  // Beide Punkte ausserhalb: schneidet nur, wenn das Segment eine der vier
  // Bereichskanten kreuzt.
  const kanten: [Pt, Pt][] = [
    [{ x: r.minX, y: r.minY }, { x: r.maxX, y: r.minY }],
    [{ x: r.maxX, y: r.minY }, { x: r.maxX, y: r.maxY }],
    [{ x: r.maxX, y: r.maxY }, { x: r.minX, y: r.maxY }],
    [{ x: r.minX, y: r.maxY }, { x: r.minX, y: r.minY }],
  ];
  return kanten.some(([c, d]) => segmenteSchneidenSich(a, b, c, d));
}

function orientierung(p: Pt, q: Pt, s: Pt): number {
  const v = (q.y - p.y) * (s.x - q.x) - (q.x - p.x) * (s.y - q.y);
  if (v === 0) return 0;
  return v > 0 ? 1 : 2;
}

function aufSegment(p: Pt, q: Pt, s: Pt): boolean {
  return (
    q.x <= Math.max(p.x, s.x) && q.x >= Math.min(p.x, s.x) &&
    q.y <= Math.max(p.y, s.y) && q.y >= Math.min(p.y, s.y)
  );
}

/** Klassischer Segment-Segment-Schnitttest über Orientierungen (inkl. kollinearer Sonderfälle). */
function segmenteSchneidenSich(p1: Pt, q1: Pt, p2: Pt, q2: Pt): boolean {
  const o1 = orientierung(p1, q1, p2);
  const o2 = orientierung(p1, q1, q2);
  const o3 = orientierung(p2, q2, p1);
  const o4 = orientierung(p2, q2, q1);
  if (o1 !== o2 && o3 !== o4) return true;
  if (o1 === 0 && aufSegment(p1, p2, q1)) return true;
  if (o2 === 0 && aufSegment(p1, q2, q1)) return true;
  if (o3 === 0 && aufSegment(p2, p1, q2)) return true;
  if (o4 === 0 && aufSegment(p2, q1, q2)) return true;
  return false;
}

function ringSchneidetBereich(ring: Pt[], r: DetailBereich): boolean {
  if (ring.some((p) => punktImBereich(p, r))) return true;
  for (let i = 0; i < ring.length; i++) {
    const a = ring[i]!;
    const b = ring[(i + 1) % ring.length]!;
    if (segmentSchneidetBereich(a, b, r)) return true;
  }
  return false;
}

/** Welt-mm → Ausgabe-Koordinaten: Ursprung auf Bereichs-Minimum verschoben, mit `faktor` skaliert. */
function transformPt(p: Pt, r: DetailBereich, faktor: number): Pt {
  return { x: Math.round((p.x - r.minX) * faktor), y: Math.round((p.y - r.minY) * faktor) };
}

function transformLine(l: PlanLine, r: DetailBereich, faktor: number): DetailLinie {
  return { a: transformPt(l.a, r, faktor), b: transformPt(l.b, r, faktor), classes: l.classes };
}

function transformRegion(reg: PlanRegion, r: DetailBereich, faktor: number): DetailRegion {
  return { rings: reg.rings.map((ring) => ring.map((p) => transformPt(p, r, faktor))), classes: reg.classes };
}

/**
 * Ausschnitt-Ableitung EINES Detail-Markers: liest den Grundriss seines
 * Geschosses (`derivePlan`), filtert Linien/Regionen auf den Bereich (s.
 * Kopfkommentar — FILTER, kein Zuschnitt) und skaliert das Ergebnis um
 * `1 / massstab` in ein bei (0,0) beginnendes Koordinatensystem.
 *
 * Defensiv wie `derivePlan`/`deriveDimensions`: ein fehlender/falscher
 * Marker oder ein fehlendes Geschoss liefert eine LEERE Ableitung statt zu
 * werfen (reine Anzeige-Funktion, kein Command).
 */
export function deriveDetail(doc: KosmoDoc, detailId: string): DetailAbleitung {
  const marker = doc.get<DetailMarker>(detailId);
  if (!marker || marker.kind !== 'detail') {
    return {
      storeyId: '',
      meta: { name: '', massstab: 1, bereich: { minX: 0, minY: 0, maxX: 0, maxY: 0 } },
      linien: [],
      regionen: [],
      groesse: { breite: 0, hoehe: 0 },
    };
  }
  const bereich = normalisiereBereich(marker.a, marker.b);
  const faktor = 1 / marker.massstab;
  const plan = derivePlan(doc, marker.storeyId);

  const linien = plan.lines
    .filter((l) => segmentSchneidetBereich(l.a, l.b, bereich))
    .map((l) => transformLine(l, bereich, faktor));
  const regionen = plan.regions
    .filter((reg) => reg.rings.length > 0 && ringSchneidetBereich(reg.rings[0]!, bereich))
    .map((reg) => transformRegion(reg, bereich, faktor));

  return {
    storeyId: marker.storeyId,
    meta: { name: marker.name, massstab: marker.massstab, bereich },
    linien,
    regionen,
    groesse: {
      breite: Math.round((bereich.maxX - bereich.minX) * faktor),
      hoehe: Math.round((bereich.maxY - bereich.minY) * faktor),
    },
  };
}
