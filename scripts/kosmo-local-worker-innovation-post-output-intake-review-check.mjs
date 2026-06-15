#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = new Date().toISOString().slice(0, 10);
const intakePath = resolve(root, args.intake || `data/kosmo-local-worker-innovation-post-output-intake-review-${dateStamp}.json`);
const outputJson = resolve(root, args.out || `data/kosmo-local-worker-innovation-post-output-intake-review-check-${dateStamp}.json`);
const outputMd = resolve(root, args.markdown || `docs/codex/kosmo-local-worker-innovation-post-output-intake-review-check-${dateStamp}.md`);

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const intake = JSON.parse(await readFile(intakePath, 'utf8'));
  const checks = buildChecks(intake);
  const failures = checks.filter((check) => check.status === 'failed');
  const report = {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    status: failures.length === 0
      ? 'local_worker_innovation_post_output_intake_review_guard_passed'
      : 'local_worker_innovation_post_output_intake_review_guard_failed',
    policy: {
      validates_intake_review_only: true,
      metadata_only: true,
      executes_local_workers_now: false,
      starts_models_now: false,
      reads_private_content_now: false,
      public_ready_after_check: 0
    },
    source_refs: [relative(root, intakePath)],
    summary: {
      checks: checks.length,
      passed: checks.length - failures.length,
      failures: failures.length,
      intake_status: intake.status,
      mode: intake.summary?.mode || null,
      review_candidates: intake.summary?.review_candidates ?? null,
      public_ready_after_check: 0
    },
    checks
  };

  await mkdir(dirname(outputJson), { recursive: true });
  await mkdir(dirname(outputMd), { recursive: true });
  await writeFile(outputJson, `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(outputMd, renderMarkdown(report));

  console.log('Kosmo local worker innovation post-output intake review check');
  console.log(`Status: ${report.status}`);
  console.log(`Checks: ${report.summary.passed}/${report.summary.checks}`);
  console.log(`Mode: ${report.summary.mode}`);
  console.log(`Failures: ${report.summary.failures}`);
  console.log(`Wrote: ${relative(root, outputMd)}`);

  if (failures.length > 0) process.exitCode = 1;
}

function buildChecks(intake) {
  const items = intake.review_items || [];
  const hardStops = (intake.hard_stops || []).join(' ').toLowerCase();
  const required = intake.required_before_acceptance || [];
  const allowedModes = new Set([
    'waiting_for_worker_outputs',
    'review_candidates_waiting_human_overseer',
    'blocked_by_validator_review'
  ]);
  return [
    check('status_ready', intake.status === 'local_worker_innovation_post_output_intake_review_ready', intake.status),
    check('mode_guarded', allowedModes.has(intake.summary?.mode), intake.summary?.mode),
    check('policy_intake_review_only', intake.policy?.intake_review_only === true, intake.policy?.intake_review_only),
    check('policy_metadata_only', intake.policy?.metadata_only === true, intake.policy?.metadata_only),
    check('policy_no_private_reads', intake.policy?.reads_private_sources_now === false, intake.policy?.reads_private_sources_now),
    check('policy_no_execution', intake.policy?.executes_local_workers_now === false, intake.policy?.executes_local_workers_now),
    check('policy_no_model_start', intake.policy?.starts_models_now === false, intake.policy?.starts_models_now),
    check('policy_no_body_copy', intake.policy?.copies_worker_output_body_now === false && intake.policy?.copies_worker_recommendation_text_now === false, JSON.stringify(intake.policy)),
    check('policy_review_candidates_only', intake.policy?.accepts_outputs_as_review_candidates_only === true, intake.policy?.accepts_outputs_as_review_candidates_only),
    check('policy_no_derivatives', intake.policy?.writes_repo_derivatives_now === false, intake.policy?.writes_repo_derivatives_now),
    check('policy_no_training_promotion', intake.policy?.promotes_training_rows_now === false, intake.policy?.promotes_training_rows_now),
    check('public_ready_zero', intake.policy?.public_ready_after_intake === 0 && intake.summary?.public_ready_after_intake === 0, intake.summary?.public_ready_after_intake),
    check('five_items', intake.summary?.expected_slots === 5 && items.length === 5, `${items.length}/${intake.summary?.expected_slots}`),
    check('accepted_zero', intake.summary?.accepted_now === 0 && items.every((item) => item.accepted_now === false), intake.summary?.accepted_now),
    check('conversions_zero', intake.summary?.direct_repo_conversions_now === 0 && items.every((item) => item.direct_repo_conversion_allowed_now === false), intake.summary?.direct_repo_conversions_now),
    check('training_zero', intake.summary?.training_rows_promoted_now === 0 && items.every((item) => item.training_promotion_allowed_now === false), intake.summary?.training_rows_promoted_now),
    check('body_copy_zero', intake.summary?.worker_output_bodies_copied_now === 0 && items.every((item) => item.stores_body === false), intake.summary?.worker_output_bodies_copied_now),
    check('recommendation_copy_zero', intake.summary?.worker_recommendation_text_copied_now === 0 && items.every((item) => item.stores_recommendation_text === false), intake.summary?.worker_recommendation_text_copied_now),
    check('item_public_ready_zero', items.every((item) => item.public_ready_after_item === 0), items.length),
    check('required_acceptance_has_overseer', required.includes('human_or_overseer_review_decision'), required.join(', ')),
    check('required_acceptance_has_private_assertion', required.includes('no_private_content_assertion_confirmed'), required.join(', ')),
    check('hard_stop_no_direct_repo', hardStops.includes('do not accept any worker output directly'), hardStops),
    check('hard_stop_no_body_copy', hardStops.includes('do not copy worker output bodies'), hardStops),
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
  lines.push('# Kosmo Local Worker Innovation Post-Output Intake Review Check');
  lines.push('');
  lines.push(`Generated: ${report.generated_at}`);
  lines.push(`Status: \`${report.status}\``);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Checks: ${report.summary.passed}/${report.summary.checks}`);
  lines.push(`- Failures: ${report.summary.failures}`);
  lines.push(`- Intake status: ${report.summary.intake_status}`);
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
