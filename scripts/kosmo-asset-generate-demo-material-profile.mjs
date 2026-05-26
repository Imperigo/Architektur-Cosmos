#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const libraryPath = resolve(root, args.library || 'examples/kosmo-assets/kosmo-asset-demo/library.json');
const libraryRoot = dirname(libraryPath);
const assetId = args.asset || 'warm-concrete-material-001';
const outputJsonPath = resolve(libraryRoot, args.output || 'review/asset-material-profile.generated.json');
const outputMdPath = resolve(libraryRoot, args.markdown || 'review/asset-material-profile.generated.md');

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});

async function main() {
  if (!existsSync(libraryPath)) throw new Error(`KosmoAsset library not found: ${libraryPath}`);

  const library = readJson(libraryPath);
  const asset = (library.assets || []).find((item) => item.id === assetId);
  if (!asset) throw new Error(`Asset not found in library: ${assetId}`);

  const materialFormat = (asset.formats || []).find((format) => format.format === 'material_json' && format.path);
  if (!materialFormat) throw new Error(`Asset has no material_json format with path: ${assetId}`);

  const materialPath = resolve(libraryRoot, materialFormat.path);
  if (!existsSync(materialPath)) throw new Error(`Material file not found: ${relative(root, materialPath)}`);

  const material = readJson(materialPath);
  const report = buildReport({ library, asset, material, materialPath });

  await Promise.all([mkdir(dirname(outputJsonPath), { recursive: true }), mkdir(dirname(outputMdPath), { recursive: true })]);
  applyLibraryUpdates({ library, asset, report });
  await writeFile(libraryPath, `${JSON.stringify(library, null, 2)}\n`, 'utf8');
  await writeFile(outputJsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await writeFile(outputMdPath, renderMarkdown(report), 'utf8');

  console.log('KosmoAsset demo material profile generation');
  console.log(`Library: ${relative(root, libraryPath)}`);
  console.log(`Asset: ${asset.id}`);
  console.log(`Material: ${relative(root, materialPath)}`);
  console.log(`Parameters: ${report.material.parameter_count}`);
  console.log(`Wrote: ${relative(root, outputMdPath)}`);
}

function buildReport({ library, asset, material, materialPath }) {
  const parameters = {
    base_color: material.material?.base_color || asset.preview?.primary || null,
    roughness: numberOrNull(material.material?.roughness),
    metallic: numberOrNull(material.material?.metallic),
    specular: numberOrNull(material.material?.specular)
  };
  const layers = [
    'material/base_color',
    'material/roughness',
    'material/metallic',
    'material/specular',
    `blender/${material.blender_mapping?.shader || 'principled_bsdf'}`,
    `archicad/${material.archicad_mapping?.classification || 'material/review'}`
  ];

  return {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    generator: 'kosmo-asset-generate-demo-material-profile',
    library_id: library.library_id || null,
    asset_id: asset.id,
    asset_title: asset.title,
    status: 'local_review_material_profile_generated',
    caveat: 'Procedural material metadata only. It is not a sampled texture, measured product specification or public release.',
    no_uploads: true,
    public_use_allowed: false,
    material_path: relative(root, materialPath),
    material: {
      name: material.name || asset.title,
      unit: 'parameter_profile',
      parameter_count: Object.values(parameters).filter((value) => value !== null).length,
      parameters,
      blender_mapping: material.blender_mapping || null,
      archicad_mapping: material.archicad_mapping || null,
      layer_names: layers
    },
    recommended_next_review: [
      'Open the material JSON and confirm color, roughness and mapping names are suitable for local review.',
      'Decide whether this becomes a Blender material, ArchiCAD surface or only a KosmoAsset metadata sample.',
      'Keep this material local until human review confirms it is not copied from protected scans, photos or product data.'
    ]
  };
}

function applyLibraryUpdates({ library, asset, report }) {
  library.updated_at = new Date().toISOString().slice(0, 10);
  asset.review_status = asset.review_status === 'planned' ? 'draft' : asset.review_status;
  asset.local_only = true;
  asset.public_use_allowed = false;
  asset.tags = unique([...(asset.tags || []), 'material-profile', 'procedural-material', 'asset-review']);
  const generatedProfile = {
    generated_at: report.generated_at,
    generator: report.generator,
    status: report.status,
    caveat: report.caveat,
    parameter_count: report.material.parameter_count,
    layer_names: report.material.layer_names
  };
  asset.generated_asset_profile = generatedProfile;
  asset.generated_asset_profiles = upsertGeneratedProfile(asset.generated_asset_profiles, generatedProfile);
}

function renderMarkdown(report) {
  const lines = [
    '# KosmoAsset Demo Material Profile',
    '',
    `Asset: \`${report.asset_id}\``,
    `Generated: ${report.generated_at}`,
    `Status: \`${report.status}\``,
    '',
    report.caveat,
    '',
    '## Output',
    '',
    `- material: \`${report.material_path}\``,
    `- parameters: ${report.material.parameter_count}`,
    `- layers: ${report.material.layer_names.join(', ')}`,
    '',
    '## Parameters',
    '',
    '```json',
    JSON.stringify(report.material.parameters, null, 2),
    '```',
    '',
    '## Next Review',
    ''
  ];

  report.recommended_next_review.forEach((item) => lines.push(`- ${item}`));
  return `${lines.join('\n')}\n`;
}

function readJson(pathname) {
  return JSON.parse(readFileSync(pathname, 'utf8'));
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

function numberOrNull(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function upsertGeneratedProfile(profiles, profile) {
  const rows = Array.isArray(profiles) ? profiles.filter(Boolean) : [];
  const next = rows.filter((item) => item.generator !== profile.generator);
  next.push(profile);
  return next;
}
