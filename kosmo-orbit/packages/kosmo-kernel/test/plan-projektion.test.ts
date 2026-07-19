import { describe, expect, it } from 'vitest';
import { projiziereOeffnungCenter, wandAchsenPunkt } from '../src/geometry/plan-projektion';

/**
 * `projiziereOeffnungCenter` / `wandAchsenPunkt` (E2, V087-SPEZ §3 D4) —
 * byte-genauer Umzug aus `apps/kosmo-orbit/src/modules/design/PlanView.tsx`
 * (Zeilen 59-68 bzw. 74-78, Stand v0.8.6/v0.8.7). Alle Ist-Werte dieser Datei
 * sind mit den unveränderten Funktionskörpern gegengerechnet (Sanktion 3:
 * 1 mm Abweichung = ungültig) — Beleg im Abschluss-Bericht PA1-087.
 */

describe('projiziereOeffnungCenter (E2, V087-SPEZ)', () => {
  const gerade = { a: { x: 0, y: 0 }, b: { x: 5000, y: 0 } };

  it('Interior-Fall (kein Clamp): Wand (0,0)→(5000,0), width 1200, p=(2000,500) → center 2000', () => {
    expect(projiziereOeffnungCenter(gerade, 1200, { x: 2000, y: 500 })).toBe(2000);
  });

  it('Oberer Clamp: Wand (0,0)→(5000,0), width 1200, p=(6000,300) → center 4400 (= 5000 − 600)', () => {
    expect(projiziereOeffnungCenter(gerade, 1200, { x: 6000, y: 300 })).toBe(4400);
  });

  it('Unterer Clamp: Wand (0,0)→(5000,0), width 1200, p=(-2000,0) → center 600 (= halbeBreite)', () => {
    expect(projiziereOeffnungCenter(gerade, 1200, { x: -2000, y: 0 })).toBe(600);
  });

  it('Null-Länge-Wand: len===0 → gibt halbeBreite zurück, unabhängig vom Klickpunkt', () => {
    const nullWand = { a: { x: 1000, y: 2000 }, b: { x: 1000, y: 2000 } };
    expect(projiziereOeffnungCenter(nullWand, 800, { x: 5000, y: 5000 })).toBe(400);
    expect(projiziereOeffnungCenter(nullWand, 800, { x: -9000, y: 100 })).toBe(400);
  });

  it('Schräge Wand (0,0)→(1000,1000), width 200, p=(700,300) → center 707 (gerundet)', () => {
    // roh = 1_000_000 / hypot(1000,1000) = 707.1067811865476 → Math.round → 707
    expect(projiziereOeffnungCenter({ a: { x: 0, y: 0 }, b: { x: 1000, y: 1000 } }, 200, { x: 700, y: 300 })).toBe(
      707,
    );
  });
});

describe('wandAchsenPunkt (E2, V087-SPEZ)', () => {
  it('Wand (0,0)→(5000,0), center 4400 → {x:4400,y:0} (Umkehrung von projiziereOeffnungCenter oben)', () => {
    expect(wandAchsenPunkt({ a: { x: 0, y: 0 }, b: { x: 5000, y: 0 } }, 4400)).toEqual({ x: 4400, y: 0 });
  });

  it('Null-Länge-Wand: len-Fallback `|| 1` hält a fest, unabhängig vom center', () => {
    const nullWand = { a: { x: 1000, y: 2000 }, b: { x: 1000, y: 2000 } };
    expect(wandAchsenPunkt(nullWand, 300)).toEqual({ x: 1000, y: 2000 });
    expect(wandAchsenPunkt(nullWand, -500)).toEqual({ x: 1000, y: 2000 });
  });

  it('Schräge Wand (0,0)→(1000,1000): KEINE eigene Rundung — liefert den rohen Float-Weltpunkt', () => {
    const diag = { a: { x: 0, y: 0 }, b: { x: 1000, y: 1000 } };
    const p = wandAchsenPunkt(diag, 500);
    expect(p.x).toBeCloseTo(353.5533905932737, 9);
    expect(p.y).toBeCloseTo(353.5533905932737, 9);
  });

  it('Rundtrip: center aus projiziereOeffnungCenter zurück in wandAchsenPunkt liegt nahe am geklickten Punkt', () => {
    const diag = { a: { x: 0, y: 0 }, b: { x: 1000, y: 1000 } };
    const center = projiziereOeffnungCenter(diag, 200, { x: 700, y: 300 });
    expect(center).toBe(707);
    const p = wandAchsenPunkt(diag, center);
    expect(p.x).toBeCloseTo(499.92449429888904, 9);
    expect(p.y).toBeCloseTo(499.92449429888904, 9);
  });
});
