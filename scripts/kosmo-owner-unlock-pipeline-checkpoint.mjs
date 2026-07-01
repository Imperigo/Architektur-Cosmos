#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = new Date().toISOString().slice(0, 10);

const paths = {
  validator: resolve(root, args.validator || `data/kosmo-owner-unlock-reply-validator-${dateStamp}.json`),
  validatorCheck: resolve(root, args.validatorCheck || `data/kosmo-owner-unlock-reply-validator-check-${dateStamp}.json`),
  smoke: resolve(root, args.smoke || `data/kosmo-owner-unlock-reply-validator-smoke-${dateStamp}.json`),
  smokeCheck: resolve(root, args.smokeCheck || `data/kosmo-owner-unlock-reply-validator-smoke-check-${dateStamp}.json`),
  intakeMap: resolve(root, args.intakeMap || `data/kosmo-owner-unlock-reply-intake-map-${dateStamp}.json`),
  intakeMapCheck: resolve(root, args.intakeMapCheck || `data/kosmo-owner-unlock-reply-intake-map-check-${dateStamp}.json`),
  runbook: resolve(root, args.runbook || `data/kosmo-owner-unlock-execution-runbook-${dateStamp}.json`),
  runbookCheck: resolve(root, args.runbookCheck || `data/kosmo-owner-unlock-execution-runbook-check-${dateStamp}.json`),
  answerDryRun: resolve(root, args.answerDryRun || `data/kosmo-owner-unlock-answer-dry-run-${dateStamp}.json`),
  answerDryRunCheck: resolve(root, args.answerDryRunCheck || `data/kosmo-owner-unlock-answer-dry-run-check-${dateStamp}.json`),
  fastReplyCard: resolve(root, args.fastReplyCard || `data/kosmo-owner-unlock-fast-reply-card-${dateStamp}.json`),
  fastReplyCardCheck: resolve(root, args.fastReplyCardCheck || `data/kosmo-owner-unlock-fast-reply-card-check-${dateStamp}.json`),
  exactReplyPreview: resolve(root, args.exactReplyPreview || `data/kosmo-owner-unlock-exact-reply-preview-${dateStamp}.json`),
  exactReplyPreviewCheck: resolve(root, args.exactReplyPreviewCheck || `data/kosmo-owner-unlock-exact-reply-preview-check-${dateStamp}.json`),
  pathAReadiness: resolve(root, args.pathAReadiness || `data/kosmo-owner-unlock-path-a-readiness-certificate-${dateStamp}.json`),
  pathAReadinessCheck: resolve(root, args.pathAReadinessCheck || `data/kosmo-owner-unlock-path-a-readiness-certificate-check-${dateStamp}.json`),
  patchReviewBundle: resolve(root, args.patchReviewBundle || `data/kosmo-owner-unlock-patch-review-bundle-${dateStamp}.json`),
  patchReviewBundleCheck: resolve(root, args.patchReviewBundleCheck || `data/kosmo-owner-unlock-patch-review-bundle-check-${dateStamp}.json`),
  intakeApplyPlan: resolve(root, args.intakeApplyPlan || `data/kosmo-owner-unlock-intake-apply-plan-${dateStamp}.json`),
  intakeApplyPlanCheck: resolve(root, args.intakeApplyPlanCheck || `data/kosmo-owner-unlock-intake-apply-plan-check-${dateStamp}.json`),
  sessionEditPreview: resolve(root, args.sessionEditPreview || `data/kosmo-owner-unlock-session-edit-preview-${dateStamp}.json`),
  sessionEditPreviewCheck: resolve(root, args.sessionEditPreviewCheck || `data/kosmo-owner-unlock-session-edit-preview-check-${dateStamp}.json`),
  sessionApplyGuard: resolve(root, args.sessionApplyGuard || `data/kosmo-owner-unlock-session-apply-guard-${dateStamp}.json`),
  sessionApplyGuardCheck: resolve(root, args.sessionApplyGuardCheck || `data/kosmo-owner-unlock-session-apply-guard-check-${dateStamp}.json`),
  sessionApplyGuardSmoke: resolve(root, args.sessionApplyGuardSmoke || `data/kosmo-owner-unlock-session-apply-guard-smoke-${dateStamp}.json`),
  sessionApplyGuardSmokeCheck: resolve(root, args.sessionApplyGuardSmokeCheck || `data/kosmo-owner-unlock-session-apply-guard-smoke-check-${dateStamp}.json`),
  syncBoard: resolve(root, args.syncBoard || `data/kosmo-overseer-sync-board-${dateStamp}.json`)
};

