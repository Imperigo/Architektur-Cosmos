#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = new Date().toISOString().slice(0, 10);

const refs = {
  dependencyBrief: resolve(root, args.dependencyBrief || `data/kosmo-dependency-install-batch-brief-${dateStamp}.json`),
  dependencyBriefCheck: resolve(root, args.dependencyBriefCheck || `data/kosmo-dependency-install-batch-brief-check-${dateStamp}.json`),
  launchApplyGuard: resolve(root, args.launchApplyGuard || `data/kosmo-local-worker-innovation-launch-apply-guard-${dateStamp}.json`),
  launchApplyGuardCheck: resolve(root, args.launchApplyGuardCheck || `data/kosmo-local-worker-innovation-launch-apply-guard-check-${dateStamp}.json`),
  executionEnvelope: resolve(root, args.executionEnvelope || `data/kosmo-local-worker-innovation-launch-execution-envelope-${dateStamp}.json`),
  executionEnvelopeCheck: resolve(root, args.executionEnvelopeCheck || `data/kosmo-local-worker-innovation-launch-execution-envelope-check-${dateStamp}.json`),
  boundaryContract: resolve(root, args.boundaryContract || `data/kosmo-innovation-github-worker-adapter-boundary-contract-${dateStamp}.json`),
  boundaryContractCheck: resolve(root, args.boundaryContractCheck || `data/kosmo-innovation-github-worker-adapter-boundary-contract-check-${dateStamp}.json`),
  negativeFixtures: resolve(root, args.negativeFixtures || `data/kosmo-innovation-github-worker-adapter-boundary-negative-fixtures-${dateStamp}.json`),
  negativeFixturesCheck: resolve(root, args.negativeFixturesCheck || `data/kosmo-innovation-github-worker-adapter-boundary-negative-fixtures-check-${dateStamp}.json`),
  sourceRootBlocker: resolve(root, args.sourceRootBlocker || `data/kosmo-source-root-blocker-refresh-${dateStamp}.json`),
  ownerCheckpoint: resolve(root, args.ownerCheckpoint || `data/kosmo-owner-unlock-pipeline-checkpoint-${dateStamp}.json`)
};

const outputJson = resolve(root, args.out || `data/kosmo-innovation-github-worker-runtime-batch-readiness-plan-${dateStamp}.json`);
const outputMd = resolve(root, args.markdown || `docs/codex/kosmo-innovation-github-worker-runtime-batch-readiness-plan-${dateStamp}.md`);

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const reports = {};
  for (const [key, path] of Object.entries(refs)) reports[key] = await readJson(path);
  const plan = buildPlan(reports);

  await mkdir(dirname(outputJson), { recursive: true });
  await mkdir(dirname(outputMd), { recursive: true });
  await writeFile(outputJson, `${JSON.stringify(plan, null, 2)}\n`);
  await writeFile(outputMd, renderMarkdown(plan));

  console.log('Kosmo innovation GitHub worker runtime batch readiness plan');
  console.log(`Status: ${plan.status}`);
  console.log(`Readiness gates: ${plan.summary.readiness_gates}`);
  console.log(`Blocked gates: ${plan.summary.blocked_gates}`);
  console.log(`Runtime executable now: ${plan.summary.runtime_executable_now}`);
  console.log(`Public-ready after plan: ${plan.summary.public_ready_after_plan}`);
  console.log(`Wrote: ${relative(root, outputMd)}`);
}

