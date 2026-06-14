#!/usr/bin/env node

import { access, mkdir, readdir, readFile, statfs, writeFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = new Date().toISOString().slice(0, 10);

const defaultTargets = [
  '/mnt/data',
  '/mnt/archiv',
  '/mnt/data/ArchitekturKosmos',
  '/mnt/data/ArchitekturKosmos/11_AI_Workflow/OneDrive_2026-06-09',
  '/home/andrin-baumann/ArchitekturKosmos Onedrive'
];

const outputJson = resolve(root, args.out || `data/kosmo-storage-mount-snapshot-${dateStamp}.json`);
const outputMd = resolve(root, args.markdown || `docs/codex/kosmo-storage-mount-snapshot-${dateStamp}.md`);

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const mounts = await readMounts();
  const targets = String(args.targets || defaultTargets.join('|')).split('|').filter(Boolean);
  const targetReports = [];
  for (const target of targets) {
    targetReports.push(await inspectTarget(target, mounts));
  }
  const dataMount = targetReports.find((item) => item.path === '/mnt/data');
  const archiveMount = targetReports.find((item) => item.path === '/mnt/archiv');
  const projectRoot = targetReports.find((item) => item.path === '/mnt/data/ArchitekturKosmos');
  const onedriveTargets = targetReports.filter((item) => item.path.toLowerCase().includes('onedrive'));

  const report = {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    status: statusFor({ dataMount, archiveMount, projectRoot, onedriveTargets }),
    policy: {
      metadata_only: true,
      reads_file_contents: false,
      copies_private_content: false,
      selects_source_root: false,
      runs_private_diagnostic: false,
      public_ready_after_snapshot: 0,
      note: 'This snapshot records mount and top-level path metadata only. It is evidence for owner/source-root decisions, not a source-root decision.'
    },
    summary: {
      data_mount_visible: dataMount?.own_mount === true,
      data_mount_source: dataMount?.mount?.source || null,
      data_mount_fstype: dataMount?.mount?.fstype || null,
      data_mount_total_gib: dataMount?.filesystem?.total_gib ?? null,
      data_mount_available_gib: dataMount?.filesystem?.available_gib ?? null,
      archive_mount_visible: archiveMount?.own_mount === true,
      archive_mount_source: archiveMount?.mount?.source || null,
      archive_mount_fstype: archiveMount?.mount?.fstype || null,
      archive_mount_total_gib: archiveMount?.filesystem?.total_gib ?? null,
      archive_mount_available_gib: archiveMount?.filesystem?.available_gib ?? null,
      archive_target_exists: archiveMount?.exists === true,
      active_project_root_path: '/mnt/data/ArchitekturKosmos',
      archive_root_path: '/mnt/archiv',
      project_root_exists: projectRoot?.exists === true,
      project_root_own_mount: projectRoot?.own_mount === true,
      onedrive_targets_visible: onedriveTargets.filter((item) => item.exists).length,
      source_root_decision: 'owner_selection_still_required',
      public_ready_after_snapshot: 0
    },
    targets: targetReports,
    interpretation: interpretationFor({ dataMount, archiveMount, projectRoot, onedriveTargets }),
    next_actions: nextActionsFor({ archiveMount })
  };

  await mkdir(dirname(outputJson), { recursive: true });
  await mkdir(dirname(outputMd), { recursive: true });
  await writeFile(outputJson, `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(outputMd, renderMarkdown(report));

  console.log('Kosmo storage mount snapshot');
  console.log(`Status: ${report.status}`);
  console.log(`Data mount: ${report.summary.data_mount_visible ? 'visible' : 'missing'}`);
  console.log(`Archive mount: ${report.summary.archive_mount_visible ? 'visible' : 'not-own-mount'}`);
  console.log(`Project root exists: ${report.summary.project_root_exists}`);
  console.log(`Wrote: ${relative(root, outputMd)}`);
}

async function inspectTarget(path, mounts) {
  const exists = await pathExists(path);
  const mount = exists ? findMount(path, mounts) : null;
  const filesystem = exists ? await filesystemStats(path) : null;
  const topLevel = exists ? await topLevelSummary(path) : null;
  return {
    path,
    exists,
    own_mount: mount?.mount_point === path,
    mount,
    filesystem,
    top_level: topLevel
  };
}

async function filesystemStats(path) {
  try {
    const stats = await statfs(path);
    const total = Number(stats.blocks) * Number(stats.bsize);
    const available = Number(stats.bavail) * Number(stats.bsize);
    return {
      total_gib: roundGiB(total),
      available_gib: roundGiB(available),
      used_gib: roundGiB(total - available)
    };
  } catch {
    return null;
  }
}

async function topLevelSummary(path) {
  try {
    const entries = await readdir(path, { withFileTypes: true });
    return {
      entries: entries.length,
      directories: entries.filter((entry) => entry.isDirectory()).length,
      files: entries.filter((entry) => entry.isFile()).length,
      symlinks: entries.filter((entry) => entry.isSymbolicLink()).length,
      sample_entries: entries.map((entry) => entry.name).sort((a, b) => a.localeCompare(b)).slice(0, 12)
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

function statusFor({ dataMount, archiveMount, projectRoot }) {
  if (dataMount?.own_mount && archiveMount?.own_mount && projectRoot?.exists) return 'storage_snapshot_archive_mount_visible';
  if (dataMount?.own_mount && projectRoot?.exists) return 'storage_snapshot_data_mount_visible_archive_missing';
  return 'storage_snapshot_needs_owner_storage_review';
}

function interpretationFor({ dataMount, archiveMount, projectRoot, onedriveTargets }) {
  const notes = [];
  if (dataMount?.own_mount) notes.push('/mnt/data is the active large SSD mount.');
  if (archiveMount?.own_mount) notes.push('/mnt/archiv is an own mounted archive drive; owner still must select the exact source-root folder inside it or elsewhere.');
  if (archiveMount?.exists && !archiveMount?.own_mount) notes.push('/mnt/archiv exists as a directory but is not an own mounted archive drive.');
  if (projectRoot?.exists && !projectRoot?.own_mount) notes.push('/mnt/data/ArchitekturKosmos is a project/workspace root inside the SSD mount, not a separate source-library mount.');
  if (onedriveTargets.some((item) => item.exists)) notes.push('OneDrive-like roots are visible, but source-root guards still require sync repair or explicit owner confirmation.');
  notes.push('No source root is selected by this snapshot.');
  return notes;
}

function nextActionsFor({ archiveMount }) {
  const actions = [];
  if (archiveMount?.own_mount) {
    actions.push('Owner/KosmoOverseer should confirm the exact source-root folder inside /mnt/archiv or confirm a different complete root.');
  } else {
    actions.push('If the archive HDD should contain the private library, mount it so /mnt/archiv is an own mount with files.');
  }
  actions.push('If OneDrive is the real library, repair sync markers before any private inventory.');
  actions.push('After storage changes, rerun source-root locator, selection brief, decision-session check, blocker refresh and worker-boundary pack.');
  actions.push('Do not select /mnt/data/ArchitekturKosmos as the private library root unless the owner explicitly confirms it.');
  return actions;
}

async function pathExists(path) {
  try {
    await access(path, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

function roundGiB(bytes) {
  return Math.round((bytes / 1024 / 1024 / 1024) * 10) / 10;
}

function unescapeMount(value) {
  return value.replace(/\\040/g, ' ');
}

function renderMarkdown(report) {
  const lines = [];
  lines.push('# Kosmo Storage Mount Snapshot');
  lines.push('');
  lines.push(`Generated: ${report.generated_at}`);
  lines.push(`Status: \`${report.status}\``);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Data mount visible: ${report.summary.data_mount_visible ? 'yes' : 'no'}`);
  lines.push(`- Data mount source: ${report.summary.data_mount_source || '-'}`);
  lines.push(`- Data mount filesystem: ${report.summary.data_mount_fstype || '-'}`);
  lines.push(`- Data mount total/available GiB: ${report.summary.data_mount_total_gib ?? '-'}/${report.summary.data_mount_available_gib ?? '-'}`);
  lines.push(`- Archive mount visible: ${report.summary.archive_mount_visible ? 'yes' : 'no'}`);
  lines.push(`- Archive mount source: ${report.summary.archive_mount_source || '-'}`);
  lines.push(`- Archive mount filesystem: ${report.summary.archive_mount_fstype || '-'}`);
  lines.push(`- Archive mount total/available GiB: ${report.summary.archive_mount_total_gib ?? '-'}/${report.summary.archive_mount_available_gib ?? '-'}`);
  lines.push(`- Archive target exists: ${report.summary.archive_target_exists ? 'yes' : 'no'}`);
  lines.push(`- Active project root: \`${report.summary.active_project_root_path}\``);
  lines.push(`- Archive root: \`${report.summary.archive_root_path}\``);
  lines.push(`- Project root exists: ${report.summary.project_root_exists ? 'yes' : 'no'}`);
  lines.push(`- Project root own mount: ${report.summary.project_root_own_mount ? 'yes' : 'no'}`);
  lines.push(`- OneDrive targets visible: ${report.summary.onedrive_targets_visible}`);
  lines.push(`- Source-root decision: ${report.summary.source_root_decision}`);
  lines.push(`- Public-ready after snapshot: ${report.summary.public_ready_after_snapshot}`);
  lines.push('');
  lines.push('## Targets');
  lines.push('');
  lines.push('| Path | Exists | Own mount | FS | Total GiB | Available GiB | Top-level entries | Sample |');
  lines.push('| --- | --- | --- | --- | ---: | ---: | ---: | --- |');
  report.targets.forEach((target) => {
    lines.push(`| \`${target.path}\` | ${target.exists ? 'yes' : 'no'} | ${target.own_mount ? 'yes' : 'no'} | ${target.mount?.fstype || '-'} | ${target.filesystem?.total_gib ?? '-'} | ${target.filesystem?.available_gib ?? '-'} | ${target.top_level?.entries ?? '-'} | ${escapePipe((target.top_level?.sample_entries || []).join(', ')) || '-'} |`);
  });
  lines.push('');
  lines.push('## Interpretation');
  lines.push('');
  report.interpretation.forEach((item) => lines.push(`- ${item}`));
  lines.push('');
  lines.push('## Next Actions');
  lines.push('');
  report.next_actions.forEach((item) => lines.push(`- ${item}`));
  lines.push('');
  return lines.join('\n');
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
