#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = new Date().toISOString().slice(0, 10);
const checkpointPath = resolve(root, args.checkpoint || `data/kosmo-local-worker-innovation-launch-runbook-checkpoint-${dateStamp}.json`);
const outputJson = resolve(root, args.out || `data/kosmo-local-worker-innovation-launch-runbook-checkpoint-check-${dateStamp}.json`);
const outputMd = resolve(root, args.markdown || `docs/codex/kosmo-local-worker-innovation-launch-runbook-checkpoint-check-${dateStamp}.md`);

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const checkpoint = JSON.parse(await readFile(checkpointPath, 'utf8'));
  const checks = buildChecks(checkpoint);
  const failures = checks.filter((check) => check.status === 'failed');
  const report = {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    status: failures.length === 0
      ? 'local_worker_innovation_launch_runbook_checkpoint_guard_passed'
      : 'local_worker_innovation_launch_runbook_checkpoint_guard_failed',
    policy: {
      validates_checkpoint_only: true,
      executes_local_workers_now: false,
      starts_models_now: false,
      reads_private_content_now: false,
      public_ready_after_check: 0
    },
    source_refs: [relative(root, checkpointPath)],
    summary: {
      checks: checks.length,
      passed: checks.length - failures.length,
      failures: failures.length,
      checkpoint_status: checkpoint.status,
      launch_mode: checkpoint.summary?.launch_mode || null,
      execute_now: checkpoint.summary?.execute_now ?? null,
      public_ready_after_check: 0
    },
    checks
  };

  await mkdir(dirname(outputJson), { recursive: true });
  await mkdir(dirname(outputMd), { recursive: true });
  await writeFile(outputJson, `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(outputMd, renderMarkdown(report));

  console.log('Kosmo local worker innovation launch runbook checkpoint check');
  console.log(`Status: ${report.status}`);
  console.log(`Checks: ${report.summary.passed}/${report.summary.checks}`);
  console.log(`Launch mode: ${report.summary.launch_mode}`);
  console.log(`Failures: ${report.summary.failures}`);
  console.log(`Wrote: ${relative(root, outputMd)}`);

  if (failures.length > 0) process.exitCode = 1;
}

function buildChecks(checkpoint) {
  const allowedStatuses = new Set([
    'local_worker_innovation_launch_runbook_checkpoint_waiting_for_exact_reply',
    'local_worker_innovation_launch_runbook_checkpoint_ready_for_separate_preflight',
    'local_worker_innovation_launch_runbook_checkpoint_blocked_by_reply'
  ]);
  const launchModes = new Set([
    'hold_waiting_for_exact_reply',
    'ready_for_separate_launch_preflight',
    'blocked_by_owner_reply'
  ]);
  const hardStops = (checkpoint.hard_stops || []).join(' ').toLowerCase();
  const commands = checkpoint.separate_launch_preflight_commands || [];
  const gates = checkpoint.gates || [];
  return [
    check('status_guarded', allowedStatuses.has(checkpoint.status), checkpoint.status),
    check('launch_mode_guarded', launchModes.has(checkpoint.summary?.launch_mode), checkpoint.summary?.launch_mode),
    check('policy_checkpoint_only', checkpoint.policy?.checkpoint_only === true, checkpoint.policy?.checkpoint_only),
    check('policy_no_execution', checkpoint.policy?.executes_local_workers_now === false, checkpoint.policy?.executes_local_workers_now),
    check('policy_no_model_start', checkpoint.policy?.starts_models_now === false, checkpoint.policy?.starts_models_now),
    check('policy_no_private_reads', checkpoint.policy?.reads_private_content_now === false, checkpoint.policy?.reads_private_content_now),
    check('policy_no_worker_outputs', checkpoint.policy?.writes_worker_outputs_now === false, checkpoint.policy?.writes_worker_outputs_now),
    check('policy_no_repo_outputs', checkpoint.policy?.writes_repo_outputs_now === false, checkpoint.policy?.writes_repo_outputs_now),
    check('policy_no_training_promotion', checkpoint.policy?.promotes_training_rows_now === false, checkpoint.policy?.promotes_training_rows_now),
    check('public_ready_zero', checkpoint.policy?.public_ready_after_checkpoint === 0 && checkpoint.summary?.public_ready_after_checkpoint === 0, checkpoint.summary?.public_ready_after_checkpoint),
    check('execute_zero', checkpoint.summary?.execute_now === 0, checkpoint.summary?.execute_now),
    check('starts_models_false', checkpoint.summary?.starts_models_now === false, checkpoint.summary?.starts_models_now),
    check('ten_gates_passed', checkpoint.summary?.gates === 10 && checkpoint.summary?.gates_passed === 10 && gates.every((gate) => gate.status === 'passed'), `${checkpoint.summary?.gates_passed}/${checkpoint.summary?.gates}`),
    check('five_tasks', checkpoint.summary?.tasks === 5 && (checkpoint.task_ids || []).length === 5, `${(checkpoint.task_ids || []).length}/${checkpoint.summary?.tasks}`),
    check('waiting_mode_no_launch_allowed', checkpoint.summary?.launch_mode !== 'hold_waiting_for_exact_reply' || checkpoint.summary?.separate_launch_allowed_after_apply_guard === false, checkpoint.summary?.separate_launch_allowed_after_apply_guard),
    check('ready_mode_requires_exact_reply', checkpoint.summary?.launch_mode !== 'ready_for_separate_launch_preflight' || checkpoint.summary?.exact_reply_valid === true, checkpoint.summary?.exact_reply_valid),
    check('preflight_commands_include_checkpoint', commands.includes('npm run kosmo:local-worker-innovation-launch-runbook-checkpoint') && commands.includes('npm run kosmo:local-worker-innovation-launch-runbook-checkpoint-check'), commands.join(', ')),
    check('preflight_commands_include_apply_guard', commands.includes('npm run kosmo:local-worker-innovation-launch-apply-guard') && commands.includes('npm run kosmo:local-worker-innovation-launch-apply-guard-check'), commands.join(', ')),
    check('preflight_commands_include_validator_fixtures', commands.includes('npm run kosmo:local-worker-innovation-output-validator-fixtures') && commands.includes('npm run kosmo:local-worker-innovation-output-validator-fixtures-check'), commands.join(', ')),
    check('hard_stop_no_execution', hardStops.includes('never executes') && hardStops.includes('never starts'), hardStops),
    check('hard_stop_no_private', hardStops.includes('private source root') && hardStops.includes('onedrive'), hardStops),
    check('hard_stop_no_outputs', hardStops.includes('never writes worker outputs') && hardStops.includes('repo outputs'), hardStops),
    check('hard_stop_no_public_or_training', hardStops.includes('public-ready') && hardStops.includes('training rows'), hardStops)
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
  lines.push('# Kosmo Local Worker Innovation Launch Runbook Checkpoint Check');
  lines.push('');
  lines.push(`Generated: ${report.generated_at}`);
  lines.push(`Status: \`${report.status}\``);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Checks: ${report.summary.passed}/${report.summary.checks}`);
  lines.push(`- Failures: ${report.summary.failures}`);
  lines.push(`- Checkpoint status: ${report.summary.checkpoint_status}`);
  lines.push(`- Launch mode: ${report.summary.launch_mode}`);
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
    if (index + 1 < argv.length && !String(next).startsWith('--')) {
      parsed[key] = next;
      index += 1;
    } else {
      parsed[key] = true;
    }
  }
  return parsed;
}
