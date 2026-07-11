import type { Pt } from '@kosmo/kernel';

/**
 * KosmoSketch im 3D-Viewport (T5, Punkt 3 + A4-Erweiterung, ROADMAP 155):
 * Bildschirm-Strahl → getroffene Fläche → Plan-mm bzw. Öffnungs-Vorschlag.
 * Reine Geometrie, ohne three.js — testbar ohne WebGL-Kontext. Der Aufrufer
 * (Viewport3D) liefert je Bildpunkt einen Raycast-Treffer (three-Weltkoor-
 * dinaten, Meter, y-oben — Objekt-Metadaten reicht er als Bauteil-Art durch)
 * und ruft die passenden Funktionen hier auf.
 *
 * A4 («Beides/Raycast», Owner-Entscheid): die Bedeutung eines Strichs hängt
 * vom getroffenen Bauteil ab — Boden/Terrain/Decke/Volumen (alles ausser
 * Wand) ergibt wie bisher einen Wand-Zug, jetzt aber auf die tatsächlich
 * getroffene Fläche projiziert statt nur auf die flache Geschossebene
 * (`klassifiziereSketchTreffer` + weiterhin `groundHitToPlanPt`, jetzt auf
 * dem echten Trefferpunkt statt nur auf `intersectPlaneY`). Eine Wandfläche
 * ergibt eine Öffnung (`wandTrefferZuOeffnung`): die Bounding-Box der
 * Wand-Treffer eines Strichs (Achsabstand × Höhe) wird zu Center/Breite/
 * Höhe/Brüstung.
 *
 * Seit v0.7.1 (E4) existiert das echte Terrain-Mesh im Viewport
 * (`deriveTerrainBaender` in `derive/scene.ts`) — genau wie hier unten
 * vorausgesagt greift die Klassifikation automatisch auch dafür, weil sie
 * rein am „ist es eine Wand"-Kriterium hängt, nicht an einer Liste
 * bekannter Bauteil-Arten. „Boden/Terrain" heisst weiterhin: alles, was
 * keine Wand ist (Bodenraster-Ebene, Decken/Platten, Dach, Volumenkörper,
 * Treppe, Terrain-Band, Knotenstücke).
 */

export interface Ray3 {
  origin: { x: number; y: number; z: number };
  dir: { x: number; y: number; z: number };
}

/**
 * Schnittpunkt von `ray` mit der Ebene y = planeY (three-Koordinaten, Meter).
 * `null`, wenn der Strahl parallel zur Ebene liegt oder nur rückwärts träfe
 * (Kamera schaut an der Ebene vorbei — kein sinnvoller Zeichenpunkt).
 */
export function intersectPlaneY(ray: Ray3, planeY: number): { x: number; z: number } | null {
  const dy = ray.dir.y;
  if (Math.abs(dy) < 1e-9) return null;
  const t = (planeY - ray.origin.y) / dy;
  if (t < 0) return null;
  return { x: ray.origin.x + ray.dir.x * t, z: ray.origin.z + ray.dir.z * t };
}

/**
 * three-Bodentreffer (Meter, y-oben) → Kern-mm-Planpunkt (x Ost, y Nord).
 * Kehrbild derselben Umrechnung wie in Viewport3D (`groundPoint`). Nimmt
 * jeden Weltpunkt entgegen, nicht nur einen Ebenenschnitt — dieselbe
 * horizontale Projektion gilt für einen echten Mesh-Treffer (A4: Decke,
 * Dach, Volumenkörper, künftig Terrain) genauso wie für die flache Ebene.
 */
export function groundHitToPlanPt(hit: { x: number; z: number }): Pt {
  return { x: Math.round(hit.x * 1000), y: Math.round(-hit.z * 1000) };
}

/** Kombiniert: Strahl → Bodenebene → Plan-mm, in einem Aufruf. */
export function rayToPlanPt(ray: Ray3, planeYMeter: number): Pt | null {
  const hit = intersectPlaneY(ray, planeYMeter);
  return hit ? groundHitToPlanPt(hit) : null;
}

