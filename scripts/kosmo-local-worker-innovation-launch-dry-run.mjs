#!/usr/bin/env node

import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = new Date().toISOString().slice(0, 10);

const refs = {
  taskPack: resolve(root, args.taskPack || `data/kosmo-local-worker-fixture-chain-task-pack-${dateStamp}.json`),
  outputSmoke: resolve(root, args.outputSmoke || `data/kosmo-local-worker-innovation-output-smoke-${dateStamp}.json`),
  outputSmokeCheck: resolve(root, args.outputSmokeCheck || `data/kosmo-local-worker-innovation-output-smoke-check-${dateStamp}.json`),
  adapterPlan: resolve(root, args.adapterPlan || `data/kosmo-local-worker-innovation-output-adapter-plan-${dateStamp}.json`),
  adapterPlanCheck: resolve(root, args.adapterPlanCheck || `data/kosmo-local-worker-innovation-output-adapter-plan-check-${dateStamp}.json`),
  validator: resolve(root, args.validator || `data/kosmo-local-worker-innovation-output-validator-${dateStamp}.json`),
  validatorCheck: resolve(root, args.validatorCheck || `data/kosmo-local-worker-innovation-output-validator-check-${dateStamp}.json`),
  validatorFixtures: resolve(root, args.validatorFixtures || `data/kosmo-local-worker-innovation-output-validator-fixtures-${dateStamp}.json`),
  validatorFixturesCheck: resolve(root, args.validatorFixturesCheck || `data/kosmo-local-worker-innovation-output-validator-fixtures-check-${dateStamp}.json`)
};

