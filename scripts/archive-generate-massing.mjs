#!/usr/bin/env node
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = parseArgs(process.argv.slice(2));

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});

async function main() {
  const slug = args.entry || args.slug;
  if (!slug) throw new Error('Usage: npm run archive:model-generate -- --entry villa-savoye');

  const entries = JSON.parse(await readFile(path.join(root, 'data/mock-entries.json'), 'utf8'));
  const entry = entries.find((candidate) => candidate.slug === slug || candidate.id === slug);
  if (!entry) throw new Error(`No entry found for "${slug}".`);
  const scene = sceneForEntry(entry);
  if (!scene) {
    throw new Error('No reviewed procedural massing template exists for this entry yet.');
  }

  const intakeRoot = path.join(root, 'archive-intake', entry.slug);
  const modelsDir = path.join(intakeRoot, 'models');
  const analysisDir = path.join(intakeRoot, 'analysis');
  await Promise.all([modelsDir, analysisDir].map((directory) => mkdir(directory, { recursive: true })));

  const glb = buildGlb(scene);
  const geometryProfile = buildGeometryProfile(entry, scene);

  await writeFile(path.join(modelsDir, 'low.glb'), glb);
  await writeFile(path.join(modelsDir, 'mass.glb'), glb);
  await writeFile(path.join(analysisDir, 'generated-geometry-profile.json'), `${JSON.stringify(geometryProfile, null, 2)}\n`, 'utf8');

  console.log('Architecture Cosmos procedural massing model');
  console.log(`Entry: ${entry.title} (${entry.slug})`);
  console.log(`Objects: ${scene.objects.length}`);
  console.log(`Triangles: ${scene.objects.reduce((sum, object) => sum + object.indices.length / 3, 0)}`);
  console.log('Wrote:');
  console.log(`- ${path.relative(root, path.join(modelsDir, 'low.glb'))}`);
  console.log(`- ${path.relative(root, path.join(modelsDir, 'mass.glb'))}`);
  console.log(`- ${path.relative(root, path.join(analysisDir, 'generated-geometry-profile.json'))}`);
  console.log('');
  console.log('This is a diagrammatic reference model, not a measured reconstruction.');
}

function parseArgs(argv) {
  const parsed = {};
  for (let index = 0; index < argv.length; index += 1) {
    const item = argv[index];
    if (!item.startsWith('--')) continue;
    const key = item.slice(2);
    const next = argv[index + 1];
    parsed[key] = next && !next.startsWith('--') ? next : true;
    if (next && !next.startsWith('--')) index += 1;
  }
  return parsed;
}

function villaSavoyeScene(entry) {
  const materials = [
    { name: 'site muted green', color: [0.22, 0.28, 0.22, 1] },
    { name: 'white rendered concrete', color: [0.94, 0.94, 0.88, 1] },
    { name: 'shadow glass ribbon', color: [0.08, 0.2, 0.24, 0.82] },
    { name: 'pilotis concrete', color: [0.78, 0.78, 0.72, 1] },
    { name: 'circulation ramp accent', color: [0.0, 0.82, 1, 1] },
    { name: 'roof garden surface', color: [0.16, 0.42, 0.22, 1] },
    { name: 'annotation amber', color: [1, 0.66, 0.1, 1] }
  ];

  const objects = [
    box('01_site_context / ground plane', [0, -0.08, 0], [28, 0.16, 22], 0),
    box('02_mass_model / lifted villa volume', [0, 4.2, 0], [15.6, 3.4, 9.4], 1),
    box('04_envelope / horizontal window band north', [0, 4.55, -4.76], [13.8, 0.72, 0.08], 2),
    box('04_envelope / horizontal window band south', [0, 4.55, 4.76], [13.8, 0.72, 0.08], 2),
    box('05_circulation / internal ramp promenade', [-1.15, 3.25, 0], [2.1, 0.18, 8.8], 4, Math.PI * -0.075),
    box('05_circulation / roof ramp continuation', [2.2, 6.25, 0.6], [1.8, 0.16, 5.2], 4, Math.PI * 0.065),
    box('03_structure / roof slab', [0, 6.05, 0], [15.8, 0.32, 9.6], 1),
    box('06_roof_garden / planted roof field', [-1.9, 6.28, 1.3], [7.2, 0.12, 4.2], 5),
    box('04_envelope / roof solarium screen', [4.6, 6.95, 2.3], [4.9, 1.35, 0.22], 1, Math.PI * 0.08),
    box('04_envelope / curved entry trace marker', [-3.8, 0.05, 2.9], [7.2, 0.08, 0.18], 6, Math.PI * 0.18)
  ];

  for (const x of [-5.5, -2.75, 0, 2.75, 5.5]) {
    for (const z of [-3, 0, 3]) {
      objects.push(cylinder(`03_structure / pilotis ${x}:${z}`, [x, 2.05, z], 0.18, 4.1, 16, 3));
    }
  }

  return {
    asset: {
      version: '2.0',
      generator: 'Architecture Cosmos archive-generate-massing',
      copyright: 'Architecture Cosmos / diagrammatic model / not measured'
    },
    sceneName: `${entry.title} diagrammatic low-poly massing`,
    materials,
    objects
  };
}

