#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const libraryPath = resolve(root, args.library || 'examples/kosmo-assets/kosmo-asset-demo/library.json');
const libraryRoot = dirname(libraryPath);
const assetId = args.asset || 'axis-marker-svg-001';
const outputJsonPath = resolve(libraryRoot, args.output || 'review/asset-dxf-generation.generated.json');
const outputMdPath = resolve(libraryRoot, args.markdown || 'review/asset-dxf-generation.generated.md');

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});

async function main() {
  if (!existsSync(libraryPath)) throw new Error(`KosmoAsset library not found: ${libraryPath}`);

  const library = readJson(libraryPath);
  const asset = (library.assets || []).find((item) => item.id === assetId);
  if (!asset) throw new Error(`Asset not found in library: ${assetId}`);

  const dxfProfile = buildDxfProfile(asset);
  const dxfFormat = findOrCreateDxfFormat(asset);
  const dxfPath = resolve(libraryRoot, dxfFormat.path || `assets/dxf/${asset.id}.dxf`);
  const dxf = buildDxfDocument(dxfProfile);
  const report = buildReport({ library, asset, dxfPath, dxfProfile });

  await mkdir(dirname(dxfPath), { recursive: true });
  await mkdir(dirname(outputJsonPath), { recursive: true });
  await writeFile(dxfPath, dxf, 'utf8');

  applyLibraryUpdates({ library, asset, dxfFormat, dxfPath, report });
  await writeFile(libraryPath, `${JSON.stringify(library, null, 2)}\n`, 'utf8');
  await writeFile(outputJsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await writeFile(outputMdPath, renderMarkdown(report), 'utf8');

  console.log('KosmoAsset demo DXF generation');
  console.log(`Library: ${relative(root, libraryPath)}`);
  console.log(`Asset: ${asset.id}`);
  console.log(`DXF: ${relative(root, dxfPath)}`);
  console.log(`Entities: ${report.geometry.entity_count}`);
  console.log(`Wrote: ${relative(root, outputMdPath)}`);
}

function findOrCreateDxfFormat(asset) {
  asset.formats = Array.isArray(asset.formats) ? asset.formats : [];
  let format = asset.formats.find((item) => item.format === 'dxf');
  if (!format) {
    format = {
      format: 'dxf',
      path: `assets/dxf/${asset.id}.dxf`,
      software: ['archicad', 'generic'],
      status: 'exists'
    };
    asset.formats.push(format);
  }
  if (!format.path) format.path = `assets/dxf/${asset.id}.dxf`;
  return format;
}

function buildDxfProfile(asset) {
  if (asset.asset_type === 'glb_model' || asset.id.includes('column')) return buildColumnFootprintProfile(asset);
  return buildAxisMarkerProfile(asset);
}

function buildAxisMarkerProfile(asset) {
  return {
    kind: 'axis_marker',
    status: 'local_review_dxf_generated',
    caveat: 'Diagrammatic axis symbol only. It is not a measured project drawing or public release.',
    layers: [
      ['KOSMO_AXIS_PRIMARY', 4],
      ['KOSMO_AXIS_SECONDARY', 2],
      ['KOSMO_TEXT', 7]
    ],
    entities: [
      line('KOSMO_AXIS_PRIMARY', -1.2, 0, 1.2, 0),
      line('KOSMO_AXIS_PRIMARY', 0, -1.2, 0, 1.2),
      line('KOSMO_AXIS_SECONDARY', -0.42, -0.42, 0.42, 0.42),
      line('KOSMO_AXIS_SECONDARY', -0.42, 0.42, 0.42, -0.42),
      circle('KOSMO_AXIS_PRIMARY', 0, 0, 0.32),
      circle('KOSMO_AXIS_SECONDARY', 0, 0, 0.08),
      text('KOSMO_TEXT', 0.44, -0.58, 0.12, asset.preview?.label || 'ACHSE')
    ],
    tags: ['dxf', 'cad-export', 'axis'],
    recommended_next_review: [
      'Open the DXF in a local CAD viewer or ArchiCAD and confirm scale and layers.',
      'Decide whether lineweights and text style should be mapped to a KosmoPlan template.',
      'Keep this asset local until human review promotes it beyond review_only status.'
    ]
  };
}

function buildColumnFootprintProfile(asset) {
  const dimensions = normalizeDimensions(asset.dimensions);
  const halfWidth = dimensions.width_m / 2;
  const halfDepth = dimensions.depth_m / 2;
  const clearanceHalfWidth = halfWidth * 1.65;
  const clearanceHalfDepth = halfDepth * 1.65;
  const axisLength = Math.max(dimensions.width_m, dimensions.depth_m) * 1.9;

  return {
    kind: 'column_footprint',
    status: 'local_review_dxf_generated',
    caveat: 'Diagrammatic column footprint only. It is not a measured BIM element, reinforcement plan or public release.',
    dimensions,
    layers: [
      ['KOSMO_COLUMN_FOOTPRINT', 4],
      ['KOSMO_COLUMN_CLEARANCE', 6],
      ['KOSMO_AXIS', 2],
      ['KOSMO_TEXT', 7]
    ],
    entities: [
      ...rectangle('KOSMO_COLUMN_FOOTPRINT', halfWidth, halfDepth),
      circle('KOSMO_COLUMN_FOOTPRINT', 0, 0, Math.min(halfWidth, halfDepth)),
      ...rectangle('KOSMO_COLUMN_CLEARANCE', clearanceHalfWidth, clearanceHalfDepth),
      line('KOSMO_AXIS', -axisLength / 2, 0, axisLength / 2, 0),
      line('KOSMO_AXIS', 0, -axisLength / 2, 0, axisLength / 2),
      text('KOSMO_TEXT', clearanceHalfWidth + 0.08, -clearanceHalfDepth, 0.08, asset.preview?.label || 'STUETZE')
    ],
    tags: ['dxf', 'cad-export', 'column', 'footprint'],
    recommended_next_review: [
      'Open the footprint DXF in a local CAD viewer or ArchiCAD and confirm 1:1 scale, origin and layers.',
      'Decide whether the footprint should become a 2D symbol, an ArchiCAD object profile or only an import reference.',
      'Keep this asset local until human review promotes it beyond review_only status.'
    ]
  };
}

function buildDxfDocument(profile) {
  return [
    '0', 'SECTION',
    '2', 'HEADER',
    '9', '$ACADVER',
    '1', 'AC1009',
    '9', '$INSUNITS',
    '70', '6',
    '0', 'ENDSEC',
    '0', 'SECTION',
    '2', 'TABLES',
    '0', 'TABLE',
    '2', 'LAYER',
    '70', String(profile.layers.length),
    ...profile.layers.flatMap(([name, color]) => ['0', 'LAYER', '2', name, '70', '0', '62', String(color), '6', 'CONTINUOUS']),
    '0', 'ENDTAB',
    '0', 'ENDSEC',
    '0', 'SECTION',
    '2', 'ENTITIES',
    ...profile.entities.flat(),
    '0', 'ENDSEC',
    '0', 'EOF',
    ''
  ].join('\n');
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

function rectangle(layer, halfWidth, halfDepth) {
  return [
    line(layer, -halfWidth, -halfDepth, halfWidth, -halfDepth),
    line(layer, halfWidth, -halfDepth, halfWidth, halfDepth),
    line(layer, halfWidth, halfDepth, -halfWidth, halfDepth),
    line(layer, -halfWidth, halfDepth, -halfWidth, -halfDepth)
  ];
}

function line(layer, x1, y1, x2, y2) {
  return ['0', 'LINE', '8', layer, '10', n(x1), '20', n(y1), '30', '0', '11', n(x2), '21', n(y2), '31', '0'];
}

function circle(layer, x, y, radius) {
  return ['0', 'CIRCLE', '8', layer, '10', n(x), '20', n(y), '30', '0', '40', n(radius)];
}

function text(layer, x, y, height, value) {
  return ['0', 'TEXT', '8', layer, '10', n(x), '20', n(y), '30', '0', '40', n(height), '1', dxfText(value), '50', '0'];
}

function applyLibraryUpdates({ library, asset, dxfFormat, dxfPath, report }) {
  library.updated_at = new Date().toISOString().slice(0, 10);
  asset.description = asset.description || 'Minimal SVG/DXF annotation symbol for plan and section overlays.';
  asset.source_basis = asset.source_basis?.length
    ? asset.source_basis
    : ['Generated directly inside the repository as a neutral Cosmos graphic test asset.'];
  asset.review_status = asset.review_status === 'planned' ? 'draft' : asset.review_status;
  asset.local_only = true;
  asset.public_use_allowed = false;
  asset.tags = unique([...(asset.tags || []), ...report.geometry.tags]);
  const generatedProfile = {
    generated_at: report.generated_at,
    generator: report.generator,
    status: 'local_review_dxf_generated',
    caveat: report.caveat,
    entity_count: report.geometry.entity_count,
    layer_names: report.geometry.layers
  };
  asset.generated_asset_profiles = upsertGeneratedProfile(asset.generated_asset_profiles, generatedProfile, asset.generated_asset_profile);
  if (!asset.generated_asset_profile || asset.asset_type === '2d_symbol') {
    asset.generated_asset_profile = generatedProfile;
  }
  dxfFormat.path = relative(libraryRoot, dxfPath);
  dxfFormat.status = 'exists';
  dxfFormat.software = unique([...(dxfFormat.software || []), 'archicad', 'generic']);
}

function buildReport({ library, asset, dxfPath, dxfProfile }) {
  return {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    generator: 'kosmo-asset-generate-demo-dxf',
    library_id: library.library_id || null,
    asset_id: asset.id,
    asset_title: asset.title,
    asset_kind: dxfProfile.kind,
    status: dxfProfile.status,
    caveat: dxfProfile.caveat,
    no_uploads: true,
    public_use_allowed: false,
    dxf_path: relative(root, dxfPath),
    dimensions: dxfProfile.dimensions || null,
    geometry: {
      unit: 'meter',
      entity_count: dxfProfile.entities.length,
      layers: dxfProfile.layers.map(([name]) => name),
      tags: dxfProfile.tags
    },
    recommended_next_review: dxfProfile.recommended_next_review
  };
}

function renderMarkdown(report) {
  const lines = [
    '# KosmoAsset Demo DXF Generation',
    '',
    `Asset: \`${report.asset_id}\``,
    `Generated: ${report.generated_at}`,
    `Status: \`${report.status}\``,
    '',
    report.caveat,
    '',
    '## Output',
    '',
    `- DXF: \`${report.dxf_path}\``,
    `- asset kind: \`${report.asset_kind}\``,
    `- entities: ${report.geometry.entity_count}`,
    `- layers: ${report.geometry.layers.join(', ')}`,
    '',
    '## Next Review',
    ''
  ];

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

function n(value) {
  return Number(value).toFixed(4).replace(/\.?0+$/, '');
}

function numberOr(value, fallback) {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric > 0 ? numeric : fallback;
}

function dxfText(value) {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/Ä/g, 'AE')
    .replace(/Ö/g, 'OE')
    .replace(/Ü/g, 'UE')
    .toUpperCase();
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function upsertGeneratedProfile(profiles, profile, primaryProfile) {
  const rows = Array.isArray(profiles) ? profiles.filter(Boolean) : [];
  const seeded = primaryProfile ? [primaryProfile, ...rows] : rows;
  const next = seeded.filter((item, index, items) => (
    item.generator !== profile.generator
    && items.findIndex((candidate) => candidate.generator === item.generator) === index
  ));
  next.push(profile);
  return next;
}
