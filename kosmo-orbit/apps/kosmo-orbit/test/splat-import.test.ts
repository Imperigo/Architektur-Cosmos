import { describe, expect, it } from 'vitest';
import {
  cropSplat,
  decimateSplat,
  parseSplatFile,
  writeSplatFile,
  type SplatCloud,
} from '../src/modules/design/splat-import';

/**
 * Splat-Werkzeug, Stufe 1 (Owner-Korrektur 05.07.: NICHT HomeStation-
 * exklusiv) — Export/Zuschneiden/Ausdünnen laufen komplett lokal im Browser,
 * hier ohne DOM als reine Funktionen geprüft.
 */

function baueWolke(): SplatCloud {
  // 3 Punkte: einer im Ursprung, einer weit draussen, einer knapp am Rand.
  const positions = new Float32Array([0, 0, 0, 100, 100, 100, 5, -5, 2]);
  const colors = new Float32Array([1, 0, 0, 1, 0, 1, 0, 0.5, 0, 0, 1, 0.25]);
  const sizes = new Float32Array([0.05, 0.2, 0.1]);
  return { positions, colors, sizes, count: 3 };
}

describe('writeSplatFile — antimatter15-Rundtrip', () => {
  it('schreibt eine Wolke so, dass parseSplatFile Lage/Farbe/Grösse wieder erkennt', () => {
    const cloud = baueWolke();
    const buffer = writeSplatFile(cloud);
    expect(buffer.byteLength).toBe(cloud.count * 32);

    const zurueck = parseSplatFile(buffer);
    expect(zurueck.count).toBe(cloud.count);
    for (let i = 0; i < cloud.count; i++) {
      expect(zurueck.positions[i * 3]).toBeCloseTo(cloud.positions[i * 3]!, 5);
      expect(zurueck.positions[i * 3 + 1]).toBeCloseTo(cloud.positions[i * 3 + 1]!, 5);
      expect(zurueck.positions[i * 3 + 2]).toBeCloseTo(cloud.positions[i * 3 + 2]!, 5);
      expect(zurueck.sizes[i]).toBeCloseTo(cloud.sizes[i]!, 5);
      // Farbe: Rundung auf 8-Bit-Kanäle bleibt beim zweiten Rundtrip stabil
      expect(zurueck.colors[i * 4]).toBeCloseTo(cloud.colors[i * 4]!, 2);
      expect(zurueck.colors[i * 4 + 3]).toBeCloseTo(cloud.colors[i * 4 + 3]!, 2);
    }
  });

  it('ist danach stabil (zweiter Rundtrip verändert nichts mehr)', () => {
    const cloud = baueWolke();
    const einmal = parseSplatFile(writeSplatFile(cloud));
    const zweimal = parseSplatFile(writeSplatFile(einmal));
    expect(Array.from(zweimal.positions)).toEqual(Array.from(einmal.positions));
    expect(Array.from(zweimal.colors)).toEqual(Array.from(einmal.colors));
    expect(Array.from(zweimal.sizes)).toEqual(Array.from(einmal.sizes));
  });

  it('leere Wolke ergibt einen leeren Buffer', () => {
    const leer: SplatCloud = { positions: new Float32Array(), colors: new Float32Array(), sizes: new Float32Array(), count: 0 };
    expect(writeSplatFile(leer).byteLength).toBe(0);
  });
});

describe('cropSplat — Zuschneiden auf eine Box', () => {
  it('behält nur Punkte innerhalb der Box (inklusive Rand)', () => {
    const cloud = baueWolke();
    const zugeschnitten = cropSplat(cloud, { min: [-1, -1, -1], max: [10, 10, 10] });
    // Punkt 0 (0,0,0) und Punkt 2 (5,-5,2) liegen NICHT beide drin: y=-5 < -1 raus
    expect(zugeschnitten.count).toBe(1);
    expect(zugeschnitten.positions[0]).toBe(0);
  });

  it('Box, die alles einschliesst, behält alle Punkte (Reihenfolge/Werte erhalten)', () => {
    const cloud = baueWolke();
    const alle = cropSplat(cloud, { min: [-1000, -1000, -1000], max: [1000, 1000, 1000] });
    expect(alle.count).toBe(cloud.count);
    expect(Array.from(alle.positions)).toEqual(Array.from(cloud.positions));
  });

  it('Box ohne Treffer ergibt eine leere Wolke', () => {
    const cloud = baueWolke();
    const leer = cropSplat(cloud, { min: [500, 500, 500], max: [600, 600, 600] });
    expect(leer.count).toBe(0);
    expect(leer.positions.length).toBe(0);
  });
});

describe('decimateSplat — Ausdünnen fürs flüssige Anzeigen', () => {
  it('behält bei Faktor 1 alles unverändert (dieselbe Referenz)', () => {
    const cloud = baueWolke();
    expect(decimateSplat(cloud, 1)).toBe(cloud);
    expect(decimateSplat(cloud, 0)).toBe(cloud);
  });

  it('behält bei Faktor 2 jeden zweiten Punkt (Index 0, 2, …)', () => {
    const positions = new Float32Array(10 * 3);
    const colors = new Float32Array(10 * 4);
    const sizes = new Float32Array(10);
    for (let i = 0; i < 10; i++) {
      positions[i * 3] = i;
      sizes[i] = 0.1;
    }
    const cloud: SplatCloud = { positions, colors, sizes, count: 10 };
    const duenn = decimateSplat(cloud, 2);
    expect(duenn.count).toBe(5);
    expect(Array.from({ length: 5 }, (_, i) => duenn.positions[i * 3])).toEqual([0, 2, 4, 6, 8]);
  });
});