function ingenbohlScene(entry) {
  const materials = [
    { name: 'monastery hill / muted landscape', color: [0.2, 0.28, 0.22, 1] },
    { name: 'reinforced concrete skeleton', color: [0.56, 0.58, 0.55, 1] },
    { name: 'trass lime mineral envelope', color: [0.68, 0.62, 0.5, 1] },
    { name: 'silver fir timber facade', color: [0.58, 0.43, 0.28, 1] },
    { name: 'chapel glass / spiritual void', color: [0.26, 0.56, 0.62, 0.72] },
    { name: 'subterranean care base', color: [0.24, 0.25, 0.24, 1] },
    { name: 'circulation and public threshold', color: [1, 0.72, 0.22, 1] }
  ];

  const objects = [
    box('01_site_context / sloped monastery hill', [0, -0.18, 0], [32, 0.36, 24], 0, Math.PI * -0.018),
    box('01_site_context / upper monastery plateau', [-5.8, 1.08, -5.4], [18, 0.28, 8.4], 0),
    box('02_mass_model / partly embedded base floors', [2.6, 1.0, 1.2], [13.6, 2.1, 9.4], 5),
    box('02_mass_model / seven-storey care volume at slope edge', [2.6, 5.05, 1.2], [12.2, 7.7, 7.8], 2),
    box('03_structure / bracing service core', [-1.7, 5.0, 0.6], [1.45, 8.1, 2.1], 1),
    box('04_envelope / mineral east facade plane', [8.82, 5.15, 1.2], [0.24, 7.4, 7.9], 2),
    box('04_envelope / timber west facade layer', [-3.65, 5.15, 1.2], [0.22, 7.2, 7.8], 3),
    box('04_envelope / timber south facade layer', [2.6, 5.15, 5.23], [12.0, 7.2, 0.22], 3),
    box('04_envelope / timber north facade layer', [2.6, 5.15, -2.86], [12.0, 7.2, 0.22], 3),
    box('05_interior / double-height chapel and foyer void', [6.4, 2.9, -1.6], [3.2, 3.9, 3.0], 4),
    box('05_interior / dining and public care floor', [2.2, 2.15, 3.7], [8.8, 0.22, 2.4], 6),
    box('06_circulation / vertical link from parking to plateau', [-1.7, 3.45, 3.9], [1.1, 5.0, 0.28], 6, Math.PI * 0.08),
    box('06_circulation / public entry threshold', [2.6, 1.9, 6.2], [8.5, 0.18, 1.1], 6),
    box('07_context / existing monastery reference mass', [-9.5, 2.8, -5.4], [6.4, 3.2, 4.4], 2)
  ];

  for (const x of [-2.1, 0.5, 3.1, 5.7, 8.3]) {
    for (const z of [-2.2, 0.7, 3.6]) {
      objects.push(cylinder(`03_structure / concrete column grid ${x}:${z}`, [x, 5.0, z], 0.11, 7.6, 12, 1));
    }
  }

  for (let floor = 0; floor < 7; floor += 1) {
    objects.push(box(`03_structure / flat slab care level ${floor + 1}`, [2.6, 1.55 + floor * 1.05, 1.2], [12.3, 0.12, 7.8], 1));
  }

  for (const x of [-3.75, 8.95]) {
    for (const z of [-1.9, 0.4, 2.7, 5.0]) {
      objects.push(box(`04_envelope / vertical timber-mineral rhythm ${x}:${z}`, [x, 5.18, z], [0.18, 7.2, 0.08], x < 0 ? 3 : 2));
    }
  }

  return {
    asset: {
      version: '2.0',
      generator: 'Architecture Cosmos archive-generate-massing',
      copyright: 'Architecture Cosmos / diagrammatic model / not measured'
    },
    sceneName: `${entry.title} diagrammatic low-poly massing`,
    materials,
    objects
  };
}

