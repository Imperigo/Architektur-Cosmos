#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = new Date().toISOString().slice(0, 10);

const refs = {
  dryRun: resolve(root, args.dryRun || `data/kosmo-source-root-decision-dry-run-${dateStamp}.json`),
  activationPreflight: resolve(root, args.activationPreflight || `data/kosmo-source-root-activation-preflight-${dateStamp}.json`),
  privateMetadataRunner: resolve(root, args.privateMetadataRunner || `data/kosmo-private-metadata-inventory-runner-${dateStamp}.json`),
  privateMetadataCheck: resolve(root, args.privateMetadataCheck || `data/kosmo-private-metadata-inventory-check-${dateStamp}.json`),
  workerBoundary: resolve(root, args.workerBoundary || `data/kosmo-worker-boundary-pack-check-${dateStamp}.json`)
};

const outputJson = resolve(root, args.out || `data/kosmo-source-root-post-owner-activation-queue-${dateStamp}.json`);
const outputMd = resolve(root, args.markdown || `docs/codex/kosmo-source-root-post-owner-activation-queue-${dateStamp}.md`);

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const dryRun = await readJson(refs.dryRun);
  const activationPreflight = await readJson(refs.activationPreflight);
  const privateMetadataRunner = await readJson(refs.privateMetadataRunner);
  const privateMetadataCheck = await readJson(refs.privateMetadataCheck);
  const workerBoundary = await readJson(refs.workerBoundary);
  const report = buildReport({ dryRun, activationPreflight, privateMetadataRunner, privateMetadataCheck, workerBoundary });

  await mkdir(dirname(outputJson), { recursive: true });
  await mkdir(dirname(outputMd), { recursive: true });
  await writeFile(outputJson, `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(outputMd, renderMarkdown(report));

  console.log('Kosmo source-root post-owner activation queue');
  console.log(`Status: ${report.status}`);
  console.log(`Queue steps: ${report.summary.queue_steps}`);
  console.log(`Executable now: ${report.summary.executable_now}`);
  console.log(`Blocked now: ${report.summary.blocked_now}`);
  console.log(`Failures: ${report.summary.failures}`);
  console.log(`Public-ready after queue: ${report.summary.public_ready_after_queue}`);
  console.log(`Wrote: ${relative(root, outputMd)}`);

  if (report.failures.length > 0) process.exitCode = 1;
}

function buildReport({ dryRun, activationPreflight, privateMetadataRunner, privateMetadataCheck, workerBoundary }) {
  const failures = [];
  const activationReady = activationPreflight?.summary?.activation_ready === true &&
    activationPreflight.status === 'source_root_activation_ready_for_private_metadata_diagnostic';
  const decisionStillPending = dryRun?.summary?.metadata_diagnostic_scenarios === 1 &&
    activationPreflight?.summary?.private_diagnostic_allowed !== true;

  if (![
    'source_root_decision_dry_run_ready',
    'source_root_decision_dry_run_satisfied_recorded_selection'
  ].includes(dryRun.status)) failures.push(`Dry run not ready: ${dryRun.status}`);
  if (![
    'source_root_activation_waiting_for_owner_storage_action',
    'source_root_activation_ready_for_private_metadata_diagnostic',
    'source_root_activation_needs_contract_review'
  ].includes(activationPreflight.status)) failures.push(`Unexpected activation status: ${activationPreflight.status}`);
  if (privateMetadataCheck.status !== 'private_metadata_inventory_guard_passed') failures.push(`Private metadata guard not passed: ${privateMetadataCheck.status}`);
  if (workerBoundary.status !== 'worker_boundary_pack_guard_passed') failures.push(`Worker boundary guard not passed: ${workerBoundary.status}`);

  const queueSteps = [
    queueStep({
      id: 'record_owner_decision',
      phase: 'owner',
      command: `edit examples/kosmo-references/provenance/source-root-decision-session-${dateStamp}.json`,
      purpose: 'Record exactly one owner-confirmed source-root decision.',
      requires: ['explicit owner/KosmoOverseer confirmation'],
      executableNow: false,
      blockedReason: 'human decision required'
    }),
    queueStep({
      id: 'decision_session_check',
      phase: 'guard',
      command: 'npm run kosmo:source-root-decision-session-check',
      purpose: 'Verify recorded decision and selected root visibility.',
      requires: ['record_owner_decision completed'],
      executableNow: false,
      blockedReason: 'no recorded decision yet'
    }),
    queueStep({
      id: 'blocker_refresh',
      phase: 'guard',
      command: 'npm run kosmo:source-root-blocker-refresh',
      purpose: 'Refresh source-root blocker state after recorded decision.',
      requires: ['decision_session_check passed'],
      executableNow: false,
      blockedReason: 'decision check pending'
    }),
    queueStep({
      id: 'activation_preflight',
      phase: 'activation',
      command: 'npm run kosmo:source-root-activation-preflight',
      purpose: 'Confirm metadata diagnostic activation only.',
      requires: ['blocker_refresh updated', 'worker boundary guard passed'],
      executableNow: false,
      blockedReason: activationReady ? 'activation preflight already passed' : 'source-root owner decision pending'
    }),
    queueStep({
      id: 'private_metadata_inventory',
      phase: 'private_metadata',
      command: 'npm run kosmo:private-metadata-inventory',
      purpose: 'Run pilot-scoped metadata-only inventory to private output root.',
      requires: ['activation_preflight reports ready'],
      executableNow: activationReady,
      blockedReason: activationReady ? null : 'activation not ready'
    }),
    queueStep({
      id: 'private_metadata_inventory_check',
      phase: 'private_metadata',
      command: 'npm run kosmo:private-metadata-inventory-check',
      purpose: 'Validate private metadata output contract and no public-ready leakage.',
      requires: ['private_metadata_inventory completed'],
      executableNow: activationReady && privateMetadataRunner.status === 'private_metadata_inventory_ready_private_output_written',
      blockedReason: activationReady ? 'private metadata output not written yet' : 'activation not ready'
    }),
    queueStep({
      id: 'day_batch_loop',
      phase: 'review',
      command: 'npm run kosmo:day-batch-loop',
      purpose: 'Re-run full review-only guard chain after private metadata update.',
      requires: ['private_metadata_inventory_check passed'],
      executableNow: false,
      blockedReason: 'private metadata guard sequence pending'
    })
  ];

  const executableNow = queueSteps.filter((step) => step.executable_now).length;
  const blockedNow = queueSteps.filter((step) => !step.executable_now).length;

  return {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    status: failures.length === 0
      ? 'source_root_post_owner_activation_queue_ready'
      : 'source_root_post_owner_activation_queue_needs_review',
    policy: {
      queue_only: true,
      records_decisions: false,
      mutates_decision_session: false,
      reads_private_content: false,
      copies_private_content: false,
      runs_private_inventory_now: false,
      writes_public_files: false,
      writes_public_manifest: false,
      public_ready_after_queue: 0,
      note: 'This queue defines the safe post-owner sequence. It does not run private inventory or record decisions.'
    },
    source_refs: Object.values(refs).map((path) => relative(root, path)),
    summary: {
      dry_run_status: dryRun.status,
      activation_status: activationPreflight.status,
      activation_ready: activationReady,
      decision_still_pending: decisionStillPending,
      private_metadata_runner_status: privateMetadataRunner.status,
      private_metadata_guard_status: privateMetadataCheck.status,
      worker_boundary_status: workerBoundary.status,
      queue_steps: queueSteps.length,
      executable_now: executableNow,
      blocked_now: blockedNow,
      failures: failures.length,
      public_ready_after_queue: 0
    },
    queue_steps: queueSteps,
    hard_stops: [
      'Do not run private OCR/PDF/book text extraction from this queue.',
      'Do not copy private source files into Git.',
      'Do not assign local LLM tasks that read private contents before activation and output guards pass.',
      'Do not set public-ready from metadata inventory results.'
    ],
    handoff_note: 'After owner records a source-root decision, run this queue top-to-bottom and stop at the first failed guard.',
    failures
  };
}

function queueStep({ id, phase, command, purpose, requires, executableNow, blockedReason }) {
  return {
    id,
    phase,
    command,
    purpose,
    requires,
    executable_now: executableNow,
    blocked_reason: executableNow ? null : blockedReason
  };
}

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

function renderMarkdown(report) {
  const lines = [];
  lines.push('# Kosmo Source-Root Post-Owner Activation Queue');
  lines.push('');
  lines.push(`Generated: ${report.generated_at}`);
  lines.push(`Status: \`${report.status}\``);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Dry run: ${report.summary.dry_run_status}`);
  lines.push(`- Activation: ${report.summary.activation_status}`);
  lines.push(`- Activation ready: ${report.summary.activation_ready ? 'yes' : 'no'}`);
  lines.push(`- Decision still pending: ${report.summary.decision_still_pending ? 'yes' : 'no'}`);
  lines.push(`- Private metadata runner: ${report.summary.private_metadata_runner_status}`);
  lines.push(`- Private metadata guard: ${report.summary.private_metadata_guard_status}`);
  lines.push(`- Worker boundary: ${report.summary.worker_boundary_status}`);
  lines.push(`- Queue steps: ${report.summary.queue_steps}`);
  lines.push(`- Executable now: ${report.summary.executable_now}`);
  lines.push(`- Blocked now: ${report.summary.blocked_now}`);
  lines.push(`- Failures: ${report.summary.failures}`);
  lines.push(`- Public-ready after queue: ${report.summary.public_ready_after_queue}`);
  lines.push('');
  lines.push('## Queue');
  lines.push('');
  lines.push('| Step | Phase | Executable now | Command | Blocked reason |');
  lines.push('| --- | --- | --- | --- | --- |');
  report.queue_steps.forEach((step) => {
    lines.push(`| \`${step.id}\` | ${step.phase} | ${step.executable_now ? 'yes' : 'no'} | \`${escapePipe(step.command)}\` | ${escapePipe(step.blocked_reason || '-')} |`);
  });
  lines.push('');
  lines.push('## Hard Stops');
  lines.push('');
  report.hard_stops.forEach((item) => lines.push(`- ${item}`));
  lines.push('');
  lines.push('## Handoff Note');
  lines.push('');
  lines.push(report.handoff_note);
  lines.push('');
  lines.push('## Failures');
  lines.push('');
  if (report.failures.length > 0) report.failures.forEach((failure) => lines.push(`- ${failure}`));
  else lines.push('- None.');
  lines.push('');
  return lines.join('\n');
}

function escapePipe(value) {
  return String(value ?? '').replace(/\|/g, '\\|').replace(/\n/g, ' ');
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