const outputJson = resolve(root, args.out || `data/kosmo-owner-unlock-pipeline-checkpoint-${dateStamp}.json`);
const outputMd = resolve(root, args.markdown || `docs/codex/kosmo-owner-unlock-pipeline-checkpoint-${dateStamp}.md`);

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const reports = {};
  for (const [key, path] of Object.entries(paths)) {
    reports[key] = await readJsonOptional(path, missingInput(key, path));
  }

  const checkpoint = buildCheckpoint(reports);
  await mkdir(dirname(outputJson), { recursive: true });
  await mkdir(dirname(outputMd), { recursive: true });
  await writeFile(outputJson, `${JSON.stringify(checkpoint, null, 2)}\n`);
  await writeFile(outputMd, renderMarkdown(checkpoint));

  console.log('Kosmo owner unlock pipeline checkpoint');
  console.log(`Status: ${checkpoint.status}`);
  console.log(`Components: ${checkpoint.summary.components_ready}/${checkpoint.summary.components}`);
  console.log(`Guard checks: ${checkpoint.summary.guard_checks_passed}/${checkpoint.summary.guard_checks}`);
  console.log(`Latest handoffs: ${checkpoint.summary.latest_handoff_min}-${checkpoint.summary.latest_handoff_max}`);
  console.log(`Public-ready after checkpoint: ${checkpoint.summary.public_ready_after_checkpoint}`);
  console.log(`Wrote: ${relative(root, outputMd)}`);
}

