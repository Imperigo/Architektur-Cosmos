#!/usr/bin/env node

import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = new Date().toISOString().slice(0, 10);
const outputJson = resolve(root, args.out || `data/kosmo-day-batch-loop-${dateStamp}.json`);
const outputMd = resolve(root, args.markdown || `docs/codex/kosmo-day-batch-loop-${dateStamp}.md`);
const timeoutMs = Number(args.timeoutMs || 420000);
const sourceRootSession = resolve(root, `examples/kosmo-references/provenance/source-root-decision-session-${dateStamp}.json`);

const steps = [
  step('onedrive_sync_errors', 'OneDrive Sync Errors', ['run', 'kosmo:onedrive-sync-errors']),
  step('storage_mount_snapshot', 'Storage Mount Snapshot', ['run', 'kosmo:storage-mount-snapshot']),
  step('source_root_locator', 'Source Root Locator', ['run', 'kosmo:source-root-locator']),
  step('source_root_selection_brief', 'Source Root Selection Brief', ['run', 'kosmo:source-root-selection-brief']),
  conditionalStep(
    'source_root_decision_session_create',
    'Source Root Decision Session Create',
    ['run', 'kosmo:source-root-decision-session-create'],
    () => !existsSync(sourceRootSession),
    `Session already exists: ${relative(root, sourceRootSession)}`
  ),
  step('source_root_decision_session_refresh', 'Source Root Decision Session Refresh', ['run', 'kosmo:source-root-decision-session-refresh']),
  step('source_root_decision_session_check', 'Source Root Decision Session Check', ['run', 'kosmo:source-root-decision-session-check']),
  step('source_root_candidate_integrity_check', 'Source Root Candidate Integrity Check', ['run', 'kosmo:source-root-candidate-integrity-check']),
  step('private_library_diagnostic', 'Private Library Diagnostic Metadata', [
    'run',
    'kosmo:private-library-diagnostic',
    '--',
    '--out',
    `data/kosmoreferences-private-library-diagnostic-${dateStamp}.json`,
    '--markdown',
    `docs/codex/kosmoreferences-private-library-diagnostic-${dateStamp}.md`
  ]),
  step('source_root_blocker_refresh', 'Source Root Blocker Refresh', ['run', 'kosmo:source-root-blocker-refresh']),
  step('source_root_owner_action_card', 'Source Root Owner Action Card', ['run', 'kosmo:source-root-owner-action-card']),
  step('source_root_owner_decision_packet', 'Source Root Owner Decision Packet', ['run', 'kosmo:source-root-owner-decision-packet']),
  step('source_root_owner_decision_packet_check', 'Source Root Owner Decision Packet Check', ['run', 'kosmo:source-root-owner-decision-packet-check']),
  step('source_root_decision_dry_run', 'Source Root Decision Dry Run', ['run', 'kosmo:source-root-decision-dry-run']),
  step('source_root_post_owner_activation_queue', 'Source Root Post-Owner Activation Queue', ['run', 'kosmo:source-root-post-owner-activation-queue']),
  step('source_root_post_owner_activation_queue_check', 'Source Root Post-Owner Activation Queue Check', ['run', 'kosmo:source-root-post-owner-activation-queue-check']),
  step('source_root_owner_final_decision_brief', 'Source Root Owner Final Decision Brief', ['run', 'kosmo:source-root-owner-final-decision-brief']),
  step('source_root_owner_choice_consequence_matrix', 'Source Root Owner Choice Consequence Matrix', ['run', 'kosmo:source-root-owner-choice-consequence-matrix']),
  step('local_model_inventory', 'Local Model Inventory', ['run', 'kosmo:local-model-inventory']),
  step('bootstrap_data_lane_sweep', 'Bootstrap Data Lane Sweep', ['run', 'kosmo:data-lane-sweep'], { allowFailure: true }),
  step('bootstrap_router', 'Bootstrap Router', ['run', 'kosmo:data-lane-command-router']),
  step('core_data_lane_sweep', 'Core Data Lane Sweep', ['run', 'kosmo:data-lane-sweep']),
  step('pilot_evidence_matrix', 'Pilot Evidence Matrix', ['run', 'kosmo:pilot-evidence-matrix']),
  step('pilot_gap_label_review', 'Pilot Gap Label Review', ['run', 'kosmo:pilot-gap-label-review']),
  step('pilot_gap_label_review_check', 'Pilot Gap Label Review Check', ['run', 'kosmo:pilot-gap-label-review-check']),
  step('private_source_inventory_plan', 'Private Source Inventory Plan', ['run', 'kosmo:private-source-inventory-plan']),
  step('private_inventory_output_template', 'Private Inventory Output Template', ['run', 'kosmo:private-inventory-output-template']),
  step('private_inventory_output_check', 'Private Inventory Output Check', ['run', 'kosmo:private-inventory-output-check']),
  step('pilot_package_check', 'Pilot Package Check', ['run', 'kosmo:pilot-package-check']),
  step('asset_reference_bridge_check', 'Asset Reference Bridge Check', ['run', 'kosmo:asset-reference-bridge-check']),
  step('asset_source_candidate_map', 'Asset Source Candidate Map', ['run', 'kosmo:asset-source-candidate-map']),
  step('asset_candidate_taxonomy_review', 'Asset Candidate Taxonomy Review', ['run', 'kosmo:asset-candidate-taxonomy-review']),
  step('asset_candidate_taxonomy_review_check', 'Asset Candidate Taxonomy Review Check', ['run', 'kosmo:asset-candidate-taxonomy-review-check']),
  step('core_router', 'Core Router', ['run', 'kosmo:data-lane-command-router']),
  step('worker_boundary_pack', 'Worker Boundary Pack', ['run', 'kosmo:worker-boundary-pack']),
  step('worker_boundary_pack_check', 'Worker Boundary Pack Check', ['run', 'kosmo:worker-boundary-pack-check']),
  step('source_root_activation_preflight', 'Source Root Activation Preflight', ['run', 'kosmo:source-root-activation-preflight']),
  step('private_metadata_inventory', 'Private Metadata Inventory Runner', ['run', 'kosmo:private-metadata-inventory']),
  step('private_metadata_inventory_fixture_smoke', 'Private Metadata Inventory Fixture Smoke', ['run', 'kosmo:private-metadata-inventory-fixture-smoke']),
  step('private_metadata_inventory_check', 'Private Metadata Inventory Check', ['run', 'kosmo:private-metadata-inventory-check']),
  step('local_worker_task_pack_refresh', 'Local Worker Task Pack Refresh', ['run', 'kosmo:local-worker-task-pack-refresh']),
  step('local_worker_http_runner_smoke', 'Local Worker HTTP Runner Smoke', ['run', 'kosmo:local-worker-http-runner-smoke']),
  step('local_worker_http_runner_check', 'Local Worker HTTP Runner Check', ['run', 'kosmo:local-worker-http-runner-check']),
  step('local_worker_output_review', 'Local Worker Output Review', ['run', 'kosmo:local-worker-output-review']),
  step('local_worker_launch_queue', 'Local Worker Launch Queue', ['run', 'kosmo:local-worker-launch-queue']),
  step('local_worker_output_conversion_plan', 'Local Worker Output Conversion Plan', ['run', 'kosmo:local-worker-output-conversion-plan']),
  step('local_worker_execution_runbook', 'Local Worker Execution Runbook', ['run', 'kosmo:local-worker-execution-runbook']),
  step('local_worker_execution_runbook_check', 'Local Worker Execution Runbook Check', ['run', 'kosmo:local-worker-execution-runbook-check']),
  step('local_worker_output_contract_review', 'Local Worker Output Contract Review', ['run', 'kosmo:local-worker-output-contract-review']),
  step('local_worker_output_contract_review_check', 'Local Worker Output Contract Review Check', ['run', 'kosmo:local-worker-output-contract-review-check']),
  step('owner_review_packet', 'Owner Review Packet', ['run', 'kosmo:owner-review-packet']),
  step('owner_review_packet_check', 'Owner Review Packet Check', ['run', 'kosmo:owner-review-packet-check']),
  step('owner_review_session_brief', 'Owner Review Session Brief', ['run', 'kosmo:owner-review-session-brief']),
  step('owner_review_session_brief_check', 'Owner Review Session Brief Check', ['run', 'kosmo:owner-review-session-brief-check']),
  step('night_loop_checkpoint', 'Night Loop Checkpoint', ['run', 'kosmo:night-loop-checkpoint']),
  step('source_independent_work_queue', 'Source-Independent Work Queue', ['run', 'kosmo:source-independent-work-queue']),
  step('innovation_lane_plan', 'Innovation Lane Plan', ['run', 'kosmo:innovation-lane-plan']),
  step('innovation_smoke', 'Innovation Smoke', ['run', 'kosmo:innovation-smoke']),
  step('orbit_status_bridge', 'Orbit Status Bridge', ['run', 'kosmo:orbit-status-bridge'])
];

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const startedAt = Date.now();
  const results = [];
  for (const item of steps) {
    if (item.shouldRun && !item.shouldRun()) {
      results.push(skippedResult(item));
      continue;
    }
    results.push(await runStep(item));
    const last = results.at(-1);
    if (last.exit_code !== 0 && !item.allowFailure) break;
  }

  const report = await buildReport({ results, startedAt });
  await mkdir(dirname(outputJson), { recursive: true });
  await mkdir(dirname(outputMd), { recursive: true });
  await writeFile(outputJson, `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(outputMd, renderMarkdown(report));

  console.log('Kosmo day batch loop');
  console.log(`Status: ${report.status}`);
  console.log(`Required steps: ${report.summary.required_passed_steps}/${report.summary.required_steps}`);
  console.log(`Core sweep: ${report.summary.core_sweep_status}`);
  console.log(`Worker boundary: ${report.summary.worker_boundary_status}`);
  console.log(`Owner handoff: ${report.summary.owner_handoff_status}`);
  console.log(`Source-root activation: ${report.summary.source_root_activation_status}`);
  console.log(`Private metadata inventory: ${report.summary.private_metadata_inventory_status}`);
  console.log(`Private metadata inventory fixture: ${report.summary.private_metadata_inventory_fixture_status}`);
  console.log(`Private metadata inventory check: ${report.summary.private_metadata_inventory_check_status}`);
  console.log(`Local worker HTTP runner: ${report.summary.local_worker_http_runner_status}`);
  console.log(`Local worker HTTP runner check: ${report.summary.local_worker_http_runner_check_status}`);
  console.log(`Local worker execution runbook: ${report.summary.local_worker_execution_runbook_status}`);
  console.log(`Local worker execution runbook check: ${report.summary.local_worker_execution_runbook_check_status}`);
  console.log(`Innovation smoke: ${report.summary.innovation_smoke_status}`);
  console.log(`Orbit bridge: ${report.summary.orbit_bridge_status}`);
  console.log(`Source-root owner action: ${report.summary.source_root_owner_action_status}`);
  console.log(`Wrote: ${relative(root, outputMd)}`);

  if (report.status !== 'day_batch_loop_passed_review_only') process.exitCode = 1;
}

function step(id, label, npmArgs, options = {}) {
  return { id, label, command: 'npm', args: npmArgs, allowFailure: Boolean(options.allowFailure) };
}

function conditionalStep(id, label, npmArgs, shouldRun, skippedReason) {
  return { ...step(id, label, npmArgs), shouldRun, skippedReason };
}

async function runStep(item) {
  const startedAt = Date.now();
  const output = [];
  let timedOut = false;
  const exitCode = await new Promise((resolvePromise) => {
    const child = spawn(item.command, item.args, {
      cwd: root,
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe']
    });
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill('SIGTERM');
    }, timeoutMs);
    child.stdout.on('data', (chunk) => output.push(String(chunk)));
    child.stderr.on('data', (chunk) => output.push(String(chunk)));
    child.on('error', (error) => {
      clearTimeout(timer);
      output.push(error.message);
      resolvePromise(1);
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      resolvePromise(timedOut ? 124 : code ?? 1);
    });
  });

  return {
    id: item.id,
    label: item.label,
    command: [item.command, ...item.args].join(' '),
    required: !item.allowFailure,
    started_at: new Date(startedAt).toISOString(),
    duration_ms: Date.now() - startedAt,
    exit_code: exitCode,
    status: exitCode === 0 ? 'passed' : timedOut ? 'timed_out' : item.allowFailure ? 'allowed_failure' : 'failed',
    output_excerpt: excerpt(output.join(''))
  };
}

function skippedResult(item) {
  return {
    id: item.id,
    label: item.label,
    command: [item.command, ...item.args].join(' '),
    required: false,
    started_at: new Date().toISOString(),
    duration_ms: 0,
    exit_code: 0,
    status: 'skipped',
    output_excerpt: item.skippedReason
  };
}

async function buildReport({ results, startedAt }) {
  const required = results.filter((result) => result.required !== false);
  const requiredFailures = required.filter((result) => result.exit_code !== 0);
  const sweep = await readOptionalJson(`data/kosmodata-lane-sweep-${dateStamp}.json`);
  const router = await readOptionalJson(`data/kosmo-data-lane-command-router-${dateStamp}.json`);
  const boundary = await readOptionalJson(`data/kosmo-worker-boundary-pack-check-${dateStamp}.json`);
  const ownerPacket = await readOptionalJson(`data/kosmo-owner-review-packet-check-${dateStamp}.json`);
  const ownerSession = await readOptionalJson(`data/kosmo-owner-review-session-brief-check-${dateStamp}.json`);
  const blocker = await readOptionalJson(`data/kosmo-source-root-blocker-refresh-${dateStamp}.json`);
  const decisionSessionRefresh = await readOptionalJson(`data/kosmo-source-root-decision-session-refresh-${dateStamp}.json`);
  const candidateIntegrity = await readOptionalJson(`data/kosmo-source-root-candidate-integrity-check-${dateStamp}.json`);
  const sourceRootOwnerAction = await readOptionalJson(`data/kosmo-source-root-owner-action-card-${dateStamp}.json`);
  const sourceRootOwnerDecisionPacket = await readOptionalJson(`data/kosmo-source-root-owner-decision-packet-${dateStamp}.json`);
  const sourceRootOwnerDecisionPacketCheck = await readOptionalJson(`data/kosmo-source-root-owner-decision-packet-check-${dateStamp}.json`);
  const sourceRootDecisionDryRun = await readOptionalJson(`data/kosmo-source-root-decision-dry-run-${dateStamp}.json`);
  const sourceRootPostOwnerActivationQueue = await readOptionalJson(`data/kosmo-source-root-post-owner-activation-queue-${dateStamp}.json`);
  const sourceRootPostOwnerActivationQueueCheck = await readOptionalJson(`data/kosmo-source-root-post-owner-activation-queue-check-${dateStamp}.json`);
  const sourceRootOwnerFinalDecisionBrief = await readOptionalJson(`data/kosmo-source-root-owner-final-decision-brief-${dateStamp}.json`);
  const sourceRootOwnerChoiceConsequenceMatrix = await readOptionalJson(`data/kosmo-source-root-owner-choice-consequence-matrix-${dateStamp}.json`);
  const pilotGapLabelReview = await readOptionalJson(`data/kosmoreferences-pilot-gap-label-review-${dateStamp}.json`);
  const pilotGapLabelReviewCheck = await readOptionalJson(`data/kosmoreferences-pilot-gap-label-review-check-${dateStamp}.json`);
  const assetSourceCandidateMap = await readOptionalJson(`data/kosmoasset-source-candidate-map-${dateStamp}.json`);
  const assetCandidateTaxonomyReview = await readOptionalJson(`data/kosmoasset-candidate-taxonomy-review-${dateStamp}.json`);
  const assetCandidateTaxonomyReviewCheck = await readOptionalJson(`data/kosmoasset-candidate-taxonomy-review-check-${dateStamp}.json`);
  const sourceRootActivation = await readOptionalJson(`data/kosmo-source-root-activation-preflight-${dateStamp}.json`);
  const privateMetadataInventory = await readOptionalJson(`data/kosmo-private-metadata-inventory-runner-${dateStamp}.json`);
  const privateMetadataInventoryFixture = await readOptionalJson(`data/kosmo-private-metadata-inventory-fixture-smoke-${dateStamp}.json`);
  const privateMetadataInventoryCheck = await readOptionalJson(`data/kosmo-private-metadata-inventory-check-${dateStamp}.json`);
  const localWorkerHttpRunner = await readOptionalJson(`data/kosmo-local-worker-http-runner-${dateStamp}.json`);
  const localWorkerHttpRunnerCheck = await readOptionalJson(`data/kosmo-local-worker-http-runner-check-${dateStamp}.json`);
  const localWorkerExecutionRunbook = await readOptionalJson(`data/kosmo-local-worker-execution-runbook-${dateStamp}.json`);
  const localWorkerExecutionRunbookCheck = await readOptionalJson(`data/kosmo-local-worker-execution-runbook-check-${dateStamp}.json`);
  const localWorkerOutputContractReview = await readOptionalJson(`data/kosmo-local-worker-output-contract-review-${dateStamp}.json`);
  const localWorkerOutputContractReviewCheck = await readOptionalJson(`data/kosmo-local-worker-output-contract-review-check-${dateStamp}.json`);
  const checkpoint = await readOptionalJson(`data/kosmo-night-loop-checkpoint-${dateStamp}.json`);
  const sourceIndependentWorkQueue = await readOptionalJson(`data/kosmo-source-independent-work-queue-${dateStamp}.json`);
  const innovationSmoke = await readOptionalJson(`data/kosmo-innovation-smoke-${dateStamp}.json`);
  const orbitBridge = await readOptionalJson(`data/kosmo-orbit-status-bridge-${dateStamp}.json`);
  const ownerHandoffPassed = ownerPacket?.status === 'owner_review_packet_guard_passed' &&
    ownerSession?.status === 'owner_review_session_brief_guard_passed';
  const invariants = [
    invariant('required_steps_passed', requiredFailures.length === 0, `${required.length - requiredFailures.length}/${required.length}`),
    invariant('core_sweep_review_only', sweep?.status === 'kosmodata_lane_sweep_review_only_passed', sweep?.status),
    invariant('router_guarded_review_only', router?.status === 'worker_router_guarded_review_only', router?.status),
    invariant('worker_boundary_passed', boundary?.status === 'worker_boundary_pack_guard_passed', boundary?.status),
    invariant('source_root_decision_session_refresh_safe', [
      'source_root_decision_session_refreshed_pending',
      'source_root_decision_session_refresh_not_needed'
    ].includes(decisionSessionRefresh?.status), decisionSessionRefresh?.status),
    invariant('source_root_candidate_integrity_ready', candidateIntegrity?.status === 'source_root_candidate_integrity_owner_review_ready', candidateIntegrity?.status),
    invariant('source_root_owner_action_card_ready', [
      'source_root_owner_action_required',
      'source_root_owner_action_satisfied_metadata_only'
    ].includes(sourceRootOwnerAction?.status), sourceRootOwnerAction?.status),
    invariant('source_root_owner_decision_packet_ready', sourceRootOwnerDecisionPacket?.status === 'source_root_owner_decision_packet_ready', sourceRootOwnerDecisionPacket?.status),
    invariant('source_root_owner_decision_packet_guard_passed', sourceRootOwnerDecisionPacketCheck?.status === 'source_root_owner_decision_packet_guard_passed', sourceRootOwnerDecisionPacketCheck?.status),
    invariant('source_root_decision_dry_run_ready', sourceRootDecisionDryRun?.status === 'source_root_decision_dry_run_ready', sourceRootDecisionDryRun?.status),
    invariant('source_root_post_owner_activation_queue_ready', sourceRootPostOwnerActivationQueue?.status === 'source_root_post_owner_activation_queue_ready', sourceRootPostOwnerActivationQueue?.status),
    invariant('source_root_post_owner_activation_queue_guard_passed', sourceRootPostOwnerActivationQueueCheck?.status === 'source_root_post_owner_activation_queue_guard_passed', sourceRootPostOwnerActivationQueueCheck?.status),
    invariant('source_root_owner_final_decision_brief_ready', sourceRootOwnerFinalDecisionBrief?.status === 'source_root_owner_final_decision_brief_ready', sourceRootOwnerFinalDecisionBrief?.status),
    invariant('source_root_owner_choice_consequence_matrix_ready', sourceRootOwnerChoiceConsequenceMatrix?.status === 'source_root_owner_choice_consequence_matrix_ready', sourceRootOwnerChoiceConsequenceMatrix?.status),
    invariant('pilot_gap_label_review_ready', pilotGapLabelReview?.status === 'pilot_gap_label_review_ready', pilotGapLabelReview?.status),
    invariant('pilot_gap_label_review_guard_passed', pilotGapLabelReviewCheck?.status === 'pilot_gap_label_review_guard_passed', pilotGapLabelReviewCheck?.status),
    invariant('asset_source_candidate_map_ready', assetSourceCandidateMap?.status === 'kosmoasset_source_candidate_map_review_only_ready', assetSourceCandidateMap?.status),
    invariant('asset_candidate_taxonomy_review_ready', assetCandidateTaxonomyReview?.status === 'kosmoasset_candidate_taxonomy_review_ready', assetCandidateTaxonomyReview?.status),
    invariant('asset_candidate_taxonomy_review_guard_passed', assetCandidateTaxonomyReviewCheck?.status === 'kosmoasset_candidate_taxonomy_review_guard_passed', assetCandidateTaxonomyReviewCheck?.status),
    invariant('owner_handoff_passed', ownerHandoffPassed, `${ownerPacket?.status || 'missing'} / ${ownerSession?.status || 'missing'}`),
    invariant('innovation_smoke_review_only', innovationSmoke?.status === 'innovation_smoke_passed_review_only', innovationSmoke?.status),
    invariant('orbit_bridge_ready', ['orbit_bridge_ready_with_blockers', 'orbit_bridge_all_ready_review_only'].includes(orbitBridge?.status), orbitBridge?.status),
    invariant('source_root_activation_guarded', [
      'source_root_activation_waiting_for_owner_storage_action',
      'source_root_activation_needs_contract_review',
      'source_root_activation_ready_for_private_metadata_diagnostic'
    ].includes(sourceRootActivation?.status), sourceRootActivation?.status),
    invariant('private_metadata_inventory_guarded', [
      'private_metadata_inventory_blocked_until_activation',
      'private_metadata_inventory_ready_private_output_written',
      'private_metadata_inventory_fixture_passed'
    ].includes(privateMetadataInventory?.status), privateMetadataInventory?.status),
    invariant(
      'private_metadata_inventory_fixture_smoke_passed',
      privateMetadataInventoryFixture?.status === 'private_metadata_inventory_fixture_passed' &&
        (privateMetadataInventoryFixture?.summary?.total_candidate_matches ?? 0) >= 3,
      `${privateMetadataInventoryFixture?.status}, matches=${privateMetadataInventoryFixture?.summary?.total_candidate_matches ?? 'missing'}`
    ),
    invariant('private_metadata_inventory_guard_passed', privateMetadataInventoryCheck?.status === 'private_metadata_inventory_guard_passed', privateMetadataInventoryCheck?.status),
    invariant(
      'local_worker_http_runner_guarded',
      ['local_worker_http_runner_dry_run_ready', 'local_worker_http_runner_executed_review_only'].includes(localWorkerHttpRunner?.status) &&
        localWorkerHttpRunner?.guard?.passed === true &&
        (localWorkerHttpRunner?.policy?.public_ready_after_runner ?? 0) === 0,
      `${localWorkerHttpRunner?.status || 'missing'}, guard=${localWorkerHttpRunner?.guard?.passed ?? 'missing'}`
    ),
    invariant('local_worker_http_runner_check_passed', localWorkerHttpRunnerCheck?.status === 'local_worker_http_runner_guard_passed', localWorkerHttpRunnerCheck?.status),
    invariant(
      'local_worker_execution_runbook_guarded',
      ['local_worker_execution_runbook_idle_review_only', 'local_worker_execution_runbook_has_executable_tasks'].includes(localWorkerExecutionRunbook?.status) &&
        (localWorkerExecutionRunbook?.policy?.public_ready_after_runbook ?? 0) === 0,
      localWorkerExecutionRunbook?.status
    ),
    invariant('local_worker_execution_runbook_check_passed', localWorkerExecutionRunbookCheck?.status === 'local_worker_execution_runbook_guard_passed', localWorkerExecutionRunbookCheck?.status),
    invariant('local_worker_output_contract_review_ready', localWorkerOutputContractReview?.status === 'local_worker_output_contract_review_ready', localWorkerOutputContractReview?.status),
    invariant('local_worker_output_contract_review_guard_passed', localWorkerOutputContractReviewCheck?.status === 'local_worker_output_contract_review_guard_passed', localWorkerOutputContractReviewCheck?.status),
    invariant('source_independent_work_queue_ready', sourceIndependentWorkQueue?.status === 'source_independent_work_queue_ready', sourceIndependentWorkQueue?.status),
    invariant('public_ready_zero', (sweep?.summary?.references_public_ready_assets ?? 0) === 0, `public_ready=${sweep?.summary?.references_public_ready_assets ?? 0}`),
    invariant(
      'private_source_guard_state_valid',
      blocker?.summary?.private_diagnostic_allowed !== true ||
        sourceRootActivation?.status === 'source_root_activation_ready_for_private_metadata_diagnostic',
      `private_diagnostic_allowed=${blocker?.summary?.private_diagnostic_allowed}, activation=${sourceRootActivation?.status}`
    )
  ];
  const passed = invariants.every((item) => item.status === 'passed');

  return {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    status: passed ? 'day_batch_loop_passed_review_only' : 'day_batch_loop_needs_review',
    policy: {
      review_only: true,
      records_decisions: false,
      reads_private_content: false,
      copies_private_content: false,
      writes_public_files: false,
      writes_public_manifest: false,
      public_ready_after_loop: 0,
      note: 'This loop runs review-only guards and handoff generators. It does not select source roots, read private source contents, promote assets or publish files.'
    },
    summary: {
      duration_ms: Date.now() - startedAt,
      steps: results.length,
      required_steps: required.length,
      required_passed_steps: required.length - requiredFailures.length,
      allowed_failures: results.filter((result) => result.status === 'allowed_failure').length,
      skipped_steps: results.filter((result) => result.status === 'skipped').length,
      core_sweep_status: sweep?.status || null,
      router_status: router?.status || null,
      worker_boundary_status: boundary?.status || null,
      owner_handoff_status: ownerHandoffPassed ? 'passed' : 'needs_review',
      innovation_smoke_status: innovationSmoke?.status || null,
      orbit_bridge_status: orbitBridge?.status || null,
      source_root_blocker_status: blocker?.status || null,
      source_root_decision_session_refresh_status: decisionSessionRefresh?.status || null,
      source_root_decision_session_refresh_changed: decisionSessionRefresh?.summary?.changed === true,
      source_root_decision_session_refresh_options: decisionSessionRefresh?.summary?.refreshed_options ?? null,
      source_root_decision_session_refresh_failures: decisionSessionRefresh?.summary?.failures ?? null,
      source_root_candidate_integrity_status: candidateIntegrity?.status || null,
      source_root_candidate_integrity_existing_paths: candidateIntegrity?.summary?.existing_path_options ?? null,
      source_root_candidate_integrity_exact_roots: candidateIntegrity?.summary?.owner_confirmable_exact_roots ?? null,
      source_root_candidate_integrity_failures: candidateIntegrity?.summary?.failures ?? null,
      source_root_owner_action_status: sourceRootOwnerAction?.status || null,
      source_root_owner_decision_packet_status: sourceRootOwnerDecisionPacket?.status || null,
      source_root_owner_decision_packet_templates: sourceRootOwnerDecisionPacket?.summary?.decision_templates ?? null,
      source_root_owner_decision_packet_exact_roots: sourceRootOwnerDecisionPacket?.summary?.owner_confirmable_exact_roots ?? null,
      source_root_owner_decision_packet_failures: sourceRootOwnerDecisionPacket?.summary?.failures ?? null,
      source_root_owner_decision_packet_check_status: sourceRootOwnerDecisionPacketCheck?.status || null,
      source_root_owner_decision_packet_check_failures: sourceRootOwnerDecisionPacketCheck?.summary?.failures ?? null,
      source_root_owner_decision_packet_check_warnings: sourceRootOwnerDecisionPacketCheck?.summary?.warnings ?? null,
      source_root_decision_dry_run_status: sourceRootDecisionDryRun?.status || null,
      source_root_decision_dry_run_scenarios: sourceRootDecisionDryRun?.summary?.scenarios ?? null,
      source_root_decision_dry_run_metadata_scenarios: sourceRootDecisionDryRun?.summary?.metadata_diagnostic_scenarios ?? null,
      source_root_decision_dry_run_failures: sourceRootDecisionDryRun?.summary?.failures ?? null,
      source_root_post_owner_activation_queue_status: sourceRootPostOwnerActivationQueue?.status || null,
      source_root_post_owner_activation_queue_steps: sourceRootPostOwnerActivationQueue?.summary?.queue_steps ?? null,
      source_root_post_owner_activation_queue_executable_now: sourceRootPostOwnerActivationQueue?.summary?.executable_now ?? null,
      source_root_post_owner_activation_queue_blocked_now: sourceRootPostOwnerActivationQueue?.summary?.blocked_now ?? null,
      source_root_post_owner_activation_queue_failures: sourceRootPostOwnerActivationQueue?.summary?.failures ?? null,
      source_root_post_owner_activation_queue_check_status: sourceRootPostOwnerActivationQueueCheck?.status || null,
      source_root_post_owner_activation_queue_check_failures: sourceRootPostOwnerActivationQueueCheck?.summary?.failures ?? null,
      source_root_post_owner_activation_queue_check_warnings: sourceRootPostOwnerActivationQueueCheck?.summary?.warnings ?? null,
      source_root_owner_final_decision_brief_status: sourceRootOwnerFinalDecisionBrief?.status || null,
      source_root_owner_final_decision_brief_options: sourceRootOwnerFinalDecisionBrief?.summary?.decision_options ?? null,
      source_root_owner_final_decision_brief_unlock_options: sourceRootOwnerFinalDecisionBrief?.summary?.unlock_options ?? null,
      source_root_owner_final_decision_brief_failures: sourceRootOwnerFinalDecisionBrief?.summary?.failures ?? null,
      source_root_owner_choice_consequence_matrix_status: sourceRootOwnerChoiceConsequenceMatrix?.status || null,
      source_root_owner_choice_consequence_matrix_choices: sourceRootOwnerChoiceConsequenceMatrix?.summary?.choices ?? null,
      source_root_owner_choice_consequence_matrix_unlock_choices: sourceRootOwnerChoiceConsequenceMatrix?.summary?.unlock_choices ?? null,
      source_root_owner_choice_consequence_matrix_blocked_choices: sourceRootOwnerChoiceConsequenceMatrix?.summary?.blocked_choices ?? null,
      source_root_owner_choice_consequence_matrix_failures: sourceRootOwnerChoiceConsequenceMatrix?.summary?.failures ?? null,
      pilot_gap_label_review_status: pilotGapLabelReview?.status || null,
      pilot_gap_label_review_labels: pilotGapLabelReview?.summary?.gap_labels ?? null,
      pilot_gap_label_review_hard_blockers: pilotGapLabelReview?.summary?.hard_blockers ?? null,
      pilot_gap_label_review_owner_decisions: pilotGapLabelReview?.summary?.owner_decisions_required ?? null,
      pilot_gap_label_review_local_worker_allowed_now: pilotGapLabelReview?.summary?.local_worker_allowed_now ?? null,
      pilot_gap_label_review_failures: pilotGapLabelReview?.summary?.failures ?? null,
      pilot_gap_label_review_check_status: pilotGapLabelReviewCheck?.status || null,
      pilot_gap_label_review_check_failures: pilotGapLabelReviewCheck?.summary?.failures ?? null,
      asset_source_candidate_map_status: assetSourceCandidateMap?.status || null,
      asset_source_candidate_map_candidates: assetSourceCandidateMap?.summary?.asset_lane_candidates ?? null,
      asset_candidate_taxonomy_review_status: assetCandidateTaxonomyReview?.status || null,
      asset_candidate_taxonomy_review_candidates: assetCandidateTaxonomyReview?.summary?.candidate_reviews ?? null,
      asset_candidate_taxonomy_review_reviewable_lanes: assetCandidateTaxonomyReview?.summary?.reviewable_asset_lanes ?? null,
      asset_candidate_taxonomy_review_owner_confirmations: assetCandidateTaxonomyReview?.summary?.owner_confirmations_required ?? null,
      asset_candidate_taxonomy_review_failures: assetCandidateTaxonomyReview?.summary?.failures ?? null,
      asset_candidate_taxonomy_review_check_status: assetCandidateTaxonomyReviewCheck?.status || null,
      asset_candidate_taxonomy_review_check_failures: assetCandidateTaxonomyReviewCheck?.summary?.failures ?? null,
      source_root_activation_status: sourceRootActivation?.status || null,
      private_metadata_inventory_status: privateMetadataInventory?.status || null,
      private_metadata_inventory_fixture_status: privateMetadataInventoryFixture?.status || null,
      private_metadata_inventory_check_status: privateMetadataInventoryCheck?.status || null,
      local_worker_http_runner_status: localWorkerHttpRunner?.status || null,
      local_worker_http_runner_guard_passed: localWorkerHttpRunner?.guard?.passed === true,
      local_worker_http_runner_safe_inputs: localWorkerHttpRunner?.guard?.safe_inputs?.length ?? null,
      local_worker_http_runner_execute_requested: localWorkerHttpRunner?.task?.execute_requested === true,
      local_worker_http_runner_check_status: localWorkerHttpRunnerCheck?.status || null,
      local_worker_http_runner_check_failures: localWorkerHttpRunnerCheck?.summary?.failures ?? null,
      local_worker_execution_runbook_status: localWorkerExecutionRunbook?.status || null,
      local_worker_execution_runbook_runner_safe_tasks: localWorkerExecutionRunbook?.summary?.runner_safe_tasks ?? null,
      local_worker_execution_runbook_executable_now: localWorkerExecutionRunbook?.summary?.execute_allowed_if_output_missing ?? null,
      local_worker_execution_runbook_check_status: localWorkerExecutionRunbookCheck?.status || null,
      local_worker_execution_runbook_check_failures: localWorkerExecutionRunbookCheck?.summary?.failures ?? null,
      local_worker_output_contract_review_status: localWorkerOutputContractReview?.status || null,
      local_worker_output_contract_review_contracts: localWorkerOutputContractReview?.summary?.contracts ?? null,
      local_worker_output_contract_review_present_valid: localWorkerOutputContractReview?.summary?.present_valid_outputs ?? null,
      local_worker_output_contract_review_repo_conversion_now: localWorkerOutputContractReview?.summary?.repo_conversion_allowed_now ?? null,
      local_worker_output_contract_review_execute_allowed_now: localWorkerOutputContractReview?.summary?.execute_allowed_now ?? null,
      local_worker_output_contract_review_failures: localWorkerOutputContractReview?.summary?.failures ?? null,
      local_worker_output_contract_review_check_status: localWorkerOutputContractReviewCheck?.status || null,
      local_worker_output_contract_review_check_failures: localWorkerOutputContractReviewCheck?.summary?.failures ?? null,
      source_independent_work_queue_status: sourceIndependentWorkQueue?.status || null,
      source_independent_work_queue_tasks: sourceIndependentWorkQueue?.summary?.tasks ?? null,
      source_independent_work_queue_completed_review_only: sourceIndependentWorkQueue?.summary?.completed_review_only ?? null,
      source_independent_work_queue_codex_executable_now: sourceIndependentWorkQueue?.summary?.codex_executable_now ?? null,
      source_independent_work_queue_owner_actions: sourceIndependentWorkQueue?.summary?.owner_actions ?? null,
      source_independent_work_queue_failures: sourceIndependentWorkQueue?.summary?.failures ?? null,
      private_diagnostic_allowed: blocker?.summary?.private_diagnostic_allowed === true,
      night_loop_checkpoint_status: checkpoint?.status || null,
      public_ready_after_loop: 0
    },
    source_refs: [
      `data/kosmodata-lane-sweep-${dateStamp}.json`,
      `data/kosmo-data-lane-command-router-${dateStamp}.json`,
      `data/kosmo-worker-boundary-pack-check-${dateStamp}.json`,
      `data/kosmo-owner-review-packet-check-${dateStamp}.json`,
      `data/kosmo-owner-review-session-brief-check-${dateStamp}.json`,
      `data/kosmo-source-root-blocker-refresh-${dateStamp}.json`,
      `data/kosmo-source-root-decision-session-refresh-${dateStamp}.json`,
      `data/kosmo-source-root-candidate-integrity-check-${dateStamp}.json`,
      `data/kosmo-source-root-owner-action-card-${dateStamp}.json`,
      `data/kosmo-source-root-owner-decision-packet-${dateStamp}.json`,
      `data/kosmo-source-root-owner-decision-packet-check-${dateStamp}.json`,
      `data/kosmo-source-root-decision-dry-run-${dateStamp}.json`,
      `data/kosmo-source-root-post-owner-activation-queue-${dateStamp}.json`,
      `data/kosmo-source-root-post-owner-activation-queue-check-${dateStamp}.json`,
      `data/kosmo-source-root-owner-final-decision-brief-${dateStamp}.json`,
      `data/kosmo-source-root-owner-choice-consequence-matrix-${dateStamp}.json`,
      `data/kosmoreferences-pilot-gap-label-review-${dateStamp}.json`,
      `data/kosmoreferences-pilot-gap-label-review-check-${dateStamp}.json`,
      `data/kosmoasset-source-candidate-map-${dateStamp}.json`,
      `data/kosmoasset-candidate-taxonomy-review-${dateStamp}.json`,
      `data/kosmoasset-candidate-taxonomy-review-check-${dateStamp}.json`,
      `data/kosmo-source-root-activation-preflight-${dateStamp}.json`,
      `data/kosmo-private-metadata-inventory-runner-${dateStamp}.json`,
      `data/kosmo-private-metadata-inventory-fixture-smoke-${dateStamp}.json`,
      `data/kosmo-private-metadata-inventory-check-${dateStamp}.json`,
      `data/kosmo-local-worker-http-runner-${dateStamp}.json`,
      `data/kosmo-local-worker-http-runner-check-${dateStamp}.json`,
      `data/kosmo-local-worker-execution-runbook-${dateStamp}.json`,
      `data/kosmo-local-worker-execution-runbook-check-${dateStamp}.json`,
      `data/kosmo-local-worker-output-contract-review-${dateStamp}.json`,
      `data/kosmo-local-worker-output-contract-review-check-${dateStamp}.json`,
      `data/kosmo-night-loop-checkpoint-${dateStamp}.json`,
      `data/kosmo-source-independent-work-queue-${dateStamp}.json`,
      `data/kosmo-innovation-smoke-${dateStamp}.json`,
      `data/kosmo-orbit-status-bridge-${dateStamp}.json`
    ],
    invariants,
    steps: results,
    next_actions: [
      'Use this script as the daily autonomous KosmoReferences/KosmoAsset review-only loop.',
      'If source-root remains blocked, present the owner review packet and do not run private extraction.',
      'After a real source root is recorded, rerun this loop before any pilot-first private inventory.'
    ]
  };
}

function invariant(id, condition, evidence) {
  return {
    id,
    status: condition ? 'passed' : 'failed',
    evidence: String(evidence ?? 'missing')
  };
}

async function readOptionalJson(path) {
  try {
    return JSON.parse(await readFile(resolve(root, path), 'utf8'));
  } catch {
    return null;
  }
}

function renderMarkdown(report) {
  const lines = [];
  lines.push('# Kosmo Day Batch Loop');
  lines.push('');
  lines.push(`Generated: ${report.generated_at}`);
  lines.push(`Status: \`${report.status}\``);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Required steps: ${report.summary.required_passed_steps}/${report.summary.required_steps}`);
  lines.push(`- Allowed bootstrap failures: ${report.summary.allowed_failures}`);
  lines.push(`- Skipped steps: ${report.summary.skipped_steps}`);
  lines.push(`- Core sweep: ${report.summary.core_sweep_status}`);
  lines.push(`- Router: ${report.summary.router_status}`);
  lines.push(`- Worker boundary: ${report.summary.worker_boundary_status}`);
  lines.push(`- Owner handoff: ${report.summary.owner_handoff_status}`);
  lines.push(`- Source-root activation: ${report.summary.source_root_activation_status}`);
  lines.push(`- Private metadata inventory: ${report.summary.private_metadata_inventory_status}`);
  lines.push(`- Private metadata inventory fixture: ${report.summary.private_metadata_inventory_fixture_status}`);
  lines.push(`- Private metadata inventory check: ${report.summary.private_metadata_inventory_check_status}`);
  lines.push(`- Local worker HTTP runner: ${report.summary.local_worker_http_runner_status}, guard ${report.summary.local_worker_http_runner_guard_passed ? 'passed' : 'failed'}, safe inputs ${report.summary.local_worker_http_runner_safe_inputs ?? '-'}`);
  lines.push(`- Local worker HTTP runner check: ${report.summary.local_worker_http_runner_check_status}, failures ${report.summary.local_worker_http_runner_check_failures ?? '-'}`);
  lines.push(`- Local worker execution runbook: ${report.summary.local_worker_execution_runbook_status}, runner-safe ${report.summary.local_worker_execution_runbook_runner_safe_tasks ?? '-'}, executable now ${report.summary.local_worker_execution_runbook_executable_now ?? '-'}`);
  lines.push(`- Local worker execution runbook check: ${report.summary.local_worker_execution_runbook_check_status}, failures ${report.summary.local_worker_execution_runbook_check_failures ?? '-'}`);
  lines.push(`- Local worker output contract review: ${report.summary.local_worker_output_contract_review_status}, contracts ${report.summary.local_worker_output_contract_review_contracts ?? '-'}, present valid ${report.summary.local_worker_output_contract_review_present_valid ?? '-'}, repo conversion now ${report.summary.local_worker_output_contract_review_repo_conversion_now ?? '-'}, execute now ${report.summary.local_worker_output_contract_review_execute_allowed_now ?? '-'}, failures ${report.summary.local_worker_output_contract_review_failures ?? '-'}, check ${report.summary.local_worker_output_contract_review_check_status}`);
  lines.push(`- Source-independent work queue: ${report.summary.source_independent_work_queue_status}, tasks ${report.summary.source_independent_work_queue_tasks ?? '-'}, completed ${report.summary.source_independent_work_queue_completed_review_only ?? '-'}, codex executable ${report.summary.source_independent_work_queue_codex_executable_now ?? '-'}, owner actions ${report.summary.source_independent_work_queue_owner_actions ?? '-'}, failures ${report.summary.source_independent_work_queue_failures ?? '-'}`);
  lines.push(`- Innovation smoke: ${report.summary.innovation_smoke_status}`);
  lines.push(`- Orbit bridge: ${report.summary.orbit_bridge_status}`);
  lines.push(`- Source-root blocker: ${report.summary.source_root_blocker_status}`);
  lines.push(`- Source-root decision session refresh: ${report.summary.source_root_decision_session_refresh_status}, changed ${report.summary.source_root_decision_session_refresh_changed ? 'yes' : 'no'}, options ${report.summary.source_root_decision_session_refresh_options ?? '-'}, failures ${report.summary.source_root_decision_session_refresh_failures ?? '-'}`);
  lines.push(`- Source-root candidate integrity: ${report.summary.source_root_candidate_integrity_status}, existing ${report.summary.source_root_candidate_integrity_existing_paths ?? '-'}, exact roots ${report.summary.source_root_candidate_integrity_exact_roots ?? '-'}, failures ${report.summary.source_root_candidate_integrity_failures ?? '-'}`);
  lines.push(`- Source-root owner action: ${report.summary.source_root_owner_action_status}`);
  lines.push(`- Source-root owner decision packet: ${report.summary.source_root_owner_decision_packet_status}, templates ${report.summary.source_root_owner_decision_packet_templates ?? '-'}, exact roots ${report.summary.source_root_owner_decision_packet_exact_roots ?? '-'}, failures ${report.summary.source_root_owner_decision_packet_failures ?? '-'}`);
  lines.push(`- Source-root owner decision packet check: ${report.summary.source_root_owner_decision_packet_check_status}, failures ${report.summary.source_root_owner_decision_packet_check_failures ?? '-'}, warnings ${report.summary.source_root_owner_decision_packet_check_warnings ?? '-'}`);
  lines.push(`- Source-root decision dry run: ${report.summary.source_root_decision_dry_run_status}, scenarios ${report.summary.source_root_decision_dry_run_scenarios ?? '-'}, metadata scenarios ${report.summary.source_root_decision_dry_run_metadata_scenarios ?? '-'}, failures ${report.summary.source_root_decision_dry_run_failures ?? '-'}`);
  lines.push(`- Source-root post-owner activation queue: ${report.summary.source_root_post_owner_activation_queue_status}, steps ${report.summary.source_root_post_owner_activation_queue_steps ?? '-'}, executable ${report.summary.source_root_post_owner_activation_queue_executable_now ?? '-'}, blocked ${report.summary.source_root_post_owner_activation_queue_blocked_now ?? '-'}, failures ${report.summary.source_root_post_owner_activation_queue_failures ?? '-'}`);
  lines.push(`- Source-root post-owner activation queue check: ${report.summary.source_root_post_owner_activation_queue_check_status}, failures ${report.summary.source_root_post_owner_activation_queue_check_failures ?? '-'}, warnings ${report.summary.source_root_post_owner_activation_queue_check_warnings ?? '-'}`);
  lines.push(`- Source-root owner final decision brief: ${report.summary.source_root_owner_final_decision_brief_status}, options ${report.summary.source_root_owner_final_decision_brief_options ?? '-'}, unlock options ${report.summary.source_root_owner_final_decision_brief_unlock_options ?? '-'}, failures ${report.summary.source_root_owner_final_decision_brief_failures ?? '-'}`);
  lines.push(`- Source-root owner choice consequence matrix: ${report.summary.source_root_owner_choice_consequence_matrix_status}, choices ${report.summary.source_root_owner_choice_consequence_matrix_choices ?? '-'}, unlock ${report.summary.source_root_owner_choice_consequence_matrix_unlock_choices ?? '-'}, blocked ${report.summary.source_root_owner_choice_consequence_matrix_blocked_choices ?? '-'}, failures ${report.summary.source_root_owner_choice_consequence_matrix_failures ?? '-'}`);
  lines.push(`- Pilot gap label review: ${report.summary.pilot_gap_label_review_status}, labels ${report.summary.pilot_gap_label_review_labels ?? '-'}, hard blockers ${report.summary.pilot_gap_label_review_hard_blockers ?? '-'}, owner decisions ${report.summary.pilot_gap_label_review_owner_decisions ?? '-'}, local worker now ${report.summary.pilot_gap_label_review_local_worker_allowed_now ?? '-'}, failures ${report.summary.pilot_gap_label_review_failures ?? '-'}, check ${report.summary.pilot_gap_label_review_check_status}`);
  lines.push(`- Asset source candidate map: ${report.summary.asset_source_candidate_map_status}, candidates ${report.summary.asset_source_candidate_map_candidates ?? '-'}`);
  lines.push(`- Asset candidate taxonomy review: ${report.summary.asset_candidate_taxonomy_review_status}, candidates ${report.summary.asset_candidate_taxonomy_review_candidates ?? '-'}, reviewable ${report.summary.asset_candidate_taxonomy_review_reviewable_lanes ?? '-'}, owner confirmations ${report.summary.asset_candidate_taxonomy_review_owner_confirmations ?? '-'}, failures ${report.summary.asset_candidate_taxonomy_review_failures ?? '-'}, check ${report.summary.asset_candidate_taxonomy_review_check_status}`);
  lines.push(`- Private diagnostic allowed: ${report.summary.private_diagnostic_allowed ? 'yes' : 'no'}`);
  lines.push(`- Night loop checkpoint: ${report.summary.night_loop_checkpoint_status}`);
  lines.push(`- Public-ready after loop: ${report.summary.public_ready_after_loop}`);
  lines.push('');
  lines.push('## Invariants');
  lines.push('');
  lines.push('| Invariant | Status | Evidence |');
  lines.push('| --- | --- | --- |');
  report.invariants.forEach((item) => {
    lines.push(`| \`${item.id}\` | ${item.status} | ${escapePipe(item.evidence)} |`);
  });
  lines.push('');
  lines.push('## Steps');
  lines.push('');
  lines.push('| Step | Status | Required | Duration |');
  lines.push('| --- | --- | --- | ---: |');
  report.steps.forEach((item) => {
    lines.push(`| ${escapePipe(item.label)} | ${item.status} | ${item.required === false ? 'no' : 'yes'} | ${item.duration_ms}ms |`);
  });
  lines.push('');
  lines.push('## Next Actions');
  lines.push('');
  report.next_actions.forEach((action) => lines.push(`- ${action}`));
  lines.push('');
  return `${lines.join('\n')}`;
}

function excerpt(value) {
  const normalized = String(value || '').trim();
  if (normalized.length <= 1600) return normalized;
  return normalized.slice(-1600);
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
