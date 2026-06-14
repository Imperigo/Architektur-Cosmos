#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = new Date().toISOString().slice(0, 10);

const refs = {
  selectionBrief: resolve(root, args.selectionBrief || `data/kosmo-source-root-selection-brief-${dateStamp}.json`),
  session: resolve(root, args.session || `examples/kosmo-references/provenance/source-root-decision-session-${dateStamp}.json`)
};

const outputJson = resolve(root, args.out || `data/kosmo-source-root-decision-session-refresh-${dateStamp}.json`);
const outputMd = resolve(root, args.markdown || `docs/codex/kosmo-source-root-decision-session-refresh-${dateStamp}.md`);
const sessionMd = resolve(root, args.sessionMarkdown || `docs/codex/kosmo-source-root-decision-session-${dateStamp}.md`);

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const selection = JSON.parse(await readFile(refs.selectionBrief, 'utf8'));
  const session = JSON.parse(await readFile(refs.session, 'utf8'));
  const beforeOptions = session.selection_options || [];
  const selectionOptions = buildSelectionOptions(selection);
  const safeToRefresh = session.status === 'source_root_decision_session_pending' &&
    !normalize(session.selected_decision) &&
    !normalize(session.selected_root_path);

  const changed = safeToRefresh && !sameOptionSet(beforeOptions, selectionOptions);
  const failures = [];
  if (session.policy?.auto_inventory !== false) failures.push('session policy.auto_inventory must remain false');
  if (session.policy?.public_ready_after_session !== 0) failures.push('session policy.public_ready_after_session must remain 0');
  if (!safeToRefresh) {
    failures.push('session contains an owner decision or is not pending; refresh refused to avoid overwriting human state');
  }

  let refreshedSession = session;
  if (failures.length === 0 && changed) {
    refreshedSession = {
      ...session,
      refreshed_at: new Date().toISOString(),
      source_refs: uniqueRefs([relative(root, refs.selectionBrief), ...(selection.source_refs || []), ...(session.source_refs || [])]),
      selection_options: selectionOptions,
      next_actions: [
        'Owner/Claude/KosmoOverseer sets selected_decision and, if selecting a root, selected_root_path.',
        'Run npm run kosmo:source-root-decision-session-check.',
        'Only after a passing recorded selection may Codex/Claude run the private-library diagnostic against the selected root.',
        'Keep all source-dependent public-ready states at 0 until later provenance and rights reviews pass.'
      ]
    };
    await mkdir(dirname(refs.session), { recursive: true });
    await mkdir(dirname(sessionMd), { recursive: true });
    await writeFile(refs.session, `${JSON.stringify(refreshedSession, null, 2)}\n`);
    await writeFile(sessionMd, renderSessionMarkdown(refreshedSession));
  }

  const report = {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    status: failures.length > 0
      ? 'source_root_decision_session_refresh_refused'
      : changed
        ? 'source_root_decision_session_refreshed_pending'
        : 'source_root_decision_session_refresh_not_needed',
    policy: {
      metadata_only: true,
      reads_private_content: false,
      copies_private_content: false,
      records_owner_decision: false,
      overwrites_owner_decision: false,
      public_ready_after_refresh: 0,
      note: 'This refresh only updates pending selection options from the current source-root selection brief. It refuses to write if an owner decision is present.'
    },
    source_refs: [relative(root, refs.selectionBrief), relative(root, refs.session)],
    summary: {
      safe_to_refresh: safeToRefresh,
      changed,
      previous_options: beforeOptions.length,
      refreshed_options: refreshedSession.selection_options?.length ?? 0,
      selection_brief_options: selectionOptions.length,
      archive_options_after_refresh: selectionOptions.filter((option) => String(option.path || '').startsWith('/mnt/archiv')).length,
      selected_decision: normalize(session.selected_decision),
      selected_root_path: normalize(session.selected_root_path),
      failures: failures.length,
      public_ready_after_refresh: 0
    },
    failures,
    next_actions: failures.length > 0
      ? [
          'Do not auto-refresh a recorded source-root decision session.',
          'If the existing decision is obsolete, ask Owner/KosmoOverseer for explicit reset instructions.'
        ]
      : [
          'Run npm run kosmo:source-root-decision-session-check.',
          'Use the refreshed pending session as the owner-facing source-root choice surface.',
          'Keep private inventory blocked until a recorded decision passes.'
        ]
  };

  await mkdir(dirname(outputJson), { recursive: true });
  await mkdir(dirname(outputMd), { recursive: true });
  await writeFile(outputJson, `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(outputMd, renderReportMarkdown(report));

  console.log('Kosmo source-root decision session refresh');
  console.log(`Status: ${report.status}`);
  console.log(`Changed: ${report.summary.changed}`);
  console.log(`Options: ${report.summary.previous_options} -> ${report.summary.refreshed_options}`);
  console.log(`Failures: ${report.summary.failures}`);
  console.log(`Wrote: ${relative(root, outputMd)}`);

  if (failures.length > 0) process.exitCode = 1;
}

function buildSelectionOptions(selection) {
  return (selection.selection_options || []).map((option) => ({
    id: option.id,
    path: option.path,
    classification: option.classification,
    score: option.score,
    recommended_action: option.recommended_action,
    safe_default: option.safe_default
  }));
}

function sameOptionSet(left, right) {
  return JSON.stringify(left.map(optionComparable)) === JSON.stringify(right.map(optionComparable));
}

function optionComparable(option) {
  return {
    id: option.id,
    path: option.path,
    classification: option.classification,
    score: option.score,
    safe_default: option.safe_default
  };
}

function uniqueRefs(refs) {
  return [...new Set(refs.filter(Boolean))];
}

function renderSessionMarkdown(session) {
  const lines = [];
  lines.push('# Kosmo Source-Root Decision Session');
  lines.push('');
  lines.push(`Created: ${session.created_at}`);
  if (session.refreshed_at) lines.push(`Refreshed: ${session.refreshed_at}`);
  lines.push(`Status: \`${session.status}\``);
  lines.push('');
  lines.push('## Decision Fields');
  lines.push('');
  lines.push(`- Selected decision: \`${session.selected_decision || 'pending'}\``);
  lines.push(`- Selected root path: ${session.selected_root_path ? `\`${session.selected_root_path}\`` : '`pending`'}`);
  lines.push(`- Public-ready after session: ${session.policy.public_ready_after_session}`);
  lines.push('');
  lines.push('## Allowed Decisions');
  lines.push('');
  session.allowed_decisions.forEach((decision) => lines.push(`- \`${decision}\``));
  lines.push('');
  lines.push('## Selection Options');
  lines.push('');
  lines.push('| Option | Classification | Score | Path | Safe default |');
  lines.push('| --- | --- | ---: | --- | --- |');
  for (const option of session.selection_options) {
    lines.push(`| \`${option.id}\` | ${option.classification} | ${option.score ?? '-'} | ${option.path ? `\`${escapePipe(option.path)}\`` : '-' } | ${option.safe_default} |`);
  }
  lines.push('');
  lines.push('## Blocked Until Recorded Selection');
  lines.push('');
  session.blocked_until_recorded_selection.forEach((item) => lines.push(`- \`${item}\``));
  lines.push('');
  lines.push('## Next Actions');
  lines.push('');
  session.next_actions.forEach((action) => lines.push(`- ${action}`));
  lines.push('');
  lines.push('## Safety');
  lines.push('');
  lines.push('This session is metadata-only. It does not authorize private extraction, PDF ingestion, public-ready flags or source-dependent asset promotion.');
  lines.push('');
  return `${lines.join('\n')}`;
}

