import * as WebIFC from 'web-ifc';

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
}

export async function importIfc(data: Uint8Array): Promise<IfcImportResult> {
  const ifc = await getApi();
  const modelId = ifc.OpenModel(data);
  try {
    const schema = ifc.GetModelSchema(modelId) ?? 'IFC4';

    const meshes: ContextMesh[] = [];
    let elementCount = 0;
    ifc.StreamAllMeshes(modelId, (mesh: WebIFC.FlatMesh) => {
      elementCount++;
      const geometries = mesh.geometries;
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
        geometry.delete();
      }
    });
    return { meshes, elementCount, schema: String(schema) };
  } finally {
    ifc.CloseModel(modelId);
  }
}
