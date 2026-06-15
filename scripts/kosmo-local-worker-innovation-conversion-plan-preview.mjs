#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = new Date().toISOString().slice(0, 10);

const refs = {
  decisionCard: resolve(root, args.decisionCard || `data/kosmo-local-worker-innovation-human-overseer-review-decision-card-${dateStamp}.json`),
  decisionCardCheck: resolve(root, args.decisionCardCheck || `data/kosmo-local-worker-innovation-human-overseer-review-decision-card-check-${dateStamp}.json`),
  intakeReview: resolve(root, args.intakeReview || `data/kosmo-local-worker-innovation-post-output-intake-review-${dateStamp}.json`),
  outputValidator: resolve(root, args.outputValidator || `data/kosmo-local-worker-innovation-output-validator-${dateStamp}.json`)
};

const outputJson = resolve(root, args.out || `data/kosmo-local-worker-innovation-conversion-plan-preview-${dateStamp}.json`);
const outputMd = resolve(root, args.markdown || `docs/codex/kosmo-local-worker-innovation-conversion-plan-preview-${dateStamp}.md`);

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const reports = {};
  for (const [key, path] of Object.entries(refs)) reports[key] = await readJson(path);
  const preview = buildPreview(reports);

  await mkdir(dirname(outputJson), { recursive: true });
  await mkdir(dirname(outputMd), { recursive: true });
  await writeFile(outputJson, `${JSON.stringify(preview, null, 2)}\n`);
  await writeFile(outputMd, renderMarkdown(preview));

  console.log('Kosmo local worker innovation conversion plan preview');
  console.log(`Status: ${preview.status}`);
  console.log(`Mode: ${preview.summary.mode}`);
  console.log(`Eligible candidates: ${preview.summary.eligible_candidates}`);
  console.log(`Conversion steps planned: ${preview.summary.conversion_steps_planned}`);
  console.log(`Conversions executed now: ${preview.summary.conversions_executed_now}`);
  console.log(`Public-ready after preview: ${preview.summary.public_ready_after_preview}`);
  console.log(`Wrote: ${relative(root, outputMd)}`);
}

function buildPreview(reports) {
  const failures = [];
  if (reports.decisionCard.status !== 'local_worker_innovation_human_overseer_review_decision_card_ready') {
    failures.push(`Decision card not ready: ${reports.decisionCard.status}`);
  }
  if (reports.decisionCardCheck.status !== 'local_worker_innovation_human_overseer_review_decision_card_guard_passed') {
    failures.push(`Decision card guard not passed: ${reports.decisionCardCheck.status}`);
  }
  if (reports.intakeReview.status !== 'local_worker_innovation_post_output_intake_review_ready') {
    failures.push(`Intake review not ready: ${reports.intakeReview.status}`);
  }
  if (![
    'local_worker_innovation_output_validator_waiting_for_outputs',
    'local_worker_innovation_output_validator_passed',
    'local_worker_innovation_output_validator_needs_review'
  ].includes(reports.outputValidator.status)) {
    failures.push(`Output validator status not supported: ${reports.outputValidator.status}`);
  }

  const candidates = (reports.decisionCard.candidates || [])
    .filter((candidate) => candidate.recommended_decision === 'approve_review_candidate_for_separate_conversion_plan')
    .map((candidate) => ({
      task_id: candidate.task_id,
      lane: candidate.lane,
      source_slot_id: candidate.slot_id,
      plan_status: 'preview_only_waiting_for_separate_apply_guard',
      conversion_target: conversionTargetForLane(candidate.lane),
      required_before_conversion: [
        'human_overseer_decision_apply_guard_passed',
        'output_validator_guard_passed',
        'no_private_content_assertion_confirmed',
        'conversion_plan_apply_guard_passed',
        'public_ready_remains_false'
      ],
      conversion_executed_now: false,
      repo_output_written_now: false,
      training_row_promoted_now: false,
      public_ready_after_plan_item: 0
    }));

  const mode = failures.length > 0
    ? 'needs_review'
    : candidates.length > 0
      ? 'preview_waiting_for_separate_apply_guard'
      : 'waiting_for_positive_review_decisions';

  return {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    status: failures.length === 0
      ? 'local_worker_innovation_conversion_plan_preview_ready'
      : 'local_worker_innovation_conversion_plan_preview_needs_review',
    policy: {
      preview_only: true,
      applies_decisions_now: false,
      executes_conversions_now: false,
      reads_private_sources_now: false,
      executes_local_workers_now: false,
      starts_models_now: false,
      copies_worker_output_body_now: false,
      copies_worker_recommendation_text_now: false,
      writes_repo_derivatives_now: false,
      promotes_training_rows_now: false,
      public_ready_after_preview: 0
    },
    source_refs: Object.values(refs).map((path) => relative(root, path)),
    summary: {
      mode,
      eligible_candidates: candidates.length,
      conversion_steps_planned: candidates.length,
      conversions_executed_now: 0,
      repo_outputs_written_now: 0,
      training_rows_promoted_now: 0,
      worker_output_bodies_copied_now: 0,
      worker_recommendation_text_copied_now: 0,
      public_ready_after_preview: 0,
      failures: failures.length
    },
    conversion_plan_items: candidates,
    allowed_future_apply_decisions: [
      'hold_conversion_preview',
      'approve_separate_conversion_apply_later',
      'reject_or_rework_conversion_candidate'
    ],
    exact_reply_template_for_future_apply: [
      'local_worker_conversion_plan_choice=approve_separate_conversion_apply_later',
      'candidate_task_id=<task_id>',
      'confirmed_human_overseer_decision=yes',
      'confirmed_validator_guard_passed=yes',
      'confirmed_no_private_content=yes',
      'confirmed_no_worker_body_copy=yes',
      'confirmed_public_ready_false=yes',
      'note=Nur separaten Conversion-Apply-Guard vorbereiten, keine direkte Uebernahme.'
    ].join('; '),
    required_before_any_future_conversion: [
      'positive human/overseer decision exists',
      'output validator guard passed',
      'conversion plan apply guard passed',
      'no private content assertion confirmed',
      'no worker output body copied into git',
      'public_ready remains false'
    ],
    hard_stops: [
      'This preview never executes conversions.',
      'This preview never writes repo derivatives.',
      'This preview never copies worker output bodies or recommendation text into Git.',
      'This preview never promotes training rows.',
      'This preview never marks public-ready.',
      'This preview never reads private Source Root, OneDrive or archive-library content.'
    ],
    failures
  };
}

