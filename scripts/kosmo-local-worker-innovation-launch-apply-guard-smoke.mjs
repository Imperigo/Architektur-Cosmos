#!/usr/bin/env node

import { execFile } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = new Date().toISOString().slice(0, 10);
const outputJson = resolve(root, args.out || `data/kosmo-local-worker-innovation-launch-apply-guard-smoke-${dateStamp}.json`);
const outputMd = resolve(root, args.markdown || `docs/codex/kosmo-local-worker-innovation-launch-apply-guard-smoke-${dateStamp}.md`);
const workDir = resolve(root, args.workDir || `data/local-worker-innovation-launch-apply-guard-smoke-${dateStamp}`);

const scenarios = [
  {
    id: 'empty_reply',
    answer: '',
    expected_status: 'local_worker_innovation_launch_apply_guard_waiting_for_exact_reply',
    expected_exact_valid: false,
    expected_launch_allowed: false
  },
  {
    id: 'exact_reply',
    answer: [
      'local_worker_innovation_launch_choice=approve_separate_source_free_launch_later',
      'confirmed_source_free_only=yes',
      'confirmed_no_private_content=yes',
      'confirmed_run_validator_after_outputs=yes',
      'note=Nur die 5 GitHub-Innovation-Fixture-Tasks duerfen in einem separaten Launch-Batch laufen.'
    ].join('; '),
    expected_status: 'local_worker_innovation_launch_apply_guard_ready_for_separate_dry_run_batch',
    expected_exact_valid: true,
    expected_launch_allowed: true
  },
  {
    id: 'broad_or_private_reply',
    answer: 'ja alles freigegeben, nutze auch private PDFs und Quellen',
    expected_status: 'local_worker_innovation_launch_apply_guard_blocked_by_reply',
    expected_exact_valid: false,
    expected_launch_allowed: false
  }
];

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  await mkdir(workDir, { recursive: true });
  const results = [];
  for (const scenario of scenarios) {
    const out = resolve(workDir, `${scenario.id}.json`);
    const markdown = resolve(workDir, `${scenario.id}.md`);
    await execFileAsync(process.execPath, [
      'scripts/kosmo-local-worker-innovation-launch-apply-guard.mjs',
      '--answer',
      scenario.answer,
      '--out',
      out,
      '--markdown',
      markdown
    ], { cwd: root });
    const guard = JSON.parse(await readFile(out, 'utf8'));
    const checks = [
      check('status_matches', guard.status === scenario.expected_status, `${guard.status} expected ${scenario.expected_status}`),
      check('exact_valid_matches', guard.summary?.exact_reply_valid === scenario.expected_exact_valid, guard.summary?.exact_reply_valid),
      check('launch_allowed_matches', guard.summary?.separate_launch_allowed_after_guard === scenario.expected_launch_allowed, guard.summary?.separate_launch_allowed_after_guard),
      check('execute_zero', guard.summary?.execute_now === 0, guard.summary?.execute_now),
      check('public_ready_zero', guard.summary?.public_ready_after_guard === 0, guard.summary?.public_ready_after_guard),
      check('no_model_start', guard.summary?.starts_models_now === false, guard.summary?.starts_models_now)
    ];
    results.push({
      id: scenario.id,
      output_ref: relative(root, out),
      status: guard.status,
      exact_reply_valid: guard.summary?.exact_reply_valid === true,
      separate_launch_allowed_after_guard: guard.summary?.separate_launch_allowed_after_guard === true,
      failures: checks.filter((item) => item.status === 'failed').length,
      checks
    });
  }

  const failures = results.reduce((sum, item) => sum + item.failures, 0);
  const report = {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    status: failures === 0
      ? 'local_worker_innovation_launch_apply_guard_smoke_passed'
      : 'local_worker_innovation_launch_apply_guard_smoke_failed',
    policy: {
      smoke_only: true,
      uses_synthetic_answers_only: true,
      executes_local_workers_now: false,
      starts_models_now: false,
      reads_private_content_now: false,
      public_ready_after_smoke: 0
    },
    source_refs: ['scripts/kosmo-local-worker-innovation-launch-apply-guard.mjs'],
    summary: {
      scenarios: results.length,
      passed_scenarios: results.filter((item) => item.failures === 0).length,
      failures,
      execute_now: 0,
      public_ready_after_smoke: 0
    },
    results
  };

  await mkdir(dirname(outputJson), { recursive: true });
  await mkdir(dirname(outputMd), { recursive: true });
  await writeFile(outputJson, `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(outputMd, renderMarkdown(report));

  console.log('Kosmo local worker innovation launch apply guard smoke');
  console.log(`Status: ${report.status}`);
  console.log(`Scenarios: ${report.summary.passed_scenarios}/${report.summary.scenarios}`);
  console.log(`Failures: ${report.summary.failures}`);
  console.log(`Wrote: ${relative(root, outputMd)}`);

  if (failures > 0) process.exitCode = 1;
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
  lines.push('# Kosmo Local Worker Innovation Launch Apply Guard Smoke');
  lines.push('');
  lines.push(`Generated: ${report.generated_at}`);
  lines.push(`Status: \`${report.status}\``);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Scenarios: ${report.summary.passed_scenarios}/${report.summary.scenarios}`);
  lines.push(`- Failures: ${report.summary.failures}`);
  lines.push(`- Execute now: ${report.summary.execute_now}`);
  lines.push(`- Public-ready after smoke: ${report.summary.public_ready_after_smoke}`);
  lines.push('');
  lines.push('## Results');
  lines.push('');
  report.results.forEach((result) => {
    lines.push(`- \`${result.id}\`: ${result.status}, exact=${result.exact_reply_valid ? 'yes' : 'no'}, separate_launch=${result.separate_launch_allowed_after_guard ? 'yes' : 'no'}, failures=${result.failures}`);
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
