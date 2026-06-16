#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = new Date().toISOString().slice(0, 10);
const planPath = resolve(root, args.plan || `data/kosmo-innovation-github-worker-runtime-batch-readiness-plan-${dateStamp}.json`);
const outputJson = resolve(root, args.out || `data/kosmo-innovation-github-worker-runtime-batch-readiness-plan-check-${dateStamp}.json`);
const outputMd = resolve(root, args.markdown || `docs/codex/kosmo-innovation-github-worker-runtime-batch-readiness-plan-check-${dateStamp}.md`);

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const plan = JSON.parse(await readFile(planPath, 'utf8'));
  const checks = buildChecks(plan);
  const failures = checks.filter((checkItem) => checkItem.status === 'failed');
  const report = {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    status: failures.length === 0
      ? 'innovation_github_worker_runtime_batch_readiness_plan_guard_passed'
      : 'innovation_github_worker_runtime_batch_readiness_plan_guard_failed',
    policy: {
      validates_readiness_plan_only: true,
      executes_runtime_now: false,
      reads_private_content_now: false,
      public_ready_after_check: 0
    },
    source_refs: [relative(root, planPath)],
    summary: {
      plan_status: plan.status,
      checks: checks.length,
      passed: checks.length - failures.length,
      failures: failures.length,
      blocked_gates: plan.summary?.blocked_gates ?? null,
      public_ready_after_check: 0
    },
    checks
  };

  await mkdir(dirname(outputJson), { recursive: true });
  await mkdir(dirname(outputMd), { recursive: true });
  await writeFile(outputJson, `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(outputMd, renderMarkdown(report));

  console.log('Kosmo innovation GitHub worker runtime batch readiness plan check');
  console.log(`Status: ${report.status}`);
  console.log(`Checks: ${report.summary.passed}/${report.summary.checks}`);
  console.log(`Blocked gates: ${report.summary.blocked_gates}`);
  console.log(`Failures: ${report.summary.failures}`);
  console.log(`Wrote: ${relative(root, outputMd)}`);

  if (failures.length > 0) process.exitCode = 1;
}

function buildChecks(plan) {
  const hardStops = (plan.hard_stops || []).join(' ').toLowerCase();
  const forbidden = new Set(plan.forbidden_now || []);
  const gates = new Set((plan.gate_items || []).map((item) => item.id));
  const requirements = (plan.required_before_any_runtime_batch || []).join(' ').toLowerCase();
  return [
    check('status_ready', plan.status === 'innovation_github_worker_runtime_batch_readiness_plan_ready', plan.status),
    check('policy_readiness_only', plan.policy?.readiness_plan_only === true, plan.policy?.readiness_plan_only),
    check('policy_no_runtime', plan.policy?.executes_runtime_now === false && plan.policy?.executes_local_workers_now === false && plan.policy?.starts_models_now === false, JSON.stringify(plan.policy)),
    check('policy_no_install_download_clone', plan.policy?.installs_dependencies_now === false && plan.policy?.downloads_models_now === false && plan.policy?.clones_repositories_now === false, JSON.stringify(plan.policy)),
    check('policy_no_private_reads', plan.policy?.reads_private_content_now === false, plan.policy?.reads_private_content_now),
    check('policy_no_writes_training_public', plan.policy?.writes_runtime_adapter_now === false && plan.policy?.writes_worker_outputs_now === false && plan.policy?.promotes_training_rows_now === false && plan.policy?.public_ready_after_plan === 0, JSON.stringify(plan.policy)),
    check('gate_count', plan.summary?.readiness_gates >= 10 && (plan.gate_items || []).length === plan.summary?.readiness_gates, plan.summary?.readiness_gates),
    check('blocked_gate_count', plan.summary?.blocked_gates >= 4, plan.summary?.blocked_gates),
    check('no_executable_now', plan.summary?.runtime_executable_now === false && plan.summary?.local_workers_executable_now === false, JSON.stringify(plan.summary)),
    check('no_dependencies_or_models_now', plan.summary?.dependencies_installable_now === false && plan.summary?.models_startable_now === false, JSON.stringify(plan.summary)),
    check('no_private_inputs_now', plan.summary?.private_inputs_allowed_now === false, plan.summary?.private_inputs_allowed_now),
    check('rollback_redaction_required', plan.summary?.rollback_plan_required === true && plan.summary?.log_redaction_required === true, JSON.stringify(plan.summary)),
    check('required_gates_present', ['dependency_brief_guard', 'adapter_boundary_contract_guard', 'negative_fixture_guard', 'exact_launch_apply_reply', 'source_root_unlock', 'dependency_runtime_apply_batch', 'rollback_and_log_redaction'].every((id) => gates.has(id)), [...gates].join(',')),
    check('all_gates_non_executable', (plan.gate_items || []).every((item) => item.executable_now === false), 'all gate items non-executable'),
    check('requirements_include_owner_dependency_runtime', requirements.includes('exact owner') && requirements.includes('dependency') && requirements.includes('runtime'), requirements),
    check('requirements_include_source_model_rollback_logs', requirements.includes('source root') && requirements.includes('model') && requirements.includes('rollback') && requirements.includes('log redaction'), requirements),
    check('forbidden_runtime_actions', ['clone_repository', 'install_dependencies', 'download_models', 'start_model', 'execute_local_worker', 'read_private_source_root', 'write_runtime_adapter', 'promote_training_rows', 'mark_public_ready'].every((item) => forbidden.has(item)), [...forbidden].join(',')),
    check('hard_stop_no_runtime', hardStops.includes('never executes runtime') && hardStops.includes('local workers'), hardStops),
    check('hard_stop_no_install_download_clone', hardStops.includes('installs dependencies') && hardStops.includes('downloads models') && hardStops.includes('clones repositories'), hardStops),
    check('hard_stop_no_models', hardStops.includes('never starts models'), hardStops),
    check('hard_stop_no_private', hardStops.includes('private source root') && hardStops.includes('onedrive'), hardStops),
    check('hard_stop_no_writes', hardStops.includes('runtime adapter files') && hardStops.includes('worker outputs'), hardStops),
    check('hard_stop_no_training_public', hardStops.includes('training rows') && hardStops.includes('public-ready'), hardStops)
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
  lines.push('# Kosmo Innovation GitHub Worker Runtime Batch Readiness Plan Check');
  lines.push('');
  lines.push(`Generated: ${report.generated_at}`);
  lines.push(`Status: \`${report.status}\``);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Plan status: ${report.summary.plan_status}`);
  lines.push(`- Checks: ${report.summary.passed}/${report.summary.checks}`);
  lines.push(`- Blocked gates: ${report.summary.blocked_gates}`);
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
