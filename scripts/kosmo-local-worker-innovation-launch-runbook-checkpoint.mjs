#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = new Date().toISOString().slice(0, 10);

const refs = {
  dryRun: resolve(root, args.dryRun || `data/kosmo-local-worker-innovation-launch-dry-run-${dateStamp}.json`),
  dryRunCheck: resolve(root, args.dryRunCheck || `data/kosmo-local-worker-innovation-launch-dry-run-check-${dateStamp}.json`),
  ownerCard: resolve(root, args.ownerCard || `data/kosmo-local-worker-innovation-launch-owner-card-${dateStamp}.json`),
  ownerCardCheck: resolve(root, args.ownerCardCheck || `data/kosmo-local-worker-innovation-launch-owner-card-check-${dateStamp}.json`),
  applyGuard: resolve(root, args.applyGuard || `data/kosmo-local-worker-innovation-launch-apply-guard-${dateStamp}.json`),
  applyGuardCheck: resolve(root, args.applyGuardCheck || `data/kosmo-local-worker-innovation-launch-apply-guard-check-${dateStamp}.json`),
  applyGuardSmoke: resolve(root, args.applyGuardSmoke || `data/kosmo-local-worker-innovation-launch-apply-guard-smoke-${dateStamp}.json`),
  applyGuardSmokeCheck: resolve(root, args.applyGuardSmokeCheck || `data/kosmo-local-worker-innovation-launch-apply-guard-smoke-check-${dateStamp}.json`),
  validatorFixtures: resolve(root, args.validatorFixtures || `data/kosmo-local-worker-innovation-output-validator-fixtures-${dateStamp}.json`),
  validatorFixturesCheck: resolve(root, args.validatorFixturesCheck || `data/kosmo-local-worker-innovation-output-validator-fixtures-check-${dateStamp}.json`)
};

const outputJson = resolve(root, args.out || `data/kosmo-local-worker-innovation-launch-runbook-checkpoint-${dateStamp}.json`);
const outputMd = resolve(root, args.markdown || `docs/codex/kosmo-local-worker-innovation-launch-runbook-checkpoint-${dateStamp}.md`);

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const reports = {};
  for (const [key, path] of Object.entries(refs)) reports[key] = await readJson(path);
  const checkpoint = buildCheckpoint(reports);

  await mkdir(dirname(outputJson), { recursive: true });
  await mkdir(dirname(outputMd), { recursive: true });
  await writeFile(outputJson, `${JSON.stringify(checkpoint, null, 2)}\n`);
  await writeFile(outputMd, renderMarkdown(checkpoint));

  console.log('Kosmo local worker innovation launch runbook checkpoint');
  console.log(`Status: ${checkpoint.status}`);
  console.log(`Gates passed: ${checkpoint.summary.gates_passed}/${checkpoint.summary.gates}`);
  console.log(`Launch mode: ${checkpoint.summary.launch_mode}`);
  console.log(`Execute now: ${checkpoint.summary.execute_now}`);
  console.log(`Public-ready after checkpoint: ${checkpoint.summary.public_ready_after_checkpoint}`);
  console.log(`Failures: ${checkpoint.summary.failures}`);
  console.log(`Wrote: ${relative(root, outputMd)}`);
}

