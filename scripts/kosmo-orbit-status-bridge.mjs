#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = new Date().toISOString().slice(0, 10);
const outputJson = resolve(root, args.out || `data/kosmo-orbit-status-bridge-${dateStamp}.json`);
const outputMd = resolve(root, args.markdown || `docs/codex/kosmo-orbit-status-bridge-${dateStamp}.md`);

const refs = {
  dayBatch: `data/kosmo-day-batch-loop-${dateStamp}.json`,
  sourceRoot: `data/kosmo-source-root-blocker-refresh-${dateStamp}.json`,
  sourceRootDecisionRefresh: `data/kosmo-source-root-decision-session-refresh-${dateStamp}.json`,
  sourceRootCandidateIntegrity: `data/kosmo-source-root-candidate-integrity-check-${dateStamp}.json`,
  sourceRootOwnerAction: `data/kosmo-source-root-owner-action-card-${dateStamp}.json`,
  sourceRootOwnerDecisionPacket: `data/kosmo-source-root-owner-decision-packet-${dateStamp}.json`,
  sourceRootOwnerDecisionPacketCheck: `data/kosmo-source-root-owner-decision-packet-check-${dateStamp}.json`,
  sourceRootDecisionDryRun: `data/kosmo-source-root-decision-dry-run-${dateStamp}.json`,
  sourceRootPostOwnerActivationQueue: `data/kosmo-source-root-post-owner-activation-queue-${dateStamp}.json`,
  sourceRootPostOwnerActivationQueueCheck: `data/kosmo-source-root-post-owner-activation-queue-check-${dateStamp}.json`,
  sourceRootOwnerFinalDecisionBrief: `data/kosmo-source-root-owner-final-decision-brief-${dateStamp}.json`,
  sourceRootOwnerChoiceConsequenceMatrix: `data/kosmo-source-root-owner-choice-consequence-matrix-${dateStamp}.json`,
  sourceRootActivation: `data/kosmo-source-root-activation-preflight-${dateStamp}.json`,
  privateMetadataInventory: `data/kosmo-private-metadata-inventory-runner-${dateStamp}.json`,
  privateMetadataInventoryFixture: `data/kosmo-private-metadata-inventory-fixture-smoke-${dateStamp}.json`,
  privateMetadataInventoryCheck: `data/kosmo-private-metadata-inventory-check-${dateStamp}.json`,
  localModelInventory: `data/kosmo-local-model-inventory-${dateStamp}.json`,
  localWorkerHttpRunner: `data/kosmo-local-worker-http-runner-${dateStamp}.json`,
  localWorkerHttpRunnerCheck: `data/kosmo-local-worker-http-runner-check-${dateStamp}.json`,
  localWorkerExecutionRunbook: `data/kosmo-local-worker-execution-runbook-${dateStamp}.json`,
  localWorkerExecutionRunbookCheck: `data/kosmo-local-worker-execution-runbook-check-${dateStamp}.json`,
  localWorkerOutputContractReview: `data/kosmo-local-worker-output-contract-review-${dateStamp}.json`,
  localWorkerOutputContractReviewCheck: `data/kosmo-local-worker-output-contract-review-check-${dateStamp}.json`,
  sourceIndependentWorkQueue: `data/kosmo-source-independent-work-queue-${dateStamp}.json`,
  sweep: `data/kosmodata-lane-sweep-${dateStamp}.json`,
  workerBoundary: `data/kosmo-worker-boundary-pack-check-${dateStamp}.json`,
  ownerPacket: `data/kosmo-owner-review-packet-check-${dateStamp}.json`,
  pilotGapLabelReview: `data/kosmoreferences-pilot-gap-label-review-${dateStamp}.json`,
  pilotGapLabelReviewCheck: `data/kosmoreferences-pilot-gap-label-review-check-${dateStamp}.json`,
  assetBridge: `data/kosmoasset-reference-bridge-check-${dateStamp}.json`,
  assetSourceCandidateMap: `data/kosmoasset-source-candidate-map-${dateStamp}.json`,
  assetCandidateTaxonomyReview: `data/kosmoasset-candidate-taxonomy-review-${dateStamp}.json`,
  assetCandidateTaxonomyReviewCheck: `data/kosmoasset-candidate-taxonomy-review-check-${dateStamp}.json`,
  innovationPlan: `data/kosmo-innovation-lane-plan-${dateStamp}.json`,
  innovationSmoke: `data/kosmo-innovation-smoke-${dateStamp}.json`,
  nightLoop: `data/kosmo-night-loop-checkpoint-${dateStamp}.json`
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const reports = {};
  for (const [key, path] of Object.entries(refs)) reports[key] = await readOptionalJson(path);
  const bridge = buildBridge(reports);

  await mkdir(dirname(outputJson), { recursive: true });
  await mkdir(dirname(outputMd), { recursive: true });
  await writeFile(outputJson, `${JSON.stringify(bridge, null, 2)}\n`);
  await writeFile(outputMd, renderMarkdown(bridge));

  console.log('Kosmo Orbit status bridge');
  console.log(`Status: ${bridge.status}`);
  console.log(`Cards: ${bridge.summary.cards}`);
  console.log(`Blocking cards: ${bridge.summary.blocking_cards}`);
  console.log(`Wrote: ${relative(root, outputMd)}`);
}

