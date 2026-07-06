import { describe, expect, it } from 'vitest';
import { groundHitToPlanPt, intersectPlaneY, rayToPlanPt, type Ray3 } from '../src/modules/design/sketch-3d';

/**
 * KosmoSketch im 3D-Viewport (T5, Punkt 3) — die reine Geometrie hinter dem
 * Freihand-Overlay: Kamerastrahl → Bodenebene der aktiven Geschossebene →
 * Plan-mm. Kein three.js/WebGL nötig, damit das ohne Browser-Kontext läuft.
 */

describe('intersectPlaneY — Strahl schneidet eine horizontale Ebene', () => {
  it('trifft die Ebene y=0 senkrecht von oben', () => {
    const ray: Ray3 = { origin: { x: 2, y: 10, z: 3 }, dir: { x: 0, y: -1, z: 0 } };
    const hit = intersectPlaneY(ray, 0);
    expect(hit).toEqual({ x: 2, z: 3 });
  });

  it('trifft eine erhöhte Geschossebene (z.B. 1. OG, 3m = 3 Einheiten)', () => {
    const ray: Ray3 = { origin: { x: 0, y: 20, z: 0 }, dir: { x: 1, y: -1, z: 0 } };
    const hit = intersectPlaneY(ray, 3);
    expect(hit).not.toBeNull();
    expect(hit!.x).toBeCloseTo(17, 5);
    expect(hit!.z).toBeCloseTo(0, 5);
  });

  it('liefert null bei einem Strahl parallel zur Ebene', () => {
    const ray: Ray3 = { origin: { x: 0, y: 5, z: 0 }, dir: { x: 1, y: 0, z: 0 } };
    expect(intersectPlaneY(ray, 0)).toBeNull();
  });

  it('liefert null, wenn die Ebene nur rückwärts läge (Kamera schaut daran vorbei)', () => {
    const ray: Ray3 = { origin: { x: 0, y: -5, z: 0 }, dir: { x: 0, y: -1, z: 0 } };
    expect(intersectPlaneY(ray, 0)).toBeNull();
  });
});

describe('groundHitToPlanPt — three-Meter (y-oben) → Kern-mm-Planpunkt', () => {
  it('rechnet Meter in mm um und spiegelt die Nord-Achse (three z → Kern y)', () => {
    const p = groundHitToPlanPt({ x: 1.234, z: -2.5 });
    expect(p).toEqual({ x: 1234, y: 2500 });
  });
});

describe('rayToPlanPt — kombinierter Weg (für Viewport3D)', () => {
  it('ergibt denselben Punkt wie intersectPlaneY + groundHitToPlanPt einzeln', () => {
    const ray: Ray3 = { origin: { x: 0, y: 8, z: 0 }, dir: { x: 0.3, y: -1, z: 0.4 } };
    const p = rayToPlanPt(ray, 0);
    const hit = intersectPlaneY(ray, 0)!;
    expect(p).toEqual(groundHitToPlanPt(hit));
  });

  it('gibt null zurück, wenn kein Bodentreffer existiert', () => {
    const ray: Ray3 = { origin: { x: 0, y: 8, z: 0 }, dir: { x: 1, y: 0, z: 0 } };
    expect(rayToPlanPt(ray, 0)).toBeNull();
  });
});
