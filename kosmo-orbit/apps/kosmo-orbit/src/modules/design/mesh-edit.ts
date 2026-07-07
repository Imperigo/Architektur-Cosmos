import { gleichePositionen } from '@kosmo/kernel';

/**
 * FreeMesh-Editiermodus (Buildplan Block 3, Batch FM3/E4) — reine Helfer ohne
 * three.js/DOM, damit sie ohne WebGL-Kontext testbar bleiben. Das Andocken
 * an die Szene (Handle-Meshes, Raycasting, Pointer-Drag) bleibt in
 * Viewport3D.tsx; hier steckt nur, was ein Unit-Test direkt greifen kann:
 * Handle-Gruppierung (Verschweissung) und die three↔Kernel-Delta-Umrechnung.
 * KEIN allgemeines Gizmo-Framework (§5 Buildplan) — nur dieser eine Modus.
 */

/** Ein Vertex-Handle: eine eindeutige (geschweisste) Position + alle
 * Vertex-Indizes, die beim Ziehen gemeinsam verschoben werden (E3 — die
 * Verschweissung liefert `gleichePositionen` aus derive/mesh-topo). */
export interface MeshHandle {
  /** Kernel-Position (x,y,z relativ zur Geschoss-OK, mm — ohne elevation). */
  x: number;
  y: number;
  z: number;
  /** Alle deckungsgleichen Vertex-Indizes (design.meshVertexSchieben.indices). */
  indices: number[];
}

/**
 * Ein Handle je eindeutiger Position: iteriert die Vertices der Reihe nach
 * und gruppiert per `gleichePositionen`, sodass jede geschweisste Ecke genau
 * EIN Handle bekommt (statt eines je Dreiecks-Vertex — ein Quader hat 8
 * Handles, nicht 24). Reihenfolge folgt dem ersten Auftreten in `positions`.
 */
export function meshHandles(positions: readonly number[]): MeshHandle[] {
  const vertexCount = positions.length / 3;
  const gesehen = new Set<number>();
  const out: MeshHandle[] = [];
  for (let i = 0; i < vertexCount; i++) {
    if (gesehen.has(i)) continue;
    const indices = gleichePositionen(positions as number[], i);
    for (const idx of indices) gesehen.add(idx);
    out.push({
      x: positions[i * 3]!,
      y: positions[i * 3 + 1]!,
      z: positions[i * 3 + 2]!,
      indices,
    });
  }
  return out;
}

/**
 * Kernel-Position (x,y,z relativ zur Geschoss-OK) → three-lokal in mm, VOR
 * der MM-Skalierung der Modell-Gruppe (Viewport3D: `model.scale.set(MM,MM,MM)`)
 * — dieselbe Achsen-Umordnung wie `artifactToObjects`: Kern (x,y,z) →
 * three (x, z, −y); z bekommt die Geschoss-Elevation dazu (Buildplan E4).
 */
export function kernelZuThreeLokal(
  p: { x: number; y: number; z: number },
  elevationMm: number,
): { x: number; y: number; z: number } {
  return { x: p.x, y: p.z + elevationMm, z: -p.y };
}

/**
 * three-Delta (mm, lokal — VOR MM-Skalierung, numerisch also Weltmeter/MM)
 * → gerundetes Kernel-Delta für `design.meshVertexSchieben` (dx/dy/dz sind
 * ganzzahlige mm — der Command lehnt Nicht-Ganzzahlen und 0/0/0 ab). Die
 * Achsen-Umkehr folgt derselben Umordnung wie oben, nur rückwärts: three
 * y-up ↔ Kern z-up, three z ↔ −Kern y (Buildplan E4: dxK=dx3, dyK=−dz3,
 * dzK=dy3).
 */
export function threeDeltaZuKernel(
  dx3: number,
  dy3: number,
  dz3: number,
): { dx: number; dy: number; dz: number } {
  // `+ 0` normalisiert ein rundungsbedingtes -0 auf 0 (sonst würde ein
  // Nur-Achse-Delta wie dx=0/dy=-0/dz=5 den 0/0/0-Guard des Commands stören).
  return { dx: Math.round(dx3) + 0, dy: Math.round(-dz3) + 0, dz: Math.round(dy3) + 0 };
}
