#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = new Date().toISOString().slice(0, 10);

const paths = {
  validator: resolve(root, args.validator || `data/kosmo-owner-unlock-reply-validator-${dateStamp}.json`),
  validatorCheck: resolve(root, args.validatorCheck || `data/kosmo-owner-unlock-reply-validator-check-${dateStamp}.json`),
  smoke: resolve(root, args.smoke || `data/kosmo-owner-unlock-reply-validator-smoke-${dateStamp}.json`),
  smokeCheck: resolve(root, args.smokeCheck || `data/kosmo-owner-unlock-reply-validator-smoke-check-${dateStamp}.json`),
  intakeMap: resolve(root, args.intakeMap || `data/kosmo-owner-unlock-reply-intake-map-${dateStamp}.json`),
  intakeMapCheck: resolve(root, args.intakeMapCheck || `data/kosmo-owner-unlock-reply-intake-map-check-${dateStamp}.json`),
  runbook: resolve(root, args.runbook || `data/kosmo-owner-unlock-execution-runbook-${dateStamp}.json`),
  runbookCheck: resolve(root, args.runbookCheck || `data/kosmo-owner-unlock-execution-runbook-check-${dateStamp}.json`),
  syncBoard: resolve(root, args.syncBoard || `data/kosmo-overseer-sync-board-${dateStamp}.json`)
};

const outputJson = resolve(root, args.out || `data/kosmo-owner-unlock-pipeline-checkpoint-${dateStamp}.json`);
const outputMd = resolve(root, args.markdown || `docs/codex/kosmo-owner-unlock-pipeline-checkpoint-${dateStamp}.md`);

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const reports = {};
  for (const [key, path] of Object.entries(paths)) {
    reports[key] = await readJson(path);
  }

  const checkpoint = buildCheckpoint(reports);
  await mkdir(dirname(outputJson), { recursive: true });
  await mkdir(dirname(outputMd), { recursive: true });
  await writeFile(outputJson, `${JSON.stringify(checkpoint, null, 2)}\n`);
  await writeFile(outputMd, renderMarkdown(checkpoint));

  console.log('Kosmo owner unlock pipeline checkpoint');
  console.log(`Status: ${checkpoint.status}`);
  console.log(`Components: ${checkpoint.summary.components_ready}/${checkpoint.summary.components}`);
  console.log(`Guard checks: ${checkpoint.summary.guard_checks_passed}/${checkpoint.summary.guard_checks}`);
  console.log(`Latest handoffs: ${checkpoint.summary.latest_handoff_min}-${checkpoint.summary.latest_handoff_max}`);
  console.log(`Public-ready after checkpoint: ${checkpoint.summary.public_ready_after_checkpoint}`);
  console.log(`Wrote: ${relative(root, outputMd)}`);
}

