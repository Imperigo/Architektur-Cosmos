import earcut from 'earcut';
import type { Pt } from '../model/units';

/**
 * Mesh-Topologie für FreeMesh (V2-Technik Block 3, Buildplan E2/E3) — REINE
 * Funktionen ohne Zustand und ohne three.js. Das Doc speichert nur flache
 * `positions`/`faces`; alles Abgeleitete (Verschweissung, Normalen, planare
 * Regionen, Extrusion) entsteht hier zur Laufzeit und ist einzeln testbar.
 * Kein Budget-Check in dieser Datei: die Commands sind der Wächter (E1) —
 * hier wird gerechnet, dort wird abgewiesen.
 */

export interface MeshDaten {
  /** Flach [x0,y0,z0, x1,…] in mm. */
  positions: number[];
  /** Flach [a0,b0,c0, a1,…], Dreiecke, Winding auswärts (CCW). */
  faces: number[];
}

/** Alle Vertex-Indizes mit EXAKT derselben Position wie `index` (inkl. sich
 * selbst). Positionen sind ganzzahlige mm — exakter Vergleich ist korrekt.
 * Das ist die «Verschweissung» fürs Editieren: wer eine Ecke zieht, zieht
 * alle deckungsgleichen Vertices mit. */
export function gleichePositionen(positions: number[], index: number): number[] {
  const x = positions[index * 3];
  const y = positions[index * 3 + 1];
  const z = positions[index * 3 + 2];
  const out: number[] = [];
  for (let i = 0; i * 3 < positions.length; i++) {
    if (positions[i * 3] === x && positions[i * 3 + 1] === y && positions[i * 3 + 2] === z) out.push(i);
  }
  return out;
}

/** Nicht normierte Flächennormale des Dreiecks `face` (Kreuzprodukt). */
function rohNormale(positions: number[], faces: number[], face: number): [number, number, number] {
  const a = faces[face * 3]! * 3;
  const b = faces[face * 3 + 1]! * 3;
  const c = faces[face * 3 + 2]! * 3;
  const e1 = [positions[b]! - positions[a]!, positions[b + 1]! - positions[a + 1]!, positions[b + 2]! - positions[a + 2]!];
  const e2 = [positions[c]! - positions[a]!, positions[c + 1]! - positions[a + 1]!, positions[c + 2]! - positions[a + 2]!];
  return [
    e1[1]! * e2[2]! - e1[2]! * e2[1]!,
    e1[2]! * e2[0]! - e1[0]! * e2[2]!,
    e1[0]! * e2[1]! - e1[1]! * e2[0]!,
  ];
}

/** Normierte Flächennormale; [0,0,0] bei degeneriertem Dreieck. */
export function flaechenNormale(positions: number[], faces: number[], face: number): [number, number, number] {
  const n = rohNormale(positions, faces, face);
  const len = Math.hypot(n[0], n[1], n[2]);
  if (len === 0) return [0, 0, 0];
  return [n[0] / len, n[1] / len, n[2] / len];
}

/** Schlüssel einer ungerichteten Kante über GESCHWEISSTE Positionen — zwei
 * Dreiecke gelten auch dann als Nachbarn, wenn sie deckungsgleiche, aber
 * getrennt indizierte Vertices teilen (Dreieckssuppe nach Extrusionen). */
