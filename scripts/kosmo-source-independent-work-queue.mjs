#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = new Date().toISOString().slice(0, 10);

const refs = {
  dataLaneSweep: resolve(root, args.dataLaneSweep || `data/kosmodata-lane-sweep-${dateStamp}.json`),
  nightLoop: resolve(root, args.nightLoop || `data/kosmo-night-loop-checkpoint-${dateStamp}.json`),
  localWorkerRunbook: resolve(root, args.localWorkerRunbook || `data/kosmo-local-worker-execution-runbook-${dateStamp}.json`),
  localWorkerOutputContractReview: resolve(root, args.localWorkerOutputContractReview || `data/kosmo-local-worker-output-contract-review-${dateStamp}.json`),
  localWorkerOutputContractReviewCheck: resolve(root, args.localWorkerOutputContractReviewCheck || `data/kosmo-local-worker-output-contract-review-check-${dateStamp}.json`),
  assetSourceMap: resolve(root, args.assetSourceMap || `data/kosmoasset-source-candidate-map-${dateStamp}.json`),
  assetCandidateTaxonomyReview: resolve(root, args.assetCandidateTaxonomyReview || `data/kosmoasset-candidate-taxonomy-review-${dateStamp}.json`),
  assetCandidateTaxonomyReviewCheck: resolve(root, args.assetCandidateTaxonomyReviewCheck || `data/kosmoasset-candidate-taxonomy-review-check-${dateStamp}.json`),
  pilotEvidence: resolve(root, args.pilotEvidence || `data/kosmoreferences-pilot-evidence-matrix-${dateStamp}.json`),
  pilotGapLabelReview: resolve(root, args.pilotGapLabelReview || `data/kosmoreferences-pilot-gap-label-review-${dateStamp}.json`),
  pilotGapLabelReviewCheck: resolve(root, args.pilotGapLabelReviewCheck || `data/kosmoreferences-pilot-gap-label-review-check-${dateStamp}.json`),
  choiceMatrix: resolve(root, args.choiceMatrix || `data/kosmo-source-root-owner-choice-consequence-matrix-${dateStamp}.json`),
  preparePhase1SourcePackageContractCheck: resolve(root, args.preparePhase1SourcePackageContractCheck || `data/kosmo-prepare-phase1-source-package-contract-check-${dateStamp}.json`),
  assetPreparePhase1FixtureContractCheck: resolve(root, args.assetPreparePhase1FixtureContractCheck || `data/kosmo-asset-prepare-phase1-fixture-contract-check-${dateStamp}.json`),
  localWorkerFixtureChainTaskPackCheck: resolve(root, args.localWorkerFixtureChainTaskPackCheck || `data/kosmo-local-worker-fixture-chain-task-pack-check-${dateStamp}.json`),
  orbitBridge: resolve(root, args.orbitBridge || `data/kosmo-orbit-status-bridge-${dateStamp}.json`)
};