function buildCheckpoint(reports) {
  const gates = [
    gate('dry_run_ready', reports.dryRun.status === 'local_worker_innovation_launch_dry_run_ready', reports.dryRun.status),
    gate('dry_run_guard_passed', reports.dryRunCheck.status === 'local_worker_innovation_launch_dry_run_guard_passed', reports.dryRunCheck.status),
    gate('owner_card_ready', reports.ownerCard.status === 'local_worker_innovation_launch_owner_card_ready', reports.ownerCard.status),
    gate('owner_card_guard_passed', reports.ownerCardCheck.status === 'local_worker_innovation_launch_owner_card_guard_passed', reports.ownerCardCheck.status),
    gate('apply_guard_guarded', [
      'local_worker_innovation_launch_apply_guard_waiting_for_exact_reply',
      'local_worker_innovation_launch_apply_guard_ready_for_separate_dry_run_batch',
      'local_worker_innovation_launch_apply_guard_blocked_by_reply'
    ].includes(reports.applyGuard.status), reports.applyGuard.status),
    gate('apply_guard_check_passed', reports.applyGuardCheck.status === 'local_worker_innovation_launch_apply_guard_guard_passed', reports.applyGuardCheck.status),
    gate('apply_guard_smoke_passed', reports.applyGuardSmoke.status === 'local_worker_innovation_launch_apply_guard_smoke_passed', reports.applyGuardSmoke.status),
    gate('apply_guard_smoke_check_passed', reports.applyGuardSmokeCheck.status === 'local_worker_innovation_launch_apply_guard_smoke_guard_passed', reports.applyGuardSmokeCheck.status),
    gate('validator_fixtures_passed', reports.validatorFixtures.status === 'local_worker_innovation_output_validator_fixtures_passed', reports.validatorFixtures.status),
    gate('validator_fixtures_guard_passed', reports.validatorFixturesCheck.status === 'local_worker_innovation_output_validator_fixtures_guard_passed', reports.validatorFixturesCheck.status)
  ];
  const failedGates = gates.filter((item) => item.status === 'failed');
  const exactReplyValid = reports.applyGuard.summary?.exact_reply_valid === true;
  const waitingForReply = reports.applyGuard.status === 'local_worker_innovation_launch_apply_guard_waiting_for_exact_reply';
  const blockedByReply = reports.applyGuard.status === 'local_worker_innovation_launch_apply_guard_blocked_by_reply';
  const taskIds = (reports.dryRun.tasks || []).map((task) => task.task_id);
  const taskCountConsistent = reports.dryRun.summary?.tasks === 5 &&
    reports.ownerCard.summary?.tasks === 5 &&
    reports.applyGuard.summary?.tasks === 5 &&
    taskIds.length === 5;

  const invariantFailures = [];
  if (!taskCountConsistent) invariantFailures.push('Task count is not consistently 5 across dry-run, owner-card and apply-guard.');
  if (reports.dryRun.summary?.execute_now !== 0) invariantFailures.push('Dry run execute_now is not 0.');
  if (reports.ownerCard.summary?.execute_now !== 0) invariantFailures.push('Owner card execute_now is not 0.');
  if (reports.applyGuard.summary?.execute_now !== 0) invariantFailures.push('Apply guard execute_now is not 0.');
  if (reports.applyGuard.summary?.public_ready_after_guard !== 0) invariantFailures.push('Apply guard changes public-ready.');
  if (reports.applyGuard.summary?.starts_models_now !== false) invariantFailures.push('Apply guard can start models.');
  if (!reports.applyGuard.required_exact_reply?.some((line) => line.includes('confirmed_no_private_content=yes'))) {
    invariantFailures.push('Apply guard required exact reply does not include no-private confirmation.');
  }

  let launchMode = 'blocked_needs_review';
  if (failedGates.length === 0 && invariantFailures.length === 0 && waitingForReply) launchMode = 'hold_waiting_for_exact_reply';
  if (failedGates.length === 0 && invariantFailures.length === 0 && exactReplyValid) launchMode = 'ready_for_separate_launch_preflight';
  if (failedGates.length === 0 && invariantFailures.length === 0 && blockedByReply) launchMode = 'blocked_by_owner_reply';

  const failures = [
    ...failedGates.map((item) => `${item.id}: ${item.evidence}`),
    ...invariantFailures
  ];

  return {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    status: failures.length === 0
      ? launchMode === 'ready_for_separate_launch_preflight'
        ? 'local_worker_innovation_launch_runbook_checkpoint_ready_for_separate_preflight'
        : launchMode === 'blocked_by_owner_reply'
          ? 'local_worker_innovation_launch_runbook_checkpoint_blocked_by_reply'
          : 'local_worker_innovation_launch_runbook_checkpoint_waiting_for_exact_reply'
      : 'local_worker_innovation_launch_runbook_checkpoint_needs_review',
    policy: {
      checkpoint_only: true,
      executes_local_workers_now: false,
      starts_models_now: false,
      reads_private_content_now: false,
      writes_worker_outputs_now: false,
      writes_repo_outputs_now: false,
      promotes_training_rows_now: false,
      public_ready_after_checkpoint: 0
    },
    source_refs: Object.values(refs).map((path) => relative(root, path)),
    summary: {
      launch_mode: launchMode,
      gates: gates.length,
      gates_passed: gates.length - failedGates.length,
      tasks: taskIds.length,
      exact_reply_valid: exactReplyValid,
      waiting_for_exact_reply: waitingForReply,
      blocked_by_reply: blockedByReply,
      separate_launch_allowed_after_apply_guard: reports.applyGuard.summary?.separate_launch_allowed_after_guard === true,
      execute_now: 0,
      starts_models_now: false,
      public_ready_after_checkpoint: 0,
      failures: failures.length
    },
    gates,
    task_ids: taskIds,
    separate_launch_preflight_commands: [
      'npm run kosmo:local-worker-innovation-launch-dry-run',
      'npm run kosmo:local-worker-innovation-launch-dry-run-check',
      'npm run kosmo:local-worker-innovation-launch-owner-card',
      'npm run kosmo:local-worker-innovation-launch-owner-card-check',
      'npm run kosmo:local-worker-innovation-launch-apply-guard',
      'npm run kosmo:local-worker-innovation-launch-apply-guard-check',
      'npm run kosmo:local-worker-innovation-output-validator-fixtures',
      'npm run kosmo:local-worker-innovation-output-validator-fixtures-check',
      'npm run kosmo:local-worker-innovation-launch-runbook-checkpoint',
      'npm run kosmo:local-worker-innovation-launch-runbook-checkpoint-check'
    ],
    next_actions: launchMode === 'ready_for_separate_launch_preflight'
      ? [
          'Open a separate launch preflight batch; this checkpoint still executes nothing.',
          'Before any future worker call, rerun all preflight commands in order.',
          'After future worker outputs exist, run the output validator before conversion or training promotion.'
        ]
      : [
          'Keep local-worker innovation launch held.',
          'Wait for the exact source-free launch reply or rework the reply if blocked.',
          'Continue source-free prep and do not read private Source Root from this path.'
        ],
    hard_stops: [
      'This checkpoint never executes local workers.',
      'This checkpoint never starts models.',
      'This checkpoint never reads private Source Root, OneDrive or archive-library content.',
      'This checkpoint never writes worker outputs or repo outputs.',
      'This checkpoint never promotes public-ready or training rows.'
    ],
    failures
  };
}