function posKey(positions: number[], v: number): string {
  return `${positions[v * 3]},${positions[v * 3 + 1]},${positions[v * 3 + 2]}`;
}
function kantenKey(positions: number[], v1: number, v2: number): string {
  const a = posKey(positions, v1);
  const b = posKey(positions, v2);
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

/** Zählt jede ungerichtete Kante (über geschweisste Positionen). In einem
 * wasserdichten Mesh trägt jede Kante GENAU 2 Dreiecke — der Test-Anker. */
export function kantenZaehlung(positions: number[], faces: number[]): Map<string, number> {
  const out = new Map<string, number>();
  for (let f = 0; f * 3 < faces.length; f++) {
    for (let k = 0; k < 3; k++) {
      const key = kantenKey(positions, faces[f * 3 + k]!, faces[f * 3 + ((k + 1) % 3)]!);
      out.set(key, (out.get(key) ?? 0) + 1);
    }
  }
  return out;
}

/**
 * Planare Region um das Seed-Dreieck: Flutung über gemeinsame Kanten,
 * solange die Flächennormale (Toleranz `tolGrad`) übereinstimmt. Das ist
 * die Einheit des Flächen-Extrudierens (E3) — Morph-Handgefühl statt
 * Einzeldreieck-Gefrickel. Liefert Dreiecks-Indizes inkl. Seed.
 */
export function planareRegion(positions: number[], faces: number[], seed: number, tolGrad = 1): number[] {
  const faceCount = faces.length / 3;
  if (seed < 0 || seed >= faceCount) return [];
  const nSeed = flaechenNormale(positions, faces, seed);
  const minDot = Math.cos((tolGrad * Math.PI) / 180);

  // Kante → angrenzende Dreiecke (über geschweisste Positionen).
  const anKante = new Map<string, number[]>();
  for (let f = 0; f < faceCount; f++) {
    for (let k = 0; k < 3; k++) {
      const key = kantenKey(positions, faces[f * 3 + k]!, faces[f * 3 + ((k + 1) % 3)]!);
      const liste = anKante.get(key);
      if (liste) liste.push(f);
      else anKante.set(key, [f]);
    }
  }

  const region = new Set<number>([seed]);
  const stapel = [seed];
  while (stapel.length > 0) {
    const f = stapel.pop()!;
    for (let k = 0; k < 3; k++) {
      const key = kantenKey(positions, faces[f * 3 + k]!, faces[f * 3 + ((k + 1) % 3)]!);
      for (const nachbar of anKante.get(key) ?? []) {
        if (region.has(nachbar)) continue;
        const n = flaechenNormale(positions, faces, nachbar);
        if (n[0] * nSeed[0] + n[1] * nSeed[1] + n[2] * nSeed[2] >= minDot) {
          region.add(nachbar);
          stapel.push(nachbar);
        }
      }
    }
  }
  return [...region].sort((a, b) => a - b);
}

/**
 * Extrudiert eine planare Region entlang ihrer (Seed-)Normalen um `distanz`
 * mm (negativ = einwärts): die Regions-Dreiecke wandern auf neue, verschobene
 * Vertices; je Rand-Kante entstehen zwei Seiten-Dreiecke. Ein wasserdichtes
 * Mesh bleibt wasserdicht (Test-Anker: kantenZaehlung überall === 2).
 * Positionen werden ganzzahlig gerundet (mm — Doc-Regel).
 */
export function extrudiereRegion(mesh: MeshDaten, region: number[], distanz: number): MeshDaten {
  if (region.length === 0 || distanz === 0) return { positions: [...mesh.positions], faces: [...mesh.faces] };
  const { positions, faces } = mesh;
  const n = flaechenNormale(positions, faces, region[0]!);
  const dx = Math.round(n[0] * distanz);
  const dy = Math.round(n[1] * distanz);
  const dz = Math.round(n[2] * distanz);

  const neuePositions = [...positions];
  const neueFaces: number[] = [];
  const inRegion = new Set(region);

  // Alte Regions-Vertices → verschobene Kopien (einmal je Vertex-Index).
  const kopie = new Map<number, number>();
  const kopiere = (v: number): number => {
    const vorhanden = kopie.get(v);
    if (vorhanden !== undefined) return vorhanden;
    const neu = neuePositions.length / 3;
    neuePositions.push(positions[v * 3]! + dx, positions[v * 3 + 1]! + dy, positions[v * 3 + 2]! + dz);
    kopie.set(v, neu);
    return neu;
  };

  // Gerichtete Kanten der Region zählen: eine Kante, deren Gegenrichtung
  // NICHT in der Region liegt, ist Rand (Winding bleibt erhalten, darum
  // stimmt die Orientierung der Seitenflächen automatisch).
  const gerichtet = new Map<string, number>();
  const richtKey = (v1: number, v2: number) => `${posKey(positions, v1)}>${posKey(positions, v2)}`;
  for (const f of region) {
    for (let k = 0; k < 3; k++) {
      const a = faces[f * 3 + k]!;
      const b = faces[f * 3 + ((k + 1) % 3)]!;
      gerichtet.set(richtKey(a, b), (gerichtet.get(richtKey(a, b)) ?? 0) + 1);
    }
  }

  for (let f = 0; f * 3 < faces.length; f++) {
    const a = faces[f * 3]!;
    const b = faces[f * 3 + 1]!;
    const c = faces[f * 3 + 2]!;
    if (!inRegion.has(f)) {
      neueFaces.push(a, b, c);
      continue;
    }
    // Regions-Dreieck wandert nach oben (gleiche Winding → gleiche Normale).
    neueFaces.push(kopiere(a), kopiere(b), kopiere(c));
    // Rand-Kanten → Seitenflächen (Quad als zwei Dreiecke).
    const ecken = [a, b, c];
    for (let k = 0; k < 3; k++) {
      const v1 = ecken[k]!;
      const v2 = ecken[(k + 1) % 3]!;
      if ((gerichtet.get(richtKey(v2, v1)) ?? 0) > 0) continue; // innere Kante
      neueFaces.push(v1, v2, kopiere(v2));
      neueFaces.push(v1, kopiere(v2), kopiere(v1));
    }
  }
  return { positions: neuePositions, faces: neueFaces };
}

/** Quader als geschweisstes Mesh (8 Vertices, 12 Dreiecke, Winding auswärts).
 * z relativ zur Geschoss-OK; `at` ist die Ecke mit minimalem x/y. */
export function quaderMesh(at: Pt, breite: number, laenge: number, hoehe: number, z0 = 0): MeshDaten {
  const x0 = Math.round(at.x);
  const y0 = Math.round(at.y);
  const x1 = x0 + Math.round(breite);
  const y1 = y0 + Math.round(laenge);
  const z1 = z0 + Math.round(hoehe);
  const positions = [
    x0, y0, z0, x1, y0, z0, x1, y1, z0, x0, y1, z0,
    x0, y0, z1, x1, y0, z1, x1, y1, z1, x0, y1, z1,
  ];
  const faces = [
    0, 2, 1, 0, 3, 2, // Boden (-z)
    4, 5, 6, 4, 6, 7, // Deckel (+z)
    0, 1, 5, 0, 5, 4, // Front (-y)
    1, 2, 6, 1, 6, 5, // rechts (+x)
    2, 3, 7, 2, 7, 6, // Rücken (+y)
    3, 0, 4, 3, 4, 7, // links (-x)
  ];
  return { positions, faces };
}

/** Signierte 2D-Fläche eines Polygons (positiv = CCW). */
function signierteFlaeche(outline: Pt[]): number {
  let s = 0;
  for (let i = 0; i < outline.length; i++) {
    const p = outline[i]!;
    const q = outline[(i + 1) % outline.length]!;
    s += p.x * q.y - q.x * p.y;
  }
  return s / 2;
}

/**
 * Prisma aus einem Polygon (MassBody → FreeMesh, E3 «ausVolumen»): 2n
 * geschweisste Vertices, earcut-Deckel, Seiten-Quads. Winding auswärts;
 * ein CW-Polygon wird intern zu CCW gedreht.
 */
export function prismaMesh(outline: Pt[], z0: number, z1: number): MeshDaten {
  const ccw = signierteFlaeche(outline) >= 0 ? outline : [...outline].reverse();
  const n = ccw.length;
  const positions: number[] = [];
  for (const p of ccw) positions.push(Math.round(p.x), Math.round(p.y), Math.round(z0));
  for (const p of ccw) positions.push(Math.round(p.x), Math.round(p.y), Math.round(z1));

  const flach: number[] = [];
  for (const p of ccw) flach.push(p.x, p.y);
  const deckelTris = earcut(flach); // CCW-Polygon → Dreiecke mit +z-Normale

  const faces: number[] = [];
  for (let i = 0; i < deckelTris.length; i += 3) {
    const a = deckelTris[i]!;
    const b = deckelTris[i + 1]!;
    const c = deckelTris[i + 2]!;
    faces.push(a, c, b); // Boden: -z → Winding umkehren
    faces.push(a + n, b + n, c + n); // Deckel: +z
  }
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    faces.push(i, j, j + n);
    faces.push(i, j + n, i + n);
  }
  return { positions, faces };
}

