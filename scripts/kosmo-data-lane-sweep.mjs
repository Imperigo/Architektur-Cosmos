#!/usr/bin/env node

import { spawn } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = new Date().toISOString().slice(0, 10);
const outputJson = resolve(root, args.out || `data/kosmodata-lane-sweep-${dateStamp}.json`);
const outputMd = resolve(root, args.markdown || `docs/codex/kosmodata-lane-sweep-${dateStamp}.md`);
const assetLibrary = args.assetLibrary || 'examples/kosmo-assets/kosmoreferences-pilot-seed-library-2026-06-13/library.json';
const timeoutMs = Number(args.timeoutMs || 180000);
const dataReport = (name) => `data/${name}-${dateStamp}.json`;
const privateInventoryTemplate = `examples/kosmo-references/private-inventory/private-inventory-output-template-${dateStamp}.json`;
const ownerAnswerIntakeTemplate = `examples/kosmo-references/provenance/owner-answer-intake-template-${dateStamp}.json`;

const steps = [
  {
    id: 'kosmoreferences_nightly_gate',
    label: 'KosmoReferences Nightly Gate',
    command: 'npm',
    args: ['run', 'kosmo:references-nightly-gate'],
    report: dataReport('kosmoreferences-nightly-gate')
  },
  {
    id: 'kosmoasset_seed_full_review',
    label: 'KosmoAsset Seed Full Review',
    command: 'npm',
    args: ['run', 'kosmo:asset-full-review', '--', '--library', assetLibrary],
    report: 'examples/kosmo-assets/kosmoreferences-pilot-seed-library-2026-06-13/review/asset-full-review.generated.json'
  },
  {
    id: 'human_decision_queue',
    label: 'Human Decision Queue',
    command: 'npm',
    args: ['run', 'kosmo:human-decision-queue'],
    report: dataReport('kosmo-human-decision-queue')
  },
  {
    id: 'owner_decision_batches',
    label: 'Owner Decision Batches',
    command: 'npm',
    args: ['run', 'kosmo:human-decision-owner-batches'],
    report: dataReport('kosmo-human-decision-owner-batches')
  },
  {
    id: 'owner_review_batch_resolution_ledger',
    label: 'Owner Review Batch Resolution Ledger',
    command: 'npm',
    args: ['run', 'kosmo:owner-review-batch-resolution-ledger'],
    report: dataReport('kosmo-owner-review-batch-resolution-ledger')
  },
  {
    id: 'owner_review_batch_resolution_ledger_check',
    label: 'Owner Review Batch Resolution Ledger Check',
    command: 'npm',
    args: ['run', 'kosmo:owner-review-batch-resolution-ledger-check'],
    report: dataReport('kosmo-owner-review-batch-resolution-ledger-check')
  },
  {
    id: 'local_worker_output_review',
    label: 'Local Worker Output Review',
    command: 'npm',
    args: ['run', 'kosmo:local-worker-output-review'],
    report: dataReport('kosmo-local-worker-output-review')
  },
  {
    id: 'pilot_evidence_matrix',
    label: 'Pilot Evidence Matrix',
    command: 'npm',
    args: ['run', 'kosmo:pilot-evidence-matrix'],
    report: dataReport('kosmoreferences-pilot-evidence-matrix')
  },
  {
    id: 'villa_provenance_review_brief',
    label: 'Villa Savoye Provenance Review Brief',
    command: 'npm',
    args: ['run', 'kosmo:villa-provenance-brief'],
    report: dataReport('villa-savoye-provenance-review-brief')
  },
  {
    id: 'ingenbohl_pdf_extraction_brief',
    label: 'Ingenbohl PDF Extraction Brief',
    command: 'npm',
    args: ['run', 'kosmo:ingenbohl-pdf-brief'],
    report: dataReport('ingenbohl-pdf-extraction-decision-brief')
  },
  {
    id: 'sogn_source_root_brief',
    label: 'Sogn Benedetg Source-Root Brief',
    command: 'npm',
    args: ['run', 'kosmo:sogn-source-root-brief'],
    report: dataReport('sogn-benedetg-source-root-decision-brief')
  },
  {
    id: 'source_root_locator',
    label: 'Source Root Locator',
    command: 'npm',
    args: ['run', 'kosmo:source-root-locator'],
    report: dataReport('kosmo-source-root-locator')
  },
  {
    id: 'source_root_selection_brief',
    label: 'Source Root Selection Brief',
    command: 'npm',
    args: ['run', 'kosmo:source-root-selection-brief'],
    report: dataReport('kosmo-source-root-selection-brief')
  },
  {
    id: 'source_root_decision_session_check',
    label: 'Source Root Decision Session Check',
    command: 'npm',
    args: ['run', 'kosmo:source-root-decision-session-check'],
    report: dataReport('kosmo-source-root-decision-session-check')
  },
  {
    id: 'private_source_inventory_plan',
    label: 'Private Source Inventory Plan',
    command: 'npm',
    args: ['run', 'kosmo:private-source-inventory-plan'],
    report: dataReport('kosmo-private-source-inventory-plan')
  },
  {
    id: 'private_inventory_output_template',
    label: 'Private Inventory Output Template',
    command: 'npm',
    args: ['run', 'kosmo:private-inventory-output-template'],
    report: privateInventoryTemplate
  },
  {
    id: 'private_inventory_output_check',
    label: 'Private Inventory Output Check',
    command: 'npm',
    args: ['run', 'kosmo:private-inventory-output-check', '--', '--inventory', privateInventoryTemplate],
    report: dataReport('kosmo-private-inventory-output-check')
  },
  {
    id: 'owner_next_review_brief',
    label: 'Owner Next Review Brief',
    command: 'npm',
    args: ['run', 'kosmo:owner-next-review-brief'],
    report: dataReport('kosmo-owner-next-review-brief')
  },
  {
    id: 'owner_review_card_set',
    label: 'Owner Review Card Set',
    command: 'npm',
    args: ['run', 'kosmo:owner-review-card-set'],
    report: dataReport('kosmo-owner-review-card-set')
  },
  {
    id: 'owner_answer_sheet',
    label: 'Owner Answer Sheet',
    command: 'npm',
    args: ['run', 'kosmo:owner-answer-sheet'],
    report: dataReport('kosmo-owner-answer-sheet')
  },
  {
    id: 'owner_answer_sheet_check',
    label: 'Owner Answer Sheet Check',
    command: 'npm',
    args: ['run', 'kosmo:owner-answer-sheet-check'],
    report: dataReport('kosmo-owner-answer-sheet-check')
  },
  {
    id: 'owner_answer_intake_template',
    label: 'Owner Answer Intake Template',
    command: 'npm',
    args: ['run', 'kosmo:owner-answer-intake-template'],
    report: ownerAnswerIntakeTemplate
  },
  {
    id: 'owner_answer_intake_check',
    label: 'Owner Answer Intake Check',
    command: 'npm',
    args: ['run', 'kosmo:owner-answer-intake-check'],
    report: dataReport('kosmo-owner-answer-intake-check')
  },
  {
    id: 'owner_answer_session_edit_plan',
    label: 'Owner Answer Session Edit Plan',
    command: 'npm',
    args: ['run', 'kosmo:owner-answer-session-edit-plan'],
    report: dataReport('kosmo-owner-answer-session-edit-plan')
  },
  {
    id: 'owner_question_brief',
    label: 'Owner Question Brief',
    command: 'npm',
    args: ['run', 'kosmo:owner-question-brief'],
    report: dataReport('kosmo-owner-question-brief')
  },
  {
    id: 'owner_question_brief_check',
    label: 'Owner Question Brief Check',
    command: 'npm',
    args: ['run', 'kosmo:owner-question-brief-check'],
    report: dataReport('kosmo-owner-question-brief-check')
  }
];

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const startedAt = Date.now();
  const stepResults = [];
  for (const step of steps) {
    stepResults.push(await runStep(step));
  }

  const stepById = new Map(steps.map((step) => [step.id, step]));
  const reportPath = (id) => {
    const step = stepById.get(id);
    if (!step) throw new Error(`Unknown sweep step id: ${id}`);
    return resolve(root, step.report);
  };

  const referencesGate = await readOptionalJson(reportPath('kosmoreferences_nightly_gate'));
  const referencesStatus = await readOptionalJson(resolve(root, 'data/kosmoreferences-data-lane-status.json'));
  const assetFullReview = await readOptionalJson(reportPath('kosmoasset_seed_full_review'));
  const humanDecisionQueue = await readOptionalJson(reportPath('human_decision_queue'));
  const ownerDecisionBatches = await readOptionalJson(reportPath('owner_decision_batches'));
  const ownerReviewBatchResolutionLedger = await readOptionalJson(reportPath('owner_review_batch_resolution_ledger'));
  const ownerReviewBatchResolutionLedgerCheck = await readOptionalJson(reportPath('owner_review_batch_resolution_ledger_check'));
  const localWorkerReview = await readOptionalJson(reportPath('local_worker_output_review'));
  const pilotEvidenceMatrix = await readOptionalJson(reportPath('pilot_evidence_matrix'));
  const villaBrief = await readOptionalJson(reportPath('villa_provenance_review_brief'));
  const ingenbohlBrief = await readOptionalJson(reportPath('ingenbohl_pdf_extraction_brief'));
  const sognBrief = await readOptionalJson(reportPath('sogn_source_root_brief'));
  const sourceRootLocator = await readOptionalJson(reportPath('source_root_locator'));
  const sourceRootSelectionBrief = await readOptionalJson(reportPath('source_root_selection_brief'));
  const sourceRootDecisionSessionCheck = await readOptionalJson(reportPath('source_root_decision_session_check'));
  const privateSourceInventoryPlan = await readOptionalJson(reportPath('private_source_inventory_plan'));
  const privateInventoryOutputTemplate = await readOptionalJson(reportPath('private_inventory_output_template'));
  const privateInventoryOutputCheck = await readOptionalJson(reportPath('private_inventory_output_check'));
  const ownerNextReviewBrief = await readOptionalJson(reportPath('owner_next_review_brief'));
  const ownerReviewCardSet = await readOptionalJson(reportPath('owner_review_card_set'));
  const ownerAnswerSheet = await readOptionalJson(reportPath('owner_answer_sheet'));
  const ownerAnswerSheetCheck = await readOptionalJson(reportPath('owner_answer_sheet_check'));
  const ownerAnswerIntakeTemplate = await readOptionalJson(reportPath('owner_answer_intake_template'));
  const ownerAnswerIntakeCheck = await readOptionalJson(reportPath('owner_answer_intake_check'));
  const ownerAnswerSessionEditPlan = await readOptionalJson(reportPath('owner_answer_session_edit_plan'));
  const ownerQuestionBrief = await readOptionalJson(reportPath('owner_question_brief'));
  const ownerQuestionBriefCheck = await readOptionalJson(reportPath('owner_question_brief_check'));
  const ownerReviewPacket = null;
  const ownerReviewPacketCheck = null;
  const ownerReviewSessionBrief = null;
  const ownerReviewSessionBriefCheck = null;
  const failedSteps = stepResults.filter((step) => step.exit_code !== 0);
  const status = failedSteps.length
    ? 'kosmodata_lane_sweep_failed'
    : isReviewOnlyHealthy({ referencesGate, referencesStatus, assetFullReview, humanDecisionQueue, ownerDecisionBatches, ownerReviewBatchResolutionLedger, ownerReviewBatchResolutionLedgerCheck, localWorkerReview, pilotEvidenceMatrix, villaBrief, ingenbohlBrief, sognBrief, sourceRootLocator, sourceRootSelectionBrief, sourceRootDecisionSessionCheck, privateSourceInventoryPlan, privateInventoryOutputTemplate, privateInventoryOutputCheck, ownerAnswerSheet, ownerAnswerSheetCheck, ownerAnswerIntakeTemplate, ownerAnswerIntakeCheck, ownerAnswerSessionEditPlan, ownerQuestionBrief, ownerQuestionBriefCheck, ownerReviewPacket, ownerReviewPacketCheck, ownerReviewSessionBrief, ownerReviewSessionBriefCheck })
      ? 'kosmodata_lane_sweep_review_only_passed'
      : 'kosmodata_lane_sweep_needs_review';

  const report = {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    status,
    policy: {
      review_only: true,
      public_writes_allowed: false,
      public_ready_required: 0,
      asset_public_downloads_allowed: false,
      note: 'This sweep orchestrates existing KosmoReferences and KosmoAsset gates. It does not approve, promote, upload or publish assets.'
    },
    summary: {
      duration_ms: Date.now() - startedAt,
      steps: stepResults.length,
      passed_steps: stepResults.filter((step) => step.exit_code === 0).length,
      failed_steps: failedSteps.length,
      references_status: referencesGate?.status || null,
      references_steps: referencesGate?.summary?.steps || null,
      references_passed_steps: referencesGate?.summary?.passed_steps || null,
      references_public_ready_assets: referencesGate?.summary?.public_ready_assets ?? referencesStatus?.summary?.public_ready_assets ?? null,
      references_owner_pending: referencesGate?.summary?.owner_decision_session_pending ?? referencesStatus?.summary?.owner_decision_session_pending ?? null,
      references_private_library: referencesGate?.summary?.private_library_status ?? referencesStatus?.summary?.private_library_status ?? null,
      references_private_library_sync_errors: referencesStatus?.summary?.private_library_sync_error_files ?? null,
      asset_status: assetFullReview?.status || null,
      asset_steps: assetFullReview?.summary?.step_count || null,
      asset_passed_steps: assetFullReview?.summary?.passed_steps || null,
      asset_open_human_reviews: assetFullReview?.summary?.open_human_review_count ?? null,
      asset_public_ready_count: assetFullReview?.summary?.public_ready_count ?? null,
      asset_promotion_allowed: assetFullReview?.summary?.promotion_allowed === true,
      asset_promotion_blockers: assetFullReview?.summary?.promotion_guard_blockers ?? null,
      human_queue_status: humanDecisionQueue?.status || null,
      human_queue_open_items: humanDecisionQueue?.summary?.open_items ?? null,
      human_queue_reference_items: humanDecisionQueue?.summary?.reference_items ?? null,
      human_queue_asset_items: humanDecisionQueue?.summary?.asset_items ?? null,
      owner_batches_status: ownerDecisionBatches?.status || null,
      owner_batches_total: ownerDecisionBatches?.summary?.total_batches ?? null,
      owner_batches_open: ownerDecisionBatches?.summary?.batches_with_open_items ?? null,
      owner_batches_open_items: ownerDecisionBatches?.summary?.open_items ?? null,
      local_worker_review_status: localWorkerReview?.status || null,
      local_worker_required_outputs: localWorkerReview?.summary?.required_outputs ?? null,
      local_worker_present_outputs: localWorkerReview?.summary?.present_outputs ?? null,
      local_worker_missing_outputs: localWorkerReview?.summary?.missing_outputs ?? null,
      local_worker_invalid_json_outputs: localWorkerReview?.summary?.invalid_json_outputs ?? null,
      local_worker_high_risk_hits: localWorkerReview?.summary?.high_risk_hits ?? null,
      local_worker_public_ready_allowed: localWorkerReview?.summary?.public_ready_allowed === true,
      pilot_evidence_status: pilotEvidenceMatrix?.status || null,
      pilot_evidence_pilots: pilotEvidenceMatrix?.summary?.pilots ?? null,
      pilot_evidence_total_gaps: pilotEvidenceMatrix?.summary?.total_gap_count ?? null,
      pilot_evidence_media_slots_blocked: pilotEvidenceMatrix?.summary?.media_slots_blocked ?? null,
      pilot_evidence_asset_candidates_blocked: pilotEvidenceMatrix?.summary?.asset_candidates_blocked ?? null,
      pilot_evidence_public_ready_assets: pilotEvidenceMatrix?.summary?.public_ready_assets ?? null,
      villa_brief_status: villaBrief?.status || null,
      villa_brief_candidates: villaBrief?.summary?.candidate_promotions ?? null,
      villa_brief_blocked_items: villaBrief?.summary?.must_remain_blocked ?? null,
      villa_brief_public_ready_after: villaBrief?.policy?.public_ready_after_brief ?? villaBrief?.summary?.public_ready_after_pack ?? null,
      ingenbohl_brief_status: ingenbohlBrief?.status || null,
      ingenbohl_brief_pdf_links: ingenbohlBrief?.summary?.pdf_link_count ?? null,
      ingenbohl_brief_public_ready_after: ingenbohlBrief?.summary?.public_ready_after_brief ?? null,
      sogn_brief_status: sognBrief?.status || null,
      sogn_brief_public_links: sognBrief?.summary?.public_link_sources ?? null,
      sogn_brief_local_files: sognBrief?.summary?.local_file_count ?? null,
      sogn_brief_public_ready_after: sognBrief?.summary?.public_ready_after_brief ?? null,
      source_root_locator_status: sourceRootLocator?.status || null,
      source_root_locator_candidates: sourceRootLocator?.summary?.candidates ?? null,
      source_root_locator_probable_libraries: sourceRootLocator?.summary?.probable_large_private_libraries ?? null,
      source_root_locator_workflow_mirrors: sourceRootLocator?.summary?.workflow_or_project_mirrors ?? null,
      source_root_locator_sync_roots: sourceRootLocator?.summary?.roots_with_sync_errors ?? null,
      source_root_selection_status: sourceRootSelectionBrief?.status || null,
      source_root_selection_options: sourceRootSelectionBrief?.selection_options?.length ?? null,
      source_root_selection_public_ready_after: sourceRootSelectionBrief?.summary?.public_ready_after_brief ?? null,
      source_root_decision_session_status: sourceRootDecisionSessionCheck?.status || null,
      source_root_decision_session_selected: sourceRootDecisionSessionCheck?.summary?.selected_decision || null,
      source_root_decision_session_root_exists: sourceRootDecisionSessionCheck?.summary?.selected_root_exists ?? null,
      source_root_decision_session_private_diagnostic_allowed: sourceRootDecisionSessionCheck?.summary?.private_diagnostic_allowed === true,
      source_root_decision_session_public_ready_after: sourceRootDecisionSessionCheck?.summary?.public_ready_after_session ?? null,
      private_source_inventory_plan_status: privateSourceInventoryPlan?.status || null,
      private_source_inventory_plan_allowed: privateSourceInventoryPlan?.summary?.private_diagnostic_allowed === true,
      private_source_inventory_plan_public_ready_after: privateSourceInventoryPlan?.summary?.public_ready_after_plan ?? null,
      private_inventory_template_status: privateInventoryOutputTemplate?.status || null,
      private_inventory_template_pilots: privateInventoryOutputTemplate?.pilots?.length ?? null,
      private_inventory_template_public_ready_after: privateInventoryOutputTemplate?.policy?.public_ready_after_inventory ?? null,
      private_inventory_output_check_status: privateInventoryOutputCheck?.status || null,
      private_inventory_output_check_pilots: privateInventoryOutputCheck?.summary?.pilots ?? null,
      private_inventory_output_check_failures: privateInventoryOutputCheck?.summary?.failures ?? null,
      private_inventory_output_check_public_ready_hits: privateInventoryOutputCheck?.summary?.public_ready_hits ?? null,
      owner_answer_sheet_status: ownerAnswerSheet?.status || null,
      owner_answer_sheet_source_root_options: ownerAnswerSheet?.summary?.source_root_options ?? null,
      owner_answer_sheet_owner_cards: ownerAnswerSheet?.summary?.owner_cards ?? null,
      owner_answer_sheet_owner_card_items: ownerAnswerSheet?.summary?.owner_card_items ?? null,
      owner_answer_sheet_reference_decisions: ownerAnswerSheet?.summary?.owner_reference_decisions ?? null,
      owner_answer_sheet_public_ready_after: ownerAnswerSheet?.summary?.public_ready_after_sheet ?? null,
      owner_answer_sheet_check_status: ownerAnswerSheetCheck?.status || null,
      owner_answer_sheet_check_failures: ownerAnswerSheetCheck?.summary?.failures ?? null,
      owner_answer_sheet_check_warnings: ownerAnswerSheetCheck?.summary?.warnings ?? null,
      owner_answer_sheet_check_public_ready_after: ownerAnswerSheetCheck?.summary?.public_ready_after_guard ?? null,
      owner_answer_intake_template_status: ownerAnswerIntakeTemplate?.status || null,
      owner_answer_intake_template_owner_cards: ownerAnswerIntakeTemplate?.summary?.owner_card_answers ?? null,
      owner_answer_intake_template_reference_decisions: ownerAnswerIntakeTemplate?.summary?.reference_decision_answers ?? null,
      owner_answer_intake_template_public_ready_after: ownerAnswerIntakeTemplate?.summary?.public_ready_after_intake ?? null,
      owner_answer_intake_check_status: ownerAnswerIntakeCheck?.status || null,
      owner_answer_intake_check_filled_answers: ownerAnswerIntakeCheck?.summary?.filled_answers ?? null,
      owner_answer_intake_check_failures: ownerAnswerIntakeCheck?.summary?.failures ?? null,
      owner_answer_intake_check_warnings: ownerAnswerIntakeCheck?.summary?.warnings ?? null,
      owner_answer_intake_check_public_ready_after: ownerAnswerIntakeCheck?.summary?.public_ready_after_guard ?? null,
      owner_answer_session_edit_plan_status: ownerAnswerSessionEditPlan?.status || null,
      owner_answer_session_edit_plan_planned_edits: ownerAnswerSessionEditPlan?.summary?.planned_edits ?? null,
      owner_answer_session_edit_plan_public_ready_after: ownerAnswerSessionEditPlan?.summary?.public_ready_after_plan ?? null,
      owner_next_review_brief_status: ownerNextReviewBrief?.status || null,
      owner_next_review_brief_open_batches: ownerNextReviewBrief?.summary?.open_batches ?? null,
      owner_next_review_brief_open_items: ownerNextReviewBrief?.summary?.open_items ?? null,
      owner_next_review_brief_resolved_batches_review_only: ownerNextReviewBrief?.summary?.resolved_batches_review_only ?? null,
      owner_review_batch_resolution_ledger_status: ownerReviewBatchResolutionLedger?.status || null,
      owner_review_batch_resolution_ledger_resolved_batches: ownerReviewBatchResolutionLedger?.summary?.resolved_batches ?? null,
      owner_review_batch_resolution_ledger_resolved_items: ownerReviewBatchResolutionLedger?.summary?.resolved_items ?? null,
      owner_review_batch_resolution_ledger_check_status: ownerReviewBatchResolutionLedgerCheck?.status || null,
      owner_review_batch_resolution_ledger_check_failures: ownerReviewBatchResolutionLedgerCheck?.summary?.failures ?? null,
      owner_review_card_set_status: ownerReviewCardSet?.status || null,
      owner_review_card_set_cards: ownerReviewCardSet?.summary?.cards ?? null,
      owner_review_card_set_open_items: ownerReviewCardSet?.summary?.open_items ?? null,
      owner_question_brief_status: ownerQuestionBrief?.status || null,
      owner_question_brief_questions: ownerQuestionBrief?.summary?.questions ?? null,
      owner_question_brief_public_ready_after: ownerQuestionBrief?.summary?.public_ready_after_brief ?? null,
      owner_question_brief_check_status: ownerQuestionBriefCheck?.status || null,
      owner_question_brief_check_failures: ownerQuestionBriefCheck?.summary?.failures ?? null,
      owner_question_brief_check_warnings: ownerQuestionBriefCheck?.summary?.warnings ?? null,
      owner_question_brief_check_public_ready_after: ownerQuestionBriefCheck?.summary?.public_ready_after_guard ?? null,
      owner_review_packet_status: ownerReviewPacket?.status || null,
      owner_review_packet_questions: ownerReviewPacket?.summary?.questions ?? null,
      owner_review_packet_filled_answers: ownerReviewPacket?.summary?.filled_answers ?? null,
      owner_review_packet_planned_edits: ownerReviewPacket?.summary?.planned_edits ?? null,
      owner_review_packet_public_ready_after: ownerReviewPacket?.summary?.public_ready_after_packet ?? null,
      owner_review_packet_check_status: ownerReviewPacketCheck?.status || null,
      owner_review_packet_check_failures: ownerReviewPacketCheck?.summary?.failures ?? null,
      owner_review_packet_check_warnings: ownerReviewPacketCheck?.summary?.warnings ?? null,
      owner_review_packet_check_public_ready_after: ownerReviewPacketCheck?.summary?.public_ready_after_guard ?? null,
      owner_review_session_brief_status: ownerReviewSessionBrief?.status || null,
      owner_review_session_brief_questions: ownerReviewSessionBrief?.summary?.questions ?? null,
      owner_review_session_brief_prior_signals: ownerReviewSessionBrief?.summary?.prior_signals ?? null,
      owner_review_session_brief_recordable_now: ownerReviewSessionBrief?.summary?.prior_signals_recordable_now ?? null,
      owner_review_session_brief_public_ready_after: ownerReviewSessionBrief?.summary?.public_ready_after_brief ?? null,
      owner_review_session_brief_check_status: ownerReviewSessionBriefCheck?.status || null,
      owner_review_session_brief_check_failures: ownerReviewSessionBriefCheck?.summary?.failures ?? null,
      owner_review_session_brief_check_warnings: ownerReviewSessionBriefCheck?.summary?.warnings ?? null,
      owner_review_session_brief_check_public_ready_after: ownerReviewSessionBriefCheck?.summary?.public_ready_after_guard ?? null
    },
    reports: {
      references_gate: stepById.get('kosmoreferences_nightly_gate')?.report,
      references_status: 'data/kosmoreferences-data-lane-status.json',
      asset_full_review: stepById.get('kosmoasset_seed_full_review')?.report,
      human_decision_queue: stepById.get('human_decision_queue')?.report,
      owner_decision_batches: stepById.get('owner_decision_batches')?.report,
      local_worker_output_review: stepById.get('local_worker_output_review')?.report,
      pilot_evidence_matrix: stepById.get('pilot_evidence_matrix')?.report,
      villa_provenance_review_brief: stepById.get('villa_provenance_review_brief')?.report,
      ingenbohl_pdf_extraction_brief: stepById.get('ingenbohl_pdf_extraction_brief')?.report,
      sogn_source_root_brief: stepById.get('sogn_source_root_brief')?.report,
      source_root_locator: stepById.get('source_root_locator')?.report,
      source_root_selection_brief: stepById.get('source_root_selection_brief')?.report,
      source_root_decision_session_check: stepById.get('source_root_decision_session_check')?.report,
      private_source_inventory_plan: stepById.get('private_source_inventory_plan')?.report,
      private_inventory_output_template: stepById.get('private_inventory_output_template')?.report,
      private_inventory_output_check: stepById.get('private_inventory_output_check')?.report,
      owner_review_batch_resolution_ledger: stepById.get('owner_review_batch_resolution_ledger')?.report,
      owner_review_batch_resolution_ledger_check: stepById.get('owner_review_batch_resolution_ledger_check')?.report,
      owner_next_review_brief: stepById.get('owner_next_review_brief')?.report,
      owner_review_card_set: stepById.get('owner_review_card_set')?.report,
      owner_answer_sheet: stepById.get('owner_answer_sheet')?.report,
      owner_answer_sheet_check: stepById.get('owner_answer_sheet_check')?.report,
      owner_answer_intake_template: stepById.get('owner_answer_intake_template')?.report,
      owner_answer_intake_check: stepById.get('owner_answer_intake_check')?.report,
      owner_answer_session_edit_plan: stepById.get('owner_answer_session_edit_plan')?.report,
      owner_question_brief: stepById.get('owner_question_brief')?.report,
      owner_question_brief_check: stepById.get('owner_question_brief_check')?.report,
      owner_review_packet: dataReport('kosmo-owner-review-packet'),
      owner_review_packet_check: dataReport('kosmo-owner-review-packet-check'),
      owner_review_session_brief: dataReport('kosmo-owner-review-session-brief'),
      owner_review_session_brief_check: dataReport('kosmo-owner-review-session-brief-check')
    },
    steps: stepResults,
    next_actions: nextActions({ failedSteps, referencesGate, referencesStatus, assetFullReview, humanDecisionQueue, ownerDecisionBatches, ownerReviewBatchResolutionLedger, localWorkerReview, pilotEvidenceMatrix, villaBrief, ingenbohlBrief, sognBrief, sourceRootLocator, sourceRootSelectionBrief, sourceRootDecisionSessionCheck, privateSourceInventoryPlan, privateInventoryOutputCheck, ownerAnswerSheet, ownerAnswerSheetCheck, ownerAnswerIntakeTemplate, ownerAnswerIntakeCheck, ownerAnswerSessionEditPlan, ownerQuestionBrief, ownerQuestionBriefCheck, ownerReviewPacket, ownerReviewPacketCheck, ownerReviewSessionBrief, ownerReviewSessionBriefCheck })
  };

  await mkdir(dirname(outputJson), { recursive: true });
  await mkdir(dirname(outputMd), { recursive: true });
  await writeFile(outputJson, `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(outputMd, renderMarkdown(report));

  console.log('KosmoData lane sweep');
  console.log(`Status: ${report.status}`);
  console.log(`Steps: ${report.summary.passed_steps}/${report.summary.steps} passed`);
  console.log(`References: ${report.summary.references_status}`);
  console.log(`KosmoAsset: ${report.summary.asset_status}`);
  console.log(`Wrote: ${relative(root, outputMd)}`);

  if (failedSteps.length > 0) process.exitCode = 1;
}

async function runStep(step) {
  const startedAt = Date.now();
  const output = [];
  let timedOut = false;
  const exitCode = await new Promise((resolvePromise) => {
    const child = spawn(step.command, step.args, {
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
    id: step.id,
    label: step.label,
    command: [step.command, ...step.args].join(' '),
    report: step.report,
    started_at: new Date(startedAt).toISOString(),
    duration_ms: Date.now() - startedAt,
    exit_code: exitCode,
    status: exitCode === 0 ? 'passed' : timedOut ? 'timed_out' : 'failed',
    output_excerpt: excerpt(output.join(''))
  };
}

function isReviewOnlyHealthy({ referencesGate, referencesStatus, assetFullReview, humanDecisionQueue, ownerDecisionBatches, ownerReviewBatchResolutionLedger, ownerReviewBatchResolutionLedgerCheck, localWorkerReview, pilotEvidenceMatrix, villaBrief, ingenbohlBrief, sognBrief, sourceRootLocator, sourceRootSelectionBrief, sourceRootDecisionSessionCheck, privateSourceInventoryPlan, privateInventoryOutputTemplate, privateInventoryOutputCheck, ownerAnswerSheet, ownerAnswerSheetCheck, ownerAnswerIntakeTemplate, ownerAnswerIntakeCheck, ownerAnswerSessionEditPlan, ownerQuestionBrief, ownerQuestionBriefCheck }) {
  const referencesOk = referencesGate?.status === 'passed_review_only' &&
    (referencesGate?.summary?.public_ready_assets ?? referencesStatus?.summary?.public_ready_assets) === 0;
  const assetOk = assetFullReview?.status === 'asset_full_review_ready_for_human_decisions' &&
    assetFullReview?.summary?.promotion_allowed !== true &&
    assetFullReview?.summary?.public_ready_count === 0;
  const queueOk = ['human_decision_queue_open', 'human_decision_queue_clear'].includes(humanDecisionQueue?.status) &&
    humanDecisionQueue?.summary?.public_ready_after_queue === 0;
  const batchesOk = ['owner_decision_batches_open', 'owner_decision_batches_clear'].includes(ownerDecisionBatches?.status) &&
    ownerDecisionBatches?.summary?.public_ready_after_batches === 0;
  const ownerReviewBatchResolutionLedgerOk = ['owner_review_batch_resolution_ledger_ready', 'owner_review_batch_resolution_ledger_pending_owner_input'].includes(ownerReviewBatchResolutionLedger?.status) &&
    ownerReviewBatchResolutionLedger?.summary?.public_ready_after_ledger === 0 &&
    ownerReviewBatchResolutionLedger?.policy?.records_reference_item_decisions !== true &&
    ownerReviewBatchResolutionLedger?.policy?.records_asset_approvals !== true &&
    ownerReviewBatchResolutionLedger?.policy?.reads_private_content !== true;
  const ownerReviewBatchResolutionLedgerCheckOk = ownerReviewBatchResolutionLedgerCheck?.status === 'owner_review_batch_resolution_ledger_guard_passed' &&
    ownerReviewBatchResolutionLedgerCheck?.summary?.failures === 0 &&
    ownerReviewBatchResolutionLedgerCheck?.summary?.public_ready_after_guard === 0;
  const localWorkerOk = localWorkerReview?.status === 'local_worker_outputs_present_review_only' &&
    localWorkerReview?.summary?.missing_outputs === 0 &&
    localWorkerReview?.summary?.invalid_json_outputs === 0 &&
    localWorkerReview?.summary?.high_risk_hits === 0 &&
    localWorkerReview?.summary?.public_ready_allowed !== true;
  const pilotEvidenceOk = pilotEvidenceMatrix?.status === 'pilot_evidence_matrix_review_only' &&
    pilotEvidenceMatrix?.summary?.public_ready_assets === 0;
  const villaBriefOk = villaBrief?.status === 'villa_provenance_review_brief_ready' &&
    (villaBrief?.policy?.public_ready_after_brief ?? villaBrief?.summary?.public_ready_after_pack) === 0 &&
    villaBrief?.policy?.public_ready_changes_allowed !== true;
  const ingenbohlBriefOk = ingenbohlBrief?.status === 'ingenbohl_pdf_extraction_decision_needed' &&
    ingenbohlBrief?.summary?.public_ready_after_brief === 0 &&
    ingenbohlBrief?.policy?.public_ready_allowed !== true &&
    ingenbohlBrief?.policy?.downloaded_pdf !== true &&
    ingenbohlBrief?.policy?.extracted_text !== true;
  const sognBriefOk = sognBrief?.status === 'sogn_source_root_decision_needed' &&
    sognBrief?.summary?.public_ready_after_brief === 0 &&
    sognBrief?.policy?.public_ready_allowed !== true &&
    sognBrief?.policy?.private_content_copied !== true &&
    sognBrief?.policy?.generated_geometry_allowed_now !== true;
  const sourceRootLocatorOk = ['source_root_candidates_need_owner_selection', 'probable_source_root_visible', 'no_strong_source_root_candidate'].includes(sourceRootLocator?.status) &&
    sourceRootLocator?.policy?.file_content_read !== true &&
    sourceRootLocator?.policy?.copied_private_content !== true;
  const sourceRootSelectionBriefOk = sourceRootSelectionBrief?.status === 'source_root_owner_selection_needed' &&
    sourceRootSelectionBrief?.summary?.public_ready_after_brief === 0 &&
    sourceRootSelectionBrief?.policy?.inventory_allowed_now !== true &&
    sourceRootSelectionBrief?.policy?.public_ready_allowed !== true &&
    sourceRootSelectionBrief?.policy?.copied_private_content !== true;
  const sourceRootDecisionSessionOk = ['passed_pending_owner_input', 'passed_recorded_but_inventory_blocked', 'passed_recorded_private_diagnostic_allowed'].includes(sourceRootDecisionSessionCheck?.status) &&
    sourceRootDecisionSessionCheck?.summary?.public_ready_after_session === 0 &&
    sourceRootDecisionSessionCheck?.policy?.private_content_read !== true &&
    sourceRootDecisionSessionCheck?.policy?.copied_private_content !== true &&
    sourceRootDecisionSessionCheck?.policy?.public_ready_allowed !== true;
  const privateSourceInventoryPlanOk = ['private_metadata_inventory_blocked', 'private_metadata_inventory_plan_ready'].includes(privateSourceInventoryPlan?.status) &&
    privateSourceInventoryPlan?.summary?.public_ready_after_plan === 0 &&
    privateSourceInventoryPlan?.policy?.reads_private_content !== true &&
    privateSourceInventoryPlan?.policy?.copies_private_content !== true &&
    privateSourceInventoryPlan?.policy?.writes_public_files !== true &&
    privateSourceInventoryPlan?.policy?.writes_public_manifest !== true;
  const privateInventoryTemplateOk = privateInventoryOutputTemplate?.status === 'private_inventory_template_only' &&
    privateInventoryOutputTemplate?.policy?.private_content_included === false &&
    privateInventoryOutputTemplate?.policy?.copied_private_files === false &&
    privateInventoryOutputTemplate?.policy?.public_ready_after_inventory === 0 &&
    privateInventoryOutputTemplate?.policy?.public_writes_allowed === false;
  const privateInventoryOutputCheckOk = ['private_inventory_output_contract_passed', 'private_inventory_output_contract_passed_with_warnings'].includes(privateInventoryOutputCheck?.status) &&
    privateInventoryOutputCheck?.summary?.failures === 0 &&
    privateInventoryOutputCheck?.summary?.public_ready_hits === 0 &&
    privateInventoryOutputCheck?.policy?.private_content_read !== true &&
    privateInventoryOutputCheck?.policy?.public_ready_allowed !== true;
  const ownerAnswerSheetOk = ownerAnswerSheet?.status === 'owner_answer_sheet_ready' &&
    ownerAnswerSheet?.summary?.public_ready_after_sheet === 0 &&
    ownerAnswerSheet?.policy?.records_decisions !== true &&
    ownerAnswerSheet?.policy?.writes_session_files !== true;
  const ownerAnswerSheetCheckOk = ownerAnswerSheetCheck?.status === 'owner_answer_sheet_guard_passed' &&
    ownerAnswerSheetCheck?.summary?.failures === 0 &&
    ownerAnswerSheetCheck?.summary?.public_ready_after_guard === 0 &&
    ownerAnswerSheetCheck?.policy?.records_decisions !== true &&
    ownerAnswerSheetCheck?.policy?.writes_session_files !== true &&
    ownerAnswerSheetCheck?.policy?.public_ready_after_guard === 0;
  const ownerAnswerIntakeTemplateOk = ownerAnswerIntakeTemplate?.status === 'owner_answer_intake_template_pending_owner_input' &&
    ownerAnswerIntakeTemplate?.summary?.public_ready_after_intake === 0 &&
    ownerAnswerIntakeTemplate?.policy?.records_decisions !== true &&
    ownerAnswerIntakeTemplate?.policy?.writes_session_files !== true &&
    ownerAnswerIntakeTemplate?.policy?.writes_public_files !== true &&
    ownerAnswerIntakeTemplate?.policy?.writes_public_manifest !== true;
  const ownerAnswerIntakeCheckOk = ['owner_answer_intake_guard_passed_pending_owner_input', 'owner_answer_intake_guard_passed_with_answers'].includes(ownerAnswerIntakeCheck?.status) &&
    ownerAnswerIntakeCheck?.summary?.failures === 0 &&
    ownerAnswerIntakeCheck?.summary?.public_ready_after_guard === 0 &&
    ownerAnswerIntakeCheck?.policy?.records_decisions !== true &&
    ownerAnswerIntakeCheck?.policy?.writes_session_files !== true &&
    ownerAnswerIntakeCheck?.policy?.public_ready_after_guard === 0;
  const ownerAnswerSessionEditPlanOk = ['owner_answer_session_edit_plan_pending_owner_input', 'owner_answer_session_edit_plan_ready_for_review'].includes(ownerAnswerSessionEditPlan?.status) &&
    ownerAnswerSessionEditPlan?.summary?.public_ready_after_plan === 0 &&
    ownerAnswerSessionEditPlan?.policy?.writes_session_files !== true &&
    ownerAnswerSessionEditPlan?.policy?.applies_decisions !== true &&
    ownerAnswerSessionEditPlan?.policy?.public_ready_after_plan === 0;
  const ownerQuestionBriefOk = ownerQuestionBrief?.status === 'owner_question_brief_ready' &&
    ownerQuestionBrief?.summary?.public_ready_after_brief === 0 &&
    ownerQuestionBrief?.policy?.records_decisions !== true &&
    ownerQuestionBrief?.policy?.writes_session_files !== true;
  const ownerQuestionBriefCheckOk = ownerQuestionBriefCheck?.status === 'owner_question_brief_guard_passed' &&
    ownerQuestionBriefCheck?.summary?.failures === 0 &&
    ownerQuestionBriefCheck?.summary?.public_ready_after_guard === 0 &&
    ownerQuestionBriefCheck?.policy?.records_decisions !== true &&
    ownerQuestionBriefCheck?.policy?.writes_session_files !== true;
  return referencesOk && assetOk && queueOk && batchesOk && ownerReviewBatchResolutionLedgerOk && ownerReviewBatchResolutionLedgerCheckOk && localWorkerOk && pilotEvidenceOk && villaBriefOk && ingenbohlBriefOk && sognBriefOk && sourceRootLocatorOk && sourceRootSelectionBriefOk && sourceRootDecisionSessionOk && privateSourceInventoryPlanOk && privateInventoryTemplateOk && privateInventoryOutputCheckOk && ownerAnswerSheetOk && ownerAnswerSheetCheckOk && ownerAnswerIntakeTemplateOk && ownerAnswerIntakeCheckOk && ownerAnswerSessionEditPlanOk && ownerQuestionBriefOk && ownerQuestionBriefCheckOk;
}

function nextActions({ failedSteps, referencesGate, referencesStatus, assetFullReview, humanDecisionQueue, ownerDecisionBatches, ownerReviewBatchResolutionLedger, localWorkerReview, pilotEvidenceMatrix, villaBrief, ingenbohlBrief, sognBrief, sourceRootLocator, sourceRootSelectionBrief, sourceRootDecisionSessionCheck, privateSourceInventoryPlan, privateInventoryOutputCheck, ownerAnswerSheet, ownerAnswerSheetCheck, ownerAnswerIntakeTemplate, ownerAnswerIntakeCheck, ownerAnswerSessionEditPlan, ownerQuestionBrief, ownerQuestionBriefCheck, ownerReviewPacket, ownerReviewPacketCheck, ownerReviewSessionBrief, ownerReviewSessionBriefCheck }) {
  if (failedSteps.length > 0) return [`Fix failed sweep steps: ${failedSteps.map((step) => step.id).join(', ')}.`];
  const actions = [];
  const ownerPending = humanDecisionQueue?.summary?.reference_items ?? referencesGate?.summary?.owner_decision_session_pending ?? referencesStatus?.summary?.owner_decision_session_pending ?? 0;
  if (ownerPending > 0) actions.push(`Owner resolves ${ownerPending} KosmoReferences decisions before public promotion review.`);
  const assetOpen = humanDecisionQueue?.summary?.asset_items ?? assetFullReview?.summary?.open_human_review_count ?? 0;
  if (assetOpen > 0) actions.push(`Complete ${assetOpen} KosmoAsset human reviews before local approvals or sandbox certificates.`);
  const openBatches = Math.max(
    0,
    (ownerDecisionBatches?.summary?.batches_with_open_items ?? 0) -
      (ownerReviewBatchResolutionLedger?.summary?.resolved_batches ?? 0)
  );
  if (openBatches > 0) actions.push(`Use ${openBatches} owner decision batches for review rounds instead of asking all open items at once.`);
  if ((ownerReviewBatchResolutionLedger?.summary?.resolved_batches ?? 0) > 0) {
    actions.push(`Owner review batches triaged review-only: ${ownerReviewBatchResolutionLedger.summary.resolved_batches} batches / ${ownerReviewBatchResolutionLedger.summary.resolved_items} items.`);
  }
  const localWorkerRisk = localWorkerReview?.summary?.high_risk_hits ?? 0;
  const localWorkerMissing = localWorkerReview?.summary?.missing_outputs ?? 0;
  if (localWorkerMissing > 0) actions.push(`Regenerate ${localWorkerMissing} missing local worker output files before using worker packets.`);
  if (localWorkerRisk > 0) actions.push(`Review ${localWorkerRisk} high-risk local worker output hits with Codex/Claude.`);
  const pilotGaps = pilotEvidenceMatrix?.summary?.total_gap_count ?? 0;
  if (pilotGaps > 0) actions.push(`Track ${pilotGaps} pilot evidence gaps across Villa Savoye, Sogn Benedetg and Ingenbohl.`);
  const villaBlocked = villaBrief?.summary?.must_remain_blocked ?? 0;
  if (villaBlocked > 0) actions.push(`Keep ${villaBlocked} Villa Savoye files blocked until source-basis/build-log review exists.`);
  if (ingenbohlBrief?.status === 'ingenbohl_pdf_extraction_decision_needed') actions.push('Decide whether Ingenbohl PDF remains link-only or enters private metadata-only extraction.');
  if (sognBrief?.status === 'sogn_source_root_decision_needed') actions.push('Keep Sogn Benedetg link-only until the real private source root is visible and inventoried.');
  if ((sourceRootLocator?.summary?.probable_large_private_libraries ?? 0) === 0) actions.push('Select or mount the real source root; source-root locator has 0 probable large private libraries.');
  if (sourceRootSelectionBrief?.status === 'source_root_owner_selection_needed') actions.push('Use the source-root selection brief before any private inventory or source-dependent authoring.');
  if (sourceRootDecisionSessionCheck?.status === 'passed_pending_owner_input') actions.push('Record the source-root decision session before any private diagnostic.');
  if (sourceRootDecisionSessionCheck?.summary?.private_diagnostic_allowed === true) {
    actions.push(`Run private-library diagnostic against selected root: ${sourceRootDecisionSessionCheck.summary.selected_root_path}.`);
  }
  if (privateSourceInventoryPlan?.status === 'private_metadata_inventory_blocked') actions.push('Use the private source inventory plan only as a blocked next-step contract until source-root selection passes.');
  if (privateInventoryOutputCheck?.status) actions.push('Validate any future private inventory JSON with npm run kosmo:private-inventory-output-check before handoff.');
  if (ownerAnswerSheet?.status === 'owner_answer_sheet_ready') actions.push('Use the owner answer sheet to capture Source-Root and Owner Card answers without editing session files prematurely.');
  if (ownerAnswerSheetCheck?.status === 'owner_answer_sheet_guard_passed') actions.push('Keep owner answer sheet changes behind the guard before any decision-session edit.');
  if (ownerAnswerIntakeTemplate?.status === 'owner_answer_intake_template_pending_owner_input') actions.push('Use the owner answer intake template for machine-readable owner answers only after explicit confirmation.');
  if (ownerAnswerIntakeCheck?.status === 'owner_answer_intake_guard_passed_pending_owner_input') actions.push('Owner answer intake is structurally ready and waiting for owner input.');
  if (ownerAnswerSessionEditPlan?.status === 'owner_answer_session_edit_plan_pending_owner_input') actions.push('Session edit plan is ready and waiting for non-empty checked owner intake.');
  if (ownerQuestionBrief?.status === 'owner_question_brief_ready') actions.push(`Use the owner question brief for the next ${ownerQuestionBrief.summary.questions} owner questions.`);
  if (ownerQuestionBriefCheck?.status === 'owner_question_brief_guard_passed') actions.push('Owner question brief guard passed; present questions without treating answers as decisions.');
  if (ownerReviewPacket?.status === 'owner_review_packet_ready') actions.push('Use the owner review packet as the single entry point for the next owner review round.');
  if (ownerReviewPacketCheck?.status === 'owner_review_packet_guard_passed') actions.push('Owner review packet guard passed; use packet as single reviewed entry point.');
  if (ownerReviewSessionBrief?.status === 'owner_review_session_brief_ready') actions.push('Present the owner review session brief; prior chat signals remain non-recordable until explicit answers are confirmed.');
  if (ownerReviewSessionBriefCheck?.status === 'owner_review_session_brief_guard_passed') actions.push('Owner review session brief guard passed; paste-ready questions are safe to present without recording decisions.');
  const privateLibrary = referencesGate?.summary?.private_library_status ?? referencesStatus?.summary?.private_library_status;
  const syncErrors = referencesStatus?.summary?.private_library_sync_error_files ?? 0;
  if (privateLibrary !== 'library_candidate_visible') actions.push('Expose or mount the real large private book/ETH/HSLU library root.');
  if (syncErrors > 0) actions.push(`Resolve ${syncErrors} OneDrive sync error marker files before treating the visible mirror as complete.`);
  actions.push('Keep public-ready assets at 0 until separate owner and promotion reviews pass.');
  return actions;
}

function renderMarkdown(report) {
  const lines = [];
  lines.push('# KosmoData Lane Sweep');
  lines.push('');
  lines.push(`Generated: ${report.generated_at}`);
  lines.push(`Status: \`${report.status}\``);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Steps passed: ${report.summary.passed_steps}/${report.summary.steps}`);
  lines.push(`- Duration: ${report.summary.duration_ms}ms`);
  lines.push(`- KosmoReferences: ${report.summary.references_status} (${report.summary.references_passed_steps}/${report.summary.references_steps})`);
  lines.push(`- References public-ready assets: ${report.summary.references_public_ready_assets}`);
  lines.push(`- References owner pending: ${report.summary.references_owner_pending}`);
  lines.push(`- Private library: ${report.summary.references_private_library}`);
  lines.push(`- Private library sync errors: ${report.summary.references_private_library_sync_errors}`);
  lines.push(`- KosmoAsset: ${report.summary.asset_status} (${report.summary.asset_passed_steps}/${report.summary.asset_steps})`);
  lines.push(`- KosmoAsset open human reviews: ${report.summary.asset_open_human_reviews}`);
  lines.push(`- KosmoAsset public-ready assets: ${report.summary.asset_public_ready_count}`);
  lines.push(`- KosmoAsset promotion allowed: ${report.summary.asset_promotion_allowed ? 'yes' : 'no'}`);
  lines.push(`- KosmoAsset promotion blockers: ${report.summary.asset_promotion_blockers}`);
  lines.push(`- Human decision queue: ${report.summary.human_queue_status}`);
  lines.push(`- Human decision open items: ${report.summary.human_queue_open_items}`);
  lines.push(`- Human decision split: ${report.summary.human_queue_reference_items} references / ${report.summary.human_queue_asset_items} assets`);
  lines.push(`- Owner decision batches: ${report.summary.owner_batches_status}`);
  lines.push(`- Owner decision batches open: ${report.summary.owner_batches_open}/${report.summary.owner_batches_total}`);
  lines.push(`- Owner decision batch items open: ${report.summary.owner_batches_open_items}`);
  lines.push(`- Local worker review: ${report.summary.local_worker_review_status}`);
  lines.push(`- Local worker outputs: ${report.summary.local_worker_present_outputs}/${report.summary.local_worker_required_outputs}`);
  lines.push(`- Local worker missing outputs: ${report.summary.local_worker_missing_outputs}`);
  lines.push(`- Local worker invalid JSON outputs: ${report.summary.local_worker_invalid_json_outputs}`);
  lines.push(`- Local worker high-risk hits: ${report.summary.local_worker_high_risk_hits}`);
  lines.push(`- Local worker public-ready allowed: ${report.summary.local_worker_public_ready_allowed ? 'yes' : 'no'}`);
  lines.push(`- Pilot evidence matrix: ${report.summary.pilot_evidence_status}`);
  lines.push(`- Pilot evidence pilots: ${report.summary.pilot_evidence_pilots}`);
  lines.push(`- Pilot evidence gaps: ${report.summary.pilot_evidence_total_gaps}`);
  lines.push(`- Pilot media slots blocked: ${report.summary.pilot_evidence_media_slots_blocked}`);
  lines.push(`- Pilot asset candidates blocked: ${report.summary.pilot_evidence_asset_candidates_blocked}`);
  lines.push(`- Pilot evidence public-ready assets: ${report.summary.pilot_evidence_public_ready_assets}`);
  lines.push(`- Villa brief: ${report.summary.villa_brief_status}`);
  lines.push(`- Villa candidates/blocked: ${report.summary.villa_brief_candidates}/${report.summary.villa_brief_blocked_items}`);
  lines.push(`- Villa public-ready after brief: ${report.summary.villa_brief_public_ready_after}`);
  lines.push(`- Ingenbohl brief: ${report.summary.ingenbohl_brief_status}`);
  lines.push(`- Ingenbohl PDF links: ${report.summary.ingenbohl_brief_pdf_links}`);
  lines.push(`- Ingenbohl public-ready after brief: ${report.summary.ingenbohl_brief_public_ready_after}`);
  lines.push(`- Sogn brief: ${report.summary.sogn_brief_status}`);
  lines.push(`- Sogn public links/local files: ${report.summary.sogn_brief_public_links}/${report.summary.sogn_brief_local_files}`);
  lines.push(`- Sogn public-ready after brief: ${report.summary.sogn_brief_public_ready_after}`);
  lines.push(`- Source-root locator: ${report.summary.source_root_locator_status}`);
  lines.push(`- Source-root locator probable/candidates: ${report.summary.source_root_locator_probable_libraries}/${report.summary.source_root_locator_candidates}`);
  lines.push(`- Source-root locator mirrors/sync roots: ${report.summary.source_root_locator_workflow_mirrors}/${report.summary.source_root_locator_sync_roots}`);
  lines.push(`- Source-root selection: ${report.summary.source_root_selection_status}`);
  lines.push(`- Source-root selection options: ${report.summary.source_root_selection_options}`);
  lines.push(`- Source-root selection public-ready after brief: ${report.summary.source_root_selection_public_ready_after}`);
  lines.push(`- Source-root decision session: ${report.summary.source_root_decision_session_status}`);
  lines.push(`- Source-root selected decision: ${report.summary.source_root_decision_session_selected || 'pending'}`);
  lines.push(`- Source-root selected root exists: ${report.summary.source_root_decision_session_root_exists}`);
  lines.push(`- Source-root private diagnostic allowed: ${report.summary.source_root_decision_session_private_diagnostic_allowed ? 'yes' : 'no'}`);
  lines.push(`- Source-root decision public-ready after session: ${report.summary.source_root_decision_session_public_ready_after}`);
  lines.push(`- Private source inventory plan: ${report.summary.private_source_inventory_plan_status}`);
  lines.push(`- Private source inventory allowed: ${report.summary.private_source_inventory_plan_allowed ? 'yes' : 'no'}`);
  lines.push(`- Private source inventory public-ready after plan: ${report.summary.private_source_inventory_plan_public_ready_after}`);
  lines.push(`- Private inventory template: ${report.summary.private_inventory_template_status}`);
  lines.push(`- Private inventory template pilots: ${report.summary.private_inventory_template_pilots}`);
  lines.push(`- Private inventory template public-ready after inventory: ${report.summary.private_inventory_template_public_ready_after}`);
  lines.push(`- Private inventory output check: ${report.summary.private_inventory_output_check_status}`);
  lines.push(`- Private inventory output check pilots: ${report.summary.private_inventory_output_check_pilots}`);
  lines.push(`- Private inventory output check failures/public-ready hits: ${report.summary.private_inventory_output_check_failures}/${report.summary.private_inventory_output_check_public_ready_hits}`);
  lines.push(`- Owner answer sheet: ${report.summary.owner_answer_sheet_status}`);
  lines.push(`- Owner answer sheet source-root options: ${report.summary.owner_answer_sheet_source_root_options}`);
  lines.push(`- Owner answer sheet cards/items: ${report.summary.owner_answer_sheet_owner_cards}/${report.summary.owner_answer_sheet_owner_card_items}`);
  lines.push(`- Owner answer sheet reference decisions: ${report.summary.owner_answer_sheet_reference_decisions}`);
  lines.push(`- Owner answer sheet public-ready after sheet: ${report.summary.owner_answer_sheet_public_ready_after}`);
  lines.push(`- Owner answer sheet check: ${report.summary.owner_answer_sheet_check_status}`);
  lines.push(`- Owner answer sheet check failures/warnings: ${report.summary.owner_answer_sheet_check_failures}/${report.summary.owner_answer_sheet_check_warnings}`);
  lines.push(`- Owner answer sheet check public-ready after guard: ${report.summary.owner_answer_sheet_check_public_ready_after}`);
  lines.push(`- Owner answer intake template: ${report.summary.owner_answer_intake_template_status}`);
  lines.push(`- Owner answer intake template cards/reference decisions: ${report.summary.owner_answer_intake_template_owner_cards}/${report.summary.owner_answer_intake_template_reference_decisions}`);
  lines.push(`- Owner answer intake template public-ready after intake: ${report.summary.owner_answer_intake_template_public_ready_after}`);
  lines.push(`- Owner answer intake check: ${report.summary.owner_answer_intake_check_status}`);
  lines.push(`- Owner answer intake check filled answers: ${report.summary.owner_answer_intake_check_filled_answers}`);
  lines.push(`- Owner answer intake check failures/warnings: ${report.summary.owner_answer_intake_check_failures}/${report.summary.owner_answer_intake_check_warnings}`);
  lines.push(`- Owner answer intake check public-ready after guard: ${report.summary.owner_answer_intake_check_public_ready_after}`);
  lines.push(`- Owner answer session edit plan: ${report.summary.owner_answer_session_edit_plan_status}`);
  lines.push(`- Owner answer session edit planned edits: ${report.summary.owner_answer_session_edit_plan_planned_edits}`);
  lines.push(`- Owner answer session edit public-ready after plan: ${report.summary.owner_answer_session_edit_plan_public_ready_after}`);
  lines.push(`- Owner review batch resolution ledger: ${report.summary.owner_review_batch_resolution_ledger_status}`);
  lines.push(`- Owner review batch resolution ledger resolved batches/items: ${report.summary.owner_review_batch_resolution_ledger_resolved_batches ?? '-'}/${report.summary.owner_review_batch_resolution_ledger_resolved_items ?? '-'}`);
  lines.push(`- Owner review batch resolution ledger check: ${report.summary.owner_review_batch_resolution_ledger_check_status}, failures ${report.summary.owner_review_batch_resolution_ledger_check_failures ?? '-'}`);
  lines.push(`- Owner next review brief: ${report.summary.owner_next_review_brief_status}`);
  lines.push(`- Owner next review open batches/items: ${report.summary.owner_next_review_brief_open_batches ?? '-'}/${report.summary.owner_next_review_brief_open_items ?? '-'}`);
  lines.push(`- Owner next review resolved batches review-only: ${report.summary.owner_next_review_brief_resolved_batches_review_only ?? '-'}`);
  lines.push(`- Owner question brief: ${report.summary.owner_question_brief_status}`);
  lines.push(`- Owner question brief questions: ${report.summary.owner_question_brief_questions}`);
  lines.push(`- Owner question brief public-ready after brief: ${report.summary.owner_question_brief_public_ready_after}`);
  lines.push(`- Owner question brief check: ${report.summary.owner_question_brief_check_status}`);
  lines.push(`- Owner question brief check failures/warnings: ${report.summary.owner_question_brief_check_failures}/${report.summary.owner_question_brief_check_warnings}`);
  lines.push(`- Owner question brief check public-ready after guard: ${report.summary.owner_question_brief_check_public_ready_after}`);
  lines.push(`- Owner review packet: ${report.summary.owner_review_packet_status}`);
  lines.push(`- Owner review packet questions: ${report.summary.owner_review_packet_questions}`);
  lines.push(`- Owner review packet filled answers/planned edits: ${report.summary.owner_review_packet_filled_answers}/${report.summary.owner_review_packet_planned_edits}`);
  lines.push(`- Owner review packet public-ready after packet: ${report.summary.owner_review_packet_public_ready_after}`);
  lines.push(`- Owner review packet check: ${report.summary.owner_review_packet_check_status}`);
  lines.push(`- Owner review packet check failures/warnings: ${report.summary.owner_review_packet_check_failures}/${report.summary.owner_review_packet_check_warnings}`);
  lines.push(`- Owner review packet check public-ready after guard: ${report.summary.owner_review_packet_check_public_ready_after}`);
  lines.push(`- Owner review session brief: ${report.summary.owner_review_session_brief_status}`);
  lines.push(`- Owner review session brief questions: ${report.summary.owner_review_session_brief_questions}`);
  lines.push(`- Owner review session prior signals recordable/total: ${report.summary.owner_review_session_brief_recordable_now}/${report.summary.owner_review_session_brief_prior_signals}`);
  lines.push(`- Owner review session public-ready after brief: ${report.summary.owner_review_session_brief_public_ready_after}`);
  lines.push(`- Owner review session brief check: ${report.summary.owner_review_session_brief_check_status}`);
  lines.push(`- Owner review session brief check failures/warnings: ${report.summary.owner_review_session_brief_check_failures}/${report.summary.owner_review_session_brief_check_warnings}`);
  lines.push(`- Owner review session brief check public-ready after guard: ${report.summary.owner_review_session_brief_check_public_ready_after}`);
  lines.push('');
  lines.push('## Steps');
  lines.push('');
  lines.push('| Step | Status | Duration | Report |');
  lines.push('| --- | --- | ---: | --- |');
  report.steps.forEach((step) => {
    lines.push(`| ${step.label} | ${step.status} | ${step.duration_ms}ms | \`${step.report}\` |`);
  });
  lines.push('');
  lines.push('## Next Actions');
  lines.push('');
  report.next_actions.forEach((action) => lines.push(`- ${action}`));
  return `${lines.join('\n')}\n`;
}

async function readOptionalJson(path) {
  try {
    return JSON.parse(await readFile(path, 'utf8'));
  } catch {
    return null;
  }
}

function excerpt(value) {
  const normalized = value.replace(/\r/g, '').trim();
  if (normalized.length <= 1600) return normalized;
  return `${normalized.slice(0, 900)}\n...\n${normalized.slice(-600)}`;
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
