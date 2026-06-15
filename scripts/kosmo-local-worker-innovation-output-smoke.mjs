#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = new Date().toISOString().slice(0, 10);
const taskPackPath = resolve(root, args.taskPack || `data/kosmo-local-worker-fixture-chain-task-pack-${dateStamp}.json`);
const outputJson = resolve(root, args.out || `data/kosmo-local-worker-innovation-output-smoke-${dateStamp}.json`);
const outputMd = resolve(root, args.markdown || `docs/codex/kosmo-local-worker-innovation-output-smoke-${dateStamp}.md`);

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const taskPack = JSON.parse(await readFile(taskPackPath, 'utf8'));
  const report = buildReport(taskPack);

  await mkdir(dirname(outputJson), { recursive: true });
  await mkdir(dirname(outputMd), { recursive: true });
  await writeFile(outputJson, `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(outputMd, renderMarkdown(report));

  console.log('Kosmo local worker innovation output smoke');
  console.log(`Status: ${report.status}`);
  console.log(`Innovation tasks: ${report.summary.innovation_tasks}`);
  console.log(`Expected outputs: ${report.summary.expected_outputs}`);
  console.log(`Training lanes: ${report.summary.training_lanes}`);
  console.log(`Executable now: ${report.summary.executable_now}`);
  console.log(`Public-ready after smoke: ${report.summary.public_ready_after_smoke}`);
  console.log(`Wrote: ${relative(root, outputMd)}`);
}

function buildReport(taskPack) {
  const innovationTasks = (taskPack.tasks || []).filter((task) => task.task_id?.startsWith('github-innovation-'));
  const expectedOutputs = innovationTasks.map((task) => ({
    task_id: task.task_id,
    lane: task.lane,
    source_repo: task.source_repo,
    source_url: task.source_url,
    output_path: task.output_path,
    execute_now: false,
    repo_conversion_allowed_now: false,
    public_ready_after_output: 0,
    training_eval_lane: task.training_eval_lane,
    ontology_bindings: task.ontology_bindings,
    required_json_fields: [
      'schema_version',
      'generated_at',
      'task_id',
      'review_status',
      'lane',
      'source_repo_reference_only',
      'used_input_refs',
      'metadata_improvement_suggestions',
      'blockers',
      'training_eval',
      'ontology_review',
      'policy'
    ],
    required_policy_shape: {
      review_only: true,
      source_free_fixture_only: true,
      reads_private_content: false,
      copies_private_content: false,
      copied_github_code: false,
      copied_github_readme_text: false,
      cloned_or_executed_repo: false,
      starts_models: false,
      writes_repo_outputs: false,
      writes_cloud_outputs: false,
      promotes_training_rows: false,
      public_ready: false
    },
    expected_review_shape: {
      training_eval_lane: task.training_eval_lane,
      ontology_entities_present: Array.isArray(task.ontology_bindings?.entities) && task.ontology_bindings.entities.length > 0,
      ontology_relations_present: Array.isArray(task.ontology_bindings?.relations) && task.ontology_bindings.relations.length > 0,
      recommendations_allowed: true,
      generated_facts_allowed: false,
      private_gate_testing_allowed: false
    },
    required_input_refs: task.input_refs,
    acceptance: task.acceptance,
    forbidden_terms: [
      'public_ready=true',
      'repo_conversion_allowed_now=true',
      'training_promoted=true',
      'private_content_allowed=true',
      'cloned_repo=true',
      'installed_dependencies=true',
      'model_started=true'
    ]
  }));

  const failures = [];
  if (taskPack.status !== 'local_worker_fixture_chain_task_pack_ready') failures.push(`Task pack not ready: ${taskPack.status}`);
  if (innovationTasks.length !== 5) failures.push(`Expected 5 GitHub innovation tasks, got ${innovationTasks.length}`);
  if (expectedOutputs.some((output) => !output.output_path?.includes('/KosmoZentrale/worker_packets/'))) {
    failures.push('Every expected output path must stay under KosmoZentrale worker_packets.');
  }
  if (expectedOutputs.some((output) => output.public_ready_after_output !== 0 || output.repo_conversion_allowed_now)) {
    failures.push('Expected outputs must not allow public-ready or repo conversion.');
  }

  return {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    status: failures.length === 0
      ? 'local_worker_innovation_output_smoke_ready'
      : 'local_worker_innovation_output_smoke_needs_review',
    policy: {
      review_only: true,
      source_free_fixture_only: true,
      reads_private_content: false,
      copies_private_content: false,
      executes_local_workers: false,
      starts_models: false,
      writes_worker_outputs: false,
      writes_repo_outputs: false,
      writes_cloud_outputs: false,
      promotes_training_rows: false,
      public_ready_after_smoke: 0,
      note: 'This smoke defines expected local-worker output contracts only. It does not execute local workers or create worker output files.'
    },
    source_refs: [relative(root, taskPackPath)],
    summary: {
      innovation_tasks: innovationTasks.length,
      expected_outputs: expectedOutputs.length,
      lanes: countUnique(expectedOutputs.map((output) => output.lane)),
      training_lanes: countUnique(expectedOutputs.map((output) => output.training_eval_lane)),
      ontology_bound_outputs: expectedOutputs.filter((output) => output.expected_review_shape.ontology_entities_present && output.expected_review_shape.ontology_relations_present).length,
      executable_now: 0,
      repo_conversion_allowed_now: 0,
      training_rows_promoted: 0,
      public_ready_after_smoke: 0,
      failures: failures.length
    },
    expected_outputs: expectedOutputs,
    hard_stops: [
      'Do not run local workers from this smoke.',
      'Do not create or read private worker output bodies.',
      'Do not clone, install, execute or benchmark referenced GitHub repositories.',
      'Do not promote worker output into training rows.',
      'Do not convert worker output into repo artifacts.',
      'Do not mark any output public-ready.'
    ],
    next_actions: [
      'Use this smoke as the contract for a later isolated local-worker fixture run.',
      'After a worker output exists, run metadata-only output review before any conversion.',
      'Keep Source Root and private content blocked until exact owner unlock is present.'
    ],
    failures
  };
}

function countUnique(values) {
  return new Set(values.filter(Boolean)).size;
}

function renderMarkdown(report) {
  const lines = [];
  lines.push('# Kosmo Local Worker Innovation Output Smoke');
  lines.push('');
  lines.push(`Generated: ${report.generated_at}`);
  lines.push(`Status: \`${report.status}\``);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Innovation tasks: ${report.summary.innovation_tasks}`);
  lines.push(`- Expected outputs: ${report.summary.expected_outputs}`);
  lines.push(`- Lanes: ${report.summary.lanes}`);
  lines.push(`- Training lanes: ${report.summary.training_lanes}`);
  lines.push(`- Ontology-bound outputs: ${report.summary.ontology_bound_outputs}`);
  lines.push(`- Executable now: ${report.summary.executable_now}`);
  lines.push(`- Repo conversion allowed now: ${report.summary.repo_conversion_allowed_now}`);
  lines.push(`- Training rows promoted: ${report.summary.training_rows_promoted}`);
  lines.push(`- Public-ready after smoke: ${report.summary.public_ready_after_smoke}`);
  lines.push(`- Failures: ${report.summary.failures}`);
  lines.push('');
  lines.push('## Expected Outputs');
  lines.push('');
  lines.push('| Task | Lane | Training lane | Output |');
  lines.push('| --- | --- | --- | --- |');
  report.expected_outputs.forEach((output) => {
    lines.push(`| \`${output.task_id}\` | ${output.lane} | ${output.training_eval_lane} | \`${escapePipe(output.output_path)}\` |`);
  });
  lines.push('');
  lines.push('## Hard Stops');
  lines.push('');
  report.hard_stops.forEach((stop) => lines.push(`- ${stop}`));
  lines.push('');
  lines.push('## Failures');
  lines.push('');
  if (report.failures.length > 0) report.failures.forEach((failure) => lines.push(`- ${failure}`));
  else lines.push('- None.');
  lines.push('');
  return lines.join('\n');
}

function escapePipe(value) {
  return String(value ?? '').replace(/\|/g, '\\|').replace(/\n/g, ' ');
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
