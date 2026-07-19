import { describe, expect, it } from 'vitest';
import { KosmoDoc, execute, exportGlb, deriveAll, type Furniture, type Zone } from '../src';

/**
 * E12 glTF-Härtung — eigene Suite, KEIN externer glTF-Loader. Der GLB-Writer
 * (`src/derive/gltf.ts`) ist handgebaut (Header + JSON-Chunk + BIN-Chunk),
 * darum liest dieser Test dasselbe Layout von Hand zurück: 12-Byte-Header
 * (magic/version/total), dann der JSON-Chunk-Header (length/type), dann die
 * JSON-Bytes selbst. Die drei Bestands-Inline-Tests in kernel.test.ts
 * (:473-489 GLB-Container, :6059-6075 Blender-Interop-Namen, :6307-6318
 * FreeMesh-Name) bleiben unverändert als Regression — diese Suite kommt
 * ZUSÄTZLICH dazu.
 */

interface ParsedGlb {
  dv: DataView;
  magic: number;
  version: number;
  total: number;
  jsonLen: number;
  jsonType: number;
  json: {
    nodes: { name: string; mesh?: number; children?: number[]; extras?: Record<string, unknown> }[];
    materials: { name: string; doubleSided?: boolean }[];
    meshes: { name: string }[];
    scenes: { nodes: number[] }[];
    scene: number;
    accessors: { type: string; max?: number[] }[];
  };
}

function parseGlb(glb: ArrayBuffer): ParsedGlb {
  const dv = new DataView(glb);
  const magic = dv.getUint32(0, true);
  const version = dv.getUint32(4, true);
  const total = dv.getUint32(8, true);
  const jsonLen = dv.getUint32(12, true);
  const jsonType = dv.getUint32(16, true);
  const json = JSON.parse(new TextDecoder().decode(new Uint8Array(glb, 20, jsonLen)));
  return { dv, magic, version, total, jsonLen, jsonType, json };
}

/** Zwei Geschosse, je eine Wand (AW Beton), plus Möbel + Zone im EG —
 * letztere liefert `deriveAll` (derive/scene.ts) NIE ein GeometryArtifact. */
function bauDoc() {
  const doc = new KosmoDoc();
  const eg = execute(doc, 'design.geschossErstellen', { name: 'EG', index: 0, elevation: 0, height: 3000 });
  const storeyIdEg = (eg.patches[0] as { id: string }).id;
  const og = execute(doc, 'design.geschossErstellen', { name: 'OG', index: 1, elevation: 3000, height: 3000 });
  const storeyIdOg = (og.patches[0] as { id: string }).id;
  const aufbau = execute(doc, 'design.aufbauErstellen', {
    name: 'AW Beton 36',
    target: 'wall',
    layers: [{ material: 'beton', thickness: 250, function: 'tragend' }],
  });
  const assemblyId = (aufbau.patches[0] as { id: string }).id;
  const wandEg = execute(doc, 'design.wandZeichnen', {
    storeyId: storeyIdEg,
    a: { x: 0, y: 0 },
    b: { x: 6000, y: 0 },
    assemblyId,
  });
  const wandIdEg = (wandEg.patches[0] as { id: string }).id;
  execute(doc, 'design.wandZeichnen', {
    storeyId: storeyIdOg,
    a: { x: 0, y: 0 },
    b: { x: 6000, y: 0 },
    assemblyId,
  });
  // Parametrisches Fenster (fensterTyp gesetzt) → deriveFensterProfile
  // (derive/scene.ts, TEIL von deriveAll — anders als deriveFensterGlas/
  // deriveFensterRahmenStandard, die NUR deriveAllMitFensterdetails für den
  // 3D-Viewport speisen) erzeugt Artefakte mit SYNTHETISCHER entityId
  // (`${opening.id}:rahmen:N`) — dafür gibt es KEIN Entity im Doc. Realer
  // Weg, an dem `doc.get(a.entityId)` `undefined` liefert und
  // extras.kind/geschoss folgerichtig fehlen.
  const oeffnung = execute(doc, 'design.oeffnungSetzen', {
    wallId: wandIdEg,
    openingType: 'fenster',
    center: 3000,
    width: 1500,
    height: 1400,
    sill: 900,
  });
  const oeffnungId = (oeffnung.patches[0] as { id: string }).id;
  execute(doc, 'design.fensterParametrieren', { openingId: oeffnungId, fensterTyp: 'einfluegel' });
  // Totes KIND_LABEL-Mapping entfernt (E12) — der Beweis: diese beiden
  // erzeugen KEINEN glTF-Node, weil deriveAll sie nie in Artefakte übersetzt.
  execute(doc, 'design.moebelSetzen', {
    storeyId: storeyIdEg,
    typ: 'bett-doppel',
    at: { x: 1000, y: 1000 },
    rotationGrad: 0,
  });
  execute(doc, 'design.zoneErstellen', {
    storeyId: storeyIdEg,
    outline: [
      { x: 0, y: 0 },
      { x: 2000, y: 0 },
      { x: 2000, y: 2000 },
    ],
    name: 'Zimmer',
  });
  return { doc, storeyIdEg, storeyIdOg, wandIdEg };
}