function renderReportMarkdown(report) {
  const lines = [];
  lines.push('# Kosmo Source-Root Decision Session Refresh');
  lines.push('');
  lines.push(`Generated: ${report.generated_at}`);
  lines.push(`Status: \`${report.status}\``);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Safe to refresh: ${report.summary.safe_to_refresh ? 'yes' : 'no'}`);
  lines.push(`- Changed: ${report.summary.changed ? 'yes' : 'no'}`);
  lines.push(`- Options previous/refreshed/selection brief: ${report.summary.previous_options}/${report.summary.refreshed_options}/${report.summary.selection_brief_options}`);
  lines.push(`- Archive options after refresh: ${report.summary.archive_options_after_refresh}`);
  lines.push(`- Selected decision: \`${report.summary.selected_decision || 'pending'}\``);
  lines.push(`- Selected root path: ${report.summary.selected_root_path ? `\`${report.summary.selected_root_path}\`` : '`pending`'}`);
  lines.push(`- Failures: ${report.summary.failures}`);
  lines.push(`- Public-ready after refresh: ${report.summary.public_ready_after_refresh}`);
  lines.push('');
  lines.push('## Failures');
  lines.push('');
  if (report.failures.length > 0) report.failures.forEach((failure) => lines.push(`- ${failure}`));
  else lines.push('- None.');
  lines.push('');
  lines.push('## Next Actions');
  lines.push('');
  report.next_actions.forEach((action) => lines.push(`- ${action}`));
  lines.push('');
  return lines.join('\n');
}

function normalize(value) {
  const normalized = String(value || '').trim();
  return normalized || null;
}

function escapePipe(value) {
  return String(value ?? '').replace(/\|/g, '\\|').replace(/\n/g, ' ');
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