function gate(id, condition, evidence) {
  return {
    id,
    status: condition ? 'passed' : 'failed',
    evidence
  };
}

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

function renderMarkdown(checkpoint) {
  const lines = [];
  lines.push('# Kosmo Local Worker Innovation Launch Runbook Checkpoint');
  lines.push('');
  lines.push(`Generated: ${checkpoint.generated_at}`);
  lines.push(`Status: \`${checkpoint.status}\``);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Launch mode: ${checkpoint.summary.launch_mode}`);
  lines.push(`- Gates: ${checkpoint.summary.gates_passed}/${checkpoint.summary.gates}`);
  lines.push(`- Tasks: ${checkpoint.summary.tasks}`);
  lines.push(`- Exact reply valid: ${checkpoint.summary.exact_reply_valid ? 'yes' : 'no'}`);
  lines.push(`- Waiting for exact reply: ${checkpoint.summary.waiting_for_exact_reply ? 'yes' : 'no'}`);
  lines.push(`- Separate launch allowed after apply guard: ${checkpoint.summary.separate_launch_allowed_after_apply_guard ? 'yes' : 'no'}`);
  lines.push(`- Execute now: ${checkpoint.summary.execute_now}`);
  lines.push(`- Starts models now: ${checkpoint.summary.starts_models_now ? 'yes' : 'no'}`);
  lines.push(`- Public-ready after checkpoint: ${checkpoint.summary.public_ready_after_checkpoint}`);
  lines.push(`- Failures: ${checkpoint.summary.failures}`);
  lines.push('');
  lines.push('## Gates');
  lines.push('');
  checkpoint.gates.forEach((gateItem) => {
    lines.push(`- ${gateItem.status}: \`${gateItem.id}\` - ${String(gateItem.evidence ?? '-')}`);
  });
  lines.push('');
  lines.push('## Separate Launch Preflight Commands');
  lines.push('');
  checkpoint.separate_launch_preflight_commands.forEach((command) => lines.push(`- \`${command}\``));
  lines.push('');
  lines.push('## Next Actions');
  lines.push('');
  checkpoint.next_actions.forEach((action) => lines.push(`- ${action}`));
  lines.push('');
  lines.push('## Hard Stops');
  lines.push('');
  checkpoint.hard_stops.forEach((stop) => lines.push(`- ${stop}`));
  lines.push('');
  lines.push('## Failures');
  lines.push('');
  if (checkpoint.failures.length > 0) checkpoint.failures.forEach((failure) => lines.push(`- ${failure}`));
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
    if (index + 1 < argv.length && !String(next).startsWith('--')) {
      parsed[key] = next;
      index += 1;
    } else {
      parsed[key] = true;
    }
  }
  return parsed;
}
