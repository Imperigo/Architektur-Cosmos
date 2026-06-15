#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = new Date().toISOString().slice(0, 10);
const fixturesPath = resolve(root, args.fixtures || `data/kosmo-innovation-github-worker-runtime-log-redaction-negative-fixtures-${dateStamp}.json`);
const outputJson = resolve(root, args.out || `data/kosmo-innovation-github-worker-runtime-log-redaction-negative-fixtures-check-${dateStamp}.json`);
const outputMd = resolve(root, args.markdown || `docs/codex/kosmo-innovation-github-worker-runtime-log-redaction-negative-fixtures-check-${dateStamp}.md`);

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const fixtures = JSON.parse(await readFile(fixturesPath, 'utf8'));
  const checks = buildChecks(fixtures);
  const failures = checks.filter((checkItem) => checkItem.status === 'failed');
  const report = {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    status: failures.length === 0
      ? 'innovation_github_worker_runtime_log_redaction_negative_fixtures_guard_passed'
      : 'innovation_github_worker_runtime_log_redaction_negative_fixtures_guard_failed',
    policy: {
      validates_negative_fixtures_only: true,
      reads_private_content_now: false,
      executes_runtime_now: false,
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

  console.log('Kosmo innovation GitHub worker runtime log redaction negative fixtures check');
  console.log(`Status: ${report.status}`);
  console.log(`Checks: ${report.summary.passed}/${report.summary.checks}`);
  console.log(`Negative fixtures: ${report.summary.negative_fixtures}`);
  console.log(`Failures: ${report.summary.failures}`);
  console.log(`Wrote: ${relative(root, outputMd)}`);

  if (failures.length > 0) process.exitCode = 1;
}

function buildChecks(fixtures) {
  const hardStops = (fixtures.hard_stops || []).join(' ').toLowerCase();
  const leakCategories = new Set((fixtures.negative_fixtures || []).map((fixture) => fixture.leak_category));
  const allReasons = (fixtures.negative_fixtures || []).flatMap((fixture) => fixture.expected_block_reasons || []);
  const requiredLeakCategories = fixtures.required_leak_categories || [];
  return [
    check('status_ready', fixtures.status === 'innovation_github_worker_runtime_log_redaction_negative_fixtures_ready', fixtures.status),
    check('policy_negative_only', fixtures.policy?.negative_fixtures_only === true, fixtures.policy?.negative_fixtures_only),
    check('policy_synthetic_log_only', fixtures.policy?.synthetic_log_shapes_only === true, fixtures.policy?.synthetic_log_shapes_only),
    check('policy_no_private_reads', fixtures.policy?.reads_private_content_now === false, fixtures.policy?.reads_private_content_now),
    check('policy_no_copy_private_sensitive', fixtures.policy?.copies_private_content_now === false && fixtures.policy?.copies_secret_values_now === false, JSON.stringify(fixtures.policy)),
    check('policy_no_copy_outputs_code', fixtures.policy?.copies_worker_output_body_now === false && fixtures.policy?.copies_github_code_or_readme_now === false, JSON.stringify(fixtures.policy)),
    check('policy_no_runtime_rollback_models', fixtures.policy?.executes_runtime_now === false && fixtures.policy?.executes_rollback_now === false && fixtures.policy?.starts_models_now === false, JSON.stringify(fixtures.policy)),
    check('policy_no_outputs_public', fixtures.policy?.writes_runtime_outputs_now === false && fixtures.policy?.writes_worker_outputs_now === false && fixtures.policy?.promotes_public_ready_now === false && fixtures.policy?.public_ready_after_fixtures === 0, JSON.stringify(fixtures.policy)),
    check('fixture_count', fixtures.summary?.negative_fixtures >= 10 && (fixtures.negative_fixtures || []).length === fixtures.summary?.negative_fixtures, fixtures.summary?.negative_fixtures),
    check('expected_blocked_count', fixtures.summary?.expected_blocked === fixtures.summary?.negative_fixtures, `${fixtures.summary?.expected_blocked}/${fixtures.summary?.negative_fixtures}`),
    check('all_fixtures_blocked', (fixtures.negative_fixtures || []).every((fixture) => fixture.expected_status === 'blocked'), 'all blocked'),
    check('all_fixtures_synthetic', (fixtures.negative_fixtures || []).every((fixture) => fixture.synthetic_only === true), 'all synthetic'),
    check('all_no_copy_execution', (fixtures.negative_fixtures || []).every((fixture) => fixture.copied_private_content_now === false && fixture.copied_secret_value_now === false && fixture.copied_worker_output_body_now === false && fixture.copied_github_code_or_readme_now === false && fixture.executed_now === false), 'no copy/execution'),
    check('required_leak_categories_present', requiredLeakCategories.every((category) => leakCategories.has(category)), [...leakCategories].join(',')),
    check('private_path_reason_present', allReasons.includes('raw_private_path_present') && allReasons.includes('raw_onedrive_path_present'), allReasons.join(',')),
    check('secret_reason_present', allReasons.includes('raw_secret_present') && allReasons.includes('ssh_private_key_marker_present'), allReasons.join(',')),
    check('worker_output_reason_present', allReasons.includes('worker_output_body_present'), allReasons.join(',')),
    check('github_text_reason_present', allReasons.includes('github_code_excerpt_present') && allReasons.includes('readme_prose_excerpt_present'), allReasons.join(',')),
    check('prompt_reason_present', allReasons.includes('private_prompt_context_present') && allReasons.includes('prompt_redaction_missing'), allReasons.join(',')),
    check('stdio_reason_present', allReasons.includes('raw_runtime_stdout_present') && allReasons.includes('raw_runtime_stderr_present'), allReasons.join(',')),
    check('public_ready_reason_present', allReasons.includes('public_ready_true') && allReasons.includes('rights_state_unknown'), allReasons.join(',')),
    check('runtime_zero', fixtures.summary?.runtime_executed_now === 0 && fixtures.summary?.rollback_executed_now === 0, JSON.stringify(fixtures.summary)),
    check('outputs_zero', fixtures.summary?.runtime_outputs_written_now === 0 && fixtures.summary?.worker_outputs_written_now === 0, JSON.stringify(fixtures.summary)),
    check('public_ready_zero', fixtures.summary?.public_ready_after_fixtures === 0, fixtures.summary?.public_ready_after_fixtures),
    check('hard_stop_no_private', hardStops.includes('private source root') && hardStops.includes('onedrive'), hardStops),
    check('hard_stop_no_sensitive_copy', hardStops.includes('secret values') && hardStops.includes('worker output bodies') && hardStops.includes('github code'), hardStops),
    check('hard_stop_no_runtime', hardStops.includes('never execute runtime') || hardStops.includes('never executes runtime'), hardStops),
    check('hard_stop_no_models_workers', hardStops.includes('never start models') || hardStops.includes('never starts models'), hardStops),
    check('hard_stop_no_outputs', hardStops.includes('runtime outputs') && hardStops.includes('worker outputs'), hardStops),
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
  lines.push('# Kosmo Innovation GitHub Worker Runtime Log Redaction Negative Fixtures Check');
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
