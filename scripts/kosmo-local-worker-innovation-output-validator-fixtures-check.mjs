#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = new Date().toISOString().slice(0, 10);
const fixturesPath = resolve(root, args.fixtures || `data/kosmo-local-worker-innovation-output-validator-fixtures-${dateStamp}.json`);
const outputJson = resolve(root, args.out || `data/kosmo-local-worker-innovation-output-validator-fixtures-check-${dateStamp}.json`);
const outputMd = resolve(root, args.markdown || `docs/codex/kosmo-local-worker-innovation-output-validator-fixtures-check-${dateStamp}.md`);

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const fixtures = JSON.parse(await readFile(fixturesPath, 'utf8'));
  const checks = buildChecks(fixtures);
  const failures = checks.filter((check) => check.status === 'failed');
  const report = {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    status: failures.length === 0
      ? 'local_worker_innovation_output_validator_fixtures_guard_passed'
      : 'local_worker_innovation_output_validator_fixtures_guard_failed',
    policy: {
      review_only: true,
      synthetic_fixtures_only: true,
      reads_private_content: false,
      executes_local_workers: false,
      public_ready_after_check: 0
    },
    source_refs: [relative(root, fixturesPath)],
    summary: {
      checks: checks.length,
      passed: checks.length - failures.length,
      failures: failures.length,
      positive_status: fixtures.summary?.positive_validator_status ?? null,
      negative_status: fixtures.summary?.negative_validator_status ?? null,
      public_ready_after_check: 0
    },
    checks
  };

  await mkdir(dirname(outputJson), { recursive: true });
  await mkdir(dirname(outputMd), { recursive: true });
  await writeFile(outputJson, `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(outputMd, renderMarkdown(report));

  console.log('Kosmo local worker innovation output validator fixtures check');
  console.log(`Status: ${report.status}`);
  console.log(`Checks: ${report.summary.passed}/${report.summary.checks}`);
  console.log(`Failures: ${report.summary.failures}`);
  console.log(`Wrote: ${relative(root, outputMd)}`);

  if (failures.length > 0) process.exitCode = 1;
}

function buildChecks(fixtures) {
  const scenarios = fixtures.scenarios || [];
  const positive = scenarios.find((scenario) => scenario.scenario === 'positive');
  const negative = scenarios.find((scenario) => scenario.scenario === 'negative');
  return [
    check('status_passed', fixtures.status === 'local_worker_innovation_output_validator_fixtures_passed', fixtures.status),
    check('policy_synthetic_only', fixtures.policy?.synthetic_fixtures_only === true, fixtures.policy?.synthetic_fixtures_only),
    check('policy_no_private_reads', fixtures.policy?.reads_private_content === false, fixtures.policy?.reads_private_content),
    check('policy_no_worker_execution', fixtures.policy?.executes_local_workers === false, fixtures.policy?.executes_local_workers),
    check('policy_no_model_start', fixtures.policy?.starts_models === false, fixtures.policy?.starts_models),
    check('policy_public_ready_zero', fixtures.policy?.public_ready_after_fixtures === 0, fixtures.policy?.public_ready_after_fixtures),
    check('two_scenarios', scenarios.length === 2, scenarios.length),
    check('positive_passed', positive?.validator_status === 'local_worker_innovation_output_validator_passed', positive?.validator_status),
    check('positive_no_failures', positive?.summary?.failures === 0, positive?.summary?.failures),
    check('positive_all_present', positive?.summary?.present_outputs === 5 && positive?.summary?.missing_outputs === 0, `${positive?.summary?.present_outputs}/${positive?.summary?.missing_outputs}`),
    check('negative_needs_review', negative?.validator_status === 'local_worker_innovation_output_validator_needs_review', negative?.validator_status),
    check('negative_has_failures', (negative?.summary?.failures ?? 0) > 0, negative?.summary?.failures),
    check('negative_has_forbidden_hits', (negative?.summary?.forbidden_terms_hit_count ?? 0) > 0, negative?.summary?.forbidden_terms_hit_count),
    check('fixture_public_ready_zero', fixtures.summary?.public_ready_after_fixtures === 0, fixtures.summary?.public_ready_after_fixtures)
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
  lines.push('# Kosmo Local Worker Innovation Output Validator Fixtures Check');
  lines.push('');
  lines.push(`Generated: ${report.generated_at}`);
  lines.push(`Status: \`${report.status}\``);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Checks: ${report.summary.passed}/${report.summary.checks}`);
  lines.push(`- Failures: ${report.summary.failures}`);
  lines.push(`- Positive status: ${report.summary.positive_status}`);
  lines.push(`- Negative status: ${report.summary.negative_status}`);
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
