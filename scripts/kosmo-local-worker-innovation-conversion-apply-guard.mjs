#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = new Date().toISOString().slice(0, 10);

const refs = {
  preview: resolve(root, args.preview || `data/kosmo-local-worker-innovation-conversion-plan-preview-${dateStamp}.json`),
  previewCheck: resolve(root, args.previewCheck || `data/kosmo-local-worker-innovation-conversion-plan-preview-check-${dateStamp}.json`),
  decisionCard: resolve(root, args.decisionCard || `data/kosmo-local-worker-innovation-human-overseer-review-decision-card-${dateStamp}.json`),
  outputValidator: resolve(root, args.outputValidator || `data/kosmo-local-worker-innovation-output-validator-${dateStamp}.json`)
};

const answer = String(args.answer || '').trim();
const outputJson = resolve(root, args.out || `data/kosmo-local-worker-innovation-conversion-apply-guard-${dateStamp}.json`);
const outputMd = resolve(root, args.markdown || `docs/codex/kosmo-local-worker-innovation-conversion-apply-guard-${dateStamp}.md`);

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const reports = {};
  for (const [key, path] of Object.entries(refs)) reports[key] = await readJson(path);
  const report = buildReport(reports, answer);

  await mkdir(dirname(outputJson), { recursive: true });
  await mkdir(dirname(outputMd), { recursive: true });
  await writeFile(outputJson, `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(outputMd, renderMarkdown(report));

  console.log('Kosmo local worker innovation conversion apply guard');
  console.log(`Status: ${report.status}`);
  console.log(`Mode: ${report.summary.mode}`);
  console.log(`Answer present: ${report.summary.answer_present ? 'yes' : 'no'}`);
  console.log(`Exact reply valid: ${report.summary.exact_reply_valid ? 'yes' : 'no'}`);
  console.log(`Apply allowed after guard: ${report.summary.apply_allowed_after_guard ? 'yes' : 'no'}`);
  console.log(`Conversions executed now: ${report.summary.conversions_executed_now}`);
  console.log(`Public-ready after guard: ${report.summary.public_ready_after_guard}`);
  console.log(`Wrote: ${relative(root, outputMd)}`);
}

function buildReport(reports, rawAnswer) {
  const readinessFailures = [];
  const replyFailures = [];
  const parsed = parseKeyValueReply(rawAnswer);
  const answerPresent = rawAnswer.length > 0;
  const planItems = reports.preview.conversion_plan_items || [];

  if (reports.preview.status !== 'local_worker_innovation_conversion_plan_preview_ready') {
    readinessFailures.push(`Preview not ready: ${reports.preview.status}`);
  }
  if (reports.previewCheck.status !== 'local_worker_innovation_conversion_plan_preview_guard_passed') {
    readinessFailures.push(`Preview guard not passed: ${reports.previewCheck.status}`);
  }
  if (reports.decisionCard.status !== 'local_worker_innovation_human_overseer_review_decision_card_ready') {
    readinessFailures.push(`Decision card not ready: ${reports.decisionCard.status}`);
  }
  if (![
    'local_worker_innovation_output_validator_waiting_for_outputs',
    'local_worker_innovation_output_validator_passed',
    'local_worker_innovation_output_validator_needs_review'
  ].includes(reports.outputValidator.status)) {
    readinessFailures.push(`Output validator status not supported: ${reports.outputValidator.status}`);
  }
  if (reports.preview.summary?.conversions_executed_now !== 0) readinessFailures.push('Preview already executed conversions.');
  if (reports.preview.summary?.public_ready_after_preview !== 0) readinessFailures.push('Preview changed public-ready.');

  const eligibleTaskIds = new Set(planItems.map((item) => item.task_id));
  const required = {
    local_worker_conversion_plan_choice: 'approve_separate_conversion_apply_later',
    confirmed_human_overseer_decision: 'yes',
    confirmed_validator_guard_passed: 'yes',
    confirmed_no_private_content: 'yes',
    confirmed_no_worker_body_copy: 'yes',
    confirmed_public_ready_false: 'yes'
  };

  if (answerPresent) {
    Object.entries(required).forEach(([key, expected]) => {
      if (!parsed[key]) replyFailures.push(`Missing ${key}.`);
      else if (parsed[key] !== expected) replyFailures.push(`${key} must be ${expected}, got ${parsed[key]}.`);
    });
    if (!parsed.candidate_task_id) replyFailures.push('Missing candidate_task_id.');
    else if (!eligibleTaskIds.has(parsed.candidate_task_id)) replyFailures.push(`candidate_task_id is not eligible in preview: ${parsed.candidate_task_id}.`);
    if (!String(parsed.note || '').includes('keine direkte Uebernahme')) {
      replyFailures.push('note must explicitly mention keine direkte Uebernahme.');
    }
  }

  const exactReplyValid = answerPresent && readinessFailures.length === 0 && replyFailures.length === 0;
  const mode = readinessFailures.length > 0
    ? 'needs_review'
    : planItems.length === 0
      ? 'waiting_for_positive_review_decisions'
      : !answerPresent
        ? 'waiting_for_exact_apply_reply'
        : exactReplyValid
          ? 'ready_for_separate_conversion_apply'
          : 'blocked_by_apply_reply';

  const failures = [...readinessFailures, ...replyFailures];
  return {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    status: failures.length === 0
      ? 'local_worker_innovation_conversion_apply_guard_ready'
      : 'local_worker_innovation_conversion_apply_guard_needs_review',
    policy: {
      guard_only: true,
      applies_conversion_now: false,
      executes_conversions_now: false,
      reads_private_sources_now: false,
      executes_local_workers_now: false,
      starts_models_now: false,
      copies_worker_output_body_now: false,
      copies_worker_recommendation_text_now: false,
      writes_repo_derivatives_now: false,
      promotes_training_rows_now: false,
      public_ready_after_guard: 0
    },
    source_refs: Object.values(refs).map((path) => relative(root, path)),
    summary: {
      mode,
      answer_present: answerPresent,
      exact_reply_valid: exactReplyValid,
      eligible_candidates: planItems.length,
      apply_allowed_after_guard: exactReplyValid,
      conversions_executed_now: 0,
      repo_outputs_written_now: 0,
      training_rows_promoted_now: 0,
      worker_output_bodies_copied_now: 0,
      worker_recommendation_text_copied_now: 0,
      public_ready_after_guard: 0,
      readiness_failures: readinessFailures.length,
      reply_failures: replyFailures.length,
      failures: failures.length
    },
    parsed_answer: answerPresent ? parsed : null,
    required_exact_reply: [
      'local_worker_conversion_plan_choice=approve_separate_conversion_apply_later',
      'candidate_task_id=<task_id>',
      'confirmed_human_overseer_decision=yes',
      'confirmed_validator_guard_passed=yes',
      'confirmed_no_private_content=yes',
      'confirmed_no_worker_body_copy=yes',
      'confirmed_public_ready_false=yes',
      'note=Nur separaten Conversion-Apply-Guard vorbereiten, keine direkte Uebernahme.'
    ],
    eligible_task_ids: [...eligibleTaskIds],
    next_actions: exactReplyValid
      ? [
          'Open a separate conversion apply batch; this guard still executes nothing.',
          'Rerun validator, decision card, preview and this guard immediately before any future conversion.',
          'Keep public-ready false until a separate public review exists.'
        ]
      : [
          'Keep conversion held.',
          'Wait for positive review decisions and an exact apply reply.',
          'Do not write repo derivatives or copy worker output bodies from this guard.'
        ],
    hard_stops: [
      'This guard never executes conversions.',
      'This guard never writes repo derivatives.',
      'This guard never copies worker output bodies or recommendation text into Git.',
      'This guard never promotes training rows.',
      'This guard never marks public-ready.',
      'This guard never reads private Source Root, OneDrive or archive-library content.'
    ],
    failures
  };
}

function parseKeyValueReply(rawAnswer) {
  const parsed = {};
  rawAnswer.split(/[;\n]/).forEach((part) => {
    const [key, ...rest] = part.split('=');
    if (!key || rest.length === 0) return;
    parsed[key.trim()] = rest.join('=').trim();
  });
  return parsed;
}

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

function renderMarkdown(report) {
  const lines = [];
  lines.push('# Kosmo Local Worker Innovation Conversion Apply Guard');
  lines.push('');
  lines.push(`Generated: ${report.generated_at}`);
  lines.push(`Status: \`${report.status}\``);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Mode: ${report.summary.mode}`);
  lines.push(`- Answer present: ${report.summary.answer_present ? 'yes' : 'no'}`);
  lines.push(`- Exact reply valid: ${report.summary.exact_reply_valid ? 'yes' : 'no'}`);
  lines.push(`- Eligible candidates: ${report.summary.eligible_candidates}`);
  lines.push(`- Apply allowed after guard: ${report.summary.apply_allowed_after_guard ? 'yes' : 'no'}`);
  lines.push(`- Conversions executed now: ${report.summary.conversions_executed_now}`);
  lines.push(`- Repo outputs written now: ${report.summary.repo_outputs_written_now}`);
  lines.push(`- Public-ready after guard: ${report.summary.public_ready_after_guard}`);
  lines.push(`- Failures: ${report.summary.failures}`);
  lines.push('');
  lines.push('## Required Exact Reply');
  lines.push('');
  lines.push('```text');
  lines.push(report.required_exact_reply.join('; '));
  lines.push('```');
  lines.push('');
  lines.push('## Hard Stops');
  lines.push('');
  report.hard_stops.forEach((stop) => lines.push(`- ${stop}`));
  lines.push('');
  if (report.failures.length > 0) {
    lines.push('## Failures');
    lines.push('');
    report.failures.forEach((failure) => lines.push(`- ${failure}`));
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
