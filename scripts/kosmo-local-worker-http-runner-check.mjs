#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = new Date().toISOString().slice(0, 10);
const runnerPath = resolve(root, args.runner || `data/kosmo-local-worker-http-runner-${dateStamp}.json`);
const outputJson = resolve(root, args.out || `data/kosmo-local-worker-http-runner-check-${dateStamp}.json`);
const outputMd = resolve(root, args.markdown || `docs/codex/kosmo-local-worker-http-runner-check-${dateStamp}.md`);

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const runner = JSON.parse(await readFile(runnerPath, 'utf8'));
  const findings = [
    ...checkPolicy(runner),
    ...checkTask(runner),
    ...checkGuard(runner),
    ...checkModelUse(runner)
  ];
  const failures = findings.filter((finding) => finding.severity === 'failure');
  const warnings = findings.filter((finding) => finding.severity === 'warning');
  const report = {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    status: failures.length === 0 ? 'local_worker_http_runner_guard_passed' : 'local_worker_http_runner_guard_failed',
    policy: {
      validates_report_only: true,
      starts_model: false,
      reads_private_outputs: false,
      reads_private_sources: false,
      writes_worker_outputs: false,
      public_ready_after_check: 0,
      note: 'This check validates the HTTP runner report only. It does not execute local models or read worker output contents.'
    },
    source_refs: [relative(root, runnerPath)],
    summary: {
      runner_status: runner.status,
      task_id: runner.task?.task_id || null,
      guard_passed: runner.guard?.passed === true,
      safe_inputs: runner.guard?.safe_inputs?.length ?? 0,
      execute_requested: runner.task?.execute_requested === true,
      model_used: runner.model?.used === true,
      failures: failures.length,
      warnings: warnings.length,
      public_ready_after_check: 0
    },
    findings,
    next_actions: failures.length === 0
      ? [
          'Treat the HTTP runner as safe for review-only dry-run visibility.',
          'Use --execute only after an overseer deliberately requests a local model task run.',
          'Rerun this check after any runner report, task-pack or output-path change.'
        ]
      : [
          'Fix runner guard failures before allowing local model task execution.',
          'Rerun npm run kosmo:local-worker-http-runner-smoke and this check.'
        ]
  };

  await mkdir(dirname(outputJson), { recursive: true });
  await mkdir(dirname(outputMd), { recursive: true });
  await writeFile(outputJson, `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(outputMd, renderMarkdown(report));

  console.log('Kosmo local worker HTTP runner check');
  console.log(`Status: ${report.status}`);
  console.log(`Failures: ${report.summary.failures}`);
  console.log(`Warnings: ${report.summary.warnings}`);
  console.log(`Wrote: ${relative(root, outputMd)}`);

  if (failures.length > 0) process.exitCode = 1;
}

function checkPolicy(runner) {
  const findings = [];
  expect(
    ['local_worker_http_runner_dry_run_ready', 'local_worker_http_runner_executed_review_only'].includes(runner.status),
    findings,
    'runner_status_guarded',
    'Runner status must be dry-run ready or executed review-only.'
  );
  expect(runner.policy?.review_only === true, findings, 'review_only_true', 'Runner must stay review-only.');
  expect(runner.policy?.reads_private_context_paths === false, findings, 'private_context_paths_false', 'Runner must not read private_context_paths.');
  expect(runner.policy?.reads_private_source_paths === false, findings, 'private_source_paths_false', 'Runner must not read private source paths.');
  expect(runner.policy?.writes_git === false, findings, 'writes_git_false', 'Runner must not write Git.');
  expect(runner.policy?.writes_cloud === false, findings, 'writes_cloud_false', 'Runner must not write cloud.');
  expect(runner.policy?.public_ready_after_runner === 0, findings, 'public_ready_zero', 'Runner must keep public-ready at 0.');
  return findings;
}

function checkTask(runner) {
  const findings = [];
  expect(typeof runner.task?.task_id === 'string' && runner.task.task_id.length > 0, findings, 'task_id_present', 'Runner task id must be present.');
  expect(String(runner.task?.output_path || '').includes('/KosmoZentrale/worker_packets/'), findings, 'output_path_worker_packets', 'Runner output must stay under KosmoZentrale worker_packets.');
  expect(String(runner.task?.output_filename || '').includes('.private.'), findings, 'output_filename_private', 'Runner output filename must be private.');
  return findings;
}

function checkGuard(runner) {
  const findings = [];
  const safeInputs = runner.guard?.safe_inputs || [];
  expect(runner.guard?.passed === true, findings, 'guard_passed', 'Runner guard must pass.');
  expect((runner.guard?.failures || []).length === 0, findings, 'guard_failures_zero', 'Runner guard failures must be zero.');
  expect(safeInputs.length > 0, findings, 'safe_inputs_present', 'Runner must enumerate safe input reports.');
  for (const input of safeInputs) {
    expect(/^(data|docs|examples)\//.test(input.ref || ''), findings, `safe_input_root:${input.ref}`, `Safe input must stay under data/, docs/ or examples/: ${input.ref}`);
    expect(input.truncated === false, findings, `safe_input_not_truncated:${input.ref}`, `Safe input should not be truncated for the default smoke task: ${input.ref}`);
  }
  return findings;
}

function checkModelUse(runner) {
  const findings = [];
  const executeRequested = runner.task?.execute_requested === true;
  const modelUsed = runner.model?.used === true;
  expect(executeRequested || modelUsed === false, findings, 'no_model_use_without_execute', 'Runner must not use a model unless execute is requested.');
  if (!executeRequested) {
    expect(modelUsed === false, findings, 'dry_run_model_unused', 'Dry-run runner must not start a model.');
  }
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
  lines.push('# Kosmo Local Worker HTTP Runner Check');
  lines.push('');
  lines.push(`Generated: ${report.generated_at}`);
  lines.push(`Status: \`${report.status}\``);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Runner status: ${report.summary.runner_status}`);
  lines.push(`- Task: ${report.summary.task_id}`);
  lines.push(`- Guard passed: ${report.summary.guard_passed ? 'yes' : 'no'}`);
  lines.push(`- Safe inputs: ${report.summary.safe_inputs}`);
  lines.push(`- Execute requested: ${report.summary.execute_requested ? 'yes' : 'no'}`);
  lines.push(`- Model used: ${report.summary.model_used ? 'yes' : 'no'}`);
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
