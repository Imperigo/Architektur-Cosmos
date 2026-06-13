#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const libraryPath = resolve(root, args.library || 'examples/kosmo-assets/kosmo-asset-demo/library.json');
const libraryRoot = dirname(libraryPath);
const outputJsonPath = resolve(libraryRoot, args.output || 'review/asset-export-plan.generated.json');
const outputMdPath = resolve(libraryRoot, args.markdown || 'review/asset-export-plan.generated.md');
const publicSafeRights = new Set(['licensed', 'public_domain', 'own_work']);

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});

async function main() {
  if (!existsSync(libraryPath)) throw new Error(`KosmoAsset library not found: ${libraryPath}`);

  const library = readJson(libraryPath);
  const plan = buildPlan(library);

  await Promise.all([mkdir(dirname(outputJsonPath), { recursive: true }), mkdir(dirname(outputMdPath), { recursive: true })]);
  await writeFile(outputJsonPath, `${JSON.stringify(plan, null, 2)}\n`, 'utf8');
  await writeFile(outputMdPath, renderMarkdown(plan), 'utf8');

  console.log('KosmoAsset export plan');
  console.log(`Library: ${relative(root, libraryPath)}`);
  console.log(`Assets: ${plan.summary.asset_count}`);
  console.log(`Ready routes: ${plan.summary.ready_route_count}`);
  console.log(`Blocked routes: ${plan.summary.blocked_route_count}`);
  console.log(`Wrote: ${relative(root, outputMdPath)}`);
}

function buildPlan(library) {
  const assets = Array.isArray(library.assets) ? library.assets : [];
  const assetPlans = assets.map((asset) => buildAssetPlan(asset));
  const routes = assetPlans.flatMap((asset) => asset.routes);

  return {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    generator: 'kosmo-asset-export-plan',
    library_path: relative(root, libraryPath),
    library_id: library.library_id || null,
    status: 'review_plan',
    policy: {
      no_uploads: true,
      no_public_downloads: true,
      export_plan_is_not_export_execution: true,
      public_routes_require_rights: [...publicSafeRights]
    },
    summary: {
      asset_count: assetPlans.length,
      ready_route_count: routes.filter((route) => route.status === 'ready').length,
      review_route_count: routes.filter((route) => route.status === 'needs_review').length,
      planned_route_count: routes.filter((route) => route.status === 'planned').length,
      blocked_route_count: routes.filter((route) => route.status === 'blocked').length,
      targets: countBy(routes.map((route) => route.target))
    },
    assets: assetPlans,
    next_actions: nextActions(assetPlans)
  };
}

function buildAssetPlan(asset) {
  const formatRows = (asset.formats || []).map((format) => normalizeFormat(format));
  const existingFormats = new Set(formatRows.filter((format) => format.exists).map((format) => format.format));
  const plannedFormats = new Set(formatRows.filter((format) => format.status === 'planned').map((format) => format.format));
  const targets = Array.isArray(asset.export_targets) ? asset.export_targets : [];
  const publicReady = asset.public_use_allowed === true && publicSafeRights.has(asset.rights_status);

  const routes = targets.map((target) => routeForTarget({ asset, target, existingFormats, plannedFormats, publicReady }));

  return {
    id: asset.id,
    title: asset.title,
    asset_type: asset.asset_type,
    category: asset.category,
    rights_status: asset.rights_status,
    review_status: asset.review_status,
    public_ready: publicReady,
    existing_formats: [...existingFormats],
    planned_formats: [...plannedFormats],
    preview_kind: asset.preview?.kind || null,
    routes,
    next_step: assetNextStep({ asset, routes, existingFormats, plannedFormats })
  };
}

function normalizeFormat(format) {
  const absolutePath = format.path ? resolve(libraryRoot, format.path) : null;
  const exists = absolutePath ? existsSync(absolutePath) : false;
  return {
    format: format.format || 'unknown',
    status: format.status || (exists ? 'exists' : 'planned'),
    path: format.path || null,
    planned_r2_key: format.planned_r2_key || null,
    exists
  };
}

function routeForTarget({ asset, target, existingFormats, plannedFormats, publicReady }) {
  const blockers = [];
  const needed = requiredFormatsForTarget(target, asset.asset_type);
  const hasRequired = needed.some((format) => existingFormats.has(format));
  const hasPlanned = needed.some((format) => plannedFormats.has(format));

  if (target === 'web' && !publicReady) blockers.push('Web/public route remains private because public_use_allowed or rights are not public-safe.');
  if (!hasRequired && hasPlanned) blockers.push(`Required format planned but not generated: ${needed.join(' or ')}`);
  if (!hasRequired && !hasPlanned) blockers.push(`Missing target format: ${needed.join(' or ')}`);
  if (asset.review_status === 'blocked') blockers.push('Asset review status is blocked.');

  let status = 'ready';
  if (blockers.some((blocker) => blocker.startsWith('Missing'))) status = 'blocked';
  else if (blockers.length > 0 && hasPlanned) status = 'planned';
  else if (blockers.length > 0) status = 'needs_review';
  else if (!['reviewed', 'verified'].includes(asset.review_status)) status = 'needs_review';

  return {
    target,
    status,
    required_formats: needed,
    blockers,
    note: routeNote(target, status)
  };
}

