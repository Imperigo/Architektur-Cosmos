#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = new Date().toISOString().slice(0, 10);

const refs = {
  intakeReview: resolve(root, args.intakeReview || `data/kosmo-local-worker-innovation-post-output-intake-review-${dateStamp}.json`),
  intakeReviewCheck: resolve(root, args.intakeReviewCheck || `data/kosmo-local-worker-innovation-post-output-intake-review-check-${dateStamp}.json`),
  outputValidator: resolve(root, args.outputValidator || `data/kosmo-local-worker-innovation-output-validator-${dateStamp}.json`),
  executionEnvelope: resolve(root, args.executionEnvelope || `data/kosmo-local-worker-innovation-launch-execution-envelope-${dateStamp}.json`)
};

const outputJson = resolve(root, args.out || `data/kosmo-local-worker-innovation-human-overseer-review-decision-card-${dateStamp}.json`);
const outputMd = resolve(root, args.markdown || `docs/codex/kosmo-local-worker-innovation-human-overseer-review-decision-card-${dateStamp}.md`);

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const reports = {};
  for (const [key, path] of Object.entries(refs)) reports[key] = await readJson(path);
  const card = buildCard(reports);

  await mkdir(dirname(outputJson), { recursive: true });
  await mkdir(dirname(outputMd), { recursive: true });
  await writeFile(outputJson, `${JSON.stringify(card, null, 2)}\n`);
  await writeFile(outputMd, renderMarkdown(card));

  console.log('Kosmo local worker innovation human/overseer review decision card');
  console.log(`Status: ${card.status}`);
  console.log(`Mode: ${card.summary.mode}`);
  console.log(`Candidates: ${card.summary.review_candidates}`);
  console.log(`Decisions applied now: ${card.summary.decisions_applied_now}`);
  console.log(`Public-ready after card: ${card.summary.public_ready_after_card}`);
  console.log(`Wrote: ${relative(root, outputMd)}`);
}

function buildCard(reports) {
  const failures = [];
  if (reports.intakeReview.status !== 'local_worker_innovation_post_output_intake_review_ready') {
    failures.push(`Intake review not ready: ${reports.intakeReview.status}`);
  }
  if (reports.intakeReviewCheck.status !== 'local_worker_innovation_post_output_intake_review_guard_passed') {
    failures.push(`Intake review guard not passed: ${reports.intakeReviewCheck.status}`);
  }
  if (![
    'local_worker_innovation_output_validator_waiting_for_outputs',
    'local_worker_innovation_output_validator_passed',
    'local_worker_innovation_output_validator_needs_review'
  ].includes(reports.outputValidator.status)) {
    failures.push(`Output validator status not supported: ${reports.outputValidator.status}`);
  }
  if (reports.executionEnvelope.status !== 'local_worker_innovation_launch_execution_envelope_prepared') {
    failures.push(`Execution envelope not prepared: ${reports.executionEnvelope.status}`);
  }

  const candidates = (reports.intakeReview.review_items || [])
    .filter((item) => item.review_status === 'candidate_waiting_human_overseer_review')
    .map((item) => ({
      slot_id: item.slot_id,
      task_id: item.task_id,
      lane: item.lane,
      candidate_status: item.review_status,
      recommended_decision: 'hold_for_review',
      decision_applied_now: false,
      accepted_now: false,
      repo_conversion_allowed_now: false,
      training_promotion_allowed_now: false,
      public_ready_after_decision: 0
    }));

  const mode = failures.length > 0
    ? 'needs_review'
    : candidates.length > 0
      ? 'decision_candidates_waiting_human_overseer'
      : 'waiting_for_review_candidates';

  return {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    status: failures.length === 0
      ? 'local_worker_innovation_human_overseer_review_decision_card_ready'
      : 'local_worker_innovation_human_overseer_review_decision_card_needs_review',
    policy: {
      decision_card_only: true,
      applies_decisions_now: false,
      metadata_only: true,
      reads_private_sources_now: false,
      executes_local_workers_now: false,
      starts_models_now: false,
      copies_worker_output_body_now: false,
      copies_worker_recommendation_text_now: false,
      writes_repo_derivatives_now: false,
      promotes_training_rows_now: false,
      public_ready_after_card: 0
    },
    source_refs: Object.values(refs).map((path) => relative(root, path)),
    summary: {
      mode,
      review_candidates: candidates.length,
      waiting_items: reports.intakeReview.summary?.waiting_items ?? null,
      blocked_candidates: reports.intakeReview.summary?.blocked_candidates ?? null,
      decisions_applied_now: 0,
      accepted_now: 0,
      repo_conversions_now: 0,
      training_rows_promoted_now: 0,
      worker_output_bodies_copied_now: 0,
      worker_recommendation_text_copied_now: 0,
      public_ready_after_card: 0,
      failures: failures.length
    },
    question: candidates.length > 0
      ? 'Welche Review-Kandidaten duerfen nach separater Human/Overseer-Pruefung in einen spaeteren Uebernahme-Plan?'
      : 'Noch keine lokalen Worker-Outputs vorhanden. Soll die Review-Decision-Card bereit gehalten werden?',
    recommended_answer: {
      id: 'hold_waiting_for_review_candidates',
      label: 'Halten bis Kandidaten existieren',
      reason: 'Aktuell gibt es keine validierten lokalen Worker-Outputs; eine Entscheidung waere nur scheinbar autonom.'
    },
    allowed_answers: [
      {
        id: 'hold_waiting_for_review_candidates',
        effect: 'Keine Entscheidung, keine Uebernahme, weiter warten.'
      },
      {
        id: 'approve_review_candidate_for_separate_conversion_plan',
        effect: 'Nur fuer einen spaeteren separaten Conversion-Plan vormerken; keine direkte Uebernahme.'
      },
      {
        id: 'reject_or_rework_review_candidate',
        effect: 'Kandidat bleibt blockiert; lokale Worker-Ausgabe oder Validator/Policy wird ueberarbeitet.'
      }
    ],
    exact_reply_template_for_future_candidate: [
      'local_worker_review_decision=approve_review_candidate_for_separate_conversion_plan',
      'candidate_task_id=<task_id>',
      'confirmed_validator_guard_passed=yes',
      'confirmed_no_private_content=yes',
      'confirmed_no_direct_repo_conversion=yes',
      'confirmed_public_ready_false=yes',
      'note=Nur als Review-Kandidat fuer einen separaten Conversion-Plan vormerken.'
    ].join('; '),
    candidates,
    required_before_any_future_apply: [
      'candidate exists in post-output intake review',
      'output validator guard passed',
      'human_or_overseer_review_decision recorded separately',
      'no_private_content assertion confirmed',
      'separate conversion plan guard required',
      'public_ready remains false'
    ],
    hard_stops: [
      'This card never applies review decisions.',
      'This card never accepts worker outputs into repo artifacts.',
      'This card never copies worker output bodies or recommendation text into Git.',
      'This card never promotes training rows.',
      'This card never marks public-ready.',
      'This card never reads private Source Root, OneDrive or archive-library content.'
    ],
    failures
  };
}

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

