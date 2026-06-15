#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = new Date().toISOString().slice(0, 10);

const refs = {
  envelope: resolve(root, args.envelope || `data/kosmo-local-worker-innovation-launch-execution-envelope-${dateStamp}.json`),
  envelopeCheck: resolve(root, args.envelopeCheck || `data/kosmo-local-worker-innovation-launch-execution-envelope-check-${dateStamp}.json`),
  outputValidator: resolve(root, args.outputValidator || `data/kosmo-local-worker-innovation-output-validator-${dateStamp}.json`),
  outputValidatorCheck: resolve(root, args.outputValidatorCheck || `data/kosmo-local-worker-innovation-output-validator-check-${dateStamp}.json`)
};

const outputJson = resolve(root, args.out || `data/kosmo-local-worker-innovation-post-output-intake-review-${dateStamp}.json`);
const outputMd = resolve(root, args.markdown || `docs/codex/kosmo-local-worker-innovation-post-output-intake-review-${dateStamp}.md`);

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const reports = {};
  for (const [key, path] of Object.entries(refs)) reports[key] = await readJson(path);
  const review = buildReview(reports);

  await mkdir(dirname(outputJson), { recursive: true });
  await mkdir(dirname(outputMd), { recursive: true });
  await writeFile(outputJson, `${JSON.stringify(review, null, 2)}\n`);
  await writeFile(outputMd, renderMarkdown(review));

  console.log('Kosmo local worker innovation post-output intake review');
  console.log(`Status: ${review.status}`);
  console.log(`Mode: ${review.summary.mode}`);
  console.log(`Expected slots: ${review.summary.expected_slots}`);
  console.log(`Review candidates: ${review.summary.review_candidates}`);
  console.log(`Accepted now: ${review.summary.accepted_now}`);
  console.log(`Public-ready after intake: ${review.summary.public_ready_after_intake}`);
  console.log(`Wrote: ${relative(root, outputMd)}`);
}

