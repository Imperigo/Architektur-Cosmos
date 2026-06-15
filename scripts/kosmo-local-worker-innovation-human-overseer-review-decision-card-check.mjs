#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = new Date().toISOString().slice(0, 10);
const cardPath = resolve(root, args.card || `data/kosmo-local-worker-innovation-human-overseer-review-decision-card-${dateStamp}.json`);
const outputJson = resolve(root, args.out || `data/kosmo-local-worker-innovation-human-overseer-review-decision-card-check-${dateStamp}.json`);
const outputMd = resolve(root, args.markdown || `docs/codex/kosmo-local-worker-innovation-human-overseer-review-decision-card-check-${dateStamp}.md`);

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const card = JSON.parse(await readFile(cardPath, 'utf8'));
  const checks = buildChecks(card);
  const failures = checks.filter((check) => check.status === 'failed');
  const report = {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    status: failures.length === 0
      ? 'local_worker_innovation_human_overseer_review_decision_card_guard_passed'
      : 'local_worker_innovation_human_overseer_review_decision_card_guard_failed',
    policy: {
      validates_decision_card_only: true,
      applies_decisions_now: false,
      executes_local_workers_now: false,
      starts_models_now: false,
      reads_private_content_now: false,
      public_ready_after_check: 0
    },
    source_refs: [relative(root, cardPath)],
    summary: {
      checks: checks.length,
      passed: checks.length - failures.length,
      failures: failures.length,
      card_status: card.status,
      mode: card.summary?.mode || null,
      review_candidates: card.summary?.review_candidates ?? null,
      public_ready_after_check: 0
    },
    checks
  };

  await mkdir(dirname(outputJson), { recursive: true });
  await mkdir(dirname(outputMd), { recursive: true });
  await writeFile(outputJson, `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(outputMd, renderMarkdown(report));

  console.log('Kosmo local worker innovation human/overseer review decision card check');
  console.log(`Status: ${report.status}`);
  console.log(`Checks: ${report.summary.passed}/${report.summary.checks}`);
  console.log(`Mode: ${report.summary.mode}`);
  console.log(`Failures: ${report.summary.failures}`);
  console.log(`Wrote: ${relative(root, outputMd)}`);

  if (failures.length > 0) process.exitCode = 1;
}

function buildChecks(card) {
  const allowedModes = new Set([
    'waiting_for_review_candidates',
    'decision_candidates_waiting_human_overseer'
  ]);
  const hardStops = (card.hard_stops || []).join(' ').toLowerCase();
  const exactReply = String(card.exact_reply_template_for_future_candidate || '');
  const allowedIds = new Set((card.allowed_answers || []).map((answer) => answer.id));
  const candidates = card.candidates || [];
  return [
    check('status_ready', card.status === 'local_worker_innovation_human_overseer_review_decision_card_ready', card.status),
    check('mode_guarded', allowedModes.has(card.summary?.mode), card.summary?.mode),
    check('policy_card_only', card.policy?.decision_card_only === true, card.policy?.decision_card_only),
    check('policy_no_apply_now', card.policy?.applies_decisions_now === false, card.policy?.applies_decisions_now),
    check('policy_metadata_only', card.policy?.metadata_only === true, card.policy?.metadata_only),
    check('policy_no_private_reads', card.policy?.reads_private_sources_now === false, card.policy?.reads_private_sources_now),
    check('policy_no_execution', card.policy?.executes_local_workers_now === false, card.policy?.executes_local_workers_now),
    check('policy_no_model_start', card.policy?.starts_models_now === false, card.policy?.starts_models_now),
    check('policy_no_body_copy', card.policy?.copies_worker_output_body_now === false && card.policy?.copies_worker_recommendation_text_now === false, JSON.stringify(card.policy)),
    check('policy_no_derivatives', card.policy?.writes_repo_derivatives_now === false, card.policy?.writes_repo_derivatives_now),
    check('policy_no_training', card.policy?.promotes_training_rows_now === false, card.policy?.promotes_training_rows_now),
    check('public_ready_zero', card.policy?.public_ready_after_card === 0 && card.summary?.public_ready_after_card === 0, card.summary?.public_ready_after_card),
    check('decisions_applied_zero', card.summary?.decisions_applied_now === 0, card.summary?.decisions_applied_now),
    check('accepted_zero', card.summary?.accepted_now === 0, card.summary?.accepted_now),
    check('repo_conversions_zero', card.summary?.repo_conversions_now === 0, card.summary?.repo_conversions_now),
    check('training_zero', card.summary?.training_rows_promoted_now === 0, card.summary?.training_rows_promoted_now),
    check('candidates_no_apply', candidates.every((candidate) => candidate.decision_applied_now === false && candidate.accepted_now === false), candidates.length),
    check('candidates_no_conversion', candidates.every((candidate) => candidate.repo_conversion_allowed_now === false && candidate.training_promotion_allowed_now === false), candidates.length),
    check('candidate_public_ready_zero', candidates.every((candidate) => candidate.public_ready_after_decision === 0), candidates.length),
    check('allowed_answers_present', allowedIds.has('hold_waiting_for_review_candidates') && allowedIds.has('approve_review_candidate_for_separate_conversion_plan') && allowedIds.has('reject_or_rework_review_candidate'), [...allowedIds].join(', ')),
    check('exact_reply_has_candidate', exactReply.includes('candidate_task_id=<task_id>'), exactReply),
    check('exact_reply_has_validator_guard', exactReply.includes('confirmed_validator_guard_passed=yes'), exactReply),
    check('exact_reply_has_no_private', exactReply.includes('confirmed_no_private_content=yes'), exactReply),
    check('exact_reply_has_no_direct_conversion', exactReply.includes('confirmed_no_direct_repo_conversion=yes'), exactReply),
    check('exact_reply_has_public_false', exactReply.includes('confirmed_public_ready_false=yes'), exactReply),
    check('hard_stop_no_apply', hardStops.includes('never applies review decisions'), hardStops),
    check('hard_stop_no_accept', hardStops.includes('never accepts worker outputs'), hardStops),
    check('hard_stop_no_body_copy', hardStops.includes('never copies worker output bodies'), hardStops),
    check('hard_stop_no_training_public', hardStops.includes('training rows') && hardStops.includes('public-ready'), hardStops),
    check('hard_stop_no_private', hardStops.includes('private source root') && hardStops.includes('onedrive'), hardStops)
  ];
}

function check(id, condition, evidence) {
  return {
    id,
    status: condition ? 'passed' : 'failed',
    evidence
  };
}

function renderMarkdown(report) {
  const lines = [];
  lines.push('# Kosmo Local Worker Innovation Human/Overseer Review Decision Card Check');
  lines.push('');
  lines.push(`Generated: ${report.generated_at}`);
  lines.push(`Status: \`${report.status}\``);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Checks: ${report.summary.passed}/${report.summary.checks}`);
  lines.push(`- Failures: ${report.summary.failures}`);
  lines.push(`- Card status: ${report.summary.card_status}`);
  lines.push(`- Mode: ${report.summary.mode}`);
  lines.push(`- Review candidates: ${report.summary.review_candidates}`);
  lines.push(`- Public-ready after check: ${report.summary.public_ready_after_check}`);
  lines.push('');
  lines.push('## Checks');
  lines.push('');
  report.checks.forEach((checkItem) => {
    lines.push(`- ${checkItem.status}: \`${checkItem.id}\` - ${String(checkItem.evidence ?? '-')}`);
  });
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
    if (index + 1 < argv.length && !String(next).startsWith('--')) {
      parsed[key] = next;
      index += 1;
    } else {
      parsed[key] = true;
    }
  }
  return parsed;
}
