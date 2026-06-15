#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = new Date().toISOString().slice(0, 10);

const guardPath = resolve(root, args.guard || `data/kosmo-owner-unlock-session-apply-guard-${dateStamp}.json`);
const outputJson = resolve(root, args.out || `data/kosmo-owner-unlock-session-apply-guard-check-${dateStamp}.json`);
const outputMd = resolve(root, args.markdown || `docs/codex/kosmo-owner-unlock-session-apply-guard-check-${dateStamp}.md`);

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const guard = JSON.parse(await readFile(guardPath, 'utf8'));
  const checks = buildChecks(guard);
  const failures = checks.filter((check) => check.status === 'failed');
  const report = {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    status: failures.length === 0
      ? 'owner_unlock_session_apply_guard_check_passed'
      : 'owner_unlock_session_apply_guard_check_failed',
    policy: {
      validates_guard_only: true,
      writes_session_files_now: false,
      records_decisions_now: false,
      reads_private_content_now: false,
      runs_private_inventory_now: false,
      public_ready_after_check: 0
    },
    source_refs: [relative(root, guardPath)],
    summary: {
      guard_status: guard.status,
      mode: guard.summary?.mode || null,
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

  console.log('Kosmo owner unlock session apply guard check');
  console.log(`Status: ${report.status}`);
  console.log(`Guard: ${report.summary.guard_status}`);
  console.log(`Checks: ${report.summary.passed}/${report.summary.checks}`);
  console.log(`Failures: ${report.summary.failures}`);
  console.log(`Wrote: ${relative(root, outputMd)}`);

  if (failures.length > 0) process.exitCode = 1;
}

function buildChecks(guard) {
  const hardStops = (guard.hard_stops || []).join(' ').toLowerCase();
  const expectedSessionFile = `examples/kosmo-references/provenance/source-root-decision-session-${dateStamp}.json`;
  const acceptableStatuses = [
    'owner_unlock_session_apply_guard_waiting_for_manual_apply',
    'owner_unlock_session_apply_guard_passed_after_manual_apply'
  ];
  return [
    check('status_acceptable', acceptableStatuses.includes(guard.status), guard.status),
    check('policy_guard_only', guard.policy?.guard_only === true, guard.policy?.guard_only),
    check('policy_no_session_writes', guard.policy?.writes_session_files_now === false, guard.policy?.writes_session_files_now),
    check('policy_no_decisions_now', guard.policy?.records_decisions_now === false, guard.policy?.records_decisions_now),
    check('policy_no_private_reads', guard.policy?.reads_private_content_now === false, guard.policy?.reads_private_content_now),
    check('policy_no_private_inventory', guard.policy?.runs_private_inventory_now === false, guard.policy?.runs_private_inventory_now),
    check('public_ready_zero', guard.summary?.public_ready_after_guard === 0, guard.summary?.public_ready_after_guard),
    check('target_current_session', guard.summary?.target_file === expectedSessionFile, guard.summary?.target_file),
    check('expected_status_recorded', guard.expected_after_apply?.status === 'source_root_decision_session_recorded', guard.expected_after_apply?.status),
    check('expected_decision_exact', guard.expected_after_apply?.selected_decision === 'select_existing_root_for_private_diagnostic', guard.expected_after_apply?.selected_decision),
    check('expected_root_assets', guard.expected_after_apply?.selected_root_path === '/mnt/archiv/ArchitekturKosmos/Assets', guard.expected_after_apply?.selected_root_path),
    check('pending_or_matches_preview', guard.summary?.untouched_pending === true || guard.summary?.matches_preview === true, `${guard.summary?.untouched_pending}/${guard.summary?.matches_preview}`),
    check('waiting_blocks_private_diagnostic', guard.summary?.mode !== 'waiting_for_manual_apply' || guard.summary?.private_diagnostic_allowed_after_apply === false, guard.summary?.private_diagnostic_allowed_after_apply),
    check('applied_allows_private_diagnostic', guard.summary?.mode !== 'applied_matches_preview' || guard.summary?.private_diagnostic_allowed_after_apply === true, guard.summary?.private_diagnostic_allowed_after_apply),
    check('hard_stop_no_auto_apply', hardStops.includes('do not apply this guard automatically'), hardStops),
    check('hard_stop_no_freeform', hardStops.includes('freeform'), hardStops),
    check('hard_stop_no_inventory_while_waiting', hardStops.includes('waiting'), hardStops),
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
  lines.push('# Kosmo Owner Unlock Session Apply Guard Check');
  lines.push('');
  lines.push(`Generated: ${report.generated_at}`);
  lines.push(`Status: \`${report.status}\``);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Guard status: ${report.summary.guard_status}`);
  lines.push(`- Mode: ${report.summary.mode}`);
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
