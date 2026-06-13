#!/usr/bin/env node

import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = new Date().toISOString().slice(0, 10);
const sessionPath = resolve(root, args.session || `examples/kosmo-references/provenance/source-root-decision-session-${dateStamp}.json`);
const outputJson = resolve(root, args.out || `data/kosmo-source-root-decision-session-check-${dateStamp}.json`);
const outputMd = resolve(root, args.markdown || `docs/codex/kosmo-source-root-decision-session-check-${dateStamp}.md`);

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const session = JSON.parse(await readFile(sessionPath, 'utf8'));
  const report = await checkSession(session);

  await mkdir(dirname(outputJson), { recursive: true });
  await mkdir(dirname(outputMd), { recursive: true });
  await writeFile(outputJson, `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(outputMd, renderMarkdown(report));

  console.log('Kosmo source-root decision session check');
  console.log(`Session: ${relative(root, sessionPath)}`);
  console.log(`Status: ${report.status}`);
  console.log(`Selected decision: ${report.summary.selected_decision || 'pending'}`);
  console.log(`Selected root exists: ${report.summary.selected_root_exists}`);
  console.log(`Private diagnostic allowed: ${report.summary.private_diagnostic_allowed}`);
  console.log(`Public-ready after session: ${report.summary.public_ready_after_session}`);
  console.log(`Failures: ${report.summary.failures}`);
  console.log(`Warnings: ${report.summary.warnings}`);
  console.log(`Wrote: ${relative(root, outputMd)}`);

  if (report.failures.length > 0) process.exitCode = 1;
}

async function checkSession(session) {
  const failures = [];
  const warnings = [];
  const allowed = new Set(session.allowed_decisions || []);
  const selectedDecision = normalize(session.selected_decision);
  const selectedRootPath = normalize(session.selected_root_path);
  const rootOptions = new Map(
    (session.selection_options || [])
      .filter((option) => option.path)
      .map((option) => [option.path, option])
  );

  if (session.schema_version !== '0.1') failures.push(`Unsupported schema_version: ${session.schema_version}`);
  if (!['source_root_decision_session_pending', 'source_root_decision_session_recorded'].includes(session.status)) {
    failures.push('status must be source_root_decision_session_pending or source_root_decision_session_recorded');
  }
  if (session.policy?.auto_inventory !== false) failures.push('policy.auto_inventory must be false');
  if (session.policy?.reads_private_content !== false) failures.push('policy.reads_private_content must be false');
  if (session.policy?.copies_private_content !== false) failures.push('policy.copies_private_content must be false');
  if (session.policy?.writes_public_files !== false) failures.push('policy.writes_public_files must be false');
  if (session.policy?.writes_public_manifest !== false) failures.push('policy.writes_public_manifest must be false');
  if (session.policy?.public_ready_after_session !== 0) failures.push('policy.public_ready_after_session must be 0');
  if (allowed.size === 0) failures.push('allowed_decisions must not be empty');
  if (!Array.isArray(session.selection_options)) failures.push('selection_options must be an array');
  if (!Array.isArray(session.blocked_until_recorded_selection)) failures.push('blocked_until_recorded_selection must be an array');

  if (selectedDecision && !allowed.has(selectedDecision)) {
    failures.push(`selected_decision is not allowed: ${selectedDecision}`);
  }

  let selectedRootExists = false;
  if (selectedRootPath) {
    if (!selectedRootPath.startsWith('/')) failures.push('selected_root_path must be an absolute path');
    selectedRootExists = await pathExists(selectedRootPath);
    if (!selectedRootExists) warnings.push(`selected_root_path is not visible now: ${selectedRootPath}`);
    if (!rootOptions.has(selectedRootPath)) {
      warnings.push('selected_root_path was not one of the locator options; owner/overseer confirmation is required.');
    }
  }

  const requiresRoot = ['select_existing_root_for_private_diagnostic', 'select_root_after_mount_check'].includes(selectedDecision);
  if (requiresRoot && !selectedRootPath) failures.push(`${selectedDecision} requires selected_root_path`);
  if (selectedDecision === 'select_existing_root_for_private_diagnostic' && !selectedRootExists) {
    failures.push('select_existing_root_for_private_diagnostic requires a visible selected_root_path');
  }
  if (['keep_blocked', 'mount_archive_first', 'repair_onedrive_first'].includes(selectedDecision) && selectedRootPath) {
    warnings.push(`${selectedDecision} normally should not set selected_root_path`);
  }
  if (session.status === 'source_root_decision_session_recorded' && !selectedDecision) {
    failures.push('recorded session requires selected_decision');
  }
  if (session.status === 'source_root_decision_session_recorded' && requiresRoot && !selectedRootExists) {
    failures.push('recorded root-selection session requires the selected root to exist');
  }

  const privateDiagnosticAllowed = session.status === 'source_root_decision_session_recorded' &&
    selectedDecision === 'select_existing_root_for_private_diagnostic' &&
    selectedRootExists &&
    failures.length === 0;

  const status = failures.length > 0
    ? 'failed'
    : privateDiagnosticAllowed
      ? 'passed_recorded_private_diagnostic_allowed'
      : selectedDecision
        ? 'passed_recorded_but_inventory_blocked'
        : 'passed_pending_owner_input';

  return {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    session_path: relative(root, sessionPath),
    status,
    policy: {
      review_only: true,
      private_content_read: false,
      copied_private_content: false,
      public_ready_allowed: false,
      public_ready_after_session_required: 0
    },
    summary: {
      selected_decision: selectedDecision,
      selected_root_path: selectedRootPath,
      selected_root_exists: selectedRootExists,
      selected_root_in_locator_options: selectedRootPath ? rootOptions.has(selectedRootPath) : false,
      selection_options: session.selection_options?.length ?? 0,
      blocked_items: session.blocked_until_recorded_selection?.length ?? 0,
      private_diagnostic_allowed: privateDiagnosticAllowed,
      public_ready_after_session: session.policy?.public_ready_after_session ?? null,
      failures: failures.length,
      warnings: warnings.length
    },
    blocked_until_recorded_selection: session.blocked_until_recorded_selection || [],
    failures,
    warnings,
    next_actions: nextActions({ selectedDecision, selectedRootPath, privateDiagnosticAllowed })
  };
}

function nextActions({ selectedDecision, selectedRootPath, privateDiagnosticAllowed }) {
  if (privateDiagnosticAllowed) {
    return [`Run npm run kosmo:private-library-diagnostic -- --roots "${selectedRootPath}"`, 'Open a private metadata-only inventory task under KosmoZentrale.'];
  }
  if (!selectedDecision) {
    return ['Owner/Claude/KosmoOverseer records selected_decision and optional selected_root_path.', 'Keep source-dependent extraction and authoring blocked.'];
  }
  if (selectedDecision === 'repair_onedrive_first') return ['Repair OneDrive sync state, rerun source-root locator, then update this session.'];
  if (selectedDecision === 'mount_archive_first') return ['Mount or expose the archive HDD/source library, rerun source-root locator, then update this session.'];
  if (selectedDecision === 'select_root_after_mount_check') return ['Make selected_root_path visible, then rerun this check before private diagnostic.'];
  return ['Keep private inventory, PDF extraction and source-dependent authoring blocked.'];
}

async function pathExists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

function renderMarkdown(report) {
  const lines = [];
  lines.push('# Kosmo Source-Root Decision Session Check');
  lines.push('');
  lines.push(`Generated: ${report.generated_at}`);
  lines.push(`Session: \`${report.session_path}\``);
  lines.push(`Status: \`${report.status}\``);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Selected decision: \`${report.summary.selected_decision || 'pending'}\``);
  lines.push(`- Selected root path: ${report.summary.selected_root_path ? `\`${report.summary.selected_root_path}\`` : '`pending`'}`);
  lines.push(`- Selected root exists: ${report.summary.selected_root_exists ? 'yes' : 'no'}`);
  lines.push(`- Selected root in locator options: ${report.summary.selected_root_in_locator_options ? 'yes' : 'no'}`);
  lines.push(`- Selection options: ${report.summary.selection_options}`);
  lines.push(`- Blocked items: ${report.summary.blocked_items}`);
  lines.push(`- Private diagnostic allowed: ${report.summary.private_diagnostic_allowed ? 'yes' : 'no'}`);
  lines.push(`- Public-ready after session: ${report.summary.public_ready_after_session}`);
  lines.push(`- Failures: ${report.summary.failures}`);
  lines.push(`- Warnings: ${report.summary.warnings}`);
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
  lines.push('## Blocked Until Recorded Selection');
  lines.push('');
  report.blocked_until_recorded_selection.forEach((item) => lines.push(`- \`${item}\``));
  lines.push('');
  lines.push('## Next Actions');
  lines.push('');
  report.next_actions.forEach((action) => lines.push(`- ${action}`));
  lines.push('');
  return `${lines.join('\n')}\n`;
}

function normalize(value) {
  const normalized = String(value || '').trim();
  return normalized || null;
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