function renderMarkdown(card) {
  const lines = [];
  lines.push('# Kosmo Local Worker Innovation Human/Overseer Review Decision Card');
  lines.push('');
  lines.push(`Generated: ${card.generated_at}`);
  lines.push(`Status: \`${card.status}\``);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Mode: ${card.summary.mode}`);
  lines.push(`- Review candidates: ${card.summary.review_candidates}`);
  lines.push(`- Decisions applied now: ${card.summary.decisions_applied_now}`);
  lines.push(`- Accepted now: ${card.summary.accepted_now}`);
  lines.push(`- Repo conversions now: ${card.summary.repo_conversions_now}`);
  lines.push(`- Training rows promoted now: ${card.summary.training_rows_promoted_now}`);
  lines.push(`- Public-ready after card: ${card.summary.public_ready_after_card}`);
  lines.push(`- Failures: ${card.summary.failures}`);
  lines.push('');
  lines.push('## Question');
  lines.push('');
  lines.push(card.question);
  lines.push('');
  lines.push('## Allowed Answers');
  lines.push('');
  card.allowed_answers.forEach((answer) => lines.push(`- \`${answer.id}\`: ${answer.effect}`));
  lines.push('');
  lines.push('## Exact Reply Template For Future Candidate');
  lines.push('');
  lines.push('```text');
  lines.push(card.exact_reply_template_for_future_candidate);
  lines.push('```');
  lines.push('');
  lines.push('## Candidates');
  lines.push('');
  if (card.candidates.length === 0) lines.push('- None.');
  else card.candidates.forEach((candidate) => lines.push(`- \`${candidate.task_id}\`: ${candidate.recommended_decision}`));
  lines.push('');
  lines.push('## Hard Stops');
  lines.push('');
  card.hard_stops.forEach((stop) => lines.push(`- ${stop}`));
  lines.push('');
  if (card.failures.length > 0) {
    lines.push('## Failures');
    lines.push('');
    card.failures.forEach((failure) => lines.push(`- ${failure}`));
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