function buildReview(reports) {
  const failures = [];
  if (reports.envelope.status !== 'local_worker_innovation_launch_execution_envelope_prepared') {
    failures.push(`Envelope not prepared: ${reports.envelope.status}`);
  }
  if (reports.envelopeCheck.status !== 'local_worker_innovation_launch_execution_envelope_guard_passed') {
    failures.push(`Envelope guard not passed: ${reports.envelopeCheck.status}`);
  }
  if (![
    'local_worker_innovation_output_validator_waiting_for_outputs',
    'local_worker_innovation_output_validator_passed',
    'local_worker_innovation_output_validator_needs_review'
  ].includes(reports.outputValidator.status)) {
    failures.push(`Output validator status is not intake-compatible: ${reports.outputValidator.status}`);
  }
  if (reports.outputValidatorCheck.status !== 'local_worker_innovation_output_validator_guard_passed') {
    failures.push(`Output validator guard not passed: ${reports.outputValidatorCheck.status}`);
  }

  const slots = reports.envelope.slots || [];
  const filesByTaskId = new Map((reports.outputValidator.files || []).map((file) => [file.task_id, file]));
  const reviewItems = slots.map((slot) => {
    const file = filesByTaskId.get(slot.task_id) || {};
    const candidateStatus = file.status === 'present' && file.json_valid === true && file.policy_flags_match === true
      ? 'candidate_waiting_human_overseer_review'
      : file.status === 'present'
        ? 'candidate_blocked_needs_validator_review'
        : 'waiting_for_worker_output';
    return {
      slot_id: slot.slot_id,
      task_id: slot.task_id,
      lane: slot.lane,
      validator_file_status: file.status || 'missing',
      json_valid: file.json_valid ?? null,
      policy_flags_match: file.policy_flags_match ?? null,
      training_eval_lane_match: file.training_eval_lane_match ?? null,
      ontology_bindings_match: file.ontology_bindings_match ?? null,
      review_status: candidateStatus,
      accepted_now: false,
      direct_repo_conversion_allowed_now: false,
      training_promotion_allowed_now: false,
      public_ready_after_item: 0,
      stores_body: false,
      stores_recommendation_text: false
    };
  });

  const candidates = reviewItems.filter((item) => item.review_status === 'candidate_waiting_human_overseer_review');
  const blockedCandidates = reviewItems.filter((item) => item.review_status === 'candidate_blocked_needs_validator_review');
  const waiting = reviewItems.filter((item) => item.review_status === 'waiting_for_worker_output');
  const mode = failures.length > 0
    ? 'needs_review'
    : candidates.length > 0
      ? 'review_candidates_waiting_human_overseer'
      : blockedCandidates.length > 0
        ? 'blocked_by_validator_review'
        : 'waiting_for_worker_outputs';

  return {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    status: failures.length === 0
      ? 'local_worker_innovation_post_output_intake_review_ready'
      : 'local_worker_innovation_post_output_intake_review_needs_review',
    policy: {
      intake_review_only: true,
      metadata_only: true,
      reads_private_sources_now: false,
      executes_local_workers_now: false,
      starts_models_now: false,
      copies_worker_output_body_now: false,
      copies_worker_recommendation_text_now: false,
      accepts_outputs_as_review_candidates_only: true,
      writes_repo_derivatives_now: false,
      promotes_training_rows_now: false,
      public_ready_after_intake: 0
    },
    source_refs: Object.values(refs).map((path) => relative(root, path)),
    summary: {
      mode,
      expected_slots: slots.length,
      validator_expected_outputs: reports.outputValidator.summary?.expected_outputs ?? null,
      validator_present_outputs: reports.outputValidator.summary?.present_outputs ?? null,
      review_candidates: candidates.length,
      blocked_candidates: blockedCandidates.length,
      waiting_items: waiting.length,
      accepted_now: 0,
      direct_repo_conversions_now: 0,
      training_rows_promoted_now: 0,
      worker_output_bodies_copied_now: 0,
      worker_recommendation_text_copied_now: 0,
      public_ready_after_intake: 0,
      failures: failures.length
    },
    review_items: reviewItems,
    required_before_acceptance: [
      'output_validator_guard_passed',
      'human_or_overseer_review_decision',
      'no_private_content_assertion_confirmed',
      'public_ready_remains_false',
      'training_promotion_separate_review_required'
    ],
    hard_stops: [
      'Do not accept any worker output directly into repo artifacts.',
      'Do not copy worker output bodies or recommendation text into Git from this intake review.',
      'Do not promote training rows from this intake review.',
      'Do not mark public-ready from this intake review.',
      'Do not read private Source Root, OneDrive or archive-library content.'
    ],
    next_actions: [
      'Keep waiting until source-free worker outputs exist and the validator sees them.',
      'When candidates appear, create a separate human/overseer review decision before any conversion.',
      'Keep all items review-only and public-ready false.'
    ],
    failures
  };
}

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

function renderMarkdown(review) {
  const lines = [];
  lines.push('# Kosmo Local Worker Innovation Post-Output Intake Review');
  lines.push('');
  lines.push(`Generated: ${review.generated_at}`);
  lines.push(`Status: \`${review.status}\``);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Mode: ${review.summary.mode}`);
  lines.push(`- Expected slots: ${review.summary.expected_slots}`);
  lines.push(`- Validator present outputs: ${review.summary.validator_present_outputs}`);
  lines.push(`- Review candidates: ${review.summary.review_candidates}`);
  lines.push(`- Blocked candidates: ${review.summary.blocked_candidates}`);
  lines.push(`- Waiting items: ${review.summary.waiting_items}`);
  lines.push(`- Accepted now: ${review.summary.accepted_now}`);
  lines.push(`- Public-ready after intake: ${review.summary.public_ready_after_intake}`);
  lines.push(`- Failures: ${review.summary.failures}`);
  lines.push('');
  lines.push('## Review Items');
  lines.push('');
  lines.push('| Slot | Lane | Validator status | Review status |');
  lines.push('| --- | --- | --- | --- |');
  review.review_items.forEach((item) => {
    lines.push(`| \`${item.slot_id}\` | ${item.lane} | ${item.validator_file_status} | ${item.review_status} |`);
  });
  lines.push('');
  lines.push('## Required Before Acceptance');
  lines.push('');
  review.required_before_acceptance.forEach((item) => lines.push(`- ${item}`));
  lines.push('');
  lines.push('## Hard Stops');
  lines.push('');
  review.hard_stops.forEach((stop) => lines.push(`- ${stop}`));
  lines.push('');
  if (review.failures.length > 0) {
    lines.push('## Failures');
    lines.push('');
    review.failures.forEach((failure) => lines.push(`- ${failure}`));
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
