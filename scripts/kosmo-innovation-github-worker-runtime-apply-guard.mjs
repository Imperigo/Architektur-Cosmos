#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = new Date().toISOString().slice(0, 10);

const refs = {
  readinessPlan: resolve(root, args.readinessPlan || `data/kosmo-innovation-github-worker-runtime-batch-readiness-plan-${dateStamp}.json`),
  readinessPlanCheck: resolve(root, args.readinessPlanCheck || `data/kosmo-innovation-github-worker-runtime-batch-readiness-plan-check-${dateStamp}.json`),
  rollbackRedactionFixtures: resolve(root, args.rollbackRedactionFixtures || `data/kosmo-innovation-github-worker-runtime-rollback-redaction-fixtures-${dateStamp}.json`),
  rollbackRedactionFixturesCheck: resolve(root, args.rollbackRedactionFixturesCheck || `data/kosmo-innovation-github-worker-runtime-rollback-redaction-fixtures-check-${dateStamp}.json`),
  sourceRootBlocker: resolve(root, args.sourceRootBlocker || `data/kosmo-source-root-blocker-refresh-${dateStamp}.json`),
  ownerUnlockCheckpoint: resolve(root, args.ownerUnlockCheckpoint || `data/kosmo-owner-unlock-pipeline-checkpoint-${dateStamp}.json`)
};

const answer = String(args.answer || '').trim();
const outputJson = resolve(root, args.out || `data/kosmo-innovation-github-worker-runtime-apply-guard-${dateStamp}.json`);
const outputMd = resolve(root, args.markdown || `docs/codex/kosmo-innovation-github-worker-runtime-apply-guard-${dateStamp}.md`);

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

  console.log('Kosmo innovation GitHub worker runtime apply guard');
  console.log(`Status: ${report.status}`);
  console.log(`Answer present: ${report.summary.answer_present ? 'yes' : 'no'}`);
  console.log(`Exact reply valid: ${report.summary.exact_reply_valid ? 'yes' : 'no'}`);
  console.log(`Separate runtime allowed after guard: ${report.summary.separate_runtime_allowed_after_guard ? 'yes' : 'no'}`);
  console.log(`Execute now: ${report.summary.execute_now}`);
  console.log(`Failures: ${report.summary.failures}`);
  console.log(`Wrote: ${relative(root, outputMd)}`);
}

