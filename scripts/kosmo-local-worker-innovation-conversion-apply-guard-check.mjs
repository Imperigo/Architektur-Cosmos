#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = new Date().toISOString().slice(0, 10);
const guardPath = resolve(root, args.guard || `data/kosmo-local-worker-innovation-conversion-apply-guard-${dateStamp}.json`);
const outputJson = resolve(root, args.out || `data/kosmo-local-worker-innovation-conversion-apply-guard-check-${dateStamp}.json`);
const outputMd = resolve(root, args.markdown || `docs/codex/kosmo-local-worker-innovation-conversion-apply-guard-check-${dateStamp}.md`);

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const guard = JSON.parse(await readFile(guardPath, 'utf8'));
  const checks = buildChecks(guard);
  const failures = checks.filter((check) => check.status === 'failed');
  const report = {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    status: failures.length === 0
      ? 'local_worker_innovation_conversion_apply_guard_guard_passed'
      : 'local_worker_innovation_conversion_apply_guard_guard_failed',
    policy: {
      validates_guard_only: true,
      executes_conversions_now: false,
      reads_private_content_now: false,
      writes_repo_derivatives_now: false,
      public_ready_after_check: 0
    },
    source_refs: [relative(root, guardPath)],
    summary: {
      checks: checks.length,
      passed: checks.length - failures.length,
      failures: failures.length,
      guard_status: guard.status,
      mode: guard.summary?.mode || null,
      apply_allowed_after_guard: guard.summary?.apply_allowed_after_guard === true,
      public_ready_after_check: 0
    },
    checks
  };

  await mkdir(dirname(outputJson), { recursive: true });
  await mkdir(dirname(outputMd), { recursive: true });
  await writeFile(outputJson, `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(outputMd, renderMarkdown(report));

  console.log('Kosmo local worker innovation conversion apply guard check');
  console.log(`Status: ${report.status}`);
  console.log(`Checks: ${report.summary.passed}/${report.summary.checks}`);
  console.log(`Mode: ${report.summary.mode}`);
  console.log(`Failures: ${report.summary.failures}`);
  console.log(`Wrote: ${relative(root, outputMd)}`);

  if (failures.length > 0) process.exitCode = 1;
}

function buildChecks(guard) {
  const allowedModes = new Set([
    'waiting_for_positive_review_decisions',
    'waiting_for_exact_apply_reply',
    'ready_for_separate_conversion_apply',
    'blocked_by_apply_reply'
  ]);
  const hardStops = (guard.hard_stops || []).join(' ').toLowerCase();
  const required = (guard.required_exact_reply || []).join(' ');
  const exactValid = guard.summary?.exact_reply_valid === true;
  return [
    check('status_ready', guard.status === 'local_worker_innovation_conversion_apply_guard_ready', guard.status),
    check('mode_guarded', allowedModes.has(guard.summary?.mode), guard.summary?.mode),
    check('policy_guard_only', guard.policy?.guard_only === true, guard.policy?.guard_only),
    check('policy_no_apply_now', guard.policy?.applies_conversion_now === false, guard.policy?.applies_conversion_now),
    check('policy_no_conversion_now', guard.policy?.executes_conversions_now === false, guard.policy?.executes_conversions_now),
    check('policy_no_private_reads', guard.policy?.reads_private_sources_now === false, guard.policy?.reads_private_sources_now),
    check('policy_no_worker_execution', guard.policy?.executes_local_workers_now === false, guard.policy?.executes_local_workers_now),
    check('policy_no_model_start', guard.policy?.starts_models_now === false, guard.policy?.starts_models_now),
    check('policy_no_body_copy', guard.policy?.copies_worker_output_body_now === false && guard.policy?.copies_worker_recommendation_text_now === false, JSON.stringify(guard.policy)),
    check('policy_no_repo_derivatives', guard.policy?.writes_repo_derivatives_now === false, guard.policy?.writes_repo_derivatives_now),
    check('policy_no_training', guard.policy?.promotes_training_rows_now === false, guard.policy?.promotes_training_rows_now),
    check('public_ready_zero', guard.policy?.public_ready_after_guard === 0 && guard.summary?.public_ready_after_guard === 0, guard.summary?.public_ready_after_guard),
    check('conversions_zero', guard.summary?.conversions_executed_now === 0, guard.summary?.conversions_executed_now),
    check('repo_outputs_zero', guard.summary?.repo_outputs_written_now === 0, guard.summary?.repo_outputs_written_now),
    check('training_zero', guard.summary?.training_rows_promoted_now === 0, guard.summary?.training_rows_promoted_now),
    check('body_copy_zero', guard.summary?.worker_output_bodies_copied_now === 0 && guard.summary?.worker_recommendation_text_copied_now === 0, JSON.stringify(guard.summary)),
    check('apply_flag_consistent', exactValid === (guard.summary?.apply_allowed_after_guard === true), `${exactValid}/${guard.summary?.apply_allowed_after_guard}`),
    check('waiting_positive_has_no_apply', guard.summary?.mode !== 'waiting_for_positive_review_decisions' || guard.summary?.apply_allowed_after_guard === false, guard.summary?.apply_allowed_after_guard),
    check('ready_requires_exact_reply', guard.summary?.mode !== 'ready_for_separate_conversion_apply' || exactValid, guard.summary?.mode),
    check('required_choice', required.includes('local_worker_conversion_plan_choice=approve_separate_conversion_apply_later'), required),
    check('required_candidate', required.includes('candidate_task_id=<task_id>'), required),
    check('required_human_overseer', required.includes('confirmed_human_overseer_decision=yes'), required),
    check('required_validator', required.includes('confirmed_validator_guard_passed=yes'), required),
    check('required_no_private', required.includes('confirmed_no_private_content=yes'), required),
    check('required_no_body_copy', required.includes('confirmed_no_worker_body_copy=yes'), required),
    check('required_public_false', required.includes('confirmed_public_ready_false=yes'), required),
    check('hard_stop_no_conversion', hardStops.includes('never executes conversions'), hardStops),
    check('hard_stop_no_repo_derivatives', hardStops.includes('never writes repo derivatives'), hardStops),
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
  lines.push('# Kosmo Local Worker Innovation Conversion Apply Guard Check');
  lines.push('');
  lines.push(`Generated: ${report.generated_at}`);
  lines.push(`Status: \`${report.status}\``);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Checks: ${report.summary.passed}/${report.summary.checks}`);
  lines.push(`- Failures: ${report.summary.failures}`);
  lines.push(`- Guard status: ${report.summary.guard_status}`);
  lines.push(`- Mode: ${report.summary.mode}`);
  lines.push(`- Apply allowed after guard: ${report.summary.apply_allowed_after_guard ? 'yes' : 'no'}`);
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
