#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = new Date().toISOString().slice(0, 10);

const matrixPath = resolve(root, args.matrix || `data/kosmo-post-unlock-pilot-execution-matrix-${dateStamp}.json`);
const workerContractsPath = resolve(root, args.workerContracts || `data/kosmo-local-worker-output-contract-review-${dateStamp}.json`);
const workerRunbookPath = resolve(root, args.workerRunbook || `data/kosmo-local-worker-execution-runbook-${dateStamp}.json`);
const launchQueuePath = resolve(root, args.launchQueue || `data/kosmo-local-worker-launch-queue-${dateStamp}.json`);
const outputJson = resolve(root, args.out || `data/kosmo-local-worker-pilot-task-queue-${dateStamp}.json`);
const outputMd = resolve(root, args.markdown || `docs/codex/kosmo-local-worker-pilot-task-queue-${dateStamp}.md`);

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const matrix = await readJson(matrixPath);
  const workerContracts = await readJson(workerContractsPath);
  const workerRunbook = await readJson(workerRunbookPath);
  const launchQueue = await readJson(launchQueuePath);
  const report = buildReport({ matrix, workerContracts, workerRunbook, launchQueue });

  await mkdir(dirname(outputJson), { recursive: true });
  await mkdir(dirname(outputMd), { recursive: true });
  await writeFile(outputJson, `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(outputMd, renderMarkdown(report));

  console.log('Kosmo local worker pilot task queue');
  console.log(`Status: ${report.status}`);
  console.log(`Tasks: ${report.summary.tasks}`);
  console.log(`Pilots: ${report.summary.pilots}`);
  console.log(`Launchable now: ${report.summary.launchable_now}`);
  console.log(`Public-ready after queue: ${report.summary.public_ready_after_queue}`);
  console.log(`Wrote: ${relative(root, outputMd)}`);
}

function buildReport({ matrix, workerContracts, workerRunbook, launchQueue }) {
  const failures = [];
  const matrixAccepted = [
    'post_unlock_pilot_execution_matrix_ready',
    'post_unlock_pilot_execution_matrix_needs_review'
  ].includes(matrix.status);
  const workerContractsAccepted = [
    'local_worker_output_contract_review_ready',
    'local_worker_output_contract_review_needs_review'
  ].includes(workerContracts.status);
  const launchQueueAccepted = [
    'local_worker_launch_queue_idle_outputs_present',
    'local_worker_launch_queue_blocked'
  ].includes(launchQueue.status);
  if (!matrixAccepted) failures.push(`Matrix not in a guarded ready/review state: ${matrix.status}`);
  if (!workerContractsAccepted) failures.push(`Worker contracts not in a guarded review state: ${workerContracts.status}`);
  if (workerRunbook.status !== 'local_worker_execution_runbook_idle_review_only') failures.push(`Worker runbook not idle review-only: ${workerRunbook.status}`);
  if (!launchQueueAccepted) failures.push(`Launch queue not in a safe idle/blocked state: ${launchQueue.status}`);

  const taskTemplates = [
    {
      id: 'metadata_match_candidates',
      lane: 'kosmoreferences',
      expected_output: 'candidate source-to-slot match table',
      allowed_input: 'metadata inventory rows only after source-root guards pass'
    },
    {
      id: 'provenance_gap_summary',
      lane: 'kosmoreferences',
      expected_output: 'review-only provenance gap summary',
      allowed_input: 'file metadata and existing provenance labels only'
    },
    {
      id: 'analysis_layer_draft',
      lane: 'kosmoreferences',
      expected_output: 'typology/material/structure/space/construction draft fields',
      allowed_input: 'approved metadata snippets and human-reviewed source notes only'
    },
    {
      id: 'asset_schema_draft',
      lane: 'kosmoasset',
      expected_output: 'review-only asset schema draft',
      allowed_input: 'reviewed reference signals and asset taxonomy only'
    }
  ];

  const tasks = (matrix.pilots || []).flatMap((pilot) => taskTemplates.map((template) => ({
    id: `${pilot.id}:${template.id}`,
    pilot_id: pilot.id,
    pilot_title: pilot.title,
    lane: template.lane,
    task_type: template.id,
    expected_output: template.expected_output,
    allowed_input: template.allowed_input,
    target_worker: 'kosmo-odysseus-local-llm',
    overseer: 'codex_or_claude_review_required',
    executable_now: false,
    blocked_until: [
      'owner_unlock_answer_dry_run_ready_for_review',
      'reviewed_owner_answer_intake',
      'source_root_activation_preflight_passed',
      'pilot_scoped_metadata_inventory_passed'
    ],
    writes_repo_now: false,
    public_ready_after_task: 0
  })));

  return {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    status: failures.length === 0
      ? 'local_worker_pilot_task_queue_ready_blocked'
      : 'local_worker_pilot_task_queue_needs_review',
    policy: {
      queue_only: true,
      executes_local_worker_now: false,
      reads_private_content_now: false,
      writes_repo_now: false,
      requires_overseer_review: true,
      public_ready_after_queue: 0
    },
    source_refs: [
      relative(root, matrixPath),
      relative(root, workerContractsPath),
      relative(root, workerRunbookPath),
      relative(root, launchQueuePath)
    ],
    summary: {
      pilots: matrix.summary?.pilots ?? null,
      tasks: tasks.length,
      tasks_per_pilot: taskTemplates.length,
      kosmoreferences_tasks: tasks.filter((task) => task.lane === 'kosmoreferences').length,
      kosmoasset_tasks: tasks.filter((task) => task.lane === 'kosmoasset').length,
      worker_contracts: workerContracts.summary?.contracts ?? null,
      runner_safe_tasks: workerRunbook.summary?.runner_safe_tasks ?? null,
      matrix_status: matrix.status,
      matrix_guarded_review_only: matrixAccepted && (matrix.summary?.executable_now ?? 0) === 0 && matrix.summary?.public_ready_after_matrix === 0,
      matrix_failures: matrix.summary?.failures ?? null,
      launchable_now: 0,
      writes_repo_now: 0,
      public_ready_after_queue: 0,
      failures: failures.length
    },
    tasks,
    next_actions_after_source_root: [
      'Run pilot-scoped metadata inventory and guard first.',
      'Materialize task inputs as minimal metadata snippets, not full private documents.',
      'Run local worker tasks only through existing output contracts.',
      'Require Codex/Claude review before any repo conversion.'
    ],
    hard_stops: [
      'Do not launch local worker tasks from this queue now.',
      'Do not pass full private documents to local workers.',
      'Do not let local worker output write directly to repo.',
      'Do not mark local worker output public-ready.'
    ],
    failures
  };
}

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

function renderMarkdown(report) {
  const lines = [];
  lines.push('# Kosmo Local Worker Pilot Task Queue');
  lines.push('');
  lines.push(`Generated: ${report.generated_at}`);
  lines.push(`Status: \`${report.status}\``);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Pilots: ${report.summary.pilots}`);
  lines.push(`- Tasks: ${report.summary.tasks}`);
  lines.push(`- Tasks per pilot: ${report.summary.tasks_per_pilot}`);
  lines.push(`- KosmoReferences tasks: ${report.summary.kosmoreferences_tasks}`);
  lines.push(`- KosmoAsset tasks: ${report.summary.kosmoasset_tasks}`);
  lines.push(`- Worker contracts: ${report.summary.worker_contracts}`);
  lines.push(`- Runner-safe tasks: ${report.summary.runner_safe_tasks}`);
  lines.push(`- Matrix status: ${report.summary.matrix_status}`);
  lines.push(`- Matrix guarded review-only: ${report.summary.matrix_guarded_review_only ? 'yes' : 'no'}`);
  lines.push(`- Launchable now: ${report.summary.launchable_now}`);
  lines.push(`- Public-ready after queue: ${report.summary.public_ready_after_queue}`);
  lines.push('');
  lines.push('## Tasks');
  lines.push('');
  report.tasks.forEach((task) => {
    lines.push(`- \`${task.id}\` -> ${task.expected_output}`);
  });
  lines.push('');
  lines.push('## Next Actions After Source Root');
  lines.push('');
  report.next_actions_after_source_root.forEach((action) => lines.push(`- ${action}`));
  lines.push('');
  lines.push('## Hard Stops');
  lines.push('');
  report.hard_stops.forEach((item) => lines.push(`- ${item}`));
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