function sceneForEntry(entry) {
  if (entry.slug === 'villa-savoye') return villaSavoyeScene(entry);
  if (entry.slug === 'alterszentrum-kloster-ingenbohl') return ingenbohlScene(entry);
  return null;
}

function box(name, center, size, material, rotationY = 0) {
  const [sx, sy, sz] = size.map((value) => value / 2);
  const corners = [
    [-sx, -sy, sz], [sx, -sy, sz], [sx, sy, sz], [-sx, sy, sz],
    [sx, -sy, -sz], [-sx, -sy, -sz], [-sx, sy, -sz], [sx, sy, -sz],
    [-sx, -sy, -sz], [-sx, -sy, sz], [-sx, sy, sz], [-sx, sy, -sz],
    [sx, -sy, sz], [sx, -sy, -sz], [sx, sy, -sz], [sx, sy, sz],
    [-sx, sy, sz], [sx, sy, sz], [sx, sy, -sz], [-sx, sy, -sz],
    [-sx, -sy, -sz], [sx, -sy, -sz], [sx, -sy, sz], [-sx, -sy, sz]
  ].map((point) => transformPoint(point, center, rotationY));

  const normals = [
    [0, 0, 1], [0, 0, 1], [0, 0, 1], [0, 0, 1],
    [0, 0, -1], [0, 0, -1], [0, 0, -1], [0, 0, -1],
    [-1, 0, 0], [-1, 0, 0], [-1, 0, 0], [-1, 0, 0],
    [1, 0, 0], [1, 0, 0], [1, 0, 0], [1, 0, 0],
    [0, 1, 0], [0, 1, 0], [0, 1, 0], [0, 1, 0],
    [0, -1, 0], [0, -1, 0], [0, -1, 0], [0, -1, 0]
  ].map((normal) => rotateY(normal, rotationY));

  return {
    name,
    material,
    positions: corners.flat(),
    normals: normals.flat(),
    indices: [
      0, 1, 2, 0, 2, 3,
      4, 5, 6, 4, 6, 7,
      8, 9, 10, 8, 10, 11,
      12, 13, 14, 12, 14, 15,
      16, 17, 18, 16, 18, 19,
      20, 21, 22, 20, 22, 23
    ]
  };
}

function cylinder(name, center, radius, height, segments, material) {
  const positions = [];
  const normals = [];
  const indices = [];
  const half = height / 2;

  for (let index = 0; index < segments; index += 1) {
    const angle = (index / segments) * Math.PI * 2;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    const normal = normalize([x, 0, z]);
    positions.push(center[0] + x, center[1] - half, center[2] + z);
    positions.push(center[0] + x, center[1] + half, center[2] + z);
    normals.push(...normal, ...normal);
  }

  for (let index = 0; index < segments; index += 1) {
    const next = (index + 1) % segments;
    const a = index * 2;
    const b = next * 2;
    indices.push(a, b, a + 1, b, b + 1, a + 1);
  }

  return { name, material, positions, normals, indices };
}

function transformPoint(point, center, rotationY) {
  const rotated = rotateY(point, rotationY);
  return [rotated[0] + center[0], rotated[1] + center[1], rotated[2] + center[2]];
}

function rotateY(point, angle) {
  const [x, y, z] = point;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return [x * cos - z * sin, y, x * sin + z * cos];
}

function normalize(vector) {
  const length = Math.hypot(...vector) || 1;
  return vector.map((value) => value / length);
}

