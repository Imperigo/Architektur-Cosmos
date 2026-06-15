#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = new Date().toISOString().slice(0, 10);

const previewPath = resolve(root, args.preview || `data/kosmo-owner-unlock-session-edit-preview-${dateStamp}.json`);
const outputJson = resolve(root, args.out || `data/kosmo-owner-unlock-session-edit-preview-check-${dateStamp}.json`);
const outputMd = resolve(root, args.markdown || `docs/codex/kosmo-owner-unlock-session-edit-preview-check-${dateStamp}.md`);

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const preview = JSON.parse(await readFile(previewPath, 'utf8'));
  const checks = buildChecks(preview);
  const failures = checks.filter((check) => check.status === 'failed');
  const report = {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    status: failures.length === 0
      ? 'owner_unlock_session_edit_preview_guard_passed'
      : 'owner_unlock_session_edit_preview_guard_failed',
    policy: {
      review_only: true,
      validates_preview_only: true,
      writes_session_files_now: false,
      writes_intake_now: false,
      reads_private_content: false,
      runs_private_inventory_now: false,
      public_ready_after_check: 0
    },
    source_refs: [relative(root, previewPath)],
    summary: {
      checks: checks.length,
      passed: checks.length - failures.length,
      failures: failures.length,
      public_ready_after_check: 0
    },
    checks
  };

  await mkdir(dirname(outputJson), { recursive: true });
  await mkdir(dirname(outputMd), { recursive: true });
  await writeFile(outputJson, `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(outputMd, renderMarkdown(report));

  console.log('Kosmo owner unlock session edit preview check');
  console.log(`Status: ${report.status}`);
  console.log(`Checks: ${report.summary.passed}/${report.summary.checks}`);
  console.log(`Failures: ${report.summary.failures}`);
  console.log(`Wrote: ${relative(root, outputMd)}`);

  if (failures.length > 0) process.exitCode = 1;
}

function buildChecks(preview) {
  const hardStops = (preview.hard_stops || []).join(' ').toLowerCase();
  const afterManualApply = (preview.after_manual_apply_sequence || []).join(' ');
  return [
    check('status_ready', preview.status === 'owner_unlock_session_edit_preview_ready', preview.status),
    check('policy_review_only', preview.policy?.review_only === true, preview.policy?.review_only),
    check('policy_preview_only', preview.policy?.preview_only === true, preview.policy?.preview_only),
    check('policy_no_session_write_now', preview.policy?.writes_session_files_now === false, preview.policy?.writes_session_files_now),
    check('policy_no_intake_write_now', preview.policy?.writes_intake_now === false, preview.policy?.writes_intake_now),
    check('policy_no_decision_apply_now', preview.policy?.applies_decisions_now === false, preview.policy?.applies_decisions_now),
    check('policy_no_source_root_record_now', preview.policy?.records_source_root_now === false, preview.policy?.records_source_root_now),
    check('policy_no_private_reads', preview.policy?.reads_private_content === false, preview.policy?.reads_private_content),
    check('policy_no_private_inventory', preview.policy?.runs_private_inventory_now === false, preview.policy?.runs_private_inventory_now),
    check('policy_no_source_root_guards_now', preview.policy?.runs_source_root_guards_now === false, preview.policy?.runs_source_root_guards_now),
    check('public_ready_zero', preview.summary?.public_ready_after_preview === 0, preview.summary?.public_ready_after_preview),
    check('preview_edit_count', preview.summary?.preview_edits === 6, preview.summary?.preview_edits),
    check('session_file_edit_count', preview.summary?.session_file_edits === 1, preview.summary?.session_file_edits),
    check('manual_triage_count', preview.summary?.manual_triage_edits === 5, preview.summary?.manual_triage_edits),
    check('selected_root_exists', preview.summary?.selected_root_exists === true, preview.summary?.selected_root_exists),
    check('all_preview_edits_write_false', (preview.preview_edits || []).every((edit) => edit.writes_now === false), (preview.preview_edits || []).filter((edit) => edit.writes_now !== false).map((edit) => edit.id).join(',')),
    check('after_apply_has_session_check', afterManualApply.includes('source-root-decision-session-check'), afterManualApply),
    check('hard_stop_no_auto_apply', hardStops.includes('do not apply this preview automatically'), hardStops),
    check('hard_stop_no_session_write', hardStops.includes('do not write session files'), hardStops),
    check('hard_stop_no_private_inventory', hardStops.includes('do not run private inventory'), hardStops),
    check('hard_stop_no_private_content', hardStops.includes('do not read private content'), hardStops),
    check('hard_stop_no_public_ready', hardStops.includes('do not change public-ready'), hardStops)
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
  lines.push('# Kosmo Owner Unlock Session Edit Preview Check');
  lines.push('');
  lines.push(`Generated: ${report.generated_at}`);
  lines.push(`Status: \`${report.status}\``);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Checks: ${report.summary.passed}/${report.summary.checks}`);
  lines.push(`- Failures: ${report.summary.failures}`);
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