const outputJson = resolve(root, args.out || `data/kosmo-source-independent-work-queue-${dateStamp}.json`);
const outputMd = resolve(root, args.markdown || `docs/codex/kosmo-source-independent-work-queue-${dateStamp}.md`);

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const reports = {
    dataLaneSweep: await readJson(refs.dataLaneSweep),
    nightLoop: await readJson(refs.nightLoop),
    localWorkerRunbook: await readJson(refs.localWorkerRunbook),
    localWorkerOutputContractReview: await readOptionalJson(refs.localWorkerOutputContractReview),
    localWorkerOutputContractReviewCheck: await readOptionalJson(refs.localWorkerOutputContractReviewCheck),
    assetSourceMap: await readJson(refs.assetSourceMap),
    assetCandidateTaxonomyReview: await readOptionalJson(refs.assetCandidateTaxonomyReview),
    assetCandidateTaxonomyReviewCheck: await readOptionalJson(refs.assetCandidateTaxonomyReviewCheck),
    pilotEvidence: await readJson(refs.pilotEvidence),
    pilotGapLabelReview: await readOptionalJson(refs.pilotGapLabelReview),
    pilotGapLabelReviewCheck: await readOptionalJson(refs.pilotGapLabelReviewCheck),
    choiceMatrix: await readJson(refs.choiceMatrix),
    preparePhase1SourcePackageContractCheck: await readOptionalJson(refs.preparePhase1SourcePackageContractCheck),
    assetPreparePhase1FixtureContractCheck: await readOptionalJson(refs.assetPreparePhase1FixtureContractCheck),
    localWorkerFixtureChainTaskPackCheck: await readOptionalJson(refs.localWorkerFixtureChainTaskPackCheck),
    orbitBridge: await readOptionalJson(refs.orbitBridge)
  };
  const queue = buildQueue(reports);

  await mkdir(dirname(outputJson), { recursive: true });
  await mkdir(dirname(outputMd), { recursive: true });
  await writeFile(outputJson, `${JSON.stringify(queue, null, 2)}\n`);
  await writeFile(outputMd, renderMarkdown(queue));

  console.log('Kosmo source-independent work queue');
  console.log(`Status: ${queue.status}`);
  console.log(`Tasks: ${queue.summary.tasks}`);
  console.log(`Completed review-only: ${queue.summary.completed_review_only}`);
  console.log(`Codex executable now: ${queue.summary.codex_executable_now}`);
  console.log(`Owner actions: ${queue.summary.owner_actions}`);
  console.log(`Blocked by private/source root: ${queue.summary.blocked_by_private_or_source_root}`);
  console.log(`Failures: ${queue.summary.failures}`);
  console.log(`Public-ready after queue: ${queue.summary.public_ready_after_queue}`);
  console.log(`Wrote: ${relative(root, outputMd)}`);

  if (queue.failures.length > 0) process.exitCode = 1;
}