const outputJson = resolve(root, args.out || `data/kosmo-local-worker-innovation-launch-dry-run-${dateStamp}.json`);
const outputMd = resolve(root, args.markdown || `docs/codex/kosmo-local-worker-innovation-launch-dry-run-${dateStamp}.md`);

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const reports = {};
  for (const [key, path] of Object.entries(refs)) reports[key] = await readJson(path);
  const report = buildReport(reports);

  await mkdir(dirname(outputJson), { recursive: true });
  await mkdir(dirname(outputMd), { recursive: true });
  await writeFile(outputJson, `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(outputMd, renderMarkdown(report));

  console.log('Kosmo local worker innovation launch dry run');
  console.log(`Status: ${report.status}`);
  console.log(`Tasks: ${report.summary.tasks}`);
  console.log(`Dry-run ready: ${report.summary.dry_run_ready_tasks}`);
  console.log(`Execute now: ${report.summary.execute_now}`);
  console.log(`Explicit gate required: ${report.summary.explicit_gate_required}`);
  console.log(`Public-ready after dry run: ${report.summary.public_ready_after_dry_run}`);
  console.log(`Wrote: ${relative(root, outputMd)}`);
}

function buildReport(reports) {
  const failures = [];
  if (reports.taskPack.status !== 'local_worker_fixture_chain_task_pack_ready') failures.push(`Task pack not ready: ${reports.taskPack.status}`);
  if (reports.outputSmoke.status !== 'local_worker_innovation_output_smoke_ready') failures.push(`Output smoke not ready: ${reports.outputSmoke.status}`);
  if (reports.outputSmokeCheck.status !== 'local_worker_innovation_output_smoke_guard_passed') failures.push(`Output smoke guard not passed: ${reports.outputSmokeCheck.status}`);
  if (reports.adapterPlan.status !== 'local_worker_innovation_output_adapter_plan_ready') failures.push(`Adapter plan not ready: ${reports.adapterPlan.status}`);
  if (reports.adapterPlanCheck.status !== 'local_worker_innovation_output_adapter_plan_guard_passed') failures.push(`Adapter plan guard not passed: ${reports.adapterPlanCheck.status}`);
  if (![
    'local_worker_innovation_output_validator_waiting_for_outputs',
    'local_worker_innovation_output_validator_passed'
  ].includes(reports.validator.status)) failures.push(`Validator not in allowed dry-run state: ${reports.validator.status}`);
  if (reports.validatorCheck.status !== 'local_worker_innovation_output_validator_guard_passed') failures.push(`Validator guard not passed: ${reports.validatorCheck.status}`);
  if (reports.validatorFixtures.status !== 'local_worker_innovation_output_validator_fixtures_passed') failures.push(`Validator fixtures not passed: ${reports.validatorFixtures.status}`);
  if (reports.validatorFixturesCheck.status !== 'local_worker_innovation_output_validator_fixtures_guard_passed') failures.push(`Validator fixtures guard not passed: ${reports.validatorFixturesCheck.status}`);

  const tasks = (reports.taskPack.tasks || [])
    .filter((task) => task.task_id?.startsWith('github-innovation-'))
    .map((task) => buildTask(task));

  if (tasks.length !== 5) failures.push(`Expected 5 innovation tasks, got ${tasks.length}`);

  return {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    status: failures.length === 0
      ? 'local_worker_innovation_launch_dry_run_ready'
      : 'local_worker_innovation_launch_dry_run_needs_review',
    policy: {
      dry_run_only: true,
      review_only: true,
      reads_private_content: false,
      executes_local_workers: false,
      starts_models: false,
      writes_worker_outputs: false,
      writes_repo_outputs: false,
      writes_cloud_outputs: false,
      promotes_training_rows: false,
      public_ready_after_dry_run: 0,
      note: 'This report prepares launch decisions only. It does not execute local workers, start models or write worker output files.'
    },
    source_refs: Object.values(refs).map((path) => relative(root, path)),
    summary: {
      tasks: tasks.length,
      dry_run_ready_tasks: tasks.filter((task) => task.launch_state === 'dry_run_ready_waiting_for_explicit_gate').length,
      execute_now: tasks.filter((task) => task.execute_now === true).length,
      explicit_gate_required: tasks.filter((task) => task.requires_explicit_overseer_gate === true).length,
      missing_outputs: tasks.filter((task) => task.output_status === 'missing').length,
      existing_outputs: tasks.filter((task) => task.output_status === 'present').length,
      validator_fixture_guarded: reports.validatorFixturesCheck.summary?.failures === 0,
      public_ready_after_dry_run: 0,
      failures: failures.length
    },
    tasks,
    required_before_execute: [
      'Explicit owner/overseer launch decision for this exact innovation-worker batch.',
      'Rerun validator fixtures and guards immediately before launch.',
      'Use source-free fixture inputs only.',
      'Write output only under the task output_path in KosmoZentrale worker_packets.',
      'Run validator, validator-check and Output Contract Review after outputs exist.',
      'Keep repo conversion, training promotion and public-ready at 0.'
    ],
    forbidden_actions: [
      'Do not execute local workers from this dry-run.',
      'Do not start Ollama or any model from this dry-run.',
      'Do not read private Source Root, private PDFs, scans, OCR text or OneDrive libraries.',
      'Do not clone, install or execute referenced GitHub repositories.',
      'Do not copy worker output body text into Git.',
      'Do not mark anything public-ready.'
    ],
    failures
  };
}

function buildTask(task) {
  const outputExists = existsSync(task.output_path);
  return {
    task_id: task.task_id,
    lane: task.lane,
    source_repo: task.source_repo,
    output_path: task.output_path,
    output_status: outputExists ? 'present' : 'missing',
    training_eval_lane: task.training_eval_lane,
    ontology_bindings_present: Array.isArray(task.ontology_bindings?.entities) && task.ontology_bindings.entities.length > 0 &&
      Array.isArray(task.ontology_bindings?.relations) && task.ontology_bindings.relations.length > 0,
    launch_state: 'dry_run_ready_waiting_for_explicit_gate',
    execute_now: false,
    local_worker_allowed_now: false,
    requires_explicit_overseer_gate: true,
    safe_dry_run_command: `npm run kosmo:local-worker-innovation-launch-dry-run -- --task ${task.task_id}`,
    future_execute_command_template: `npm run kosmo:local-worker-http-runner -- --task ${task.task_id} --taskPack data/kosmo-local-worker-fixture-chain-task-pack-${new Date().toISOString().slice(0, 10)}.json --execute`,
    repo_conversion_allowed_now: false,
    public_ready_after_task: 0
  };
}

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

function renderMarkdown(report) {
  const lines = [];
  lines.push('# Kosmo Local Worker Innovation Launch Dry Run');
  lines.push('');
  lines.push(`Generated: ${report.generated_at}`);
  lines.push(`Status: \`${report.status}\``);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Tasks: ${report.summary.tasks}`);
  lines.push(`- Dry-run ready tasks: ${report.summary.dry_run_ready_tasks}`);
  lines.push(`- Execute now: ${report.summary.execute_now}`);
  lines.push(`- Explicit gate required: ${report.summary.explicit_gate_required}`);
  lines.push(`- Missing outputs: ${report.summary.missing_outputs}`);
  lines.push(`- Existing outputs: ${report.summary.existing_outputs}`);
  lines.push(`- Validator fixture guarded: ${report.summary.validator_fixture_guarded}`);
  lines.push(`- Public-ready after dry run: ${report.summary.public_ready_after_dry_run}`);
  lines.push(`- Failures: ${report.summary.failures}`);
  lines.push('');
  lines.push('## Tasks');
  lines.push('');
  lines.push('| Task | Lane | Output | Launch State | Execute Now |');
  lines.push('| --- | --- | --- | --- | --- |');
  report.tasks.forEach((task) => {
    lines.push(`| \`${task.task_id}\` | ${task.lane} | ${task.output_status} | ${task.launch_state} | ${task.execute_now ? 'yes' : 'no'} |`);
  });
  lines.push('');
  lines.push('## Required Before Execute');
  lines.push('');
  report.required_before_execute.forEach((item) => lines.push(`- ${item}`));
  lines.push('');
  lines.push('## Forbidden Actions');
  lines.push('');
  report.forbidden_actions.forEach((item) => lines.push(`- ${item}`));
  lines.push('');
  lines.push('## Failures');
  lines.push('');
  if (report.failures.length > 0) report.failures.forEach((failure) => lines.push(`- ${failure}`));
  else lines.push('- None.');
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