function buildBridge(reports) {
  const daySummary = reports.dayBatch?.summary || {};
  const sourceSummary = reports.sourceRoot?.summary || {};
  const decisionRefreshSummary = reports.sourceRootDecisionRefresh?.summary || {};
  const candidateIntegritySummary = reports.sourceRootCandidateIntegrity?.summary || {};
  const ownerActionSummary = reports.sourceRootOwnerAction?.summary || {};
  const ownerDecisionPacketSummary = reports.sourceRootOwnerDecisionPacket?.summary || {};
  const ownerDecisionPacketCheckSummary = reports.sourceRootOwnerDecisionPacketCheck?.summary || {};
  const decisionDryRunSummary = reports.sourceRootDecisionDryRun?.summary || {};
  const postOwnerActivationQueueSummary = reports.sourceRootPostOwnerActivationQueue?.summary || {};
  const postOwnerActivationQueueCheckSummary = reports.sourceRootPostOwnerActivationQueueCheck?.summary || {};
  const ownerFinalDecisionBriefSummary = reports.sourceRootOwnerFinalDecisionBrief?.summary || {};
  const ownerChoiceConsequenceMatrixSummary = reports.sourceRootOwnerChoiceConsequenceMatrix?.summary || {};
  const activationSummary = reports.sourceRootActivation?.summary || {};
  const privateInventorySummary = reports.privateMetadataInventory?.summary || {};
  const privateInventoryFixtureSummary = reports.privateMetadataInventoryFixture?.summary || {};
  const modelSummary = reports.localModelInventory?.summary || {};
  const localWorkerHttpRunner = reports.localWorkerHttpRunner || {};
  const localWorkerHttpRunnerGuard = localWorkerHttpRunner.guard || {};
  const localWorkerHttpRunnerCheck = reports.localWorkerHttpRunnerCheck || {};
  const localWorkerExecutionRunbook = reports.localWorkerExecutionRunbook || {};
  const localWorkerExecutionRunbookSummary = localWorkerExecutionRunbook.summary || {};
  const localWorkerExecutionRunbookCheck = reports.localWorkerExecutionRunbookCheck || {};
  const localWorkerOutputContractSummary = reports.localWorkerOutputContractReview?.summary || {};
  const localWorkerOutputContractCheckSummary = reports.localWorkerOutputContractReviewCheck?.summary || {};
  const sourceIndependentWorkQueueSummary = reports.sourceIndependentWorkQueue?.summary || {};
  const sweepSummary = reports.sweep?.summary || {};
  const pilotGapLabelSummary = reports.pilotGapLabelReview?.summary || {};
  const pilotGapLabelCheckSummary = reports.pilotGapLabelReviewCheck?.summary || {};
  const assetBridgeSummary = reports.assetBridge?.summary || {};
  const assetSourceCandidateSummary = reports.assetSourceCandidateMap?.summary || {};
  const assetCandidateTaxonomySummary = reports.assetCandidateTaxonomyReview?.summary || {};
  const assetCandidateTaxonomyCheckSummary = reports.assetCandidateTaxonomyReviewCheck?.summary || {};
  const innovationSummary = reports.innovationSmoke?.summary || {};
  const cards = [
    {
      id: 'day-batch',
      title: 'Daily Batch',
      status: reports.dayBatch?.status === 'day_batch_loop_passed_review_only' ? 'ready' : 'needs_review',
      signal: `${daySummary.required_passed_steps ?? 0}/${daySummary.required_steps ?? 0} required steps`,
      owner_action_required: false,
      route_hint: 'KosmoReferences/KosmoAsset daily loop',
      source_ref: refs.dayBatch
    },
    {
      id: 'source-root',
      title: 'Source Root',
      status: sourceSummary.private_diagnostic_allowed === true ? 'ready' : 'blocked',
      signal: sourceSummary.private_diagnostic_allowed === true
        ? 'private diagnostic allowed'
        : `blocked: ${sourceSummary.source_root_probable_libraries ?? 0} probable libraries, ${sourceSummary.onedrive_marker_files ?? 0} OneDrive markers`,
      owner_action_required: sourceSummary.private_diagnostic_allowed !== true,
      route_hint: 'Owner/KosmoOverseer must record true private source root',
      source_ref: refs.sourceRoot
    },
    {
      id: 'source-root-decision-refresh',
      title: 'Source Root Decision Refresh',
      status: [
        'source_root_decision_session_refreshed_pending',
        'source_root_decision_session_refresh_not_needed'
      ].includes(reports.sourceRootDecisionRefresh?.status)
        ? 'review_only_ready'
        : 'needs_review',
      signal: reports.sourceRootDecisionRefresh?.status
        ? `${reports.sourceRootDecisionRefresh.status}, changed ${decisionRefreshSummary.changed ? 'yes' : 'no'}, options ${decisionRefreshSummary.refreshed_options ?? 0}`
        : 'missing decision session refresh',
      owner_action_required: false,
      route_hint: 'Keep pending source-root decision options aligned with current storage evidence',
      source_ref: refs.sourceRootDecisionRefresh
    },
    {
      id: 'source-root-candidate-integrity',
      title: 'Source Root Candidate Integrity',
      status: reports.sourceRootCandidateIntegrity?.status === 'source_root_candidate_integrity_owner_review_ready'
        ? 'review_only_ready'
        : 'needs_review',
      signal: reports.sourceRootCandidateIntegrity?.status
        ? `${candidateIntegritySummary.existing_path_options ?? 0}/${candidateIntegritySummary.path_options ?? 0} paths visible, exact roots ${candidateIntegritySummary.owner_confirmable_exact_roots ?? 0}, failures ${candidateIntegritySummary.failures ?? 0}`
        : 'missing candidate integrity check',
      owner_action_required: true,
      route_hint: 'Verify visible root candidates without reading private contents',
      source_ref: refs.sourceRootCandidateIntegrity
    },
    {
      id: 'source-root-owner-action',
      title: 'Source Root Owner Action',
      status: reports.sourceRootOwnerAction?.status === 'source_root_owner_action_satisfied_metadata_only'
        ? 'ready'
        : reports.sourceRootOwnerAction?.status === 'source_root_owner_action_required'
          ? 'blocked'
          : 'needs_review',
      signal: reports.sourceRootOwnerAction?.status === 'source_root_owner_action_required'
        ? `action required: ${ownerActionSummary.recommended_decision || 'select or mount source root'}`
        : `decision ${ownerActionSummary.selected_decision || 'pending'}, root ${ownerActionSummary.selected_root_path || 'pending'}`,
      owner_action_required: ownerActionSummary.owner_action_required !== false,
      route_hint: 'Exact owner edit needed for source-root decision session',
      source_ref: refs.sourceRootOwnerAction
    },
    {
      id: 'source-root-owner-decision-packet',
      title: 'Source Root Owner Decision Packet',
      status: reports.sourceRootOwnerDecisionPacket?.status === 'source_root_owner_decision_packet_ready'
        ? 'ready'
        : 'needs_review',
      signal: reports.sourceRootOwnerDecisionPacket?.status
        ? `${ownerDecisionPacketSummary.decision_templates ?? 0} templates, exact roots ${ownerDecisionPacketSummary.owner_confirmable_exact_roots ?? 0}, failures ${ownerDecisionPacketSummary.failures ?? 0}`
        : 'missing owner decision packet',
      owner_action_required: true,
      route_hint: 'Owner-facing source-root decision templates',
      source_ref: refs.sourceRootOwnerDecisionPacket
    },
    {
      id: 'source-root-owner-decision-packet-check',
      title: 'Source Root Owner Decision Packet Check',
      status: reports.sourceRootOwnerDecisionPacketCheck?.status === 'source_root_owner_decision_packet_guard_passed'
        ? 'locked'
        : 'needs_review',
      signal: reports.sourceRootOwnerDecisionPacketCheck?.status
        ? `${reports.sourceRootOwnerDecisionPacketCheck.status}, failures ${ownerDecisionPacketCheckSummary.failures ?? 0}, warnings ${ownerDecisionPacketCheckSummary.warnings ?? 0}`
        : 'missing owner decision packet guard',
      owner_action_required: false,
      route_hint: 'Guard source-root decision templates before owner presentation',
      source_ref: refs.sourceRootOwnerDecisionPacketCheck
    },
    {
      id: 'source-root-decision-dry-run',
      title: 'Source Root Decision Dry Run',
      status: reports.sourceRootDecisionDryRun?.status === 'source_root_decision_dry_run_ready'
        ? 'review_only_ready'
        : 'needs_review',
      signal: reports.sourceRootDecisionDryRun?.status
        ? `${decisionDryRunSummary.scenarios ?? 0} scenarios, metadata ${decisionDryRunSummary.metadata_diagnostic_scenarios ?? 0}, failures ${decisionDryRunSummary.failures ?? 0}`
        : 'missing source-root decision dry run',
      owner_action_required: false,
      route_hint: 'Preview source-root decision consequences without applying them',
      source_ref: refs.sourceRootDecisionDryRun
    },
    {
      id: 'source-root-post-owner-activation-queue',
      title: 'Source Root Post-Owner Activation Queue',
      status: reports.sourceRootPostOwnerActivationQueue?.status === 'source_root_post_owner_activation_queue_ready'
        ? 'review_only_ready'
        : 'needs_review',
      signal: reports.sourceRootPostOwnerActivationQueue?.status
        ? `${postOwnerActivationQueueSummary.queue_steps ?? 0} steps, executable ${postOwnerActivationQueueSummary.executable_now ?? 0}, blocked ${postOwnerActivationQueueSummary.blocked_now ?? 0}`
        : 'missing post-owner activation queue',
      owner_action_required: false,
      route_hint: 'Safe command order after recorded source-root decision',
      source_ref: refs.sourceRootPostOwnerActivationQueue
    },
    {
      id: 'source-root-post-owner-activation-queue-check',
      title: 'Source Root Post-Owner Activation Queue Check',
      status: reports.sourceRootPostOwnerActivationQueueCheck?.status === 'source_root_post_owner_activation_queue_guard_passed'
        ? 'guard_passed'
        : 'needs_review',
      signal: reports.sourceRootPostOwnerActivationQueueCheck?.status
        ? `${postOwnerActivationQueueCheckSummary.failures ?? 0} failures, ${postOwnerActivationQueueCheckSummary.warnings ?? 0} warnings`
        : 'missing post-owner activation queue guard',
      owner_action_required: false,
      route_hint: 'Validate queue order and safety policy before activation',
      source_ref: refs.sourceRootPostOwnerActivationQueueCheck
    },
    {
      id: 'source-root-owner-final-decision-brief',
      title: 'Source Root Owner Final Decision Brief',
      status: reports.sourceRootOwnerFinalDecisionBrief?.status === 'source_root_owner_final_decision_brief_ready'
        ? 'owner_action'
        : 'needs_review',
      signal: reports.sourceRootOwnerFinalDecisionBrief?.status
        ? `${ownerFinalDecisionBriefSummary.decision_options ?? 0} options, unlock ${ownerFinalDecisionBriefSummary.unlock_options ?? 0}, failures ${ownerFinalDecisionBriefSummary.failures ?? 0}`
        : 'missing owner final decision brief',
      owner_action_required: true,
      route_hint: 'Single owner-facing source-root decision surface',
      source_ref: refs.sourceRootOwnerFinalDecisionBrief
    },
    {
      id: 'source-root-owner-choice-consequence-matrix',
      title: 'Source Root Owner Choice Consequence Matrix',
      status: reports.sourceRootOwnerChoiceConsequenceMatrix?.status === 'source_root_owner_choice_consequence_matrix_ready'
        ? 'owner_action'
        : 'needs_review',
      signal: reports.sourceRootOwnerChoiceConsequenceMatrix?.status
        ? `${ownerChoiceConsequenceMatrixSummary.choices ?? 0} choices, unlock ${ownerChoiceConsequenceMatrixSummary.unlock_choices ?? 0}, blocked ${ownerChoiceConsequenceMatrixSummary.blocked_choices ?? 0}, failures ${ownerChoiceConsequenceMatrixSummary.failures ?? 0}`
        : 'missing owner choice consequence matrix',
      owner_action_required: true,
      route_hint: 'Preview consequences before recording an owner source-root choice',
      source_ref: refs.sourceRootOwnerChoiceConsequenceMatrix
    },
    {
      id: 'source-root-activation',
      title: 'Source Root Activation',
      status: activationSummary.activation_ready === true
        ? 'ready'
        : reports.sourceRootActivation?.status === 'source_root_activation_needs_contract_review'
          ? 'needs_review'
          : 'blocked',
      signal: activationSummary.activation_ready === true
        ? `activation ready for ${activationSummary.selected_root_path}`
        : `${reports.sourceRootActivation?.status || 'missing'}, safe commands ${activationSummary.safe_command_count ?? 0}, blocked ${activationSummary.blocked_command_count ?? 0}`,
      owner_action_required: activationSummary.activation_ready !== true,
      route_hint: 'Post-source-root safe activation sequence',
      source_ref: refs.sourceRootActivation
    },
    {
      id: 'local-models',
      title: 'Local Models',
      status: reports.localModelInventory?.status === 'local_model_inventory_ready_review_only' ? 'review_only_ready' : 'needs_review',
      signal: `${modelSummary.ready_roles ?? 0}/${modelSummary.required_roles ?? 0} roles, ${modelSummary.ollama_model_count ?? 0} Ollama models, ${modelSummary.total_visible_ollama_size_gb ?? 0} GB`,
      owner_action_required: false,
      route_hint: 'Ollama/Odysseus local worker readiness',
      source_ref: refs.localModelInventory
    },
    {
      id: 'local-worker-http-runner',
      title: 'Local Worker HTTP Runner',
      status: ['local_worker_http_runner_dry_run_ready', 'local_worker_http_runner_executed_review_only'].includes(localWorkerHttpRunner.status) &&
        localWorkerHttpRunnerCheck.status === 'local_worker_http_runner_guard_passed'
        ? 'review_only_ready'
        : 'needs_review',
      signal: localWorkerHttpRunner.status
        ? `${localWorkerHttpRunner.status}, check ${localWorkerHttpRunnerCheck.status || 'missing'}, safe inputs ${localWorkerHttpRunnerGuard.safe_inputs?.length ?? 0}`
        : 'missing runner report',
      owner_action_required: false,
      route_hint: 'Guarded HTTP/JSON bridge for local LLM task execution',
      source_ref: refs.localWorkerHttpRunner
    },
    {
      id: 'local-worker-execution-runbook',
      title: 'Local Worker Execution Runbook',
      status: ['local_worker_execution_runbook_idle_review_only', 'local_worker_execution_runbook_has_executable_tasks'].includes(localWorkerExecutionRunbook.status) &&
        localWorkerExecutionRunbookCheck.status === 'local_worker_execution_runbook_guard_passed'
        ? 'review_only_ready'
        : 'needs_review',
      signal: localWorkerExecutionRunbook.status
        ? `${localWorkerExecutionRunbook.status}, check ${localWorkerExecutionRunbookCheck.status || 'missing'}, executable now ${localWorkerExecutionRunbookSummary.execute_allowed_if_output_missing ?? 0}`
        : 'missing execution runbook',
      owner_action_required: false,
      route_hint: 'Safe command map for local worker task execution',
      source_ref: refs.localWorkerExecutionRunbook
    },
    {
      id: 'local-worker-output-contracts',
      title: 'Local Worker Output Contracts',
      status: reports.localWorkerOutputContractReview?.status === 'local_worker_output_contract_review_ready' &&
        reports.localWorkerOutputContractReviewCheck?.status === 'local_worker_output_contract_review_guard_passed'
        ? 'review_only_ready'
        : 'needs_review',
      signal: `${localWorkerOutputContractSummary.contracts ?? 0} contracts, present ${localWorkerOutputContractSummary.present_valid_outputs ?? 0}, repo ${localWorkerOutputContractSummary.repo_conversion_allowed_now ?? 0}, execute ${localWorkerOutputContractSummary.execute_allowed_now ?? 0}, failures ${localWorkerOutputContractCheckSummary.failures ?? 0}`,
      owner_action_required: false,
      route_hint: 'Review local worker output contracts without reading private output bodies',
      source_ref: refs.localWorkerOutputContractReview
    },
    {
      id: 'source-independent-work-queue',
      title: 'Source-Independent Work Queue',
      status: reports.sourceIndependentWorkQueue?.status === 'source_independent_work_queue_ready'
        ? 'review_only_ready'
        : 'needs_review',
      signal: reports.sourceIndependentWorkQueue?.status
        ? `${sourceIndependentWorkQueueSummary.tasks ?? 0} tasks, completed ${sourceIndependentWorkQueueSummary.completed_review_only ?? 0}, codex ${sourceIndependentWorkQueueSummary.codex_executable_now ?? 0}, owner ${sourceIndependentWorkQueueSummary.owner_actions ?? 0}, failures ${sourceIndependentWorkQueueSummary.failures ?? 0}`
        : 'missing source-independent work queue',
      owner_action_required: (sourceIndependentWorkQueueSummary.owner_actions ?? 0) > 0,
      route_hint: 'Safe work that does not require private source-root activation',
      source_ref: refs.sourceIndependentWorkQueue
    },
    {
      id: 'private-metadata-inventory',
      title: 'Private Metadata Inventory',
      status: reports.privateMetadataInventory?.status === 'private_metadata_inventory_ready_private_output_written'
        ? 'review_only_ready'
        : reports.privateMetadataInventory?.status === 'private_metadata_inventory_blocked_until_activation'
          ? reports.privateMetadataInventoryFixture?.status === 'private_metadata_inventory_fixture_passed' &&
            reports.privateMetadataInventoryCheck?.status === 'private_metadata_inventory_guard_passed'
            ? 'blocked_with_smoke_passed'
            : 'blocked'
          : 'needs_review',
      signal: reports.privateMetadataInventory?.status === 'private_metadata_inventory_blocked_until_activation'
        ? `blocked until source-root activation; fixture ${privateInventoryFixtureSummary.total_candidate_matches ?? 0} matches; guard ${reports.privateMetadataInventoryCheck?.status || 'missing'}`
        : `${privateInventorySummary.total_candidate_matches ?? 0} candidates, scanned ${privateInventorySummary.files_scanned ?? 0} files`,
      owner_action_required: reports.privateMetadataInventory?.status === 'private_metadata_inventory_blocked_until_activation',
      route_hint: 'Pilot-scoped metadata-only inventory',
      source_ref: refs.privateMetadataInventory
    },
    {
      id: 'pilot-references',
      title: 'Pilot References',
      status: reports.sweep?.status === 'kosmodata_lane_sweep_review_only_passed' ? 'review_only' : 'needs_review',
      signal: `${sweepSummary.pilot_evidence_pilots ?? 0} pilots, ${sweepSummary.pilot_evidence_total_gaps ?? 0} evidence gaps`,
      owner_action_required: (sweepSummary.human_queue_open_items ?? 0) > 0,
      route_hint: 'Villa Savoye / Sogn Benedetg / Ingenbohl',
      source_ref: refs.sweep
    },
    {
      id: 'pilot-gap-labels',
      title: 'Pilot Gap Labels',
      status: reports.pilotGapLabelReview?.status === 'pilot_gap_label_review_ready' &&
        reports.pilotGapLabelReviewCheck?.status === 'pilot_gap_label_review_guard_passed'
        ? 'review_only_ready'
        : 'needs_review',
      signal: `${pilotGapLabelSummary.gap_labels ?? 0} labels, ${pilotGapLabelSummary.hard_blockers ?? 0} hard blockers, owner ${pilotGapLabelSummary.owner_decisions_required ?? 0}, failures ${pilotGapLabelCheckSummary.failures ?? 0}`,
      owner_action_required: (pilotGapLabelSummary.owner_decisions_required ?? 0) > 0,
      route_hint: 'Review-only pilot gap labels and worker routing',
      source_ref: refs.pilotGapLabelReview
    },
    {
      id: 'kosmoasset',
      title: 'KosmoAsset',
      status: sweepSummary.asset_promotion_allowed === true ? 'ready' : 'review_only',
      signal: `${sweepSummary.asset_open_human_reviews ?? 0} human reviews open, public-ready ${sweepSummary.asset_public_ready_count ?? 0}`,
      owner_action_required: (sweepSummary.asset_open_human_reviews ?? 0) > 0,
      route_hint: 'Review-only seed asset lane',
      source_ref: refs.sweep
    },
    {
      id: 'asset-reference-bridge',
      title: 'Asset Reference Bridge',
      status: reports.assetBridge?.status === 'kosmoasset_reference_bridge_review_only_passed' ? 'review_only_ready' : 'needs_review',
      signal: `${assetBridgeSummary.complete_pilot_bridges ?? 0}/${assetBridgeSummary.pilots ?? 0} pilot bridges, ${assetBridgeSummary.asset_count ?? 0} assets, public-ready ${assetBridgeSummary.public_ready_count ?? 0}`,
      owner_action_required: (assetBridgeSummary.open_human_review_count ?? 0) > 0,
      route_hint: 'Villa/Sogn/Ingenbohl asset derivation gate',
      source_ref: refs.assetBridge
    },
    {
      id: 'asset-source-candidates',
      title: 'Asset Source Candidates',
      status: reports.assetSourceCandidateMap?.status === 'kosmoasset_source_candidate_map_review_only_ready' ? 'review_only_ready' : 'needs_review',
      signal: `${assetSourceCandidateSummary.asset_lane_candidates ?? 0} asset-lane candidates, material ${assetSourceCandidateSummary.material_library_candidates ?? 0}, public-ready ${assetSourceCandidateSummary.public_ready_after_map ?? 0}`,
      owner_action_required: (assetSourceCandidateSummary.asset_lane_candidates ?? 0) > 0,
      route_hint: 'Map source-root candidates into KosmoAsset lanes without ingestion',
      source_ref: refs.assetSourceCandidateMap
    },
    {
      id: 'asset-candidate-taxonomy',
      title: 'Asset Candidate Taxonomy',
      status: reports.assetCandidateTaxonomyReview?.status === 'kosmoasset_candidate_taxonomy_review_ready' &&
        reports.assetCandidateTaxonomyReviewCheck?.status === 'kosmoasset_candidate_taxonomy_review_guard_passed'
        ? 'review_only_ready'
        : 'needs_review',
      signal: `${assetCandidateTaxonomySummary.candidate_reviews ?? 0} reviews, ${assetCandidateTaxonomySummary.reviewable_asset_lanes ?? 0} reviewable, owner ${assetCandidateTaxonomySummary.owner_confirmations_required ?? 0}, failures ${assetCandidateTaxonomyCheckSummary.failures ?? 0}`,
      owner_action_required: (assetCandidateTaxonomySummary.owner_confirmations_required ?? 0) > 0,
      route_hint: 'Review-only KosmoAsset lane contract without paths or ingestion',
      source_ref: refs.assetCandidateTaxonomyReview
    },
    {
      id: 'worker-boundary',
      title: 'Worker Boundary',
      status: reports.workerBoundary?.status === 'worker_boundary_pack_guard_passed' ? 'locked' : 'needs_review',
      signal: `${reports.workerBoundary?.summary?.worker_count ?? 0} workers, ${reports.workerBoundary?.summary?.blocked_commands ?? 0} blocked command classes`,
      owner_action_required: false,
      route_hint: 'Local LLM / Codex / Claude task boundary',
      source_ref: refs.workerBoundary
    },
    {
      id: 'innovation',
      title: 'Innovation Lanes',
      status: reports.innovationSmoke?.status === 'innovation_smoke_passed_review_only' ? 'review_only_ready' : 'needs_review',
      signal: `${innovationSummary.passed ?? 0}/${innovationSummary.checks ?? 0} public-safe smoke checks passed`,
      owner_action_required: false,
      route_hint: 'MarkItDown / IfcOpenShell / Qwen / OCR / Paper2Poster',
      source_ref: refs.innovationSmoke
    },
    {
      id: 'owner-handoff',
      title: 'Owner Handoff',
      status: reports.ownerPacket?.status === 'owner_review_packet_guard_passed' ? 'ready' : 'needs_review',
      signal: '6 questions, no filled answers recorded',
      owner_action_required: true,
      route_hint: 'Present source-root and review packet questions',
      source_ref: refs.ownerPacket
    }
  ];
  const blockingCards = cards.filter((card) => card.status === 'blocked' || card.status.startsWith('blocked_') || card.status === 'needs_review');
  const ownerActionCards = cards.filter((card) => card.owner_action_required);

  return {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    status: blockingCards.length === 0 ? 'orbit_bridge_all_ready_review_only' : 'orbit_bridge_ready_with_blockers',
    policy: {
      dashboard_only: true,
      records_decisions: false,
      reads_private_content: false,
      copies_private_content: false,
      writes_public_files: false,
      writes_public_manifest: false,
      public_ready_after_bridge: 0,
      note: 'This bridge is a dashboard contract for KosmoOrbit. It summarizes existing guard reports only and does not unlock private work.'
    },
    source_refs: Object.values(refs),
    summary: {
      cards: cards.length,
      blocking_cards: blockingCards.length,
      owner_action_cards: ownerActionCards.length,
      source_root_blocked: sourceSummary.private_diagnostic_allowed !== true,
      day_batch_status: reports.dayBatch?.status || null,
      source_root_decision_refresh_status: reports.sourceRootDecisionRefresh?.status || null,
      source_root_decision_refresh_changed: decisionRefreshSummary.changed === true,
      source_root_decision_refresh_options: decisionRefreshSummary.refreshed_options ?? null,
      source_root_decision_refresh_failures: decisionRefreshSummary.failures ?? null,
      source_root_candidate_integrity_status: reports.sourceRootCandidateIntegrity?.status || null,
      source_root_candidate_integrity_existing_paths: candidateIntegritySummary.existing_path_options ?? null,
      source_root_candidate_integrity_exact_roots: candidateIntegritySummary.owner_confirmable_exact_roots ?? null,
      source_root_candidate_integrity_failures: candidateIntegritySummary.failures ?? null,
      source_root_owner_action_status: reports.sourceRootOwnerAction?.status || null,
      source_root_owner_recommended_decision: ownerActionSummary.recommended_decision || null,
      source_root_owner_decision_packet_status: reports.sourceRootOwnerDecisionPacket?.status || null,
      source_root_owner_decision_packet_templates: ownerDecisionPacketSummary.decision_templates ?? null,
      source_root_owner_decision_packet_exact_roots: ownerDecisionPacketSummary.owner_confirmable_exact_roots ?? null,
      source_root_owner_decision_packet_failures: ownerDecisionPacketSummary.failures ?? null,
      source_root_owner_decision_packet_check_status: reports.sourceRootOwnerDecisionPacketCheck?.status || null,
      source_root_owner_decision_packet_check_failures: ownerDecisionPacketCheckSummary.failures ?? null,
      source_root_owner_decision_packet_check_warnings: ownerDecisionPacketCheckSummary.warnings ?? null,
      source_root_decision_dry_run_status: reports.sourceRootDecisionDryRun?.status || null,
      source_root_decision_dry_run_scenarios: decisionDryRunSummary.scenarios ?? null,
      source_root_decision_dry_run_metadata_scenarios: decisionDryRunSummary.metadata_diagnostic_scenarios ?? null,
      source_root_decision_dry_run_failures: decisionDryRunSummary.failures ?? null,
      source_root_post_owner_activation_queue_status: reports.sourceRootPostOwnerActivationQueue?.status || null,
      source_root_post_owner_activation_queue_steps: postOwnerActivationQueueSummary.queue_steps ?? null,
      source_root_post_owner_activation_queue_executable_now: postOwnerActivationQueueSummary.executable_now ?? null,
      source_root_post_owner_activation_queue_blocked_now: postOwnerActivationQueueSummary.blocked_now ?? null,
      source_root_post_owner_activation_queue_failures: postOwnerActivationQueueSummary.failures ?? null,
      source_root_post_owner_activation_queue_check_status: reports.sourceRootPostOwnerActivationQueueCheck?.status || null,
      source_root_post_owner_activation_queue_check_failures: postOwnerActivationQueueCheckSummary.failures ?? null,
      source_root_post_owner_activation_queue_check_warnings: postOwnerActivationQueueCheckSummary.warnings ?? null,
      source_root_owner_final_decision_brief_status: reports.sourceRootOwnerFinalDecisionBrief?.status || null,
      source_root_owner_final_decision_brief_options: ownerFinalDecisionBriefSummary.decision_options ?? null,
      source_root_owner_final_decision_brief_unlock_options: ownerFinalDecisionBriefSummary.unlock_options ?? null,
      source_root_owner_final_decision_brief_failures: ownerFinalDecisionBriefSummary.failures ?? null,
      source_root_owner_choice_consequence_matrix_status: reports.sourceRootOwnerChoiceConsequenceMatrix?.status || null,
      source_root_owner_choice_consequence_matrix_choices: ownerChoiceConsequenceMatrixSummary.choices ?? null,
      source_root_owner_choice_consequence_matrix_unlock_choices: ownerChoiceConsequenceMatrixSummary.unlock_choices ?? null,
      source_root_owner_choice_consequence_matrix_blocked_choices: ownerChoiceConsequenceMatrixSummary.blocked_choices ?? null,
      source_root_owner_choice_consequence_matrix_failures: ownerChoiceConsequenceMatrixSummary.failures ?? null,
      source_root_activation_status: reports.sourceRootActivation?.status || null,
      private_metadata_inventory_status: reports.privateMetadataInventory?.status || null,
      private_metadata_inventory_fixture_status: reports.privateMetadataInventoryFixture?.status || null,
      private_metadata_inventory_check_status: reports.privateMetadataInventoryCheck?.status || null,
      local_model_inventory_status: reports.localModelInventory?.status || null,
      local_worker_http_runner_status: localWorkerHttpRunner.status || null,
      local_worker_http_runner_guard_passed: localWorkerHttpRunnerGuard.passed === true,
      local_worker_http_runner_safe_inputs: localWorkerHttpRunnerGuard.safe_inputs?.length ?? null,
      local_worker_http_runner_check_status: localWorkerHttpRunnerCheck.status || null,
      local_worker_http_runner_check_failures: localWorkerHttpRunnerCheck.summary?.failures ?? null,
      local_worker_execution_runbook_status: localWorkerExecutionRunbook.status || null,
      local_worker_execution_runbook_runner_safe_tasks: localWorkerExecutionRunbookSummary.runner_safe_tasks ?? null,
      local_worker_execution_runbook_executable_now: localWorkerExecutionRunbookSummary.execute_allowed_if_output_missing ?? null,
      local_worker_execution_runbook_check_status: localWorkerExecutionRunbookCheck.status || null,
      local_worker_execution_runbook_check_failures: localWorkerExecutionRunbookCheck.summary?.failures ?? null,
      local_worker_output_contract_review_status: reports.localWorkerOutputContractReview?.status || null,
      local_worker_output_contract_review_contracts: localWorkerOutputContractSummary.contracts ?? null,
      local_worker_output_contract_review_present_valid: localWorkerOutputContractSummary.present_valid_outputs ?? null,
      local_worker_output_contract_review_repo_conversion_now: localWorkerOutputContractSummary.repo_conversion_allowed_now ?? null,
      local_worker_output_contract_review_execute_allowed_now: localWorkerOutputContractSummary.execute_allowed_now ?? null,
      local_worker_output_contract_review_check_status: reports.localWorkerOutputContractReviewCheck?.status || null,
      local_worker_output_contract_review_check_failures: localWorkerOutputContractCheckSummary.failures ?? null,
      source_independent_work_queue_status: reports.sourceIndependentWorkQueue?.status || null,
      source_independent_work_queue_tasks: sourceIndependentWorkQueueSummary.tasks ?? null,
      source_independent_work_queue_completed_review_only: sourceIndependentWorkQueueSummary.completed_review_only ?? null,
      source_independent_work_queue_codex_executable_now: sourceIndependentWorkQueueSummary.codex_executable_now ?? null,
      source_independent_work_queue_owner_actions: sourceIndependentWorkQueueSummary.owner_actions ?? null,
      source_independent_work_queue_failures: sourceIndependentWorkQueueSummary.failures ?? null,
      pilot_gap_label_review_status: reports.pilotGapLabelReview?.status || null,
      pilot_gap_label_review_labels: pilotGapLabelSummary.gap_labels ?? null,
      pilot_gap_label_review_hard_blockers: pilotGapLabelSummary.hard_blockers ?? null,
      pilot_gap_label_review_owner_decisions: pilotGapLabelSummary.owner_decisions_required ?? null,
      pilot_gap_label_review_check_status: reports.pilotGapLabelReviewCheck?.status || null,
      pilot_gap_label_review_check_failures: pilotGapLabelCheckSummary.failures ?? null,
      asset_bridge_status: reports.assetBridge?.status || null,
      asset_source_candidate_map_status: reports.assetSourceCandidateMap?.status || null,
      asset_source_candidate_map_candidates: assetSourceCandidateSummary.asset_lane_candidates ?? null,
      asset_candidate_taxonomy_review_status: reports.assetCandidateTaxonomyReview?.status || null,
      asset_candidate_taxonomy_review_candidates: assetCandidateTaxonomySummary.candidate_reviews ?? null,
      asset_candidate_taxonomy_review_reviewable_lanes: assetCandidateTaxonomySummary.reviewable_asset_lanes ?? null,
      asset_candidate_taxonomy_review_owner_confirmations: assetCandidateTaxonomySummary.owner_confirmations_required ?? null,
      asset_candidate_taxonomy_review_check_status: reports.assetCandidateTaxonomyReviewCheck?.status || null,
      asset_candidate_taxonomy_review_check_failures: assetCandidateTaxonomyCheckSummary.failures ?? null,
      innovation_smoke_status: reports.innovationSmoke?.status || null,
      public_ready_after_bridge: 0
    },
    orbit_cards: cards,
    recommended_orbit_sections: [
      'status_strip',
      'local_models_card',
      'local_worker_http_runner_card',
      'local_worker_execution_runbook_card',
      'local_worker_output_contract_card',
      'source_independent_work_queue_card',
      'source_root_blocker_card',
      'source_root_decision_refresh_card',
      'source_root_candidate_integrity_card',
      'source_root_owner_action_card',
      'source_root_owner_decision_packet_card',
      'source_root_owner_decision_packet_check_card',
      'source_root_decision_dry_run_card',
      'source_root_post_owner_activation_queue_card',
      'source_root_post_owner_activation_queue_check_card',
      'source_root_owner_final_decision_brief_card',
      'source_root_owner_choice_consequence_matrix_card',
      'source_root_activation_card',
      'private_metadata_inventory_card',
      'pilot_reference_cards',
      'pilot_gap_label_card',
      'asset_reference_bridge_card',
      'asset_source_candidate_map_card',
      'asset_candidate_taxonomy_card',
      'worker_boundary_card',
      'innovation_lane_card',
      'owner_handoff_card'
    ],
    next_actions: [
      'KosmoOrbit can render orbit_cards as a read-only dashboard.',
      'Do not add action buttons for blocked private commands until source-root passes.',
      'Use owner_action_required cards to prepare the next owner review conversation.'
    ]
  };
}

