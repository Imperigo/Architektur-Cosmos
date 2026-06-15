#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = new Date().toISOString().slice(0, 10);
const planPath = resolve(root, args.plan || `data/kosmo-local-worker-innovation-output-adapter-plan-${dateStamp}.json`);
const outputJson = resolve(root, args.out || `data/kosmo-local-worker-innovation-output-adapter-plan-check-${dateStamp}.json`);
const outputMd = resolve(root, args.markdown || `docs/codex/kosmo-local-worker-innovation-output-adapter-plan-check-${dateStamp}.md`);

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const plan = JSON.parse(await readFile(planPath, 'utf8'));
  const checks = buildChecks(plan);
  const failures = checks.filter((check) => check.status === 'failed');
  const report = {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    status: failures.length === 0
      ? 'local_worker_innovation_output_adapter_plan_guard_passed'
      : 'local_worker_innovation_output_adapter_plan_guard_failed',
    policy: {
      review_only: true,
      reads_private_content_now: false,
      reads_worker_output_bodies_now: false,
      body_copy_allowed: false,
      executes_local_workers: false,
      public_ready_after_check: 0
    },
    source_refs: [relative(root, planPath)],
    summary: {
      checks: checks.length,
      passed: checks.length - failures.length,
      failures: failures.length,
      adapters: plan.summary?.adapters ?? null,
      metadata_capture_fields: plan.summary?.metadata_capture_fields ?? null,
      public_ready_after_check: 0
    },
    checks
  };

  await mkdir(dirname(outputJson), { recursive: true });
  await mkdir(dirname(outputMd), { recursive: true });
  await writeFile(outputJson, `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(outputMd, renderMarkdown(report));

  console.log('Kosmo local worker innovation output adapter plan check');
  console.log(`Status: ${report.status}`);
  console.log(`Checks: ${report.summary.passed}/${report.summary.checks}`);
  console.log(`Failures: ${report.summary.failures}`);
  console.log(`Wrote: ${relative(root, outputMd)}`);

  if (failures.length > 0) process.exitCode = 1;
}

function buildChecks(plan) {
  const adapters = plan.adapters || [];
  return [
    check('status_ready', plan.status === 'local_worker_innovation_output_adapter_plan_ready', plan.status),
    check('policy_plan_only', plan.policy?.adapter_plan_only === true, plan.policy?.adapter_plan_only),
    check('policy_no_private_reads_now', plan.policy?.reads_private_content_now === false, plan.policy?.reads_private_content_now),
    check('policy_no_worker_body_reads_now', plan.policy?.reads_worker_output_bodies_now === false, plan.policy?.reads_worker_output_bodies_now),
    check('policy_no_body_git', plan.policy?.stores_worker_body_in_git === false, plan.policy?.stores_worker_body_in_git),
    check('policy_no_recommendations_git', plan.policy?.stores_worker_recommendations_in_git === false, plan.policy?.stores_worker_recommendations_in_git),
    check('policy_metadata_only', plan.policy?.stores_metadata_only === true, plan.policy?.stores_metadata_only),
    check('policy_no_worker_execution', plan.policy?.executes_local_workers === false, plan.policy?.executes_local_workers),
    check('policy_public_ready_zero', plan.policy?.public_ready_after_plan === 0, plan.policy?.public_ready_after_plan),
    check('five_adapters', plan.summary?.adapters === 5 && adapters.length === 5, `${adapters.length}/${plan.summary?.adapters}`),
    check('metadata_fields_present', plan.summary?.metadata_capture_fields >= 10, plan.summary?.metadata_capture_fields),
    check('all_adapter_paths_worker_packets', adapters.every((adapter) => String(adapter.expected_output_path || '').includes('/KosmoZentrale/worker_packets/')), adapters.length),
    check('all_adapters_metadata_read_mode', adapters.every((adapter) => adapter.allowed_read_mode === 'json_schema_and_metadata_only'), adapters.map((adapter) => adapter.allowed_read_mode).join(', ')),
    check('all_adapters_no_body_git', adapters.every((adapter) => adapter.may_store_body_excerpt_in_git === false && adapter.may_store_worker_recommendations_in_git === false), adapters.length),
    check('all_adapters_no_repo_conversion', adapters.every((adapter) => adapter.repo_conversion_allowed_now === false), adapters.length),
    check('all_adapters_public_ready_zero', adapters.every((adapter) => adapter.public_ready_after_adapter === 0), adapters.length),
    check('all_adapters_have_hard_stops', adapters.every((adapter) => (adapter.hard_stops || []).includes('do_not_copy_output_body') && (adapter.hard_stops || []).includes('do_not_mark_public_ready')), adapters.length)
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
  lines.push('# Kosmo Local Worker Innovation Output Adapter Plan Check');
  lines.push('');
  lines.push(`Generated: ${report.generated_at}`);
  lines.push(`Status: \`${report.status}\``);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Checks: ${report.summary.passed}/${report.summary.checks}`);
  lines.push(`- Failures: ${report.summary.failures}`);
  lines.push(`- Adapters: ${report.summary.adapters}`);
  lines.push(`- Metadata capture fields: ${report.summary.metadata_capture_fields}`);
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