function buildQueue({
  dataLaneSweep,
  nightLoop,
  localWorkerRunbook,
  localWorkerOutputContractReview,
  localWorkerOutputContractReviewCheck,
  assetSourceMap,
  assetCandidateTaxonomyReview,
  assetCandidateTaxonomyReviewCheck,
  pilotEvidence,
  pilotGapLabelReview,
  pilotGapLabelReviewCheck,
  choiceMatrix,
  preparePhase1SourcePackageContractCheck,
  assetPreparePhase1FixtureContractCheck,
  localWorkerFixtureChainTaskPackCheck,
  orbitBridge
}) {
  const failures = [];
  const sourceRootChoiceSatisfied = choiceMatrix.status === 'source_root_owner_choice_consequence_matrix_satisfied_metadata_only';
  const choiceMatrixAccepted = [
    'source_root_owner_choice_consequence_matrix_ready',
    'source_root_owner_choice_consequence_matrix_satisfied_metadata_only'
  ].includes(choiceMatrix.status);
  if (dataLaneSweep.status !== 'kosmodata_lane_sweep_review_only_passed') failures.push(`Data lane not passed: ${dataLaneSweep.status}`);
  if (nightLoop.status !== 'night_loop_guarded_ready') failures.push(`Night loop not guarded ready: ${nightLoop.status}`);
  if (localWorkerRunbook.status !== 'local_worker_execution_runbook_idle_review_only') failures.push(`Local worker runbook not idle review-only: ${localWorkerRunbook.status}`);
  if (assetSourceMap.status !== 'kosmoasset_source_candidate_map_review_only_ready') failures.push(`Asset source map not ready: ${assetSourceMap.status}`);
  if (pilotEvidence.status !== 'pilot_evidence_matrix_review_only') failures.push(`Pilot evidence matrix not review-only: ${pilotEvidence.status}`);
  if (!choiceMatrixAccepted) failures.push(`Choice matrix not ready: ${choiceMatrix.status}`);

  const assetTaxonomyDone = assetCandidateTaxonomyReview?.status === 'kosmoasset_candidate_taxonomy_review_ready' &&
    assetCandidateTaxonomyReviewCheck?.status === 'kosmoasset_candidate_taxonomy_review_guard_passed';
  const pilotGapLabelsDone = pilotGapLabelReview?.status === 'pilot_gap_label_review_ready' &&
    pilotGapLabelReviewCheck?.status === 'pilot_gap_label_review_guard_passed';
  const localWorkerContractDone = localWorkerOutputContractReview?.status === 'local_worker_output_contract_review_ready' &&
    localWorkerOutputContractReviewCheck?.status === 'local_worker_output_contract_review_guard_passed';
  const prepareSourcePackageDone = preparePhase1SourcePackageContractCheck?.status === 'prepare_phase1_source_package_contract_guard_passed';
  const assetPrepareFixtureDone = assetPreparePhase1FixtureContractCheck?.status === 'kosmoasset_prepare_phase1_fixture_contract_guard_passed';
  const localWorkerFixtureChainDone = localWorkerFixtureChainTaskPackCheck?.status === 'local_worker_fixture_chain_task_pack_guard_passed';
  const ownerReviewBatchesResolved = dataLaneSweep.summary?.owner_next_review_brief_status === 'owner_next_review_brief_clear' &&
    (dataLaneSweep.summary?.owner_next_review_brief_open_batches ?? dataLaneSweep.summary?.owner_batches_open ?? 0) === 0 &&
    dataLaneSweep.summary?.owner_review_batch_resolution_ledger_status === 'owner_review_batch_resolution_ledger_ready' &&
    dataLaneSweep.summary?.owner_review_batch_resolution_ledger_check_status === 'owner_review_batch_resolution_ledger_guard_passed' &&
    (dataLaneSweep.summary?.owner_review_batch_resolution_ledger_check_failures ?? 0) === 0;
  const ownerReviewOpenBatches = ownerReviewBatchesResolved
    ? 0
    : dataLaneSweep.summary?.owner_next_review_brief_open_batches ?? dataLaneSweep.summary?.owner_batches_open ?? 0;
  const ownerReviewOpenItems = ownerReviewBatchesResolved
    ? 0
    : dataLaneSweep.summary?.owner_next_review_brief_open_items ?? dataLaneSweep.summary?.owner_batches_open_items ?? 0;
  const orbitRefreshDone = ['orbit_bridge_ready_with_blockers', 'orbit_bridge_all_ready_review_only'].includes(orbitBridge?.status) &&
    (orbitBridge?.summary?.cards ?? 0) >= 30 &&
    (orbitBridge?.summary?.source_independent_work_queue_completed_review_only ?? 0) >= 3 &&
    (orbitBridge?.summary?.public_ready_after_bridge ?? 0) === 0;

  const tasks = [
    task({
      id: 'owner_source_root_choice',
      lane: 'owner_decision',
      actor: 'owner_or_overseer',
      action: sourceRootChoiceSatisfied
        ? 'Source-root choice is recorded; keep the metadata-only guard state visible for overseer review.'
        : 'Review final decision brief and consequence matrix; choose keep_blocked, repair_onedrive_first or exact-root metadata diagnostic.',
      executableNow: false,
      completed: sourceRootChoiceSatisfied,
      ownerAction: !sourceRootChoiceSatisfied,
      sourceIndependent: true,
      command: sourceRootChoiceSatisfied
        ? 'review docs/codex/kosmo-source-root-owner-choice-consequence-matrix-2026-06-16.md'
        : 'review docs/codex/kosmo-source-root-owner-choice-consequence-matrix-2026-06-14.md',
      evidence: sourceRootChoiceSatisfied
        ? `recorded ${choiceMatrix.summary?.selected_decision ?? 'n/a'} at ${choiceMatrix.summary?.selected_root_path ?? 'n/a'}`
        : `choices ${choiceMatrix.summary?.choices ?? 0}, unlock ${choiceMatrix.summary?.unlock_choices ?? 0}`
    }),
    task({
      id: 'codex_asset_candidate_taxonomy_review',
      lane: 'kosmoasset',
      actor: 'codex',
      action: 'Refine review-only taxonomy for current asset source candidates without reading private assets.',
      executableNow: !assetTaxonomyDone,
      completed: assetTaxonomyDone,
      ownerAction: false,
      sourceIndependent: true,
      command: 'npm run kosmo:asset-candidate-taxonomy-review && npm run kosmo:asset-candidate-taxonomy-review-check',
      evidence: assetTaxonomyDone
        ? `completed ${assetCandidateTaxonomyReview.summary?.candidate_reviews ?? 0} reviews, guard ${assetCandidateTaxonomyReviewCheck.summary?.passed ?? 0}/${assetCandidateTaxonomyReviewCheck.summary?.checks ?? 0}`
        : `asset candidates ${assetSourceMap.summary?.asset_lane_candidates ?? 0}, material ${assetSourceMap.summary?.material_library_candidates ?? 0}`
    }),
    task({
      id: 'codex_pilot_gap_label_review',
      lane: 'kosmoreferences',
      actor: 'codex',
      action: 'Review pilot evidence gap labels and keep private-dependent media/asset slots blocked.',
      executableNow: !pilotGapLabelsDone,
      completed: pilotGapLabelsDone,
      ownerAction: false,
      sourceIndependent: true,
      command: 'npm run kosmo:pilot-gap-label-review && npm run kosmo:pilot-gap-label-review-check',
      evidence: pilotGapLabelsDone
        ? `completed ${pilotGapLabelReview.summary?.gap_labels ?? 0} labels, guard ${pilotGapLabelReviewCheck.summary?.passed ?? 0}/${pilotGapLabelReviewCheck.summary?.checks ?? 0}`
        : `gaps ${pilotEvidence.summary?.total_gap_count ?? 0}, media blocked ${pilotEvidence.summary?.media_slots_blocked ?? 0}`
    }),
    task({
      id: 'codex_local_worker_output_contract_review',
      lane: 'local_worker',
      actor: 'codex',
      action: 'Review local worker runbook metadata and output-contract state without reading private output contents.',
      executableNow: !localWorkerContractDone,
      completed: localWorkerContractDone,
      ownerAction: false,
      sourceIndependent: true,
      command: 'npm run kosmo:local-worker-output-contract-review && npm run kosmo:local-worker-output-contract-review-check',
      evidence: localWorkerContractDone
        ? `completed ${localWorkerOutputContractReview.summary?.contracts ?? 0} contracts, guard ${localWorkerOutputContractReviewCheck.summary?.passed ?? 0}/${localWorkerOutputContractReviewCheck.summary?.checks ?? 0}`
        : `outputs ${localWorkerRunbook.summary?.outputs_present ?? 0}/${localWorkerRunbook.summary?.tasks_total ?? 0}, executable ${localWorkerRunbook.summary?.execute_allowed_if_output_missing ?? 0}`
    }),
    task({
      id: 'codex_prepare_phase1_source_package_contract',
      lane: 'kosmoprepare-kosmoreferences',
      actor: 'codex',
      action: 'Keep the synthetic KosmoPrepare source package contract checked and source-free.',
      executableNow: !prepareSourcePackageDone,
      completed: prepareSourcePackageDone,
      ownerAction: false,
      sourceIndependent: true,
      command: 'npm run kosmo:prepare-phase1-source-package-contract && npm run kosmo:prepare-phase1-source-package-contract-check',
      evidence: prepareSourcePackageDone
        ? `completed package ${preparePhase1SourcePackageContractCheck.summary?.package_id ?? 'n/a'}, failures ${preparePhase1SourcePackageContractCheck.summary?.failures ?? 0}`
        : 'synthetic source package contract missing or guard not passed'
    }),
    task({
      id: 'codex_asset_prepare_phase1_fixture_contract',
      lane: 'kosmoasset',
      actor: 'codex',
      action: 'Keep the synthetic KosmoAsset fixture library contract checked and public-ready blocked.',
      executableNow: !assetPrepareFixtureDone,
      completed: assetPrepareFixtureDone,
      ownerAction: false,
      sourceIndependent: true,
      command: 'npm run kosmo:asset-prepare-phase1-fixture-contract && npm run kosmo:asset-prepare-phase1-fixture-contract-check',
      evidence: assetPrepareFixtureDone
        ? `completed library ${assetPreparePhase1FixtureContractCheck.summary?.library_id ?? 'n/a'}, assets ${assetPreparePhase1FixtureContractCheck.summary?.assets ?? 0}, failures ${assetPreparePhase1FixtureContractCheck.summary?.failures ?? 0}`
        : 'synthetic asset fixture contract missing or guard not passed'
    }),
    task({
      id: 'codex_local_worker_fixture_chain_task_pack',
      lane: 'local_worker',
      actor: 'codex',
      action: 'Keep the fixture-only local worker task pack defined but not executable by default.',
      executableNow: !localWorkerFixtureChainDone,
      completed: localWorkerFixtureChainDone,
      ownerAction: false,
      sourceIndependent: true,
      command: 'npm run kosmo:local-worker-fixture-chain-task-pack && npm run kosmo:local-worker-fixture-chain-task-pack-check',
      evidence: localWorkerFixtureChainDone
        ? `completed ${localWorkerFixtureChainTaskPackCheck.summary?.tasks ?? 0} tasks, executable ${localWorkerFixtureChainTaskPackCheck.summary?.executable_now ?? 0}, failures ${localWorkerFixtureChainTaskPackCheck.summary?.failures ?? 0}`
        : 'fixture-chain local worker task pack missing or guard not passed'
    }),
    task({
      id: 'owner_open_review_batches',
      lane: 'owner_decision',
      actor: 'owner_or_overseer',
      action: ownerReviewBatchesResolved
        ? 'Owner review batches are triaged review-only in the resolution ledger; keep item-level approvals blocked.'
        : 'Resolve open owner review batches for references/assets from the existing answer sheet.',
      executableNow: false,
      completed: ownerReviewBatchesResolved,
      ownerAction: !ownerReviewBatchesResolved,
      sourceIndependent: true,
      command: ownerReviewBatchesResolved
        ? 'review docs/codex/kosmo-owner-review-batch-resolution-ledger-2026-06-16.md'
        : 'review docs/codex/kosmo-owner-review-packet-2026-06-14.md',
      evidence: ownerReviewBatchesResolved
        ? `resolved review-only ${dataLaneSweep.summary?.owner_review_batch_resolution_ledger_resolved_batches ?? 0} batches / ${dataLaneSweep.summary?.owner_review_batch_resolution_ledger_resolved_items ?? 0} items`
        : `open batches ${ownerReviewOpenBatches}, open items ${ownerReviewOpenItems}`
    }),
    task({
      id: 'codex_orbit_status_refresh',
      lane: 'orbit',
      actor: 'codex',
      action: 'Refresh Orbit status after source-independent queue changes and keep blockers visible.',
      executableNow: !orbitRefreshDone,
      completed: orbitRefreshDone,
      ownerAction: false,
      sourceIndependent: true,
      command: 'npm run kosmo:orbit-status-bridge',
      evidence: orbitRefreshDone
        ? `completed ${orbitBridge.summary?.cards ?? 0} cards, blockers ${orbitBridge.summary?.blocking_cards ?? 0}, owner ${orbitBridge.summary?.owner_action_cards ?? 0}`
        : `source root blocked ${nightLoop.summary?.source_root_blocked === true ? 'yes' : 'no'}, private inventory blocked ${nightLoop.summary?.private_inventory_blocked === true ? 'yes' : 'no'}`
    })
  ];

  if (tasks.some((item) => item.public_ready_after_task !== 0)) failures.push('Every source-independent task must keep public-ready at 0.');
  if (tasks.some((item) => item.reads_private_content || item.runs_private_inventory_now)) failures.push('Queue contains an unsafe private-content task.');

  return {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    status: failures.length === 0
      ? 'source_independent_work_queue_ready'
      : 'source_independent_work_queue_needs_review',
    policy: {
      queue_only: true,
      source_root_required: false,
      reads_private_content: false,
      copies_private_content: false,
      runs_private_inventory_now: false,
      executes_local_worker_now: false,
      writes_public_files: false,
      writes_public_manifest: false,
      public_ready_after_queue: 0,
      note: 'This queue identifies safe source-independent work. It does not execute local workers or read private output contents.'
    },
    source_refs: Object.values(refs).map((path) => relative(root, path)),
    summary: {
      data_lane_status: dataLaneSweep.status,
      night_loop_status: nightLoop.status,
      source_root_blocked: nightLoop.summary?.source_root_blocked === true,
      private_inventory_blocked: nightLoop.summary?.private_inventory_blocked === true,
      tasks: tasks.length,
      completed_review_only: tasks.filter((item) => item.status === 'completed_review_only').length,
      codex_executable_now: tasks.filter((item) => item.executable_now && item.actor === 'codex').length,
      owner_actions: tasks.filter((item) => item.owner_action_required).length,
      blocked_by_private_or_source_root: tasks.filter((item) => item.blocked_by_private_or_source_root).length,
      failures: failures.length,
      public_ready_after_queue: 0
    },
    tasks,
    hard_stops: [
      'Do not read private source contents.',
      'Do not read private local-worker output contents from this queue.',
      'Do not run private metadata inventory until source-root activation passes.',
      'Do not execute local workers from this queue.',
      'Do not set public-ready.'
    ],
    failures
  };
}

