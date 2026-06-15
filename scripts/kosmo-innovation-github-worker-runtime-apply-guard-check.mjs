#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = new Date().toISOString().slice(0, 10);
const guardPath = resolve(root, args.guard || `data/kosmo-innovation-github-worker-runtime-apply-guard-${dateStamp}.json`);
const outputJson = resolve(root, args.out || `data/kosmo-innovation-github-worker-runtime-apply-guard-check-${dateStamp}.json`);
const outputMd = resolve(root, args.markdown || `docs/codex/kosmo-innovation-github-worker-runtime-apply-guard-check-${dateStamp}.md`);

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const guard = JSON.parse(await readFile(guardPath, 'utf8'));
  const checks = buildChecks(guard);
  const failures = checks.filter((checkItem) => checkItem.status === 'failed');
  const report = {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    status: failures.length === 0
      ? 'innovation_github_worker_runtime_apply_guard_guard_passed'
      : 'innovation_github_worker_runtime_apply_guard_guard_failed',
    policy: {
      validates_guard_only: true,
      executes_runtime_now: false,
      executes_local_workers_now: false,
      starts_models_now: false,
      reads_private_content_now: false,
      public_ready_after_check: 0
    },
    source_refs: [relative(root, guardPath)],
    summary: {
      checks: checks.length,
      passed: checks.length - failures.length,
      failures: failures.length,
      guard_status: guard.status,
      exact_reply_valid: guard.summary?.exact_reply_valid === true,
      separate_runtime_allowed_after_guard: guard.summary?.separate_runtime_allowed_after_guard === true,
      execute_now: guard.summary?.execute_now ?? null,
      public_ready_after_check: 0
    },
    checks
  };

  await mkdir(dirname(outputJson), { recursive: true });
  await mkdir(dirname(outputMd), { recursive: true });
  await writeFile(outputJson, `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(outputMd, renderMarkdown(report));

  console.log('Kosmo innovation GitHub worker runtime apply guard check');
  console.log(`Status: ${report.status}`);
  console.log(`Checks: ${report.summary.passed}/${report.summary.checks}`);
  console.log(`Guard status: ${report.summary.guard_status}`);
  console.log(`Failures: ${report.summary.failures}`);
  console.log(`Wrote: ${relative(root, outputMd)}`);

  if (failures.length > 0) process.exitCode = 1;
}

function buildChecks(guard) {
  const allowedStatuses = new Set([
    'innovation_github_worker_runtime_apply_guard_waiting_for_exact_reply',
    'innovation_github_worker_runtime_apply_guard_ready_for_separate_runtime_batch',
    'innovation_github_worker_runtime_apply_guard_blocked_by_reply'
  ]);
  const exactReply = (guard.required_exact_reply || []).join(' ');
  const hardStops = (guard.hard_stops || []).join(' ').toLowerCase();
  const exactValid = guard.summary?.exact_reply_valid === true;
  return [
    check('status_guarded', allowedStatuses.has(guard.status), guard.status),
    check('policy_guard_only', guard.policy?.guard_only === true, guard.policy?.guard_only),
    check('policy_no_decision_now', guard.policy?.records_owner_decision_now === false, guard.policy?.records_owner_decision_now),
    check('policy_no_runtime_now', guard.policy?.executes_runtime_now === false, guard.policy?.executes_runtime_now),
    check('policy_no_rollback_now', guard.policy?.executes_rollback_now === false, guard.policy?.executes_rollback_now),
    check('policy_no_local_workers_now', guard.policy?.executes_local_workers_now === false, guard.policy?.executes_local_workers_now),
    check('policy_no_model_start', guard.policy?.starts_models_now === false, guard.policy?.starts_models_now),
    check('policy_no_dependency_install', guard.policy?.installs_dependencies_now === false, guard.policy?.installs_dependencies_now),
    check('policy_no_private_reads', guard.policy?.reads_private_content_now === false, guard.policy?.reads_private_content_now),
    check('policy_no_outputs', guard.policy?.writes_runtime_outputs_now === false && guard.policy?.writes_worker_outputs_now === false, JSON.stringify(guard.policy)),
    check('policy_no_secret_copy', guard.policy?.copies_secret_values_now === false, guard.policy?.copies_secret_values_now),
    check('policy_no_training_promotion', guard.policy?.promotes_training_rows_now === false, guard.policy?.promotes_training_rows_now),
    check('public_ready_zero', guard.policy?.public_ready_after_guard === 0 && guard.summary?.public_ready_after_guard === 0, guard.summary?.public_ready_after_guard),
    check('execute_zero', guard.summary?.execute_now === 0, guard.summary?.execute_now),
    check('runtime_not_executable_now', guard.summary?.runtime_executable_now === false, guard.summary?.runtime_executable_now),
    check('starts_models_false', guard.summary?.starts_models_now === false, guard.summary?.starts_models_now),
    check('no_private_reads_summary', guard.summary?.reads_private_content_now === false, guard.summary?.reads_private_content_now),
    check('no_runtime_outputs_summary', guard.summary?.writes_runtime_outputs_now === false, guard.summary?.writes_runtime_outputs_now),
    check('exact_reply_required_choice', exactReply.includes('github_worker_runtime_choice=approve_separate_source_free_runtime_batch_later'), exactReply),
    check('exact_reply_source_free', exactReply.includes('confirmed_source_free_only=yes'), exactReply),
    check('exact_reply_no_private', exactReply.includes('confirmed_no_private_content=yes'), exactReply),
    check('exact_reply_no_start_from_guard', exactReply.includes('confirmed_no_model_or_worker_start_from_guard=yes'), exactReply),
    check('exact_reply_redaction_rerun', exactReply.includes('confirmed_rerun_redaction_and_rollback_checks=yes'), exactReply),
    check('exact_reply_review_only_outputs', exactReply.includes('confirmed_runtime_outputs_review_only=yes'), exactReply),
    check('separate_runtime_flag_consistent', exactValid === (guard.summary?.separate_runtime_allowed_after_guard === true), `${exactValid}/${guard.summary?.separate_runtime_allowed_after_guard}`),
    check('valid_reply_has_ready_status', !exactValid || guard.status === 'innovation_github_worker_runtime_apply_guard_ready_for_separate_runtime_batch', guard.status),
    check('invalid_or_waiting_no_runtime', exactValid || guard.summary?.separate_runtime_allowed_after_guard === false, guard.summary?.separate_runtime_allowed_after_guard),
    check('hard_stop_no_runtime', hardStops.includes('never executes runtime'), hardStops),
    check('hard_stop_no_models_workers', hardStops.includes('never starts models') && hardStops.includes('local workers'), hardStops),
    check('hard_stop_no_private', hardStops.includes('private source root') && hardStops.includes('onedrive'), hardStops),
    check('hard_stop_exact_required', hardStops.includes('exact key=value'), hardStops)
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
  lines.push('# Kosmo Innovation GitHub Worker Runtime Apply Guard Check');
  lines.push('');
  lines.push(`Generated: ${report.generated_at}`);
  lines.push(`Status: \`${report.status}\``);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Checks: ${report.summary.passed}/${report.summary.checks}`);
  lines.push(`- Failures: ${report.summary.failures}`);
  lines.push(`- Guard status: ${report.summary.guard_status}`);
  lines.push(`- Exact reply valid: ${report.summary.exact_reply_valid ? 'yes' : 'no'}`);
  lines.push(`- Separate runtime allowed after guard: ${report.summary.separate_runtime_allowed_after_guard ? 'yes' : 'no'}`);
  lines.push(`- Execute now: ${report.summary.execute_now}`);
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
    if (next && !next.startsWith('--')) {
      parsed[key] = next;
      index += 1;
    } else {
      parsed[key] = true;
    }
  }
  return parsed;
}