describe('E12 glTF-Härtung — extras je Bauteil-Node', () => {
  it('Wand-Node trägt extras{entityId,kind,geschoss}', () => {
    const { doc, wandIdEg } = bauDoc();
    const { json } = parseGlb(exportGlb(doc, 'Test'));
    const wandNode = json.nodes.find((n) => n.extras?.entityId === wandIdEg);
    expect(wandNode).toBeDefined();
    expect(wandNode!.extras).toEqual({ entityId: wandIdEg, kind: 'wall', geschoss: 'EG' });
  });

  it('Bauteile ohne auflösbares Entity (Fenster-Rahmenprofil, synthetische entityId) tragen extras OHNE kind/geschoss — Feld weggelassen statt leer', () => {
    // deriveFensterProfile liefert je Rahmensegment ein Artefakt mit
    // entityId `${opening.id}:rahmen:N` — es gibt dafür KEIN Doc-Entity,
    // `doc.get(a.entityId)` liefert `undefined`. exportGlb darf dafür kein
    // `geschoss: undefined` schreiben, sondern muss die Felder GANZ
    // weglassen (nur entityId bleibt).
    const { doc } = bauDoc();
    const { json } = parseGlb(exportGlb(doc, 'Test'));
    const rahmenNode = json.nodes.find(
      (n) => typeof n.extras?.entityId === 'string' && (n.extras.entityId as string).includes(':rahmen:'),
    );
    expect(rahmenNode).toBeDefined();
    expect(Object.keys(rahmenNode!.extras!).sort()).toEqual(['entityId']);
    expect(Object.prototype.hasOwnProperty.call(rahmenNode!.extras, 'kind')).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(rahmenNode!.extras, 'geschoss')).toBe(false);
  });
});

describe('E12 glTF-Härtung — Geschoss-Hierarchie', () => {
  it('ein Eltern-Node je Storey mit Bauteilen; children referenzieren die Bauteil-Nodes', () => {
    const { doc } = bauDoc();
    const { json } = parseGlb(exportGlb(doc, 'Test'));
    const egNode = json.nodes.find((n) => n.name === 'EG');
    const ogNode = json.nodes.find((n) => n.name === 'OG');
    expect(egNode).toBeDefined();
    expect(ogNode).toBeDefined();
    expect(egNode!.children).toBeDefined();
    expect(egNode!.children!.length).toBe(1);
    expect(ogNode!.children!.length).toBe(1);
    // Die referenzierten Kinder sind Bauteil-Nodes (haben ein mesh + extras)
    const kindIdx = egNode!.children![0]!;
    const kindNode = json.nodes[kindIdx]!;
    expect(kindNode.mesh).toBeDefined();
    expect(kindNode.extras?.kind).toBe('wall');
  });

  it('scenes[0].nodes referenziert nur Wurzel-Nodes (Storey-Eltern), nicht die Bauteil-Nodes direkt', () => {
    const { doc } = bauDoc();
    const { json } = parseGlb(exportGlb(doc, 'Test'));
    const egIdx = json.nodes.findIndex((n) => n.name === 'EG');
    const ogIdx = json.nodes.findIndex((n) => n.name === 'OG');
    expect(json.scenes[json.scene]!.nodes).toContain(egIdx);
    expect(json.scenes[json.scene]!.nodes).toContain(ogIdx);
    // Die Bauteil-Node-Indizes selbst dürfen NICHT auch in scenes[0].nodes stehen
    const egNode = json.nodes[egIdx]!;
    for (const childIdx of egNode.children!) {
      expect(json.scenes[json.scene]!.nodes).not.toContain(childIdx);
    }
  });

  it('Bauteilnamen bleiben exakt wie bisher (Regression zu kernel.test.ts :6059-6075)', () => {
    const { doc } = bauDoc();
    const { json } = parseGlb(exportGlb(doc, 'Test'));
    const namen = json.nodes.map((n) => n.name);
    expect(namen.some((n) => n.startsWith('Wand ') && n.includes('· EG'))).toBe(true);
    expect(namen.some((n) => n.startsWith('Wand ') && n.includes('· OG'))).toBe(true);
  });
});

