#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = new Date().toISOString().slice(0, 10);
const dryRunPath = resolve(root, args.dryRun || `data/kosmo-local-worker-innovation-launch-dry-run-${dateStamp}.json`);
const outputJson = resolve(root, args.out || `data/kosmo-local-worker-innovation-launch-dry-run-check-${dateStamp}.json`);
const outputMd = resolve(root, args.markdown || `docs/codex/kosmo-local-worker-innovation-launch-dry-run-check-${dateStamp}.md`);

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const dryRun = JSON.parse(await readFile(dryRunPath, 'utf8'));
  const checks = buildChecks(dryRun);
  const failures = checks.filter((check) => check.status === 'failed');
  const report = {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    status: failures.length === 0
      ? 'local_worker_innovation_launch_dry_run_guard_passed'
      : 'local_worker_innovation_launch_dry_run_guard_failed',
    policy: {
      dry_run_only: true,
      review_only: true,
      executes_local_workers: false,
      starts_models: false,
      reads_private_content: false,
      public_ready_after_check: 0
    },
    source_refs: [relative(root, dryRunPath)],
    summary: {
      checks: checks.length,
      passed: checks.length - failures.length,
      failures: failures.length,
      tasks: dryRun.summary?.tasks ?? null,
      execute_now: dryRun.summary?.execute_now ?? null,
      public_ready_after_check: 0
    },
    checks
  };

  await mkdir(dirname(outputJson), { recursive: true });
  await mkdir(dirname(outputMd), { recursive: true });
  await writeFile(outputJson, `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(outputMd, renderMarkdown(report));

  console.log('Kosmo local worker innovation launch dry run check');
  console.log(`Status: ${report.status}`);
  console.log(`Checks: ${report.summary.passed}/${report.summary.checks}`);
  console.log(`Failures: ${report.summary.failures}`);
  console.log(`Wrote: ${relative(root, outputMd)}`);

  if (failures.length > 0) process.exitCode = 1;
}

function buildChecks(dryRun) {
  const tasks = dryRun.tasks || [];
  return [
    check('status_ready', dryRun.status === 'local_worker_innovation_launch_dry_run_ready', dryRun.status),
    check('policy_dry_run_only', dryRun.policy?.dry_run_only === true, dryRun.policy?.dry_run_only),
    check('policy_no_private_reads', dryRun.policy?.reads_private_content === false, dryRun.policy?.reads_private_content),
    check('policy_no_worker_execution', dryRun.policy?.executes_local_workers === false, dryRun.policy?.executes_local_workers),
    check('policy_no_model_start', dryRun.policy?.starts_models === false, dryRun.policy?.starts_models),
    check('policy_no_worker_outputs', dryRun.policy?.writes_worker_outputs === false, dryRun.policy?.writes_worker_outputs),
    check('policy_no_repo_outputs', dryRun.policy?.writes_repo_outputs === false, dryRun.policy?.writes_repo_outputs),
    check('policy_no_training_promotion', dryRun.policy?.promotes_training_rows === false, dryRun.policy?.promotes_training_rows),
    check('public_ready_zero', dryRun.summary?.public_ready_after_dry_run === 0 && dryRun.policy?.public_ready_after_dry_run === 0, dryRun.summary?.public_ready_after_dry_run),
    check('five_tasks', dryRun.summary?.tasks === 5 && tasks.length === 5, `${tasks.length}/${dryRun.summary?.tasks}`),
    check('all_dry_run_ready', tasks.every((task) => task.launch_state === 'dry_run_ready_waiting_for_explicit_gate'), tasks.length),
    check('execute_now_zero', dryRun.summary?.execute_now === 0 && tasks.every((task) => task.execute_now === false), dryRun.summary?.execute_now),
    check('explicit_gate_all', dryRun.summary?.explicit_gate_required === 5 && tasks.every((task) => task.requires_explicit_overseer_gate === true), dryRun.summary?.explicit_gate_required),
    check('local_worker_allowed_false', tasks.every((task) => task.local_worker_allowed_now === false), tasks.length),
    check('repo_conversion_zero', tasks.every((task) => task.repo_conversion_allowed_now === false), tasks.length),
    check('task_public_ready_zero', tasks.every((task) => task.public_ready_after_task === 0), tasks.length),
    check('validator_fixtures_guarded', dryRun.summary?.validator_fixture_guarded === true, dryRun.summary?.validator_fixture_guarded),
    check('required_before_execute_present', (dryRun.required_before_execute || []).length >= 6, (dryRun.required_before_execute || []).length),
    check('forbidden_actions_present', (dryRun.forbidden_actions || []).length >= 6, (dryRun.forbidden_actions || []).length)
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
  lines.push('# Kosmo Local Worker Innovation Launch Dry Run Check');
  lines.push('');
  lines.push(`Generated: ${report.generated_at}`);
  lines.push(`Status: \`${report.status}\``);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Checks: ${report.summary.passed}/${report.summary.checks}`);
  lines.push(`- Failures: ${report.summary.failures}`);
  lines.push(`- Tasks: ${report.summary.tasks}`);
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
