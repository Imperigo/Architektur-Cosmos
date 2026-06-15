#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = new Date().toISOString().slice(0, 10);
const planPath = resolve(root, args.plan || `data/kosmo-tomorrow-day-batch-${dateStamp}.json`);
const outputJson = resolve(root, args.out || `data/kosmo-tomorrow-day-batch-check-${dateStamp}.json`);
const outputMd = resolve(root, args.markdown || `docs/codex/kosmo-tomorrow-day-batch-check-${dateStamp}.md`);

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const plan = JSON.parse(await readFile(planPath, 'utf8'));
  const findings = checkPlan(plan);
  const failures = findings.filter((finding) => finding.severity === 'failure');
  const report = {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    status: failures.length === 0 ? 'tomorrow_day_batch_guard_passed' : 'tomorrow_day_batch_guard_failed',
    policy: {
      validates_source_free_default: true,
      reads_private_content: false,
      installs_or_downloads: false,
      public_ready_after_check: 0
    },
    source_refs: [relative(root, planPath)],
    summary: {
      plan_status: plan.status,
      target_date: plan.target_date,
      path_b_blocks: plan.path_b_if_still_blocked?.length ?? null,
      failures: failures.length,
      public_ready_after_check: 0
    },
    findings
  };

  await mkdir(dirname(outputJson), { recursive: true });
  await mkdir(dirname(outputMd), { recursive: true });
  await writeFile(outputJson, `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(outputMd, renderMarkdown(report));

  console.log('Kosmo tomorrow day batch check');
  console.log(`Status: ${report.status}`);
  console.log(`Target date: ${report.summary.target_date}`);
  console.log(`Failures: ${report.summary.failures}`);
  console.log(`Wrote: ${relative(root, outputMd)}`);

  if (failures.length > 0) process.exitCode = 1;
}

function checkPlan(plan) {
  const findings = [];
  const startSequence = (plan.start_sequence || []).join(' ');
  const pathA = (plan.path_a_if_exact_owner_unlock_reply_present || []).join(' ');
  const pathBIds = new Set((plan.path_b_if_still_blocked || []).map((block) => block.id));
  expect(plan.schema_version === '0.1', findings, 'schema_version', 'Plan schema_version must be 0.1.');
  expect(plan.status === 'tomorrow_day_batch_ready', findings, 'plan_ready', 'Plan must be ready.');
  expect(plan.policy?.max_tick_minutes <= 2, findings, 'tick_limit', 'Plan must keep max tick at or below two minutes.');
  expect(plan.policy?.checkup_interval_minutes <= 3, findings, 'checkup_limit', 'Plan must keep checkup interval at or below three minutes.');
  expect(plan.policy?.no_idle_wait_between_tasks === true, findings, 'no_idle_wait', 'Plan must avoid idle wait between tasks.');
  expect(plan.policy?.reads_private_content_now === false, findings, 'no_private_reads', 'Plan must not read private content by default.');
  expect(plan.policy?.runs_private_inventory_now === false, findings, 'no_private_inventory', 'Plan must not run private inventory by default.');
  expect(plan.policy?.runs_ocr_now === false, findings, 'no_ocr', 'Plan must not run OCR by default.');
  expect(plan.policy?.creates_embeddings_now === false, findings, 'no_embeddings', 'Plan must not create embeddings by default.');
  expect(plan.policy?.runs_fine_tuning_now === false, findings, 'no_fine_tuning', 'Plan must not run fine-tuning by default.');
  expect(plan.policy?.executes_local_workers_now === false, findings, 'no_local_worker_execution', 'Plan must not execute local workers by default.');
  expect(plan.policy?.installs_or_downloads_now === false, findings, 'no_installs_downloads', 'Plan must not install or download by default.');
  expect(plan.policy?.public_ready_after_plan === 0, findings, 'public_ready_zero', 'Plan must keep public-ready at 0.');
  expect(startSequence.includes('innovation-github-watchlist'), findings, 'start_sequence_live_github', 'Start sequence must include live GitHub watchlist.');
  expect(startSequence.includes('innovation-github-fixture-skeletons'), findings, 'start_sequence_github_fixture_skeletons', 'Start sequence must include GitHub fixture skeletons.');
  expect(startSequence.includes('innovation-github-promotion-matrix'), findings, 'start_sequence_github_promotion_matrix', 'Start sequence must include GitHub promotion matrix.');
  expect(startSequence.includes('innovation-github-fixture-payloads'), findings, 'start_sequence_github_fixture_payloads', 'Start sequence must include GitHub fixture payloads.');
  expect(startSequence.includes('innovation-github-fixture-payload-smoke'), findings, 'start_sequence_github_fixture_payload_smoke', 'Start sequence must include GitHub fixture payload smoke.');
  expect(startSequence.includes('innovation-github-worker-integration-signal-bridge'), findings, 'start_sequence_github_worker_integration_signal_bridge', 'Start sequence must include GitHub worker integration signal bridge.');
  expect(startSequence.includes('innovation-github-worker-adapter-boundary-contract'), findings, 'start_sequence_github_worker_adapter_boundary_contract', 'Start sequence must include GitHub worker adapter boundary contract.');
  expect(startSequence.includes('innovation-github-worker-adapter-boundary-negative-fixtures'), findings, 'start_sequence_github_worker_adapter_boundary_negative_fixtures', 'Start sequence must include GitHub worker adapter boundary negative fixtures.');
  expect(startSequence.includes('innovation-github-worker-runtime-batch-readiness-plan'), findings, 'start_sequence_github_worker_runtime_batch_readiness_plan', 'Start sequence must include GitHub worker runtime batch readiness plan.');
  expect(startSequence.includes('innovation-github-worker-runtime-rollback-redaction-fixtures'), findings, 'start_sequence_github_worker_runtime_rollback_redaction_fixtures', 'Start sequence must include GitHub worker runtime rollback/redaction fixtures.');
  expect(startSequence.includes('innovation-github-worker-runtime-apply-guard'), findings, 'start_sequence_github_worker_runtime_apply_guard', 'Start sequence must include GitHub worker runtime apply guard.');
  expect(startSequence.includes('innovation-github-worker-runtime-log-redaction-negative-fixtures'), findings, 'start_sequence_github_worker_runtime_log_redaction_negative_fixtures', 'Start sequence must include GitHub worker runtime log-redaction negative fixtures.');
  expect(startSequence.includes('local-worker-fixture-chain-task-pack'), findings, 'start_sequence_local_worker_task_pack', 'Start sequence must include local worker fixture-chain task pack.');
  expect(startSequence.includes('local-worker-innovation-output-smoke'), findings, 'start_sequence_local_worker_innovation_output_smoke', 'Start sequence must include local worker innovation output smoke.');
  expect(startSequence.includes('local-worker-innovation-output-adapter-plan'), findings, 'start_sequence_local_worker_innovation_output_adapter_plan', 'Start sequence must include local worker innovation output adapter plan.');
  expect(startSequence.includes('local-worker-innovation-output-validator'), findings, 'start_sequence_local_worker_innovation_output_validator', 'Start sequence must include local worker innovation output validator.');
  expect(startSequence.includes('local-worker-innovation-output-validator-fixtures'), findings, 'start_sequence_local_worker_innovation_output_validator_fixtures', 'Start sequence must include local worker innovation output validator fixtures.');
  expect(startSequence.includes('local-worker-innovation-launch-dry-run'), findings, 'start_sequence_local_worker_innovation_launch_dry_run', 'Start sequence must include local worker innovation launch dry run.');
  expect(startSequence.includes('local-worker-innovation-launch-owner-card'), findings, 'start_sequence_local_worker_innovation_launch_owner_card', 'Start sequence must include local worker innovation launch owner card.');
  expect(startSequence.includes('local-worker-innovation-launch-apply-guard'), findings, 'start_sequence_local_worker_innovation_launch_apply_guard', 'Start sequence must include local worker innovation launch apply guard.');
  expect(startSequence.includes('local-worker-innovation-launch-apply-guard-smoke'), findings, 'start_sequence_local_worker_innovation_launch_apply_guard_smoke', 'Start sequence must include local worker innovation launch apply guard smoke.');
  expect(startSequence.includes('local-worker-innovation-launch-runbook-checkpoint'), findings, 'start_sequence_local_worker_innovation_launch_runbook_checkpoint', 'Start sequence must include local worker innovation launch runbook checkpoint.');
  expect(startSequence.includes('local-worker-innovation-launch-execution-envelope'), findings, 'start_sequence_local_worker_innovation_launch_execution_envelope', 'Start sequence must include local worker innovation launch execution envelope.');
  expect(startSequence.includes('local-worker-innovation-post-output-intake-review'), findings, 'start_sequence_local_worker_innovation_post_output_intake_review', 'Start sequence must include local worker innovation post-output intake review.');
  expect(startSequence.includes('local-worker-innovation-human-overseer-review-decision-card'), findings, 'start_sequence_local_worker_innovation_human_overseer_review_decision_card', 'Start sequence must include local worker innovation human/overseer review decision card.');
  expect(startSequence.includes('local-worker-innovation-conversion-plan-preview'), findings, 'start_sequence_local_worker_innovation_conversion_plan_preview', 'Start sequence must include local worker innovation conversion plan preview.');
  expect(startSequence.includes('local-worker-innovation-conversion-apply-guard'), findings, 'start_sequence_local_worker_innovation_conversion_apply_guard', 'Start sequence must include local worker innovation conversion apply guard.');
  expect(startSequence.includes('local-worker-innovation-conversion-evidence-ledger'), findings, 'start_sequence_local_worker_innovation_conversion_evidence_ledger', 'Start sequence must include local worker innovation conversion evidence ledger.');
  expect(startSequence.includes('codex-morning-routine-run'), findings, 'start_sequence_morning_routine_run', 'Start sequence must include Codex morning routine run.');
  expect(startSequence.includes('codex-morning-routine-run-check'), findings, 'start_sequence_morning_routine_run_check', 'Start sequence must include Codex morning routine run check.');
  expect(startSequence.includes('owner-unlock-pipeline-checkpoint'), findings, 'start_sequence_owner_checkpoint', 'Start sequence must include owner unlock checkpoint.');
  expect(pathA.includes('owner-unlock-reply-validator'), findings, 'path_a_reply_validator', 'Path A must validate owner replies.');
  expect(pathA.includes('owner-unlock-answer-dry-run'), findings, 'path_a_dry_run', 'Path A must dry-run owner replies before activation.');
  expect(pathA.includes('source-root-activation-preflight'), findings, 'path_a_preflight', 'Path A must include source-root activation preflight.');
  ['live_innovation_scout', 'guard_cleanup', 'orbit_visibility', 'owner_review_packet', 'handoff_and_push'].forEach((id) => {
    expect(pathBIds.has(id), findings, `path_b_block:${id}`, `Path B must include ${id}.`);
  });
  return findings;
}

function expect(condition, findings, id, message) {
  findings.push({ id, severity: condition ? 'passed' : 'failure', message });
}

function renderMarkdown(report) {
  const lines = [];
  lines.push('# Kosmo Tomorrow Day Batch Check');
  lines.push('');
  lines.push(`Generated: ${report.generated_at}`);
  lines.push(`Status: \`${report.status}\``);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Plan status: ${report.summary.plan_status}`);
  lines.push(`- Target date: ${report.summary.target_date}`);
  lines.push(`- Path B blocks: ${report.summary.path_b_blocks}`);
  lines.push(`- Failures: ${report.summary.failures}`);
  lines.push(`- Public-ready after check: ${report.summary.public_ready_after_check}`);
  lines.push('');
  lines.push('## Findings');
  lines.push('');
  report.findings.forEach((finding) => lines.push(`- ${finding.severity}: \`${finding.id}\` - ${finding.message}`));
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
