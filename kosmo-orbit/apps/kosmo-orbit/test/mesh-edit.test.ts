import { describe, expect, it } from 'vitest';
import { quaderMesh } from '@kosmo/kernel';
import { kernelZuThreeLokal, meshHandles, threeDeltaZuKernel } from '../src/modules/design/mesh-edit';

/**
 * FreeMesh-Viewport-Editiermodus (Buildplan Block 3, Batch FM3/E4) — reine
 * Helfer ohne three.js/DOM: Handle-Gruppierung (Verschweissung) und die
 * three↔Kernel-Achsen-/Delta-Umrechnung, die Viewport3D beim Vertex-Drag
 * benutzt. Kein WebGL-Kontext nötig, läuft wie sketch-3d.test.ts pur.
 */

describe('meshHandles — ein Handle je geschweisster Position', () => {
  it('ein Quader hat 8 Handles, nicht 24 (je Vertex-Position, nicht je Dreiecks-Vertex)', () => {
    const { positions } = quaderMesh({ x: 0, y: 0 }, 2000, 2000, 2000);
    const handles = meshHandles(positions);
    expect(handles.length).toBe(8);
  });

  it('jedes Handle trägt alle deckungsgleichen Vertex-Indizes (Quader-Ecke gehört zu 3 Dreiecken)', () => {
    const { positions } = quaderMesh({ x: 0, y: 0 }, 2000, 2000, 2000);
    const handles = meshHandles(positions);
    for (const h of handles) {
      expect(h.indices.length).toBeGreaterThanOrEqual(1);
      for (const idx of h.indices) {
        expect(positions[idx * 3]).toBe(h.x);
        expect(positions[idx * 3 + 1]).toBe(h.y);
        expect(positions[idx * 3 + 2]).toBe(h.z);
      }
    }
  });

  it('die Vereinigung aller Handle-Indizes deckt jeden Vertex genau einmal ab', () => {
    const { positions } = quaderMesh({ x: 0, y: 0 }, 2000, 2000, 2000);
    const handles = meshHandles(positions);
    const alle = handles.flatMap((h) => h.indices).sort((a, b) => a - b);
    const erwartet = Array.from({ length: positions.length / 3 }, (_, i) => i);
    expect(alle).toEqual(erwartet);
  });

  it('ein leeres Mesh liefert keine Handles', () => {
    expect(meshHandles([])).toEqual([]);
  });
});

describe('kernelZuThreeLokal — Achsen-Umordnung wie artifactToObjects', () => {
  it('Kern (x,y,z) → three-lokal (x, z+elevation, −y)', () => {
    expect(kernelZuThreeLokal({ x: 100, y: 200, z: 300 }, 3000)).toEqual({ x: 100, y: 3300, z: -200 });
  });

  it('Elevation 0 lässt z unverändert (EG)', () => {
    expect(kernelZuThreeLokal({ x: 5, y: 6, z: 7 }, 0)).toEqual({ x: 5, y: 7, z: -6 });
  });
});

describe('threeDeltaZuKernel — three-Delta → gerundetes Kernel-Delta (Buildplan E4)', () => {
  it('reines horizontales Ziehen (dy3=0) ergibt dz=0', () => {
    expect(threeDeltaZuKernel(500, 0, -300)).toEqual({ dx: 500, dy: 300, dz: 0 });
  });

  it('reines vertikales Ziehen (dx3=dz3=0) ergibt nur dz', () => {
    expect(threeDeltaZuKernel(0, 1234, 0)).toEqual({ dx: 0, dy: 0, dz: 1234 });
  });

  it('rundet auf ganze mm (Doc-Regel)', () => {
    expect(threeDeltaZuKernel(1.4, 2.6, -1.5)).toEqual({ dx: 1, dy: 2, dz: 3 });
  });
});