function buildGlb(scene) {
  const json = {
    asset: scene.asset,
    scene: 0,
    scenes: [{ name: scene.sceneName, nodes: scene.objects.map((_, index) => index) }],
    nodes: scene.objects.map((object, index) => ({ name: object.name, mesh: index })),
    meshes: [],
    materials: scene.materials.map((material) => ({
      name: material.name,
      pbrMetallicRoughness: {
        baseColorFactor: material.color,
        metallicFactor: 0,
        roughnessFactor: 0.92
      }
    })),
    buffers: [{ byteLength: 0 }],
    bufferViews: [],
    accessors: []
  };

  const chunks = [];
  for (const object of scene.objects) {
    const positionAccessor = addFloatAccessor(json, chunks, object.positions, 'VEC3');
    const normalAccessor = addFloatAccessor(json, chunks, object.normals, 'VEC3');
    const indexAccessor = addIndexAccessor(json, chunks, object.indices);
    json.meshes.push({
      name: object.name,
      primitives: [{
        attributes: { POSITION: positionAccessor, NORMAL: normalAccessor },
        indices: indexAccessor,
        material: object.material,
        mode: 4
      }]
    });
  }

  const bin = Buffer.concat(chunks);
  json.buffers[0].byteLength = bin.length;

  const jsonBuffer = padBuffer(Buffer.from(JSON.stringify(json), 'utf8'), 0x20);
  const binBuffer = padBuffer(bin, 0x00);
  const totalLength = 12 + 8 + jsonBuffer.length + 8 + binBuffer.length;

  const header = Buffer.alloc(12);
  header.writeUInt32LE(0x46546c67, 0);
  header.writeUInt32LE(2, 4);
  header.writeUInt32LE(totalLength, 8);

  const jsonHeader = Buffer.alloc(8);
  jsonHeader.writeUInt32LE(jsonBuffer.length, 0);
  jsonHeader.writeUInt32LE(0x4e4f534a, 4);

  const binHeader = Buffer.alloc(8);
  binHeader.writeUInt32LE(binBuffer.length, 0);
  binHeader.writeUInt32LE(0x004e4942, 4);

  return Buffer.concat([header, jsonHeader, jsonBuffer, binHeader, binBuffer]);
}

function addFloatAccessor(json, chunks, values, type) {
  const buffer = Buffer.alloc(values.length * 4);
  values.forEach((value, index) => buffer.writeFloatLE(value, index * 4));
  const byteOffset = appendChunk(chunks, buffer);
  const bufferView = json.bufferViews.push({ buffer: 0, byteOffset, byteLength: buffer.length, target: 34962 }) - 1;
  const componentCount = type === 'VEC3' ? 3 : 1;
  const vectors = [];
  for (let index = 0; index < values.length; index += componentCount) {
    vectors.push(values.slice(index, index + componentCount));
  }
  const accessor = {
    bufferView,
    componentType: 5126,
    count: values.length / componentCount,
    type
  };
  if (type === 'VEC3') {
    accessor.min = [0, 1, 2].map((axis) => Math.min(...vectors.map((vector) => vector[axis])));
    accessor.max = [0, 1, 2].map((axis) => Math.max(...vectors.map((vector) => vector[axis])));
  }
  return json.accessors.push(accessor) - 1;
}

function addIndexAccessor(json, chunks, values) {
  const buffer = Buffer.alloc(values.length * 2);
  values.forEach((value, index) => buffer.writeUInt16LE(value, index * 2));
  const byteOffset = appendChunk(chunks, buffer);
  const bufferView = json.bufferViews.push({ buffer: 0, byteOffset, byteLength: buffer.length, target: 34963 }) - 1;
  return json.accessors.push({
    bufferView,
    componentType: 5123,
    count: values.length,
    type: 'SCALAR',
    min: [Math.min(...values)],
    max: [Math.max(...values)]
  }) - 1;
}

function appendChunk(chunks, buffer) {
  const currentLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const padding = (4 - (currentLength % 4)) % 4;
  if (padding) chunks.push(Buffer.alloc(padding));
  const byteOffset = currentLength + padding;
  chunks.push(buffer);
  return byteOffset;
}

function padBuffer(buffer, padByte) {
  const padding = (4 - (buffer.length % 4)) % 4;
  return padding ? Buffer.concat([buffer, Buffer.alloc(padding, padByte)]) : buffer;
}

function buildGeometryProfile(entry, scene) {
  const triangleCount = scene.objects.reduce((sum, object) => sum + object.indices.length / 3, 0);
  return {
    entry_id: entry.id,
    slug: entry.slug,
    title: entry.title,
    generated_at: new Date().toISOString(),
    generator: 'archive-generate-massing',
    status: 'diagrammatic_low_poly_generated',
    caveat: 'This is a diagrammatic Architecture Cosmos reference model, not a measured reconstruction.',
    unit: 'meter',
    origin: 'project_center_ground_floor',
    object_count: scene.objects.length,
    triangle_count: triangleCount,
    layers: scene.objects.map((object) => ({
      name: object.name,
      material: scene.materials[object.material]?.name ?? 'unknown',
      triangle_count: object.indices.length / 3
    })),
    recommended_next_review: [
      'Compare massing proportions against trusted plans and sections.',
      'Replace ramp and entry trace with verified geometry when source drawings are reviewed.',
      'Separate export into site, mass, structure, circulation and tectonic GLBs after manual review.'
    ]
  };
}
