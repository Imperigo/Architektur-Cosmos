import { KosmoDoc, deriveAll, type DocJson, type GeometryArtifact } from '@kosmo/kernel';

/**
 * Derive-Worker — der Kern ist bewusst DOM-frei und liefert transferable
 * Arrays: grosse Modelle werden hier abgeleitet, ohne den UI-Thread zu
 * blockieren. Die Puffer wandern per Transfer (kopiefrei) zurück.
 */

export interface DeriveRequest {
  revision: number;
  json: DocJson;
}

export interface DeriveResponse {
  revision: number;
  artifacts: GeometryArtifact[];
}

self.onmessage = (e: MessageEvent<DeriveRequest>) => {
  const doc = KosmoDoc.fromJSON(e.data.json);
  const artifacts = deriveAll(doc);
  const transfer: ArrayBuffer[] = [];
  for (const a of artifacts) {
    transfer.push(a.positions.buffer as ArrayBuffer, a.normals.buffer as ArrayBuffer);
    transfer.push(a.indices.buffer as ArrayBuffer, a.edges.buffer as ArrayBuffer);
  }
  (self as unknown as Worker).postMessage(
    { revision: e.data.revision, artifacts } satisfies DeriveResponse,
    transfer,
  );
};
