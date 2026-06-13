#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = new Date().toISOString().slice(0, 10);

const refs = {
  onedrive: resolve(root, args.onedrive || `data/kosmo-onedrive-sync-error-summary-${dateStamp}.json`),
  privateLibrary: resolve(root, args.privateLibrary || `data/kosmoreferences-private-library-diagnostic-${dateStamp}.json`),
  locator: resolve(root, args.locator || `data/kosmo-source-root-locator-${dateStamp}.json`),
  selectionBrief: resolve(root, args.selectionBrief || `data/kosmo-source-root-selection-brief-${dateStamp}.json`),
  decisionCheck: resolve(root, args.decisionCheck || `data/kosmo-source-root-decision-session-check-${dateStamp}.json`)
};

const outputJson = resolve(root, args.out || `data/kosmo-source-root-blocker-refresh-${dateStamp}.json`);
const outputMd = resolve(root, args.markdown || `docs/codex/kosmo-source-root-blocker-refresh-${dateStamp}.md`);

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const onedrive = await readJson(refs.onedrive);
  const privateLibrary = await readJson(refs.privateLibrary);
  const locator = await readJson(refs.locator);
  const selectionBrief = await readJson(refs.selectionBrief);
  const decisionCheck = await readJson(refs.decisionCheck);

  const stillBlocked = locator.summary?.probable_large_private_libraries === 0 &&
    decisionCheck.status === 'passed_pending_owner_input' &&
    decisionCheck.summary?.private_diagnostic_allowed !== true;

  const report = {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    status: stillBlocked ? 'source_root_blocker_still_active' : 'source_root_blocker_needs_review',
    policy: {
      metadata_only: true,
      reads_private_content: false,
      copies_private_content: false,
      writes_public_files: false,
      writes_public_manifest: false,
      public_ready_after_refresh: 0,
      note: 'This refresh summarizes storage/source-root diagnostics only. It does not read private source contents, select a root or unlock inventory.'
    },
    source_refs: Object.values(refs).map((path) => relative(root, path)),
    summary: {
      onedrive_status: onedrive.status,
      onedrive_marker_files: onedrive.summary?.marker_files ?? null,
      onedrive_leaf_marker_files: onedrive.summary?.leaf_marker_files ?? null,
      onedrive_aggregate_missing_items: onedrive.summary?.aggregate_missing_items ?? null,
      private_library_status: privateLibrary.status,
      private_library_book_like_files: privateLibrary.summary?.book_like_files ?? null,
      private_library_target_matches: privateLibrary.summary?.target_filename_matches ?? null,
      private_library_own_mounts: privateLibrary.summary?.own_mount_roots ?? null,
      source_root_locator_status: locator.status,
      source_root_candidates: locator.summary?.candidates ?? null,
      source_root_probable_libraries: locator.summary?.probable_large_private_libraries ?? null,
      source_root_workflow_mirrors: locator.summary?.workflow_or_project_mirrors ?? null,
      source_root_selection_status: selectionBrief.status,
      source_root_selection_options: selectionBrief.selection_options?.length ?? null,
      decision_check_status: decisionCheck.status,
      selected_decision: decisionCheck.summary?.selected_decision ?? null,
      selected_root_exists: decisionCheck.summary?.selected_root_exists ?? null,
      private_diagnostic_allowed: decisionCheck.summary?.private_diagnostic_allowed === true,
      public_ready_after_refresh: 0
    },
    blocked_until: [
      'Owner/KosmoOverseer selects or mounts a real source root.',
      'OneDrive sync markers are repaired or owner confirms a complete non-OneDrive source root.',
      'Source-root decision session passes with private_diagnostic_allowed=true.'
    ],
    allowed_now: [
      'Keep using owner review session brief for source-root question.',
      'Keep local worker outputs metadata-only and review-only.',
      'Rerun diagnostics after mount/sync changes.'
    ],
    forbidden_now: [
      'Do not run private inventory extraction.',
      'Do not download or OCR private PDFs.',
      'Do not copy private books, plans, images or lecture contents into Git.',
      'Do not mark Sogn, Ingenbohl or source-dependent assets public-ready.'
    ]
  };

  await mkdir(dirname(outputJson), { recursive: true });
  await mkdir(dirname(outputMd), { recursive: true });
  await writeFile(outputJson, `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(outputMd, renderMarkdown(report));

  console.log('Kosmo source-root blocker refresh');
  console.log(`Status: ${report.status}`);
  console.log(`OneDrive markers: ${report.summary.onedrive_marker_files}`);
  console.log(`Probable libraries: ${report.summary.source_root_probable_libraries}`);
  console.log(`Private diagnostic allowed: ${report.summary.private_diagnostic_allowed}`);
  console.log(`Wrote: ${relative(root, outputMd)}`);
}

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

function renderMarkdown(report) {
  const lines = [];
  lines.push('# Kosmo Source-Root Blocker Refresh');
  lines.push('');
  lines.push(`Generated: ${report.generated_at}`);
  lines.push(`Status: \`${report.status}\``);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- OneDrive status: ${report.summary.onedrive_status}`);
  lines.push(`- OneDrive markers/leaf/missing: ${report.summary.onedrive_marker_files}/${report.summary.onedrive_leaf_marker_files}/${report.summary.onedrive_aggregate_missing_items}`);
  lines.push(`- Private library: ${report.summary.private_library_status}`);
  lines.push(`- Private library book-like/target/own mounts: ${report.summary.private_library_book_like_files}/${report.summary.private_library_target_matches}/${report.summary.private_library_own_mounts}`);
  lines.push(`- Source-root locator: ${report.summary.source_root_locator_status}`);
  lines.push(`- Source-root candidates/probable/mirrors: ${report.summary.source_root_candidates}/${report.summary.source_root_probable_libraries}/${report.summary.source_root_workflow_mirrors}`);
  lines.push(`- Source-root selection: ${report.summary.source_root_selection_status}, options ${report.summary.source_root_selection_options}`);
  lines.push(`- Decision check: ${report.summary.decision_check_status}`);
  lines.push(`- Selected decision: ${report.summary.selected_decision || 'pending'}`);
  lines.push(`- Selected root exists: ${report.summary.selected_root_exists}`);
  lines.push(`- Private diagnostic allowed: ${report.summary.private_diagnostic_allowed ? 'yes' : 'no'}`);
  lines.push(`- Public-ready after refresh: ${report.summary.public_ready_after_refresh}`);
  lines.push('');
  lines.push('## Blocked Until');
  lines.push('');
  report.blocked_until.forEach((item) => lines.push(`- ${item}`));
  lines.push('');
  lines.push('## Allowed Now');
  lines.push('');
  report.allowed_now.forEach((item) => lines.push(`- ${item}`));
  lines.push('');
  lines.push('## Forbidden Now');
  lines.push('');
  report.forbidden_now.forEach((item) => lines.push(`- ${item}`));
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
