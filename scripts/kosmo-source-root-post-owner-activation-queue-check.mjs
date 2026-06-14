#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = new Date().toISOString().slice(0, 10);
const queuePath = resolve(root, args.queue || `data/kosmo-source-root-post-owner-activation-queue-${dateStamp}.json`);
const outputJson = resolve(root, args.out || `data/kosmo-source-root-post-owner-activation-queue-check-${dateStamp}.json`);
const outputMd = resolve(root, args.markdown || `docs/codex/kosmo-source-root-post-owner-activation-queue-check-${dateStamp}.md`);

const expectedStepIds = [
  'record_owner_decision',
  'decision_session_check',
  'blocker_refresh',
  'activation_preflight',
  'private_metadata_inventory',
  'private_metadata_inventory_check',
  'day_batch_loop'
];

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const queue = JSON.parse(await readFile(queuePath, 'utf8'));
  const findings = [
    ...checkPolicy(queue),
    ...checkSummary(queue),
    ...checkSteps(queue),
    ...checkHardStops(queue)
  ];
  const failures = findings.filter((finding) => finding.severity === 'failure');
  const warnings = findings.filter((finding) => finding.severity === 'warning');
  const report = {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    status: failures.length === 0
      ? 'source_root_post_owner_activation_queue_guard_passed'
      : 'source_root_post_owner_activation_queue_guard_failed',
    policy: {
      validates_queue_only: true,
      records_decisions: false,
      mutates_decision_session: false,
      reads_private_content: false,
      copies_private_content: false,
      runs_private_inventory_now: false,
      executes_commands: false,
      writes_public_files: false,
      writes_public_manifest: false,
      public_ready_after_check: 0,
      note: 'This guard validates the post-owner activation queue. It does not execute queue steps or inspect private sources.'
    },
    source_refs: [relative(root, queuePath)],
    summary: {
      queue_status: queue.status,
      activation_status: queue.summary?.activation_status ?? null,
      activation_ready: queue.summary?.activation_ready ?? null,
      decision_still_pending: queue.summary?.decision_still_pending ?? null,
      queue_steps: queue.summary?.queue_steps ?? null,
      executable_now: queue.summary?.executable_now ?? null,
      blocked_now: queue.summary?.blocked_now ?? null,
      failures: failures.length,
      warnings: warnings.length,
      public_ready_after_check: 0
    },
    findings,
    next_actions: failures.length === 0
      ? [
          'Use the queue as the only safe post-owner source-root activation order.',
          'Keep all queue steps blocked until an explicit owner-confirmed source-root decision is recorded.',
          'Rerun this guard after changing queue policy, step order or activation preflight logic.'
        ]
      : [
          'Fix queue policy, step order or public-ready failures before using the post-owner queue.',
          'Rerun npm run kosmo:source-root-post-owner-activation-queue and this guard.'
        ]
  };

  await mkdir(dirname(outputJson), { recursive: true });
  await mkdir(dirname(outputMd), { recursive: true });
  await writeFile(outputJson, `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(outputMd, renderMarkdown(report));

  console.log('Kosmo source-root post-owner activation queue check');
  console.log(`Status: ${report.status}`);
  console.log(`Queue: ${report.summary.queue_status}`);
  console.log(`Steps: ${report.summary.queue_steps}`);
  console.log(`Executable now: ${report.summary.executable_now}`);
  console.log(`Blocked now: ${report.summary.blocked_now}`);
  console.log(`Failures: ${report.summary.failures}`);
  console.log(`Warnings: ${report.summary.warnings}`);
  console.log(`Wrote: ${relative(root, outputMd)}`);

  if (failures.length > 0) process.exitCode = 1;
}

function checkPolicy(queue) {
  const findings = [];
  expect(queue.status === 'source_root_post_owner_activation_queue_ready', findings, 'queue_ready', 'Queue status must be ready.');
  expect(queue.policy?.queue_only === true, findings, 'queue_only_true', 'Queue must be queue-only.');
  expect(queue.policy?.records_decisions === false, findings, 'records_decisions_false', 'Queue must not record decisions.');
  expect(queue.policy?.mutates_decision_session === false, findings, 'mutates_decision_session_false', 'Queue must not mutate the decision session.');
  expect(queue.policy?.reads_private_content === false, findings, 'reads_private_content_false', 'Queue must not read private content.');
  expect(queue.policy?.copies_private_content === false, findings, 'copies_private_content_false', 'Queue must not copy private content.');
  expect(queue.policy?.runs_private_inventory_now === false, findings, 'runs_private_inventory_now_false', 'Queue must not run private inventory now.');
  expect(queue.policy?.writes_public_files === false, findings, 'writes_public_files_false', 'Queue must not write public files.');
  expect(queue.policy?.writes_public_manifest === false, findings, 'writes_public_manifest_false', 'Queue must not write public manifests.');
  expect(queue.policy?.public_ready_after_queue === 0, findings, 'queue_public_ready_zero', 'Queue public-ready after queue must be 0.');
  expect(queue.summary?.public_ready_after_queue === 0, findings, 'summary_public_ready_zero', 'Queue summary public-ready must be 0.');
  return findings;
}

function checkSummary(queue) {
  const findings = [];
  const steps = queue.queue_steps || [];
  const executable = steps.filter((step) => step.executable_now === true).length;
  const blocked = steps.filter((step) => step.executable_now !== true).length;
  expect(queue.summary?.queue_steps === steps.length, findings, 'queue_step_count_matches', 'Summary queue_steps must match step rows.');
  expect(queue.summary?.executable_now === executable, findings, 'executable_count_matches', 'Summary executable_now must match step rows.');
  expect(queue.summary?.blocked_now === blocked, findings, 'blocked_count_matches', 'Summary blocked_now must match step rows.');
  expect(queue.summary?.failures === 0, findings, 'queue_internal_failures_zero', 'Queue internal failures must be 0.');
  if (queue.summary?.decision_still_pending === true) {
    expect(queue.summary?.activation_ready === false, findings, 'pending_activation_not_ready', 'Pending decision must not be activation-ready.');
    expect(queue.summary?.executable_now === 0, findings, 'pending_executable_zero', 'Pending decision must keep executable_now at 0.');
    expect(queue.summary?.blocked_now === steps.length, findings, 'pending_all_blocked', 'Pending decision must keep all queue steps blocked.');
  }
  return findings;
}

function checkSteps(queue) {
  const findings = [];
  const steps = queue.queue_steps || [];
  expect(Array.isArray(queue.queue_steps), findings, 'queue_steps_array', 'Queue steps must be an array.');
  expect(steps.length === expectedStepIds.length, findings, 'expected_step_count', 'Queue must contain the expected seven steps.');
  expectedStepIds.forEach((id, index) => {
    expect(steps[index]?.id === id, findings, `step_order:${id}`, `Step ${index + 1} must be ${id}.`);
  });
  for (const step of steps) {
    expect(Boolean(step.phase), findings, `step_phase:${step.id}`, `${step.id} must include a phase.`);
    expect(Boolean(step.command), findings, `step_command:${step.id}`, `${step.id} must include a command.`);
    expect(Array.isArray(step.requires), findings, `step_requires:${step.id}`, `${step.id} must include requires array.`);
    if (step.executable_now === true) {
      expect(step.blocked_reason === null, findings, `step_executable_no_blocker:${step.id}`, `${step.id} cannot be executable while blocked_reason is set.`);
    } else {
      expect(Boolean(step.blocked_reason), findings, `step_blocked_reason:${step.id}`, `${step.id} must explain why it is blocked.`);
    }
    expect(isSafeQueueCommand(step.command), findings, `step_safe_command:${step.id}`, `${step.id} command must stay in the safe queue command set.`);
    if (step.id === 'private_metadata_inventory') {
      expect(
        step.executable_now === (queue.summary?.activation_ready === true),
        findings,
        'private_inventory_executable_matches_activation',
        'Private metadata inventory may be executable only when activation_ready is true.'
      );
    }
  }
  return findings;
}

function checkHardStops(queue) {
  const findings = [];
  const hardStops = queue.hard_stops || [];
  const joined = hardStops.join(' ').toLowerCase();
  expect(hardStops.length >= 4, findings, 'hard_stops_present', 'Queue must include hard stops.');
  expect(joined.includes('ocr') && joined.includes('pdf'), findings, 'hard_stop_no_ocr_pdf', 'Hard stops must block private OCR/PDF extraction.');
  expect(joined.includes('git'), findings, 'hard_stop_no_private_git_copy', 'Hard stops must block copying private files into Git.');
  expect(joined.includes('local llm'), findings, 'hard_stop_no_local_llm_private', 'Hard stops must block local LLM private-content work before activation.');
  expect(joined.includes('public-ready'), findings, 'hard_stop_public_ready', 'Hard stops must keep public-ready blocked.');
  return findings;
}

function isSafeQueueCommand(command) {
  const value = String(command || '');
  if (/(^|\s)(rm|mv|cp|rsync|curl|wget|scp|ssh|git|python|node)(\s|$)/i.test(value)) return false;
  if (/ocr|pdf-text|full_text|extract|upload|publish|public-ready/i.test(value)) return false;
  return value.startsWith('npm run kosmo:') || value.startsWith('edit examples/kosmo-references/provenance/');
}

function expect(condition, findings, id, message) {
  findings.push({
    id,
    severity: condition ? 'passed' : 'failure',
    message
  });
}

function renderMarkdown(report) {
  const lines = [];
  lines.push('# Kosmo Source-Root Post-Owner Activation Queue Check');
  lines.push('');
  lines.push(`Generated: ${report.generated_at}`);
  lines.push(`Status: \`${report.status}\``);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Queue status: ${report.summary.queue_status}`);
  lines.push(`- Activation: ${report.summary.activation_status}`);
  lines.push(`- Activation ready: ${report.summary.activation_ready ? 'yes' : 'no'}`);
  lines.push(`- Decision still pending: ${report.summary.decision_still_pending ? 'yes' : 'no'}`);
  lines.push(`- Queue steps: ${report.summary.queue_steps}`);
  lines.push(`- Executable now: ${report.summary.executable_now}`);
  lines.push(`- Blocked now: ${report.summary.blocked_now}`);
  lines.push(`- Failures: ${report.summary.failures}`);
  lines.push(`- Warnings: ${report.summary.warnings}`);
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
