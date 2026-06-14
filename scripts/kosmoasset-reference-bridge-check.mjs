#!/usr/bin/env node

import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = new Date().toISOString().slice(0, 10);

const registryPath = resolve(root, args.registry || 'data/kosmoreferences-registry.json');
const libraryPath = resolve(root, args.library || 'examples/kosmo-assets/kosmoreferences-pilot-seed-library-2026-06-13/library.json');
const libraryCheckPath = resolve(root, args.libraryCheck || 'examples/kosmo-assets/kosmoreferences-pilot-seed-library-2026-06-13/review/asset-library-check.generated.json');
const exportPlanPath = resolve(root, args.exportPlan || 'examples/kosmo-assets/kosmoreferences-pilot-seed-library-2026-06-13/review/asset-export-plan.generated.json');
const fullReviewPath = resolve(root, args.fullReview || 'examples/kosmo-assets/kosmoreferences-pilot-seed-library-2026-06-13/review/asset-full-review.generated.json');
const promotionGuardPath = resolve(root, args.promotionGuard || 'examples/kosmo-assets/kosmoreferences-pilot-seed-library-2026-06-13/review/asset-promotion-guard.generated.json');
const pilotPackagePath = resolve(root, args.pilotPackage || `data/kosmoreferences-pilot-package-check-${dateStamp}.json`);
const outputJson = resolve(root, args.out || `data/kosmoasset-reference-bridge-check-${dateStamp}.json`);
const outputMd = resolve(root, args.markdown || `docs/codex/kosmoasset-reference-bridge-check-${dateStamp}.md`);

const requiredPilots = [
  'villa-savoye',
  'kapelle-sogn-benedetg',
  'alterszentrum-kloster-ingenbohl'
];

