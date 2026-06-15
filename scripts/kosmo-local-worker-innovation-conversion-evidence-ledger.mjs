#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = new Date().toISOString().slice(0, 10);

const refs = {
  outputValidator: resolve(root, args.outputValidator || `data/kosmo-local-worker-innovation-output-validator-${dateStamp}.json`),
  outputValidatorCheck: resolve(root, args.outputValidatorCheck || `data/kosmo-local-worker-innovation-output-validator-check-${dateStamp}.json`),
  intakeReview: resolve(root, args.intakeReview || `data/kosmo-local-worker-innovation-post-output-intake-review-${dateStamp}.json`),
  intakeReviewCheck: resolve(root, args.intakeReviewCheck || `data/kosmo-local-worker-innovation-post-output-intake-review-check-${dateStamp}.json`),
  decisionCard: resolve(root, args.decisionCard || `data/kosmo-local-worker-innovation-human-overseer-review-decision-card-${dateStamp}.json`),
  decisionCardCheck: resolve(root, args.decisionCardCheck || `data/kosmo-local-worker-innovation-human-overseer-review-decision-card-check-${dateStamp}.json`),
  conversionPlanPreview: resolve(root, args.preview || `data/kosmo-local-worker-innovation-conversion-plan-preview-${dateStamp}.json`),
  conversionPlanPreviewCheck: resolve(root, args.previewCheck || `data/kosmo-local-worker-innovation-conversion-plan-preview-check-${dateStamp}.json`),
  conversionApplyGuard: resolve(root, args.applyGuard || `data/kosmo-local-worker-innovation-conversion-apply-guard-${dateStamp}.json`),
  conversionApplyGuardCheck: resolve(root, args.applyGuardCheck || `data/kosmo-local-worker-innovation-conversion-apply-guard-check-${dateStamp}.json`)
};

const outputJson = resolve(root, args.out || `data/kosmo-local-worker-innovation-conversion-evidence-ledger-${dateStamp}.json`);
const outputMd = resolve(root, args.markdown || `docs/codex/kosmo-local-worker-innovation-conversion-evidence-ledger-${dateStamp}.md`);

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const reports = {};
  for (const [key, path] of Object.entries(refs)) reports[key] = await readJson(path);
  const ledger = buildLedger(reports);

  await mkdir(dirname(outputJson), { recursive: true });
  await mkdir(dirname(outputMd), { recursive: true });
  await writeFile(outputJson, `${JSON.stringify(ledger, null, 2)}\n`);
  await writeFile(outputMd, renderMarkdown(ledger));

  console.log('Kosmo local worker innovation conversion evidence ledger');
  console.log(`Status: ${ledger.status}`);
  console.log(`Mode: ${ledger.summary.mode}`);
  console.log(`Ledger entries: ${ledger.summary.ledger_entries}`);
  console.log(`Apply allowed after ledger: ${ledger.summary.apply_allowed_after_ledger ? 'yes' : 'no'}`);
  console.log(`Conversions executed now: ${ledger.summary.conversions_executed_now}`);
  console.log(`Public-ready after ledger: ${ledger.summary.public_ready_after_ledger}`);
  console.log(`Wrote: ${relative(root, outputMd)}`);
}

