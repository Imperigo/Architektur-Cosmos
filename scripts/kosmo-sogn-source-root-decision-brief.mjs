#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = new Date().toISOString().slice(0, 10);
const sourcePackagePath = resolve(root, args.sourcePackage || 'examples/kosmo-references/source-packages/kapelle-sogn-benedetg-public-source-candidate-2026-06-13/source-package.json');
const provenancePath = resolve(root, args.provenance || 'examples/kosmo-references/provenance/kapelle-sogn-benedetg-file-level-provenance-2026-06-13.json');
const privateLibraryPath = resolve(root, args.privateLibrary || 'data/kosmoreferences-private-library-diagnostic-2026-06-13.json');
const oneDriveRepairPath = resolve(root, args.oneDriveRepair || 'data/kosmo-onedrive-sync-error-summary-2026-06-13.json');
const outputJson = resolve(root, args.out || `data/sogn-benedetg-source-root-decision-brief-${dateStamp}.json`);
const outputMd = resolve(root, args.markdown || `docs/codex/sogn-benedetg-source-root-decision-brief-${dateStamp}.md`);

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const sourcePackage = await readJson(sourcePackagePath);
  const provenance = await readJson(provenancePath);
  const privateLibrary = await readJson(privateLibraryPath);
  const oneDriveRepair = await readJson(oneDriveRepairPath);

  const report = {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    status: 'sogn_source_root_decision_needed',
    policy: {
      review_only: true,
      public_ready_allowed: false,
      private_content_copied: false,
      generated_geometry_allowed_now: false,
      note: 'This brief records the source-root decision needed for Sogn Benedetg. It does not copy private books, lecture text, plans, images or public web page bodies.'
    },
    source_refs: [
      relative(root, sourcePackagePath),
      relative(root, provenancePath),
      relative(root, privateLibraryPath),
      relative(root, oneDriveRepairPath)
    ],
    summary: {
      public_link_sources: sourcePackage.sources?.length ?? 0,
      local_file_count: provenance.summary?.files ?? 0,
      public_ready_files: provenance.summary?.public_ready_files ?? 0,
      private_library_status: privateLibrary.status,
      private_library_book_like_files: privateLibrary.summary?.book_like_files ?? null,
      private_library_sync_errors: privateLibrary.summary?.sync_error_files ?? null,
      archive_mount_visible: privateLibrary.summary?.archive_mount_visible === true,
      onedrive_marker_files: oneDriveRepair.summary?.marker_files ?? null,
      onedrive_leaf_markers: oneDriveRepair.summary?.leaf_marker_files ?? null,
      onedrive_missing_items: oneDriveRepair.summary?.aggregate_missing_items ?? null,
      recommended_default: 'keep_link_only_until_private_source_root_visible',
      public_ready_after_brief: 0
    },
    decision_options: [
      {
        id: 'keep_link_only',
        description: 'Keep Sogn Benedetg as a public-link, review-only source candidate.',
        safe_default: true,
        public_ready_after_option: 0
      },
      {
        id: 'mount_private_library_root',
        description: 'Mount or expose the real private book/ETH/HSLU library root, then rerun diagnostics before source inventory.',
        safe_default: false,
        public_ready_after_option: 0
      },
      {
        id: 'repair_onedrive_then_scan',
        description: 'Resolve OneDrive sync errors first, then rerun the OneDrive and private-library diagnostics.',
        safe_default: false,
        public_ready_after_option: 0
      },
      {
        id: 'create_private_metadata_inventory',
        description: 'After a real source root is visible, create a private metadata-only inventory for Sogn-related books, lectures, plans and images.',
        safe_default: false,
        public_ready_after_option: 0
      }
    ],
    blocked_modes: [
      'public_geometry_from_hypothesis',
      'copy_private_book_or_lecture_text_to_git',
      'copy_public_web_page_bodies_to_git',
      'publish_plan_or_image_without_file_level_rights',
      'mark_sogn_assets_public_ready_from_this_brief'
    ],
    next_actions: [
      'Keep Sogn Benedetg link-only and review-only until the real private source root is visible.',
      'Resolve the OneDrive repair sweep or mount the archive/private-library root before source inventory.',
      'If a root becomes visible, write only metadata inventories to KosmoZentrale private paths first.',
      'Do not harden teardrop-plan, timber-structure or material claims before source review exists.'
    ]
  };

  await mkdir(dirname(outputJson), { recursive: true });
  await mkdir(dirname(outputMd), { recursive: true });
  await writeFile(outputJson, `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(outputMd, renderMarkdown(report));

  console.log('Sogn Benedetg source-root decision brief');
  console.log(`Status: ${report.status}`);
  console.log(`Public links: ${report.summary.public_link_sources}`);
  console.log(`Local files: ${report.summary.local_file_count}`);
  console.log(`Wrote: ${relative(root, outputMd)}`);
}

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

function renderMarkdown(report) {
  const lines = [];
  lines.push('# Sogn Benedetg Source-Root Decision Brief');
  lines.push('');
  lines.push(`Generated: ${report.generated_at}`);
  lines.push(`Status: \`${report.status}\``);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Public link sources: ${report.summary.public_link_sources}`);
  lines.push(`- Local file count: ${report.summary.local_file_count}`);
  lines.push(`- Public-ready files: ${report.summary.public_ready_files}`);
  lines.push(`- Private library status: ${report.summary.private_library_status}`);
  lines.push(`- Private library book-like files: ${report.summary.private_library_book_like_files}`);
  lines.push(`- Private library sync errors: ${report.summary.private_library_sync_errors}`);
  lines.push(`- Archive mount visible: ${report.summary.archive_mount_visible ? 'yes' : 'no'}`);
  lines.push(`- OneDrive repair sweep: ${report.summary.onedrive_leaf_markers}/${report.summary.onedrive_marker_files} markers, ${report.summary.onedrive_missing_items} missing`);
  lines.push(`- Recommended default: \`${report.summary.recommended_default}\``);
  lines.push(`- Public-ready after brief: ${report.summary.public_ready_after_brief}`);
  lines.push('');
  lines.push('## Decision Options');
  lines.push('');
  lines.push('| Option | Safe default | Public-ready after option | Description |');
  lines.push('| --- | --- | ---: | --- |');
  for (const option of report.decision_options) {
    lines.push(`| \`${option.id}\` | ${option.safe_default ? 'yes' : 'no'} | ${option.public_ready_after_option} | ${escapePipe(option.description)} |`);
  }
  lines.push('');
  lines.push('## Blocked Modes');
  lines.push('');
  report.blocked_modes.forEach((mode) => lines.push(`- \`${mode}\``));
  lines.push('');
  lines.push('## Next Actions');
  lines.push('');
  report.next_actions.forEach((action) => lines.push(`- ${action}`));
  lines.push('');
  lines.push('## Safety');
  lines.push('');
  lines.push('This brief does not approve media, generated geometry, plan reproduction or public asset promotion. Sogn remains link-only/review-only until a real private source root and file-level evidence exist.');
  lines.push('');
  return `${lines.join('\n')}`;
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
