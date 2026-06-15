#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = new Date().toISOString().slice(0, 10);
const fixturesPath = resolve(root, args.fixtures || `data/kosmo-innovation-github-worker-runtime-rollback-redaction-fixtures-${dateStamp}.json`);
const outputJson = resolve(root, args.out || `data/kosmo-innovation-github-worker-runtime-rollback-redaction-fixtures-check-${dateStamp}.json`);
const outputMd = resolve(root, args.markdown || `docs/codex/kosmo-innovation-github-worker-runtime-rollback-redaction-fixtures-check-${dateStamp}.md`);

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
      ? 'innovation_github_worker_runtime_rollback_redaction_fixtures_guard_passed'
      : 'innovation_github_worker_runtime_rollback_redaction_fixtures_guard_failed',
    policy: {
      validates_fixture_plan_only: true,
      executes_runtime_now: false,
      executes_rollback_now: false,
      reads_private_content_now: false,
      public_ready_after_check: 0
    },
    source_refs: [relative(root, fixturesPath)],
    summary: {
      fixtures_status: fixtures.status,
      checks: checks.length,
      passed: checks.length - failures.length,
      failures: failures.length,
      fixture_groups: fixtures.summary?.fixture_groups ?? null,
      public_ready_after_check: 0
    },
    checks
  };

  await mkdir(dirname(outputJson), { recursive: true });
  await mkdir(dirname(outputMd), { recursive: true });
  await writeFile(outputJson, `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(outputMd, renderMarkdown(report));

  console.log('Kosmo innovation GitHub worker runtime rollback redaction fixtures check');
  console.log(`Status: ${report.status}`);
  console.log(`Checks: ${report.summary.passed}/${report.summary.checks}`);
  console.log(`Fixture groups: ${report.summary.fixture_groups}`);
  console.log(`Failures: ${report.summary.failures}`);
  console.log(`Wrote: ${relative(root, outputMd)}`);

  if (failures.length > 0) process.exitCode = 1;
}

function buildChecks(fixtures) {
  const hardStops = (fixtures.hard_stops || []).join(' ').toLowerCase();
  const groupIds = new Set((fixtures.fixture_groups || []).map((group) => group.id));
  const redactionIds = new Set((fixtures.redaction_rules || []).map((rule) => rule.id));
  const rollbackIds = new Set((fixtures.rollback_steps || []).map((step) => step.id));
  const required = (fixtures.required_before_runtime_unblock || []).join(' ');
  return [
    check('status_ready', fixtures.status === 'innovation_github_worker_runtime_rollback_redaction_fixtures_ready', fixtures.status),
    check('policy_fixture_only', fixtures.policy?.fixture_plan_only === true && fixtures.policy?.synthetic_metadata_only === true, JSON.stringify(fixtures.policy)),
    check('policy_no_runtime_rollback', fixtures.policy?.executes_runtime_now === false && fixtures.policy?.executes_rollback_now === false, JSON.stringify(fixtures.policy)),
    check('policy_no_models_workers', fixtures.policy?.starts_models_now === false, fixtures.policy?.starts_models_now),
    check('policy_no_private_reads', fixtures.policy?.reads_private_content_now === false, fixtures.policy?.reads_private_content_now),
    check('policy_no_outputs', fixtures.policy?.writes_runtime_outputs_now === false && fixtures.policy?.writes_worker_outputs_now === false, JSON.stringify(fixtures.policy)),
    check('policy_no_copy_sensitive', fixtures.policy?.copies_secret_values_now === false && fixtures.policy?.copies_worker_output_body_now === false && fixtures.policy?.copies_github_code_or_readme_now === false, JSON.stringify(fixtures.policy)),
    check('public_ready_zero', fixtures.policy?.public_ready_after_fixtures === 0 && fixtures.summary?.public_ready_after_fixtures === 0, fixtures.summary?.public_ready_after_fixtures),
    check('fixture_groups_present', ['redacted_log_shape_fixture', 'rollback_manifest_shape_fixture', 'post_rollback_evidence_fixture'].every((id) => groupIds.has(id)), [...groupIds].join(',')),
    check('redaction_rules_present', ['private_path_redaction', 'secret_token_redaction', 'worker_output_body_redaction', 'github_source_text_redaction', 'model_prompt_redaction'].every((id) => redactionIds.has(id)), [...redactionIds].join(',')),
    check('rollback_steps_present', ['stop_runtime_processes', 'remove_generated_runtime_outputs', 'restore_pre_runtime_config', 'invalidate_unreviewed_worker_outputs', 'rerun_readiness_without_execution'].every((id) => rollbackIds.has(id)), [...rollbackIds].join(',')),
    check('rollback_steps_non_executable', (fixtures.rollback_steps || []).every((step) => step.executable_now === false && step.requires_overseer_review === true), 'rollback steps non-executable'),
    check('forbidden_fields_present', (fixtures.fixture_groups || []).every((group) => (group.forbidden_fields || []).length >= 3), 'forbidden fields per group'),
    check('required_before_runtime_unblock', required.includes('redacted_log_shape') && required.includes('rollback_manifest') && required.includes('negative_fixtures') && required.includes('separate_runtime_apply_guard'), required),
    check('runtime_zero', fixtures.summary?.runtime_executed_now === 0 && fixtures.summary?.rollback_executed_now === 0, JSON.stringify(fixtures.summary)),
    check('outputs_zero', fixtures.summary?.runtime_outputs_written_now === 0 && fixtures.summary?.worker_outputs_written_now === 0, JSON.stringify(fixtures.summary)),
    check('hard_stop_no_runtime', hardStops.includes('never execute runtime') || hardStops.includes('never executes runtime'), hardStops),
    check('hard_stop_no_models_workers', hardStops.includes('start models') && hardStops.includes('local workers'), hardStops),
    check('hard_stop_no_private', hardStops.includes('private source root') && hardStops.includes('onedrive'), hardStops),
    check('hard_stop_no_outputs', hardStops.includes('runtime outputs') && hardStops.includes('worker outputs'), hardStops),
    check('hard_stop_no_sensitive_copy', hardStops.includes('secret values') && hardStops.includes('worker output bodies') && hardStops.includes('github code'), hardStops),
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
  lines.push('# Kosmo Innovation GitHub Worker Runtime Rollback Redaction Fixtures Check');
  lines.push('');
  lines.push(`Generated: ${report.generated_at}`);
  lines.push(`Status: \`${report.status}\``);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Fixtures status: ${report.summary.fixtures_status}`);
  lines.push(`- Checks: ${report.summary.passed}/${report.summary.checks}`);
  lines.push(`- Fixture groups: ${report.summary.fixture_groups}`);
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
