#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = new Date().toISOString().slice(0, 10);
const fixturesPath = resolve(root, args.fixtures || `data/kosmo-innovation-github-worker-adapter-boundary-negative-fixtures-${dateStamp}.json`);
const outputJson = resolve(root, args.out || `data/kosmo-innovation-github-worker-adapter-boundary-negative-fixtures-check-${dateStamp}.json`);
const outputMd = resolve(root, args.markdown || `docs/codex/kosmo-innovation-github-worker-adapter-boundary-negative-fixtures-check-${dateStamp}.md`);

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
      ? 'innovation_github_worker_adapter_boundary_negative_fixtures_guard_passed'
      : 'innovation_github_worker_adapter_boundary_negative_fixtures_guard_failed',
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

  console.log('Kosmo innovation GitHub worker adapter boundary negative fixtures check');
  console.log(`Status: ${report.status}`);
  console.log(`Checks: ${report.summary.passed}/${report.summary.checks}`);
  console.log(`Negative fixtures: ${report.summary.negative_fixtures}`);
  console.log(`Failures: ${report.summary.failures}`);
  console.log(`Wrote: ${relative(root, outputMd)}`);

  if (failures.length > 0) process.exitCode = 1;
}

function buildChecks(fixtures) {
  const hardStops = (fixtures.hard_stops || []).join(' ').toLowerCase();
  const categories = new Set((fixtures.negative_fixtures || []).map((fixture) => fixture.category));
  const allReasons = (fixtures.negative_fixtures || []).flatMap((fixture) => fixture.expected_block_reasons || []);
  const requiredCategories = fixtures.required_categories || [];
  return [
    check('status_ready', fixtures.status === 'innovation_github_worker_adapter_boundary_negative_fixtures_ready', fixtures.status),
    check('policy_negative_only', fixtures.policy?.negative_fixtures_only === true, fixtures.policy?.negative_fixtures_only),
    check('policy_synthetic_only', fixtures.policy?.synthetic_payloads_only === true, fixtures.policy?.synthetic_payloads_only),
    check('policy_no_private_reads', fixtures.policy?.reads_private_content_now === false, fixtures.policy?.reads_private_content_now),
    check('policy_no_code_readme_copy', fixtures.policy?.copies_github_code_now === false && fixtures.policy?.copies_readme_text_now === false, JSON.stringify(fixtures.policy)),
    check('policy_no_clone_install_download', fixtures.policy?.clones_repositories_now === false && fixtures.policy?.installs_dependencies_now === false && fixtures.policy?.downloads_models_now === false, JSON.stringify(fixtures.policy)),
    check('policy_no_run_runtime', fixtures.policy?.runs_discovered_code_now === false && fixtures.policy?.executes_local_workers_now === false && fixtures.policy?.writes_runtime_adapter_now === false, JSON.stringify(fixtures.policy)),
    check('policy_no_training_public', fixtures.policy?.promotes_training_rows_now === false && fixtures.policy?.public_ready_after_fixtures === 0, JSON.stringify(fixtures.policy)),
    check('fixture_count', fixtures.summary?.negative_fixtures >= 8 && (fixtures.negative_fixtures || []).length === fixtures.summary?.negative_fixtures, fixtures.summary?.negative_fixtures),
    check('expected_blocked_count', fixtures.summary?.expected_blocked === fixtures.summary?.negative_fixtures, `${fixtures.summary?.expected_blocked}/${fixtures.summary?.negative_fixtures}`),
    check('all_fixtures_blocked', (fixtures.negative_fixtures || []).every((fixture) => fixture.expected_status === 'blocked'), 'all blocked'),
    check('all_fixtures_synthetic', (fixtures.negative_fixtures || []).every((fixture) => fixture.synthetic_only === true), 'all synthetic'),
    check('all_no_copy_execution', (fixtures.negative_fixtures || []).every((fixture) => fixture.copied_private_content_now === false && fixture.copied_github_code_now === false && fixture.copied_readme_text_now === false && fixture.executed_now === false), 'no copy/execution'),
    check('required_categories_present', requiredCategories.every((category) => categories.has(category)), [...categories].join(',')),
    check('private_path_reason_present', allReasons.includes('private_path_detected'), allReasons.join(',')),
    check('runtime_reason_present', allReasons.includes('unexpected_executable_command') && allReasons.includes('install_dependencies'), allReasons.join(',')),
    check('copy_reason_present', allReasons.includes('copy_readme_text') && allReasons.includes('copy_github_code'), allReasons.join(',')),
    check('public_ready_reason_present', allReasons.includes('promote_public_ready'), allReasons.join(',')),
    check('training_reason_present', allReasons.includes('promote_training_row'), allReasons.join(',')),
    check('apply_guard_reason_present', allReasons.includes('missing_separate_launch_apply_guard'), allReasons.join(',')),
    check('runtime_zero', fixtures.summary?.runtime_executed_now === 0 && fixtures.summary?.adapter_files_written_now === 0 && fixtures.summary?.local_workers_executed_now === 0, JSON.stringify(fixtures.summary)),
    check('training_public_zero', fixtures.summary?.training_rows_promoted_now === 0 && fixtures.summary?.public_ready_after_fixtures === 0, JSON.stringify(fixtures.summary)),
    check('hard_stop_no_private', hardStops.includes('private source root') && hardStops.includes('onedrive'), hardStops),
    check('hard_stop_no_clone_install', hardStops.includes('never clone') || hardStops.includes('never clone repositories') || hardStops.includes('never clone repositories'), hardStops),
    check('hard_stop_no_run', hardStops.includes('never run discovered code') || hardStops.includes('never run') && hardStops.includes('local workers'), hardStops),
    check('hard_stop_no_copy', hardStops.includes('github code') && hardStops.includes('readme text'), hardStops),
    check('hard_stop_no_runtime_public', hardStops.includes('runtime adapter') && hardStops.includes('public-ready'), hardStops)
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
  lines.push('# Kosmo Innovation GitHub Worker Adapter Boundary Negative Fixtures Check');
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
