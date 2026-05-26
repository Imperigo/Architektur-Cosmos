#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const libraryPath = resolve(root, args.library || 'examples/kosmo-assets/kosmo-asset-demo/library.json');
const libraryRoot = dirname(libraryPath);
const outputJsonPath = resolve(libraryRoot, args.output || 'review/asset-review-pack.generated.json');
const outputMdPath = resolve(libraryRoot, args.markdown || 'review/asset-review-pack.generated.md');

const publicSafeRights = new Set(['licensed', 'public_domain', 'own_work']);
const reviewedStatuses = new Set(['reviewed', 'verified']);

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});

async function main() {
  if (!existsSync(libraryPath)) throw new Error(`KosmoAsset library not found: ${libraryPath}`);

  const library = readJson(libraryPath);
  const check = readOptionalJson(resolve(libraryRoot, 'review/asset-library-check.generated.json'));
  const exportPlan = readOptionalJson(resolve(libraryRoot, 'review/asset-export-plan.generated.json'));
  const reviewPack = buildReviewPack({ library, check, exportPlan });

  await Promise.all([mkdir(dirname(outputJsonPath), { recursive: true }), mkdir(dirname(outputMdPath), { recursive: true })]);
  await writeFile(outputJsonPath, `${JSON.stringify(reviewPack, null, 2)}\n`, 'utf8');
  await writeFile(outputMdPath, renderMarkdown(reviewPack), 'utf8');

  console.log('KosmoAsset review pack generated');
  console.log(`Library: ${relative(root, libraryPath)}`);
  console.log(`Assets: ${reviewPack.summary.asset_count}`);
  console.log(`Open human reviews: ${reviewPack.summary.open_human_review_count}`);
  console.log(`Blocked routes: ${reviewPack.summary.blocked_route_count}`);
  console.log(`Wrote: ${relative(root, outputMdPath)}`);
}

function buildReviewPack({ library, check, exportPlan }) {
  const assets = Array.isArray(library.assets) ? library.assets : [];
  const exportByAsset = new Map((exportPlan?.assets || []).map((asset) => [asset.id, asset]));
  const checkByAsset = new Map((check?.assets || []).map((asset) => [asset.id, asset]));
  const rows = assets.map((asset) => assetReviewRow({ asset, exportPlan: exportByAsset.get(asset.id), check: checkByAsset.get(asset.id) }));
  const routeRows = rows.flatMap((asset) => asset.routes);
  const summary = {
    asset_count: rows.length,
    local_ready_count: rows.filter((asset) => asset.local_ready).length,
    public_ready_count: rows.filter((asset) => asset.public_ready).length,
    open_human_review_count: rows.filter((asset) => asset.human_review_status === 'open').length,
    generated_profile_count: rows.reduce((sum, asset) => sum + asset.generated_profiles.length, 0),
    blocked_route_count: routeRows.filter((route) => route.status === 'blocked').length,
    needs_review_route_count: routeRows.filter((route) => route.status === 'needs_review').length,
    upload_allowed: Boolean(library.storage_policy?.uploads_allowed),
    public_assets_allowed: Boolean(library.storage_policy?.public_assets_allowed),
    recommended_next_step: rows.some((asset) => asset.human_review_status === 'open')
      ? 'complete_asset_human_review_before_promotion'
      : 'keep_review_pack_as_local_evidence'
  };

  return {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    generator: 'kosmo-asset-review-pack',
    library_path: relative(root, libraryPath),
    library_id: library.library_id || null,
    status: summary.open_human_review_count > 0 ? 'asset_human_review_required' : 'asset_review_pack_ready',
    rights_scope: library.rights_scope || 'unknown',
    policy: {
      no_uploads: true,
      no_public_publish: true,
      review_pack_does_not_promote_assets: true,
      public_use_requires_reviewed_status: true,
      public_use_requires_rights: [...publicSafeRights]
    },
    source_reports: {
      library_check: fileStatus(resolve(libraryRoot, 'review/asset-library-check.generated.json')),
      export_plan: fileStatus(resolve(libraryRoot, 'review/asset-export-plan.generated.json'))
    },
    summary,
    assets: rows,
    next_actions: nextActions({ rows, summary })
  };
}