function task({ id, lane, actor, action, executableNow, completed = false, ownerAction, sourceIndependent, command, evidence }) {
  return {
    id,
    lane,
    actor,
    status: completed ? 'completed_review_only' : executableNow ? 'ready' : ownerAction ? 'owner_action_required' : 'waiting',
    action,
    command,
    evidence,
    executable_now: executableNow,
    owner_action_required: ownerAction,
    source_independent: sourceIndependent,
    blocked_by_private_or_source_root: false,
    reads_private_content: false,
    runs_private_inventory_now: false,
    executes_local_worker_now: false,
    public_ready_after_task: 0
  };
}

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

async function readOptionalJson(path) {
  try {
    return await readJson(path);
  } catch {
    return null;
  }
}

function renderMarkdown(queue) {
  const lines = [];
  lines.push('# Kosmo Source-Independent Work Queue');
  lines.push('');
  lines.push(`Generated: ${queue.generated_at}`);
  lines.push(`Status: \`${queue.status}\``);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Data lane: ${queue.summary.data_lane_status}`);
  lines.push(`- Night loop: ${queue.summary.night_loop_status}`);
  lines.push(`- Source-root blocked: ${queue.summary.source_root_blocked ? 'yes' : 'no'}`);
  lines.push(`- Private inventory blocked: ${queue.summary.private_inventory_blocked ? 'yes' : 'no'}`);
  lines.push(`- Tasks: ${queue.summary.tasks}`);
  lines.push(`- Completed review-only: ${queue.summary.completed_review_only}`);
  lines.push(`- Codex executable now: ${queue.summary.codex_executable_now}`);
  lines.push(`- Owner actions: ${queue.summary.owner_actions}`);
  lines.push(`- Blocked by private/source root: ${queue.summary.blocked_by_private_or_source_root}`);
  lines.push(`- Failures: ${queue.summary.failures}`);
  lines.push(`- Public-ready after queue: ${queue.summary.public_ready_after_queue}`);
  lines.push('');
  lines.push('## Tasks');
  lines.push('');
  lines.push('| Task | Lane | Actor | Status | Executable now | Owner action | Command | Evidence |');
  lines.push('| --- | --- | --- | --- | --- | --- | --- | --- |');
  queue.tasks.forEach((item) => {
    lines.push(`| \`${item.id}\` | ${item.lane} | ${item.actor} | ${item.status} | ${item.executable_now ? 'yes' : 'no'} | ${item.owner_action_required ? 'yes' : 'no'} | \`${escapePipe(item.command)}\` | ${escapePipe(item.evidence)} |`);
  });
  lines.push('');
  lines.push('## Hard Stops');
  lines.push('');
  queue.hard_stops.forEach((item) => lines.push(`- ${item}`));
  lines.push('');
  lines.push('## Failures');
  lines.push('');
  if (queue.failures.length > 0) queue.failures.forEach((failure) => lines.push(`- ${failure}`));
  else lines.push('- None.');
  lines.push('');
  return lines.join('\n');
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
