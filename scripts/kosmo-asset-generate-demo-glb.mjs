#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const libraryPath = resolve(root, args.library || 'examples/kosmo-assets/kosmo-asset-demo/library.json');
const libraryRoot = dirname(libraryPath);
const assetId = args.asset || 'generic-column-glb-001';
const outputJsonPath = resolve(libraryRoot, args.output || 'review/asset-glb-generation.generated.json');
const outputMdPath = resolve(libraryRoot, args.markdown || 'review/asset-glb-generation.generated.md');

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});

async function main() {
  if (!existsSync(libraryPath)) throw new Error(`KosmoAsset library not found: ${libraryPath}`);

  const library = readJson(libraryPath);
  const asset = (library.assets || []).find((item) => item.id === assetId);
  if (!asset) throw new Error(`Asset not found in library: ${assetId}`);

  const dimensions = normalizeDimensions(asset.dimensions);
  const glbFormat = findOrCreateGlbFormat(asset);
  const glbPath = resolve(libraryRoot, glbFormat.path || `assets/models/${asset.id}.glb`);
  const scene = buildColumnScene({ asset, dimensions });
  const glb = buildGlb(scene);
  const report = buildReport({ library, asset, dimensions, scene, glbPath });

  await mkdir(dirname(glbPath), { recursive: true });
  await mkdir(dirname(outputJsonPath), { recursive: true });
  await writeFile(glbPath, glb);

  applyLibraryUpdates({ library, asset, glbFormat, glbPath, report });
  await writeFile(libraryPath, `${JSON.stringify(library, null, 2)}\n`, 'utf8');
  await writeFile(outputJsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await writeFile(outputMdPath, renderMarkdown(report), 'utf8');

  console.log('KosmoAsset demo GLB generation');
  console.log(`Library: ${relative(root, libraryPath)}`);
  console.log(`Asset: ${asset.id}`);
  console.log(`GLB: ${relative(root, glbPath)}`);
  console.log(`Objects: ${report.geometry.object_count}`);
  console.log(`Triangles: ${report.geometry.triangle_count}`);
  console.log(`Wrote: ${relative(root, outputMdPath)}`);
}

function normalizeDimensions(dimensions = {}) {
  const width = numberOr(dimensions.width_m, 0.35);
  const depth = numberOr(dimensions.depth_m, width);
  const height = numberOr(dimensions.height_m, 3);
  return {
    width_m: width,
    depth_m: depth,
    height_m: height,
    scale: dimensions.scale || '1:1 diagrammatic'
  };
}

function findOrCreateGlbFormat(asset) {
  asset.formats = Array.isArray(asset.formats) ? asset.formats : [];
  let format = asset.formats.find((item) => item.format === 'glb');
  if (!format) {
    format = {
      format: 'glb',
      path: `assets/models/${asset.id}.glb`,
      software: ['blender', 'web', 'archicad'],
      status: 'exists'
    };
    asset.formats.push(format);
  }
  if (!format.path) format.path = `assets/models/${asset.id}.glb`;
  return format;
}

function buildColumnScene({ asset, dimensions }) {
  const radius = Math.min(dimensions.width_m, dimensions.depth_m) / 2;
  const plateX = dimensions.width_m * 1.65;
  const plateZ = dimensions.depth_m * 1.65;
  const plateH = Math.min(0.12, dimensions.height_m * 0.05);
  const axisSize = Math.max(radius * 0.08, 0.018);
  const halfHeight = dimensions.height_m / 2;

  const materials = [
    { name: 'material/mineral_concrete_review', color: [0.72, 0.69, 0.63, 1] },
    { name: 'material/kosmo_cyan_axis', color: [0, 0.91, 1, 1] },
    { name: 'material/kosmo_magenta_review_edge', color: [1, 0.31, 0.85, 1] }
  ];

  const objects = [
    cylinder('structure/column_core_round', [0, halfHeight, 0], radius, dimensions.height_m, 32, 0),
    box('structure/base_plate_reference', [0, plateH / 2, 0], [plateX, plateH, plateZ], 2),
    box('structure/top_plate_reference', [0, dimensions.height_m - plateH / 2, 0], [plateX, plateH, plateZ], 2),
    box('analysis/axis_x', [0, dimensions.height_m + plateH * 0.75, 0], [plateX * 1.25, axisSize, axisSize], 1),
    box('analysis/axis_z', [0, dimensions.height_m + plateH * 0.75, 0], [axisSize, axisSize, plateZ * 1.25], 1)
  ];

  return {
    asset: {
      version: '2.0',
      generator: 'Architecture Cosmos KosmoAsset GLB Generator'
    },
    sceneName: `${asset.id}/diagrammatic_column_asset`,
    materials,
    objects
  };
}

function applyLibraryUpdates({ library, asset, glbFormat, glbPath, report }) {
  library.updated_at = new Date().toISOString().slice(0, 10);
  asset.description = 'Local diagrammatic GLB component for Blender/ArchiCAD exchange tests.';
  asset.source_basis = [
    'Generated inside Architecture Cosmos as a neutral analytical structural component.',
    'No protected project plan, image or third-party model was used.'
  ];
  asset.rights_status = 'generated_needs_review';
  asset.license = 'review_only';
  asset.review_status = 'draft';
  asset.confidence = Math.max(Number(asset.confidence || 0), 0.58);
  asset.local_only = true;
  asset.public_use_allowed = false;
  asset.tags = unique([...(asset.tags || []).filter((tag) => tag !== 'placeholder'), 'column', 'structure', 'glb', 'diagrammatic', 'asset-review']);
  asset.material_tags = unique([...(asset.material_tags || []).filter((tag) => tag !== 'generic'), 'beton', 'mineralisch']);
  asset.generated_asset_profile = {
    generated_at: report.generated_at,
    generator: report.generator,
    status: 'local_review_glb_generated',
    caveat: report.caveat,
    triangle_count: report.geometry.triangle_count,
    layer_names: report.geometry.layers.map((layer) => layer.name)
  };
  glbFormat.path = relative(libraryRoot, glbPath);
  glbFormat.status = 'exists';
  glbFormat.software = unique([...(glbFormat.software || []), 'blender', 'web', 'archicad']);
}

function buildReport({ library, asset, dimensions, scene, glbPath }) {
  const triangleCount = scene.objects.reduce((sum, object) => sum + object.indices.length / 3, 0);
  return {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    generator: 'kosmo-asset-generate-demo-glb',
    library_id: library.library_id || null,
    asset_id: asset.id,
    asset_title: asset.title,
    status: 'local_review_glb_generated',
    caveat: 'Diagrammatic study asset only. It is not a measured BIM component or public release.',
    no_uploads: true,
    public_use_allowed: false,
    glb_path: relative(root, glbPath),
    dimensions,
    geometry: {
      unit: 'meter',
      origin: 'component_base_center',
      object_count: scene.objects.length,
      triangle_count: triangleCount,
      layers: scene.objects.map((object) => ({
        name: object.name,
        material: scene.materials[object.material]?.name || 'unknown',
        triangle_count: object.indices.length / 3
      }))
    },
    recommended_next_review: [
      'Open the GLB in a local viewer or Blender and confirm scale, origin and layer names.',
      'Decide whether column, plates and axes should export as separate Blender collections.',
      'Keep this asset local until human review promotes it beyond review_only status.'
    ]
  };
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

  const bottomCenter = positions.length / 3;
  positions.push(center[0], center[1] - half, center[2]);
  normals.push(0, -1, 0);
  const topCenter = positions.length / 3;
  positions.push(center[0], center[1] + half, center[2]);
  normals.push(0, 1, 0);

  const bottomStart = positions.length / 3;
  for (let index = 0; index < segments; index += 1) {
    const angle = (index / segments) * Math.PI * 2;
    positions.push(center[0] + Math.cos(angle) * radius, center[1] - half, center[2] + Math.sin(angle) * radius);
    normals.push(0, -1, 0);
  }
  const topStart = positions.length / 3;
  for (let index = 0; index < segments; index += 1) {
    const angle = (index / segments) * Math.PI * 2;
    positions.push(center[0] + Math.cos(angle) * radius, center[1] + half, center[2] + Math.sin(angle) * radius);
    normals.push(0, 1, 0);
  }

  for (let index = 0; index < segments; index += 1) {
    const next = (index + 1) % segments;
    indices.push(bottomCenter, bottomStart + next, bottomStart + index);
    indices.push(topCenter, topStart + index, topStart + next);
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
        roughnessFactor: 0.9
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

function renderMarkdown(report) {
  const lines = [
    '# KosmoAsset Demo GLB Generation',
    '',
    `Asset: \`${report.asset_id}\``,
    `Generated: ${report.generated_at}`,
    `Status: \`${report.status}\``,
    '',
    report.caveat,
    '',
    '## Output',
    '',
    `- GLB: \`${report.glb_path}\``,
    `- objects: ${report.geometry.object_count}`,
    `- triangles: ${report.geometry.triangle_count}`,
    '',
    '## Layers',
    '',
    '| Layer | Material | Triangles |',
    '| --- | --- | --- |'
  ];

  for (const layer of report.geometry.layers) {
    lines.push(`| ${escapePipe(layer.name)} | ${escapePipe(layer.material)} | ${layer.triangle_count} |`);
  }

  lines.push('', '## Next Review', '');
  report.recommended_next_review.forEach((item) => lines.push(`- ${item}`));
  return `${lines.join('\n')}\n`;
}

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function parseArgs(rawArgs) {
  const parsed = {};
  for (let index = 0; index < rawArgs.length; index += 1) {
    const token = rawArgs[index];
    if (!token.startsWith('--')) continue;
    const key = token.slice(2);
    const next = rawArgs[index + 1];
    if (!next || next.startsWith('--')) parsed[key] = true;
    else {
      parsed[key] = next;
      index += 1;
    }
  }
  return parsed;
}

function numberOr(value, fallback) {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric > 0 ? numeric : fallback;
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function escapePipe(value) {
  return String(value).replaceAll('|', '\\|');
}