function buildLedger(reports) {
  const failures = [];
  const entries = [
    entry('output_validator_status_recorded', reports.outputValidator, refs.outputValidator, {
      expected_outputs: reports.outputValidator.summary?.expected_outputs ?? null,
      present_outputs: reports.outputValidator.summary?.present_outputs ?? null,
      stores_body_in_git: reports.outputValidator.policy?.stores_worker_output_body_in_git ?? null,
      public_ready_after_validation: reports.outputValidator.summary?.public_ready_after_validation ?? null
    }),
    entry('output_validator_check_recorded', reports.outputValidatorCheck, refs.outputValidatorCheck, {
      guard_failures: reports.outputValidatorCheck.summary?.failures ?? null,
      public_ready_after_check: reports.outputValidatorCheck.summary?.public_ready_after_check ?? null
    }),
    entry('post_output_intake_review_guard_recorded', reports.intakeReviewCheck, refs.intakeReviewCheck, {
      intake_status: reports.intakeReview.status,
      review_candidates: reports.intakeReview.summary?.review_candidates ?? null,
      accepted_now: reports.intakeReview.summary?.accepted_now ?? null
    }),
    entry('human_overseer_decision_card_guard_recorded', reports.decisionCardCheck, refs.decisionCardCheck, {
      decision_card_status: reports.decisionCard.status,
      review_candidates: reports.decisionCard.summary?.review_candidates ?? null,
      decisions_applied_now: reports.decisionCard.summary?.decisions_applied_now ?? null
    }),
    entry('conversion_plan_preview_guard_recorded', reports.conversionPlanPreviewCheck, refs.conversionPlanPreviewCheck, {
      preview_status: reports.conversionPlanPreview.status,
      eligible_candidates: reports.conversionPlanPreview.summary?.eligible_candidates ?? null,
      conversions_executed_now: reports.conversionPlanPreview.summary?.conversions_executed_now ?? null
    }),
    entry('conversion_apply_guard_recorded', reports.conversionApplyGuardCheck, refs.conversionApplyGuardCheck, {
      apply_guard_status: reports.conversionApplyGuard.status,
      apply_allowed_after_guard: reports.conversionApplyGuard.summary?.apply_allowed_after_guard ?? null,
      conversions_executed_now: reports.conversionApplyGuard.summary?.conversions_executed_now ?? null
    }),
    {
      id: 'no_apply_allowed_now',
      source_ref: relative(root, refs.conversionApplyGuard),
      status: reports.conversionApplyGuard.summary?.apply_allowed_after_guard === false ? 'recorded' : 'needs_review',
      evidence_kind: 'negative_apply_evidence',
      metadata_only: true,
      copied_worker_body_now: false,
      copied_worker_recommendation_text_now: false,
      notes: {
        mode: reports.conversionApplyGuard.summary?.mode || null,
        reason: 'No exact positive apply reply and no eligible conversion candidates are present.'
      }
    }
  ];

  expect(reports.outputValidator.policy?.stores_worker_output_body_in_git === false, failures, 'Output validator must forbid worker body storage.');
  expect(reports.intakeReview.policy?.metadata_only === true, failures, 'Post-output intake must stay metadata-only.');
  expect(reports.decisionCard.policy?.decision_card_only === true, failures, 'Decision card must stay decision-card-only.');
  expect(reports.conversionPlanPreview.policy?.preview_only === true, failures, 'Conversion preview must stay preview-only.');
  expect(reports.conversionApplyGuard.policy?.guard_only === true, failures, 'Conversion apply guard must stay guard-only.');
  expect(reports.conversionApplyGuard.summary?.apply_allowed_after_guard === false, failures, 'Apply must not be allowed without exact positive evidence.');
  expect(reports.conversionApplyGuard.summary?.conversions_executed_now === 0, failures, 'Apply guard must execute zero conversions.');
  expect(reports.conversionPlanPreview.summary?.public_ready_after_preview === 0, failures, 'Preview must keep public-ready at zero.');
  expect(reports.conversionApplyGuard.summary?.public_ready_after_guard === 0, failures, 'Apply guard must keep public-ready at zero.');

  const ready = failures.length === 0;
  const eligibleCandidates = reports.conversionApplyGuard.summary?.eligible_candidates ?? 0;
  const mode = ready && eligibleCandidates === 0
    ? 'waiting_for_conversion_evidence'
    : ready
      ? 'ledger_ready_waiting_for_separate_apply'
      : 'needs_review';

  return {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    status: ready
      ? 'local_worker_innovation_conversion_evidence_ledger_ready'
      : 'local_worker_innovation_conversion_evidence_ledger_needs_review',
    policy: {
      ledger_only: true,
      metadata_only: true,
      applies_conversion_now: false,
      executes_conversions_now: false,
      reads_private_sources_now: false,
      executes_local_workers_now: false,
      starts_models_now: false,
      copies_worker_output_body_now: false,
      copies_worker_recommendation_text_now: false,
      writes_repo_derivatives_now: false,
      promotes_training_rows_now: false,
      public_ready_after_ledger: 0
    },
    source_refs: Object.values(refs).map((path) => relative(root, path)),
    summary: {
      mode,
      ledger_entries: entries.length,
      eligible_candidates: eligibleCandidates,
      apply_allowed_after_guard: reports.conversionApplyGuard.summary?.apply_allowed_after_guard === true,
      apply_allowed_after_ledger: false,
      conversions_executed_now: 0,
      repo_outputs_written_now: 0,
      training_rows_promoted_now: 0,
      worker_output_bodies_copied_now: 0,
      worker_recommendation_text_copied_now: 0,
      public_ready_after_ledger: 0,
      failures: failures.length
    },
    ledger_entries: entries,
    next_actions: [
      'Keep local-worker conversion held until positive review candidates and exact apply evidence exist.',
      'Use this ledger as the audit source for Orbit, Claude/KosmoOverseer handoff and future conversion apply planning.',
      'Do not promote worker output to repo artifacts, training rows or public-ready state from this ledger.'
    ],
    hard_stops: [
      'This ledger never executes conversions.',
      'This ledger never writes repo derivatives.',
      'This ledger never copies worker output bodies or recommendation text into Git.',
      'This ledger never promotes training rows.',
      'This ledger never marks public-ready.',
      'This ledger never reads private Source Root, OneDrive or archive-library content.'
    ],
    failures
  };
}

