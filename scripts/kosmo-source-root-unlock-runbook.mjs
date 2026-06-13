#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = new Date().toISOString().slice(0, 10);

const refs = {
  blockerRefresh: resolve(root, args.blockerRefresh || `data/kosmo-source-root-blocker-refresh-${dateStamp}.json`),
  selectionBrief: resolve(root, args.selectionBrief || `data/kosmo-source-root-selection-brief-${dateStamp}.json`),
  decisionCheck: resolve(root, args.decisionCheck || `data/kosmo-source-root-decision-session-check-${dateStamp}.json`),
  commandRouter: resolve(root, args.commandRouter || `data/kosmo-data-lane-command-router-${dateStamp}.json`)
};

const outputJson = resolve(root, args.out || `data/kosmo-source-root-unlock-runbook-${dateStamp}.json`);
const outputMd = resolve(root, args.markdown || `docs/codex/kosmo-source-root-unlock-runbook-${dateStamp}.md`);

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const blocker = await readJson(refs.blockerRefresh);
  const selection = await readJson(refs.selectionBrief);
  const decision = await readJson(refs.decisionCheck);
  const router = await readJson(refs.commandRouter);
  const blockerSummary = blocker.summary || {};
  const decisionSummary = decision.summary || {};

  const report = {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    status: decisionSummary.private_diagnostic_allowed === true
      ? 'source_root_unlock_runbook_ready_for_private_diagnostic'
      : 'source_root_unlock_runbook_owner_storage_action_needed',
    policy: {
      metadata_only: true,
      reads_private_content: false,
      copies_private_content: false,
      selects_root: false,
      runs_private_diagnostic: false,
      public_ready_allowed: false,
      public_ready_after_runbook: 0,
      note: 'This runbook explains how to unlock source-root diagnostics after owner/storage action. It does not select a root or run private inventory.'
    },
    source_refs: Object.values(refs).map((path) => relative(root, path)),
    hard_state: {
      blocker_status: blocker.status,
      onedrive_marker_leaf_missing: [
        blockerSummary.onedrive_marker_files ?? null,
        blockerSummary.onedrive_leaf_marker_files ?? null,
        blockerSummary.onedrive_aggregate_missing_items ?? null
      ],
      source_root_candidates: blockerSummary.source_root_candidates ?? null,
      probable_libraries: blockerSummary.source_root_probable_libraries ?? null,
      workflow_mirrors: blockerSummary.source_root_workflow_mirrors ?? null,
      selected_decision: decisionSummary.selected_decision ?? null,
      selected_root_exists: decisionSummary.selected_root_exists === true,
      private_diagnostic_allowed: decisionSummary.private_diagnostic_allowed === true,
      router_status: router.status,
      public_ready_after_runbook: 0
    },
    owner_storage_actions: [
      {
        id: 'mount_or_confirm_real_root',
        action: 'Mount or confirm the exact real book/ETH/HSLU architecture source root.',
        success_condition: 'The selected path exists and is not only a workflow/project mirror.'
      },
      {
        id: 'repair_onedrive_if_used',
        action: 'Repair OneDrive sync if the chosen source root is OneDrive-based.',
        success_condition: 'OneDrive marker/leaf/missing counts no longer indicate incomplete source access.'
      },
      {
        id: 'record_decision_session',
        action: 'Record selected_decision and selected_root_path in the approved source-root decision session.',
        success_condition: '`npm run kosmo:source-root-decision-session-check` reports private_diagnostic_allowed=true.'
      }
    ],
    selection_options: (selection.selection_options || []).map((option) => ({
      id: option.id,
      path: option.path,
      classification: option.classification,
      score: option.score,
      safe_default: option.safe_default,
      recommended_action: option.recommended_action
    })),
    command_sequence_after_owner_storage_action: [
      'npm run kosmo:source-root-locator',
      'npm run kosmo:source-root-selection-brief',
      'npm run kosmo:source-root-decision-session-check',
      'npm run kosmo:source-root-blocker-refresh',
      'npm run kosmo:data-lane-command-router',
      'npm run kosmo:worker-boundary-pack',
      'npm run kosmo:worker-boundary-pack-check'
    ],
    still_forbidden_until_unlock: [
      'private PDF/OCR extraction',
      'private inventory extraction',
      'source-dependent asset authoring',
      'public-ready promotion',
      'local-worker Git/cloud/public writes'
    ],
    next_actions: [
      'Owner/KosmoOverseer chooses storage path or repairs sync outside Git.',
      'Rerun the command sequence only after that storage action.',
      'If private_diagnostic_allowed remains false, keep all source-dependent work blocked.'
    ]
  };

  await mkdir(dirname(outputJson), { recursive: true });
  await mkdir(dirname(outputMd), { recursive: true });
  await writeFile(outputJson, `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(outputMd, renderMarkdown(report));

  console.log('Kosmo source-root unlock runbook');
  console.log(`Status: ${report.status}`);
  console.log(`Private diagnostic allowed: ${report.hard_state.private_diagnostic_allowed}`);
  console.log(`Selection options: ${report.selection_options.length}`);
  console.log(`Wrote: ${relative(root, outputMd)}`);
}

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

function renderMarkdown(report) {
  const lines = [];
  lines.push('# Kosmo Source-Root Unlock Runbook');
  lines.push('');
  lines.push(`Generated: ${report.generated_at}`);
  lines.push(`Status: \`${report.status}\``);
  lines.push('');
  lines.push('## Hard State');
  lines.push('');
  lines.push(`- Blocker: ${report.hard_state.blocker_status}`);
  lines.push(`- OneDrive marker/leaf/missing: ${report.hard_state.onedrive_marker_leaf_missing.join('/')}`);
  lines.push(`- Source-root candidates/probable/mirrors: ${report.hard_state.source_root_candidates}/${report.hard_state.probable_libraries}/${report.hard_state.workflow_mirrors}`);
  lines.push(`- Selected decision: ${report.hard_state.selected_decision || 'pending'}`);
  lines.push(`- Selected root exists: ${report.hard_state.selected_root_exists ? 'yes' : 'no'}`);
  lines.push(`- Private diagnostic allowed: ${report.hard_state.private_diagnostic_allowed ? 'yes' : 'no'}`);
  lines.push(`- Router status: ${report.hard_state.router_status}`);
  lines.push(`- Public-ready after runbook: ${report.hard_state.public_ready_after_runbook}`);
  lines.push('');
  lines.push('## Owner / Storage Actions');
  lines.push('');
  report.owner_storage_actions.forEach((item) => {
    lines.push(`- \`${item.id}\`: ${item.action} Success: ${item.success_condition}`);
  });
  lines.push('');
  lines.push('## Selection Options');
  lines.push('');
  lines.push('| Option | Class | Score | Path | Safe default |');
  lines.push('| --- | --- | ---: | --- | --- |');
  report.selection_options.forEach((option) => {
    lines.push(`| \`${option.id}\` | ${option.classification} | ${option.score ?? '-'} | ${option.path || '-'} | ${option.safe_default} |`);
  });
  lines.push('');
  lines.push('## Command Sequence After Storage Action');
  lines.push('');
  report.command_sequence_after_owner_storage_action.forEach((command) => lines.push(`- \`${command}\``));
  lines.push('');
  lines.push('## Still Forbidden Until Unlock');
  lines.push('');
  report.still_forbidden_until_unlock.forEach((item) => lines.push(`- ${item}`));
  lines.push('');
  lines.push('## Next Actions');
  lines.push('');
  report.next_actions.forEach((item) => lines.push(`- ${item}`));
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
