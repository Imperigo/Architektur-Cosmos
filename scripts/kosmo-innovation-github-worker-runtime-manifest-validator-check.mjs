#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = new Date().toISOString().slice(0, 10);
const validatorPath = resolve(root, args.validator || `data/kosmo-innovation-github-worker-runtime-manifest-validator-${dateStamp}.json`);
const outputJson = resolve(root, args.out || `data/kosmo-innovation-github-worker-runtime-manifest-validator-check-${dateStamp}.json`);
const outputMd = resolve(root, args.markdown || `docs/codex/kosmo-innovation-github-worker-runtime-manifest-validator-check-${dateStamp}.md`);

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const validator = JSON.parse(await readFile(validatorPath, 'utf8'));
  const checks = buildChecks(validator);
  const failures = checks.filter((item) => item.status === 'failed');
  const report = {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    status: failures.length === 0
      ? 'innovation_github_worker_runtime_manifest_validator_guard_passed'
      : 'innovation_github_worker_runtime_manifest_validator_guard_failed',
    policy: {
      validates_validator_report_only: true,
      reads_private_content_now: false,
      executes_runtime_now: false,
      writes_runtime_manifest_now: false,
      writes_runtime_outputs_now: false,
      public_ready_after_check: 0
    },
    source_refs: [relative(root, validatorPath)],
    summary: {
      validator_status: validator.status,
      checks: checks.length,
      passed: checks.length - failures.length,
      failures: failures.length,
      validated_manifests: validator.summary?.validated_manifests ?? null,
      blocked_manifests: validator.summary?.blocked_manifests ?? null,
      review_only_valid_manifests: validator.summary?.review_only_valid_manifests ?? null,
      public_ready_after_check: 0
    },
    checks
  };

  await mkdir(dirname(outputJson), { recursive: true });
  await mkdir(dirname(outputMd), { recursive: true });
  await writeFile(outputJson, `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(outputMd, renderMarkdown(report));

  console.log('Kosmo innovation GitHub worker runtime manifest validator check');
  console.log(`Status: ${report.status}`);
  console.log(`Checks: ${report.summary.passed}/${report.summary.checks}`);
  console.log(`Failures: ${report.summary.failures}`);
  console.log(`Wrote: ${relative(root, outputMd)}`);

  if (failures.length > 0) process.exitCode = 1;
}

function buildChecks(validator) {
  const validations = validator.validations || [];
  const negativeFixtureValidations = validations.filter((item) => item.source_kind === 'negative_fixture');
  const manifestDraftValidation = validations.find((item) => item.source_kind === 'manifest_draft');
  const positiveControlValidation = validations.find((item) => item.source_kind === 'positive_control');
  const allReasons = new Set(validations.flatMap((item) => item.block_reasons || []));
  const hardStops = (validator.hard_stops || []).join(' ').toLowerCase();

  return [
    check('status_passed', validator.status === 'innovation_github_worker_runtime_manifest_validator_passed', validator.status),
    check('policy_static_metadata_only', validator.policy?.static_metadata_validator_only === true && validator.policy?.validates_manifest_metadata_only === true, JSON.stringify(validator.policy)),
    check('policy_no_private_copy', validator.policy?.reads_private_content_now === false && validator.policy?.copies_private_content_now === false && validator.policy?.copies_secret_values_now === false, JSON.stringify(validator.policy)),
    check('policy_no_worker_body_copy', validator.policy?.copies_worker_output_body_now === false, validator.policy?.copies_worker_output_body_now),
    check('policy_no_runtime_side_effects', validator.policy?.executes_runtime_now === false && validator.policy?.executes_rollback_now === false && validator.policy?.starts_models_now === false && validator.policy?.installs_dependencies_now === false && validator.policy?.downloads_models_now === false, JSON.stringify(validator.policy)),
    check('policy_no_output_writes', validator.policy?.writes_runtime_manifest_now === false && validator.policy?.writes_runtime_outputs_now === false && validator.policy?.writes_worker_outputs_now === false, JSON.stringify(validator.policy)),
    check('policy_no_public_ready', validator.policy?.promotes_public_ready_now === false && validator.policy?.public_ready_after_validation === 0, JSON.stringify(validator.policy)),
    check('summary_counts', validator.summary?.validated_manifests === 12 && validator.summary?.negative_fixtures_validated === 10 && validator.summary?.positive_controls_validated === 1, JSON.stringify(validator.summary)),
    check('manifest_draft_blocked', manifestDraftValidation?.status === 'blocked' && manifestDraftValidation?.expected_status === 'blocked', JSON.stringify(manifestDraftValidation)),
    check('negative_fixtures_all_blocked', negativeFixtureValidations.length === 10 && negativeFixtureValidations.every((item) => item.status === 'blocked'), negativeFixtureValidations.map((item) => `${item.id}:${item.status}`).join(',')),
    check('positive_control_review_only_valid', positiveControlValidation?.status === 'review_only_valid' && positiveControlValidation?.expected_status === 'review_only_valid', JSON.stringify(positiveControlValidation)),
    check('all_validation_public_ready_zero', validations.every((item) => item.public_ready_after_validation === 0), 'public ready zero'),
    check('all_validation_no_runtime', validations.every((item) => item.runtime_executed_now === false && item.rollback_executed_now === false), 'no runtime or rollback'),
    check('all_validation_no_output_writes', validations.every((item) => item.runtime_manifest_written_now === false && item.runtime_outputs_written_now === false && item.worker_outputs_written_now === false), 'no output writes'),
    check('all_required_reasons_seen', requiredReasonIds().every((reason) => allReasons.has(reason)), [...allReasons].join(',')),
    check('summary_zeroes', validator.summary?.executable_manifests_after_validation === 0 && validator.summary?.runtime_executed_now === 0 && validator.summary?.runtime_manifest_written_now === 0 && validator.summary?.runtime_outputs_written_now === 0 && validator.summary?.worker_outputs_written_now === 0, JSON.stringify(validator.summary)),
    check('source_refs_cover_inputs', (validator.source_refs || []).some((ref) => ref.includes('runtime-manifest-validator-plan')) && (validator.source_refs || []).some((ref) => ref.includes('runtime-batch-manifest-draft')) && (validator.source_refs || []).some((ref) => ref.includes('runtime-manifest-negative-fixtures')), (validator.source_refs || []).join(',')),
    check('hard_stop_private', hardStops.includes('private source root') && hardStops.includes('onedrive'), hardStops),
    check('hard_stop_runtime', hardStops.includes('never executes runtime') && hardStops.includes('model starts') && hardStops.includes('installs'), hardStops),
    check('hard_stop_outputs_public', hardStops.includes('runtime manifests') && hardStops.includes('runtime outputs') && hardStops.includes('public-ready'), hardStops)
  ];
}

function requiredReasonIds() {
  return [
    'block_executable_manifest',
    'require_runtime_apply_guard',
    'require_rollback_redaction_refs',
    'block_raw_runtime_outputs',
    'block_worker_output_body',
    'block_private_paths',
    'block_secret_fields',
    'block_runtime_side_effects',
    'require_overseer_review_gate',
    'block_public_ready_promotion'
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
  lines.push('# Kosmo Innovation GitHub Worker Runtime Manifest Validator Check');
  lines.push('');
  lines.push(`Generated: ${report.generated_at}`);
  lines.push(`Status: \`${report.status}\``);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Validator status: ${report.summary.validator_status}`);
  lines.push(`- Checks: ${report.summary.passed}/${report.summary.checks}`);
  lines.push(`- Validated manifests: ${report.summary.validated_manifests}`);
  lines.push(`- Blocked manifests: ${report.summary.blocked_manifests}`);
  lines.push(`- Review-only valid manifests: ${report.summary.review_only_valid_manifests}`);
  lines.push(`- Failures: ${report.summary.failures}`);
  lines.push(`- Public-ready after check: ${report.summary.public_ready_after_check}`);
  lines.push('');
  lines.push('## Checks');
  lines.push('');
  report.checks.forEach((item) => lines.push(`- ${item.status}: \`${item.id}\` - ${String(item.evidence ?? '-')}`));
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
