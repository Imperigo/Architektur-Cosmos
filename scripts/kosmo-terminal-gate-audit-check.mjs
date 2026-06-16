#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = new Date().toISOString().slice(0, 10);

const auditPath = resolve(root, args.audit || `data/kosmo-terminal-gate-audit-${dateStamp}.json`);
const outputJson = resolve(root, args.out || `data/kosmo-terminal-gate-audit-check-${dateStamp}.json`);
const outputMd = resolve(root, args.markdown || `docs/codex/kosmo-terminal-gate-audit-check-${dateStamp}.md`);

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const audit = JSON.parse(await readFile(auditPath, 'utf8'));
  const checks = buildChecks(audit);
  const failures = checks.filter((check) => check.status === 'failed');
  const report = {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    status: failures.length === 0
      ? 'terminal_gate_audit_guard_passed'
      : 'terminal_gate_audit_guard_failed',
    policy: {
      validates_audit_only: true,
      records_decisions: false,
      writes_session_files: false,
      reads_private_content: false,
      runs_private_inventory: false,
      runs_runtime_batches: false,
      changes_public_ready: false,
      public_ready_after_check: 0
    },
    source_refs: [relative(root, auditPath)],
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

  console.log('Kosmo terminal gate audit check');
  console.log(`Status: ${report.status}`);
  console.log(`Checks: ${report.summary.passed}/${report.summary.checks}`);
  console.log(`Failures: ${report.summary.failures}`);
  console.log(`Wrote: ${relative(root, outputMd)}`);

  if (failures.length > 0) process.exitCode = 1;
}

function buildChecks(audit) {
  const blockerIds = (audit.terminal_blockers || []).map((blocker) => blocker.id);
  const hardStops = (audit.hard_stops || []).join(' ').toLowerCase();
  const commands = (audit.owner_unlock_sequence_after_explicit_reply || []).join(' ');
  return [
    check('status_guarded_blocked', audit.status === 'terminal_gate_audit_guarded_blocked', audit.status),
    check('policy_audit_only', audit.policy?.audit_only === true, audit.policy?.audit_only),
    check('policy_no_decisions', audit.policy?.records_decisions === false, audit.policy?.records_decisions),
    check('policy_no_session_writes', audit.policy?.writes_session_files === false, audit.policy?.writes_session_files),
    check('policy_no_private_reads', audit.policy?.reads_private_content === false, audit.policy?.reads_private_content),
    check('policy_no_private_inventory', audit.policy?.runs_private_inventory === false, audit.policy?.runs_private_inventory),
    check('policy_no_runtime_batches', audit.policy?.runs_runtime_batches === false, audit.policy?.runs_runtime_batches),
    check('policy_public_ready_zero', audit.policy?.public_ready_after_audit === 0 && audit.summary?.public_ready_after_audit === 0, `${audit.policy?.public_ready_after_audit}/${audit.summary?.public_ready_after_audit}`),
    check('five_terminal_blockers', audit.summary?.terminal_blockers === 5 && (audit.terminal_blockers || []).length === 5, `${audit.summary?.terminal_blockers}/${(audit.terminal_blockers || []).length}`),
    check('source_root_blocker_present', blockerIds.includes('source-root'), blockerIds.join(',')),
    check('source_root_owner_action_present', blockerIds.includes('source-root-owner-action'), blockerIds.join(',')),
    check('source_root_activation_present', blockerIds.includes('source-root-activation'), blockerIds.join(',')),
    check('private_metadata_inventory_present', blockerIds.includes('private-metadata-inventory'), blockerIds.join(',')),
    check('runtime_apply_guard_present', blockerIds.includes('github-worker-runtime-apply-guard'), blockerIds.join(',')),
    check('source_root_session_blocked', ['source_root_decision_session_blocked', 'passed_pending_owner_input'].includes(audit.summary?.source_root_session_status), audit.summary?.source_root_session_status),
    check('runtime_guard_blocked', ['github_worker_runtime_apply_guard_blocked_owner_action_required', 'innovation_github_worker_runtime_apply_guard_waiting_for_exact_reply'].includes(audit.summary?.runtime_apply_guard_status), audit.summary?.runtime_apply_guard_status),
    check('actions_not_executable', audit.summary?.actions_executable_now === 0, audit.summary?.actions_executable_now),
    check('hard_stop_private_tasks', hardStops.includes('private inventory') && hardStops.includes('local llm'), hardStops),
    check('hard_stop_runtime_batch', hardStops.includes('runtime batch'), hardStops),
    check('hard_stop_public_ready', hardStops.includes('public-ready'), hardStops),
    check('unlock_sequence_starts_validator', commands.includes('owner-unlock-reply-validator'), commands),
    check('unlock_sequence_keeps_guard_order', commands.includes('source-root-decision-session-check') && commands.includes('source-root-activation-preflight'), commands),
    check('no_failures_listed', (audit.failures || []).length === 0, (audit.failures || []).join('; '))
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
  lines.push('# Kosmo Terminal Gate Audit Check');
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
    const evidence = String(checkItem.evidence ?? '').trim() || '-';
    lines.push(`- ${checkItem.status}: \`${checkItem.id}\` - ${evidence}`);
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