/** Bedeutung eines Sketch-Treffers: Wand → Öffnung, alles andere → Wand-Zug. */
export type SketchTrefferArt = 'wand' | 'boden';

/**
 * Klassifiziert einen Raycast-Treffer anhand der Bauteil-Art des getroffenen
 * Kern-Entity (`doc.get(entityId)?.kind`). `undefined`/`null` (kein Treffer,
 * z.B. Bodenraster-Ebene ohne Entity oder ein synthetisches Knotenstück ohne
 * echte Entity-Id) fällt auf «boden» — denselben Weg wie bisher (Wand-Zug).
 */
export function klassifiziereSketchTreffer(entityKind: string | null | undefined): SketchTrefferArt {
  return entityKind === 'wall' ? 'wand' : 'boden';
}

/** Projiziert einen Plan-mm-Punkt auf die Wandachse a→b: Achsabstand s (mm ab a). */
export function achsAbstand(a: Pt, b: Pt, p: Pt): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy);
  if (len < 1e-6) return 0;
  return ((p.x - a.x) * dx + (p.y - a.y) * dy) / len;
}

/** Ein Wand-Treffer während eines Strichs: Achsabstand ab a (mm) + Höhe über OK Boden des Geschosses (mm). */
export interface WandTrefferPunkt {
  s: number;
  hoehe: number;
}

export interface WandOeffnungsVorschlag {
  center: number;
  width: number;
  height: number;
  sill: number;
}

/** Mindestmass (mm), damit ein Tipp-/Mikro-Strich keine Nullgrösse ergibt. */
const OEFFNUNG_MIN_MM = 200;

/**
 * Bounding-Box der Wand-Treffer eines Strichs → eine Öffnung (Fenster/Tür-
 * neutral; der Aufrufer entscheidet `openingType`, z.B. an der Brüstung).
 * `null`, wenn der Strich keine Wand-Treffer hatte oder die Wand keine Länge
 * hat. Klemmt Breite auf die Wandlänge und die Mitte so, dass die Öffnung
 * innerhalb der Wand bleibt (`design.oeffnungSetzen` verweigert sonst
 * Öffnungen, die über die Wand hinausragen). `maxHoeheMm` (optional, OK Boden
 * → OK Wand) klemmt Brüstung+Höhe zusätzlich auf die tatsächliche Wandhöhe.
 */
export function wandTrefferZuOeffnung(
  punkte: WandTrefferPunkt[],
  wandLaengeMm: number,
  maxHoeheMm?: number,
): WandOeffnungsVorschlag | null {
  if (punkte.length === 0 || wandLaengeMm <= 0) return null;
  let sMin = Infinity;
  let sMax = -Infinity;
  let hMin = Infinity;
  let hMax = -Infinity;
  for (const p of punkte) {
    if (p.s < sMin) sMin = p.s;
    if (p.s > sMax) sMax = p.s;
    if (p.hoehe < hMin) hMin = p.hoehe;
    if (p.hoehe > hMax) hMax = p.hoehe;
  }
  const width = Math.min(wandLaengeMm, Math.max(OEFFNUNG_MIN_MM, Math.round(sMax - sMin)));
  const half = width / 2;
  let center = Math.round((sMin + sMax) / 2);
  center = Math.min(wandLaengeMm - half, Math.max(half, center));

  let sill = Math.max(0, Math.round(hMin));
  let height = Math.max(OEFFNUNG_MIN_MM, Math.round(hMax - hMin));
  if (maxHoeheMm !== undefined && maxHoeheMm > 0) {
    sill = Math.min(sill, Math.max(0, maxHoeheMm - OEFFNUNG_MIN_MM));
    height = Math.min(height, maxHoeheMm - sill);
  }
  return { center, width, height, sill };
}