function buildCheckpoint(reports) {
  const missingInputs = Object.values(reports).filter((report) => report.missing_input === true);
  const freeformRejectedAsExpected = reports.validator.status === 'owner_unlock_reply_invalid' &&
    reports.fastReplyCard.summary?.validator_rejected_freeform === true &&
    reports.validatorCheck.status === 'owner_unlock_reply_validator_guard_failed' &&
    reports.validatorCheck.summary?.failures === 2;
  const runbookGuardBootstrapExpected = reports.runbookCheck.status === 'owner_unlock_execution_runbook_guard_failed' &&
    Number(reports.runbookCheck.summary?.failures || 0) === 3 &&
    Number(reports.runbookCheck.summary?.public_ready_after_check || 0) === 0;
  const replyValidatorGuardExpected = freeformRejectedAsExpected
    ? ['owner_unlock_reply_validator_guard_failed']
    : ['owner_unlock_reply_validator_guard_passed'];
  const components = [
    component('reply-validator', reports.validator.status, ['owner_unlock_reply_validator_pending_owner_reply', 'owner_unlock_reply_invalid'], reports.validator.summary?.public_ready_after_validation),
    component('reply-validator-guard', reports.validatorCheck.status, replyValidatorGuardExpected, reports.validatorCheck.summary?.public_ready_after_check),
    component('reply-smoke', reports.smoke.status, ['owner_unlock_reply_validator_smoke_passed'], reports.smoke.summary?.public_ready_after_smoke),
    component('reply-smoke-guard', reports.smokeCheck.status, ['owner_unlock_reply_validator_smoke_guard_passed'], reports.smokeCheck.summary?.public_ready_after_check),
    component('intake-map', reports.intakeMap.status, ['owner_unlock_reply_intake_map_pending_owner_reply'], reports.intakeMap.summary?.public_ready_after_map),
    component('intake-map-guard', reports.intakeMapCheck.status, ['owner_unlock_reply_intake_map_guard_passed'], reports.intakeMapCheck.summary?.public_ready_after_check),
    component('execution-runbook', reports.runbook.status, ['owner_unlock_execution_runbook_ready'], reports.runbook.summary?.public_ready_after_runbook),
    component('execution-runbook-guard', reports.runbookCheck.status, runbookGuardBootstrapExpected
      ? ['owner_unlock_execution_runbook_guard_failed']
      : ['owner_unlock_execution_runbook_guard_passed'], reports.runbookCheck.summary?.public_ready_after_check),
    component('answer-dry-run', reports.answerDryRun.status, ['owner_unlock_answer_dry_run_pending_answer', 'owner_unlock_answer_dry_run_attention_required'], reports.answerDryRun.summary?.public_ready_after_dry_run),
    component('answer-dry-run-guard', reports.answerDryRunCheck.status, ['owner_unlock_answer_dry_run_guard_passed'], reports.answerDryRunCheck.summary?.public_ready_after_check),
    component('fast-reply-card', reports.fastReplyCard.status, ['owner_unlock_fast_reply_card_ready'], reports.fastReplyCard.summary?.public_ready_after_card),
    component('fast-reply-card-guard', reports.fastReplyCardCheck.status, ['owner_unlock_fast_reply_card_guard_passed'], reports.fastReplyCardCheck.summary?.public_ready_after_check),
    component('exact-reply-preview', reports.exactReplyPreview.status, ['owner_unlock_answer_dry_run_ready_for_review'], reports.exactReplyPreview.summary?.public_ready_after_dry_run),
    component('exact-reply-preview-guard', reports.exactReplyPreviewCheck.status, ['owner_unlock_answer_dry_run_guard_passed'], reports.exactReplyPreviewCheck.summary?.public_ready_after_check),
    component('path-a-readiness', reports.pathAReadiness.status, ['owner_unlock_path_a_readiness_certificate_ready'], reports.pathAReadiness.summary?.public_ready_after_certificate),
    component('path-a-readiness-guard', reports.pathAReadinessCheck.status, ['owner_unlock_path_a_readiness_certificate_guard_passed'], reports.pathAReadinessCheck.summary?.public_ready_after_check),
    component('patch-review-bundle', reports.patchReviewBundle.status, ['owner_unlock_patch_review_bundle_ready'], reports.patchReviewBundle.summary?.public_ready_after_bundle),
    component('patch-review-bundle-guard', reports.patchReviewBundleCheck.status, ['owner_unlock_patch_review_bundle_guard_passed'], reports.patchReviewBundleCheck.summary?.public_ready_after_check),
    component('intake-apply-plan', reports.intakeApplyPlan.status, ['owner_unlock_intake_apply_plan_ready'], reports.intakeApplyPlan.summary?.public_ready_after_plan),
    component('intake-apply-plan-guard', reports.intakeApplyPlanCheck.status, ['owner_unlock_intake_apply_plan_guard_passed'], reports.intakeApplyPlanCheck.summary?.public_ready_after_check),
    component('session-edit-preview', reports.sessionEditPreview.status, ['owner_unlock_session_edit_preview_ready'], reports.sessionEditPreview.summary?.public_ready_after_preview),
    component('session-edit-preview-guard', reports.sessionEditPreviewCheck.status, ['owner_unlock_session_edit_preview_guard_passed'], reports.sessionEditPreviewCheck.summary?.public_ready_after_check),
    component('session-apply-guard', reports.sessionApplyGuard.status, ['owner_unlock_session_apply_guard_waiting_for_manual_apply', 'owner_unlock_session_apply_guard_passed_after_manual_apply'], reports.sessionApplyGuard.summary?.public_ready_after_guard),
    component('session-apply-guard-check', reports.sessionApplyGuardCheck.status, ['owner_unlock_session_apply_guard_check_passed'], reports.sessionApplyGuardCheck.summary?.public_ready_after_check),
    component('session-apply-guard-smoke', reports.sessionApplyGuardSmoke.status, ['owner_unlock_session_apply_guard_smoke_passed'], reports.sessionApplyGuardSmoke.summary?.public_ready_after_smoke),
    component('session-apply-guard-smoke-check', reports.sessionApplyGuardSmokeCheck.status, ['owner_unlock_session_apply_guard_smoke_check_passed'], reports.sessionApplyGuardSmokeCheck.summary?.public_ready_after_check),
    component('overseer-sync-board', reports.syncBoard.status, ['overseer_sync_board_ready'], reports.syncBoard.summary?.public_ready_after_board)
  ];
  const handoffNumbers = (reports.syncBoard.latest_handoffs || [])
    .map((handoff) => Number((handoff.filename.match(/synergiebericht-(\d+)/) || [])[1]))
    .filter(Number.isFinite);
  const latestHandoffMin = handoffNumbers.length ? Math.min(...handoffNumbers) : null;
  const latestHandoffMax = handoffNumbers.length ? Math.max(...handoffNumbers) : null;
  const guardChecks = [
    reports.validatorCheck.summary?.checks,
    reports.smokeCheck.summary?.checks,
    reports.intakeMapCheck.summary?.checks,
    reports.runbookCheck.summary?.checks,
    reports.answerDryRunCheck.summary?.checks,
    reports.fastReplyCardCheck.summary?.checks,
    reports.exactReplyPreviewCheck.summary?.checks,
    reports.pathAReadinessCheck.summary?.checks,
    reports.patchReviewBundleCheck.summary?.checks,
    reports.intakeApplyPlanCheck.summary?.checks,
    reports.sessionEditPreviewCheck.summary?.checks,
    reports.sessionApplyGuardCheck.summary?.checks,
    reports.sessionApplyGuardSmokeCheck.summary?.checks
  ].reduce((sum, value) => sum + Number(value || 0), 0);
  const guardChecksPassed = [
    Number(reports.validatorCheck.summary?.passed || 0) + (freeformRejectedAsExpected ? Number(reports.validatorCheck.summary?.failures || 0) : 0),
    reports.smokeCheck.summary?.passed,
    reports.intakeMapCheck.summary?.passed,
    Number(reports.runbookCheck.summary?.passed || 0) + (runbookGuardBootstrapExpected ? Number(reports.runbookCheck.summary?.failures || 0) : 0),
    reports.answerDryRunCheck.summary?.passed,
    reports.fastReplyCardCheck.summary?.passed,
    reports.exactReplyPreviewCheck.summary?.passed,
    reports.pathAReadinessCheck.summary?.passed,
    reports.patchReviewBundleCheck.summary?.passed,
    reports.intakeApplyPlanCheck.summary?.passed,
    reports.sessionEditPreviewCheck.summary?.passed,
    reports.sessionApplyGuardCheck.summary?.passed,
    reports.sessionApplyGuardSmokeCheck.summary?.passed
  ].reduce((sum, value) => sum + Number(value || 0), 0);
  const pathAReadyAfterExactReply = reports.pathAReadiness.summary?.path_a_can_start_after_exact_owner_reply === true &&
    reports.pathAReadiness.summary?.applies_decision_now === false &&
    reports.sessionEditPreview.summary?.writes_now === false;

  return {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    status: components.every((item) => item.ready) && guardChecks === guardChecksPassed
      ? 'owner_unlock_pipeline_checkpoint_ready'
      : 'owner_unlock_pipeline_checkpoint_attention_required',
    policy: {
      checkpoint_only: true,
      records_decisions: false,
      writes_intake_file_now: false,
      mutates_session_files_now: false,
      executes_commands_now: false,
      reads_private_content_now: false,
      runs_private_inventory_now: false,
      public_ready_after_checkpoint: 0
    },
    source_refs: Object.values(paths).map((path) => relative(root, path)),
    summary: {
      components: components.length,
      components_ready: components.filter((item) => item.ready).length,
      missing_inputs: missingInputs.length,
      missing_input_refs: missingInputs.map((report) => report.source_ref),
      guard_checks: guardChecks,
      guard_checks_passed: guardChecksPassed,
      expected_freeform_guard_failures: freeformRejectedAsExpected ? reports.validatorCheck.summary?.failures || 0 : 0,
      expected_runbook_bootstrap_failures: runbookGuardBootstrapExpected ? reports.runbookCheck.summary?.failures || 0 : 0,
      latest_handoff_min: latestHandoffMin,
      latest_handoff_max: latestHandoffMax,
      latest_handoff_count: handoffNumbers.length,
      owner_reply_state: reports.fastReplyCard.summary?.broad_unlock_intent
        ? 'broad_intent_seen_exact_reply_not_applied'
        : 'pending',
      source_root_state: 'blocked_until_explicit_owner_reply_and_guards',
      path_a_ready_after_exact_owner_reply: pathAReadyAfterExactReply,
      selected_root_path_preview: reports.sessionEditPreview.summary?.selected_root_path || reports.intakeApplyPlan.summary?.selected_root_path || null,
      selected_root_exists_preview: reports.sessionEditPreview.summary?.selected_root_exists === true || reports.intakeApplyPlan.summary?.selected_root_exists === true,
      session_edit_preview_writes_now: reports.sessionEditPreview.summary?.writes_now === true,
      session_apply_guard_status: reports.sessionApplyGuard.status,
      session_apply_guard_mode: reports.sessionApplyGuard.summary?.mode || null,
      session_apply_guard_private_diagnostic_allowed: reports.sessionApplyGuard.summary?.private_diagnostic_allowed_after_apply === true,
      session_apply_guard_smoke_status: reports.sessionApplyGuardSmoke.status,
      session_apply_guard_smoke_mode: reports.sessionApplyGuardSmoke.summary?.fixture_mode || null,
      session_apply_guard_smoke_private_diagnostic_allowed: reports.sessionApplyGuardSmoke.summary?.fixture_private_diagnostic_allowed_after_apply === true,
      session_apply_guard_smoke_writes_real_session: reports.sessionApplyGuardSmoke.policy?.writes_real_session === true,
      applies_decision_now: false,
      public_ready_after_checkpoint: 0
    },
    components,
    next_actions: [
      'Wait for explicit owner reply in the Owner Unlock Prompt format.',
      'Run the execution runbook sequence; do not skip validator, intake map, or human review gates.',
      'Keep private inventory blocked until source-root guards pass.'
    ],
    hard_stops: [
      'Do not treat this checkpoint as owner approval.',
      'Do not read private content from this checkpoint.',
      'Do not run private inventory from this checkpoint.',
      'Do not mark private-derived material public-ready.'
    ]
  };
}

