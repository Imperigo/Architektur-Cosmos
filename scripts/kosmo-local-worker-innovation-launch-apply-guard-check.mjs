#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = new Date().toISOString().slice(0, 10);
const guardPath = resolve(root, args.guard || `data/kosmo-local-worker-innovation-launch-apply-guard-${dateStamp}.json`);
const outputJson = resolve(root, args.out || `data/kosmo-local-worker-innovation-launch-apply-guard-check-${dateStamp}.json`);
const outputMd = resolve(root, args.markdown || `docs/codex/kosmo-local-worker-innovation-launch-apply-guard-check-${dateStamp}.md`);

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
      ? 'local_worker_innovation_launch_apply_guard_guard_passed'
      : 'local_worker_innovation_launch_apply_guard_guard_failed',
    policy: {
      validates_guard_only: true,
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
      separate_launch_allowed_after_guard: guard.summary?.separate_launch_allowed_after_guard === true,
      execute_now: guard.summary?.execute_now ?? null,
      public_ready_after_check: 0
    },
    checks
  };

  await mkdir(dirname(outputJson), { recursive: true });
  await mkdir(dirname(outputMd), { recursive: true });
  await writeFile(outputJson, `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(outputMd, renderMarkdown(report));

  console.log('Kosmo local worker innovation launch apply guard check');
  console.log(`Status: ${report.status}`);
  console.log(`Checks: ${report.summary.passed}/${report.summary.checks}`);
  console.log(`Guard status: ${report.summary.guard_status}`);
  console.log(`Failures: ${report.summary.failures}`);
  console.log(`Wrote: ${relative(root, outputMd)}`);

  if (failures.length > 0) process.exitCode = 1;
}

function buildChecks(guard) {
  const allowedStatuses = new Set([
    'local_worker_innovation_launch_apply_guard_waiting_for_exact_reply',
    'local_worker_innovation_launch_apply_guard_ready_for_separate_dry_run_batch',
    'local_worker_innovation_launch_apply_guard_blocked_by_reply'
  ]);
  const exactReply = (guard.required_exact_reply || []).join(' ');
  const hardStops = (guard.hard_stops || []).join(' ').toLowerCase();
  const exactValid = guard.summary?.exact_reply_valid === true;
  return [
    check('status_guarded', allowedStatuses.has(guard.status), guard.status),
    check('policy_guard_only', guard.policy?.guard_only === true, guard.policy?.guard_only),
    check('policy_no_decision_now', guard.policy?.records_owner_decision_now === false, guard.policy?.records_owner_decision_now),
    check('policy_no_execution_now', guard.policy?.executes_local_workers_now === false, guard.policy?.executes_local_workers_now),
    check('policy_no_model_start', guard.policy?.starts_models_now === false, guard.policy?.starts_models_now),
    check('policy_no_private_reads', guard.policy?.reads_private_content_now === false, guard.policy?.reads_private_content_now),
    check('policy_no_worker_outputs', guard.policy?.writes_worker_outputs_now === false, guard.policy?.writes_worker_outputs_now),
    check('policy_no_repo_outputs', guard.policy?.writes_repo_outputs_now === false, guard.policy?.writes_repo_outputs_now),
    check('policy_no_training_promotion', guard.policy?.promotes_training_rows_now === false, guard.policy?.promotes_training_rows_now),
    check('public_ready_zero', guard.policy?.public_ready_after_guard === 0 && guard.summary?.public_ready_after_guard === 0, guard.summary?.public_ready_after_guard),
    check('execute_zero', guard.summary?.execute_now === 0, guard.summary?.execute_now),
    check('starts_models_false', guard.summary?.starts_models_now === false, guard.summary?.starts_models_now),
    check('tasks_five', guard.summary?.tasks === 5, guard.summary?.tasks),
    check('exact_reply_required_choice', exactReply.includes('local_worker_innovation_launch_choice=approve_separate_source_free_launch_later'), exactReply),
    check('exact_reply_source_free', exactReply.includes('confirmed_source_free_only=yes'), exactReply),
    check('exact_reply_no_private', exactReply.includes('confirmed_no_private_content=yes'), exactReply),
    check('exact_reply_validator', exactReply.includes('confirmed_run_validator_after_outputs=yes'), exactReply),
    check('separate_launch_flag_consistent', exactValid === (guard.summary?.separate_launch_allowed_after_guard === true), `${exactValid}/${guard.summary?.separate_launch_allowed_after_guard}`),
    check('valid_reply_has_ready_status', !exactValid || guard.status === 'local_worker_innovation_launch_apply_guard_ready_for_separate_dry_run_batch', guard.status),
    check('invalid_or_waiting_no_launch', exactValid || guard.summary?.separate_launch_allowed_after_guard === false, guard.summary?.separate_launch_allowed_after_guard),
    check('hard_stop_no_execution', hardStops.includes('never executes') && hardStops.includes('never starts'), hardStops),
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
  lines.push('# Kosmo Local Worker Innovation Launch Apply Guard Check');
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
  lines.push(`- Separate launch allowed after guard: ${report.summary.separate_launch_allowed_after_guard ? 'yes' : 'no'}`);
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