function assetReviewRow({ asset, exportPlan, check }) {
  const routes = Array.isArray(exportPlan?.routes) ? exportPlan.routes.map((route) => ({
    target: route.target,
    status: route.status,
    blockers: Array.isArray(route.blockers) ? route.blockers : []
  })) : [];
  const generatedProfiles = generatedAssetProfiles(asset);
  const localFormats = (asset.formats || []).filter((format) => format.path && existsSync(resolve(libraryRoot, format.path)));
  const rightsPublicSafe = publicSafeRights.has(asset.rights_status);
  const publicReady = asset.public_use_allowed === true && rightsPublicSafe && reviewedStatuses.has(asset.review_status);
  const humanReviewStatus = reviewedStatuses.has(asset.review_status) ? 'closed' : 'open';
  const checklist = reviewChecklist({ asset, check, localFormats, routes, generatedProfiles, publicReady });

  return {
    id: asset.id,
    title: asset.title,
    asset_type: asset.asset_type,
    category: asset.category,
    rights_status: asset.rights_status,
    review_status: asset.review_status,
    human_review_status: humanReviewStatus,
    public_use_allowed: Boolean(asset.public_use_allowed),
    public_ready: publicReady,
    local_ready: Boolean(check?.local_ready ?? localFormats.length > 0),
    local_formats: localFormats.map((format) => ({ format: format.format, path: format.path })),
    export_targets: Array.isArray(asset.export_targets) ? asset.export_targets : [],
    routes,
    generated_profiles: generatedProfiles,
    checklist,
    suggested_decision: suggestedDecision({ asset, routes, publicReady })
  };
}

function reviewChecklist({ asset, check, localFormats, routes, generatedProfiles, publicReady }) {
  return [
    checkItem('source_basis', Array.isArray(asset.source_basis) && asset.source_basis.length > 0, 'Source basis is documented.'),
    checkItem('local_files', localFormats.length > 0, 'At least one local source/export file exists.'),
    checkItem('rights_gate', publicSafeRights.has(asset.rights_status) || asset.public_use_allowed !== true, 'Rights status does not allow unsafe public use.'),
    checkItem('public_gate', publicReady || asset.public_use_allowed !== true, 'Public use is blocked unless rights and review are ready.'),
    checkItem('review_status', reviewedStatuses.has(asset.review_status), 'Human review status is reviewed or verified.'),
    checkItem('export_routes', !routes.some((route) => route.status === 'blocked'), 'No export route is blocked.'),
    checkItem('generated_profile', generatedProfiles.length > 0 || asset.source_kind !== 'generated', 'Generated assets carry a generated profile.'),
    checkItem('library_check', check?.local_ready === true, 'Asset passed the library check row.')
  ];
}

function checkItem(id, passed, label) {
  return {
    id,
    status: passed ? 'passed' : 'needs_human_review',
    label
  };
}

function suggestedDecision({ asset, routes, publicReady }) {
  if (routes.some((route) => route.status === 'blocked')) return 'keep_blocked_until_export_routes_are_fixed';
  if (publicReady) return 'eligible_for_public_release_review';
  if (reviewedStatuses.has(asset.review_status)) return 'keep_reviewed_local_only';
  return 'complete_human_review_before_promotion';
}

function generatedAssetProfiles(asset) {
  const primary = asset.generated_asset_profile || null;
  const profiles = Array.isArray(asset.generated_asset_profiles) ? asset.generated_asset_profiles : [];
  return [primary, ...profiles]
    .filter(Boolean)
    .filter((profile, index, rows) => (
      rows.findIndex((candidate) => candidate.generator === profile.generator && candidate.status === profile.status) === index
    ))
    .map((profile) => ({
      generator: profile.generator || null,
      status: profile.status || null,
      generated_at: profile.generated_at || null,
      metric: profile.triangle_count ? `${profile.triangle_count} triangles` : profile.entity_count ? `${profile.entity_count} DXF entities` : null,
      layer_names: Array.isArray(profile.layer_names) ? profile.layer_names : []
    }));
}

