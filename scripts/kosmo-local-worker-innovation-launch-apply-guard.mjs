#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = new Date().toISOString().slice(0, 10);

const refs = {
  ownerCard: resolve(root, args.card || `data/kosmo-local-worker-innovation-launch-owner-card-${dateStamp}.json`),
  ownerCardCheck: resolve(root, args.cardCheck || `data/kosmo-local-worker-innovation-launch-owner-card-check-${dateStamp}.json`),
  dryRun: resolve(root, args.dryRun || `data/kosmo-local-worker-innovation-launch-dry-run-${dateStamp}.json`),
  dryRunCheck: resolve(root, args.dryRunCheck || `data/kosmo-local-worker-innovation-launch-dry-run-check-${dateStamp}.json`)
};

const answer = String(args.answer || '').trim();
const outputJson = resolve(root, args.out || `data/kosmo-local-worker-innovation-launch-apply-guard-${dateStamp}.json`);
const outputMd = resolve(root, args.markdown || `docs/codex/kosmo-local-worker-innovation-launch-apply-guard-${dateStamp}.md`);

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const reports = {};
  for (const [key, path] of Object.entries(refs)) reports[key] = await readJson(path);
  const report = buildReport(reports, answer);

  await mkdir(dirname(outputJson), { recursive: true });
  await mkdir(dirname(outputMd), { recursive: true });
  await writeFile(outputJson, `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(outputMd, renderMarkdown(report));

  console.log('Kosmo local worker innovation launch apply guard');
  console.log(`Status: ${report.status}`);
  console.log(`Answer present: ${report.summary.answer_present ? 'yes' : 'no'}`);
  console.log(`Exact reply valid: ${report.summary.exact_reply_valid ? 'yes' : 'no'}`);
  console.log(`Separate launch allowed after guard: ${report.summary.separate_launch_allowed_after_guard ? 'yes' : 'no'}`);
  console.log(`Execute now: ${report.summary.execute_now}`);
  console.log(`Public-ready after guard: ${report.summary.public_ready_after_guard}`);
  console.log(`Failures: ${report.summary.failures}`);
  console.log(`Wrote: ${relative(root, outputMd)}`);
}

function buildReport(reports, rawAnswer) {
  const readinessFailures = [];
  const replyFailures = [];
  const parsed = parseKeyValueReply(rawAnswer);
  const answerPresent = rawAnswer.length > 0;
  const required = {
    local_worker_innovation_launch_choice: 'approve_separate_source_free_launch_later',
    confirmed_source_free_only: 'yes',
    confirmed_no_private_content: 'yes',
    confirmed_run_validator_after_outputs: 'yes'
  };

  if (reports.ownerCard.status !== 'local_worker_innovation_launch_owner_card_ready') readinessFailures.push(`Owner card not ready: ${reports.ownerCard.status}`);
  if (reports.ownerCardCheck.status !== 'local_worker_innovation_launch_owner_card_guard_passed') readinessFailures.push(`Owner card check not passed: ${reports.ownerCardCheck.status}`);
  if (reports.dryRun.status !== 'local_worker_innovation_launch_dry_run_ready') readinessFailures.push(`Dry run not ready: ${reports.dryRun.status}`);
  if (reports.dryRunCheck.status !== 'local_worker_innovation_launch_dry_run_guard_passed') readinessFailures.push(`Dry run check not passed: ${reports.dryRunCheck.status}`);
  if (reports.ownerCard.summary?.execute_now !== 0) readinessFailures.push('Owner card permits execution now.');
  if (reports.dryRun.summary?.execute_now !== 0) readinessFailures.push('Dry run permits execution now.');
  if (reports.ownerCard.summary?.tasks !== 5) readinessFailures.push(`Owner card task count is not 5: ${reports.ownerCard.summary?.tasks}`);

  if (answerPresent) {
    Object.entries(required).forEach(([key, expected]) => {
      if (!parsed[key]) replyFailures.push(`Missing ${key}.`);
      else if (parsed[key] !== expected) replyFailures.push(`${key} must be ${expected}, got ${parsed[key]}.`);
    });
    const allowedChoices = new Set((reports.ownerCard.allowed_answers || []).map((item) => item.id));
    if (parsed.local_worker_innovation_launch_choice && !allowedChoices.has(parsed.local_worker_innovation_launch_choice)) {
      replyFailures.push(`Unknown launch choice: ${parsed.local_worker_innovation_launch_choice}.`);
    }
    if (!String(parsed.note || '').includes('5 GitHub-Innovation-Fixture-Tasks')) {
      replyFailures.push('note must explicitly mention the 5 GitHub-Innovation-Fixture-Tasks.');
    }
    if (rawAnswer.toLowerCase().includes('private') && parsed.confirmed_no_private_content !== 'yes') {
      replyFailures.push('Private-content wording requires confirmed_no_private_content=yes.');
    }
  }

  const exactReplyValid = answerPresent && readinessFailures.length === 0 && replyFailures.length === 0;
  const status = readinessFailures.length > 0
    ? 'local_worker_innovation_launch_apply_guard_not_ready'
    : !answerPresent
      ? 'local_worker_innovation_launch_apply_guard_waiting_for_exact_reply'
      : exactReplyValid
        ? 'local_worker_innovation_launch_apply_guard_ready_for_separate_dry_run_batch'
        : 'local_worker_innovation_launch_apply_guard_blocked_by_reply';

  const failures = [...readinessFailures, ...replyFailures];
  return {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    status,
    policy: {
      guard_only: true,
      records_owner_decision_now: false,
      executes_local_workers_now: false,
      starts_models_now: false,
      reads_private_content_now: false,
      writes_worker_outputs_now: false,
      writes_repo_outputs_now: false,
      promotes_training_rows_now: false,
      public_ready_after_guard: 0
    },
    source_refs: Object.values(refs).map((path) => relative(root, path)),
    summary: {
      answer_present: answerPresent,
      exact_reply_valid: exactReplyValid,
      separate_launch_allowed_after_guard: exactReplyValid,
      tasks: reports.ownerCard.summary?.tasks ?? null,
      dry_run_ready_tasks: reports.ownerCard.summary?.dry_run_ready_tasks ?? null,
      validator_fixture_guarded: reports.ownerCard.summary?.validator_fixture_guarded === true,
      execute_now: 0,
      starts_models_now: false,
      public_ready_after_guard: 0,
      readiness_failures: readinessFailures.length,
      reply_failures: replyFailures.length,
      failures: failures.length
    },
    parsed_answer: answerPresent ? parsed : null,
    required_exact_reply: Object.entries(required).map(([key, value]) => `${key}=${value}`).concat([
      'note=Nur die 5 GitHub-Innovation-Fixture-Tasks duerfen in einem separaten Launch-Batch laufen.'
    ]),
    allowed_choices: (reports.ownerCard.allowed_answers || []).map((item) => item.id),
    next_actions: exactReplyValid
      ? [
          'Open a separate launch batch; do not execute from this guard.',
          'Rerun dry-run, owner-card and validator-fixture guards immediately before any worker call.',
          'After future worker outputs exist, run the innovation output validator before any repo conversion.'
        ]
      : [
          'Keep the local-worker launch held.',
          'Use the exact reply template from the owner card if a later source-free launch should be allowed.',
          'Do not start models, read private sources, or write worker outputs from this guard.'
        ],
    hard_stops: [
      'This guard never executes local workers.',
      'This guard never starts models.',
      'This guard never reads private Source Root, OneDrive or archive-library content.',
      'This guard never promotes public-ready or training rows.',
      'A broad approval is not enough; exact key=value fields are required.'
    ],
    failures
  };
}

function parseKeyValueReply(rawAnswer) {
  const parsed = {};
  rawAnswer.split(/[;\n]/).forEach((part) => {
    const [key, ...rest] = part.split('=');
    if (!key || rest.length === 0) return;
    parsed[key.trim()] = rest.join('=').trim();
  });
  return parsed;
}

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

function renderMarkdown(report) {
  const lines = [];
  lines.push('# Kosmo Local Worker Innovation Launch Apply Guard');
  lines.push('');
  lines.push(`Generated: ${report.generated_at}`);
  lines.push(`Status: \`${report.status}\``);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Answer present: ${report.summary.answer_present ? 'yes' : 'no'}`);
  lines.push(`- Exact reply valid: ${report.summary.exact_reply_valid ? 'yes' : 'no'}`);
  lines.push(`- Separate launch allowed after guard: ${report.summary.separate_launch_allowed_after_guard ? 'yes' : 'no'}`);
  lines.push(`- Tasks: ${report.summary.tasks}`);
  lines.push(`- Dry-run ready tasks: ${report.summary.dry_run_ready_tasks}`);
  lines.push(`- Execute now: ${report.summary.execute_now}`);
  lines.push(`- Starts models now: ${report.summary.starts_models_now ? 'yes' : 'no'}`);
  lines.push(`- Public-ready after guard: ${report.summary.public_ready_after_guard}`);
  lines.push(`- Failures: ${report.summary.failures}`);
  lines.push('');
  lines.push('## Required Exact Reply');
  lines.push('');
  lines.push('```text');
  lines.push(report.required_exact_reply.join('; '));
  lines.push('```');
  lines.push('');
  lines.push('## Next Actions');
  lines.push('');
  report.next_actions.forEach((action) => lines.push(`- ${action}`));
  lines.push('');
  lines.push('## Hard Stops');
  lines.push('');
  report.hard_stops.forEach((stop) => lines.push(`- ${stop}`));
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
    if (index + 1 < argv.length && !String(next).startsWith('--')) {
      parsed[key] = next;
      index += 1;
    } else {
      parsed[key] = true;
    }
  }
  return parsed;
}