function buildPlan(reports) {
  const failures = [];
  if (reports.dependencyBrief.status !== 'dependency_install_batch_brief_ready') failures.push(`Dependency brief not ready: ${reports.dependencyBrief.status}`);
  if (reports.dependencyBriefCheck.status !== 'dependency_install_batch_brief_guard_passed') failures.push(`Dependency brief check not passed: ${reports.dependencyBriefCheck.status}`);
  if (reports.boundaryContract.status !== 'innovation_github_worker_adapter_boundary_contract_ready') failures.push(`Boundary contract not ready: ${reports.boundaryContract.status}`);
  if (reports.negativeFixtures.status !== 'innovation_github_worker_adapter_boundary_negative_fixtures_ready') failures.push(`Negative fixtures not ready: ${reports.negativeFixtures.status}`);

  const gateItems = [
    gate('dependency_brief_guard', reports.dependencyBriefCheck.status === 'dependency_install_batch_brief_guard_passed', 'Dependency install/download decision brief is reviewed but not executable.'),
    gate('adapter_boundary_contract_guard', reports.boundaryContractCheck.status === 'innovation_github_worker_adapter_boundary_contract_guard_passed', 'Adapter boundary contract is review-only ready.'),
    gate('negative_fixture_guard', reports.negativeFixturesCheck.status === 'innovation_github_worker_adapter_boundary_negative_fixtures_guard_passed', 'Negative fixtures block private/runtime/copy/public-ready false positives.'),
    gate('execution_envelope_guard', reports.executionEnvelopeCheck.status === 'local_worker_innovation_launch_execution_envelope_guard_passed', 'Execution envelope exists but is empty and held.'),
    gate('exact_launch_apply_reply', reports.launchApplyGuard.summary?.separate_launch_allowed_after_guard === true, 'Exact launch apply reply required before local worker execution.'),
    gate('source_root_unlock', reports.sourceRootBlocker.summary?.private_diagnostic_allowed === true, 'Source Root must be explicitly unlocked before private inputs.'),
    gate('owner_checkpoint_path_a', reports.ownerCheckpoint.summary?.path_a_ready_after_exact_owner_reply === true, 'Path A is structurally ready after exact owner reply.'),
    gate('dependency_runtime_apply_batch', false, 'Separate owner-approved dependency/runtime apply batch is still required.'),
    gate('model_runtime_gate', false, 'Model/runtime start gate must be explicit and separately reversible.'),
    gate('rollback_and_log_redaction', false, 'Rollback plan and log redaction proof must exist before runtime.')
  ];

  const blockedGates = gateItems.filter((item) => item.state === 'blocked').length;
  const readyGates = gateItems.filter((item) => item.state === 'ready').length;

  return {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    status: failures.length === 0
      ? 'innovation_github_worker_runtime_batch_readiness_plan_ready'
      : 'innovation_github_worker_runtime_batch_readiness_plan_needs_review',
    policy: {
      readiness_plan_only: true,
      executes_runtime_now: false,
      executes_local_workers_now: false,
      starts_models_now: false,
      installs_dependencies_now: false,
      downloads_models_now: false,
      clones_repositories_now: false,
      reads_private_content_now: false,
      writes_runtime_adapter_now: false,
      writes_worker_outputs_now: false,
      promotes_training_rows_now: false,
      public_ready_after_plan: 0
    },
    source_refs: Object.values(refs).map((path) => relative(root, path)),
    summary: {
      selected_fixture_id: reports.boundaryContract.summary?.selected_fixture_id || null,
      readiness_gates: gateItems.length,
      ready_gates: readyGates,
      blocked_gates: blockedGates,
      runtime_executable_now: false,
      dependencies_installable_now: false,
      models_startable_now: false,
      private_inputs_allowed_now: false,
      local_workers_executable_now: false,
      rollback_plan_required: true,
      log_redaction_required: true,
      public_ready_after_plan: 0,
      failures: failures.length
    },
    gate_items: gateItems,
    required_before_any_runtime_batch: [
      'exact owner launch apply reply validated',
      'separate dependency/runtime apply batch approved',
      'runtime adapter implementation reviewed separately',
      'Source Root gate passed before any private input',
      'model/runtime root confirmed',
      'rollback plan written and checked',
      'log redaction proof written and checked',
      'negative fixtures still guard private/runtime/copy/public-ready cases'
    ],
    forbidden_now: [
      'clone_repository',
      'install_dependencies',
      'download_models',
      'start_model',
      'execute_local_worker',
      'read_private_source_root',
      'write_runtime_adapter',
      'write_worker_outputs',
      'promote_training_rows',
      'mark_public_ready'
    ],
    next_actions: [
      'Prepare rollback/log-redaction fixture plans as source-free review artifacts.',
      'Keep runtime batch blocked until exact owner apply and dependency/runtime batch review exist.',
      'Do not convert this readiness plan into execution.'
    ],
    hard_stops: [
      'This readiness plan never executes runtime, local workers or discovered code.',
      'This readiness plan never installs dependencies, downloads models or clones repositories.',
      'This readiness plan never starts models.',
      'This readiness plan never reads private Source Root, OneDrive or archive-library content.',
      'This readiness plan never writes runtime adapter files or worker outputs.',
      'This readiness plan never promotes training rows or public-ready state.'
    ],
    failures
  };
}

function gate(id, condition, description) {
  return {
    id,
    state: condition ? 'ready' : 'blocked',
    description,
    executable_now: false
  };
}

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

function renderMarkdown(plan) {
  const lines = [];
  lines.push('# Kosmo Innovation GitHub Worker Runtime Batch Readiness Plan');
  lines.push('');
  lines.push(`Generated: ${plan.generated_at}`);
  lines.push(`Status: \`${plan.status}\``);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Selected fixture: \`${plan.summary.selected_fixture_id}\``);
  lines.push(`- Readiness gates: ${plan.summary.readiness_gates}`);
  lines.push(`- Ready gates: ${plan.summary.ready_gates}`);
  lines.push(`- Blocked gates: ${plan.summary.blocked_gates}`);
  lines.push(`- Runtime executable now: ${plan.summary.runtime_executable_now ? 'yes' : 'no'}`);
  lines.push(`- Dependencies installable now: ${plan.summary.dependencies_installable_now ? 'yes' : 'no'}`);
  lines.push(`- Private inputs allowed now: ${plan.summary.private_inputs_allowed_now ? 'yes' : 'no'}`);
  lines.push(`- Public-ready after plan: ${plan.summary.public_ready_after_plan}`);
  lines.push(`- Failures: ${plan.summary.failures}`);
  lines.push('');
  lines.push('## Gate Items');
  lines.push('');
  plan.gate_items.forEach((item) => {
    lines.push(`- \`${item.id}\`: ${item.state} - ${item.description}`);
  });
  lines.push('');
  lines.push('## Required Before Any Runtime Batch');
  lines.push('');
  plan.required_before_any_runtime_batch.forEach((item) => lines.push(`- ${item}`));
  lines.push('');
  lines.push('## Hard Stops');
  lines.push('');
  plan.hard_stops.forEach((stop) => lines.push(`- ${stop}`));
  lines.push('');
  if (plan.failures.length > 0) {
    lines.push('## Failures');
    lines.push('');
    plan.failures.forEach((failure) => lines.push(`- ${failure}`));
    lines.push('');
  }
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