function requiredFormatsForTarget(target, assetType) {
  if (target === 'svg' || target === 'layout') return ['svg'];
  if (target === 'dxf') return ['dxf'];
  if (target === 'glb') return ['glb'];
  if (target === 'blender') return assetType === 'material' ? ['material_json', 'blend'] : ['glb', 'blend'];
  if (target === 'archicad') return assetType === 'material' ? ['material_json', 'gsm'] : ['dxf', 'gsm', 'ifc'];
  if (target === 'web') return assetType === 'material' ? ['material_json', 'webp', 'png'] : ['svg', 'glb', 'webp', 'png'];
  return ['json'];
}

function routeNote(target, status) {
  if (status === 'ready') return `${target} route has a local source format.`;
  if (status === 'needs_review') return `${target} route needs human review before use.`;
  if (status === 'planned') return `${target} route is planned but needs generation/export.`;
  return `${target} route is blocked until missing formats or rights are resolved.`;
}

function assetNextStep({ asset, routes, existingFormats, plannedFormats }) {
  if (!asset.preview) return 'Add preview metadata so the asset can be inspected in KosmoAsset.';
  if (routes.some((route) => route.status === 'blocked')) return 'Generate missing target formats or remove blocked export targets.';
  if (plannedFormats.size > 0) return `Generate planned formats: ${[...plannedFormats].join(', ')}.`;
  if (!['reviewed', 'verified'].includes(asset.review_status)) return 'Run human review and move review_status to reviewed or verified.';
  if (!asset.public_use_allowed) return 'Keep local-only or prepare a separate public-safe release decision.';
  if (existingFormats.size === 0) return 'Attach at least one local source file.';
  return 'Asset is ready for local workflow testing.';
}

function nextActions(assetPlans) {
  const actions = [];
  if (assetPlans.some((asset) => asset.routes.some((route) => route.status === 'blocked'))) actions.push('Resolve blocked routes before exposing export buttons in the UI.');
  if (assetPlans.some((asset) => asset.routes.some((route) => route.status === 'planned'))) actions.push('Generate planned DXF/GLB/GSM or material exports in local review mode.');
  if (assetPlans.some((asset) => asset.routes.some((route) => route.status === 'needs_review'))) actions.push('Review assets with local source files before promoting them to reusable workflow assets.');
  if (!actions.length) actions.push('All current asset routes are ready for local workflow testing.');
  return actions;
}

function countBy(values) {
  return values.reduce((acc, value) => {
    const key = value || 'unknown';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
}

function renderMarkdown(plan) {
  const lines = [
    '# KosmoAsset Export Plan',
    '',
    `Library: \`${plan.library_id}\``,
    `Generated: ${plan.generated_at}`,
    `Status: \`${plan.status}\``,
    '',
    'This is a local review-only export plan. It does not upload assets, write D1/R2 or create public downloads.',
    '',
    '## Summary',
    '',
    `- assets: ${plan.summary.asset_count}`,
    `- ready routes: ${plan.summary.ready_route_count}`,
    `- review routes: ${plan.summary.review_route_count}`,
    `- planned routes: ${plan.summary.planned_route_count}`,
    `- blocked routes: ${plan.summary.blocked_route_count}`,
    '',
    '## Asset Routes',
    '',
    '| Asset | Target | Status | Required formats | Blockers |',
    '| --- | --- | --- | --- | --- |'
  ];

  for (const asset of plan.assets) {
    for (const route of asset.routes) {
      lines.push(`| ${escapePipe(asset.title)} | ${escapePipe(route.target)} | ${escapePipe(route.status)} | ${escapePipe(route.required_formats.join(', '))} | ${escapePipe(route.blockers.join('; ') || '-')} |`);
    }
  }

  lines.push('', '## Next Actions', '');
  plan.next_actions.forEach((action) => lines.push(`- ${action}`));

  lines.push('', '## Per Asset', '');
  for (const asset of plan.assets) {
    lines.push(`### ${asset.title}`, '');
    lines.push(`- existing formats: ${asset.existing_formats.join(', ') || '-'}`);
    lines.push(`- planned formats: ${asset.planned_formats.join(', ') || '-'}`);
    lines.push(`- public ready: ${asset.public_ready ? 'yes' : 'no'}`);
    lines.push(`- next step: ${asset.next_step}`, '');
  }
  if (lines.at(-1) === '') lines.pop();

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
