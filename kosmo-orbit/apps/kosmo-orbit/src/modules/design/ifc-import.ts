import * as WebIFC from 'web-ifc';
import { erkenneDecke, erkenneWand, type ErkannteDecke, type ErkannteWand } from '@kosmo/kernel';

/**
 * IFC-Import (Bestand/Kontext) — web-ifc (MPL-2.0, unverändert als Bibliothek).
 * V1: Geometrie als Kontext-Layer im Viewport (grau, nicht wählbar, nicht
 * synchronisiert) — der Bestand ist Referenz, kein editierbares BIM.
 * Koordinaten: web-ifc normalisiert die Tessellation selbst auf Meter und
 * y-oben (three-Konvention) — die Positionen gehen unverändert in die Szene.
 */

export interface ContextMesh {
  /** Meter, y-oben (web-ifc-Ausgaberaum = three-Raum). */
  positions: Float32Array;
  indices: Uint32Array;
  color: { r: number; g: number; b: number; a: number };
}

let api: WebIFC.IfcAPI | null = null;

async function getApi(): Promise<WebIFC.IfcAPI> {
  if (api) return api;
  api = new WebIFC.IfcAPI();
  api.SetWasmPath('./', false);
  await api.Init();
  return api;
}

export interface IfcImportResult {
  meshes: ContextMesh[];
  elementCount: number;
  schema: string;
  /** A4: erkannte Bauteile (Kernel-mm, z-oben) — Angebot «Bestand übernehmen». */
  erkannt: { waende: ErkannteWand[]; decken: ErkannteDecke[] };
}

/** three-Raum (Meter, y-oben) → Kernel (mm, z-oben): x, −z, y — Umkehrung des Viewports. */
function zuKernelMm(positions: Float32Array): number[] {
  const raus: number[] = new Array(positions.length);
  for (let i = 0; i + 2 < positions.length; i += 3) {
    raus[i] = positions[i]! * 1000;
    raus[i + 1] = -positions[i + 2]! * 1000;
    raus[i + 2] = positions[i + 1]! * 1000;
  }
  return raus;
}

export async function importIfc(data: Uint8Array): Promise<IfcImportResult> {
  const ifc = await getApi();
  const modelId = ifc.OpenModel(data);
  try {
    const schema = ifc.GetModelSchema(modelId) ?? 'IFC4';

    // Erkennungs-Kandidaten: Wände und Decken nach IFC-Typ einsammeln
    const wandIds = new Set<number>();
    const deckenIds = new Set<number>();
    for (const typ of [WebIFC.IFCWALL, WebIFC.IFCWALLSTANDARDCASE]) {
      const ids = ifc.GetLineIDsWithType(modelId, typ);
      for (let i = 0; i < ids.size(); i++) wandIds.add(ids.get(i));
    }
    const slabIds = ifc.GetLineIDsWithType(modelId, WebIFC.IFCSLAB);
    for (let i = 0; i < slabIds.size(); i++) deckenIds.add(slabIds.get(i));

    const meshes: ContextMesh[] = [];
    const waende: ErkannteWand[] = [];
    const decken: ErkannteDecke[] = [];
    let elementCount = 0;
    ifc.StreamAllMeshes(modelId, (mesh: WebIFC.FlatMesh) => {
      elementCount++;
      const geometries = mesh.geometries;
      // alle Teilgeometrien EINES Elements zusammen betrachten (Erkennung)
      const elementPositionen: number[] = [];
      for (let i = 0; i < geometries.size(); i++) {
        const placed = geometries.get(i);
        const geometry = ifc.GetGeometry(modelId, placed.geometryExpressID);
        const verts = ifc.GetVertexArray(
          geometry.GetVertexData(),
          geometry.GetVertexDataSize(),
        );
        const idx = ifc.GetIndexArray(geometry.GetIndexData(), geometry.GetIndexDataSize());
        // verts: [x,y,z, nx,ny,nz] interleaved; Transformation anwenden
        const m = placed.flatTransformation;
        const n = verts.length / 6;
        const positions = new Float32Array(n * 3);
        for (let v = 0; v < n; v++) {
          const x = verts[v * 6]!;
          const y = verts[v * 6 + 1]!;
          const z = verts[v * 6 + 2]!;
          // web-ifc liefert bereits Meter/y-oben; nur die Platzierung anwenden
          positions[v * 3] = m[0]! * x + m[4]! * y + m[8]! * z + m[12]!;
          positions[v * 3 + 1] = m[1]! * x + m[5]! * y + m[9]! * z + m[13]!;
          positions[v * 3 + 2] = m[2]! * x + m[6]! * y + m[10]! * z + m[14]!;
        }
        const c = placed.color as { x: number; y: number; z: number; w: number } | undefined;
        meshes.push({
          positions,
          indices: new Uint32Array(idx),
          color: c ? { r: c.x, g: c.y, b: c.z, a: c.w } : { r: 0.72, g: 0.7, b: 0.66, a: 1 },
        });
        if (wandIds.has(mesh.expressID) || deckenIds.has(mesh.expressID)) {
          const k = zuKernelMm(positions);
          for (const v of k) elementPositionen.push(v);
        }
        geometry.delete();
      }
      if (wandIds.has(mesh.expressID)) {
        const wand = erkenneWand(elementPositionen);
        if (wand) waende.push(wand);
      } else if (deckenIds.has(mesh.expressID)) {
        const decke = erkenneDecke(elementPositionen);
        if (decke) decken.push(decke);
      }
    });
    return { meshes, elementCount, schema: String(schema), erkannt: { waende, decken } };
  } finally {
    ifc.CloseModel(modelId);
  }
}
