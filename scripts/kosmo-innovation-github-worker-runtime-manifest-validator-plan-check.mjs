#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = new Date().toISOString().slice(0, 10);
const planPath = resolve(root, args.plan || `data/kosmo-innovation-github-worker-runtime-manifest-validator-plan-${dateStamp}.json`);
const outputJson = resolve(root, args.out || `data/kosmo-innovation-github-worker-runtime-manifest-validator-plan-check-${dateStamp}.json`);
const outputMd = resolve(root, args.markdown || `docs/codex/kosmo-innovation-github-worker-runtime-manifest-validator-plan-check-${dateStamp}.md`);

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const plan = JSON.parse(await readFile(planPath, 'utf8'));
  const checks = buildChecks(plan);
  const failures = checks.filter((item) => item.status === 'failed');
  const report = {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    status: failures.length === 0
      ? 'innovation_github_worker_runtime_manifest_validator_plan_guard_passed'
      : 'innovation_github_worker_runtime_manifest_validator_plan_guard_failed',
    policy: {
      validates_plan_only: true,
      writes_validator_code_now: false,
      executes_runtime_now: false,
      public_ready_after_check: 0
    },
    source_refs: [relative(root, planPath)],
    summary: {
      plan_status: plan.status,
      checks: checks.length,
      passed: checks.length - failures.length,
      failures: failures.length,
      rules: plan.summary?.rules ?? null,
      public_ready_after_check: 0
    },
    checks
  };

  await mkdir(dirname(outputJson), { recursive: true });
  await mkdir(dirname(outputMd), { recursive: true });
  await writeFile(outputJson, `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(outputMd, renderMarkdown(report));

  console.log('Kosmo innovation GitHub worker runtime manifest validator plan check');
  console.log(`Status: ${report.status}`);
  console.log(`Checks: ${report.summary.passed}/${report.summary.checks}`);
  console.log(`Rules: ${report.summary.rules}`);
  console.log(`Failures: ${report.summary.failures}`);
  console.log(`Wrote: ${relative(root, outputMd)}`);

  if (failures.length > 0) process.exitCode = 1;
}

function buildChecks(plan) {
  const hardStops = (plan.hard_stops || []).join(' ').toLowerCase();
  const ruleIds = new Set((plan.rules || []).map((item) => item.id));
  const coveredCategories = new Set((plan.rules || []).flatMap((item) => item.fixture_categories || []));
  const requiredCategories = ['execution_state', 'missing_guard', 'raw_runtime_output', 'worker_output_body', 'private_path', 'secret', 'runtime_side_effect', 'public_ready_false_positive'];
  return [
    check('status_ready', [
      'innovation_github_worker_runtime_manifest_validator_plan_ready',
      'innovation_github_worker_runtime_manifest_validator_plan_needs_review'
    ].includes(plan.status), plan.status),
    check('policy_plan_only', plan.policy?.validator_plan_only === true, plan.policy?.validator_plan_only),
    check('policy_no_code_execution', plan.policy?.writes_validator_code_now === false && plan.policy?.executes_validator_now === false && plan.policy?.executes_runtime_now === false, JSON.stringify(plan.policy)),
    check('policy_no_models_installs_private', plan.policy?.starts_models_now === false && plan.policy?.installs_dependencies_now === false && plan.policy?.reads_private_content_now === false, JSON.stringify(plan.policy)),
    check('policy_no_manifest_outputs', plan.policy?.writes_runtime_manifest_now === false && plan.policy?.writes_runtime_outputs_now === false, JSON.stringify(plan.policy)),
    check('policy_public_ready_zero', plan.policy?.public_ready_after_plan === 0 && plan.summary?.public_ready_after_plan === 0, plan.summary?.public_ready_after_plan),
    check('rule_count', plan.summary?.rules >= 10 && (plan.rules || []).length === plan.summary?.rules, plan.summary?.rules),
    check('all_categories_covered', requiredCategories.every((category) => coveredCategories.has(category)), [...coveredCategories].join(',')),
    check('required_rules_present', ['block_executable_manifest', 'require_runtime_apply_guard', 'require_rollback_redaction_refs', 'block_raw_runtime_outputs', 'block_worker_output_body', 'block_private_paths', 'block_secret_fields', 'block_runtime_side_effects', 'require_overseer_review_gate', 'block_public_ready_promotion'].every((id) => ruleIds.has(id)), [...ruleIds].join(',')),
    check('all_rules_required_before_runtime', (plan.rules || []).every((item) => item.required_before_runtime === true), 'all required before runtime'),
    check('all_rules_not_executable', (plan.rules || []).every((item) => item.executable_now === false), 'all not executable'),
    check('all_rules_public_ready_zero', (plan.rules || []).every((item) => item.public_ready_after_rule === 0), 'all public-ready zero'),
    check('implementation_requirements_present', (plan.implementation_requirements || []).length >= 5, (plan.implementation_requirements || []).length),
    check('summary_zeroes', plan.summary?.executable_now === 0 && plan.summary?.validator_code_written_now === 0 && plan.summary?.runtime_executed_now === 0, JSON.stringify(plan.summary)),
    check('source_refs_cover_inputs', (plan.source_refs || []).some((ref) => ref.includes('runtime-batch-manifest-draft')) && (plan.source_refs || []).some((ref) => ref.includes('runtime-manifest-negative-fixtures')), (plan.source_refs || []).join(',')),
    check('hard_stop_no_code', hardStops.includes('never writes validator code'), hardStops),
    check('hard_stop_no_runtime', hardStops.includes('never executes runtime'), hardStops),
    check('hard_stop_no_private', hardStops.includes('private source root') && hardStops.includes('onedrive'), hardStops),
    check('hard_stop_no_outputs', hardStops.includes('runtime manifests') && hardStops.includes('runtime outputs'), hardStops),
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
  lines.push('# Kosmo Innovation GitHub Worker Runtime Manifest Validator Plan Check');
  lines.push('');
  lines.push(`Generated: ${report.generated_at}`);
  lines.push(`Status: \`${report.status}\``);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Plan status: ${report.summary.plan_status}`);
  lines.push(`- Checks: ${report.summary.passed}/${report.summary.checks}`);
  lines.push(`- Rules: ${report.summary.rules}`);
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