/**
 * Feature-Kanten fürs Linien-Overlay im Viewport (E5): Kanten, deren zwei
 * Nachbarflächen um mehr als `winkelGrad` knicken, plus offene Randkanten.
 * Liefert flache Punktpaare [x1,y1,z1,x2,y2,z2, …] in Kern-Koordinaten.
 */
export function featureKanten(positions: number[], faces: number[], winkelGrad = 25): number[] {
  const minDot = Math.cos((winkelGrad * Math.PI) / 180);
  const anKante = new Map<string, { v1: number; v2: number; faces: number[] }>();
  for (let f = 0; f * 3 < faces.length; f++) {
    for (let k = 0; k < 3; k++) {
      const v1 = faces[f * 3 + k]!;
      const v2 = faces[f * 3 + ((k + 1) % 3)]!;
      const key = kantenKey(positions, v1, v2);
      const eintrag = anKante.get(key);
      if (eintrag) eintrag.faces.push(f);
      else anKante.set(key, { v1, v2, faces: [f] });
    }
  }
  const out: number[] = [];
  for (const { v1, v2, faces: fs } of anKante.values()) {
    let feature = fs.length !== 2;
    if (!feature) {
      const n1 = flaechenNormale(positions, faces, fs[0]!);
      const n2 = flaechenNormale(positions, faces, fs[1]!);
      feature = n1[0] * n2[0] + n1[1] * n2[1] + n1[2] * n2[2] < minDot;
    }
    if (feature) {
      out.push(
        positions[v1 * 3]!, positions[v1 * 3 + 1]!, positions[v1 * 3 + 2]!,
        positions[v2 * 3]!, positions[v2 * 3 + 1]!, positions[v2 * 3 + 2]!,
      );
    }
  }
  return out;
}

/** Signiertes Volumen (Divergenzsatz, mm³) — der ehrliche Geometrie-Beweis
 * in Tests: ein Quader misst exakt b·l·h, eine Extrusion vergrössert exakt
 * um Regionsfläche·Distanz (bei ganzzahliger Normale). */
export function meshVolumen(positions: number[], faces: number[]): number {
  let v = 0;
  for (let f = 0; f * 3 < faces.length; f++) {
    const a = faces[f * 3]! * 3;
    const b = faces[f * 3 + 1]! * 3;
    const c = faces[f * 3 + 2]! * 3;
    v +=
      (positions[a]! * (positions[b + 1]! * positions[c + 2]! - positions[b + 2]! * positions[c + 1]!) -
        positions[a + 1]! * (positions[b]! * positions[c + 2]! - positions[b + 2]! * positions[c]!) +
        positions[a + 2]! * (positions[b]! * positions[c + 1]! - positions[b + 1]! * positions[c]!)) /
      6;
  }
  return v;
}
