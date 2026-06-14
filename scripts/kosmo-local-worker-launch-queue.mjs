#!/usr/bin/env node

import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { basename, dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = new Date().toISOString().slice(0, 10);

const refs = {
  taskPack: resolve(root, args.taskPack || `data/kosmo-local-worker-task-pack-${dateStamp}.json`),
  boundaryPack: resolve(root, args.boundaryPack || `data/kosmo-worker-boundary-pack-${dateStamp}.json`),
  boundaryCheck: resolve(root, args.boundaryCheck || `data/kosmo-worker-boundary-pack-check-${dateStamp}.json`),
  outputReview: resolve(root, args.outputReview || `data/kosmo-local-worker-output-review-${dateStamp}.json`),
  metadataInventoryCheck: resolve(root, args.metadataInventoryCheck || `data/kosmo-private-metadata-inventory-check-${dateStamp}.json`)
};

const outputJson = resolve(root, args.out || `data/kosmo-local-worker-launch-queue-${dateStamp}.json`);
const outputMd = resolve(root, args.markdown || `docs/codex/kosmo-local-worker-launch-queue-${dateStamp}.md`);

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const taskPack = await readJson(refs.taskPack);
  const boundaryPack = await readJson(refs.boundaryPack);
  const boundaryCheck = await readJson(refs.boundaryCheck);
  const outputReview = await readJson(refs.outputReview);
  const metadataInventoryCheck = await readJson(refs.metadataInventoryCheck);

  const guardPassed = boundaryCheck.status === 'worker_boundary_pack_guard_passed' &&
    boundaryCheck.summary?.failures === 0;
  const metadataInventoryGuardPassed = metadataInventoryCheck.status === 'private_metadata_inventory_guard_passed' &&
    metadataInventoryCheck.summary?.failures === 0 &&
    metadataInventoryCheck.summary?.public_ready_hits === 0 &&
    metadataInventoryCheck.summary?.forbidden_field_hits === 0;
  const outputsComplete = outputReview.summary?.present_outputs === outputReview.summary?.required_outputs &&
    outputReview.summary?.missing_outputs === 0 &&
    outputReview.summary?.high_risk_hits === 0;
  const localWorkerGitBlocked = boundaryPack.policy?.local_worker_git_allowed === false;
  const publicReadyBlocked = boundaryPack.policy?.public_ready_allowed === false;

  const tasks = await Promise.all((taskPack.tasks || []).map(async (task) => {
    const output = await outputStatus(task.output_path);
    return {
      task_id: task.task_id,
      priority: task.priority,
      lane: task.lane,
      output_filename: basename(task.output_path || ''),
      output_status: output.exists ? 'present' : 'missing',
      output_bytes: output.bytes,
      launch_decision: output.exists
        ? 'do_not_launch_output_present'
        : guardPassed && metadataInventoryGuardPassed ? 'launch_allowed_metadata_only_if_requested' : 'launch_blocked_guard_failed',
      allowed_mode: 'metadata_review_only',
      guard_state: {
        worker_boundary_guard_passed: guardPassed,
        private_metadata_inventory_guard_passed: metadataInventoryGuardPassed
      },
      forbidden_side_effects: [
        'private reads/OCR outside provided refs',
        'Git commands',
        'cloud/R2/D1 writes',
        'public-ready flags'
      ]
    };
  }));

  const launchableNow = tasks.filter((task) => task.launch_decision === 'launch_allowed_metadata_only_if_requested');
  const report = {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    status: guardPassed && outputsComplete
      ? 'local_worker_launch_queue_idle_outputs_present'
      : guardPassed ? 'local_worker_launch_queue_review_needed' : 'local_worker_launch_queue_blocked',
    policy: {
      metadata_only: true,
      starts_processes: false,
      starts_models: false,
      reads_private_outputs: false,
      copies_private_content: false,
      local_worker_git_allowed: false,
      public_ready_allowed: false,
      note: 'This queue decides whether local worker tasks need launch or review. It does not start models, read private output contents or run tasks.'
    },
    source_refs: Object.values(refs).map((path) => relative(root, path)),
    summary: {
      target_worker: taskPack.target_worker,
      tasks_total: tasks.length,
      tasks_present: tasks.filter((task) => task.output_status === 'present').length,
      tasks_missing: tasks.filter((task) => task.output_status === 'missing').length,
      launchable_now: launchableNow.length,
      guard_passed: guardPassed,
      private_metadata_inventory_guard_passed: metadataInventoryGuardPassed,
      outputs_complete: outputsComplete,
      local_worker_git_blocked: localWorkerGitBlocked,
      public_ready_blocked: publicReadyBlocked,
      public_ready_after_queue: 0
    },
    tasks,
    next_actions: launchableNow.length === 0
      ? [
          'Do not launch new local LLM tasks now; all required outputs are present.',
          'Keep private metadata inventory tasks blocked unless source-root activation and private metadata inventory guard pass.',
          'Codex/Claude should review existing private outputs metadata-safely before converting anything into repo artifacts.',
          'Create a new task pack only after owner/source-root state changes or a new explicit worker objective is defined.'
        ]
      : [
          'Launch only the missing tasks, only in metadata_review_only mode, and only after confirming the boundary guard and private metadata inventory guard still pass.',
          'After local worker returns outputs, rerun local-worker-output-review, worker-boundary-pack-check and this launch queue.'
        ]
  };

  await mkdir(dirname(outputJson), { recursive: true });
  await mkdir(dirname(outputMd), { recursive: true });
  await writeFile(outputJson, `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(outputMd, renderMarkdown(report));

  console.log('Kosmo local worker launch queue');
  console.log(`Status: ${report.status}`);
  console.log(`Tasks present: ${report.summary.tasks_present}/${report.summary.tasks_total}`);
  console.log(`Launchable now: ${report.summary.launchable_now}`);
  console.log(`Wrote: ${relative(root, outputMd)}`);
}

async function outputStatus(path) {
  try {
    const info = await stat(path);
    return { exists: true, bytes: info.size };
  } catch {
    return { exists: false, bytes: 0 };
  }
}

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

function renderMarkdown(report) {
  const lines = [];
  lines.push('# Kosmo Local Worker Launch Queue');
  lines.push('');
  lines.push(`Generated: ${report.generated_at}`);
  lines.push(`Status: \`${report.status}\``);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Target worker: ${report.summary.target_worker}`);
  lines.push(`- Tasks present: ${report.summary.tasks_present}/${report.summary.tasks_total}`);
  lines.push(`- Tasks missing: ${report.summary.tasks_missing}`);
  lines.push(`- Launchable now: ${report.summary.launchable_now}`);
  lines.push(`- Boundary guard passed: ${report.summary.guard_passed ? 'yes' : 'no'}`);
  lines.push(`- Private metadata inventory guard passed: ${report.summary.private_metadata_inventory_guard_passed ? 'yes' : 'no'}`);
  lines.push(`- Outputs complete: ${report.summary.outputs_complete ? 'yes' : 'no'}`);
  lines.push(`- Local worker Git blocked: ${report.summary.local_worker_git_blocked ? 'yes' : 'no'}`);
  lines.push(`- Public-ready blocked: ${report.summary.public_ready_blocked ? 'yes' : 'no'}`);
  lines.push(`- Public-ready after queue: ${report.summary.public_ready_after_queue}`);
  lines.push('');
  lines.push('## Tasks');
  lines.push('');
  lines.push('| Priority | Task | Lane | Output | Status | Launch decision |');
  lines.push('| ---: | --- | --- | --- | --- | --- |');
  for (const task of report.tasks) {
    lines.push(`| ${task.priority} | \`${task.task_id}\` | ${task.lane} | \`${task.output_filename}\` | ${task.output_status} | ${task.launch_decision} |`);
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