describe('E12 glTF-Härtung — Materialien doubleSided', () => {
  it('jedes Material trägt doubleSided:true (einseitige Flächen sind in Blender sonst unsichtbar)', () => {
    const { doc } = bauDoc();
    const { json } = parseGlb(exportGlb(doc, 'Test'));
    expect(json.materials.length).toBeGreaterThan(0);
    for (const m of json.materials) expect(m.doubleSided).toBe(true);
  });
});

describe('E12 glTF-Härtung — Bestandsprüfung (Migration, zusätzlich)', () => {
  it('GLB-Header: Magic/Version/Grösse konsistent, JSON-Chunk 4-Byte-aligned', () => {
    const { doc } = bauDoc();
    const glb = exportGlb(doc, 'Test');
    const parsed = parseGlb(glb);
    expect(parsed.magic).toBe(0x46546c67); // 'glTF'
    expect(parsed.version).toBe(2);
    expect(parsed.total).toBe(glb.byteLength);
    expect(parsed.jsonType).toBe(0x4e4f534a); // 'JSON'
    expect(parsed.jsonLen % 4).toBe(0);
    // BIN-Chunk-Header folgt direkt nach dem JSON-Chunk (12 + 8 + jsonLen)
    const binHeaderOffset = 12 + 8 + parsed.jsonLen;
    const binLen = parsed.dv.getUint32(binHeaderOffset, true);
    const binType = parsed.dv.getUint32(binHeaderOffset + 4, true);
    expect(binType).toBe(0x004e4942); // 'BIN'
    expect(binLen % 4).toBe(0);
    expect(binHeaderOffset + 8 + binLen).toBe(glb.byteLength);
  });

  it('mm→m-Grössenordnung: eine 6-m-Wand liegt bei max.x ≈ 6, nie ≈ 6000', () => {
    const { doc } = bauDoc();
    const { json } = parseGlb(exportGlb(doc, 'Test'));
    const posAcc = json.accessors.find((a) => a.type === 'VEC3' && a.max);
    expect(posAcc).toBeDefined();
    expect(posAcc!.max![0]).toBeCloseTo(6, 3);
    for (const acc of json.accessors) {
      if (acc.max) for (const v of acc.max) expect(Math.abs(v)).toBeLessThan(1000);
    }
  });
});

describe('E12 glTF-Härtung — furniture/zone erzeugen keinen Node (bereinigtes KIND_LABEL)', () => {
  it('Möbel und Zone im Doc bleiben ohne Gegenstück im GLB', () => {
    const { doc } = bauDoc();
    // Möbel + Zone sind im Doc vorhanden (bauDoc legt beide an) — aber
    // deriveAll (derive/scene.ts) übersetzt nur wall/slab/mass/roof/stair/
    // column/beam/freemesh + Knoten-/Fensterprofil-/Terrain-Artefakte.
    // json.meshes MUSS exakt so viele Einträge haben wie deriveAll liefert —
    // kein Mehr (Möbel/Zone), kein Weniger.
    const artifacts = deriveAll(doc);
    expect(doc.byKind<Furniture>('furniture').length).toBeGreaterThan(0);
    expect(doc.byKind<Zone>('zone').length).toBeGreaterThan(0);
    const { json } = parseGlb(exportGlb(doc, 'Test'));
    expect(json.meshes.length).toBe(artifacts.length);
    const namen = json.nodes.map((n) => n.name);
    expect(namen.some((n) => n.includes('Moebel') || n.includes('Möbel'))).toBe(false);
    expect(namen.some((n) => n.includes('Zone'))).toBe(false);
    const kinds = json.nodes.map((n) => n.extras?.kind).filter((k) => k !== undefined);
    expect(kinds).not.toContain('furniture');
    expect(kinds).not.toContain('zone');
  });
});
