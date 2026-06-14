#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = new Date().toISOString().slice(0, 10);
const locatorPath = resolve(root, args.locator || `data/kosmo-source-root-locator-${dateStamp}.json`);
const storagePath = resolve(root, args.storage || `data/kosmo-storage-mount-snapshot-${dateStamp}.json`);
const outputJson = resolve(root, args.out || `data/kosmo-source-root-selection-brief-${dateStamp}.json`);
const outputMd = resolve(root, args.markdown || `docs/codex/kosmo-source-root-selection-brief-${dateStamp}.md`);

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const locator = JSON.parse(await readFile(locatorPath, 'utf8'));
  const storage = await readOptionalJson(storagePath);
  const candidateRows = locator.candidates || [];
  const report = {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    status: 'source_root_owner_selection_needed',
    policy: {
      review_only: true,
      copied_private_content: false,
      inventory_allowed_now: false,
      public_ready_allowed: false,
      note: 'This brief converts source-root locator metadata into an owner/overseer selection worksheet. It does not read, copy, ingest or approve private source files.'
    },
    source_refs: [relative(root, locatorPath), relative(root, storagePath)],
    summary: {
      locator_status: locator.status,
      candidates: locator.summary?.candidates ?? candidateRows.length,
      probable_large_private_libraries: locator.summary?.probable_large_private_libraries ?? 0,
      workflow_or_project_mirrors: locator.summary?.workflow_or_project_mirrors ?? null,
      onedrive_like_roots: locator.summary?.onedrive_like_roots ?? null,
      roots_with_sync_errors: locator.summary?.roots_with_sync_errors ?? null,
      archive_mount_visible: storage?.summary?.archive_mount_visible === true,
      archive_mount_source: storage?.summary?.archive_mount_source || null,
      archive_mount_total_gib: storage?.summary?.archive_mount_total_gib ?? null,
      data_mount_source: storage?.summary?.data_mount_source || null,
      data_mount_total_gib: storage?.summary?.data_mount_total_gib ?? null,
      owner_selection_required: true,
      private_inventory_allowed_after_selection: true,
      public_ready_after_brief: 0
    },
    selection_options: buildSelectionOptions(locator, candidateRows),
    owner_questions: buildOwnerQuestions(storage),
    blocked_until_selection: [
      'sogn_private_source_inventory',
      'ingenbohl_pdf_private_extraction',
      'source_dependent_asset_authoring',
      'public_ready_promotion_from_private_sources'
    ],
    next_actions: [
      'Owner/Claude/KosmoOverseer selects the exact real private source root, now preferably as a concrete folder path rather than a broad mount.',
      'Run npm run kosmo:private-library-diagnostic -- --roots "<selected-root>" after selection.',
      'Open a private metadata-only inventory task under KosmoZentrale, not Git.',
      'Keep all source-dependent public-ready states at 0 until provenance and rights reviews pass.'
    ]
  };

  await mkdir(dirname(outputJson), { recursive: true });
  await mkdir(dirname(outputMd), { recursive: true });
  await writeFile(outputJson, `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(outputMd, renderMarkdown(report));

  console.log('Kosmo source-root selection brief');
  console.log(`Status: ${report.status}`);
  console.log(`Options: ${report.selection_options.length}`);
  console.log(`Wrote: ${relative(root, outputMd)}`);
}

function buildOwnerQuestions(storage) {
  const archiveVisible = storage?.summary?.archive_mount_visible === true;
  return [
    {
      id: 'true_private_library_root',
      question: 'Which exact path is the real large book/ETH/HSLU architecture source library?',
      safe_default: 'unknown_keep_blocked'
    },
    {
      id: 'archive_mount',
      question: archiveVisible
        ? 'The archive HDD is mounted at /mnt/archiv. Which exact folder inside it, if any, is the real private source root?'
        : 'Should the archive HDD be mounted or exposed at a different path than /mnt/archiv?',
      safe_default: archiveVisible ? 'select_exact_subfolder_or_keep_blocked' : 'do_not_assume_mounted'
    },
    {
      id: 'onedrive_repair',
      question: 'Should OneDrive sync repair happen before any private metadata inventory?',
      safe_default: 'repair_before_inventory'
    },
    {
      id: 'private_inventory_scope',
      question: 'After a true root is selected, should the first inventory cover only Villa/Sogn/Ingenbohl or the whole architecture library?',
      safe_default: 'pilots_first_metadata_only'
    }
  ];
}

function buildSelectionOptions(locator, candidates) {
  const options = [];
  const topCandidates = candidates.slice(0, 8);
  for (const candidate of topCandidates) {
    options.push({
      id: slug(candidate.classification, candidate.path),
      path: candidate.path,
      classification: candidate.classification,
      role_guess: roleGuess(candidate),
      score: candidate.score,
      book_like_files: candidate.counts?.book_like_files ?? 0,
      lecture_like_files: candidate.counts?.lecture_like_files ?? 0,
      sync_error_files: candidate.counts?.sync_error_files ?? 0,
      recommended_action: recommendedAction(candidate),
      safe_default: candidate.classification === 'probable_large_private_library' ? 'inspect_privately_before_inventory' : 'keep_blocked'
    });
  }
  options.push({
    id: 'mount_archive_or_missing_root',
    path: null,
    classification: 'missing_or_unmounted_root',
    role_guess: 'owner_storage_action',
    score: null,
    book_like_files: null,
    lecture_like_files: null,
    sync_error_files: null,
    recommended_action: 'Mount or expose the real archive/OneDrive library root, then rerun locator and private-library diagnostic.',
    safe_default: 'keep_blocked'
  });
  if ((locator.summary?.roots_with_sync_errors ?? 0) > 0) {
    options.push({
      id: 'repair_onedrive_first',
      path: null,
      classification: 'sync_repair_first',
      role_guess: 'onedrive_integrity_gate',
      score: null,
      book_like_files: null,
      lecture_like_files: null,
      sync_error_files: locator.summary.roots_with_sync_errors,
      recommended_action: 'Resolve OneDrive sync error roots before using visible OneDrive mirrors for inventory.',
      safe_default: 'repair_before_inventory'
    });
  }
  return options;
}

function recommendedAction(candidate) {
  const role = roleGuess(candidate);
  if (role === 'workflow_mirror_or_codex_context') {
    return 'Treat as workflow/context mirror first; only select as source root if owner explicitly confirms it contains the complete private architecture library.';
  }
  if (role === 'asset_material_library_candidate') {
    return 'Treat as KosmoAsset/material-library candidate; do not use as the main architecture reference root without owner confirmation.';
  }
  if (role === 'onedrive_mirror_candidate') {
    return 'Treat as OneDrive mirror candidate; confirm completeness and sync health before any private metadata inventory.';
  }
  if (candidate.classification === 'probable_large_private_library') {
    return 'Privately inspect as selected root candidate, then run private-library diagnostic with this exact path.';
  }
  if (candidate.classification === 'incomplete_onedrive_candidate') {
    return 'Do not inventory yet; repair sync errors or confirm the complete synced root first.';
  }
  if (candidate.classification === 'workflow_or_project_mirror') {
    return 'Treat as workflow mirror only; do not use as the large architecture source library.';
  }
  if (candidate.classification === 'weak_path_signal') {
    return 'Use only as a mount/path clue; not enough evidence for private inventory.';
  }
  return 'Keep blocked unless owner/overseer confirms this exact path as the real source root.';
}

function roleGuess(candidate) {
  const lower = String(candidate.path || '').toLowerCase();
  if (lower.includes('kosmowebsite') || lower.includes('repo-context') || lower.includes('/reports')) return 'workflow_mirror_or_codex_context';
  if (lower.includes('pbr library') || lower.includes('hdri') || lower.includes('/assets/')) return 'asset_material_library_candidate';
  if (lower.includes('onedrive') || lower.includes('fromssd')) return 'onedrive_mirror_candidate';
  if (lower.startsWith('/mnt/archiv')) return 'archive_subtree_candidate';
  return 'unknown_owner_confirmation_required';
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
  lines.push('# Kosmo Source-Root Selection Brief');
  lines.push('');
  lines.push(`Generated: ${report.generated_at}`);
  lines.push(`Status: \`${report.status}\``);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Locator status: ${report.summary.locator_status}`);
  lines.push(`- Candidates: ${report.summary.candidates}`);
  lines.push(`- Probable large private libraries: ${report.summary.probable_large_private_libraries}`);
  lines.push(`- Workflow/project mirrors: ${report.summary.workflow_or_project_mirrors}`);
  lines.push(`- OneDrive-like roots: ${report.summary.onedrive_like_roots}`);
  lines.push(`- Roots with sync errors: ${report.summary.roots_with_sync_errors}`);
  lines.push(`- Archive mount visible: ${report.summary.archive_mount_visible ? 'yes' : 'no'}`);
  lines.push(`- Archive mount source/total GiB: ${report.summary.archive_mount_source || '-'}/${report.summary.archive_mount_total_gib ?? '-'}`);
  lines.push(`- Data mount source/total GiB: ${report.summary.data_mount_source || '-'}/${report.summary.data_mount_total_gib ?? '-'}`);
  lines.push(`- Owner selection required: ${report.summary.owner_selection_required ? 'yes' : 'no'}`);
  lines.push(`- Public-ready after brief: ${report.summary.public_ready_after_brief}`);
  lines.push('');
  lines.push('## Selection Options');
  lines.push('');
  lines.push('| Option | Role guess | Classification | Score | Path | Safe default | Recommended action |');
  lines.push('| --- | --- | --- | ---: | --- | --- | --- |');
  for (const option of report.selection_options) {
    lines.push(`| \`${option.id}\` | ${option.role_guess} | ${option.classification} | ${option.score ?? '-'} | ${option.path ? `\`${escapePipe(option.path)}\`` : '-' } | ${option.safe_default} | ${escapePipe(option.recommended_action)} |`);
  }
  lines.push('');
  lines.push('## Owner Questions');
  lines.push('');
  for (const item of report.owner_questions) {
    lines.push(`- \`${item.id}\`: ${item.question} Safe default: \`${item.safe_default}\`.`);
  }
  lines.push('');
  lines.push('## Blocked Until Selection');
  lines.push('');
  report.blocked_until_selection.forEach((item) => lines.push(`- \`${item}\``));
  lines.push('');
  lines.push('## Next Actions');
  lines.push('');
  report.next_actions.forEach((action) => lines.push(`- ${action}`));
  lines.push('');
  lines.push('## Safety');
  lines.push('');
  lines.push('This brief is metadata-only. It does not authorize private extraction, public-ready flags, PDF ingestion or source-dependent asset promotion.');
  lines.push('');
  return `${lines.join('\n')}`;
}

function slug(...parts) {
  return parts
    .join(' ')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 90);
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
