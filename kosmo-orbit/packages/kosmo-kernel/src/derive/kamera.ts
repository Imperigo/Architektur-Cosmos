import type { KosmoDoc } from '../model/doc';
import type { Storey, Zone } from '../model/entities';
import { polygonArea } from '../model/units';
import { deriveAll } from './scene';

/**
 * Auto-Kamera (Owner-Befund K20/A10) — «Kamera vorschlagen» ist eine reine,
 * deterministische Ableitung aus den Szenen-Bounds. KEINE KI-Wahl: dieselbe
 * Geometrie liefert immer dieselben Standpunkte. Das UI beschriftet die
 * Vorschläge entsprechend ehrlich («Vorschlag aus dem Modell»).
 *
 * Koordinaten der Standpunkte sind bereits in der glTF-Konvention (Meter,
 * Y = oben, Z aus dem Bildschirm) — identisch zur Transformation in
 * derive/gltf.ts — damit sie 1:1 als CameraSpec in einen render-scene/v1-Job
 * einfliessen können (kosmovis.render-scene/v1, kosmo-contracts).
 */

const MM = 1 / 1000;

export interface AutoKameraStandpunkt {
  name: string;
  /** Meter, glTF-Konvention (x, y-oben, z). */
  position: [number, number, number];
  target: [number, number, number];
  fov: number;
  /** Ehrliche Kurzbegründung fürs UI — nie «KI», immer «aus dem Modell». */
  begruendung: string;
}

interface Bounds3Mm {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  minZ: number;
  maxZ: number;
}

/** Bounds über alle abgeleiteten Geometrie-Artefakte (Wände/Decken/Dach/Volumen/Treppe). */
function sceneBoundsMm(doc: KosmoDoc): Bounds3Mm | null {
  const artifacts = deriveAll(doc);
  if (artifacts.length === 0) return null;
  let minX = Infinity;
  let minY = Infinity;
  let minZ = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let maxZ = -Infinity;
  for (const a of artifacts) {
    const n = a.positions.length / 3;
    for (let i = 0; i < n; i++) {
      const x = a.positions[i * 3]!;
      const y = a.positions[i * 3 + 1]!;
      const z = a.positions[i * 3 + 2]!;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
      if (z < minZ) minZ = z;
      if (z > maxZ) maxZ = z;
    }
  }
  return { minX, maxX, minY, maxY, minZ, maxZ };
}

/** mm (Kern, z-oben) → Meter, glTF-Konvention (y-oben) — wie exportGlb. */
function toGlb(x: number, y: number, z: number): [number, number, number] {
  return [round3(x * MM), round3(z * MM), round3(-y * MM)];
}

function round3(v: number): number {
  return Math.round(v * 1000) / 1000;
}

/** Grösster Hauptnutzraum (SIA-416 HNF, sonst grösste Zone) für den Innenraum-Standpunkt. */
function hauptnutzraum(doc: KosmoDoc): { zone: Zone; storeyElevation: number } | null {
  const zonen = doc.byKind<Zone>('zone').filter((z) => z.outline.length >= 3);
  if (zonen.length === 0) return null;
  const bewertet = zonen.map((z) => ({ zone: z, flaeche: Math.abs(polygonArea(z.outline)), hnf: z.sia === 'HNF' }));
  bewertet.sort((a, b) => {
    if (a.hnf !== b.hnf) return a.hnf ? -1 : 1;
    return b.flaeche - a.flaeche;
  });
  const beste = bewertet[0]!.zone;
  const storey = doc.get<Storey>(beste.storeyId);
  const storeyElevation = storey && storey.kind === 'storey' ? storey.elevation : 0;
  return { zone: beste, storeyElevation };
}

/**
 * Drei benannte Standard-Standpunkte, deterministisch aus den Bounds:
 * «Eingang» (Strassenseite, Süd-Kante = minY, Annahme mangels Erschliessungs-Tag,
 * Augenhöhe 1.6 m), «Übersicht» (3/4-Vogel aus Südost, erhöht) und — nur falls
 * Zonen im Modell existieren — «Innenraum» (grösster Hauptnutzraum). Ist die
 * Szene leer, gibt es ehrlich keine Vorschläge (leeres Array statt Fake-Werte).
 */
export function deriveAutoKameras(doc: KosmoDoc): AutoKameraStandpunkt[] {
  const b = sceneBoundsMm(doc);
  if (!b) return [];
  const width = b.maxX - b.minX;
  const depth = b.maxY - b.minY;
  const hoehe = b.maxZ - b.minZ;
  const cx = (b.minX + b.maxX) / 2;
  const cy = (b.minY + b.maxY) / 2;

  const out: AutoKameraStandpunkt[] = [];

  const setback = Math.max(Math.max(width, depth) * 0.8, 4000);
  out.push({
    name: 'Eingang',
    position: toGlb(cx, b.minY - setback, b.minZ + 1600),
    target: toGlb(cx, cy, b.minZ + hoehe * 0.4),
    fov: 55,
    begruendung: 'Vorschlag aus dem Modell: Strassenseite (Süd-Kante der Bounds), Augenhöhe 1.6 m.',
  });

  const diag = Math.max(width, depth) * 1.1;
  out.push({
    name: 'Übersicht',
    position: toGlb(b.maxX + diag, b.minY - diag, b.minZ + Math.max(hoehe * 1.8, hoehe + 6000)),
    target: toGlb(cx, cy, b.minZ + hoehe * 0.5),
    fov: 45,
    begruendung: 'Vorschlag aus dem Modell: 3/4-Vogelperspektive aus Südost, über der Gebäudehöhe.',
  });

  const innen = hauptnutzraum(doc);
  if (innen) {
    const { zone, storeyElevation } = innen;
    const pts = zone.outline;
    const zcx = pts.reduce((s, p) => s + p.x, 0) / pts.length;
    const zcy = pts.reduce((s, p) => s + p.y, 0) / pts.length;
    const ecke = pts[0]!;
    const px = zcx + (ecke.x - zcx) * 0.6;
    const py = zcy + (ecke.y - zcy) * 0.6;
    out.push({
      name: 'Innenraum',
      position: toGlb(px, py, storeyElevation + 1600),
      target: toGlb(zcx, zcy, storeyElevation + 1600),
      fov: 65,
      begruendung: `Vorschlag aus dem Modell: grösster Hauptnutzraum («${zone.name}»), Augenhöhe 1.6 m.`,
    });
  }

  return out;
}
