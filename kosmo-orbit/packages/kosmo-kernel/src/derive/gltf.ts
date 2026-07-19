import type { KosmoDoc } from '../model/doc';
import type { Assembly, Entity, Storey } from '../model/entities';
import { deriveAll } from './scene';

/**
 * GLB-Export — das Modell als binäres glTF 2.0.
 * Direkter Weg in die KosmoVis-Pipeline (render-scene.geometry.format = glb)
 * und in Blender/Speckle. Koordinaten: Kern (mm, z-oben) → glTF (m, y-oben).
 *
 * Hierarchie (E12): statt einer flachen Node-Liste bekommt jedes Geschoss
 * mit mind. einem Bauteil einen Eltern-Node (`name` = Storey-Name,
 * `children` = Indizes der Bauteil-Nodes dieses Geschosses); Bauteile ohne
 * Storey-Zuordnung hängen direkt an der Szene. `scenes[0].nodes`
 * referenziert NUR Wurzel-Nodes (Storey-Eltern + storeylose Bauteile).
 * Jeder Bauteil-Node trägt `extras: { entityId, kind, geschoss? }` —
 * `geschoss` fehlt ganz (statt leer/undefined), wenn kein Storey
 * zuordenbar ist. Storey-Eltern-Nodes selbst tragen keine extras.
 * KEINE UVs/Texturen/Tangenten/Kameras — der Unwrap ist Worker-Aufgabe
 * (s. `docs/V089-SPEZ.md` §9 E12), kein Kernel-Anliegen.
 */

const MM = 1 / 1000;

/** Blender-Slot-Namen je Material-Klasse (P6: Interop-Politur). */
const MATERIAL_NAME: Record<string, string> = {
  beton: 'Beton',
  masse: 'Volumen',
  dach: 'Dach',
  holz: 'Holz',
};

const KIND_LABEL: Record<string, string> = {
  wall: 'Wand',
  slab: 'Decke',
  roof: 'Dach',
  mass: 'Volumen',
  stair: 'Treppe',
  column: 'Stuetze',
  beam: 'Unterzug',
  freemesh: 'FreeMesh',
  // furniture/zone bewusst NICHT gemappt (E12-Bereinigung): deriveAll
  // (derive/scene.ts) liefert für diese Kinds nie ein GeometryArtifact —
  // ein Label hier wäre totes Mapping, das spätere Agenten für «schon
  // unterstützt» halten könnten.
};

/** Storey des Entity, sofern eines zuordenbar ist — gemeinsame Logik für
 * Objektname (§4) und extras.geschoss (E12), nicht duplizieren. */
function resolveStorey(doc: KosmoDoc, e: Entity): Storey | undefined {
  if ('storeyId' in e && typeof e.storeyId === 'string') {
    const st = doc.get<Storey>(e.storeyId);
    if (st?.kind === 'storey') return st;
  }
  return undefined;
}

/**
 * Lesbarer Objektname für den Blender-Outliner: «Wand AW Beton 40 · EG»
 * statt roher Entity-Id. Die Id bleibt als Suffix — der Rückweg (welches
 * Bauteil war das?) geht nie verloren.
 */
function objektName(doc: KosmoDoc, entityId: string, e: Entity): string {
  const teile: string[] = [KIND_LABEL[e.kind] ?? e.kind];
  if ('name' in e && typeof e.name === 'string' && e.name) teile.push(e.name);
  else if ('assemblyId' in e && typeof e.assemblyId === 'string') {
    const asm = doc.get<Assembly>(e.assemblyId);
    if (asm?.kind === 'assembly') teile.push(asm.name);
  } else if ('typ' in e && typeof e.typ === 'string') teile.push(e.typ);
  const st = resolveStorey(doc, e);
  if (st) teile.push(`· ${st.name}`);
  return `${teile.join(' ')} [${entityId.slice(-6)}]`;
}

interface BufferSlice {
  byteOffset: number;
  byteLength: number;
}

