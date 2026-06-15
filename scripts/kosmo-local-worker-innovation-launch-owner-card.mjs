#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = new Date().toISOString().slice(0, 10);

const refs = {
  dryRun: resolve(root, args.dryRun || `data/kosmo-local-worker-innovation-launch-dry-run-${dateStamp}.json`),
  dryRunCheck: resolve(root, args.dryRunCheck || `data/kosmo-local-worker-innovation-launch-dry-run-check-${dateStamp}.json`),
  validatorFixtures: resolve(root, args.validatorFixtures || `data/kosmo-local-worker-innovation-output-validator-fixtures-${dateStamp}.json`),
  validatorFixturesCheck: resolve(root, args.validatorFixturesCheck || `data/kosmo-local-worker-innovation-output-validator-fixtures-check-${dateStamp}.json`),
  orbitBridge: resolve(root, args.orbitBridge || `data/kosmo-orbit-status-bridge-${dateStamp}.json`)
};

const outputJson = resolve(root, args.out || `data/kosmo-local-worker-innovation-launch-owner-card-${dateStamp}.json`);
const outputMd = resolve(root, args.markdown || `docs/codex/kosmo-local-worker-innovation-launch-owner-card-${dateStamp}.md`);

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const reports = {};
  for (const [key, path] of Object.entries(refs)) reports[key] = await readJson(path);
  const card = buildCard(reports);

  await mkdir(dirname(outputJson), { recursive: true });
  await mkdir(dirname(outputMd), { recursive: true });
  await writeFile(outputJson, `${JSON.stringify(card, null, 2)}\n`);
  await writeFile(outputMd, renderMarkdown(card));

  console.log('Kosmo local worker innovation launch owner card');
  console.log(`Status: ${card.status}`);
  console.log(`Tasks: ${card.summary.tasks}`);
  console.log(`Recommended choice: ${card.summary.recommended_choice}`);
  console.log(`Execute now: ${card.summary.execute_now}`);
  console.log(`Public-ready after card: ${card.summary.public_ready_after_card}`);
  console.log(`Wrote: ${relative(root, outputMd)}`);
}

function buildCard(reports) {
  const failures = [];
  if (reports.dryRun.status !== 'local_worker_innovation_launch_dry_run_ready') failures.push(`Dry run not ready: ${reports.dryRun.status}`);
  if (reports.dryRunCheck.status !== 'local_worker_innovation_launch_dry_run_guard_passed') failures.push(`Dry run guard not passed: ${reports.dryRunCheck.status}`);
  if (reports.validatorFixtures.status !== 'local_worker_innovation_output_validator_fixtures_passed') failures.push(`Validator fixtures not passed: ${reports.validatorFixtures.status}`);
  if (reports.validatorFixturesCheck.status !== 'local_worker_innovation_output_validator_fixtures_guard_passed') failures.push(`Validator fixtures guard not passed: ${reports.validatorFixturesCheck.status}`);
  if (reports.dryRun.summary?.execute_now !== 0) failures.push('Dry run allows execution now.');
  if (reports.dryRun.summary?.explicit_gate_required !== 5) failures.push('Not all tasks require explicit gate.');

  const tasks = (reports.dryRun.tasks || []).map((task) => ({
    task_id: task.task_id,
    lane: task.lane,
    source_repo: task.source_repo,
    output_status: task.output_status,
    training_eval_lane: task.training_eval_lane,
    execute_now: false,
    recommended_choice: 'hold_dry_run_ready',
    risk_level: riskForLane(task.lane),
    owner_visible_summary: summaryForLane(task.lane)
  }));

  return {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    status: failures.length === 0
      ? 'local_worker_innovation_launch_owner_card_ready'
      : 'local_worker_innovation_launch_owner_card_needs_review',
    policy: {
      card_only: true,
      records_owner_decision_now: false,
      executes_local_workers_now: false,
      starts_models_now: false,
      reads_private_content_now: false,
      writes_worker_outputs_now: false,
      writes_repo_outputs_now: false,
      promotes_training_rows_now: false,
      public_ready_after_card: 0
    },
    source_refs: Object.values(refs).map((path) => relative(root, path)),
    summary: {
      tasks: tasks.length,
      dry_run_ready_tasks: reports.dryRun.summary?.dry_run_ready_tasks ?? null,
      validator_fixture_guarded: reports.dryRun.summary?.validator_fixture_guarded === true,
      positive_fixture_status: reports.validatorFixtures.summary?.positive_validator_status || null,
      negative_fixture_status: reports.validatorFixtures.summary?.negative_validator_status || null,
      recommended_choice: 'hold_dry_run_ready',
      execute_now: 0,
      public_ready_after_card: 0,
      failures: failures.length
    },
    question: 'Soll der lokale LLM spaeter die 5 source-free GitHub-Innovation-Tasks bearbeiten, nachdem ein separater expliziter Launch-Befehl gegeben wurde?',
    recommended_answer: {
      id: 'hold_dry_run_ready',
      label: 'Noch halten, Dry-Run ist bereit',
      reason: 'Die Kette ist vorbereitet und getestet, aber echte lokale Worker-Ausfuehrung soll erst mit separatem, bewusstem Launch erfolgen.'
    },
    allowed_answers: [
      {
        id: 'hold_dry_run_ready',
        effect: 'Keine Ausfuehrung. Morgenroutine prueft die Gates weiter.'
      },
      {
        id: 'approve_separate_source_free_launch_later',
        effect: 'Erlaubt spaeter einen separaten Launch-Batch, aber nicht aus dieser Card heraus.'
      },
      {
        id: 'reject_or_rework_worker_launch',
        effect: 'Launch-Pfad bleibt blockiert; Codex/Claude ueberarbeiten Tasks oder Guards.'
      }
    ],
    exact_reply_template_for_later_launch: [
      'local_worker_innovation_launch_choice=approve_separate_source_free_launch_later',
      'confirmed_source_free_only=yes',
      'confirmed_no_private_content=yes',
      'confirmed_run_validator_after_outputs=yes',
      'note=Nur die 5 GitHub-Innovation-Fixture-Tasks duerfen in einem separaten Launch-Batch laufen.'
    ].join('; '),
    tasks,
    hard_stops: [
      'This card does not execute local workers.',
      'Do not start models from this card.',
      'Do not read private Source Root or private libraries.',
      'Do not use private PDFs, scans, OCR text or OneDrive content.',
      'Do not clone or execute referenced GitHub repositories.',
      'Do not promote training rows or public-ready outputs.'
    ],
    failures
  };
}

