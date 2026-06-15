#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = new Date().toISOString().slice(0, 10);
const adapterPlanPath = resolve(root, args.adapterPlan || `data/kosmo-local-worker-innovation-output-adapter-plan-${dateStamp}.json`);
const outputJson = resolve(root, args.out || `data/kosmo-local-worker-innovation-output-validator-fixtures-${dateStamp}.json`);
const outputMd = resolve(root, args.markdown || `docs/codex/kosmo-local-worker-innovation-output-validator-fixtures-${dateStamp}.md`);

const fixtureRoot = '/mnt/data/ArchitekturKosmos/KosmoZentrale/worker_packets/synthetic-validator-fixtures';

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const adapterPlan = JSON.parse(await readFile(adapterPlanPath, 'utf8'));
  const positive = await runFixtureScenario(adapterPlan, 'positive');
  const negative = await runFixtureScenario(adapterPlan, 'negative');
  const report = buildReport({ positive, negative });

  await mkdir(dirname(outputJson), { recursive: true });
  await mkdir(dirname(outputMd), { recursive: true });
  await writeFile(outputJson, `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(outputMd, renderMarkdown(report));

  console.log('Kosmo local worker innovation output validator fixtures');
  console.log(`Status: ${report.status}`);
  console.log(`Positive status: ${report.summary.positive_validator_status}`);
  console.log(`Negative status: ${report.summary.negative_validator_status}`);
  console.log(`Positive failures: ${report.summary.positive_failures}`);
  console.log(`Negative failures: ${report.summary.negative_failures}`);
  console.log(`Public-ready after fixtures: ${report.summary.public_ready_after_fixtures}`);
  console.log(`Wrote: ${relative(root, outputMd)}`);
}

async function runFixtureScenario(adapterPlan, scenario) {
  const scenarioRoot = `${fixtureRoot}/${scenario}`;
  const adapters = adapterPlan.adapters.map((adapter) => ({
    ...adapter,
    expected_output_path: resolve(scenarioRoot, `${safeFileName(adapter.task_id)}.review.json`)
  }));
  await mkdir(scenarioRoot, { recursive: true });
  for (const adapter of adapters) {
    const output = scenario === 'positive'
      ? buildPositiveOutput(adapter)
      : buildNegativeOutput(adapter);
    await writeFile(adapter.expected_output_path, `${JSON.stringify(output, null, 2)}\n`);
  }

  const fixturePlanPath = resolve(root, `data/kosmo-local-worker-innovation-output-validator-${scenario}-fixture-plan-${dateStamp}.json`);
  const fixturePlanCheckPath = resolve(root, `data/kosmo-local-worker-innovation-output-validator-${scenario}-fixture-plan-check-${dateStamp}.json`);
  const fixtureReportPath = resolve(root, `data/kosmo-local-worker-innovation-output-validator-${scenario}-fixture-report-${dateStamp}.json`);
  const fixtureReportMd = resolve(root, `docs/codex/kosmo-local-worker-innovation-output-validator-${scenario}-fixture-report-${dateStamp}.md`);
  const fixturePlan = {
    ...adapterPlan,
    generated_at: new Date().toISOString(),
    fixture_scenario: scenario,
    adapters
  };
  const fixturePlanCheck = {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    status: 'local_worker_innovation_output_adapter_plan_guard_passed',
    fixture_scenario: scenario,
    summary: {
      failures: 0,
      adapters: adapters.length,
      public_ready_after_check: 0
    }
  };

  await mkdir(dirname(fixturePlanPath), { recursive: true });
  await mkdir(dirname(fixtureReportMd), { recursive: true });
  await writeFile(fixturePlanPath, `${JSON.stringify(fixturePlan, null, 2)}\n`);
  await writeFile(fixturePlanCheckPath, `${JSON.stringify(fixturePlanCheck, null, 2)}\n`);

  execFileSync(process.execPath, [
    'scripts/kosmo-local-worker-innovation-output-validator.mjs',
    '--adapterPlan',
    fixturePlanPath,
    '--adapterPlanCheck',
    fixturePlanCheckPath,
    '--out',
    fixtureReportPath,
    '--markdown',
    fixtureReportMd
  ], { cwd: root, stdio: 'pipe' });

  const validatorReport = JSON.parse(await readFile(fixtureReportPath, 'utf8'));
  return {
    scenario,
    fixture_plan: relative(root, fixturePlanPath),
    fixture_plan_check: relative(root, fixturePlanCheckPath),
    validator_report: relative(root, fixtureReportPath),
    validator_markdown: relative(root, fixtureReportMd),
    validator_status: validatorReport.status,
    summary: validatorReport.summary,
    output_refs: adapters.map((adapter) => adapter.expected_output_path)
  };
}

function buildPositiveOutput(adapter) {
  return {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    task_id: adapter.task_id,
    review_status: 'review_only_synthetic_fixture_pass',
    lane: adapter.lane,
    source_repo_reference_only: true,
    used_input_refs: ['synthetic_fixture_payload_ref'],
    metadata_improvement_suggestions: [
      { id: 'field-normalization', category: 'metadata_shape', action: 'standardize optional field labels' }
    ],
    blockers: [],
    training_eval: {
      training_eval_lane: adapter.training_eval_lane,
      promoted: false
    },
    ontology_review: {
      entities: adapter.ontology_entities,
      relations: adapter.ontology_relations
    },
    policy: policyFlags(false)
  };
}

function buildNegativeOutput(adapter) {
  return {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    task_id: adapter.task_id,
    review_status: 'review_required_synthetic_fixture_failure',
    lane: adapter.lane,
    source_repo_reference_only: true,
    used_input_refs: ['synthetic_fixture_payload_ref'],
    metadata_improvement_suggestions: [
      { id: 'unsafe-public-ready', category: 'policy_violation', action: 'public_ready=true must be rejected' }
    ],
    blockers: ['synthetic_public_ready_violation'],
    training_eval: {
      training_eval_lane: 'wrong_lane',
      promoted: true
    },
    ontology_review: {
      entities: [],
      relations: []
    },
    policy: policyFlags(true)
  };
}

function policyFlags(unsafe) {
  return {
    review_only: true,
    source_free_fixture_only: true,
    reads_private_content: false,
    copies_private_content: false,
    copied_github_code: unsafe,
    copied_github_readme_text: false,
    cloned_or_executed_repo: unsafe,
    starts_models: false,
    writes_repo_outputs: false,
    writes_cloud_outputs: false,
    promotes_training_rows: unsafe,
    public_ready: unsafe
  };
}

function buildReport({ positive, negative }) {
  const failures = [];
  if (positive.validator_status !== 'local_worker_innovation_output_validator_passed') {
    failures.push(`Positive fixture did not pass: ${positive.validator_status}`);
  }
  if (positive.summary?.failures !== 0) failures.push(`Positive fixture has failures: ${positive.summary?.failures}`);
  if (negative.validator_status !== 'local_worker_innovation_output_validator_needs_review') {
    failures.push(`Negative fixture did not require review: ${negative.validator_status}`);
  }
  if ((negative.summary?.failures ?? 0) <= 0) failures.push('Negative fixture produced no failures.');

  return {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    status: failures.length === 0
      ? 'local_worker_innovation_output_validator_fixtures_passed'
      : 'local_worker_innovation_output_validator_fixtures_failed',
    policy: {
      review_only: true,
      synthetic_fixtures_only: true,
      reads_private_content: false,
      executes_local_workers: false,
      starts_models: false,
      writes_worker_packets: false,
      fixture_outputs_are_public_safe_synthetic: true,
      public_ready_after_fixtures: 0
    },
    summary: {
      positive_validator_status: positive.validator_status,
      positive_present_outputs: positive.summary?.present_outputs ?? null,
      positive_failures: positive.summary?.failures ?? null,
      negative_validator_status: negative.validator_status,
      negative_present_outputs: negative.summary?.present_outputs ?? null,
      negative_failures: negative.summary?.failures ?? null,
      negative_forbidden_hits: negative.summary?.forbidden_terms_hit_count ?? null,
      public_ready_after_fixtures: 0,
      failures: failures.length
    },
    scenarios: [positive, negative],
    failures
  };
}

function renderMarkdown(report) {
  const lines = [];
  lines.push('# Kosmo Local Worker Innovation Output Validator Fixtures');
  lines.push('');
  lines.push(`Generated: ${report.generated_at}`);
  lines.push(`Status: \`${report.status}\``);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Positive validator status: ${report.summary.positive_validator_status}`);
  lines.push(`- Positive failures: ${report.summary.positive_failures}`);
  lines.push(`- Negative validator status: ${report.summary.negative_validator_status}`);
  lines.push(`- Negative failures: ${report.summary.negative_failures}`);
  lines.push(`- Negative forbidden hits: ${report.summary.negative_forbidden_hits}`);
  lines.push(`- Public-ready after fixtures: ${report.summary.public_ready_after_fixtures}`);
  lines.push(`- Failures: ${report.summary.failures}`);
  lines.push('');
  lines.push('## Scenarios');
  lines.push('');
  lines.push('| Scenario | Status | Present | Failures | Report |');
  lines.push('| --- | --- | ---: | ---: | --- |');
  report.scenarios.forEach((scenario) => {
    lines.push(`| ${scenario.scenario} | ${scenario.validator_status} | ${scenario.summary?.present_outputs ?? '-'} | ${scenario.summary?.failures ?? '-'} | \`${scenario.validator_report}\` |`);
  });
  lines.push('');
  lines.push('## Failures');
  lines.push('');
  if (report.failures.length > 0) report.failures.forEach((failure) => lines.push(`- ${failure}`));
  else lines.push('- None.');
  lines.push('');
  return lines.join('\n');
}

function safeFileName(value) {
  return String(value).replace(/[^a-zA-Z0-9._-]+/g, '-');
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
