#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = new Date().toISOString().slice(0, 10);

const sourceQueuePath = resolve(root, args.sourceQueue || `data/kosmo-source-independent-work-queue-${dateStamp}.json`);
const laneSweepPath = resolve(root, args.laneSweep || `data/kosmodata-lane-sweep-${dateStamp}.json`);
const ownerCheckpointPath = resolve(root, args.ownerCheckpoint || `data/kosmo-owner-unlock-pipeline-checkpoint-${dateStamp}.json`);
const humanQueuePath = resolve(root, args.humanQueue || `data/kosmo-human-decision-queue-${dateStamp}.json`);
const referencesIntakePath = resolve(root, args.referencesIntake || 'examples/kosmo-references/review/kosmodraw-bundle-intake-review.generated.json');
const assetLibraryPath = resolve(root, args.assetLibrary || 'examples/kosmo-assets/kosmoreferences-pilot-seed-library-2026-06-13/library.json');
const assetPromotionPath = resolve(root, args.assetPromotion || 'examples/kosmo-assets/kosmoreferences-pilot-seed-library-2026-06-13/review/asset-promotion-guard.generated.json');
const publicStaticSmokePath = resolve(root, args.publicStaticSmoke || 'examples/kosmo-data/review/public-static-export-smoke.generated.json');
const outputJson = resolve(root, args.out || `data/kosmo-review-only-publication-fence-${dateStamp}.json`);
const outputMd = resolve(root, args.markdown || `docs/codex/kosmo-review-only-publication-fence-${dateStamp}.md`);

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const inputs = {
    sourceQueue: await readJson(sourceQueuePath),
    laneSweep: await readJson(laneSweepPath),
    ownerCheckpoint: await readJson(ownerCheckpointPath),
    humanQueue: await readJson(humanQueuePath),
    referencesIntake: await readJson(referencesIntakePath),
    assetLibrary: await readJson(assetLibraryPath),
    assetPromotion: await readJson(assetPromotionPath),
    publicStaticSmoke: await readJson(publicStaticSmokePath)
  };

  const checks = buildChecks(inputs);
  const failures = checks.filter((checkItem) => checkItem.status === 'failed');
  const warnings = checks.filter((checkItem) => checkItem.status === 'warning');
  const report = {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    status: failures.length === 0
      ? 'kosmo_review_only_publication_fence_passed'
      : 'kosmo_review_only_publication_fence_failed',
    policy: {
      validates_existing_reports_only: true,
      reads_private_content_now: false,
      runs_private_inventory_now: false,
      executes_local_workers_now: false,
      writes_public_files_now: false,
      uploads_assets_now: false,
      promotes_public_ready_now: false,
      public_ready_after_fence: 0
    },
    source_refs: [
      sourceQueuePath,
      laneSweepPath,
      ownerCheckpointPath,
      humanQueuePath,
      referencesIntakePath,
      assetLibraryPath,
      assetPromotionPath,
      publicStaticSmokePath
    ].map((filePath) => relative(root, filePath)),
    summary: {
      checks: checks.length,
      passed: checks.length - failures.length - warnings.length,
      warnings: warnings.length,
      failures: failures.length,
      source_independent_codex_executable_now: inputs.sourceQueue.summary?.codex_executable_now ?? null,
      owner_pending_items: inputs.humanQueue.summary?.open_items ?? null,
      references_public_ready_assets: inputs.laneSweep.summary?.references_public_ready_assets ?? null,
      asset_public_ready_count: inputs.laneSweep.summary?.asset_public_ready_count ?? null,
      public_static_routes_passed: inputs.publicStaticSmoke.summary?.passed_routes ?? null,
      public_ready_after_fence: 0
    },
    checks
  };

  await mkdir(dirname(outputJson), { recursive: true });
  await mkdir(dirname(outputMd), { recursive: true });
  await writeFile(outputJson, `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(outputMd, renderMarkdown(report));

  console.log('Kosmo review-only publication fence');
  console.log(`Status: ${report.status}`);
  console.log(`Checks: ${report.summary.passed}/${report.summary.checks}`);
  console.log(`Warnings: ${report.summary.warnings}`);
  console.log(`Failures: ${report.summary.failures}`);
  console.log(`Wrote: ${relative(root, outputMd)}`);

  if (failures.length > 0) process.exitCode = 1;
}

function buildChecks(inputs) {
  return [
    ...sourceQueueChecks(inputs.sourceQueue),
    ...laneSweepChecks(inputs.laneSweep),
    ...ownerCheckpointChecks(inputs.ownerCheckpoint),
    ...humanQueueChecks(inputs.humanQueue),
    ...referencesIntakeChecks(inputs.referencesIntake),
    ...assetFenceChecks(inputs.assetLibrary, inputs.assetPromotion),
    ...publicStaticSmokeChecks(inputs.publicStaticSmoke)
  ];
}

function sourceQueueChecks(queue) {
  return [
    check('source_queue_ready', queue.status === 'source_independent_work_queue_ready', queue.status),
    check('source_queue_reads_private_false', queue.policy?.reads_private_content === false, queue.policy?.reads_private_content),
    check('source_queue_copies_private_false', queue.policy?.copies_private_content === false, queue.policy?.copies_private_content),
    check('source_queue_private_inventory_false', queue.policy?.runs_private_inventory_now === false, queue.policy?.runs_private_inventory_now),
    check('source_queue_local_worker_false', queue.policy?.executes_local_worker_now === false, queue.policy?.executes_local_worker_now),
    check('source_queue_public_writes_false', queue.policy?.writes_public_files === false && queue.policy?.writes_public_manifest === false, queue.policy),
    check('source_queue_public_ready_zero', queue.summary?.public_ready_after_queue === 0 && queue.policy?.public_ready_after_queue === 0, queue.summary?.public_ready_after_queue),
    check('source_queue_no_codex_executable_tasks', queue.summary?.codex_executable_now === 0, queue.summary?.codex_executable_now)
  ];
}

function laneSweepChecks(sweep) {
  const summary = sweep.summary || {};
  return [
    check('lane_sweep_review_only_passed', sweep.status === 'kosmodata_lane_sweep_review_only_passed', sweep.status),
    check('lane_sweep_policy_review_only', sweep.policy?.review_only === true, sweep.policy?.review_only),
    check('lane_sweep_public_writes_blocked', sweep.policy?.public_writes_allowed === false, sweep.policy?.public_writes_allowed),
    check('lane_sweep_downloads_blocked', sweep.policy?.asset_public_downloads_allowed === false, sweep.policy?.asset_public_downloads_allowed),
    check('lane_sweep_references_public_ready_zero', summary.references_public_ready_assets === 0, summary.references_public_ready_assets),
    check('lane_sweep_assets_public_ready_zero', summary.asset_public_ready_count === 0, summary.asset_public_ready_count),
    check('lane_sweep_asset_promotion_blocked', summary.asset_promotion_allowed === false && Number(summary.asset_promotion_blockers) > 0, `${summary.asset_promotion_allowed}/${summary.asset_promotion_blockers}`),
    check('lane_sweep_local_worker_public_blocked', summary.local_worker_public_ready_allowed === false && summary.local_worker_high_risk_hits === 0, `${summary.local_worker_public_ready_allowed}/${summary.local_worker_high_risk_hits}`),
    check('lane_sweep_private_inventory_blocked', summary.private_source_inventory_plan_allowed === false, summary.private_source_inventory_plan_allowed),
    check('lane_sweep_source_root_diagnostic_blocked', summary.source_root_decision_session_private_diagnostic_allowed === false, summary.source_root_decision_session_private_diagnostic_allowed),
    check('lane_sweep_public_ready_after_briefs_zero', [
      summary.villa_brief_public_ready_after,
      summary.ingenbohl_brief_public_ready_after,
      summary.sogn_brief_public_ready_after,
      summary.source_root_selection_public_ready_after,
      summary.private_source_inventory_plan_public_ready_after
    ].every((value) => value === 0), {
      villa: summary.villa_brief_public_ready_after,
      ingenbohl: summary.ingenbohl_brief_public_ready_after,
      sogn: summary.sogn_brief_public_ready_after,
      source_root_selection: summary.source_root_selection_public_ready_after,
      private_inventory_plan: summary.private_source_inventory_plan_public_ready_after
    })
  ];
}

function ownerCheckpointChecks(checkpoint) {
  const summary = checkpoint.summary || {};
  return [
    check('owner_checkpoint_ready', checkpoint.status === 'owner_unlock_pipeline_checkpoint_ready', checkpoint.status),
    check('owner_checkpoint_no_decision_recording', checkpoint.policy?.records_decisions === false, checkpoint.policy?.records_decisions),
    check('owner_checkpoint_no_intake_write_now', checkpoint.policy?.writes_intake_file_now === false, checkpoint.policy?.writes_intake_file_now),
    check('owner_checkpoint_no_session_mutation_now', checkpoint.policy?.mutates_session_files_now === false, checkpoint.policy?.mutates_session_files_now),
    check('owner_checkpoint_no_private_reads_now', checkpoint.policy?.reads_private_content_now === false, checkpoint.policy?.reads_private_content_now),
    check('owner_checkpoint_no_private_inventory_now', checkpoint.policy?.runs_private_inventory_now === false, checkpoint.policy?.runs_private_inventory_now),
    check('owner_checkpoint_pending_owner', summary.owner_reply_state === 'pending', summary.owner_reply_state),
    check('owner_checkpoint_source_root_blocked', String(summary.source_root_state || '').includes('blocked'), summary.source_root_state),
    check('owner_checkpoint_public_ready_zero', summary.public_ready_after_checkpoint === 0 && checkpoint.policy?.public_ready_after_checkpoint === 0, summary.public_ready_after_checkpoint)
  ];
}

function humanQueueChecks(queue) {
  return [
    check('human_queue_open', queue.status === 'human_decision_queue_open', queue.status),
    check('human_queue_records_no_decisions', queue.policy?.records_decisions === false, queue.policy?.records_decisions),
    check('human_queue_public_writes_blocked', queue.policy?.public_writes_allowed === false, queue.policy?.public_writes_allowed),
    check('human_queue_public_ready_zero', queue.summary?.public_ready_after_queue === 0 && queue.policy?.public_ready_after_queue === 0, queue.summary?.public_ready_after_queue),
    check('human_queue_has_open_items', Number(queue.summary?.open_items) > 0, queue.summary?.open_items)
  ];
}

function referencesIntakeChecks(intake) {
  const bundles = intake.bundles || [];
  const publicDisplayCounts = bundles.map((bundle) => bundle.assets?.public_display_allowed_count ?? 0);
  const bundlePublicReady = bundles.map((bundle) => bundle.gates?.public_ready_after_intake ?? null);
  return [
    check('references_intake_ready', intake.status === 'kosmodraw_bundle_intake_review_ready', intake.status),
    check('references_intake_review_only', intake.policy?.review_only === true && intake.policy?.metadata_only === true, intake.policy),
    check('references_intake_public_writes_blocked', intake.policy?.writes_public_data_now === false && intake.policy?.writes_mock_entries_now === false, intake.policy),
    check('references_intake_public_ready_zero', intake.summary?.public_ready_after_intake === 0 && intake.policy?.public_ready_after_intake === 0, intake.summary?.public_ready_after_intake),
    check('references_intake_no_private_path_copy', intake.policy?.copies_private_paths_to_report === false, intake.policy?.copies_private_paths_to_report),
    check('references_intake_bundle_public_ready_zero', bundlePublicReady.every((value) => value === 0), bundlePublicReady),
    check('references_intake_public_display_zero', publicDisplayCounts.every((value) => value === 0), publicDisplayCounts),
    check('references_intake_no_failures', (intake.failures || []).length === 0 && intake.summary?.failure_count === 0, intake.summary?.failure_count)
  ];
}

function assetFenceChecks(library, promotion) {
  const assets = library.assets || [];
  const rows = promotion.rows || [];
  return [
    check('asset_library_draft', library.status === 'draft', library.status),
    check('asset_library_public_use_false', assets.length > 0 && assets.every((asset) => asset.public_use_allowed === false), assets.map((asset) => `${asset.id}:${asset.public_use_allowed}`).join(',')),
    check('asset_library_rights_need_review', assets.every((asset) => String(asset.rights_status || '').includes('needs_review') || String(asset.review_status || '').includes('needs_source')), assets.map((asset) => `${asset.id}:${asset.rights_status}/${asset.review_status}`).join(',')),
    check('asset_promotion_blocked', promotion.status === 'asset_promotion_guard_blocked', promotion.status),
    check('asset_promotion_no_uploads', promotion.policy?.no_uploads === true && promotion.policy?.no_r2_writes === true && promotion.policy?.no_d1_writes === true, promotion.policy),
    check('asset_promotion_not_promoting', promotion.policy?.promotion_guard_does_not_promote_assets === true, promotion.policy?.promotion_guard_does_not_promote_assets),
    check('asset_promotion_public_ready_zero', promotion.summary?.public_ready_count === 0, promotion.summary?.public_ready_count),
    check('asset_promotion_allowed_false', promotion.summary?.promotion_allowed === false && Number(promotion.summary?.blocker_count) > 0, `${promotion.summary?.promotion_allowed}/${promotion.summary?.blocker_count}`),
    check('asset_promotion_unsafe_zero', promotion.summary?.unsafe_finding_count === 0, promotion.summary?.unsafe_finding_count),
    check('asset_promotion_rows_public_false', rows.length > 0 && rows.every((row) => row.public_ready === false && row.public_use_allowed === false), rows.map((row) => `${row.asset_id}:${row.public_ready}/${row.public_use_allowed}`).join(','))
  ];
}

function publicStaticSmokeChecks(smoke) {
  return [
    check('public_static_export_smoke_passed', smoke.status === 'public_static_export_smoke_passed', smoke.status),
    check('public_static_export_routes_passed', smoke.summary?.route_count === smoke.summary?.passed_routes && smoke.summary?.failed_routes === 0, smoke.summary),
    check('public_static_export_checks_passed', smoke.summary?.failed_checks === 0, smoke.summary?.failed_checks)
  ];
}

function check(id, condition, evidence) {
  return {
    id,
    status: condition ? 'passed' : 'failed',
    evidence
  };
}

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

function renderMarkdown(report) {
  const lines = [];
  lines.push('# Kosmo Review-only Publication Fence');
  lines.push('');
  lines.push(`Generated: ${report.generated_at}`);
  lines.push(`Status: \`${report.status}\``);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Checks: ${report.summary.passed}/${report.summary.checks}`);
  lines.push(`- Warnings: ${report.summary.warnings}`);
  lines.push(`- Failures: ${report.summary.failures}`);
  lines.push(`- Codex executable now: ${report.summary.source_independent_codex_executable_now}`);
  lines.push(`- Owner pending items: ${report.summary.owner_pending_items}`);
  lines.push(`- References public-ready assets: ${report.summary.references_public_ready_assets}`);
  lines.push(`- Asset public-ready count: ${report.summary.asset_public_ready_count}`);
  lines.push(`- Public static routes passed: ${report.summary.public_static_routes_passed}`);
  lines.push(`- Public-ready after fence: ${report.summary.public_ready_after_fence}`);
  lines.push('');
  lines.push('## Policy');
  lines.push('');
  Object.entries(report.policy).forEach(([key, value]) => {
    lines.push(`- ${key}: ${String(value)}`);
  });
  lines.push('');
  lines.push('## Source Refs');
  lines.push('');
  report.source_refs.forEach((sourceRef) => {
    lines.push(`- \`${sourceRef}\``);
  });
  lines.push('');
  lines.push('## Checks');
  lines.push('');
  report.checks.forEach((checkItem) => {
    lines.push(`- ${checkItem.status}: \`${checkItem.id}\` - ${formatEvidence(checkItem.evidence)}`);
  });
  lines.push('');
  lines.push('## Hard Stops');
  lines.push('');
  lines.push('- Do not treat this fence as owner approval.');
  lines.push('- Do not run private inventory, OCR, embeddings, fine-tunes or local workers from this report.');
  lines.push('- Do not promote public-ready state from review-only or owner-pending reports.');
  lines.push('');
  return `${lines.join('\n')}\n`;
}

function formatEvidence(value) {
  if (value === undefined || value === null || value === '') return '-';
  if (typeof value === 'string') return value;
  return JSON.stringify(value);
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
