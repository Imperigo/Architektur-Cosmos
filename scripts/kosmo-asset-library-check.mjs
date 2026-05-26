#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const libraryPath = resolve(root, args.library || 'examples/kosmo-assets/kosmo-asset-demo/library.json');
const libraryRoot = dirname(libraryPath);
const outputJsonPath = resolve(libraryRoot, args.output || 'review/asset-library-check.generated.json');
const outputMdPath = resolve(libraryRoot, args.markdown || 'review/asset-library-check.generated.md');

const allowedRights = new Set(['unknown', 'needs_permission', 'private_research', 'licensed', 'public_domain', 'own_work', 'generated_needs_review']);
const publicSafeRights = new Set(['licensed', 'public_domain', 'own_work']);
const allowedReviewStatus = new Set(['planned', 'draft', 'reviewed', 'verified', 'blocked', 'needs_source']);
const allowedFormats = new Set(['svg', 'dxf', 'glb', 'blend', 'gsm', 'ifc', 'webp', 'png', 'jpg', 'json', 'material_json']);
const allowedPreviewKinds = new Set(['axis_marker', 'material_swatch', 'wireframe_component']);

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});

async function main() {
  if (!existsSync(libraryPath)) {
    throw new Error(`KosmoAsset library not found: ${libraryPath}`);
  }

  const library = readJson(libraryPath);
  const report = buildReport(library);

  await Promise.all([mkdir(dirname(outputJsonPath), { recursive: true }), mkdir(dirname(outputMdPath), { recursive: true })]);
  await writeFile(outputJsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await writeFile(outputMdPath, renderMarkdown(report), 'utf8');

  console.log('KosmoAsset library check');
  console.log(`Library: ${relative(root, libraryPath)}`);
  console.log(`Status: ${report.status}`);
  console.log(`Assets: ${report.summary.asset_count}`);
  console.log(`Failures: ${report.summary.failure_count}`);
  console.log(`Warnings: ${report.summary.warning_count}`);
  console.log(`Wrote: ${relative(root, outputMdPath)}`);

  if (report.failures.length > 0) {
    process.exit(1);
  }
}

function buildReport(library) {
  const failures = [];
  const warnings = [];
  const assets = Array.isArray(library.assets) ? library.assets : [];

  checkTopLevel(library, failures, warnings);

  const seenIds = new Set();
  const rows = assets.map((asset, index) => checkAsset(asset, index, seenIds, failures, warnings));
  const publicReady = rows.filter((row) => row.public_use_allowed && row.rights_public_safe).length;
  const localReady = rows.filter((row) => row.local_ready).length;
  const plannedOnly = rows.filter((row) => row.planned_only).length;

  return {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    generator: 'kosmo-asset-library-check',
    library_path: relative(root, libraryPath),
    library_id: library.library_id || null,
    name: library.name || null,
    status: failures.length ? 'failed' : 'passed',
    mode: 'local_review_only',
    policy: {
      no_uploads: true,
      no_public_publish: true,
      public_assets_require_rights: [...publicSafeRights],
      generated_assets_need_review_before_public_use: true
    },
    summary: {
      asset_count: assets.length,
      local_ready_count: localReady,
      public_ready_count: publicReady,
      planned_only_count: plannedOnly,
      failure_count: failures.length,
      warning_count: warnings.length,
      formats: countBy(rows.flatMap((row) => row.formats)),
      asset_types: countBy(rows.map((row) => row.asset_type)),
      categories: countBy(rows.map((row) => row.category)),
      rights_status: countBy(rows.map((row) => row.rights_status))
    },
    assets: rows,
    failures,
    warnings,
    next_actions: nextActions({ failures, warnings, rows, library })
  };
}

function checkTopLevel(library, failures, warnings) {
  for (const field of ['schema_version', 'library_id', 'name', 'status', 'rights_scope', 'storage_policy', 'assets']) {
    if (library[field] === undefined || library[field] === null || library[field] === '') {
      failures.push(`Missing top-level field: ${field}`);
    }
  }
  if (library.schema_version !== '0.1') failures.push(`Unsupported schema_version: ${library.schema_version}`);
  if (!Array.isArray(library.assets)) failures.push('assets must be an array.');
  if (library.storage_policy?.uploads_allowed === true) failures.push('storage_policy.uploads_allowed must remain false in local review mode.');
  if (library.storage_policy?.public_assets_allowed === true && library.rights_scope !== 'public_candidate') {
    warnings.push('public_assets_allowed is true outside public_candidate scope.');
  }
}

function checkAsset(asset, index, seenIds, failures, warnings) {
  const prefix = `assets[${index}]`;
  for (const field of ['id', 'title', 'asset_type', 'category', 'source_kind', 'rights_status', 'public_use_allowed', 'review_status', 'formats', 'tags']) {
    if (asset[field] === undefined || asset[field] === null || asset[field] === '') failures.push(`${prefix} missing ${field}`);
  }

  if (asset.id) {
    if (seenIds.has(asset.id)) failures.push(`Duplicate asset id: ${asset.id}`);
    seenIds.add(asset.id);
  }
  if (!allowedRights.has(asset.rights_status)) failures.push(`${prefix} invalid rights_status: ${asset.rights_status}`);
  if (!allowedReviewStatus.has(asset.review_status)) failures.push(`${prefix} invalid review_status: ${asset.review_status}`);
  if (asset.public_use_allowed === true && !publicSafeRights.has(asset.rights_status)) {
    failures.push(`${asset.id || prefix} is marked public_use_allowed but rights_status is ${asset.rights_status}`);
  }
  if (asset.rights_status === 'private_research' && asset.local_only !== true) {
    warnings.push(`${asset.id || prefix} is private_research and should be local_only.`);
  }
  if (asset.source_kind === 'derived_from_entry' && !asset.source_entry_id) {
    warnings.push(`${asset.id || prefix} is derived_from_entry without source_entry_id.`);
  }
  if (!Array.isArray(asset.formats) || asset.formats.length === 0) {
    failures.push(`${asset.id || prefix} has no formats.`);
  }
  const preview = checkPreview(asset, prefix, failures, warnings);

  const formatRows = Array.isArray(asset.formats) ? asset.formats.map((format, formatIndex) => checkFormat(asset, format, formatIndex, failures, warnings)) : [];
  const existingFormats = formatRows.filter((row) => row.exists);
  const plannedFormats = formatRows.filter((row) => row.status === 'planned');

  return {
    id: asset.id || null,
    title: asset.title || null,
    asset_type: asset.asset_type || null,
    category: asset.category || null,
    rights_status: asset.rights_status || 'unknown',
    review_status: asset.review_status || 'planned',
    public_use_allowed: Boolean(asset.public_use_allowed),
    rights_public_safe: publicSafeRights.has(asset.rights_status),
    local_ready: existingFormats.length > 0 && asset.review_status !== 'blocked',
    planned_only: existingFormats.length === 0 && plannedFormats.length > 0,
    formats: formatRows.map((row) => row.format),
    preview_kind: preview?.kind || null,
    existing_format_count: existingFormats.length,
    planned_format_count: plannedFormats.length,
    export_targets: Array.isArray(asset.export_targets) ? asset.export_targets : [],
    tags: Array.isArray(asset.tags) ? asset.tags : []
  };
}

function checkPreview(asset, prefix, failures, warnings) {
  if (!asset.preview) {
    warnings.push(`${asset.id || prefix} has no preview metadata.`);
    return null;
  }
  if (!allowedPreviewKinds.has(asset.preview.kind)) failures.push(`${asset.id || prefix} has invalid preview kind: ${asset.preview.kind}`);
  if (!asset.preview.label) failures.push(`${asset.id || prefix} preview is missing label.`);
  if (asset.preview.kind === 'material_swatch' && (!Array.isArray(asset.preview.swatches) || asset.preview.swatches.length === 0)) {
    warnings.push(`${asset.id || prefix} material preview has no swatches.`);
  }
  return asset.preview;
}

function checkFormat(asset, format, formatIndex, failures, warnings) {
  const prefix = `${asset.id || 'asset'}.formats[${formatIndex}]`;
  if (!format?.format) failures.push(`${prefix} missing format.`);
  if (format?.format && !allowedFormats.has(format.format)) failures.push(`${prefix} invalid format: ${format.format}`);
  if (!format?.path && !format?.planned_r2_key) warnings.push(`${prefix} has neither path nor planned_r2_key.`);

  let exists = false;
  if (format?.path) {
    const absolutePath = resolve(libraryRoot, format.path);
    exists = existsSync(absolutePath);
    if (!exists && format.status === 'exists') failures.push(`${prefix} is marked exists but file is missing: ${format.path}`);
  }
  if (format?.planned_r2_key && !String(format.planned_r2_key).startsWith('assets/')) {
    warnings.push(`${prefix} planned_r2_key should start with assets/.`);
  }

  return {
    format: format?.format || 'unknown',
    path: format?.path || null,
    planned_r2_key: format?.planned_r2_key || null,
    status: format?.status || (exists ? 'exists' : 'planned'),
    exists
  };
}

function nextActions({ failures, warnings, rows, library }) {
  const actions = [];
  if (failures.length) actions.push('Fix asset library failures before using this library in KosmoAsset UI or export tools.');
  if (warnings.length) actions.push('Review warnings, especially private research, missing source entry links and planned export keys.');
  if (rows.some((row) => row.planned_only)) actions.push('Generate or attach reviewed local files for planned-only assets.');
  if (!rows.some((row) => row.export_targets.includes('blender'))) actions.push('Add at least one Blender-targeted asset before Blender asset bridge testing.');
  if (!rows.some((row) => row.export_targets.includes('archicad'))) actions.push('Add at least one ArchiCAD-targeted asset before ArchiCAD exchange testing.');
  if (library.storage_policy?.uploads_allowed !== false) actions.push('Keep uploads disabled until R2 cost/security gates are explicitly approved.');
  if (!actions.length) actions.push('Library is ready for local review UI prototyping.');
  return actions;
}

function countBy(values) {
  return values.reduce((acc, value) => {
    const key = value || 'unknown';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
}

function renderMarkdown(report) {
  const lines = [
    '# KosmoAsset Library Check',
    '',
    `Library: \`${report.library_id}\``,
    `Generated: ${report.generated_at}`,
    `Status: \`${report.status}\``,
    '',
    'This is a local review-only check. It does not upload assets, write D1/R2 or publish public downloads.',
    '',
    '## Summary',
    '',
    `- assets: ${report.summary.asset_count}`,
    `- local ready: ${report.summary.local_ready_count}`,
    `- public ready: ${report.summary.public_ready_count}`,
    `- planned only: ${report.summary.planned_only_count}`,
    `- failures: ${report.summary.failure_count}`,
    `- warnings: ${report.summary.warning_count}`,
    '',
    '## Assets',
    '',
    '| Asset | Type | Preview | Rights | Review | Formats | Local | Public |',
    '| --- | --- | --- | --- | --- | --- | --- | --- |'
  ];

  for (const asset of report.assets) {
    lines.push(`| ${escapePipe(asset.title)} | ${escapePipe(asset.asset_type)} | ${escapePipe(asset.preview_kind || '-')} | ${escapePipe(asset.rights_status)} | ${escapePipe(asset.review_status)} | ${escapePipe(asset.formats.join(', '))} | ${asset.local_ready ? 'yes' : 'no'} | ${asset.public_use_allowed ? 'yes' : 'no'} |`);
  }

  lines.push('', '## Failures', '');
  if (report.failures.length) report.failures.forEach((failure) => lines.push(`- ${failure}`));
  else lines.push('- None.');

  lines.push('', '## Warnings', '');
  if (report.warnings.length) report.warnings.forEach((warning) => lines.push(`- ${warning}`));
  else lines.push('- None.');

  lines.push('', '## Next Actions', '');
  report.next_actions.forEach((action) => lines.push(`- ${action}`));
  return `${lines.join('\n')}\n`;
}

function readJson(pathname) {
  return JSON.parse(readFileSync(pathname, 'utf8'));
}

function escapePipe(value) {
  return String(value ?? '').replace(/\|/g, '\\|').replace(/\n/g, ' ');
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
