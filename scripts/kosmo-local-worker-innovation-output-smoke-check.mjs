#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = new Date().toISOString().slice(0, 10);
const smokePath = resolve(root, args.smoke || `data/kosmo-local-worker-innovation-output-smoke-${dateStamp}.json`);
const outputJson = resolve(root, args.out || `data/kosmo-local-worker-innovation-output-smoke-check-${dateStamp}.json`);
const outputMd = resolve(root, args.markdown || `docs/codex/kosmo-local-worker-innovation-output-smoke-check-${dateStamp}.md`);

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
      ? 'local_worker_innovation_output_smoke_guard_passed'
      : 'local_worker_innovation_output_smoke_guard_failed',
    policy: {
      review_only: true,
      reads_private_content: false,
      executes_local_workers: false,
      starts_models: false,
      public_ready_after_check: 0
    },
    source_refs: [relative(root, smokePath)],
    summary: {
      checks: checks.length,
      passed: checks.length - failures.length,
      failures: failures.length,
      expected_outputs: smoke.summary?.expected_outputs ?? null,
      training_lanes: smoke.summary?.training_lanes ?? null,
      public_ready_after_check: 0
    },
    checks
  };

  await mkdir(dirname(outputJson), { recursive: true });
  await mkdir(dirname(outputMd), { recursive: true });
  await writeFile(outputJson, `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(outputMd, renderMarkdown(report));

  console.log('Kosmo local worker innovation output smoke check');
  console.log(`Status: ${report.status}`);
  console.log(`Checks: ${report.summary.passed}/${report.summary.checks}`);
  console.log(`Failures: ${report.summary.failures}`);
  console.log(`Wrote: ${relative(root, outputMd)}`);

  if (failures.length > 0) process.exitCode = 1;
}

function buildChecks(smoke) {
  const outputs = smoke.expected_outputs || [];
  return [
    check('status_ready', smoke.status === 'local_worker_innovation_output_smoke_ready', smoke.status),
    check('policy_review_only', smoke.policy?.review_only === true, smoke.policy?.review_only),
    check('policy_source_free', smoke.policy?.source_free_fixture_only === true, smoke.policy?.source_free_fixture_only),
    check('policy_no_private_reads', smoke.policy?.reads_private_content === false, smoke.policy?.reads_private_content),
    check('policy_no_worker_execution', smoke.policy?.executes_local_workers === false, smoke.policy?.executes_local_workers),
    check('policy_no_model_start', smoke.policy?.starts_models === false, smoke.policy?.starts_models),
    check('policy_no_worker_outputs_written', smoke.policy?.writes_worker_outputs === false, smoke.policy?.writes_worker_outputs),
    check('policy_no_repo_outputs', smoke.policy?.writes_repo_outputs === false, smoke.policy?.writes_repo_outputs),
    check('policy_no_training_promotion', smoke.policy?.promotes_training_rows === false, smoke.policy?.promotes_training_rows),
    check('five_expected_outputs', smoke.summary?.expected_outputs === 5 && outputs.length === 5, `${outputs.length}/${smoke.summary?.expected_outputs}`),
    check('three_training_lanes', smoke.summary?.training_lanes >= 3, smoke.summary?.training_lanes),
    check('all_outputs_hold_execution', outputs.every((output) => output.execute_now === false), outputs.filter((output) => output.execute_now !== false).length),
    check('all_outputs_no_repo_conversion', outputs.every((output) => output.repo_conversion_allowed_now === false), outputs.filter((output) => output.repo_conversion_allowed_now !== false).length),
    check('all_outputs_public_ready_zero', outputs.every((output) => output.public_ready_after_output === 0), outputs.filter((output) => output.public_ready_after_output !== 0).length),
    check('all_outputs_under_worker_packets', outputs.every((output) => String(output.output_path || '').includes('/KosmoZentrale/worker_packets/')), outputs.map((output) => output.output_path).join(', ')),
    check('all_outputs_have_training_lane', outputs.every((output) => typeof output.training_eval_lane === 'string' && output.training_eval_lane.length > 0), outputs.filter((output) => !output.training_eval_lane).length),
    check('all_outputs_have_ontology_bindings', outputs.every((output) => Array.isArray(output.ontology_bindings?.entities) && output.ontology_bindings.entities.length > 0 && Array.isArray(output.ontology_bindings?.relations) && output.ontology_bindings.relations.length > 0), outputs.length),
    check('all_outputs_require_policy_shape', outputs.every((output) => output.required_policy_shape?.public_ready === false && output.required_policy_shape?.copied_github_code === false && output.required_policy_shape?.starts_models === false), outputs.length),
    check('hard_stops_present', (smoke.hard_stops || []).length >= 6, (smoke.hard_stops || []).length),
    check('public_ready_zero', smoke.summary?.public_ready_after_smoke === 0, smoke.summary?.public_ready_after_smoke)
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
  lines.push('# Kosmo Local Worker Innovation Output Smoke Check');
  lines.push('');
  lines.push(`Generated: ${report.generated_at}`);
  lines.push(`Status: \`${report.status}\``);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Checks: ${report.summary.passed}/${report.summary.checks}`);
  lines.push(`- Failures: ${report.summary.failures}`);
  lines.push(`- Expected outputs: ${report.summary.expected_outputs}`);
  lines.push(`- Training lanes: ${report.summary.training_lanes}`);
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
