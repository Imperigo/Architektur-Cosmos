#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const libraryPath = resolve(root, args.library || 'examples/kosmo-assets/kosmo-asset-demo/library.json');
const libraryRoot = dirname(libraryPath);
const outputJsonPath = resolve(libraryRoot, args.output || 'review/asset-exchange-profile.generated.json');
const outputMdPath = resolve(libraryRoot, args.markdown || 'review/asset-exchange-profile.generated.md');

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});

async function main() {
  if (!existsSync(libraryPath)) throw new Error(`KosmoAsset library not found: ${libraryPath}`);

  const library = readJson(libraryPath);
  const reviewPack = readOptionalJson(resolve(libraryRoot, 'review/asset-review-pack.generated.json'));
  const exchangeProfile = buildExchangeProfile({ library, reviewPack });

  await Promise.all([mkdir(dirname(outputJsonPath), { recursive: true }), mkdir(dirname(outputMdPath), { recursive: true })]);
  await writeFile(outputJsonPath, `${JSON.stringify(exchangeProfile, null, 2)}\n`, 'utf8');
  await writeFile(outputMdPath, renderMarkdown(exchangeProfile), 'utf8');

  console.log('KosmoAsset exchange profile generated');
  console.log(`Library: ${relative(root, libraryPath)}`);
  console.log(`Assets: ${exchangeProfile.summary.asset_count}`);
  console.log(`Blender profiles: ${exchangeProfile.summary.blender_profile_count}`);
  console.log(`ArchiCAD profiles: ${exchangeProfile.summary.archicad_profile_count}`);
  console.log(`Wrote: ${relative(root, outputMdPath)}`);
}

function buildExchangeProfile({ library, reviewPack }) {
  const assets = Array.isArray(library.assets) ? library.assets : [];
  const reviewRows = new Map((reviewPack?.assets || []).map((asset) => [asset.id, asset]));
  const rows = assets.map((asset) => exchangeAssetRow(asset, reviewRows.get(asset.id)));

  return {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    generator: 'kosmo-asset-exchange-profile',
    library_path: relative(root, libraryPath),
    library_id: library.library_id || null,
    status: 'local_review_exchange_profile',
    policy: {
      no_uploads: true,
      no_public_downloads: true,
      no_archicad_write: true,
      no_blender_write: true,
      exchange_profile_is_review_only: true
    },
    summary: {
      asset_count: rows.length,
      blender_profile_count: rows.filter((asset) => asset.blender).length,
      archicad_profile_count: rows.filter((asset) => asset.archicad).length,
      web_profile_count: rows.filter((asset) => asset.web).length,
      blocked_public_count: rows.filter((asset) => asset.public_gate === 'blocked').length,
      human_review_open_count: rows.filter((asset) => asset.human_review_status === 'open').length
    },
    assets: rows,
    next_actions: nextActions(rows)
  };
}

function exchangeAssetRow(asset, review) {
  const formats = Array.isArray(asset.formats) ? asset.formats : [];
  const profiles = generatedAssetProfiles(asset);
  const sourcePaths = sourcePathMap(formats);
  const slug = slugify(asset.id);
  const publicGate = review?.public_ready ? 'ready' : 'blocked';
  const humanReviewStatus = review?.human_review_status || (['reviewed', 'verified'].includes(asset.review_status) ? 'closed' : 'open');
  const blender = asset.export_targets?.includes('blender') || sourcePaths.glb || sourcePaths.material_json
    ? blenderProfile(asset, { profiles, sourcePaths, slug, humanReviewStatus })
    : null;
  const archicad = asset.export_targets?.includes('archicad') || sourcePaths.dxf || sourcePaths.material_json
    ? archicadProfile(asset, { profiles, sourcePaths, slug, humanReviewStatus })
    : null;
  const web = asset.export_targets?.includes('web')
    ? webProfile(asset, { sourcePaths, slug, publicGate })
    : null;

  return {
    id: asset.id,
    title: asset.title,
    asset_type: asset.asset_type,
    category: asset.category,
    rights_status: asset.rights_status,
    review_status: asset.review_status,
    human_review_status: humanReviewStatus,
    public_gate: publicGate,
    source_paths: sourcePaths,
    generated_profiles: profiles,
    blender,
    archicad,
    web,
    review_note: reviewNote({ publicGate, humanReviewStatus, blender, archicad })
  };
}