const requiredAssetFamilies = new Map([
  ['villa-savoye', ['material', 'annotation']],
  ['kapelle-sogn-benedetg', ['material', 'opening']],
  ['alterszentrum-kloster-ingenbohl', ['material', 'structure']]
]);

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const registry = await readJson(registryPath);
  const library = await readJson(libraryPath);
  const libraryCheck = await readOptionalJson(libraryCheckPath);
  const exportPlan = await readOptionalJson(exportPlanPath);
  const fullReview = await readOptionalJson(fullReviewPath);
  const promotionGuard = await readOptionalJson(promotionGuardPath);
  const pilotPackage = await readOptionalJson(pilotPackagePath);
  const checks = [];
  const pilotRows = buildPilotRows({ registry, library, checks });

  checks.push(
    check('library_registered', registryHasLibrary(registry, library.library_id), 'Registry must include the KosmoReferences pilot seed library.'),
    check('library_check_passed', libraryCheck?.status === 'passed', 'Asset library check must pass.'),
    check('full_review_passed_steps', fullReview?.summary?.failed_steps === 0, 'Asset full review must have no failed steps.'),
    check('promotion_guard_blocked', promotionGuard?.summary?.promotion_allowed === false && promotionGuard?.status === 'asset_promotion_guard_blocked', 'Promotion guard must keep public promotion blocked.'),
    check('public_ready_zero', publicReadyCount({ libraryCheck, exportPlan, fullReview }) === 0, 'KosmoAsset public-ready count must remain 0.'),
    check('uploads_blocked', library.storage_policy?.uploads_allowed === false && library.storage_policy?.public_assets_allowed === false, 'Uploads and public assets must remain disabled.'),
    check('pilot_package_gate_complete', !pilotPackage || pilotPackage.status === 'pilot_packages_review_only_complete', 'Reference pilot package gate must be complete when present.')
  );

  const failures = checks.filter((item) => item.status === 'failed');
  const report = {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    status: failures.length === 0 ? 'kosmoasset_reference_bridge_review_only_passed' : 'kosmoasset_reference_bridge_needs_review',
    policy: {
      metadata_only: true,
      reads_private_content: false,
      copies_private_content: false,
      starts_generation: false,
      uploads_allowed: false,
      public_ready_after_bridge: 0,
      note: 'This bridge check validates repo-visible KosmoReferences-to-KosmoAsset metadata only. It does not generate assets, read private source roots, upload files or approve public use.'
    },
    source_refs: [
      relative(root, registryPath),
      relative(root, libraryPath),
      relative(root, libraryCheckPath),
      relative(root, exportPlanPath),
      relative(root, fullReviewPath),
      relative(root, promotionGuardPath),
      existsSync(pilotPackagePath) ? relative(root, pilotPackagePath) : null
    ].filter(Boolean),
    summary: {
      pilots: pilotRows.length,
      complete_pilot_bridges: pilotRows.filter((pilot) => pilot.status === 'pilot_asset_bridge_complete_review_only').length,
      asset_count: library.assets?.length || 0,
      public_ready_count: publicReadyCount({ libraryCheck, exportPlan, fullReview }),
      open_human_review_count: fullReview?.summary?.open_human_review_count ?? null,
      promotion_allowed: promotionGuard?.summary?.promotion_allowed === true,
      promotion_blockers: promotionGuard?.summary?.blocker_count ?? null,
      checks: checks.length,
      failures: failures.length,
      public_ready_after_bridge: 0
    },
    pilots: pilotRows,
    checks,
    failures,
    next_actions: failures.length === 0
      ? [
          'Use the bridge as the KosmoAsset Day-3 review-only acceptance gate.',
          'Keep all six asset candidates local/review-only until human review, source-root and rights gates pass.',
          'Only after owner/source-root changes, rerun the full day batch before adding new generated files.'
        ]
      : [
          'Fix failed bridge checks before claiming KosmoAsset pilot bridge readiness.',
          'Rerun npm run kosmo:asset-reference-bridge-check and npm run kosmo:day-batch-loop.'
        ]
  };

  await mkdir(dirname(outputJson), { recursive: true });
  await mkdir(dirname(outputMd), { recursive: true });
  await writeFile(outputJson, `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(outputMd, renderMarkdown(report));

  console.log('KosmoAsset reference bridge check');
  console.log(`Status: ${report.status}`);
  console.log(`Pilot bridges: ${report.summary.complete_pilot_bridges}/${report.summary.pilots}`);
  console.log(`Assets: ${report.summary.asset_count}`);
  console.log(`Failures: ${report.summary.failures}`);
  console.log(`Wrote: ${relative(root, outputMd)}`);

  if (failures.length > 0) process.exitCode = 1;
}

function buildPilotRows({ registry, library, checks }) {
  const entryDrafts = new Map((registry.entry_drafts || []).map((entry) => [entry.id, entry]));
  return requiredPilots.map((pilotId) => {
    const entry = entryDrafts.get(pilotId);
    const assets = (library.assets || []).filter((asset) => asset.source_entry_id === pilotId);
    const categories = [...new Set(assets.map((asset) => asset.category))].sort();
    const requiredFamilies = requiredAssetFamilies.get(pilotId) || [];
    const pilotChecks = [
      check(`pilot_entry_registered:${pilotId}`, Boolean(entry), 'Pilot must be present in KosmoReferences registry.'),
      check(`pilot_entry_public_ready_false:${pilotId}`, entry?.public_ready === false, 'Pilot registry entry must keep public_ready=false.'),
      check(`pilot_assets_minimum:${pilotId}`, assets.length >= 2, 'Pilot must have at least two seed asset candidates.'),
      check(`pilot_asset_families:${pilotId}`, requiredFamilies.every((family) => categories.includes(family)), `Pilot must include asset families: ${requiredFamilies.join(', ')}.`),
      check(`pilot_assets_local_only:${pilotId}`, assets.every((asset) => asset.local_only === true), 'Pilot assets must stay local_only=true.'),
      check(`pilot_assets_public_blocked:${pilotId}`, assets.every((asset) => asset.public_use_allowed === false), 'Pilot assets must keep public_use_allowed=false.'),
      check(`pilot_assets_review_rights:${pilotId}`, assets.every((asset) => asset.rights_status === 'generated_needs_review'), 'Pilot assets must keep generated_needs_review rights.'),
      check(`pilot_assets_source_basis_exists:${pilotId}`, assets.every((asset) => sourceBasisExists(asset)), 'Pilot asset source_basis paths must exist.'),
      check(`pilot_assets_kosmodata_refs:${pilotId}`, assets.every((asset) => Array.isArray(asset.kosmodata_refs) && asset.kosmodata_refs.some((ref) => ref.entry_id === pilotId)), 'Pilot assets must reference their source entry through kosmodata_refs.')
    ];
    checks.push(...pilotChecks);
    return {
      id: pilotId,
      title: entry?.title || pilotId,
      status: pilotChecks.every((item) => item.status === 'passed') ? 'pilot_asset_bridge_complete_review_only' : 'pilot_asset_bridge_needs_review',
      asset_count: assets.length,
      categories,
      asset_ids: assets.map((asset) => asset.id),
      export_targets: [...new Set(assets.flatMap((asset) => asset.export_targets || []))].sort(),
      review_statuses: countBy(assets.map((asset) => asset.review_status)),
      public_use_allowed: assets.filter((asset) => asset.public_use_allowed === true).length,
      checks: pilotChecks
    };
  });
}

function registryHasLibrary(registry, libraryId) {
  return (registry.asset_libraries || []).some((item) => item.id === libraryId);
}

function publicReadyCount({ libraryCheck, exportPlan, fullReview }) {
  return Math.max(
    Number(libraryCheck?.summary?.public_ready_count || 0),
    Number(exportPlan?.summary?.ready_route_count || 0),
    Number(fullReview?.summary?.public_ready_count || 0)
  );
}

function sourceBasisExists(asset) {
  return (asset.source_basis || []).every((path) => existsSync(resolve(root, path)));
}

function check(id, condition, message) {
  return {
    id,
    status: condition ? 'passed' : 'failed',
    message
  };
}

function countBy(values) {
  return values.reduce((acc, value) => {
    const key = value || 'unknown';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
}

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

async function readOptionalJson(path) {
  if (!existsSync(path)) return null;
  return readJson(path);
}

function renderMarkdown(report) {
  const lines = [];
  lines.push('# KosmoAsset Reference Bridge Check');
  lines.push('');
  lines.push(`Generated: ${report.generated_at}`);
  lines.push(`Status: \`${report.status}\``);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Pilot bridges: ${report.summary.complete_pilot_bridges}/${report.summary.pilots}`);
  lines.push(`- Assets: ${report.summary.asset_count}`);
  lines.push(`- Public-ready count: ${report.summary.public_ready_count}`);
  lines.push(`- Open human reviews: ${report.summary.open_human_review_count ?? '-'}`);
  lines.push(`- Promotion allowed: ${report.summary.promotion_allowed ? 'yes' : 'no'}`);
  lines.push(`- Promotion blockers: ${report.summary.promotion_blockers ?? '-'}`);
  lines.push(`- Checks/failures: ${report.summary.checks}/${report.summary.failures}`);
  lines.push(`- Public-ready after bridge: ${report.summary.public_ready_after_bridge}`);
  lines.push('');
  lines.push('## Pilot Bridges');
  lines.push('');
  lines.push('| Pilot | Status | Assets | Categories | Export targets | Review statuses |');
  lines.push('| --- | --- | ---: | --- | --- | --- |');
  report.pilots.forEach((pilot) => {
    lines.push(`| ${pilot.title} | ${pilot.status} | ${pilot.asset_count} | ${pilot.categories.join(', ')} | ${pilot.export_targets.join(', ')} | ${formatCounts(pilot.review_statuses)} |`);
  });
  if (report.failures.length > 0) {
    lines.push('');
    lines.push('## Failures');
    lines.push('');
    report.failures.forEach((failure) => lines.push(`- \`${failure.id}\`: ${failure.message}`));
  }
  lines.push('');
  lines.push('## Next Actions');
  lines.push('');
  report.next_actions.forEach((action) => lines.push(`- ${action}`));
  lines.push('');
  lines.push('## Safety');
  lines.push('');
  lines.push('This check is metadata-only. It does not approve public use, generate files, read private sources or upload assets.');
  lines.push('');
  return lines.join('\n');
}

function formatCounts(counts) {
  return Object.entries(counts).map(([key, value]) => `${key}:${value}`).join(', ') || '-';
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