function conversionTargetForLane(lane) {
  if (lane === 'kosmo_prepare') return 'kosmo_prepare_adapter_candidate_review';
  if (lane === 'kosmo_asset') return 'kosmo_asset_candidate_review';
  if (lane === 'worker_integration') return 'worker_integration_contract_review';
  return 'source_free_innovation_review';
}

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

function renderMarkdown(preview) {
  const lines = [];
  lines.push('# Kosmo Local Worker Innovation Conversion Plan Preview');
  lines.push('');
  lines.push(`Generated: ${preview.generated_at}`);
  lines.push(`Status: \`${preview.status}\``);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Mode: ${preview.summary.mode}`);
  lines.push(`- Eligible candidates: ${preview.summary.eligible_candidates}`);
  lines.push(`- Conversion steps planned: ${preview.summary.conversion_steps_planned}`);
  lines.push(`- Conversions executed now: ${preview.summary.conversions_executed_now}`);
  lines.push(`- Repo outputs written now: ${preview.summary.repo_outputs_written_now}`);
  lines.push(`- Training rows promoted now: ${preview.summary.training_rows_promoted_now}`);
  lines.push(`- Public-ready after preview: ${preview.summary.public_ready_after_preview}`);
  lines.push(`- Failures: ${preview.summary.failures}`);
  lines.push('');
  lines.push('## Conversion Plan Items');
  lines.push('');
  if (preview.conversion_plan_items.length === 0) lines.push('- None.');
  else preview.conversion_plan_items.forEach((item) => lines.push(`- \`${item.task_id}\`: ${item.conversion_target}`));
  lines.push('');
  lines.push('## Exact Reply Template For Future Apply');
  lines.push('');
  lines.push('```text');
  lines.push(preview.exact_reply_template_for_future_apply);
  lines.push('```');
  lines.push('');
  lines.push('## Hard Stops');
  lines.push('');
  preview.hard_stops.forEach((stop) => lines.push(`- ${stop}`));
  lines.push('');
  if (preview.failures.length > 0) {
    lines.push('## Failures');
    lines.push('');
    preview.failures.forEach((failure) => lines.push(`- ${failure}`));
    lines.push('');
  }
  return lines.join('\n');
}

function parseArgs(argv) {
  const parsed = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) continue;
    const key = token.slice(2);
    const next = argv[index + 1];
    if (index + 1 < argv.length && !String(next).startsWith('--')) {
      parsed[key] = next;
      index += 1;
    } else {
      parsed[key] = true;
    }
  }
  return parsed;
}
