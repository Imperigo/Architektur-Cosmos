#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = new Date().toISOString().slice(0, 10);
const fixturesPath = resolve(root, args.fixtures || `data/kosmo-innovation-github-worker-runtime-manifest-negative-fixtures-${dateStamp}.json`);
const outputJson = resolve(root, args.out || `data/kosmo-innovation-github-worker-runtime-manifest-negative-fixtures-check-${dateStamp}.json`);
const outputMd = resolve(root, args.markdown || `docs/codex/kosmo-innovation-github-worker-runtime-manifest-negative-fixtures-check-${dateStamp}.md`);

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const fixtures = JSON.parse(await readFile(fixturesPath, 'utf8'));
  const checks = buildChecks(fixtures);
  const failures = checks.filter((item) => item.status === 'failed');
  const report = {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    status: failures.length === 0
      ? 'innovation_github_worker_runtime_manifest_negative_fixtures_guard_passed'
      : 'innovation_github_worker_runtime_manifest_negative_fixtures_guard_failed',
    policy: {
      validates_negative_fixtures_only: true,
      reads_private_content_now: false,
      executes_runtime_now: false,
      writes_runtime_manifest_now: false,
      writes_runtime_outputs_now: false,
      public_ready_after_check: 0
    },
    source_refs: [relative(root, fixturesPath)],
    summary: {
      fixtures_status: fixtures.status,
      checks: checks.length,
      passed: checks.length - failures.length,
      failures: failures.length,
      negative_fixtures: fixtures.summary?.negative_fixtures ?? null,
      public_ready_after_check: 0
    },
    checks
  };

  await mkdir(dirname(outputJson), { recursive: true });
  await mkdir(dirname(outputMd), { recursive: true });
  await writeFile(outputJson, `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(outputMd, renderMarkdown(report));

  console.log('Kosmo innovation GitHub worker runtime manifest negative fixtures check');
  console.log(`Status: ${report.status}`);
  console.log(`Checks: ${report.summary.passed}/${report.summary.checks}`);
  console.log(`Negative fixtures: ${report.summary.negative_fixtures}`);
  console.log(`Failures: ${report.summary.failures}`);
  console.log(`Wrote: ${relative(root, outputMd)}`);

  if (failures.length > 0) process.exitCode = 1;
}

function buildChecks(fixtures) {
  const hardStops = (fixtures.hard_stops || []).join(' ').toLowerCase();
  const categories = new Set((fixtures.negative_fixtures || []).map((item) => item.category));
  const allReasons = (fixtures.negative_fixtures || []).flatMap((item) => item.expected_block_reasons || []);
  return [
    check('status_ready', [
      'innovation_github_worker_runtime_manifest_negative_fixtures_ready',
      'innovation_github_worker_runtime_manifest_negative_fixtures_needs_review'
    ].includes(fixtures.status), fixtures.status),
    check('policy_negative_only', fixtures.policy?.negative_fixtures_only === true, fixtures.policy?.negative_fixtures_only),
    check('policy_synthetic_manifest_only', fixtures.policy?.synthetic_manifest_shapes_only === true, fixtures.policy?.synthetic_manifest_shapes_only),
    check('policy_no_private_sensitive_copy', fixtures.policy?.reads_private_content_now === false && fixtures.policy?.copies_private_content_now === false && fixtures.policy?.copies_secret_values_now === false, JSON.stringify(fixtures.policy)),
    check('policy_no_worker_body_copy', fixtures.policy?.copies_worker_output_body_now === false, fixtures.policy?.copies_worker_output_body_now),
    check('policy_no_runtime_rollback_models', fixtures.policy?.executes_runtime_now === false && fixtures.policy?.executes_rollback_now === false && fixtures.policy?.starts_models_now === false, JSON.stringify(fixtures.policy)),
    check('policy_no_installs_downloads', fixtures.policy?.installs_dependencies_now === false && fixtures.policy?.downloads_models_now === false, JSON.stringify(fixtures.policy)),
    check('policy_no_writes', fixtures.policy?.writes_runtime_manifest_now === false && fixtures.policy?.writes_runtime_outputs_now === false && fixtures.policy?.writes_worker_outputs_now === false, JSON.stringify(fixtures.policy)),
    check('policy_no_public_ready', fixtures.policy?.promotes_public_ready_now === false && fixtures.policy?.public_ready_after_fixtures === 0, JSON.stringify(fixtures.policy)),
    check('fixture_count', fixtures.summary?.negative_fixtures >= 10 && (fixtures.negative_fixtures || []).length === fixtures.summary?.negative_fixtures, fixtures.summary?.negative_fixtures),
    check('expected_blocked_count', fixtures.summary?.expected_blocked === fixtures.summary?.negative_fixtures, `${fixtures.summary?.expected_blocked}/${fixtures.summary?.negative_fixtures}`),
    check('categories_present', (fixtures.required_categories || []).every((category) => categories.has(category)), [...categories].join(',')),
    check('all_fixtures_blocked', (fixtures.negative_fixtures || []).every((item) => item.expected_status === 'blocked'), 'all blocked'),
    check('all_fixtures_synthetic', (fixtures.negative_fixtures || []).every((item) => item.synthetic_only === true), 'all synthetic'),
    check('all_no_execution_writes', (fixtures.negative_fixtures || []).every((item) => item.executable_now === false && item.runtime_executed_now === false && item.rollback_executed_now === false && item.runtime_manifest_written_now === false && item.runtime_outputs_written_now === false && item.worker_outputs_written_now === false), 'no execution/writes'),
    check('all_no_copy', (fixtures.negative_fixtures || []).every((item) => item.copied_private_content_now === false && item.copied_secret_value_now === false && item.copied_worker_output_body_now === false), 'no private/secret/worker body copy'),
    check('all_public_ready_zero', (fixtures.negative_fixtures || []).every((item) => item.public_ready_after_fixture === 0), 'public ready zero'),
    check('execution_state_reasons', allReasons.includes('executable_now_true') && allReasons.includes('writes_runtime_manifest_now_true'), allReasons.join(',')),
    check('missing_guard_reasons', allReasons.includes('runtime_apply_guard_gate_missing') && allReasons.includes('overseer_review_gate_missing'), allReasons.join(',')),
    check('rollback_redaction_reasons', allReasons.includes('rollback_refs_missing') && allReasons.includes('redaction_refs_missing'), allReasons.join(',')),
    check('raw_runtime_reasons', allReasons.includes('raw_runtime_stdout_requested') && allReasons.includes('raw_runtime_stderr_requested'), allReasons.join(',')),
    check('worker_output_reasons', allReasons.includes('worker_output_body_requested') && allReasons.includes('metadata_only_false'), allReasons.join(',')),
    check('private_path_reasons', allReasons.includes('private_source_path_present') && allReasons.includes('onedrive_private_path_present'), allReasons.join(',')),
    check('secret_reasons', allReasons.includes('secret_field_present') && allReasons.includes('ssh_key_field_present'), allReasons.join(',')),
    check('side_effect_reasons', allReasons.includes('install_dependencies_phase_executable') && allReasons.includes('download_models_phase_executable') && allReasons.includes('start_model_runtime_phase_executable'), allReasons.join(',')),
    check('public_ready_reasons', allReasons.includes('public_ready_true') && allReasons.includes('public_ready_after_manifest_nonzero') && allReasons.includes('rights_state_unknown'), allReasons.join(',')),
    check('summary_zeroes', fixtures.summary?.executable_now === 0 && fixtures.summary?.runtime_executed_now === 0 && fixtures.summary?.runtime_manifest_written_now === 0 && fixtures.summary?.runtime_outputs_written_now === 0 && fixtures.summary?.worker_outputs_written_now === 0, JSON.stringify(fixtures.summary)),
    check('summary_public_ready_zero', fixtures.summary?.public_ready_after_fixtures === 0, fixtures.summary?.public_ready_after_fixtures),
    check('source_refs_cover_manifest_inputs', (fixtures.source_refs || []).some((ref) => ref.includes('runtime-batch-manifest-draft')) && (fixtures.source_refs || []).some((ref) => ref.includes('runtime-apply-guard')) && (fixtures.source_refs || []).some((ref) => ref.includes('rollback-redaction-fixtures')), (fixtures.source_refs || []).join(',')),
    check('hard_stop_no_runtime', hardStops.includes('never execute runtime') || hardStops.includes('never executes runtime'), hardStops),
    check('hard_stop_no_models_installs', hardStops.includes('start models') && hardStops.includes('install dependencies') && hardStops.includes('download models'), hardStops),
    check('hard_stop_no_private', hardStops.includes('private source root') && hardStops.includes('onedrive'), hardStops),
    check('hard_stop_no_sensitive_copy', hardStops.includes('secret values') && hardStops.includes('worker output bodies'), hardStops),
    check('hard_stop_no_writes', hardStops.includes('runtime manifests') && hardStops.includes('runtime outputs') && hardStops.includes('worker outputs'), hardStops),
    check('hard_stop_no_public', hardStops.includes('public-ready'), hardStops)
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
  lines.push('# Kosmo Innovation GitHub Worker Runtime Manifest Negative Fixtures Check');
  lines.push('');
  lines.push(`Generated: ${report.generated_at}`);
  lines.push(`Status: \`${report.status}\``);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Fixtures status: ${report.summary.fixtures_status}`);
  lines.push(`- Checks: ${report.summary.passed}/${report.summary.checks}`);
  lines.push(`- Negative fixtures: ${report.summary.negative_fixtures}`);
  lines.push(`- Failures: ${report.summary.failures}`);
  lines.push(`- Public-ready after check: ${report.summary.public_ready_after_check}`);
  lines.push('');
  lines.push('## Checks');
  lines.push('');
  report.checks.forEach((item) => {
    lines.push(`- ${item.status}: \`${item.id}\` - ${String(item.evidence ?? '-')}`);
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