function blenderProfile(asset, { profiles, sourcePaths, slug, humanReviewStatus }) {
  const layers = unique(profiles.flatMap((profile) => profile.layer_names || []));
  const isMaterial = asset.asset_type.includes('material');
  return {
    enabled: true,
    approved_for_import: humanReviewStatus === 'closed',
    import_mode: isMaterial ? 'create_material_from_parameters' : sourcePaths.glb ? 'link_glb_as_collection' : 'metadata_only',
    collection_name: `KOSMO_ASSET/${asset.category}/${slug}`,
    object_prefix: `kosmo_${slug}`,
    material_name: isMaterial ? `KOSMO_MAT_${slug}` : null,
    source_file: sourcePaths.glb || sourcePaths.material_json || null,
    unit_scale: 1,
    layer_names: layers,
    notes: [
      'Review-only Blender handoff.',
      humanReviewStatus === 'closed' ? 'Human review closed; still requires explicit import approval.' : 'Human review still open; do not import into production scenes.'
    ]
  };
}

function archicadProfile(asset, { profiles, sourcePaths, slug, humanReviewStatus }) {
  const isMaterial = asset.asset_type.includes('material');
  const layerNames = unique(profiles.flatMap((profile) => profile.layer_names || []));
  return {
    enabled: true,
    approved_for_exchange: humanReviewStatus === 'closed',
    exchange_mode: isMaterial ? 'surface_attribute_reference' : sourcePaths.dxf ? 'dxf_underlay_or_symbol' : 'manual_reference',
    archicad_layer: isMaterial ? null : `KOSMO_${asset.category.toUpperCase()}_${slug.toUpperCase().replace(/-/g, '_')}`,
    archicad_surface: isMaterial ? `KOSMO_SURFACE_${slug.toUpperCase().replace(/-/g, '_')}` : null,
    source_file: sourcePaths.dxf || sourcePaths.material_json || sourcePaths.glb || null,
    layer_names: layerNames,
    notes: [
      'Review-only ArchiCAD exchange profile.',
      'No GSM/BIM object is generated in V1; this profile prepares manual exchange naming and layer/surface mapping.'
    ]
  };
}

function webProfile(asset, { sourcePaths, slug, publicGate }) {
  return {
    enabled: true,
    public_gate: publicGate,
    preview_component: asset.preview?.kind || 'asset_preview',
    route_key: `kosmo-assets/${slug}`,
    source_file: sourcePaths.svg || sourcePaths.glb || sourcePaths.material_json || null,
    notes: [
      publicGate === 'ready' ? 'Public web preview can be considered after final owner approval.' : 'Public web preview remains blocked; show metadata/review status only.'
    ]
  };
}

function sourcePathMap(formats) {
  const rows = {};
  for (const format of formats) {
    if (!format?.format || !format.path) continue;
    rows[format.format] = relative(root, resolve(libraryRoot, format.path));
  }
  return rows;
}

function generatedAssetProfiles(asset) {
  const primary = asset.generated_asset_profile || null;
  const rows = Array.isArray(asset.generated_asset_profiles) ? asset.generated_asset_profiles : [];
  return [primary, ...rows]
    .filter(Boolean)
    .filter((profile, index, list) => (
      list.findIndex((candidate) => candidate.generator === profile.generator && candidate.status === profile.status) === index
    ))
    .map((profile) => ({
      generator: profile.generator || null,
      status: profile.status || null,
      triangle_count: numberOrNull(profile.triangle_count),
      entity_count: numberOrNull(profile.entity_count),
      parameter_count: numberOrNull(profile.parameter_count),
      layer_names: Array.isArray(profile.layer_names) ? profile.layer_names : []
    }));
}

