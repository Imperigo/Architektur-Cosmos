#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = new Date().toISOString().slice(0, 10);

const refs = {
  checkpoint: resolve(root, args.checkpoint || `data/kosmo-local-worker-innovation-launch-runbook-checkpoint-${dateStamp}.json`),
  checkpointCheck: resolve(root, args.checkpointCheck || `data/kosmo-local-worker-innovation-launch-runbook-checkpoint-check-${dateStamp}.json`),
  dryRun: resolve(root, args.dryRun || `data/kosmo-local-worker-innovation-launch-dry-run-${dateStamp}.json`),
  applyGuard: resolve(root, args.applyGuard || `data/kosmo-local-worker-innovation-launch-apply-guard-${dateStamp}.json`)
};

const outputJson = resolve(root, args.out || `data/kosmo-local-worker-innovation-launch-execution-envelope-${dateStamp}.json`);
const outputMd = resolve(root, args.markdown || `docs/codex/kosmo-local-worker-innovation-launch-execution-envelope-${dateStamp}.md`);

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const reports = {};
  for (const [key, path] of Object.entries(refs)) reports[key] = await readJson(path);
  const envelope = buildEnvelope(reports);

  await mkdir(dirname(outputJson), { recursive: true });
  await mkdir(dirname(outputMd), { recursive: true });
  await writeFile(outputJson, `${JSON.stringify(envelope, null, 2)}\n`);
  await writeFile(outputMd, renderMarkdown(envelope));

  console.log('Kosmo local worker innovation launch execution envelope');
  console.log(`Status: ${envelope.status}`);
  console.log(`Mode: ${envelope.summary.mode}`);
  console.log(`Slots: ${envelope.summary.output_slots}`);
  console.log(`Executable now: ${envelope.summary.executable_now}`);
  console.log(`Worker outputs written now: ${envelope.summary.worker_outputs_written_now}`);
  console.log(`Public-ready after envelope: ${envelope.summary.public_ready_after_envelope}`);
  console.log(`Wrote: ${relative(root, outputMd)}`);
}

function buildEnvelope(reports) {
  const failures = [];
  if (![
    'local_worker_innovation_launch_runbook_checkpoint_waiting_for_exact_reply',
    'local_worker_innovation_launch_runbook_checkpoint_ready_for_separate_preflight',
    'local_worker_innovation_launch_runbook_checkpoint_blocked_by_reply'
  ].includes(reports.checkpoint.status)) {
    failures.push(`Checkpoint status is not guarded: ${reports.checkpoint.status}`);
  }
  if (reports.checkpointCheck.status !== 'local_worker_innovation_launch_runbook_checkpoint_guard_passed') {
    failures.push(`Checkpoint check not passed: ${reports.checkpointCheck.status}`);
  }
  if (reports.dryRun.status !== 'local_worker_innovation_launch_dry_run_ready') {
    failures.push(`Dry run not ready: ${reports.dryRun.status}`);
  }
  if (reports.applyGuard.summary?.execute_now !== 0) failures.push('Apply guard execute_now is not 0.');

  const taskIds = reports.checkpoint.task_ids || [];
  const slots = taskIds.map((taskId, index) => ({
    slot_id: `source_free_worker_output_${String(index + 1).padStart(2, '0')}`,
    task_id: taskId,
    lane: laneFromTaskId(taskId),
    output_path_template: `data/local-worker-innovation-outputs/${dateStamp}/${taskId}.json`,
    markdown_path_template: `docs/codex/local-worker-innovation-outputs/${dateStamp}/${taskId}.md`,
    status: 'empty_held',
    required_before_write: [
      'separate_launch_batch_opened',
      'runbook_checkpoint_ready_for_separate_preflight',
      'local_worker_call_logged',
      'output_validator_after_write_required'
    ],
    writes_now: false,
    execute_now: false,
    public_ready_after_slot: 0
  }));

  const mode = failures.length > 0
    ? 'needs_review'
    : reports.checkpoint.summary?.launch_mode === 'ready_for_separate_launch_preflight'
      ? 'empty_ready_for_separate_preflight_only'
      : reports.checkpoint.summary?.launch_mode === 'blocked_by_owner_reply'
        ? 'empty_blocked_by_reply'
        : 'empty_held_waiting_for_exact_reply';

  return {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    status: failures.length === 0
      ? 'local_worker_innovation_launch_execution_envelope_prepared'
      : 'local_worker_innovation_launch_execution_envelope_needs_review',
    policy: {
      envelope_only: true,
      creates_output_slots_only: true,
      executes_local_workers_now: false,
      starts_models_now: false,
      reads_private_content_now: false,
      writes_worker_outputs_now: false,
      writes_repo_outputs_now: false,
      promotes_training_rows_now: false,
      public_ready_after_envelope: 0
    },
    source_refs: Object.values(refs).map((path) => relative(root, path)),
    summary: {
      mode,
      output_slots: slots.length,
      empty_slots: slots.filter((slot) => slot.status === 'empty_held').length,
      executable_now: false,
      worker_outputs_written_now: 0,
      repo_outputs_written_now: 0,
      starts_models_now: false,
      reads_private_content_now: false,
      public_ready_after_envelope: 0,
      failures: failures.length
    },
    slot_contract: {
      required_fields_after_future_write: [
        'schema_version',
        'generated_at',
        'task_id',
        'lane',
        'source_free_inputs',
        'worker_model',
        'worker_prompt_ref',
        'raw_output_summary',
        'structured_output',
        'self_reported_uncertainties',
        'validation_status',
        'public_ready_after_validation'
      ],
      forbidden_fields_after_future_write: [
        'private_source_excerpt',
        'private_pdf_text',
        'onedrive_file_content',
        'credential',
        'token',
        'secret'
      ],
      required_validator_after_future_write: 'npm run kosmo:local-worker-innovation-output-validator'
    },
    slots,
    hard_stops: [
      'This envelope never executes local workers.',
      'This envelope never starts models.',
      'This envelope never creates worker output files.',
      'This envelope never reads private Source Root, OneDrive or archive-library content.',
      'This envelope never promotes public-ready or training rows.'
    ],
    failures
  };
}

