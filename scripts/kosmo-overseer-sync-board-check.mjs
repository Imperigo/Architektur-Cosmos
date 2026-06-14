#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = new Date().toISOString().slice(0, 10);
const boardPath = resolve(root, args.board || `data/kosmo-overseer-sync-board-${dateStamp}.json`);
const outputJson = resolve(root, args.out || `data/kosmo-overseer-sync-board-check-${dateStamp}.json`);
const outputMd = resolve(root, args.markdown || `docs/codex/kosmo-overseer-sync-board-check-${dateStamp}.md`);

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const board = JSON.parse(await readFile(boardPath, 'utf8'));
  const findings = [
    ...checkPolicy(board),
    ...checkSummary(board),
    ...checkInboxes(board),
    ...checkHandoffs(board),
    ...checkBlockers(board)
  ];
  const failures = findings.filter((finding) => finding.severity === 'failure');
  const warnings = findings.filter((finding) => finding.severity === 'warning');

  const report = {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    status: failures.length === 0 ? 'overseer_sync_board_guard_passed' : 'overseer_sync_board_guard_failed',
    policy: {
      records_decisions: false,
      writes_session_files: false,
      applies_decisions: false,
      writes_public_files: false,
      writes_public_manifest: false,
      public_ready_after_guard: 0,
      note: 'This guard validates overseer coordination state. It does not record owner answers or change data-lane decisions.'
    },
    source_refs: [relative(root, boardPath)],
    summary: {
      board_status: board.status,
      data_lane_steps: board.summary?.data_lane_steps ?? null,
      latest_handoffs: board.summary?.latest_handoffs ?? null,
      latest_handoff_mirror_missing_files: board.summary?.latest_handoff_mirror_missing_files ?? null,
      local_worker_outputs: board.summary?.local_worker_outputs ?? null,
      failures: failures.length,
      warnings: warnings.length,
      public_ready_after_guard: 0
    },
    findings,
    next_actions: failures.length === 0
      ? [
          'Use the overseer sync board as the current Codex/Claude/KosmoOverseer coordination entry point.',
          'Keep source-root, private inventory and owner-answer blockers in place.',
          'Rerun board and guard after any new handoff or owner-confirmed answer.'
        ]
      : [
          'Fix overseer sync board guard failures before relying on it for coordination.',
          'Rerun npm run kosmo:overseer-sync-board and npm run kosmo:overseer-sync-board-check.'
        ]
  };

  await mkdir(dirname(outputJson), { recursive: true });
  await mkdir(dirname(outputMd), { recursive: true });
  await writeFile(outputJson, `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(outputMd, renderMarkdown(report));

  console.log('Kosmo overseer sync board check');
  console.log(`Status: ${report.status}`);
  console.log(`Failures: ${report.summary.failures}`);
  console.log(`Warnings: ${report.summary.warnings}`);
  console.log(`Wrote: ${relative(root, outputMd)}`);

  if (failures.length > 0) process.exitCode = 1;
}

function checkPolicy(board) {
  const findings = [];
  expect(board.status === 'overseer_sync_board_ready', findings, 'board_ready', 'Overseer sync board must be ready.');
  expect(board.policy?.records_decisions === false, findings, 'records_decisions_false', 'Board must not record decisions.');
  expect(board.policy?.writes_session_files === false, findings, 'writes_session_files_false', 'Board must not write session files.');
  expect(board.policy?.applies_decisions === false, findings, 'applies_decisions_false', 'Board must not apply decisions.');
  expect(board.policy?.writes_public_files === false, findings, 'writes_public_files_false', 'Board must not write public files.');
  expect(board.policy?.writes_public_manifest === false, findings, 'writes_public_manifest_false', 'Board must not write public manifests.');
  expect(board.policy?.public_ready_after_board === 0, findings, 'public_ready_after_board_zero', 'Board policy must keep public-ready after board at 0.');
  return findings;
}

function checkSummary(board) {
  const summary = board.summary || {};
  const findings = [];
  expect(summary.data_lane_status === 'kosmodata_lane_sweep_review_only_passed', findings, 'data_lane_passed', 'Data lane must be review-only passed.');
  expect(isCompleteStepRatio(summary.data_lane_steps), findings, 'data_lane_steps_complete', 'Data lane must report all steps passed.');
  expect(summary.router_status === 'worker_router_guarded_review_only', findings, 'router_guarded', 'Router must remain guarded review-only.');
  expect(summary.checkpoint_status === 'night_loop_guarded_ready', findings, 'checkpoint_guarded', 'Night-loop checkpoint must remain guarded ready.');
  expect(summary.session_brief_guard_status === 'owner_review_session_brief_guard_passed', findings, 'session_brief_guard_passed', 'Session brief guard must pass.');
  expect(summary.session_brief_failures === 0, findings, 'session_brief_failures_zero', 'Session brief guard failures must be 0.');
  expect(summary.local_worker_review_status === 'local_worker_outputs_present_review_only', findings, 'local_worker_review_only', 'Local worker review must be review-only present.');
  expect(summary.local_worker_outputs === '8/8', findings, 'local_worker_outputs_8', 'Local worker outputs must be 8/8.');
  expect(summary.local_worker_high_risk_hits === 0, findings, 'local_worker_risk_zero', 'Local worker high-risk hits must be 0.');
  expect(summary.latest_handoffs === 8, findings, 'latest_handoff_count', 'Board must track eight latest handoffs.');
  expect(summary.latest_handoff_mirror_missing_files === 0, findings, 'latest_mirror_missing_zero', 'Latest handoffs must have 0 mirror-missing files.');
  expect(summary.public_ready_after_board === 0, findings, 'summary_public_ready_zero', 'Board summary must keep public-ready at 0.');
  return findings;
}

function checkInboxes(board) {
  const findings = [];
  const inboxes = board.handoff_inboxes || [];
  expect(inboxes.length === 2, findings, 'two_handoff_inboxes', 'Board must track two handoff inboxes.');
  for (const inbox of inboxes) {
    expect(inbox.exists === true, findings, `inbox_exists:${inbox.path}`, `Handoff inbox must exist: ${inbox.path}`);
    expect((inbox.files ?? 0) > 0, findings, `inbox_has_files:${inbox.path}`, `Handoff inbox must contain files: ${inbox.path}`);
  }
  return findings;
}

function checkHandoffs(board) {
  const findings = [];
  const handoffs = board.latest_handoffs || [];
  expect(handoffs.length === 8, findings, 'latest_handoffs_array_count', 'Latest handoff array must contain eight items.');
  const latestNumber = Math.max(...handoffs.map((handoff) => handoffNumber(handoff.filename)));
  expect(latestNumber >= 115, findings, 'latest_handoff_includes_115', 'Latest handoffs must include synergiebericht 115 or newer.');
  for (const handoff of handoffs) {
    expect(handoff.mirrored_inboxes === 2, findings, `handoff_mirrored:${handoff.filename}`, `${handoff.filename} must be mirrored in both inboxes.`);
    expect(typeof handoff.title === 'string' && handoff.title.length > 10, findings, `handoff_title:${handoff.filename}`, `${handoff.filename} must include a title.`);
  }
  return findings;
}

function checkBlockers(board) {
  const blockers = new Map((board.blockers || []).map((blocker) => [blocker.id, blocker]));
  const findings = [];
  expect(blockers.get('source_root_pending')?.status === 'blocked', findings, 'source_root_blocked', 'Source-root blocker must remain blocked.');
  expect(blockers.get('private_inventory_pending')?.status === 'blocked', findings, 'private_inventory_blocked', 'Private inventory blocker must remain blocked.');
  expect(blockers.get('owner_answers_pending')?.status === 'blocked', findings, 'owner_answers_blocked', 'Owner answers blocker must remain blocked.');
  expect(blockers.get('public_ready_zero')?.status === 'passed', findings, 'public_ready_zero_passed', 'Public-ready-zero invariant must pass.');
  return findings;
}

function handoffNumber(filename = '') {
  const match = filename.match(/synergiebericht-(\d+)/);
  return match ? Number(match[1]) : 0;
}

function isCompleteStepRatio(value) {
  const match = String(value ?? '').match(/^(\d+)\/(\d+)$/);
  if (!match) return false;
  const passed = Number(match[1]);
  const total = Number(match[2]);
  return total > 0 && passed === total;
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
  lines.push('# Kosmo Overseer Sync Board Check');
  lines.push('');
  lines.push(`Generated: ${report.generated_at}`);
  lines.push(`Status: \`${report.status}\``);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Board status: ${report.summary.board_status}`);
  lines.push(`- Data lane steps: ${report.summary.data_lane_steps}`);
  lines.push(`- Latest handoffs: ${report.summary.latest_handoffs}`);
  lines.push(`- Latest handoff mirror missing files: ${report.summary.latest_handoff_mirror_missing_files}`);
  lines.push(`- Local worker outputs: ${report.summary.local_worker_outputs}`);
  lines.push(`- Failures: ${report.summary.failures}`);
  lines.push(`- Warnings: ${report.summary.warnings}`);
  lines.push(`- Public-ready after guard: ${report.summary.public_ready_after_guard}`);
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
