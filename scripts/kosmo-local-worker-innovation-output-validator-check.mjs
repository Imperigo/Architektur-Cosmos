#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = new Date().toISOString().slice(0, 10);
const validatorPath = resolve(root, args.validator || `data/kosmo-local-worker-innovation-output-validator-${dateStamp}.json`);
const outputJson = resolve(root, args.out || `data/kosmo-local-worker-innovation-output-validator-check-${dateStamp}.json`);
const outputMd = resolve(root, args.markdown || `docs/codex/kosmo-local-worker-innovation-output-validator-check-${dateStamp}.md`);

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const validator = JSON.parse(await readFile(validatorPath, 'utf8'));
  const checks = buildChecks(validator);
  const failures = checks.filter((check) => check.status === 'failed');
  const report = {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    status: failures.length === 0
      ? 'local_worker_innovation_output_validator_guard_passed'
      : 'local_worker_innovation_output_validator_guard_failed',
    policy: {
      review_only: true,
      metadata_only: true,
      allows_waiting_for_outputs: true,
      stores_worker_body_in_git: false,
      executes_local_workers: false,
      public_ready_after_check: 0
    },
    source_refs: [relative(root, validatorPath)],
    summary: {
      checks: checks.length,
      passed: checks.length - failures.length,
      failures: failures.length,
      validator_status: validator.status,
      expected_outputs: validator.summary?.expected_outputs ?? null,
      present_outputs: validator.summary?.present_outputs ?? null,
      missing_outputs: validator.summary?.missing_outputs ?? null,
      public_ready_after_check: 0
    },
    checks
  };

  await mkdir(dirname(outputJson), { recursive: true });
  await mkdir(dirname(outputMd), { recursive: true });
  await writeFile(outputJson, `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(outputMd, renderMarkdown(report));

  console.log('Kosmo local worker innovation output validator check');
  console.log(`Status: ${report.status}`);
  console.log(`Checks: ${report.summary.passed}/${report.summary.checks}`);
  console.log(`Failures: ${report.summary.failures}`);
  console.log(`Wrote: ${relative(root, outputMd)}`);

  if (failures.length > 0) process.exitCode = 1;
}

function buildChecks(validator) {
  const files = validator.files || [];
  return [
    check('status_valid_or_waiting', [
      'local_worker_innovation_output_validator_waiting_for_outputs',
      'local_worker_innovation_output_validator_passed'
    ].includes(validator.status), validator.status),
    check('policy_review_only', validator.policy?.review_only === true, validator.policy?.review_only),
    check('policy_metadata_only', validator.policy?.metadata_only === true, validator.policy?.metadata_only),
    check('policy_no_private_sources', validator.policy?.reads_private_sources === false, validator.policy?.reads_private_sources),
    check('policy_no_worker_execution', validator.policy?.executes_local_workers === false, validator.policy?.executes_local_workers),
    check('policy_no_model_start', validator.policy?.starts_models === false, validator.policy?.starts_models),
    check('policy_no_body_git', validator.policy?.stores_worker_output_body_in_git === false, validator.policy?.stores_worker_output_body_in_git),
    check('policy_no_recommendations_git', validator.policy?.stores_worker_recommendations_in_git === false, validator.policy?.stores_worker_recommendations_in_git),
    check('policy_no_repo_derivatives', validator.policy?.writes_repo_derivatives === false, validator.policy?.writes_repo_derivatives),
    check('public_ready_zero', validator.summary?.public_ready_after_validation === 0 && validator.policy?.public_ready_after_validation === 0, validator.summary?.public_ready_after_validation),
    check('expected_five_outputs', validator.summary?.expected_outputs === 5 && files.length === 5, `${files.length}/${validator.summary?.expected_outputs}`),
    check('body_copy_not_allowed', validator.summary?.body_copy_allowed === false && files.every((file) => file.stores_body === false), validator.summary?.body_copy_allowed),
    check('repo_conversion_zero', validator.summary?.repo_conversion_allowed_now === 0 && files.every((file) => file.repo_conversion_allowed_now === false), validator.summary?.repo_conversion_allowed_now),
    check('training_promotion_zero', validator.summary?.training_rows_promoted === 0, validator.summary?.training_rows_promoted),
    check('files_under_worker_packets', files.every((file) => file.output_path_under_worker_packets === true), files.length),
    check('no_failures_in_waiting_state', validator.summary?.failures === 0, validator.summary?.failures),
    check('missing_outputs_not_failure', validator.status !== 'local_worker_innovation_output_validator_needs_review', validator.status),
    check('hard_stops_present', (validator.hard_stops || []).length >= 6, (validator.hard_stops || []).length)
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
  lines.push('# Kosmo Local Worker Innovation Output Validator Check');
  lines.push('');
  lines.push(`Generated: ${report.generated_at}`);
  lines.push(`Status: \`${report.status}\``);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Validator status: ${report.summary.validator_status}`);
  lines.push(`- Checks: ${report.summary.passed}/${report.summary.checks}`);
  lines.push(`- Failures: ${report.summary.failures}`);
  lines.push(`- Expected outputs: ${report.summary.expected_outputs}`);
  lines.push(`- Present outputs: ${report.summary.present_outputs}`);
  lines.push(`- Missing outputs: ${report.summary.missing_outputs}`);
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