function laneFromTaskId(taskId) {
  if (taskId.includes('kosmo_prepare')) return 'kosmo_prepare';
  if (taskId.includes('kosmo_asset')) return 'kosmo_asset';
  if (taskId.includes('worker_integration')) return 'worker_integration';
  return 'source_free_innovation';
}

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

function renderMarkdown(envelope) {
  const lines = [];
  lines.push('# Kosmo Local Worker Innovation Launch Execution Envelope');
  lines.push('');
  lines.push(`Generated: ${envelope.generated_at}`);
  lines.push(`Status: \`${envelope.status}\``);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Mode: ${envelope.summary.mode}`);
  lines.push(`- Output slots: ${envelope.summary.output_slots}`);
  lines.push(`- Empty slots: ${envelope.summary.empty_slots}`);
  lines.push(`- Executable now: ${envelope.summary.executable_now ? 'yes' : 'no'}`);
  lines.push(`- Worker outputs written now: ${envelope.summary.worker_outputs_written_now}`);
  lines.push(`- Public-ready after envelope: ${envelope.summary.public_ready_after_envelope}`);
  lines.push(`- Failures: ${envelope.summary.failures}`);
  lines.push('');
  lines.push('## Slots');
  lines.push('');
  lines.push('| Slot | Lane | Status | Writes now |');
  lines.push('| --- | --- | --- | --- |');
  envelope.slots.forEach((slot) => {
    lines.push(`| \`${slot.slot_id}\` | ${slot.lane} | ${slot.status} | ${slot.writes_now ? 'yes' : 'no'} |`);
  });
  lines.push('');
  lines.push('## Required Fields After Future Write');
  lines.push('');
  envelope.slot_contract.required_fields_after_future_write.forEach((field) => lines.push(`- \`${field}\``));
  lines.push('');
  lines.push('## Hard Stops');
  lines.push('');
  envelope.hard_stops.forEach((stop) => lines.push(`- ${stop}`));
  lines.push('');
  if (envelope.failures.length > 0) {
    lines.push('## Failures');
    lines.push('');
    envelope.failures.forEach((failure) => lines.push(`- ${failure}`));
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
    if (index + 1 < argv.length && !String(next).startsWith('--')) {
      parsed[key] = next;
      index += 1;
    } else {
      parsed[key] = true;
    }
  }
  return parsed;
}
