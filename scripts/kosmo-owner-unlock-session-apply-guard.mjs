#!/usr/bin/env node

import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = new Date().toISOString().slice(0, 10);

const previewPath = resolve(root, args.preview || `data/kosmo-owner-unlock-session-edit-preview-${dateStamp}.json`);
const sessionPath = resolve(root, args.session || `examples/kosmo-references/provenance/source-root-decision-session-${dateStamp}.json`);
const outputJson = resolve(root, args.out || `data/kosmo-owner-unlock-session-apply-guard-${dateStamp}.json`);
const outputMd = resolve(root, args.markdown || `docs/codex/kosmo-owner-unlock-session-apply-guard-${dateStamp}.md`);

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const preview = JSON.parse(await readFile(previewPath, 'utf8'));
  const session = JSON.parse(await readFile(sessionPath, 'utf8'));
  const report = await buildReport({ preview, session });

  await mkdir(dirname(outputJson), { recursive: true });
  await mkdir(dirname(outputMd), { recursive: true });
  await writeFile(outputJson, `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(outputMd, renderMarkdown(report));

  console.log('Kosmo owner unlock session apply guard');
  console.log(`Status: ${report.status}`);
  console.log(`Mode: ${report.summary.mode}`);
  console.log(`Target file: ${report.summary.target_file}`);
  console.log(`Matches preview: ${report.summary.matches_preview ? 'yes' : 'no'}`);
  console.log(`Private diagnostic allowed after apply: ${report.summary.private_diagnostic_allowed_after_apply ? 'yes' : 'no'}`);
  console.log(`Failures: ${report.summary.failures}`);
  console.log(`Public-ready after guard: ${report.summary.public_ready_after_guard}`);
  console.log(`Wrote: ${relative(root, outputMd)}`);

  if (report.failures.length > 0) process.exitCode = 1;
}

async function buildReport({ preview, session }) {
  const failures = [];
  const warnings = [];
  const expectedTarget = `examples/kosmo-references/provenance/source-root-decision-session-${dateStamp}.json`;
  const sourceEdit = (preview.preview_edits || []).find((edit) => edit.id === 'source-root-session-record-preview');
  const proposed = sourceEdit?.proposed || {};
  const current = sourceEdit?.current || {};
  const targetFile = sourceEdit?.target_file || null;

  if (preview.status !== 'owner_unlock_session_edit_preview_ready') failures.push(`Preview is not ready: ${preview.status}`);
  if (targetFile !== expectedTarget) failures.push(`Preview target file is not current session: ${targetFile}`);
  if (relative(root, sessionPath) !== expectedTarget) failures.push(`Session path is not current expected target: ${relative(root, sessionPath)}`);
  if (preview.summary?.writes_now !== false) failures.push('Preview writes now.');
  if (preview.summary?.public_ready_after_preview !== 0) failures.push('Preview changes public-ready.');
  if (session.policy?.auto_inventory !== false) failures.push('Session auto_inventory must stay false.');
  if (session.policy?.reads_private_content !== false) failures.push('Session reads_private_content must stay false.');
  if (session.policy?.copies_private_content !== false) failures.push('Session copies_private_content must stay false.');
  if (session.policy?.writes_public_files !== false) failures.push('Session writes_public_files must stay false.');
  if (session.policy?.writes_public_manifest !== false) failures.push('Session writes_public_manifest must stay false.');
  if (session.policy?.public_ready_after_session !== 0) failures.push('Session public_ready_after_session must stay 0.');

  const pendingMatchesCurrent = session.status === 'source_root_decision_session_pending' &&
    value(session.selected_decision) === value(current.selected_decision) &&
    value(session.selected_root_path) === value(current.selected_root_path) &&
    value(session.owner_note) === value(current.owner_note);
  const recordedMatchesProposed = session.status === 'source_root_decision_session_recorded' &&
    value(session.selected_decision) === value(proposed.selected_decision) &&
    value(session.selected_root_path) === value(proposed.selected_root_path) &&
    value(session.owner_note) === value(proposed.owner_note);

  let mode = 'needs_review';
  if (pendingMatchesCurrent) mode = 'waiting_for_manual_apply';
  else if (recordedMatchesProposed) mode = 'applied_matches_preview';
  else failures.push('Session state is neither untouched pending nor exactly applied from preview.');

  const selectedRootExists = proposed.selected_root_path ? await exists(proposed.selected_root_path) : false;
  if (recordedMatchesProposed && !selectedRootExists) failures.push(`Applied selected root is not visible: ${proposed.selected_root_path}`);
  if (pendingMatchesCurrent) warnings.push('Manual apply has not happened yet; private diagnostics remain blocked.');

  const privateDiagnosticAllowedAfterApply = recordedMatchesProposed &&
    proposed.selected_decision === 'select_existing_root_for_private_diagnostic' &&
    selectedRootExists &&
    failures.length === 0;

  return {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    status: failures.length === 0
      ? pendingMatchesCurrent
        ? 'owner_unlock_session_apply_guard_waiting_for_manual_apply'
        : 'owner_unlock_session_apply_guard_passed_after_manual_apply'
      : 'owner_unlock_session_apply_guard_failed',
    policy: {
      guard_only: true,
      writes_session_files_now: false,
      records_decisions_now: false,
      reads_private_content_now: false,
      runs_private_inventory_now: false,
      public_ready_after_guard: 0
    },
    source_refs: [
      relative(root, previewPath),
      relative(root, sessionPath)
    ],
    summary: {
      mode,
      target_file: expectedTarget,
      session_status: session.status,
      preview_status: preview.status,
      expected_selected_decision: proposed.selected_decision || null,
      actual_selected_decision: value(session.selected_decision),
      expected_selected_root_path: proposed.selected_root_path || null,
      actual_selected_root_path: value(session.selected_root_path),
      selected_root_exists: selectedRootExists,
      matches_preview: recordedMatchesProposed,
      untouched_pending: pendingMatchesCurrent,
      private_diagnostic_allowed_after_apply: privateDiagnosticAllowedAfterApply,
      failures: failures.length,
      warnings: warnings.length,
      public_ready_after_guard: 0
    },
    expected_after_apply: {
      status: 'source_root_decision_session_recorded',
      selected_decision: proposed.selected_decision || null,
      selected_root_path: proposed.selected_root_path || null,
      owner_note: proposed.owner_note || ''
    },
    next_actions: privateDiagnosticAllowedAfterApply
      ? [
          'Run npm run kosmo:source-root-decision-session-check.',
          'Run npm run kosmo:source-root-blocker-refresh.',
          'Run npm run kosmo:source-root-activation-preflight.',
          'Run npm run kosmo:source-root-post-owner-activation-queue and its guard.'
        ]
      : [
          'Do not run private metadata inventory.',
          'If exact owner reply is present and reviewed, apply only the expected_after_apply fields to the target session file.',
          'Rerun this guard before source-root activation preflight.'
        ],
    hard_stops: [
      'Do not apply this guard automatically.',
      'Do not infer approval from a broad freeform reply.',
      'Do not run private inventory while this guard is waiting.',
      'Do not change public-ready state.'
    ],
    failures,
    warnings
  };
}

function value(input) {
  const normalized = String(input ?? '').trim();
  return normalized || null;
}

async function exists(path) {
  try {
    await access(path, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

function renderMarkdown(report) {
  const lines = [];
  lines.push('# Kosmo Owner Unlock Session Apply Guard');
  lines.push('');
  lines.push(`Generated: ${report.generated_at}`);
  lines.push(`Status: \`${report.status}\``);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Mode: ${report.summary.mode}`);
  lines.push(`- Target file: \`${report.summary.target_file}\``);
  lines.push(`- Session status: ${report.summary.session_status}`);
  lines.push(`- Preview status: ${report.summary.preview_status}`);
  lines.push(`- Expected decision: ${report.summary.expected_selected_decision || '-'}`);
  lines.push(`- Actual decision: ${report.summary.actual_selected_decision || '-'}`);
  lines.push(`- Expected root path: ${report.summary.expected_selected_root_path || '-'}`);
  lines.push(`- Actual root path: ${report.summary.actual_selected_root_path || '-'}`);
  lines.push(`- Selected root exists: ${report.summary.selected_root_exists ? 'yes' : 'no'}`);
  lines.push(`- Matches preview: ${report.summary.matches_preview ? 'yes' : 'no'}`);
  lines.push(`- Untouched pending: ${report.summary.untouched_pending ? 'yes' : 'no'}`);
  lines.push(`- Private diagnostic allowed after apply: ${report.summary.private_diagnostic_allowed_after_apply ? 'yes' : 'no'}`);
  lines.push(`- Public-ready after guard: ${report.summary.public_ready_after_guard}`);
  lines.push('');
  lines.push('## Expected After Apply');
  lines.push('');
  lines.push('```json');
  lines.push(JSON.stringify(report.expected_after_apply, null, 2));
  lines.push('```');
  lines.push('');
  lines.push('## Next Actions');
  lines.push('');
  report.next_actions.forEach((action) => lines.push(`- ${action}`));
  lines.push('');
  lines.push('## Hard Stops');
  lines.push('');
  report.hard_stops.forEach((item) => lines.push(`- ${item}`));
  lines.push('');
  lines.push('## Failures');
  lines.push('');
  if (report.failures.length > 0) report.failures.forEach((failure) => lines.push(`- ${failure}`));
  else lines.push('- None.');
  lines.push('');
  lines.push('## Warnings');
  lines.push('');
  if (report.warnings.length > 0) report.warnings.forEach((warning) => lines.push(`- ${warning}`));
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
