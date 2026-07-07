import { describe, expect, it } from 'vitest';
import {
  cropSplat,
  decimateSplat,
  parsePlyGaussian,
  parseSplatCloud,
  parseSplatFile,
  writeSplatFile,
  MAX_SPLAT_BYTES,
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

/** Baut einen minimalen Gaussian-PLY-Header (binary_little_endian, x/y/z) mit
 * einer wählbaren `element vertex`-Zahl — für die Fuzz-Fälle unten. */
function baueGaussianPlyBuffer(vertexAnzahl: number, echteVertexBytes: number): ArrayBuffer {
  const header =
    'ply\nformat binary_little_endian 1.0\n' +
    `element vertex ${vertexAnzahl}\n` +
    'property float x\nproperty float y\nproperty float z\n' +
    'end_header\n';
  const headerBytes = new TextEncoder().encode(header);
  const buffer = new ArrayBuffer(headerBytes.length + echteVertexBytes);
  new Uint8Array(buffer).set(headerBytes, 0);
  return buffer;
}

describe('Fuzz-Korpus (Serie I / B7 — Parser-Robustheit): kaputte/bösartige Splat-Dateien', () => {
  it('parseSplatFile: leerer Buffer ergibt eine leere Wolke statt Absturz', () => {
    expect(() => parseSplatFile(new ArrayBuffer(0))).not.toThrow();
    expect(parseSplatFile(new ArrayBuffer(0)).count).toBe(0);
  });

  it('parseSplatFile: abgeschnittener Buffer (kein Vielfaches von 32 Bytes) crasht nicht', () => {
    const angeschnitten = new ArrayBuffer(50); // 1 volle Splat-Zeile + Rest verworfen
    expect(() => parseSplatFile(angeschnitten)).not.toThrow();
    expect(parseSplatFile(angeschnitten).count).toBe(1);
  });

  it('parseSplatFile: übergrosse Datei → definierter Fehler statt Hänger', () => {
    const riesig = new ArrayBuffer(MAX_SPLAT_BYTES + 32);
    expect(() => parseSplatFile(riesig)).toThrow(/zu gross/);
  });

  it('parsePlyGaussian: leerer Buffer → definierter Fehler, kein Absturz', () => {
    expect(() => parsePlyGaussian(new ArrayBuffer(0))).toThrow(/end_header/);
  });

  it('parsePlyGaussian: kaputtes/fremdes Geschwafel statt PLY → definierter Fehler', () => {
    const muell = new TextEncoder().encode('DAS IST KEIN PLY %%%% ???');
    expect(() => parsePlyGaussian(muell.buffer as ArrayBuffer)).toThrow(/end_header/);
  });

  it('parsePlyGaussian: Header verspricht mehr Vertices als Bytes vorhanden (abgeschnitten) → definierter Fehler', () => {
    // Header sagt 1000 Vertices, aber es folgt nur 1 einziger Vertex an Bytes.
    const buffer = baueGaussianPlyBuffer(1000, 3 * 4);
    expect(() => parsePlyGaussian(buffer)).toThrow(/abgeschnitten/);
  });

  it('parsePlyGaussian: absurde Vertex-Zahl im Header → definierter Fehler statt Allokationsversuch', () => {
    const buffer = baueGaussianPlyBuffer(999_999_999_999, 0);
    expect(() => parsePlyGaussian(buffer)).toThrow(/unplausible Vertex-Zahl/);
  });

  it('parsePlyGaussian: übergrosse Datei → definierter Fehler statt Hänger', () => {
    const riesig = new ArrayBuffer(MAX_SPLAT_BYTES + 32);
    expect(() => parsePlyGaussian(riesig)).toThrow(/zu gross/);
  });

  it('parsePlyGaussian: gültige kleine Datei lädt weiterhin normal (Positivfall)', () => {
    const buffer = baueGaussianPlyBuffer(2, 2 * 3 * 4);
    // Absichtlich per DataView geschrieben statt Float32Array — der
    // Header-Offset ist bei echten PLYs so gut wie nie 4-Byte-aligned
    // (siehe B7-Fund oben), das ist genau der Fall, den dieser Test beweist.
    const dv = new DataView(buffer, buffer.byteLength - 2 * 3 * 4);
    [1, 2, 3, 4, 5, 6].forEach((v, i) => dv.setFloat32(i * 4, v, true));
    const cloud = parsePlyGaussian(buffer);
    expect(cloud.count).toBe(2);
    expect(cloud.positions[0]).toBe(1);
    expect(cloud.positions[5]).toBe(6);
  });

  it('parseSplatCloud: Dateiname entscheidet .ply vs .splat, beide Fehlerpfade bleiben definiert', () => {
    expect(() => parseSplatCloud('kaputt.ply', new ArrayBuffer(4))).toThrow();
    expect(() => parseSplatCloud('kaputt.splat', new ArrayBuffer(4))).not.toThrow(); // 4 Bytes < 32 → count 0, kein Crash
  });
});
