#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = new Date().toISOString().slice(0, 10);
const smokePath = resolve(root, args.smoke || `data/kosmo-local-worker-innovation-launch-apply-guard-smoke-${dateStamp}.json`);
const outputJson = resolve(root, args.out || `data/kosmo-local-worker-innovation-launch-apply-guard-smoke-check-${dateStamp}.json`);
const outputMd = resolve(root, args.markdown || `docs/codex/kosmo-local-worker-innovation-launch-apply-guard-smoke-check-${dateStamp}.md`);

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const smoke = JSON.parse(await readFile(smokePath, 'utf8'));
  const checks = buildChecks(smoke);
  const failures = checks.filter((check) => check.status === 'failed');
  const report = {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    status: failures.length === 0
      ? 'local_worker_innovation_launch_apply_guard_smoke_guard_passed'
      : 'local_worker_innovation_launch_apply_guard_smoke_guard_failed',
    policy: {
      validates_smoke_only: true,
      executes_local_workers_now: false,
      starts_models_now: false,
      reads_private_content_now: false,
      public_ready_after_check: 0
    },
    source_refs: [relative(root, smokePath)],
    summary: {
      checks: checks.length,
      passed: checks.length - failures.length,
      failures: failures.length,
      scenarios: smoke.summary?.scenarios ?? null,
      public_ready_after_check: 0
    },
    checks
  };

  await mkdir(dirname(outputJson), { recursive: true });
  await mkdir(dirname(outputMd), { recursive: true });
  await writeFile(outputJson, `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(outputMd, renderMarkdown(report));

  console.log('Kosmo local worker innovation launch apply guard smoke check');
  console.log(`Status: ${report.status}`);
  console.log(`Checks: ${report.summary.passed}/${report.summary.checks}`);
  console.log(`Failures: ${report.summary.failures}`);
  console.log(`Wrote: ${relative(root, outputMd)}`);

  if (failures.length > 0) process.exitCode = 1;
}

function buildChecks(smoke) {
  const byId = Object.fromEntries((smoke.results || []).map((item) => [item.id, item]));
  return [
    check('status_passed', smoke.status === 'local_worker_innovation_launch_apply_guard_smoke_passed', smoke.status),
    check('policy_smoke_only', smoke.policy?.smoke_only === true, smoke.policy?.smoke_only),
    check('policy_synthetic_only', smoke.policy?.uses_synthetic_answers_only === true, smoke.policy?.uses_synthetic_answers_only),
    check('policy_no_execution', smoke.policy?.executes_local_workers_now === false, smoke.policy?.executes_local_workers_now),
    check('policy_no_model_start', smoke.policy?.starts_models_now === false, smoke.policy?.starts_models_now),
    check('policy_no_private_reads', smoke.policy?.reads_private_content_now === false, smoke.policy?.reads_private_content_now),
    check('public_ready_zero', smoke.policy?.public_ready_after_smoke === 0 && smoke.summary?.public_ready_after_smoke === 0, smoke.summary?.public_ready_after_smoke),
    check('three_scenarios', smoke.summary?.scenarios === 3 && (smoke.results || []).length === 3, `${(smoke.results || []).length}/${smoke.summary?.scenarios}`),
    check('empty_waits', byId.empty_reply?.status === 'local_worker_innovation_launch_apply_guard_waiting_for_exact_reply', byId.empty_reply?.status),
    check('exact_allows_separate_only', byId.exact_reply?.status === 'local_worker_innovation_launch_apply_guard_ready_for_separate_dry_run_batch' && byId.exact_reply?.separate_launch_allowed_after_guard === true, byId.exact_reply?.status),
    check('broad_private_blocks', byId.broad_or_private_reply?.status === 'local_worker_innovation_launch_apply_guard_blocked_by_reply', byId.broad_or_private_reply?.status),
    check('all_scenarios_no_failures', (smoke.results || []).every((item) => item.failures === 0), (smoke.results || []).map((item) => `${item.id}:${item.failures}`).join(', '))
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
  lines.push('# Kosmo Local Worker Innovation Launch Apply Guard Smoke Check');
  lines.push('');
  lines.push(`Generated: ${report.generated_at}`);
  lines.push(`Status: \`${report.status}\``);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Checks: ${report.summary.passed}/${report.summary.checks}`);
  lines.push(`- Failures: ${report.summary.failures}`);
  lines.push(`- Scenarios: ${report.summary.scenarios}`);
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