function riskForLane(lane) {
  if (lane === 'worker_integration') return 'medium_command_boundary';
  if (lane === 'kosmo_prepare') return 'medium_document_adapter';
  if (lane === 'kosmo_asset') return 'medium_asset_schema';
  return 'medium_review_required';
}

function summaryForLane(lane) {
  if (lane === 'worker_integration') return 'Worker-boundary and command-safety review using synthetic payloads only.';
  if (lane === 'kosmo_prepare') return 'Document/OCR adapter-shape review using synthetic payloads only.';
  if (lane === 'kosmo_asset') return 'Asset metadata/retrieval-shape review using synthetic payloads only.';
  return 'Source-free fixture review.';
}

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

function renderMarkdown(card) {
  const lines = [];
  lines.push('# Kosmo Local Worker Innovation Launch Owner Card');
  lines.push('');
  lines.push(`Generated: ${card.generated_at}`);
  lines.push(`Status: \`${card.status}\``);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Tasks: ${card.summary.tasks}`);
  lines.push(`- Dry-run ready tasks: ${card.summary.dry_run_ready_tasks}`);
  lines.push(`- Validator fixture guarded: ${card.summary.validator_fixture_guarded ? 'yes' : 'no'}`);
  lines.push(`- Positive fixture: ${card.summary.positive_fixture_status}`);
  lines.push(`- Negative fixture: ${card.summary.negative_fixture_status}`);
  lines.push(`- Recommended choice: ${card.summary.recommended_choice}`);
  lines.push(`- Execute now: ${card.summary.execute_now}`);
  lines.push(`- Public-ready after card: ${card.summary.public_ready_after_card}`);
  lines.push(`- Failures: ${card.summary.failures}`);
  lines.push('');
  lines.push('## Question');
  lines.push('');
  lines.push(card.question);
  lines.push('');
  lines.push('## Recommended Answer');
  lines.push('');
  lines.push(`- \`${card.recommended_answer.id}\`: ${card.recommended_answer.reason}`);
  lines.push('');
  lines.push('## Allowed Answers');
  lines.push('');
  card.allowed_answers.forEach((answer) => lines.push(`- \`${answer.id}\`: ${answer.effect}`));
  lines.push('');
  lines.push('## Exact Reply Template For Later Launch');
  lines.push('');
  lines.push('```text');
  lines.push(card.exact_reply_template_for_later_launch);
  lines.push('```');
  lines.push('');
  lines.push('## Tasks');
  lines.push('');
  lines.push('| Task | Lane | Risk | Output |');
  lines.push('| --- | --- | --- | --- |');
  card.tasks.forEach((task) => {
    lines.push(`| \`${task.task_id}\` | ${task.lane} | ${task.risk_level} | ${task.output_status} |`);
  });
  lines.push('');
  lines.push('## Hard Stops');
  lines.push('');
  card.hard_stops.forEach((stop) => lines.push(`- ${stop}`));
  lines.push('');
  if (card.failures.length > 0) {
    lines.push('## Failures');
    lines.push('');
    card.failures.forEach((failure) => lines.push(`- ${failure}`));
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
    if (next && !next.startsWith('--')) {
      parsed[key] = next;
      index += 1;
    } else {
      parsed[key] = true;
    }
  }
  return parsed;
}