function reviewNote({ publicGate, humanReviewStatus, blender, archicad }) {
  if (humanReviewStatus === 'open') return 'Human review is still open; exchange profiles are naming proposals only.';
  if (publicGate === 'blocked') return 'Local workflow may continue, but public web/download gates remain blocked.';
  if (blender?.approved_for_import || archicad?.approved_for_exchange) return 'Exchange profile can move to manual import smoke test after explicit owner approval.';
  return 'Review exchange profile before any import or release.';
}

function nextActions(rows) {
  const actions = [];
  if (rows.some((asset) => asset.human_review_status === 'open')) actions.push('Close human review before importing assets into production Blender/ArchiCAD files.');
  if (rows.some((asset) => asset.blender && !asset.blender.approved_for_import)) actions.push('Run a local Blender smoke only with review assets, not production files.');
  if (rows.some((asset) => asset.archicad && !asset.archicad.approved_for_exchange)) actions.push('Keep ArchiCAD profiles as layer/surface naming references until reviewed.');
  if (rows.some((asset) => asset.public_gate === 'blocked')) actions.push('Keep public web/download gates blocked until rights and review are explicit.');
  if (!actions.length) actions.push('Exchange profile is ready for manual smoke tests.');
  return actions;
}

function renderMarkdown(profile) {
  const lines = [
    '# KosmoAsset Exchange Profile',
    '',
    `Library: \`${profile.library_id}\``,
    `Generated: ${profile.generated_at}`,
    `Status: \`${profile.status}\``,
    '',
    'Review-only. This profile prepares Blender, ArchiCAD and Web naming/mapping; it does not import, upload or publish assets.',
    '',
    '## Summary',
    '',
    `- assets: ${profile.summary.asset_count}`,
    `- Blender profiles: ${profile.summary.blender_profile_count}`,
    `- ArchiCAD profiles: ${profile.summary.archicad_profile_count}`,
    `- Web profiles: ${profile.summary.web_profile_count}`,
    `- public gates blocked: ${profile.summary.blocked_public_count}`,
    `- human reviews open: ${profile.summary.human_review_open_count}`,
    '',
    '## Assets',
    '',
    '| Asset | Blender | ArchiCAD | Web | Review note |',
    '| --- | --- | --- | --- | --- |'
  ];

  for (const asset of profile.assets) {
    lines.push(`| ${escapePipe(asset.title)} | ${escapePipe(asset.blender?.import_mode || '-')} | ${escapePipe(asset.archicad?.exchange_mode || '-')} | ${escapePipe(asset.web?.public_gate || '-')} | ${escapePipe(asset.review_note)} |`);
  }

  for (const asset of profile.assets) {
    lines.push('', `## ${asset.title}`, '');
    if (asset.blender) {
      lines.push('Blender:');
      lines.push(`- collection: \`${asset.blender.collection_name}\``);
      lines.push(`- import mode: \`${asset.blender.import_mode}\``);
      lines.push(`- source: \`${asset.blender.source_file || '-'}\``);
    }
    if (asset.archicad) {
      lines.push('', 'ArchiCAD:');
      lines.push(`- exchange mode: \`${asset.archicad.exchange_mode}\``);
      lines.push(`- layer: \`${asset.archicad.archicad_layer || '-'}\``);
      lines.push(`- surface: \`${asset.archicad.archicad_surface || '-'}\``);
      lines.push(`- source: \`${asset.archicad.source_file || '-'}\``);
    }
  }

  lines.push('', '## Next Actions', '');
  profile.next_actions.forEach((action) => lines.push(`- ${action}`));
  return `${lines.join('\n')}\n`;
}

function readJson(pathname) {
  return JSON.parse(readFileSync(pathname, 'utf8'));
}

function readOptionalJson(pathname) {
  if (!existsSync(pathname)) return null;
  return readJson(pathname);
}

function parseArgs(argv) {
  const parsed = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) continue;
    const key = token.slice(2);
    const next = argv[index + 1];
    if (next && !next.startsWith('--')) {
      parsed[key] = next;
      index += 1;
    } else {
      parsed[key] = true;
    }
  }
  return parsed;
}

function slugify(value) {
  return String(value || 'asset')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'asset';
}

function numberOrNull(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function escapePipe(value) {
  return String(value ?? '').replace(/\|/g, '\\|').replace(/\n/g, ' ');
}