function entry(id, report, path, notes) {
  return {
    id,
    source_ref: relative(root, path),
    status: report.summary?.failures === 0 || String(report.status || '').endsWith('_passed') ? 'recorded' : 'needs_review',
    evidence_kind: 'metadata_gate_status',
    metadata_only: true,
    copied_worker_body_now: false,
    copied_worker_recommendation_text_now: false,
    notes
  };
}

function expect(condition, failures, message) {
  if (!condition) failures.push(message);
}

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

function renderMarkdown(ledger) {
  const lines = [];
  lines.push('# Kosmo Local Worker Innovation Conversion Evidence Ledger');
  lines.push('');
  lines.push(`Generated: ${ledger.generated_at}`);
  lines.push(`Status: \`${ledger.status}\``);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Mode: ${ledger.summary.mode}`);
  lines.push(`- Ledger entries: ${ledger.summary.ledger_entries}`);
  lines.push(`- Eligible candidates: ${ledger.summary.eligible_candidates}`);
  lines.push(`- Apply allowed after guard: ${ledger.summary.apply_allowed_after_guard ? 'yes' : 'no'}`);
  lines.push(`- Apply allowed after ledger: ${ledger.summary.apply_allowed_after_ledger ? 'yes' : 'no'}`);
  lines.push(`- Conversions executed now: ${ledger.summary.conversions_executed_now}`);
  lines.push(`- Repo outputs written now: ${ledger.summary.repo_outputs_written_now}`);
  lines.push(`- Training rows promoted now: ${ledger.summary.training_rows_promoted_now}`);
  lines.push(`- Public-ready after ledger: ${ledger.summary.public_ready_after_ledger}`);
  lines.push(`- Failures: ${ledger.summary.failures}`);
  lines.push('');
  lines.push('## Ledger Entries');
  lines.push('');
  ledger.ledger_entries.forEach((item) => {
    lines.push(`- \`${item.id}\`: ${item.status} (${item.source_ref})`);
  });
  lines.push('');
  lines.push('## Hard Stops');
  lines.push('');
  ledger.hard_stops.forEach((stop) => lines.push(`- ${stop}`));
  lines.push('');
  if (ledger.failures.length > 0) {
    lines.push('## Failures');
    lines.push('');
    ledger.failures.forEach((failure) => lines.push(`- ${failure}`));
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
