import type { Pt } from '@kosmo/kernel';

/**
 * KosmoSketch im 3D-Viewport (T5, Punkt 3): Bildschirm-Strahl → Bodenebene
 * → Plan-mm. Reine Geometrie, ohne three.js — testbar ohne WebGL-Kontext.
 * Der Aufrufer (Viewport3D) liefert Kamera-Ursprung + Blickstrahl (three-
 * Weltkoordinaten, Meter, y-oben) je Bildpunkt; wir schneiden mit der
 * horizontalen Ebene auf Höhe `planeY` (Geschossebene) und rechnen das
 * Ergebnis in Kern-mm um (x Ost, y Nord — dieselbe Ebene, in der auch das
 * 2D-Overlay zeichnet).
 *
 * Ehrlichkeit: nur die horizontale Bodenebene der aktiven Geschossebene ist
 * abgedeckt. Skizzieren auf schrägen Flächen oder direkt auf Wänden ist damit
 * NICHT möglich (das wäre ein eigenes, grösseres Stück Arbeit — siehe
 * ROADMAP).
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
 * Kehrbild derselben Umrechnung wie in Viewport3D (`groundPoint`).
 */
export function groundHitToPlanPt(hit: { x: number; z: number }): Pt {
  return { x: Math.round(hit.x * 1000), y: Math.round(-hit.z * 1000) };
}

/** Kombiniert: Strahl → Bodenebene → Plan-mm, in einem Aufruf. */
export function rayToPlanPt(ray: Ray3, planeYMeter: number): Pt | null {
  const hit = intersectPlaneY(ray, planeYMeter);
  return hit ? groundHitToPlanPt(hit) : null;
}