function buildReport(reports, rawAnswer) {
  const readinessFailures = [];
  const replyFailures = [];
  const parsed = parseKeyValueReply(rawAnswer);
  const answerPresent = rawAnswer.length > 0;
  const required = {
    github_worker_runtime_choice: 'approve_separate_source_free_runtime_batch_later',
    confirmed_source_free_only: 'yes',
    confirmed_no_private_content: 'yes',
    confirmed_no_model_or_worker_start_from_guard: 'yes',
    confirmed_rerun_redaction_and_rollback_checks: 'yes',
    confirmed_runtime_outputs_review_only: 'yes'
  };

  if (reports.readinessPlan.status !== 'innovation_github_worker_runtime_batch_readiness_plan_ready') {
    readinessFailures.push(`Runtime readiness plan not ready: ${reports.readinessPlan.status}`);
  }
  if (reports.readinessPlanCheck.status !== 'innovation_github_worker_runtime_batch_readiness_plan_guard_passed') {
    readinessFailures.push(`Runtime readiness check not passed: ${reports.readinessPlanCheck.status}`);
  }
  if (reports.rollbackRedactionFixtures.status !== 'innovation_github_worker_runtime_rollback_redaction_fixtures_ready') {
    readinessFailures.push(`Rollback/redaction fixtures not ready: ${reports.rollbackRedactionFixtures.status}`);
  }
  if (reports.rollbackRedactionFixturesCheck.status !== 'innovation_github_worker_runtime_rollback_redaction_fixtures_guard_passed') {
    readinessFailures.push(`Rollback/redaction fixtures check not passed: ${reports.rollbackRedactionFixturesCheck.status}`);
  }
  if (reports.sourceRootBlocker.status !== 'source_root_blocker_still_active') {
    readinessFailures.push(`Source Root blocker status changed and must be reviewed: ${reports.sourceRootBlocker.status}`);
  }
  if (reports.ownerUnlockCheckpoint.status !== 'owner_unlock_pipeline_checkpoint_ready') {
    readinessFailures.push(`Owner unlock checkpoint not ready: ${reports.ownerUnlockCheckpoint.status}`);
  }
  if (reports.readinessPlan.summary?.runtime_executable_now !== false) readinessFailures.push('Readiness plan unexpectedly permits runtime now.');
  if (reports.rollbackRedactionFixtures.summary?.runtime_executed_now !== 0) readinessFailures.push('Rollback/redaction fixture executed runtime.');
  if (reports.ownerUnlockCheckpoint.summary?.applies_decision_now !== false) readinessFailures.push('Owner unlock checkpoint applies a decision now.');

  if (answerPresent) {
    Object.entries(required).forEach(([key, expected]) => {
      if (!parsed[key]) replyFailures.push(`Missing ${key}.`);
      else if (parsed[key] !== expected) replyFailures.push(`${key} must be ${expected}, got ${parsed[key]}.`);
    });
    if (!String(parsed.note || '').includes('separater GitHub-Worker-Runtime-Batch')) {
      replyFailures.push('note must explicitly mention a separater GitHub-Worker-Runtime-Batch.');
    }
    if (rawAnswer.toLowerCase().includes('private') && parsed.confirmed_no_private_content !== 'yes') {
      replyFailures.push('Private-content wording requires confirmed_no_private_content=yes.');
    }
  }

  const exactReplyValid = answerPresent && readinessFailures.length === 0 && replyFailures.length === 0;
  const status = readinessFailures.length > 0
    ? 'innovation_github_worker_runtime_apply_guard_not_ready'
    : !answerPresent
      ? 'innovation_github_worker_runtime_apply_guard_waiting_for_exact_reply'
      : exactReplyValid
        ? 'innovation_github_worker_runtime_apply_guard_ready_for_separate_runtime_batch'
        : 'innovation_github_worker_runtime_apply_guard_blocked_by_reply';
  const failures = [...readinessFailures, ...replyFailures];

  return {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    status,
    policy: {
      guard_only: true,
      records_owner_decision_now: false,
      executes_runtime_now: false,
      executes_rollback_now: false,
      executes_local_workers_now: false,
      starts_models_now: false,
      installs_dependencies_now: false,
      reads_private_content_now: false,
      writes_runtime_outputs_now: false,
      writes_worker_outputs_now: false,
      copies_secret_values_now: false,
      promotes_training_rows_now: false,
      public_ready_after_guard: 0
    },
    source_refs: Object.values(refs).map((path) => relative(root, path)),
    summary: {
      answer_present: answerPresent,
      exact_reply_valid: exactReplyValid,
      separate_runtime_allowed_after_guard: exactReplyValid,
      selected_fixture_id: reports.readinessPlan.summary?.selected_fixture_id || null,
      readiness_ready_gates: reports.readinessPlan.summary?.ready_gates ?? null,
      readiness_blocked_gates: reports.readinessPlan.summary?.blocked_gates ?? null,
      rollback_fixture_groups: reports.rollbackRedactionFixtures.summary?.fixture_groups ?? null,
      redaction_rules: reports.rollbackRedactionFixtures.summary?.redaction_rules ?? null,
      source_root_state: reports.ownerUnlockCheckpoint.summary?.source_root_state || null,
      execute_now: 0,
      runtime_executable_now: false,
      starts_models_now: false,
      reads_private_content_now: false,
      writes_runtime_outputs_now: false,
      public_ready_after_guard: 0,
      readiness_failures: readinessFailures.length,
      reply_failures: replyFailures.length,
      failures: failures.length
    },
    parsed_answer: answerPresent ? parsed : null,
    required_exact_reply: Object.entries(required).map(([key, value]) => `${key}=${value}`).concat([
      'note=Nur ein separater GitHub-Worker-Runtime-Batch darf nach erneut gruenen Guards vorbereitet werden.'
    ]),
    next_actions: exactReplyValid
      ? [
          'Open a separate runtime batch; do not execute runtime from this guard.',
          'Rerun readiness, rollback/redaction and source-root guards immediately before any runtime call.',
          'Keep runtime outputs review-only until overseer validation and owner review pass.'
        ]
      : [
          'Keep GitHub worker runtime held.',
          'Use the exact key=value reply template if a later source-free runtime batch should be allowed.',
          'Do not start models, local workers or dependency installers from this guard.'
        ],
    hard_stops: [
      'This guard never executes runtime commands.',
      'This guard never executes rollback commands.',
      'This guard never starts models or local workers.',
      'This guard never installs dependencies.',
      'This guard never reads private Source Root, OneDrive or archive-library content.',
      'This guard never writes runtime outputs or worker outputs.',
      'This guard never copies secret values.',
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
  lines.push('# Kosmo Innovation GitHub Worker Runtime Apply Guard');
  lines.push('');
  lines.push(`Generated: ${report.generated_at}`);
  lines.push(`Status: \`${report.status}\``);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Answer present: ${report.summary.answer_present ? 'yes' : 'no'}`);
  lines.push(`- Exact reply valid: ${report.summary.exact_reply_valid ? 'yes' : 'no'}`);
  lines.push(`- Separate runtime allowed after guard: ${report.summary.separate_runtime_allowed_after_guard ? 'yes' : 'no'}`);
  lines.push(`- Selected fixture: \`${report.summary.selected_fixture_id}\``);
  lines.push(`- Ready gates: ${report.summary.readiness_ready_gates}`);
  lines.push(`- Blocked gates: ${report.summary.readiness_blocked_gates}`);
  lines.push(`- Rollback fixture groups: ${report.summary.rollback_fixture_groups}`);
  lines.push(`- Redaction rules: ${report.summary.redaction_rules}`);
  lines.push(`- Source Root state: ${report.summary.source_root_state}`);
  lines.push(`- Execute now: ${report.summary.execute_now}`);
  lines.push(`- Runtime executable now: ${report.summary.runtime_executable_now ? 'yes' : 'no'}`);
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
    if (next && !next.startsWith('--')) {
      parsed[key] = next;
      index += 1;
    } else {
      parsed[key] = true;
    }
  }
  return parsed;
}