function buildCheckpoint(reports) {
  const components = [
    component('reply-validator', reports.validator.status, 'owner_unlock_reply_validator_pending_owner_reply', reports.validator.summary?.public_ready_after_validation),
    component('reply-validator-guard', reports.validatorCheck.status, 'owner_unlock_reply_validator_guard_passed', reports.validatorCheck.summary?.public_ready_after_check),
    component('reply-smoke', reports.smoke.status, 'owner_unlock_reply_validator_smoke_passed', reports.smoke.summary?.public_ready_after_smoke),
    component('reply-smoke-guard', reports.smokeCheck.status, 'owner_unlock_reply_validator_smoke_guard_passed', reports.smokeCheck.summary?.public_ready_after_check),
    component('intake-map', reports.intakeMap.status, 'owner_unlock_reply_intake_map_pending_owner_reply', reports.intakeMap.summary?.public_ready_after_map),
    component('intake-map-guard', reports.intakeMapCheck.status, 'owner_unlock_reply_intake_map_guard_passed', reports.intakeMapCheck.summary?.public_ready_after_check),
    component('execution-runbook', reports.runbook.status, 'owner_unlock_execution_runbook_ready', reports.runbook.summary?.public_ready_after_runbook),
    component('execution-runbook-guard', reports.runbookCheck.status, 'owner_unlock_execution_runbook_guard_passed', reports.runbookCheck.summary?.public_ready_after_check),
    component('overseer-sync-board', reports.syncBoard.status, 'overseer_sync_board_ready', reports.syncBoard.summary?.public_ready_after_board)
  ];
  const handoffNumbers = (reports.syncBoard.latest_handoffs || [])
    .map((handoff) => Number((handoff.filename.match(/synergiebericht-(\d+)/) || [])[1]))
    .filter(Number.isFinite);
  const guardChecks = [
    reports.validatorCheck.summary?.checks,
    reports.smokeCheck.summary?.checks,
    reports.intakeMapCheck.summary?.checks,
    reports.runbookCheck.summary?.checks
  ].reduce((sum, value) => sum + Number(value || 0), 0);
  const guardChecksPassed = [
    reports.validatorCheck.summary?.passed,
    reports.smokeCheck.summary?.passed,
    reports.intakeMapCheck.summary?.passed,
    reports.runbookCheck.summary?.passed
  ].reduce((sum, value) => sum + Number(value || 0), 0);

  return {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    status: components.every((item) => item.ready) && guardChecks === guardChecksPassed
      ? 'owner_unlock_pipeline_checkpoint_ready'
      : 'owner_unlock_pipeline_checkpoint_attention_required',
    policy: {
      checkpoint_only: true,
      records_decisions: false,
      writes_intake_file_now: false,
      mutates_session_files_now: false,
      executes_commands_now: false,
      reads_private_content_now: false,
      runs_private_inventory_now: false,
      public_ready_after_checkpoint: 0
    },
    source_refs: Object.values(paths).map((path) => relative(root, path)),
    summary: {
      components: components.length,
      components_ready: components.filter((item) => item.ready).length,
      guard_checks: guardChecks,
      guard_checks_passed: guardChecksPassed,
      latest_handoff_min: Math.min(...handoffNumbers),
      latest_handoff_max: Math.max(...handoffNumbers),
      latest_handoff_count: handoffNumbers.length,
      owner_reply_state: 'pending',
      source_root_state: 'blocked_until_explicit_owner_reply_and_guards',
      public_ready_after_checkpoint: 0
    },
    components,
    next_actions: [
      'Wait for explicit owner reply in the Owner Unlock Prompt format.',
      'Run the execution runbook sequence; do not skip validator, intake map, or human review gates.',
      'Keep private inventory blocked until source-root guards pass.'
    ],
    hard_stops: [
      'Do not treat this checkpoint as owner approval.',
      'Do not read private content from this checkpoint.',
      'Do not run private inventory from this checkpoint.',
      'Do not mark private-derived material public-ready.'
    ]
  };
}

function component(id, actual, expected, publicReady) {
  return {
    id,
    actual_status: actual,
    expected_status: expected,
    ready: actual === expected,
    public_ready_after_component: publicReady ?? null
  };
}

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

function renderMarkdown(report) {
  const lines = [];
  lines.push('# Kosmo Owner Unlock Pipeline Checkpoint');
  lines.push('');
  lines.push(`Generated: ${report.generated_at}`);
  lines.push(`Status: \`${report.status}\``);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Components: ${report.summary.components_ready}/${report.summary.components}`);
  lines.push(`- Guard checks: ${report.summary.guard_checks_passed}/${report.summary.guard_checks}`);
  lines.push(`- Latest handoffs: ${report.summary.latest_handoff_min}-${report.summary.latest_handoff_max}`);
  lines.push(`- Owner reply state: ${report.summary.owner_reply_state}`);
  lines.push(`- Source-root state: ${report.summary.source_root_state}`);
  lines.push(`- Public-ready after checkpoint: ${report.summary.public_ready_after_checkpoint}`);
  lines.push('');
  lines.push('## Components');
  lines.push('');
  report.components.forEach((item) => {
    lines.push(`- ${item.ready ? 'ready' : 'attention'}: \`${item.id}\` -> \`${item.actual_status}\``);
  });
  lines.push('');
  lines.push('## Next Actions');
  lines.push('');
  report.next_actions.forEach((action) => lines.push(`- ${action}`));
  lines.push('');
  lines.push('## Hard Stops');
  lines.push('');
  report.hard_stops.forEach((item) => lines.push(`- ${item}`));
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