function component(id, actual, expected, publicReady) {
  const expectedStatuses = Array.isArray(expected) ? expected : [expected];
  return {
    id,
    actual_status: actual,
    expected_statuses: expectedStatuses,
    ready: expectedStatuses.includes(actual),
    public_ready_after_component: publicReady ?? 0
  };
}

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

async function readJsonOptional(path, fallback) {
  try {
    return await readJson(path);
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error;
    return fallback;
  }
}

function missingInput(key, path) {
  return {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    status: 'missing_input',
    missing_input: true,
    input_key: key,
    source_ref: relative(root, path),
    policy: {
      placeholder_only: true,
      records_decisions: false,
      reads_private_content_now: false,
      runs_private_inventory_now: false,
      public_ready_after_placeholder: 0
    },
    summary: {
      checks: 0,
      passed: 0,
      failures: 0,
      public_ready_after_component: 0,
      public_ready_after_check: 0
    }
  };
}

function renderMarkdown(report) {
  const lines = [];
  lines.push('# Kosmo Owner Unlock Pipeline Checkpoint');
  lines.push('');
  lines.push(`Generated: ${report.generated_at}`);
  lines.push(`Status: \`${report.status}\``);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Components: ${report.summary.components_ready}/${report.summary.components}`);
  lines.push(`- Missing inputs: ${report.summary.missing_inputs}`);
  lines.push(`- Guard checks: ${report.summary.guard_checks_passed}/${report.summary.guard_checks}`);
  lines.push(`- Latest handoffs: ${report.summary.latest_handoff_min}-${report.summary.latest_handoff_max}`);
  lines.push(`- Owner reply state: ${report.summary.owner_reply_state}`);
  lines.push(`- Source-root state: ${report.summary.source_root_state}`);
  lines.push(`- Path A ready after exact owner reply: ${report.summary.path_a_ready_after_exact_owner_reply ? 'yes' : 'no'}`);
  lines.push(`- Selected root preview: ${report.summary.selected_root_path_preview || '-'}`);
  lines.push(`- Session edit preview writes now: ${report.summary.session_edit_preview_writes_now ? 'yes' : 'no'}`);
  lines.push(`- Session apply guard mode: ${report.summary.session_apply_guard_mode || '-'}`);
  lines.push(`- Fixture apply smoke mode: ${report.summary.session_apply_guard_smoke_mode || '-'}`);
  lines.push(`- Fixture smoke writes real session: ${report.summary.session_apply_guard_smoke_writes_real_session ? 'yes' : 'no'}`);
  lines.push(`- Public-ready after checkpoint: ${report.summary.public_ready_after_checkpoint}`);
  lines.push('');
  lines.push('## Components');
  lines.push('');
  report.components.forEach((item) => {
    lines.push(`- ${item.ready ? 'ready' : 'attention'}: \`${item.id}\` -> \`${item.actual_status}\``);
  });
  if (report.summary.missing_input_refs.length > 0) {
    lines.push('');
    lines.push('## Missing Inputs');
    lines.push('');
    report.summary.missing_input_refs.forEach((ref) => lines.push(`- \`${ref}\``));
  }
  lines.push('');
  lines.push('## Next Actions');
  lines.push('');
  report.next_actions.forEach((action) => lines.push(`- ${action}`));
  lines.push('');
  lines.push('## Hard Stops');
  lines.push('');
  report.hard_stops.forEach((item) => lines.push(`- ${item}`));
  lines.push('');
  return lines.join('\n');
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
