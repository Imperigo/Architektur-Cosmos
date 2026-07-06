import { describe, expect, it } from 'vitest';
import {
  achsAbstand,
  groundHitToPlanPt,
  intersectPlaneY,
  klassifiziereSketchTreffer,
  rayToPlanPt,
  wandTrefferZuOeffnung,
  type Ray3,
  type WandTrefferPunkt,
} from '../src/modules/design/sketch-3d';

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

describe('klassifiziereSketchTreffer — A4: Wand vs. alles andere (ROADMAP 155)', () => {
  it('ordnet eine Wand-Entity "wand" zu', () => {
    expect(klassifiziereSketchTreffer('wall')).toBe('wand');
  });

  it('ordnet Decke/Volumen/Dach/Treppe "boden" zu (Wand-Zug wie bisher)', () => {
    expect(klassifiziereSketchTreffer('slab')).toBe('boden');
    expect(klassifiziereSketchTreffer('mass')).toBe('boden');
    expect(klassifiziereSketchTreffer('roof')).toBe('boden');
    expect(klassifiziereSketchTreffer('stair')).toBe('boden');
  });

  it('ordnet keinen Treffer (Bodenraster, Knotenstück ohne Entity) "boden" zu', () => {
    expect(klassifiziereSketchTreffer(undefined)).toBe('boden');
    expect(klassifiziereSketchTreffer(null)).toBe('boden');
  });
});

describe('achsAbstand — Plan-Punkt auf die Wandachse a→b projiziert', () => {
  it('liefert 0 am Anfang, die Länge am Ende einer achsparallelen Wand', () => {
    const a = { x: 0, y: 0 };
    const b = { x: 4000, y: 0 };
    expect(achsAbstand(a, b, { x: 0, y: 0 })).toBeCloseTo(0, 6);
    expect(achsAbstand(a, b, { x: 4000, y: 0 })).toBeCloseTo(4000, 6);
    expect(achsAbstand(a, b, { x: 1500, y: 300 })).toBeCloseTo(1500, 6); // Querabstand fällt weg
  });

  it('funktioniert auch für eine diagonale Wandachse', () => {
    const a = { x: 0, y: 0 };
    const b = { x: 3000, y: 4000 }; // Länge 5000
    expect(achsAbstand(a, b, { x: 3000, y: 4000 })).toBeCloseTo(5000, 6);
    expect(achsAbstand(a, b, { x: 1500, y: 2000 })).toBeCloseTo(2500, 6);
  });

  it('liefert 0 für eine entartete Wand (a = b)', () => {
    expect(achsAbstand({ x: 5, y: 5 }, { x: 5, y: 5 }, { x: 100, y: 100 })).toBe(0);
  });
});

describe('wandTrefferZuOeffnung — Bounding-Box eines Wand-Strichs → Öffnung (A4)', () => {
  it('rechnet Mitte/Breite aus den Achsabständen, Brüstung/Höhe aus den Trefferhöhen', () => {
    const punkte: WandTrefferPunkt[] = [
      { s: 1000, hoehe: 900 },
      { s: 1000, hoehe: 2100 },
      { s: 2200, hoehe: 900 },
      { s: 2200, hoehe: 2100 },
    ];
    const v = wandTrefferZuOeffnung(punkte, 4000);
    expect(v).toEqual({ center: 1600, width: 1200, height: 1200, sill: 900 });
  });

  it('klemmt eine Mikro-Geste (Tipp) auf das Mindestmass 200mm', () => {
    const punkte: WandTrefferPunkt[] = [{ s: 2000, hoehe: 1000 }];
    const v = wandTrefferZuOeffnung(punkte, 4000)!;
    expect(v.width).toBe(200);
    expect(v.height).toBe(200);
  });

  it('klemmt die Mitte, damit die Öffnung nicht über die Wand hinausragt (Rand-Strich)', () => {
    const punkte: WandTrefferPunkt[] = [
      { s: 50, hoehe: 500 },
      { s: 1400, hoehe: 2200 },
    ];
    const v = wandTrefferZuOeffnung(punkte, 4000)!;
    // Breite 1350mm, halbe Breite 675mm — Mitte (725) würde bei s=50 unterschreiten
    expect(v.width).toBe(1350);
    expect(v.center).toBeGreaterThanOrEqual(v.width / 2);
    expect(v.center + v.width / 2).toBeLessThanOrEqual(4000);
  });

  it('klemmt die Breite auf die Wandlänge, wenn der Strich über die ganze Wand geht', () => {
    const punkte: WandTrefferPunkt[] = [
      { s: -500, hoehe: 900 },
      { s: 4500, hoehe: 2100 },
    ];
    const v = wandTrefferZuOeffnung(punkte, 4000)!;
    expect(v.width).toBe(4000);
    expect(v.center).toBe(2000);
  });

  it('klemmt Brüstung+Höhe auf die tatsächliche Wandhöhe (maxHoeheMm)', () => {
    const punkte: WandTrefferPunkt[] = [
      { s: 1000, hoehe: 2400 },
      { s: 1200, hoehe: 2900 },
    ];
    const v = wandTrefferZuOeffnung(punkte, 4000, 2500)!;
    expect(v.sill).toBeLessThanOrEqual(2500);
    expect(v.sill + v.height).toBeLessThanOrEqual(2500);
  });

  it('gibt null zurück ohne Treffer oder ohne Wandlänge', () => {
    expect(wandTrefferZuOeffnung([], 4000)).toBeNull();
    expect(wandTrefferZuOeffnung([{ s: 0, hoehe: 0 }], 0)).toBeNull();
  });
});