export function exportGlb(doc: KosmoDoc, name = 'KosmoOrbit-Modell'): ArrayBuffer {
  const artifacts = deriveAll(doc);

  // Binärpuffer zusammenstellen (4-Byte-aligned)
  const chunks: Uint8Array[] = [];
  let offset = 0;
  const push = (data: Uint8Array): BufferSlice => {
    const slice = { byteOffset: offset, byteLength: data.byteLength };
    chunks.push(data);
    offset += data.byteLength;
    const pad = (4 - (offset % 4)) % 4;
    if (pad) {
      chunks.push(new Uint8Array(pad));
      offset += pad;
    }
    return slice;
  };

  const accessors: unknown[] = [];
  const bufferViews: unknown[] = [];
  const meshes: unknown[] = [];
  const nodes: unknown[] = [];
  const materials: unknown[] = [];
  const materialIndex = new Map<string, number>();
  // Geschoss-Hierarchie (E12): storeyId → Bauteil-Node-Indizes dieses
  // Geschosses; Bauteile ohne Storey landen in rootLeafNodes.
  const storeyChildren = new Map<string, number[]>();
  const rootLeafNodes: number[] = [];

  const palette: Record<string, [number, number, number]> = {
    beton: [0.79, 0.77, 0.74],
    masse: [0.85, 0.81, 0.75],
    dach: [0.43, 0.37, 0.32],
    holz: [0.69, 0.55, 0.37],
  };

  function materialFor(key: string): number {
    const hit = materialIndex.get(key);
    if (hit !== undefined) return hit;
    const rgb = palette[key] ?? [0.8, 0.79, 0.77];
    const idx = materials.length;
    materials.push({
      name: MATERIAL_NAME[key] ?? key,
      // Einseitige Wand-/Dachflächen sind in Blender sonst unsichtbar,
      // sobald man von der falschen Seite hineinschaut (E12).
      doubleSided: true,
      pbrMetallicRoughness: {
        baseColorFactor: [...rgb, 1],
        metallicFactor: 0,
        roughnessFactor: 0.9,
      },
    });
    materialIndex.set(key, idx);
    return idx;
  }

  for (const a of artifacts) {
    // Koordinaten transformieren: (x,y,z)mm → (x, z, −y)m
    const n = a.positions.length / 3;
    const pos = new Float32Array(a.positions.length);
    const nor = new Float32Array(a.normals.length);
    const min = [Infinity, Infinity, Infinity];
    const max = [-Infinity, -Infinity, -Infinity];
    for (let i = 0; i < n; i++) {
      const x = a.positions[i * 3]! * MM;
      const y = a.positions[i * 3 + 2]! * MM;
      const z = -a.positions[i * 3 + 1]! * MM;
      pos[i * 3] = x;
      pos[i * 3 + 1] = y;
      pos[i * 3 + 2] = z;
      nor[i * 3] = a.normals[i * 3]!;
      nor[i * 3 + 1] = a.normals[i * 3 + 2]!;
      nor[i * 3 + 2] = -a.normals[i * 3 + 1]!;
      for (let k = 0; k < 3; k++) {
        const v = pos[i * 3 + k]!;
        if (v < min[k]!) min[k] = v;
        if (v > max[k]!) max[k] = v;
      }
    }

    const posSlice = push(new Uint8Array(pos.buffer));
    const norSlice = push(new Uint8Array(nor.buffer));
    const idxSlice = push(new Uint8Array(a.indices.buffer.slice(0)));

    const posView = bufferViews.length;
    bufferViews.push({ buffer: 0, ...posSlice, target: 34962 });
    const norView = bufferViews.length;
    bufferViews.push({ buffer: 0, ...norSlice, target: 34962 });
    const idxView = bufferViews.length;
    bufferViews.push({ buffer: 0, ...idxSlice, target: 34963 });

    const posAcc = accessors.length;
    accessors.push({ bufferView: posView, componentType: 5126, count: n, type: 'VEC3', min, max });
    const norAcc = accessors.length;
    accessors.push({ bufferView: norView, componentType: 5126, count: n, type: 'VEC3' });
    const idxAcc = accessors.length;
    accessors.push({
      bufferView: idxView,
      componentType: 5125,
      count: a.indices.length,
      type: 'SCALAR',
    });

    const meshIdx = meshes.length;
    const entity = doc.get<Entity>(a.entityId);
    const label = entity ? objektName(doc, a.entityId, entity) : a.entityId;
    meshes.push({
      name: label,
      primitives: [
        {
          attributes: { POSITION: posAcc, NORMAL: norAcc },
          indices: idxAcc,
          material: materialFor(a.materialKey),
        },
      ],
    });

    const storey = entity ? resolveStorey(doc, entity) : undefined;
    const extras = {
      entityId: a.entityId,
      ...(entity ? { kind: entity.kind } : {}),
      ...(storey ? { geschoss: storey.name } : {}),
    };
    const nodeIdx = nodes.length;
    nodes.push({ name: label, mesh: meshIdx, extras });

    if (storey) {
      const list = storeyChildren.get(storey.id) ?? [];
      list.push(nodeIdx);
      storeyChildren.set(storey.id, list);
    } else {
      rootLeafNodes.push(nodeIdx);
    }
  }

  // Geschoss-Hierarchie (E12): ein Eltern-Node je Storey MIT Bauteilen;
  // storeylose Bauteile bleiben direkte Wurzel-Nodes.
  const rootNodes: number[] = [];
  for (const st of doc.storeysOrdered()) {
    const children = storeyChildren.get(st.id);
    if (children && children.length) {
      const storeyNodeIdx = nodes.length;
      nodes.push({ name: st.name, children });
      rootNodes.push(storeyNodeIdx);
    }
  }
  rootNodes.push(...rootLeafNodes);

  const gltf = {
    asset: { version: '2.0', generator: 'KosmoOrbit V1' },
    scene: 0,
    scenes: [{ name, nodes: rootNodes }],
    nodes,
    meshes,
    materials,
    accessors,
    bufferViews,
    buffers: [{ byteLength: offset }],
  };

  // GLB-Container: Header + JSON-Chunk + BIN-Chunk
  const jsonBytes = new TextEncoder().encode(JSON.stringify(gltf));
  const jsonPad = (4 - (jsonBytes.length % 4)) % 4;
  const jsonLen = jsonBytes.length + jsonPad;
  const binLen = offset;
  const total = 12 + 8 + jsonLen + 8 + binLen;

  const out = new ArrayBuffer(total);
  const dv = new DataView(out);
  const u8 = new Uint8Array(out);
  let o = 0;
  dv.setUint32(o, 0x46546c67, true); // 'glTF'
  dv.setUint32(o + 4, 2, true);
  dv.setUint32(o + 8, total, true);
  o += 12;
  dv.setUint32(o, jsonLen, true);
  dv.setUint32(o + 4, 0x4e4f534a, true); // 'JSON'
  o += 8;
  u8.set(jsonBytes, o);
  for (let i = 0; i < jsonPad; i++) u8[o + jsonBytes.length + i] = 0x20;
  o += jsonLen;
  dv.setUint32(o, binLen, true);
  dv.setUint32(o + 4, 0x004e4942, true); // 'BIN'
  o += 8;
  for (const c of chunks) {
    u8.set(c, o);
    o += c.byteLength;
  }
  return out;
}
