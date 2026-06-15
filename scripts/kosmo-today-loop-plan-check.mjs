#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = new Date().toISOString().slice(0, 10);
const planPath = resolve(root, args.plan || `data/kosmo-today-loop-plan-${dateStamp}.json`);
const outputJson = resolve(root, args.out || `data/kosmo-today-loop-plan-check-${dateStamp}.json`);
const outputMd = resolve(root, args.markdown || `docs/codex/kosmo-today-loop-plan-check-${dateStamp}.md`);

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
    status: failures.length === 0 ? 'today_loop_plan_guard_passed' : 'today_loop_plan_guard_failed',
    policy: {
      reads_private_content: false,
      writes_public_files: false,
      writes_public_manifest: false,
      public_ready_after_check: 0,
      note: 'This guard validates the daily loop plan only. It does not execute tasks.'
    },
    source_refs: [relative(root, planPath)],
    summary: {
      plan_status: plan.status,
      execution_mode: plan.summary?.execution_mode || null,
      work_blocks: plan.work_blocks?.length ?? 0,
      tick_max_minutes: plan.loop?.tick_max_minutes ?? null,
      checkup_interval_minutes: plan.loop?.checkup_interval_minutes ?? null,
      failures: failures.length,
      public_ready_after_check: 0
    },
    findings,
    next_actions: failures.length === 0
      ? [
          'Use the plan as today loop entrypoint.',
          'Run innovation scout next, then source-free references/assets/training blocks.',
          'Refresh handoff and commit exact Codex-owned files after each coherent block.'
        ]
      : [
          'Fix today loop plan guard failures.',
          'Rerun npm run kosmo:today-loop-plan and npm run kosmo:today-loop-plan-check.'
        ]
  };

  await mkdir(dirname(outputJson), { recursive: true });
  await mkdir(dirname(outputMd), { recursive: true });
  await writeFile(outputJson, `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(outputMd, renderMarkdown(report));

  console.log('Kosmo today loop plan check');
  console.log(`Status: ${report.status}`);
  console.log(`Failures: ${report.summary.failures}`);
  console.log(`Work blocks: ${report.summary.work_blocks}`);
  console.log(`Wrote: ${relative(root, outputMd)}`);

  if (failures.length > 0) process.exitCode = 1;
}

function checkPlan(plan) {
  const findings = [];
  expect(plan.schema_version === '0.1', findings, 'schema_version', 'Plan schema_version must be 0.1.');
  expect(['today_loop_plan_ready', 'today_loop_plan_ready_with_bootstrap_warnings'].includes(plan.status), findings, 'plan_status_known', 'Plan status must be known.');
  expect(plan.policy?.max_tick_minutes <= 2, findings, 'max_tick_two_minutes', 'Max loop tick must be at most two minutes.');
  expect(plan.policy?.checkup_interval_minutes <= 3, findings, 'checkup_three_minutes', 'Checkup interval must be at most three minutes.');
  expect(plan.policy?.no_idle_wait_between_tasks === true, findings, 'no_idle_wait', 'Plan must prohibit idle waits between tasks.');
  expect(plan.policy?.starts_next_task_immediately_after_completion === true, findings, 'immediate_next_task', 'Plan must start the next task immediately after completion.');
  expect(plan.policy?.reads_private_content === false, findings, 'no_private_reads', 'Plan must not read private content.');
  expect(plan.policy?.copies_private_content === false, findings, 'no_private_copies', 'Plan must not copy private content.');
  expect(plan.policy?.runs_private_ocr === false, findings, 'no_private_ocr', 'Plan must not run private OCR.');
  expect(plan.policy?.runs_embeddings_on_private_content === false, findings, 'no_private_embeddings', 'Plan must not run embeddings on private content.');
  expect(plan.policy?.runs_fine_tuning === false, findings, 'no_fine_tuning', 'Plan must not run fine-tuning.');
  expect(plan.policy?.writes_public_files === false, findings, 'no_public_writes', 'Plan must not write public files.');
  expect(plan.policy?.writes_public_manifest === false, findings, 'no_public_manifest', 'Plan must not write public manifest.');
  expect(plan.policy?.public_ready_after_plan === 0, findings, 'public_ready_zero', 'Plan public-ready must remain 0.');
  expect(plan.loop?.until_local === `${plan.loop?.date}T18:00:00+02:00`, findings, 'loop_until_18_local', 'Loop must target 18:00 local time.');
  expect(plan.loop?.tick_max_minutes <= 2, findings, 'loop_tick_max_two', 'Loop tick max must be at most two minutes.');
  expect(plan.loop?.checkup_interval_minutes <= 3, findings, 'loop_checkup_three', 'Loop checkup interval must be at most three minutes.');
  expect(plan.summary?.data_lane_status === 'kosmodata_lane_sweep_review_only_passed', findings, 'data_lane_passed', 'Data lane should be review-only passed at plan time.');
  expect(plan.summary?.worker_boundary_guard_status === 'worker_boundary_pack_guard_passed', findings, 'worker_boundary_passed', 'Worker boundary guard should pass at plan time.');
  expect(plan.summary?.source_root_unlocked === false, findings, 'source_root_not_unlocked', 'Source Root should remain locked unless explicit owner answer exists.');
  expect((plan.work_blocks || []).length >= 5, findings, 'work_blocks_minimum', 'Plan must include at least five work blocks.');
  for (const required of ['local_worker_conversion_governance', 'innovation_scout', 'references_schema_hardening', 'asset_schema_hardening', 'training_eval_readiness', 'orbit_and_handoff']) {
    expect((plan.work_blocks || []).some((block) => block.id === required), findings, `work_block:${required}`, `Plan must include work block ${required}.`);
  }
  const conversionCommands = ((plan.work_blocks || []).find((block) => block.id === 'local_worker_conversion_governance')?.first_commands || []).join(' ');
  expect(conversionCommands.includes('local-worker-innovation-conversion-evidence-ledger'), findings, 'conversion_governance_evidence_ledger', 'Local worker conversion governance must include the evidence ledger.');
  const innovationCommands = ((plan.work_blocks || []).find((block) => block.id === 'innovation_scout')?.first_commands || []).join(' ');
  expect(innovationCommands.includes('innovation-github-fixture-skeletons'), findings, 'innovation_scout_github_fixture_skeletons', 'Innovation scout must include GitHub fixture skeletons.');
  expect(innovationCommands.includes('innovation-github-fixture-payloads'), findings, 'innovation_scout_github_fixture_payloads', 'Innovation scout must include GitHub fixture payloads.');
  expect(innovationCommands.includes('innovation-github-fixture-payload-smoke'), findings, 'innovation_scout_github_fixture_payload_smoke', 'Innovation scout must include GitHub fixture payload smoke.');
  expect(innovationCommands.includes('innovation-github-worker-integration-signal-bridge'), findings, 'innovation_scout_worker_integration_signal_bridge', 'Innovation scout must include GitHub worker integration signal bridge.');
  expect(innovationCommands.includes('innovation-github-worker-adapter-boundary-contract'), findings, 'innovation_scout_worker_adapter_boundary_contract', 'Innovation scout must include GitHub worker adapter boundary contract.');
  expect((plan.path_a_if_owner_confirms_source_root || []).some((command) => command.includes('private-metadata-inventory')), findings, 'path_a_private_metadata_after_gate', 'Path A must include gated private metadata inventory.');
  expect((plan.path_b_while_blocked || []).some((item) => item.includes('Do not scan private')), findings, 'path_b_private_scan_blocked', 'Path B must explicitly block private scans.');
  return findings;
}

function expect(condition, findings, id, message) {
  findings.push({ id, severity: condition ? 'passed' : 'failure', message });
}

function renderMarkdown(report) {
  const lines = [];
  lines.push('# Kosmo Today Loop Plan Check');
  lines.push('');
  lines.push(`Generated: ${report.generated_at}`);
  lines.push(`Status: \`${report.status}\``);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Plan status: ${report.summary.plan_status}`);
  lines.push(`- Execution mode: ${report.summary.execution_mode}`);
  lines.push(`- Work blocks: ${report.summary.work_blocks}`);
  lines.push(`- Tick max: ${report.summary.tick_max_minutes}`);
  lines.push(`- Checkup interval: ${report.summary.checkup_interval_minutes}`);
  lines.push(`- Failures: ${report.summary.failures}`);
  lines.push(`- Public-ready after check: ${report.summary.public_ready_after_check}`);
  lines.push('');
  lines.push('## Findings');
  lines.push('');
  report.findings.forEach((finding) => {
    lines.push(`- ${finding.severity}: \`${finding.id}\` - ${finding.message}`);
  });
  lines.push('');
  lines.push('## Next Actions');
  lines.push('');
  report.next_actions.forEach((action) => lines.push(`- ${action}`));
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
