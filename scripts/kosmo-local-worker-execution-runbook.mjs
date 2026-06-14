#!/usr/bin/env node

import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = new Date().toISOString().slice(0, 10);
const taskPackPath = resolve(root, args.taskPack || `data/kosmo-local-worker-task-pack-${dateStamp}.json`);
const launchQueuePath = resolve(root, args.launchQueue || `data/kosmo-local-worker-launch-queue-${dateStamp}.json`);
const conversionPlanPath = resolve(root, args.conversionPlan || `data/kosmo-local-worker-output-conversion-plan-${dateStamp}.json`);
const runnerCheckPath = resolve(root, args.runnerCheck || `data/kosmo-local-worker-http-runner-check-${dateStamp}.json`);
const outputJson = resolve(root, args.out || `data/kosmo-local-worker-execution-runbook-${dateStamp}.json`);
const outputMd = resolve(root, args.markdown || `docs/codex/kosmo-local-worker-execution-runbook-${dateStamp}.md`);

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const taskPack = JSON.parse(await readFile(taskPackPath, 'utf8'));
  const launchQueue = await readOptionalJson(launchQueuePath);
  const conversionPlan = await readOptionalJson(conversionPlanPath);
  const runnerCheck = await readOptionalJson(runnerCheckPath);

  const tasks = (taskPack.tasks || []).map((task) => classifyTask(task));
  const executableNow = tasks.filter((task) => task.execution_decision === 'execute_allowed_if_output_missing');
  const report = {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    status: executableNow.length === 0
      ? 'local_worker_execution_runbook_idle_review_only'
      : 'local_worker_execution_runbook_has_executable_tasks',
    policy: {
      runbook_only: true,
      starts_model: false,
      reads_private_outputs: false,
      reads_private_sources: false,
      writes_worker_outputs: false,
      writes_git: false,
      writes_cloud: false,
      public_ready_after_runbook: 0,
      note: 'This runbook derives safe execution decisions from task metadata and guard reports only.'
    },
    source_refs: [
      relative(root, taskPackPath),
      relative(root, launchQueuePath),
      relative(root, conversionPlanPath),
      relative(root, runnerCheckPath)
    ],
    guard_state: {
      launch_queue_status: launchQueue?.status || null,
      launchable_now: launchQueue?.summary?.launchable_now ?? null,
      conversion_plan_status: conversionPlan?.status || null,
      repo_conversion_allowed_now: conversionPlan?.summary?.repo_conversion_allowed_now ?? null,
      runner_check_status: runnerCheck?.status || null,
      runner_check_failures: runnerCheck?.summary?.failures ?? null
    },
    summary: {
      tasks_total: tasks.length,
      outputs_present: tasks.filter((task) => task.output_status === 'present').length,
      outputs_missing: tasks.filter((task) => task.output_status === 'missing').length,
      runner_safe_tasks: tasks.filter((task) => task.runner_safe === true).length,
      blocked_by_private_context: tasks.filter((task) => task.blockers.includes('private_context_paths')).length,
      execute_allowed_if_output_missing: executableNow.length,
      public_ready_after_runbook: 0
    },
    tasks,
    command_templates: {
      dry_run: 'npm run kosmo:local-worker-http-runner -- --task <task_id>',
      execute: 'npm run kosmo:local-worker-http-runner -- --task <task_id> --execute',
      force_execute_existing_output: 'npm run kosmo:local-worker-http-runner -- --task <task_id> --execute --force'
    },
    next_actions: executableNow.length === 0
      ? [
          'Do not execute local worker tasks now; required outputs are already present or tasks are not runner-safe.',
          'Use this runbook to choose future --execute targets only after a task output is missing and runner/check guards pass.',
          'Keep private_context_paths tasks manual/overseer-reviewed until a separate private-safe adapter exists.'
        ]
      : [
          'Execute only listed execute_allowed_if_output_missing tasks.',
          'After execution rerun local-worker-output-review, launch-queue, conversion-plan, runner-check and day-batch-loop.'
        ]
  };

  await mkdir(dirname(outputJson), { recursive: true });
  await mkdir(dirname(outputMd), { recursive: true });
  await writeFile(outputJson, `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(outputMd, renderMarkdown(report));

  console.log('Kosmo local worker execution runbook');
  console.log(`Status: ${report.status}`);
  console.log(`Tasks: ${report.summary.tasks_total}`);
  console.log(`Runner-safe: ${report.summary.runner_safe_tasks}`);
  console.log(`Executable now: ${report.summary.execute_allowed_if_output_missing}`);
  console.log(`Wrote: ${relative(root, outputMd)}`);
}

function classifyTask(task) {
  const inputRefs = task.input_refs || [];
  const blockers = [];
  if (inputRefs.includes('private_context_paths')) blockers.push('private_context_paths');
  for (const ref of inputRefs) {
    if (typeof ref !== 'string' || ref.startsWith('/')) blockers.push('absolute_or_invalid_input_ref');
    else if (ref !== 'private_context_paths' && !/^(data|docs|examples)\//.test(ref)) blockers.push('input_ref_outside_runner_roots');
  }
  if (!String(task.output_path || '').includes('/KosmoZentrale/worker_packets/')) blockers.push('output_not_worker_packet');
  if (!String(task.output_path || '').split('/').pop()?.includes('.private.')) blockers.push('output_not_private');

  const outputPresent = existsSync(task.output_path);
  const runnerSafe = blockers.length === 0;
  return {
    task_id: task.task_id,
    lane: task.lane,
    output_filename: String(task.output_path || '').split('/').pop() || null,
    output_status: outputPresent ? 'present' : 'missing',
    runner_safe: runnerSafe,
    blockers: [...new Set(blockers)],
    execution_decision: runnerSafe && !outputPresent
      ? 'execute_allowed_if_output_missing'
      : runnerSafe && outputPresent
        ? 'do_not_execute_output_present'
        : 'do_not_execute_runner_blocked',
    safe_command: runnerSafe
      ? `npm run kosmo:local-worker-http-runner -- --task ${task.task_id}${outputPresent ? '' : ' --execute'}`
      : null
  };
}

async function readOptionalJson(path) {
  try {
    return JSON.parse(await readFile(path, 'utf8'));
  } catch {
    return null;
  }
}

function renderMarkdown(report) {
  const lines = [];
  lines.push('# Kosmo Local Worker Execution Runbook');
  lines.push('');
  lines.push(`Generated: ${report.generated_at}`);
  lines.push(`Status: \`${report.status}\``);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Tasks total: ${report.summary.tasks_total}`);
  lines.push(`- Outputs present: ${report.summary.outputs_present}`);
  lines.push(`- Outputs missing: ${report.summary.outputs_missing}`);
  lines.push(`- Runner-safe tasks: ${report.summary.runner_safe_tasks}`);
  lines.push(`- Blocked by private_context_paths: ${report.summary.blocked_by_private_context}`);
  lines.push(`- Execute allowed if output missing: ${report.summary.execute_allowed_if_output_missing}`);
  lines.push(`- Public-ready after runbook: ${report.summary.public_ready_after_runbook}`);
  lines.push('');
  lines.push('## Guard State');
  lines.push('');
  lines.push(`- Launch queue: ${report.guard_state.launch_queue_status}, launchable ${report.guard_state.launchable_now}`);
  lines.push(`- Conversion plan: ${report.guard_state.conversion_plan_status}, repo now ${report.guard_state.repo_conversion_allowed_now}`);
  lines.push(`- Runner check: ${report.guard_state.runner_check_status}, failures ${report.guard_state.runner_check_failures}`);
  lines.push('');
  lines.push('## Tasks');
  lines.push('');
  lines.push('| Task | Lane | Output | Runner Safe | Decision | Blockers |');
  lines.push('| --- | --- | --- | --- | --- | --- |');
  for (const task of report.tasks) {
    lines.push(`| \`${task.task_id}\` | ${task.lane} | ${task.output_status} | ${task.runner_safe ? 'yes' : 'no'} | ${task.execution_decision} | ${task.blockers.length ? task.blockers.join(', ') : '-'} |`);
  }
  lines.push('');
  lines.push('## Command Templates');
  lines.push('');
  for (const [key, command] of Object.entries(report.command_templates)) {
    lines.push(`- ${key}: \`${command}\``);
  }
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
