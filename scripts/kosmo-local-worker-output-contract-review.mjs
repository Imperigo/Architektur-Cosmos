#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = new Date().toISOString().slice(0, 10);

const outputReviewPath = resolve(root, args.outputReview || `data/kosmo-local-worker-output-review-${dateStamp}.json`);
const conversionPlanPath = resolve(root, args.conversionPlan || `data/kosmo-local-worker-output-conversion-plan-${dateStamp}.json`);
const runbookPath = resolve(root, args.runbook || `data/kosmo-local-worker-execution-runbook-${dateStamp}.json`);
const runbookCheckPath = resolve(root, args.runbookCheck || `data/kosmo-local-worker-execution-runbook-check-${dateStamp}.json`);
const outputJson = resolve(root, args.out || `data/kosmo-local-worker-output-contract-review-${dateStamp}.json`);
const outputMd = resolve(root, args.markdown || `docs/codex/kosmo-local-worker-output-contract-review-${dateStamp}.md`);

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const outputReview = await readJson(outputReviewPath);
  const conversionPlan = await readJson(conversionPlanPath);
  const runbook = await readJson(runbookPath);
  const runbookCheck = await readJson(runbookCheckPath);
  const report = buildReport({ outputReview, conversionPlan, runbook, runbookCheck });

  await mkdir(dirname(outputJson), { recursive: true });
  await mkdir(dirname(outputMd), { recursive: true });
  await writeFile(outputJson, `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(outputMd, renderMarkdown(report));

  console.log('Kosmo local worker output contract review');
  console.log(`Status: ${report.status}`);
  console.log(`Contracts: ${report.summary.contracts}`);
  console.log(`Present valid: ${report.summary.present_valid_outputs}`);
  console.log(`Repo conversion now: ${report.summary.repo_conversion_allowed_now}`);
  console.log(`Failures: ${report.summary.failures}`);
  console.log(`Public-ready after review: ${report.summary.public_ready_after_review}`);
  console.log(`Wrote: ${relative(root, outputMd)}`);

  if (report.failures.length > 0) process.exitCode = 1;
}

function buildReport({ outputReview, conversionPlan, runbook, runbookCheck }) {
  const failures = [];
  if (outputReview.status !== 'local_worker_outputs_present_review_only') failures.push(`Output review not review-only present: ${outputReview.status}`);
  if (conversionPlan.status !== 'local_worker_output_conversion_plan_review_only') failures.push(`Conversion plan not review-only: ${conversionPlan.status}`);
  if (runbook.status !== 'local_worker_execution_runbook_idle_review_only') failures.push(`Runbook not idle review-only: ${runbook.status}`);
  if (runbookCheck.status !== 'local_worker_execution_runbook_guard_passed') failures.push(`Runbook check not passed: ${runbookCheck.status}`);

  const tasks = runbook.tasks || [];
  const contracts = tasks.map((task) => ({
    task_id: task.task_id,
    lane: task.lane,
    output_status: task.output_status,
    runner_safe: task.runner_safe === true,
    execution_decision: task.execution_decision,
    contract_state: contractStateFor(task),
    repo_conversion_allowed_now: false,
    public_ready_after_contract: 0,
    reads_private_output_body: false,
    copies_private_output_body: false,
    executes_local_worker_now: false,
    required_next_gate: nextGateFor(task)
  }));

  if (contracts.some((contract) => contract.public_ready_after_contract !== 0 || contract.repo_conversion_allowed_now)) {
    failures.push('Contracts must not allow repo conversion or public-ready.');
  }
  if (contracts.some((contract) => contract.reads_private_output_body || contract.copies_private_output_body || contract.executes_local_worker_now)) {
    failures.push('Contracts must not read/copy private output bodies or execute workers.');
  }

  return {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    status: failures.length === 0
      ? 'local_worker_output_contract_review_ready'
      : 'local_worker_output_contract_review_needs_review',
    policy: {
      review_only: true,
      reads_private_output_bodies: false,
      copies_private_output_bodies: false,
      executes_local_workers: false,
      writes_repo_outputs: false,
      writes_public_files: false,
      public_ready_after_review: 0,
      note: 'This review validates output contracts from existing reports only. It does not open private worker output files.'
    },
    source_refs: [
      relative(root, outputReviewPath),
      relative(root, conversionPlanPath),
      relative(root, runbookPath),
      relative(root, runbookCheckPath)
    ],
    summary: {
      output_review_status: outputReview.status,
      conversion_plan_status: conversionPlan.status,
      runbook_status: runbook.status,
      runbook_check_status: runbookCheck.status,
      contracts: contracts.length,
      present_valid_outputs: outputReview.summary?.present_outputs ?? null,
      invalid_json_outputs: outputReview.summary?.invalid_json_outputs ?? null,
      high_risk_hits: outputReview.summary?.high_risk_hits ?? null,
      eligible_for_manual_metadata_review: conversionPlan.summary?.eligible_for_manual_metadata_review ?? null,
      repo_conversion_allowed_now: conversionPlan.summary?.repo_conversion_allowed_now ?? null,
      execute_allowed_now: runbook.summary?.execute_allowed_if_output_missing ?? null,
      blocked_by_private_context: runbook.summary?.blocked_by_private_context ?? null,
      failures: failures.length,
      public_ready_after_review: 0
    },
    contracts,
    hard_stops: [
      'Do not open private worker output bodies from this review.',
      'Do not convert worker outputs into repo data automatically.',
      'Do not execute local workers while execute_allowed_now is 0.',
      'Do not set public-ready from local worker outputs.',
      'Keep manual metadata review as the next gate.'
    ],
    failures
  };
}

function contractStateFor(task) {
  if (task.output_status === 'present' && task.execution_decision === 'do_not_execute_output_present') return 'present_hold_manual_metadata_review';
  if (task.output_status === 'missing' && task.execution_decision === 'execute_allowed_if_output_missing') return 'missing_runner_safe_if_requested';
  if ((task.blockers || []).length > 0) return 'blocked_by_contract';
  return 'review_required';
}

function nextGateFor(task) {
  if ((task.blockers || []).includes('private_context_paths')) return 'owner_or_overseer_private_context_review';
  if (task.output_status === 'present') return 'manual_metadata_review_without_body_copy';
  return 'runner_preflight_before_execute';
}

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

function renderMarkdown(report) {
  const lines = [];
  lines.push('# Kosmo Local Worker Output Contract Review');
  lines.push('');
  lines.push(`Generated: ${report.generated_at}`);
  lines.push(`Status: \`${report.status}\``);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Output review: ${report.summary.output_review_status}`);
  lines.push(`- Conversion plan: ${report.summary.conversion_plan_status}`);
  lines.push(`- Runbook: ${report.summary.runbook_status}`);
  lines.push(`- Runbook check: ${report.summary.runbook_check_status}`);
  lines.push(`- Contracts: ${report.summary.contracts}`);
  lines.push(`- Present valid outputs: ${report.summary.present_valid_outputs}`);
  lines.push(`- Invalid JSON outputs: ${report.summary.invalid_json_outputs}`);
  lines.push(`- High-risk hits: ${report.summary.high_risk_hits}`);
  lines.push(`- Eligible for manual metadata review: ${report.summary.eligible_for_manual_metadata_review}`);
  lines.push(`- Repo conversion allowed now: ${report.summary.repo_conversion_allowed_now}`);
  lines.push(`- Execute allowed now: ${report.summary.execute_allowed_now}`);
  lines.push(`- Blocked by private context: ${report.summary.blocked_by_private_context}`);
  lines.push(`- Failures: ${report.summary.failures}`);
  lines.push(`- Public-ready after review: ${report.summary.public_ready_after_review}`);
  lines.push('');
  lines.push('## Contracts');
  lines.push('');
  lines.push('| Task | Lane | Output | Runner safe | Decision | Contract state | Next gate |');
  lines.push('| --- | --- | --- | --- | --- | --- | --- |');
  report.contracts.forEach((contract) => {
    lines.push(`| \`${contract.task_id}\` | ${contract.lane} | ${contract.output_status} | ${contract.runner_safe ? 'yes' : 'no'} | ${contract.execution_decision} | ${contract.contract_state} | ${contract.required_next_gate} |`);
  });
  lines.push('');
  lines.push('## Hard Stops');
  lines.push('');
  report.hard_stops.forEach((item) => lines.push(`- ${item}`));
  lines.push('');
  lines.push('## Failures');
  lines.push('');
  if (report.failures.length > 0) report.failures.forEach((failure) => lines.push(`- ${failure}`));
  else lines.push('- None.');
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
