#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = new Date().toISOString().slice(0, 10);
const runbookPath = resolve(root, args.runbook || `data/kosmo-local-worker-execution-runbook-${dateStamp}.json`);
const outputJson = resolve(root, args.out || `data/kosmo-local-worker-execution-runbook-check-${dateStamp}.json`);
const outputMd = resolve(root, args.markdown || `docs/codex/kosmo-local-worker-execution-runbook-check-${dateStamp}.md`);

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const runbook = JSON.parse(await readFile(runbookPath, 'utf8'));
  const findings = [
    ...checkPolicy(runbook),
    ...checkSummary(runbook),
    ...checkGuardState(runbook),
    ...checkTasks(runbook),
    ...checkCommands(runbook)
  ];
  const failures = findings.filter((finding) => finding.severity === 'failure');
  const warnings = findings.filter((finding) => finding.severity === 'warning');
  const report = {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    status: failures.length === 0 ? 'local_worker_execution_runbook_guard_passed' : 'local_worker_execution_runbook_guard_failed',
    policy: {
      validates_report_only: true,
      starts_model: false,
      reads_private_outputs: false,
      reads_private_sources: false,
      executes_worker_tasks: false,
      writes_git: false,
      writes_cloud: false,
      public_ready_after_check: 0,
      note: 'This guard validates the local worker execution runbook only. It does not execute local models or read private worker output contents.'
    },
    source_refs: [relative(root, runbookPath)],
    summary: {
      runbook_status: runbook.status,
      tasks_total: runbook.summary?.tasks_total ?? null,
      runner_safe_tasks: runbook.summary?.runner_safe_tasks ?? null,
      executable_now: runbook.summary?.execute_allowed_if_output_missing ?? null,
      blocked_by_private_context: runbook.summary?.blocked_by_private_context ?? null,
      failures: failures.length,
      warnings: warnings.length,
      public_ready_after_check: 0
    },
    findings,
    next_actions: failures.length === 0
      ? [
          'Use the execution runbook as the safe command map for future local worker runs.',
          'Do not execute local worker tasks while executable_now is 0.',
          'Rerun this guard after task-pack, launch queue, conversion plan or runner-check changes.'
        ]
      : [
          'Fix execution runbook guard failures before using any --execute command.',
          'Rerun npm run kosmo:local-worker-execution-runbook and this guard.'
        ]
  };

  await mkdir(dirname(outputJson), { recursive: true });
  await mkdir(dirname(outputMd), { recursive: true });
  await writeFile(outputJson, `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(outputMd, renderMarkdown(report));

  console.log('Kosmo local worker execution runbook check');
  console.log(`Status: ${report.status}`);
  console.log(`Failures: ${report.summary.failures}`);
  console.log(`Warnings: ${report.summary.warnings}`);
  console.log(`Wrote: ${relative(root, outputMd)}`);

  if (failures.length > 0) process.exitCode = 1;
}

function checkPolicy(runbook) {
  const findings = [];
  expect(
    ['local_worker_execution_runbook_idle_review_only', 'local_worker_execution_runbook_has_executable_tasks'].includes(runbook.status),
    findings,
    'runbook_status_guarded',
    'Runbook status must be idle review-only or explicitly list executable tasks.'
  );
  expect(runbook.policy?.runbook_only === true, findings, 'runbook_only_true', 'Runbook must be runbook-only.');
  expect(runbook.policy?.starts_model === false, findings, 'starts_model_false', 'Runbook must not start models.');
  expect(runbook.policy?.reads_private_outputs === false, findings, 'reads_private_outputs_false', 'Runbook must not read private outputs.');
  expect(runbook.policy?.reads_private_sources === false, findings, 'reads_private_sources_false', 'Runbook must not read private sources.');
  expect(runbook.policy?.writes_worker_outputs === false, findings, 'writes_worker_outputs_false', 'Runbook must not write worker outputs.');
  expect(runbook.policy?.writes_git === false, findings, 'writes_git_false', 'Runbook must not write Git.');
  expect(runbook.policy?.writes_cloud === false, findings, 'writes_cloud_false', 'Runbook must not write cloud.');
  expect(runbook.policy?.public_ready_after_runbook === 0, findings, 'public_ready_zero', 'Runbook must keep public-ready at 0.');
  return findings;
}

function checkSummary(runbook) {
  const summary = runbook.summary || {};
  const tasks = runbook.tasks || [];
  const findings = [];
  expect(summary.tasks_total === tasks.length, findings, 'task_count_matches', 'Summary task count must match task rows.');
  expect(summary.outputs_present + summary.outputs_missing === summary.tasks_total, findings, 'output_count_matches', 'Present + missing outputs must equal total tasks.');
  expect(summary.runner_safe_tasks === tasks.filter((task) => task.runner_safe === true).length, findings, 'runner_safe_count_matches', 'Runner-safe count must match task rows.');
  expect(summary.blocked_by_private_context === tasks.filter((task) => task.blockers?.includes('private_context_paths')).length, findings, 'private_context_count_matches', 'Private-context blocker count must match task rows.');
  expect(summary.execute_allowed_if_output_missing === tasks.filter((task) => task.execution_decision === 'execute_allowed_if_output_missing').length, findings, 'executable_count_matches', 'Executable-now count must match task rows.');
  expect(summary.public_ready_after_runbook === 0, findings, 'summary_public_ready_zero', 'Summary public-ready after runbook must be 0.');
  return findings;
}

function checkGuardState(runbook) {
  const state = runbook.guard_state || {};
  const summary = runbook.summary || {};
  const findings = [];
  const launchQueueSafe =
    state.launch_queue_status === 'local_worker_launch_queue_idle_outputs_present' ||
    state.launchable_now > 0 ||
    (
      state.launch_queue_status === 'local_worker_launch_queue_blocked' &&
      state.launchable_now === 0 &&
      summary.outputs_missing === 0
    );
  expect(launchQueueSafe, findings, 'launch_queue_state_valid', 'Launch queue must be idle, explicitly launchable, or safely blocked with no missing outputs.');
  expect(state.repo_conversion_allowed_now === 0, findings, 'repo_conversion_zero', 'Repo conversion must remain 0.');
  expect(state.runner_check_status === 'local_worker_http_runner_guard_passed', findings, 'runner_check_passed', 'HTTP runner check must pass.');
  expect(state.runner_check_failures === 0, findings, 'runner_check_failures_zero', 'HTTP runner check failures must be 0.');
  return findings;
}

function checkTasks(runbook) {
  const findings = [];
  for (const task of runbook.tasks || []) {
    const blockers = task.blockers || [];
    expect(Boolean(task.task_id), findings, `task_id_present:${task.task_id}`, 'Each task must have an id.');
    expect(['present', 'missing'].includes(task.output_status), findings, `output_status_known:${task.task_id}`, `${task.task_id} output status must be known.`);
    if (task.runner_safe) {
      expect(blockers.length === 0, findings, `runner_safe_without_blockers:${task.task_id}`, `${task.task_id} cannot be runner-safe while blockers exist.`);
      expect(Boolean(task.safe_command), findings, `safe_command_present:${task.task_id}`, `${task.task_id} needs a safe command when runner-safe.`);
    } else {
      expect(blockers.length > 0, findings, `blocked_has_blockers:${task.task_id}`, `${task.task_id} must explain why it is blocked.`);
      expect(task.safe_command === null, findings, `blocked_safe_command_null:${task.task_id}`, `${task.task_id} must not expose safe_command when blocked.`);
    }
    if (task.execution_decision === 'execute_allowed_if_output_missing') {
      expect(task.runner_safe === true && task.output_status === 'missing', findings, `execute_only_missing_safe:${task.task_id}`, `${task.task_id} may execute only when runner-safe and missing.`);
    }
    if (task.execution_decision === 'do_not_execute_output_present') {
      expect(task.output_status === 'present', findings, `present_decision_matches:${task.task_id}`, `${task.task_id} output-present decision must match present output.`);
    }
  }
  return findings;
}

function checkCommands(runbook) {
  const commands = runbook.command_templates || {};
  const findings = [];
  expect(String(commands.dry_run || '').includes('kosmo:local-worker-http-runner'), findings, 'dry_run_command_present', 'Dry-run command template must use HTTP runner.');
  expect(String(commands.execute || '').includes('--execute'), findings, 'execute_command_has_execute', 'Execute command template must include --execute.');
  expect(String(commands.force_execute_existing_output || '').includes('--force'), findings, 'force_command_has_force', 'Force command template must include --force.');
  expect(!Object.values(commands).some((command) => /git|push|cloud|r2|d1/i.test(String(command))), findings, 'commands_no_git_cloud', 'Command templates must not include Git or cloud writes.');
  return findings;
}

function expect(condition, findings, id, message) {
  findings.push({
    id,
    severity: condition ? 'passed' : 'failure',
    message
  });
}

function renderMarkdown(report) {
  const lines = [];
  lines.push('# Kosmo Local Worker Execution Runbook Check');
  lines.push('');
  lines.push(`Generated: ${report.generated_at}`);
  lines.push(`Status: \`${report.status}\``);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Runbook status: ${report.summary.runbook_status}`);
  lines.push(`- Tasks total: ${report.summary.tasks_total}`);
  lines.push(`- Runner-safe tasks: ${report.summary.runner_safe_tasks}`);
  lines.push(`- Executable now: ${report.summary.executable_now}`);
  lines.push(`- Blocked by private context: ${report.summary.blocked_by_private_context}`);
  lines.push(`- Failures: ${report.summary.failures}`);
  lines.push(`- Warnings: ${report.summary.warnings}`);
  lines.push(`- Public-ready after check: ${report.summary.public_ready_after_check}`);
  lines.push('');
  lines.push('## Findings');
  lines.push('');
  report.findings.forEach((finding) => {
    lines.push(`- ${finding.severity}: \`${finding.id}\` - ${finding.message}`);
  });
  lines.push('');
  lines.push('## Next Actions');
  lines.push('');
  report.next_actions.forEach((action) => lines.push(`- ${action}`));
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
