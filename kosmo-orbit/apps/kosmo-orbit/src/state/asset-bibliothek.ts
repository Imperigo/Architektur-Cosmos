import { vaultTx } from './project-vault';

/**
 * GLB-Objekt-Bibliothek (V1-Finish P3, Owner-Q14) — projektübergreifend in
 * IndexedDB, BEWUSST nicht als Doc-Entity: GLB-Binärdaten (oft Megabytes)
 * gehören nie durch Undo/Yjs. «Ins Modell» lädt das Objekt als Referenz-
 * Kontext in den Design-Viewport (setGlbContext) — studierbar, nicht Teil
 * der Planableitung.
 */

export interface GlbObjekt {
  id: string;
  name: string;
  createdAt: string;
  bytes: number;
  daten: ArrayBuffer;
}

export async function speichereGlb(file: File): Promise<GlbObjekt> {
  const daten = await file.arrayBuffer();
  const objekt: GlbObjekt = {
    id: `glb-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    name: file.name.replace(/\.(glb|gltf)$/i, ''),
    createdAt: new Date().toISOString(),
    bytes: daten.byteLength,
    daten,
  };
  await vaultTx('objekte', 'readwrite', (s) => s.put(objekt));
  return objekt;
}

export async function listeGlb(): Promise<GlbObjekt[]> {
  const alle = await vaultTx<GlbObjekt[]>('objekte', 'readonly', (s) => s.getAll() as IDBRequest<GlbObjekt[]>);
  return alle.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function loescheGlb(id: string): Promise<void> {
  await vaultTx('objekte', 'readwrite', (s) => s.delete(id));
}
