#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = new Date().toISOString().slice(0, 10);

const queuePath = resolve(root, args.queue || `data/kosmo-local-worker-pilot-task-queue-${dateStamp}.json`);
const outputJson = resolve(root, args.out || `data/kosmo-local-worker-pilot-task-queue-check-${dateStamp}.json`);
const outputMd = resolve(root, args.markdown || `docs/codex/kosmo-local-worker-pilot-task-queue-check-${dateStamp}.md`);

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const queue = await readJson(queuePath);
  const checks = buildChecks(queue);
  const failures = checks.filter((checkItem) => checkItem.status === 'failed');
  const report = {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    status: failures.length === 0
      ? 'local_worker_pilot_task_queue_guard_passed'
      : 'local_worker_pilot_task_queue_guard_failed',
    policy: {
      validates_queue_only: true,
      executes_local_worker_now: false,
      reads_private_content_now: false,
      writes_repo_now: false,
      public_ready_after_check: 0
    },
    source_refs: [relative(root, queuePath)],
    summary: {
      checks: checks.length,
      passed: checks.length - failures.length,
      failures: failures.length,
      warnings: 0,
      public_ready_after_check: 0
    },
    checks
  };

  await mkdir(dirname(outputJson), { recursive: true });
  await mkdir(dirname(outputMd), { recursive: true });
  await writeFile(outputJson, `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(outputMd, renderMarkdown(report));

  console.log('Kosmo local worker pilot task queue check');
  console.log(`Status: ${report.status}`);
  console.log(`Checks: ${report.summary.passed}/${report.summary.checks}`);
  console.log(`Failures: ${report.summary.failures}`);
  console.log(`Wrote: ${relative(root, outputMd)}`);

  if (failures.length > 0) process.exitCode = 1;
}

function buildChecks(queue) {
  const hardStops = (queue.hard_stops || []).join(' ').toLowerCase();
  return [
    check('status_ready_blocked', queue.status === 'local_worker_pilot_task_queue_ready_blocked', queue.status),
    check('policy_queue_only', queue.policy?.queue_only === true, queue.policy?.queue_only),
    check('policy_no_execute_now', queue.policy?.executes_local_worker_now === false, queue.policy?.executes_local_worker_now),
    check('policy_no_private_reads', queue.policy?.reads_private_content_now === false, queue.policy?.reads_private_content_now),
    check('policy_no_repo_write', queue.policy?.writes_repo_now === false, queue.policy?.writes_repo_now),
    check('policy_requires_overseer', queue.policy?.requires_overseer_review === true, queue.policy?.requires_overseer_review),
    check('public_ready_zero', queue.summary?.public_ready_after_queue === 0, queue.summary?.public_ready_after_queue),
    check('three_pilots', queue.summary?.pilots === 3, queue.summary?.pilots),
    check('twelve_tasks', queue.summary?.tasks === 12, queue.summary?.tasks),
    check('four_tasks_per_pilot', queue.summary?.tasks_per_pilot === 4, queue.summary?.tasks_per_pilot),
    check('nine_references_tasks', queue.summary?.kosmoreferences_tasks === 9, queue.summary?.kosmoreferences_tasks),
    check('three_asset_tasks', queue.summary?.kosmoasset_tasks === 3, queue.summary?.kosmoasset_tasks),
    check('worker_contracts_present', queue.summary?.worker_contracts === 9, queue.summary?.worker_contracts),
    check('matrix_status_guarded', [
      'post_unlock_pilot_execution_matrix_ready',
      'post_unlock_pilot_execution_matrix_needs_review'
    ].includes(queue.summary?.matrix_status), queue.summary?.matrix_status),
    check('matrix_review_only_blocked', queue.summary?.matrix_guarded_review_only === true, queue.summary?.matrix_guarded_review_only),
    check('launchable_now_zero', queue.summary?.launchable_now === 0, queue.summary?.launchable_now),
    check('writes_repo_now_zero', queue.summary?.writes_repo_now === 0, queue.summary?.writes_repo_now),
    check('all_tasks_blocked', (queue.tasks || []).every((task) => task.executable_now === false), (queue.tasks || []).filter((task) => task.executable_now).map((task) => task.id).join(',')),
    check('all_tasks_public_ready_zero', (queue.tasks || []).every((task) => task.public_ready_after_task === 0), (queue.tasks || []).filter((task) => task.public_ready_after_task !== 0).map((task) => task.id).join(',')),
    check('all_tasks_have_overseer', (queue.tasks || []).every((task) => String(task.overseer || '').includes('review_required')), (queue.tasks || []).filter((task) => !String(task.overseer || '').includes('review_required')).map((task) => task.id).join(',')),
    check('hard_stop_no_launch_now', hardStops.includes('do not launch'), hardStops),
    check('hard_stop_no_full_private_docs', hardStops.includes('full private documents'), hardStops),
    check('hard_stop_no_repo_write', hardStops.includes('write directly to repo'), hardStops),
    check('hard_stop_no_public_ready', hardStops.includes('public-ready'), hardStops)
  ];
}

function check(id, condition, evidence) {
  return {
    id,
    status: condition ? 'passed' : 'failed',
    evidence
  };
}

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

function renderMarkdown(report) {
  const lines = [];
  lines.push('# Kosmo Local Worker Pilot Task Queue Check');
  lines.push('');
  lines.push(`Generated: ${report.generated_at}`);
  lines.push(`Status: \`${report.status}\``);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Checks: ${report.summary.passed}/${report.summary.checks}`);
  lines.push(`- Failures: ${report.summary.failures}`);
  lines.push(`- Warnings: ${report.summary.warnings}`);
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
