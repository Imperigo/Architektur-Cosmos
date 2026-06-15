#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = new Date().toISOString().slice(0, 10);
const cardPath = resolve(root, args.card || `data/kosmo-local-worker-innovation-launch-owner-card-${dateStamp}.json`);
const outputJson = resolve(root, args.out || `data/kosmo-local-worker-innovation-launch-owner-card-check-${dateStamp}.json`);
const outputMd = resolve(root, args.markdown || `docs/codex/kosmo-local-worker-innovation-launch-owner-card-check-${dateStamp}.md`);

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const card = JSON.parse(await readFile(cardPath, 'utf8'));
  const checks = buildChecks(card);
  const failures = checks.filter((check) => check.status === 'failed');
  const report = {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    status: failures.length === 0
      ? 'local_worker_innovation_launch_owner_card_guard_passed'
      : 'local_worker_innovation_launch_owner_card_guard_failed',
    policy: {
      validates_card_only: true,
      executes_local_workers_now: false,
      starts_models_now: false,
      reads_private_content_now: false,
      public_ready_after_check: 0
    },
    source_refs: [relative(root, cardPath)],
    summary: {
      checks: checks.length,
      passed: checks.length - failures.length,
      failures: failures.length,
      tasks: card.summary?.tasks ?? null,
      recommended_choice: card.summary?.recommended_choice ?? null,
      public_ready_after_check: 0
    },
    checks
  };

  await mkdir(dirname(outputJson), { recursive: true });
  await mkdir(dirname(outputMd), { recursive: true });
  await writeFile(outputJson, `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(outputMd, renderMarkdown(report));

  console.log('Kosmo local worker innovation launch owner card check');
  console.log(`Status: ${report.status}`);
  console.log(`Checks: ${report.summary.passed}/${report.summary.checks}`);
  console.log(`Failures: ${report.summary.failures}`);
  console.log(`Wrote: ${relative(root, outputMd)}`);

  if (failures.length > 0) process.exitCode = 1;
}

function buildChecks(card) {
  const allowedIds = new Set((card.allowed_answers || []).map((answer) => answer.id));
  const hardStops = (card.hard_stops || []).join(' ').toLowerCase();
  return [
    check('status_ready', card.status === 'local_worker_innovation_launch_owner_card_ready', card.status),
    check('policy_card_only', card.policy?.card_only === true, card.policy?.card_only),
    check('policy_no_decision_now', card.policy?.records_owner_decision_now === false, card.policy?.records_owner_decision_now),
    check('policy_no_execution_now', card.policy?.executes_local_workers_now === false, card.policy?.executes_local_workers_now),
    check('policy_no_model_start', card.policy?.starts_models_now === false, card.policy?.starts_models_now),
    check('policy_no_private_reads', card.policy?.reads_private_content_now === false, card.policy?.reads_private_content_now),
    check('policy_no_worker_outputs', card.policy?.writes_worker_outputs_now === false, card.policy?.writes_worker_outputs_now),
    check('policy_no_repo_outputs', card.policy?.writes_repo_outputs_now === false, card.policy?.writes_repo_outputs_now),
    check('policy_no_training_promotion', card.policy?.promotes_training_rows_now === false, card.policy?.promotes_training_rows_now),
    check('public_ready_zero', card.summary?.public_ready_after_card === 0 && card.policy?.public_ready_after_card === 0, card.summary?.public_ready_after_card),
    check('five_tasks', card.summary?.tasks === 5 && (card.tasks || []).length === 5, `${(card.tasks || []).length}/${card.summary?.tasks}`),
    check('dry_run_ready_five', card.summary?.dry_run_ready_tasks === 5, card.summary?.dry_run_ready_tasks),
    check('validator_fixture_guarded', card.summary?.validator_fixture_guarded === true, card.summary?.validator_fixture_guarded),
    check('recommended_hold', card.summary?.recommended_choice === 'hold_dry_run_ready', card.summary?.recommended_choice),
    check('allowed_answers_present', allowedIds.has('hold_dry_run_ready') && allowedIds.has('approve_separate_source_free_launch_later') && allowedIds.has('reject_or_rework_worker_launch'), [...allowedIds].join(', ')),
    check('exact_reply_source_free', String(card.exact_reply_template_for_later_launch || '').includes('confirmed_source_free_only=yes'), card.exact_reply_template_for_later_launch),
    check('exact_reply_no_private', String(card.exact_reply_template_for_later_launch || '').includes('confirmed_no_private_content=yes'), card.exact_reply_template_for_later_launch),
    check('tasks_no_execute_now', (card.tasks || []).every((task) => task.execute_now === false), (card.tasks || []).length),
    check('hard_stop_no_execution', hardStops.includes('does not execute') || hardStops.includes('do not start models'), hardStops),
    check('hard_stop_no_private', hardStops.includes('private source root') && hardStops.includes('onedrive'), hardStops),
    check('hard_stop_no_public_ready', hardStops.includes('public-ready'), hardStops)
  ];
}

function check(id, condition, evidence) {
  return {
    id,
    status: condition ? 'passed' : 'failed',
    evidence
  };
}

function renderMarkdown(report) {
  const lines = [];
  lines.push('# Kosmo Local Worker Innovation Launch Owner Card Check');
  lines.push('');
  lines.push(`Generated: ${report.generated_at}`);
  lines.push(`Status: \`${report.status}\``);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Checks: ${report.summary.passed}/${report.summary.checks}`);
  lines.push(`- Failures: ${report.summary.failures}`);
  lines.push(`- Tasks: ${report.summary.tasks}`);
  lines.push(`- Recommended choice: ${report.summary.recommended_choice}`);
  lines.push(`- Public-ready after check: ${report.summary.public_ready_after_check}`);
  lines.push('');
  lines.push('## Checks');
  lines.push('');
  report.checks.forEach((checkItem) => {
    lines.push(`- ${checkItem.status}: \`${checkItem.id}\` - ${String(checkItem.evidence ?? '-')}`);
  });
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
