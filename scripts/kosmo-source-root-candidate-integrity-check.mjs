#!/usr/bin/env node

import { access, mkdir, readFile, readdir, statfs, writeFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = new Date().toISOString().slice(0, 10);

const refs = {
  selectionBrief: resolve(root, args.selectionBrief || `data/kosmo-source-root-selection-brief-${dateStamp}.json`),
  storageSnapshot: resolve(root, args.storageSnapshot || `data/kosmo-storage-mount-snapshot-${dateStamp}.json`),
  decisionCheck: resolve(root, args.decisionCheck || `data/kosmo-source-root-decision-session-check-${dateStamp}.json`)
};

const outputJson = resolve(root, args.out || `data/kosmo-source-root-candidate-integrity-check-${dateStamp}.json`);
const outputMd = resolve(root, args.markdown || `docs/codex/kosmo-source-root-candidate-integrity-check-${dateStamp}.md`);

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const selection = JSON.parse(await readFile(refs.selectionBrief, 'utf8'));
  const storage = await readOptionalJson(refs.storageSnapshot);
  const decision = await readOptionalJson(refs.decisionCheck);
  const mounts = await readMounts();
  const optionChecks = [];

  for (const option of selection.selection_options || []) {
    optionChecks.push(await checkOption(option, mounts));
  }

  const pathOptions = optionChecks.filter((item) => item.has_path);
  const existingPathOptions = pathOptions.filter((item) => item.exists);
  const archivePathOptions = existingPathOptions.filter((item) => item.on_archive_mount);
  const workflowMirrors = existingPathOptions.filter((item) => item.role_guess === 'workflow_mirror_or_codex_context');
  const assetCandidates = existingPathOptions.filter((item) => item.role_guess === 'asset_material_library_candidate');
  const broadUnsafe = existingPathOptions.filter((item) => item.guard_class === 'broad_project_or_mount_root');
  const activationCandidates = existingPathOptions.filter((item) => item.guard_class === 'owner_confirmable_exact_root');
  const failures = [];

  if (selection.status !== 'source_root_owner_selection_needed') {
    failures.push(`Unexpected selection brief status: ${selection.status || 'missing'}`);
  }
  if (storage?.summary?.archive_mount_visible !== true) {
    failures.push('Archive mount should be visible before candidate integrity is trusted.');
  }
  if (decision?.summary?.private_diagnostic_allowed === true && activationCandidates.length === 0) {
    failures.push('Decision check allows private diagnostic but no owner-confirmable exact root is visible.');
  }

  const report = {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    status: failures.length === 0
      ? 'source_root_candidate_integrity_owner_review_ready'
      : 'source_root_candidate_integrity_needs_review',
    policy: {
      metadata_only: true,
      reads_file_contents: false,
      copies_private_content: false,
      selects_source_root: false,
      runs_private_diagnostic: false,
      public_ready_after_check: 0,
      note: 'This check verifies candidate path existence, mount placement and top-level metadata only. It does not open private files or approve a source root.'
    },
    source_refs: Object.values(refs).map((path) => relative(root, path)),
    summary: {
      selection_status: selection.status || null,
      selection_options: optionChecks.length,
      path_options: pathOptions.length,
      existing_path_options: existingPathOptions.length,
      archive_path_options: archivePathOptions.length,
      workflow_mirror_options: workflowMirrors.length,
      asset_candidate_options: assetCandidates.length,
      broad_unsafe_options: broadUnsafe.length,
      owner_confirmable_exact_roots: activationCandidates.length,
      archive_mount_visible: storage?.summary?.archive_mount_visible === true,
      archive_mount_source: storage?.summary?.archive_mount_source || null,
      data_mount_source: storage?.summary?.data_mount_source || null,
      private_diagnostic_allowed: decision?.summary?.private_diagnostic_allowed === true,
      selected_root_exists: decision?.summary?.selected_root_exists === true,
      failures: failures.length,
      public_ready_after_check: 0
    },
    option_checks: optionChecks,
    guardrails: [
      'Visible archive paths are evidence only; they are not selected roots.',
      'Workflow mirrors and repo-context paths stay blocked unless the owner explicitly confirms they are the complete private library.',
      'Asset/material libraries may feed KosmoAsset review lanes, but not the main KosmoReferences source root by default.',
      'Broad project roots or mount roots are too coarse for automatic activation.',
      'Private inventory remains blocked until the decision session records one exact owner-confirmed root.'
    ],
    failures,
    next_actions: failures.length === 0
      ? [
          'Present the existing archive path candidates to Owner/KosmoOverseer as review-only options.',
          'Ask for one exact private library root, preferably a subfolder that is not a workflow mirror or asset-only library.',
          'After the decision session is edited by the owner/overseer, rerun source-root decision check, blocker refresh and activation preflight.'
        ]
      : [
          'Review failures before relying on candidate integrity.',
          'Rerun storage mount snapshot and source-root selection brief after storage changes.',
          'Keep private metadata inventory blocked.'
        ]
  };

  await mkdir(dirname(outputJson), { recursive: true });
  await mkdir(dirname(outputMd), { recursive: true });
  await writeFile(outputJson, `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(outputMd, renderMarkdown(report));

  console.log('Kosmo source-root candidate integrity check');
  console.log(`Status: ${report.status}`);
  console.log(`Existing path options: ${report.summary.existing_path_options}/${report.summary.path_options}`);
  console.log(`Owner-confirmable exact roots: ${report.summary.owner_confirmable_exact_roots}`);
  console.log(`Failures: ${report.summary.failures}`);
  console.log(`Wrote: ${relative(root, outputMd)}`);

  if (failures.length > 0) process.exitCode = 1;
}

async function checkOption(option, mounts) {
  if (!option.path) {
    return {
      id: option.id,
      path: null,
      has_path: false,
      exists: false,
      role_guess: option.role_guess,
      classification: option.classification,
      guard_class: option.classification === 'sync_repair_first' ? 'sync_repair_gate' : 'owner_storage_action',
      activation_allowed_now: false,
      reason: option.recommended_action || 'Owner/storage action option.'
    };
  }

  const exists = await pathExists(option.path);
  const mount = exists ? findMount(option.path, mounts) : null;
  const topLevel = exists ? await topLevelSummary(option.path) : null;
  const fs = exists ? await filesystemStats(option.path) : null;
  const guardClass = guardClassFor({ option, mount, topLevel });

  return {
    id: option.id,
    path: option.path,
    has_path: true,
    exists,
    mount_point: mount?.mount_point || null,
    mount_source: mount?.source || null,
    mount_fstype: mount?.fstype || null,
    on_archive_mount: mount?.mount_point === '/mnt/archiv',
    on_data_mount: mount?.mount_point === '/mnt/data',
    role_guess: option.role_guess,
    classification: option.classification,
    score: option.score ?? null,
    book_like_files: option.book_like_files ?? null,
    lecture_like_files: option.lecture_like_files ?? null,
    sync_error_files: option.sync_error_files ?? null,
    top_level_entries: topLevel?.entries ?? null,
    top_level_directories: topLevel?.directories ?? null,
    top_level_files: topLevel?.files ?? null,
    filesystem_total_gib: fs?.total_gib ?? null,
    guard_class: guardClass,
    activation_allowed_now: false,
    reason: reasonFor({ option, exists, mount, guardClass })
  };
}

function guardClassFor({ option, mount, topLevel }) {
  if (!mount) return 'missing_path';
  if (['workflow_mirror_or_codex_context', 'asset_material_library_candidate', 'onedrive_mirror_candidate'].includes(option.role_guess)) {
    return option.role_guess;
  }
  if (['/mnt/data', '/mnt/archiv', '/mnt/data/ArchitekturKosmos'].includes(option.path)) return 'broad_project_or_mount_root';
  if ((topLevel?.entries ?? 0) > 500) return 'broad_project_or_mount_root';
  if (option.classification === 'probable_large_private_library') return 'owner_confirmable_exact_root';
  if (option.role_guess === 'archive_subtree_candidate') return 'owner_confirmable_exact_root';
  return 'owner_confirmation_required';
}

function reasonFor({ option, exists, mount, guardClass }) {
  if (!exists) return 'Path does not exist in the current local environment.';
  if (!mount) return 'Path exists but mount metadata could not be resolved.';
  if (guardClass === 'workflow_mirror_or_codex_context') return 'Visible but looks like workflow/repo context, not the complete private architecture library.';
  if (guardClass === 'asset_material_library_candidate') return 'Visible but better treated as KosmoAsset/material source, not main KosmoReferences source root.';
  if (guardClass === 'onedrive_mirror_candidate') return 'Visible OneDrive mirror; confirm sync completeness before any private metadata inventory.';
  if (guardClass === 'broad_project_or_mount_root') return 'Visible but too broad for automatic activation.';
  if (guardClass === 'owner_confirmable_exact_root') return 'Visible archive subtree; owner/overseer may confirm this exact path before diagnostics.';
  return option.recommended_action || 'Visible path still requires owner confirmation.';
}

async function topLevelSummary(path) {
  try {
    const entries = await readdir(path, { withFileTypes: true });
    return {
      entries: entries.length,
      directories: entries.filter((entry) => entry.isDirectory()).length,
      files: entries.filter((entry) => entry.isFile()).length
    };
  } catch {
    return null;
  }
}

async function filesystemStats(path) {
  try {
    const stats = await statfs(path);
    const total = Number(stats.blocks) * Number(stats.bsize);
    const available = Number(stats.bavail) * Number(stats.bsize);
    return {
      total_gib: roundGiB(total),
      available_gib: roundGiB(available)
    };
  } catch {
    return null;
  }
}

async function readMounts() {
  const source = await readFile('/proc/self/mountinfo', 'utf8');
  return source.split('\n').filter(Boolean).map((line) => {
    const [left, right = ''] = line.split(' - ');
    const leftParts = left.split(' ');
    const rightParts = right.split(' ');
    return {
      mount_point: unescapeMount(leftParts[4] || ''),
      fstype: rightParts[0] || null,
      source: rightParts[1] || null
    };
  }).filter((item) => item.mount_point);
}

function findMount(path, mounts) {
  return mounts
    .filter((mount) => path === mount.mount_point || path.startsWith(`${mount.mount_point.replace(/\/$/, '')}/`))
    .sort((a, b) => b.mount_point.length - a.mount_point.length)[0] || null;
}

async function pathExists(path) {
  try {
    await access(path, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function readOptionalJson(path) {
  try {
    return JSON.parse(await readFile(path, 'utf8'));
  } catch {
    return null;
  }
}

function renderMarkdown(report) {
  const lines = [];
  lines.push('# Kosmo Source-Root Candidate Integrity Check');
  lines.push('');
  lines.push(`Generated: ${report.generated_at}`);
  lines.push(`Status: \`${report.status}\``);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Selection status: ${report.summary.selection_status}`);
  lines.push(`- Options/path/existing: ${report.summary.selection_options}/${report.summary.path_options}/${report.summary.existing_path_options}`);
  lines.push(`- Archive path options: ${report.summary.archive_path_options}`);
  lines.push(`- Workflow mirror options: ${report.summary.workflow_mirror_options}`);
  lines.push(`- Asset candidate options: ${report.summary.asset_candidate_options}`);
  lines.push(`- Broad unsafe options: ${report.summary.broad_unsafe_options}`);
  lines.push(`- Owner-confirmable exact roots: ${report.summary.owner_confirmable_exact_roots}`);
  lines.push(`- Archive mount visible/source: ${report.summary.archive_mount_visible ? 'yes' : 'no'}/${report.summary.archive_mount_source || '-'}`);
  lines.push(`- Private diagnostic allowed: ${report.summary.private_diagnostic_allowed ? 'yes' : 'no'}`);
  lines.push(`- Selected root exists: ${report.summary.selected_root_exists ? 'yes' : 'no'}`);
  lines.push(`- Failures: ${report.summary.failures}`);
  lines.push(`- Public-ready after check: ${report.summary.public_ready_after_check}`);
  lines.push('');
  lines.push('## Option Checks');
  lines.push('');
  lines.push('| Option | Exists | Mount | Role | Guard | Top-level | Reason |');
  lines.push('| --- | --- | --- | --- | --- | ---: | --- |');
  report.option_checks.forEach((item) => {
    lines.push(`| \`${item.id}\` | ${item.exists ? 'yes' : item.has_path ? 'no' : '-'} | ${item.mount_point || '-'} | ${item.role_guess || '-'} | ${item.guard_class} | ${item.top_level_entries ?? '-'} | ${escapePipe(item.reason)} |`);
  });
  lines.push('');
  lines.push('## Guardrails');
  lines.push('');
  report.guardrails.forEach((item) => lines.push(`- ${item}`));
  lines.push('');
  if (report.failures.length > 0) {
    lines.push('## Failures');
    lines.push('');
    report.failures.forEach((item) => lines.push(`- ${item}`));
    lines.push('');
  }
  lines.push('## Next Actions');
  lines.push('');
  report.next_actions.forEach((item) => lines.push(`- ${item}`));
  lines.push('');
  return lines.join('\n');
}

function roundGiB(bytes) {
  return Math.round((bytes / 1024 / 1024 / 1024) * 10) / 10;
}

function unescapeMount(value) {
  return value.replace(/\\040/g, ' ');
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
