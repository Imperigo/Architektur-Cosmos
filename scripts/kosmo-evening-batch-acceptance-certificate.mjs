#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = new Date().toISOString().slice(0, 10);

const roadmapCheckPath = resolve(root, args.roadmapCheck || `data/kosmo-vision-completion-roadmap-check-${dateStamp}.json`);
const rollupCheckPath = resolve(root, args.rollupCheck || `data/kosmo-evening-batch-rollup-check-${dateStamp}.json`);
const nextShiftCheckPath = resolve(root, args.nextShiftCheck || `data/kosmo-overseer-next-shift-brief-check-${dateStamp}.json`);
const checkpointPath = resolve(root, args.checkpoint || `data/kosmo-owner-unlock-pipeline-checkpoint-${dateStamp}.json`);
const checkpointCheckPath = resolve(root, args.checkpointCheck || `data/kosmo-owner-unlock-pipeline-checkpoint-check-${dateStamp}.json`);
const syncBoardCheckPath = resolve(root, args.syncBoardCheck || `data/kosmo-overseer-sync-board-check-${dateStamp}.json`);
const outputJson = resolve(root, args.out || `data/kosmo-evening-batch-acceptance-certificate-${dateStamp}.json`);
const outputMd = resolve(root, args.markdown || `docs/codex/kosmo-evening-batch-acceptance-certificate-${dateStamp}.md`);

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const roadmapCheck = await readJson(roadmapCheckPath);
  const rollupCheck = await readJson(rollupCheckPath);
  const nextShiftCheck = await readJson(nextShiftCheckPath);
  const checkpoint = await readJson(checkpointPath);
  const checkpointCheck = await readJson(checkpointCheckPath);
  const syncBoardCheck = await readJson(syncBoardCheckPath);
  const report = buildReport({
    roadmapCheck,
    rollupCheck,
    nextShiftCheck,
    checkpoint,
    checkpointCheck,
    syncBoardCheck
  });

  await mkdir(dirname(outputJson), { recursive: true });
  await mkdir(dirname(outputMd), { recursive: true });
  await writeFile(outputJson, `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(outputMd, renderMarkdown(report));

  console.log('Kosmo evening batch acceptance certificate');
  console.log(`Status: ${report.status}`);
  console.log(`Guard families: ${report.summary.guard_families}`);
  console.log(`Known guard checks passed: ${report.summary.known_guard_checks_passed}`);
  console.log(`Latest handoff max: ${report.summary.latest_handoff_max}`);
  console.log(`Public-ready after certificate: ${report.summary.public_ready_after_certificate}`);
  console.log(`Wrote: ${relative(root, outputMd)}`);

  if (report.failures.length > 0) process.exitCode = 1;
}

function buildReport({ roadmapCheck, rollupCheck, nextShiftCheck, checkpoint, checkpointCheck, syncBoardCheck }) {
  const guardFamilies = [
    guard('vision_roadmap', roadmapCheck.status, roadmapCheck.summary?.passed, roadmapCheck.summary?.checks, roadmapCheck.summary?.failures),
    guard('evening_rollup', rollupCheck.status, rollupCheck.summary?.passed, rollupCheck.summary?.checks, rollupCheck.summary?.failures),
    guard('next_shift', nextShiftCheck.status, nextShiftCheck.summary?.passed, nextShiftCheck.summary?.checks, nextShiftCheck.summary?.failures),
    guard('owner_unlock_checkpoint', checkpointCheck.status, checkpointCheck.summary?.passed, checkpointCheck.summary?.checks, checkpointCheck.summary?.failures),
    guard('overseer_sync_board', syncBoardCheck.status, passedFindings(syncBoardCheck), totalFindings(syncBoardCheck), syncBoardCheck.summary?.failures)
  ];
  const failures = [];
  guardFamilies.forEach((item) => {
    if (item.failures !== 0) failures.push(`${item.id} failures: ${item.failures}`);
    if (item.passed !== item.checks) failures.push(`${item.id} incomplete: ${item.passed}/${item.checks}`);
  });
  if ((checkpoint.summary?.latest_handoff_max ?? 0) < 207) failures.push(`Latest handoff max too old: ${checkpoint.summary?.latest_handoff_max}`);

  return {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    status: failures.length === 0
      ? 'evening_batch_acceptance_certificate_ready'
      : 'evening_batch_acceptance_certificate_needs_review',
    policy: {
      certificate_only: true,
      reads_private_content_now: false,
      records_owner_decisions: false,
      runs_private_inventory_now: false,
      executes_local_workers_now: false,
      creates_eval_rows_now: false,
      writes_training_data_now: false,
      public_ready_after_certificate: 0
    },
    source_refs: [
      relative(root, roadmapCheckPath),
      relative(root, rollupCheckPath),
      relative(root, nextShiftCheckPath),
      relative(root, checkpointPath),
      relative(root, checkpointCheckPath),
      relative(root, syncBoardCheckPath)
    ],
    summary: {
      guard_families: guardFamilies.length,
      known_guard_checks_passed: guardFamilies.reduce((sum, item) => sum + item.passed, 0),
      known_guard_checks_total: guardFamilies.reduce((sum, item) => sum + item.checks, 0),
      latest_handoff_min: checkpoint.summary?.latest_handoff_min ?? null,
      latest_handoff_max: checkpoint.summary?.latest_handoff_max ?? null,
      owner_reply_status: checkpoint.summary?.owner_reply_status ?? 'pending',
      public_ready_after_certificate: 0,
      failures: failures.length
    },
    guard_families: guardFamilies,
    acceptance_statement: 'Evening batch is accepted as source-free, review-only, handoff-synced and blocked on explicit owner source-root reply.',
    hard_stops: [
      'Do not treat this certificate as owner approval.',
      'Do not run private inventory, OCR, embeddings, fine-tuning or local worker execution from this certificate.',
      'Do not create eval rows or queue items from this certificate.',
      'Keep public-ready at 0.'
    ],
    failures
  };
}

function guard(id, status, passed = 0, checks = 0, failures = 0) {
  return { id, status, passed, checks, failures };
}

function totalFindings(report) {
  return (report.findings || []).length;
}

function passedFindings(report) {
  return (report.findings || []).filter((finding) => finding.severity === 'passed').length;
}

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

function renderMarkdown(report) {
  const lines = [];
  lines.push('# Kosmo Evening Batch Acceptance Certificate');
  lines.push('');
  lines.push(`Generated: ${report.generated_at}`);
  lines.push(`Status: \`${report.status}\``);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Guard families: ${report.summary.guard_families}`);
  lines.push(`- Known guard checks: ${report.summary.known_guard_checks_passed}/${report.summary.known_guard_checks_total}`);
  lines.push(`- Latest handoffs: ${report.summary.latest_handoff_min}-${report.summary.latest_handoff_max}`);
  lines.push(`- Owner reply status: ${report.summary.owner_reply_status}`);
  lines.push(`- Public-ready after certificate: ${report.summary.public_ready_after_certificate}`);
  lines.push('');
  lines.push('## Guard Families');
  lines.push('');
  report.guard_families.forEach((item) => {
    lines.push(`- \`${item.id}\`: ${item.status}, ${item.passed}/${item.checks}, failures ${item.failures}`);
  });
  lines.push('');
  lines.push('## Acceptance');
  lines.push('');
  lines.push(report.acceptance_statement);
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
