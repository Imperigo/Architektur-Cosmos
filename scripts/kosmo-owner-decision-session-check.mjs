#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const sessionPath = resolve(root, args.session || 'examples/kosmo-references/provenance/owner-review-decision-session-2026-06-13.json');
const outputDir = resolve(root, args.out || dirname(sessionPath));

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const session = JSON.parse(await readFile(sessionPath, 'utf8'));
  const report = checkSession(session);

  await mkdir(outputDir, { recursive: true });
  await writeFile(resolve(outputDir, 'owner-decision-session-check.generated.json'), `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(resolve(outputDir, 'owner-decision-session-check.generated.md'), renderMarkdown(report));

  console.log('KosmoReferences owner decision session check');
  console.log(`Session: ${relative(root, sessionPath)}`);
  console.log(`Status: ${report.status}`);
  console.log(`Decision items: ${report.summary.decision_items}`);
  console.log(`Selected decisions: ${report.summary.selected_decisions}`);
  console.log(`Pending decisions: ${report.summary.pending_decisions}`);
  console.log(`Public-ready after session: ${report.summary.public_ready_after_session}`);
  console.log(`Failures: ${report.summary.failures}`);
  console.log(`Warnings: ${report.summary.warnings}`);
  console.log(`Wrote: ${relative(root, resolve(outputDir, 'owner-decision-session-check.generated.md'))}`);

  if (report.failures.length > 0) process.exitCode = 1;
}

function checkSession(session) {
  const failures = [];
  const warnings = [];
  const allowed = new Set(session.allowed_decisions || []);
  const rows = [];

  if (session.schema_version !== '0.1') failures.push(`Unsupported schema_version: ${session.schema_version}`);
  if (!['owner_decision_session_pending', 'owner_decision_session_recorded'].includes(session.status)) {
    failures.push('status must be owner_decision_session_pending or owner_decision_session_recorded');
  }
  if (session.policy?.auto_promote !== false) failures.push('policy.auto_promote must be false');
  if (session.policy?.writes_public_files !== false) failures.push('policy.writes_public_files must be false');
  if (session.policy?.writes_public_manifest !== false) failures.push('policy.writes_public_manifest must be false');
  if (session.policy?.public_ready_after_session !== 0) failures.push('policy.public_ready_after_session must be 0');
  if (!Array.isArray(session.decisions)) failures.push('decisions must be an array');
  if (allowed.size === 0) failures.push('allowed_decisions must not be empty');

  const seen = new Set();
  for (const item of session.decisions || []) {
    const itemId = item.item_id || '<missing>';
    const rowKey = `${item.group_id || '<missing>'}:${itemId}`;
    if (seen.has(rowKey)) failures.push(`duplicate decision item: ${rowKey}`);
    seen.add(rowKey);
    if (!item.group_id) failures.push(`decision ${itemId} missing group_id`);
    if (!item.item_id) failures.push(`decision in ${item.group_id || '<missing>'} missing item_id`);
    if (!item.decision_prompt) warnings.push(`decision ${rowKey} missing decision_prompt`);
    if (item.public_ready_after_decision !== false) failures.push(`decision ${rowKey} must keep public_ready_after_decision=false`);
    if (item.confirm_command_after_separate_review && item.group_id !== 'model-promotion-owner-confirmation') {
      failures.push(`decision ${rowKey} has confirm command outside model-promotion-owner-confirmation`);
    }

    const selected = item.selected_decision;
    if (selected !== null && selected !== undefined && selected !== '' && !allowed.has(selected)) {
      failures.push(`decision ${rowKey} selected_decision not allowed: ${selected}`);
    }
    if (selected === 'approve_public_display_after_review' && !String(item.owner_note || '').trim()) {
      warnings.push(`decision ${rowKey} approves display but has no owner_note`);
    }

    rows.push({
      group_id: item.group_id || null,
      item_id: item.item_id || null,
      selected_decision: selected || null,
      recommended_safe_default: item.recommended_safe_default || null,
      public_ready_after_decision: Boolean(item.public_ready_after_decision),
      has_owner_note: Boolean(String(item.owner_note || '').trim()),
      confirm_command_after_separate_review: item.confirm_command_after_separate_review || null
    });
  }

  const pending = rows.filter((row) => !row.selected_decision).length;
  const selected = rows.length - pending;
  const publicReadyAfterSession = rows.filter((row) => row.public_ready_after_decision).length;
  if (publicReadyAfterSession > 0) failures.push(`session contains ${publicReadyAfterSession} public_ready_after_decision=true items`);
  if (session.status === 'owner_decision_session_recorded' && pending > 0) {
    failures.push('recorded session must not contain pending decisions');
  }

  const status = failures.length > 0
    ? 'failed'
    : pending > 0
      ? 'passed_pending_owner_input'
      : warnings.length > 0
        ? 'passed_with_warnings'
        : 'passed_recorded';

  return {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    session_path: relative(root, sessionPath),
    status,
    policy: {
      auto_promote_allowed: false,
      public_ready_after_session_required: 0,
      public_writes_allowed: false,
      separate_promotion_review_required: true
    },
    summary: {
      decision_items: rows.length,
      selected_decisions: selected,
      pending_decisions: pending,
      public_ready_after_session: publicReadyAfterSession,
      confirm_commands_after_separate_review: rows.filter((row) => row.confirm_command_after_separate_review).length,
      failures: failures.length,
      warnings: warnings.length,
      groups: countBy(rows.map((row) => row.group_id))
    },
    decisions: rows,
    failures,
    warnings,
    next_actions: pending > 0
      ? ['Owner fills selected_decision per pending item.', 'Re-run this check before any promotion preparation.']
      : ['Codex/Claude review owner decisions and prepare a separate promotion/manifest-change review if appropriate.']
  };
}

function renderMarkdown(report) {
  const lines = [];
  lines.push('# KosmoReferences Owner Decision Session Check');
  lines.push('');
  lines.push(`Generated: ${report.generated_at}`);
  lines.push(`Session: \`${report.session_path}\``);
  lines.push(`Status: \`${report.status}\``);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Decision items: ${report.summary.decision_items}`);
  lines.push(`- Selected decisions: ${report.summary.selected_decisions}`);
  lines.push(`- Pending decisions: ${report.summary.pending_decisions}`);
  lines.push(`- Public-ready after session: ${report.summary.public_ready_after_session}`);
  lines.push(`- Confirm commands after separate review: ${report.summary.confirm_commands_after_separate_review}`);
  lines.push(`- Failures: ${report.summary.failures}`);
  lines.push(`- Warnings: ${report.summary.warnings}`);
  lines.push('');
  lines.push('## Decisions');
  lines.push('');
  lines.push('| Group | Item | Selected | Safe default | Public-ready after decision |');
  lines.push('| --- | --- | --- | --- | --- |');
  for (const decision of report.decisions) {
    lines.push(`| ${decision.group_id || '-'} | ${decision.item_id || '-'} | ${decision.selected_decision || 'pending'} | ${decision.recommended_safe_default || '-'} | ${decision.public_ready_after_decision ? 'yes' : 'no'} |`);
  }
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
  lines.push('## Next Actions');
  lines.push('');
  report.next_actions.forEach((action) => lines.push(`- ${action}`));
  lines.push('');
  return `${lines.join('\n')}\n`;
}

function countBy(values) {
  return values.reduce((acc, value) => {
    const key = value || 'unknown';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
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