async function readOptionalJson(path) {
  try {
    return JSON.parse(await readFile(resolve(root, path), 'utf8'));
  } catch {
    return null;
  }
}

function renderMarkdown(bridge) {
  const lines = [];
  lines.push('# Kosmo Orbit Status Bridge');
  lines.push('');
  lines.push(`Generated: ${bridge.generated_at}`);
  lines.push(`Status: \`${bridge.status}\``);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Cards: ${bridge.summary.cards}`);
  lines.push(`- Blocking cards: ${bridge.summary.blocking_cards}`);
  lines.push(`- Owner action cards: ${bridge.summary.owner_action_cards}`);
  lines.push(`- Source root blocked: ${bridge.summary.source_root_blocked ? 'yes' : 'no'}`);
  lines.push(`- Day batch: ${bridge.summary.day_batch_status}`);
  lines.push(`- Source-root decision refresh: ${bridge.summary.source_root_decision_refresh_status}, changed ${bridge.summary.source_root_decision_refresh_changed ? 'yes' : 'no'}, options ${bridge.summary.source_root_decision_refresh_options ?? '-'}, failures ${bridge.summary.source_root_decision_refresh_failures ?? '-'}`);
  lines.push(`- Source-root candidate integrity: ${bridge.summary.source_root_candidate_integrity_status}, existing ${bridge.summary.source_root_candidate_integrity_existing_paths ?? '-'}, exact roots ${bridge.summary.source_root_candidate_integrity_exact_roots ?? '-'}, failures ${bridge.summary.source_root_candidate_integrity_failures ?? '-'}`);
  lines.push(`- Source-root owner action: ${bridge.summary.source_root_owner_action_status}`);
  lines.push(`- Source-root recommended decision: ${bridge.summary.source_root_owner_recommended_decision}`);
  lines.push(`- Source-root owner decision packet: ${bridge.summary.source_root_owner_decision_packet_status}, templates ${bridge.summary.source_root_owner_decision_packet_templates ?? '-'}, exact roots ${bridge.summary.source_root_owner_decision_packet_exact_roots ?? '-'}, failures ${bridge.summary.source_root_owner_decision_packet_failures ?? '-'}`);
  lines.push(`- Source-root owner decision packet check: ${bridge.summary.source_root_owner_decision_packet_check_status}, failures ${bridge.summary.source_root_owner_decision_packet_check_failures ?? '-'}, warnings ${bridge.summary.source_root_owner_decision_packet_check_warnings ?? '-'}`);
  lines.push(`- Source-root decision dry run: ${bridge.summary.source_root_decision_dry_run_status}, scenarios ${bridge.summary.source_root_decision_dry_run_scenarios ?? '-'}, metadata scenarios ${bridge.summary.source_root_decision_dry_run_metadata_scenarios ?? '-'}, failures ${bridge.summary.source_root_decision_dry_run_failures ?? '-'}`);
  lines.push(`- Source-root post-owner activation queue: ${bridge.summary.source_root_post_owner_activation_queue_status}, steps ${bridge.summary.source_root_post_owner_activation_queue_steps ?? '-'}, executable ${bridge.summary.source_root_post_owner_activation_queue_executable_now ?? '-'}, blocked ${bridge.summary.source_root_post_owner_activation_queue_blocked_now ?? '-'}, failures ${bridge.summary.source_root_post_owner_activation_queue_failures ?? '-'}`);
  lines.push(`- Source-root post-owner activation queue check: ${bridge.summary.source_root_post_owner_activation_queue_check_status}, failures ${bridge.summary.source_root_post_owner_activation_queue_check_failures ?? '-'}, warnings ${bridge.summary.source_root_post_owner_activation_queue_check_warnings ?? '-'}`);
  lines.push(`- Source-root owner final decision brief: ${bridge.summary.source_root_owner_final_decision_brief_status}, options ${bridge.summary.source_root_owner_final_decision_brief_options ?? '-'}, unlock options ${bridge.summary.source_root_owner_final_decision_brief_unlock_options ?? '-'}, failures ${bridge.summary.source_root_owner_final_decision_brief_failures ?? '-'}`);
  lines.push(`- Source-root owner choice consequence matrix: ${bridge.summary.source_root_owner_choice_consequence_matrix_status}, choices ${bridge.summary.source_root_owner_choice_consequence_matrix_choices ?? '-'}, unlock ${bridge.summary.source_root_owner_choice_consequence_matrix_unlock_choices ?? '-'}, blocked ${bridge.summary.source_root_owner_choice_consequence_matrix_blocked_choices ?? '-'}, failures ${bridge.summary.source_root_owner_choice_consequence_matrix_failures ?? '-'}`);
  lines.push(`- Source-root activation: ${bridge.summary.source_root_activation_status}`);
  lines.push(`- Private metadata inventory: ${bridge.summary.private_metadata_inventory_status}`);
  lines.push(`- Private metadata inventory fixture: ${bridge.summary.private_metadata_inventory_fixture_status}`);
  lines.push(`- Private metadata inventory check: ${bridge.summary.private_metadata_inventory_check_status}`);
  lines.push(`- Local models: ${bridge.summary.local_model_inventory_status}`);
  lines.push(`- Local worker HTTP runner: ${bridge.summary.local_worker_http_runner_status}, check ${bridge.summary.local_worker_http_runner_check_status}, safe inputs ${bridge.summary.local_worker_http_runner_safe_inputs ?? '-'}`);
  lines.push(`- Local worker execution runbook: ${bridge.summary.local_worker_execution_runbook_status}, check ${bridge.summary.local_worker_execution_runbook_check_status}, executable now ${bridge.summary.local_worker_execution_runbook_executable_now ?? '-'}`);
  lines.push(`- Local worker output contracts: ${bridge.summary.local_worker_output_contract_review_status}, contracts ${bridge.summary.local_worker_output_contract_review_contracts ?? '-'}, present valid ${bridge.summary.local_worker_output_contract_review_present_valid ?? '-'}, repo conversion now ${bridge.summary.local_worker_output_contract_review_repo_conversion_now ?? '-'}, execute now ${bridge.summary.local_worker_output_contract_review_execute_allowed_now ?? '-'}, check ${bridge.summary.local_worker_output_contract_review_check_status}, failures ${bridge.summary.local_worker_output_contract_review_check_failures ?? '-'}`);
  lines.push(`- Source-independent work queue: ${bridge.summary.source_independent_work_queue_status}, tasks ${bridge.summary.source_independent_work_queue_tasks ?? '-'}, completed ${bridge.summary.source_independent_work_queue_completed_review_only ?? '-'}, codex executable ${bridge.summary.source_independent_work_queue_codex_executable_now ?? '-'}, owner actions ${bridge.summary.source_independent_work_queue_owner_actions ?? '-'}, failures ${bridge.summary.source_independent_work_queue_failures ?? '-'}`);
  lines.push(`- Pilot gap label review: ${bridge.summary.pilot_gap_label_review_status}, labels ${bridge.summary.pilot_gap_label_review_labels ?? '-'}, hard blockers ${bridge.summary.pilot_gap_label_review_hard_blockers ?? '-'}, owner decisions ${bridge.summary.pilot_gap_label_review_owner_decisions ?? '-'}, check ${bridge.summary.pilot_gap_label_review_check_status}, failures ${bridge.summary.pilot_gap_label_review_check_failures ?? '-'}`);
  lines.push(`- Asset bridge: ${bridge.summary.asset_bridge_status}`);
  lines.push(`- Asset source candidate map: ${bridge.summary.asset_source_candidate_map_status}, candidates ${bridge.summary.asset_source_candidate_map_candidates ?? '-'}`);
  lines.push(`- Asset candidate taxonomy review: ${bridge.summary.asset_candidate_taxonomy_review_status}, candidates ${bridge.summary.asset_candidate_taxonomy_review_candidates ?? '-'}, reviewable ${bridge.summary.asset_candidate_taxonomy_review_reviewable_lanes ?? '-'}, owner confirmations ${bridge.summary.asset_candidate_taxonomy_review_owner_confirmations ?? '-'}, check ${bridge.summary.asset_candidate_taxonomy_review_check_status}, failures ${bridge.summary.asset_candidate_taxonomy_review_check_failures ?? '-'}`);
  lines.push(`- Innovation smoke: ${bridge.summary.innovation_smoke_status}`);
  lines.push(`- Public-ready after bridge: ${bridge.summary.public_ready_after_bridge}`);
  lines.push('');
  lines.push('## Orbit Cards');
  lines.push('');
  lines.push('| Card | Status | Owner Action | Signal |');
  lines.push('| --- | --- | --- | --- |');
  bridge.orbit_cards.forEach((card) => {
    lines.push(`| \`${card.id}\` ${escapePipe(card.title)} | ${card.status} | ${card.owner_action_required ? 'yes' : 'no'} | ${escapePipe(card.signal)} |`);
  });
  lines.push('');
  lines.push('## Recommended Orbit Sections');
  lines.push('');
  bridge.recommended_orbit_sections.forEach((section) => lines.push(`- \`${section}\``));
  lines.push('');
  lines.push('## Next Actions');
  lines.push('');
  bridge.next_actions.forEach((action) => lines.push(`- ${action}`));
  lines.push('');
  return `${lines.join('\n')}`;
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