function nextActions({ rows, summary }) {
  const actions = [];
  if (summary.blocked_route_count > 0) actions.push('Resolve blocked export routes before exposing asset export buttons.');
  if (rows.some((asset) => asset.human_review_status === 'open')) actions.push('Open local SVG/DXF/GLB/material files and record a human review decision before promotion.');
  if (rows.some((asset) => asset.rights_status === 'generated_needs_review')) actions.push('Confirm generated assets are not derived from protected project images, scans or third-party models.');
  if (summary.upload_allowed || summary.public_assets_allowed) actions.push('Disable uploads/public asset gates until explicit owner approval.');
  if (!actions.length) actions.push('Asset review pack is ready as local evidence.');
  return actions;
}

function renderMarkdown(pack) {
  const lines = [
    '# KosmoAsset Review Pack',
    '',
    `Library: \`${pack.library_id}\``,
    `Generated: ${pack.generated_at}`,
    `Status: \`${pack.status}\``,
    `Rights scope: \`${pack.rights_scope}\``,
    '',
    'Review-only. This pack does not upload, publish, promote or write public asset records.',
    '',
    '## Summary',
    '',
    `- assets: ${pack.summary.asset_count}`,
    `- local ready: ${pack.summary.local_ready_count}`,
    `- public ready: ${pack.summary.public_ready_count}`,
    `- open human reviews: ${pack.summary.open_human_review_count}`,
    `- generated profiles: ${pack.summary.generated_profile_count}`,
    `- blocked routes: ${pack.summary.blocked_route_count}`,
    `- needs-review routes: ${pack.summary.needs_review_route_count}`,
    `- recommended next step: \`${pack.summary.recommended_next_step}\``,
    '',
    '## Assets',
    '',
    '| Asset | Type | Rights | Review | Local formats | Routes | Suggested decision |',
    '| --- | --- | --- | --- | --- | --- | --- |'
  ];

  for (const asset of pack.assets) {
    lines.push(`| ${escapePipe(asset.title)} | ${escapePipe(asset.asset_type)} | ${escapePipe(asset.rights_status)} | ${escapePipe(asset.review_status)} | ${escapePipe(asset.local_formats.map((format) => format.format).join(', ') || '-')} | ${escapePipe(routeSummary(asset.routes))} | ${escapePipe(asset.suggested_decision)} |`);
  }

  for (const asset of pack.assets) {
    lines.push('', `## ${asset.title}`, '');
    lines.push(`- asset id: \`${asset.id}\``);
    lines.push(`- human review: \`${asset.human_review_status}\``);
    lines.push(`- public ready: ${asset.public_ready ? 'yes' : 'no'}`);
    lines.push(`- suggested decision: \`${asset.suggested_decision}\``);
    lines.push('', 'Checklist:');
    for (const item of asset.checklist) lines.push(`- ${item.status}: ${item.label}`);
    if (asset.generated_profiles.length) {
      lines.push('', 'Generated profiles:');
      for (const profile of asset.generated_profiles) {
        lines.push(`- ${profile.generator || 'unknown'}: ${profile.status || 'unknown'}${profile.metric ? ` (${profile.metric})` : ''}`);
      }
    }
  }

  lines.push('', '## Next Actions', '');
  pack.next_actions.forEach((action) => lines.push(`- ${action}`));

  return `${lines.join('\n')}\n`;
}

function routeSummary(routes) {
  if (!routes.length) return '-';
  return routes.map((route) => `${route.target}:${route.status}`).join(', ');
}

function fileStatus(pathname) {
  return {
    path: relative(root, pathname),
    exists: existsSync(pathname)
  };
}

function readJson(pathname) {
  return JSON.parse(readFileSync(pathname, 'utf8'));
}

function readOptionalJson(pathname) {
  if (!existsSync(pathname)) return null;
  return readJson(pathname);
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
