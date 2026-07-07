import { describe, expect, it } from 'vitest';
import {
  baueFreeMeshDaten,
  rundeMm,
  threePunktZuKernelMm,
  verschiebeAufGeschossOk,
  verschweisseDreiecksSuppe,
} from '../src/modules/asset/glb-zu-mesh';

/**
 * GLB→FreeMesh (Buildplan Block 3, Batch FM4/E6) — reine Zerlege-/
 * Schweiss-Helfer ohne three.js/DOM, analog `mesh-edit.test.ts` (FM3): läuft
 * ohne WebGL-Kontext. Der dünne three-Adapter `glbZuMeshDaten` selbst bleibt
 * hier bewusst ungetestet (bräuchte einen echten GLTFLoader/DOM) — was er
 * tut, ist auf diese Funktionen reduziert.
 */

/** Baut eine flache Dreiecks-«Suppe» aus einer Liste von Eckpunkt-Tripeln
 * (jede 3er-Gruppe von Punkten = ein Dreieck, keine Indizierung). */
function suppeAus(dreiecke: [number, number, number][][]): number[] {
  const out: number[] = [];
  for (const dreieck of dreiecke) {
    for (const [x, y, z] of dreieck) out.push(x, y, z);
  }
  return out;
}

// Würfel 0..2000mm, 8 Ecken, 6 Flächen à 2 Dreiecke = 12 Dreiecke = 36
// Suppen-Vertices (jede Ecke kommt in 3 Dreiecken vor).
const p0: [number, number, number] = [0, 0, 0];
const p1: [number, number, number] = [2000, 0, 0];
const p2: [number, number, number] = [2000, 2000, 0];
const p3: [number, number, number] = [0, 2000, 0];
const p4: [number, number, number] = [0, 0, 2000];
const p5: [number, number, number] = [2000, 0, 2000];
const p6: [number, number, number] = [2000, 2000, 2000];
const p7: [number, number, number] = [0, 2000, 2000];

const wuerfelSuppe = suppeAus([
  [p0, p1, p2], [p0, p2, p3], // unten
  [p4, p6, p5], [p4, p7, p6], // oben
  [p0, p5, p1], [p0, p4, p5], // vorne
  [p3, p2, p6], [p3, p6, p7], // hinten
  [p0, p3, p7], [p0, p7, p4], // links
  [p1, p6, p2], [p1, p5, p6], // rechts
]);

describe('threePunktZuKernelMm — Achsen-Umkehr (bekannter Punkt)', () => {
  it('kehrt Kern(x,y,z)→three(x,z,−y) um: xK=x3, yK=−z3, zK=y3, ×1000 Meter→mm', () => {
    expect(threePunktZuKernelMm(1, 2, 3)).toEqual([1000, -3000, 2000]);
  });

  it('ist zur Vorwärtsrichtung aus derive/gltf.ts konsistent (Roundtrip)', () => {
    // derive/gltf.ts: xThree=xKern·MM, yThree=zKern·MM, zThree=−yKern·MM.
    const MM = 1 / 1000;
    const kern = { x: 4500, y: -1200, z: 3000 };
    const x3 = kern.x * MM;
    const y3 = kern.z * MM;
    const z3 = -kern.y * MM;
    expect(threePunktZuKernelMm(x3, y3, z3)).toEqual([kern.x, kern.y, kern.z]);
  });
});

describe('rundeMm / Meter→mm-Rundung', () => {
  it('rundet auf ganze Millimeter', () => {
    expect(rundeMm(1234.6)).toBe(1235);
    expect(rundeMm(1234.4)).toBe(1234);
  });

  it('rundet einen three-Meterwert nach der Achsen-Umkehr korrekt auf ganze mm', () => {
    // 0.1234567 m → 123.4567 mm → 123 mm
    const [xK] = threePunktZuKernelMm(0.1234567, 0, 0);
    expect(rundeMm(xK)).toBe(123);
  });
});

describe('verschweisseDreiecksSuppe — Verschweissung reduziert Duplikate', () => {
  it('36 Dreiecks-Vertices eines Würfels verschweissen zu 8 eindeutigen Positionen', () => {
    const { positions, faces } = verschweisseDreiecksSuppe(wuerfelSuppe);
    expect(positions.length / 3).toBe(8);
    expect(faces.length / 3).toBe(12);
  });

  it('Index-Konsistenz: alle Flächen-Indizes liegen unter der Vertex-Zahl', () => {
    const { positions, faces } = verschweisseDreiecksSuppe(wuerfelSuppe);
    const vertexCount = positions.length / 3;
    for (const idx of faces) {
      expect(idx).toBeGreaterThanOrEqual(0);
      expect(idx).toBeLessThan(vertexCount);
    }
  });

  it('leicht unterschiedliche, aber auf dieselbe mm-Zahl rundende Positionen gelten als deckungsgleich', () => {
    const fastGleich = suppeAus([
      [[0, 0, 0], [1000.49, 0, 0], [0, 1000, 0]],
      [[0.001, 0, 0], [1000, 0, 0], [0, 1000.4, 0]],
    ]);
    const { positions } = verschweisseDreiecksSuppe(fastGleich);
    // (0,0,0)≈(0.001,0,0)→(0,0,0); (1000.49,0,0)≈(1000,0,0)→(1000,0,0);
    // (0,1000,0)≈(0,1000.4,0)→(0,1000,0) — 3 eindeutige Ecken statt 6.
    expect(positions.length / 3).toBe(3);
  });
});

describe('verschiebeAufGeschossOk — minZ-Shift', () => {
  it('verschiebt z so, dass die kleinste Z-Koordinate 0 wird, x/y bleiben unverändert', () => {
    const positionen = [100, 200, -500, 300, 400, 1500, 700, -100, 500];
    const out = verschiebeAufGeschossOk(positionen);
    // z-Werte lagen bei -500/1500/500 → minZ=-500 → Verschiebung +500.
    expect(out).toEqual([100, 200, 0, 300, 400, 2000, 700, -100, 1000]);
  });

  it('ein leeres Array liefert ein leeres Ergebnis', () => {
    expect(verschiebeAufGeschossOk([])).toEqual([]);
  });
});

describe('baueFreeMeshDaten — Gesamt-Pipeline', () => {
  it('verschweisst und verschiebt den Würfel auf die Geschoss-OK (minZ=0)', () => {
    const { positions, faces, vertexCount, faceCount } = baueFreeMeshDaten(wuerfelSuppe);
    expect(vertexCount).toBe(8);
    expect(faceCount).toBe(12);
    let minZ = Infinity;
    for (let i = 2; i < positions.length; i += 3) minZ = Math.min(minZ, positions[i]!);
    expect(minZ).toBe(0);
    for (const idx of faces) expect(idx).toBeLessThan(vertexCount);
  });

  it('ein leeres Eingabe-Array liefert ein leeres Ergebnis (kein Fehler)', () => {
    const ergebnis = baueFreeMeshDaten([]);
    expect(ergebnis).toEqual({ positions: [], faces: [], vertexCount: 0, faceCount: 0 });
  });

  it('ein degeneriertes Eingabe-Array (kein Vielfaches von 9 = unvollständiges Dreieck) liefert ein leeres Ergebnis', () => {
    const ergebnis = baueFreeMeshDaten([1, 2, 3, 4, 5]);
    expect(ergebnis).toEqual({ positions: [], faces: [], vertexCount: 0, faceCount: 0 });
  });
});
