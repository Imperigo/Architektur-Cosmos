#!/usr/bin/env node

import { readFile, readdir, stat, writeFile, mkdir } from 'node:fs/promises';
import { relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const outputJson = resolve(root, args.out || 'data/kosmoreferences-private-library-diagnostic-2026-06-13.json');
const outputMd = resolve(root, args.markdown || 'docs/codex/kosmoreferences-private-library-diagnostic-2026-06-13.md');
const maxFilesPerRoot = Number(args['max-files-per-root'] || 75000);
const roots = (args.roots
  ? String(args.roots).split('|')
  : [
      '/mnt/data/ArchitekturKosmos/11_AI_Workflow/OneDrive_2026-06-09',
      '/home/andrin-baumann/ArchitekturKosmos Onedrive',
      '/mnt/archiv',
      '/mnt/data/Zum_Archivieren',
      '/mnt/data/ArchitekturKosmos/KosmoZentrale/sources/private-extracts'
    ]).map((item) => item.trim()).filter(Boolean);
const keywords = (args.keywords
  ? String(args.keywords).split(',')
  : ['sogn', 'benedetg', 'sumvitg', 'zumthor', 'ingenbohl', 'boltshauser', 'holzbau', 'timber', 'eth', 'hslu', 'vorlesung', 'lecture'])
  .map((item) => item.trim().toLowerCase()).filter(Boolean);
const bookExtensions = new Set(['.pdf', '.epub', '.djvu', '.mobi', '.azw3', '.cbz', '.cbr']);
const textExtensions = new Set(['.md', '.txt', '.json', '.csv', '.yaml', '.yml', '.doc', '.docx', '.ppt', '.pptx', '.rtf']);
const architectureEvidenceExtensions = new Set([...bookExtensions, ...textExtensions, '.ifc', '.dwg', '.dxf', '.skp', '.blend']);
const ignoredDirNames = new Set([
  '.build',
  '.cache',
  '.git',
  '.next',
  '.nuxt',
  '.venv',
  '__pycache__',
  'build',
  'DerivedData',
  'dist',
  'node_modules',
  'site-packages',
  'target',
  'venv'
].map((item) => item.toLowerCase()));
const noisyPathTokens = ['/backend/.venv/', '/site-packages/', '/__pycache__/', '/.build/', '/node_modules/', '/deriveddata/', '/dist/', '/build/'];

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const mounts = await readMounts();
  const rootReports = [];
  for (const libraryRoot of roots) {
    rootReports.push(await inspectRoot(libraryRoot, mounts));
  }

  const summary = summarize(rootReports);
  const report = {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    status: summary.expected_large_library_visible
      ? 'library_candidate_visible'
      : summary.workflow_mirror_visible
        ? 'small_workflow_mirror_visible'
        : 'library_root_not_visible',
    policy: {
      read_only: true,
      copied_private_content: false,
      note: 'This diagnostic records paths, counts and filename matches only. It does not copy book pages, lecture text, images or PDFs.'
    },
    keywords,
    max_files_per_root: maxFilesPerRoot,
    summary,
    roots: rootReports,
    next_actions: nextActions(summary, rootReports)
  };

  await mkdir(resolve(outputJson, '..'), { recursive: true });
  await mkdir(resolve(outputMd, '..'), { recursive: true });
  await writeFile(outputJson, `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(outputMd, renderMarkdown(report));

  console.log('KosmoReferences private library diagnostic');
  console.log(`Status: ${report.status}`);
  console.log(`Roots: ${report.summary.roots}`);
  console.log(`Existing roots: ${report.summary.existing_roots}`);
  console.log(`Own mount roots: ${report.summary.own_mount_roots}`);
  console.log(`Book-like files: ${report.summary.book_like_files}`);
  console.log(`Target filename matches: ${report.summary.target_filename_matches}`);
  console.log(`Wrote: ${relative(root, outputMd)}`);
}

async function inspectRoot(rawPath, mounts) {
  const resolved = resolve(rawPath);
  const mount = findMount(resolved, mounts);
  const base = {
    path: rawPath,
    resolved_path: resolved,
    exists: false,
    own_mount: mount?.mount_point === resolved,
    mount: mount || null,
    top_level_entries: [],
    counts: emptyCounts(),
    raw_target_filename_matches: [],
    target_filename_matches: [],
    scan_truncated: false,
    status: 'missing'
  };

  try {
    const info = await stat(resolved);
    base.exists = true;
    if (!info.isDirectory()) {
      base.status = 'not_directory';
      return base;
    }
    base.top_level_entries = (await readdir(resolved, { withFileTypes: true }))
      .slice(0, 50)
      .map((entry) => ({ name: entry.name, type: entry.isDirectory() ? 'dir' : entry.isFile() ? 'file' : 'other' }));
    const scan = await scanRoot(resolved);
    base.counts = scan.counts;
    base.raw_target_filename_matches = scan.rawMatches;
    base.target_filename_matches = scan.matches;
    base.scan_truncated = scan.truncated;
    base.status = classifyRoot(base);
    return base;
  } catch {
    return base;
  }
}

async function scanRoot(start) {
  const counts = emptyCounts();
  const matches = [];
  const rawMatches = [];
  const stack = [start];
  let scannedFiles = 0;
  let truncated = false;

  while (stack.length > 0) {
    const current = stack.pop();
    let entries = [];
    try {
      entries = await readdir(current, { withFileTypes: true });
    } catch {
      counts.unreadable_dirs += 1;
      continue;
    }

    for (const entry of entries) {
      if (entry.isDirectory() && ignoredDirNames.has(entry.name.toLowerCase())) {
        counts.ignored_dirs += 1;
        continue;
      }
      const child = `${current}/${entry.name}`;
      if (entry.isDirectory()) {
        counts.dirs += 1;
        stack.push(child);
        continue;
      }
      if (!entry.isFile()) {
        counts.other += 1;
        continue;
      }

      scannedFiles += 1;
      counts.files += 1;
      const lower = entry.name.toLowerCase();
      const ext = extensionOf(lower);
      const lowerPath = child.toLowerCase();
      counts.extensions[ext || '<none>'] = (counts.extensions[ext || '<none>'] || 0) + 1;
      if (lower.endsWith('_error.txt')) counts.sync_error_files += 1;
      if (bookExtensions.has(ext)) counts.book_like_files += 1;
      if (textExtensions.has(ext)) counts.text_like_files += 1;
      if (keywords.some((keyword) => lower.includes(keyword))) {
        rawMatches.push(relative(root, child));
        if (isStrongArchitectureEvidence(lowerPath, ext)) {
          matches.push(relative(root, child));
        } else {
          counts.ignored_keyword_matches += 1;
        }
      }
      if (rawMatches.length > 100) rawMatches.length = 100;
      if (matches.length > 100) matches.length = 100;
      if (scannedFiles >= maxFilesPerRoot) {
        truncated = true;
        stack.length = 0;
        break;
      }
    }
  }

  return { counts, matches, rawMatches, truncated };
}

function classifyRoot(rootReport) {
  if (!rootReport.exists) return 'missing';
  if (rootReport.counts.files === 0 && rootReport.counts.dirs === 0) return rootReport.own_mount ? 'empty_mount' : 'empty_directory_or_not_mounted';
  if (rootReport.counts.book_like_files >= 500 || rootReport.target_filename_matches.length > 0) return 'library_candidate';
  if (rootReport.counts.book_like_files > 0) return 'small_document_set';
  return 'available_no_library_signal';
}

function summarize(rootReports) {
  const existing = rootReports.filter((item) => item.exists);
  const ownMounts = rootReports.filter((item) => item.own_mount);
  const targetMatches = rootReports.reduce((sum, item) => sum + item.target_filename_matches.length, 0);
  const rawTargetMatches = rootReports.reduce((sum, item) => sum + item.raw_target_filename_matches.length, 0);
  const bookLike = rootReports.reduce((sum, item) => sum + item.counts.book_like_files, 0);
  const syncErrorFiles = rootReports.reduce((sum, item) => sum + item.counts.sync_error_files, 0);
  const libraryCandidates = rootReports.filter((item) => item.status === 'library_candidate');
  const workflowMirrors = rootReports.filter((item) => isWorkflowMirror(item) && item.exists);
  return {
    roots: rootReports.length,
    existing_roots: existing.length,
    own_mount_roots: ownMounts.length,
    book_like_files: bookLike,
    sync_error_files: syncErrorFiles,
    target_filename_matches: targetMatches,
    raw_target_filename_matches: rawTargetMatches,
    library_candidate_roots: libraryCandidates.map((item) => item.path),
    workflow_mirror_roots: workflowMirrors.map((item) => item.path),
    expected_large_library_visible: libraryCandidates.length > 0,
    workflow_mirror_visible: workflowMirrors.length > 0,
    archive_mount_visible: rootReports.some((item) => item.path === '/mnt/archiv' && item.own_mount),
    archive_root_status: rootReports.find((item) => item.path === '/mnt/archiv')?.status || 'missing'
  };
}

function nextActions(summary) {
  const actions = [];
  if (!summary.archive_mount_visible) actions.push('Confirm whether the archive HDD should be mounted at /mnt/archiv; it is not visible as its own mount in this diagnostic.');
  if (summary.workflow_mirror_visible && !summary.expected_large_library_visible) {
    actions.push('Small ArchitectureKosmos/OneDrive workflow mirrors are visible, but the expected large book, ETH and HSLU lecture library is still not visible.');
  }
  if (summary.sync_error_files > 0) actions.push(`OneDrive sync error marker files are visible (${summary.sync_error_files}); inspect sync status before assuming folders are complete.`);
  if (!summary.expected_large_library_visible) actions.push('Ask owner/Claude/KosmoOverseer for the real private book, ETH and HSLU lecture library root.');
  actions.push('Re-run this diagnostic after mounting or syncing the library.');
  return actions;
}

function isWorkflowMirror(rootReport) {
  const lower = rootReport.path.toLowerCase();
  return (lower.includes('11_ai_workflow') || lower.includes('architekturkosmos onedrive')) &&
    (rootReport.counts.files > 0 || rootReport.counts.book_like_files > 0);
}

async function readMounts() {
  try {
    const source = await readFile('/proc/self/mountinfo', 'utf8');
    return source.split('\n').filter(Boolean).map((line) => {
      const [left, right] = line.split(' - ');
      const leftParts = left.split(' ');
      const rightParts = right?.split(' ') || [];
      return {
        mount_point: unescapeMount(leftParts[4] || ''),
        fs_type: rightParts[0] || null,
        source: rightParts[1] || null
      };
    }).filter((item) => item.mount_point);
  } catch {
    return [];
  }
}

function findMount(path, mounts) {
  return mounts
    .filter((mount) => path === mount.mount_point || path.startsWith(`${mount.mount_point.replace(/\/$/, '')}/`))
    .sort((a, b) => b.mount_point.length - a.mount_point.length)[0] || null;
}

function renderMarkdown(report) {
  const lines = [];
  lines.push('# KosmoReferences Private Library Diagnostic');
  lines.push('');
  lines.push(`Generated: ${report.generated_at}`);
  lines.push(`Status: \`${report.status}\``);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Roots: ${report.summary.roots}`);
  lines.push(`- Existing roots: ${report.summary.existing_roots}`);
  lines.push(`- Own mount roots: ${report.summary.own_mount_roots}`);
  lines.push(`- Book-like files: ${report.summary.book_like_files}`);
  lines.push(`- OneDrive sync error files: ${report.summary.sync_error_files}`);
  lines.push(`- Target filename matches: ${report.summary.target_filename_matches}`);
  lines.push(`- Raw target filename matches: ${report.summary.raw_target_filename_matches}`);
  lines.push(`- Workflow mirrors visible: ${report.summary.workflow_mirror_visible ? 'yes' : 'no'}`);
  lines.push(`- Workflow mirror roots: ${report.summary.workflow_mirror_roots.length}`);
  lines.push(`- Archive mount visible: ${report.summary.archive_mount_visible ? 'yes' : 'no'}`);
  lines.push(`- Archive root status: ${report.summary.archive_root_status}`);
  lines.push('');
  lines.push('## Roots');
  lines.push('');
  lines.push('| Root | Status | Own mount | Files | Book-like | Sync errors | Target matches | Raw matches | Ignored dirs | Mount source |');
  lines.push('| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |');
  for (const item of report.roots) {
    lines.push(`| \`${item.path}\` | ${item.status} | ${item.own_mount ? 'yes' : 'no'} | ${item.counts.files} | ${item.counts.book_like_files} | ${item.counts.sync_error_files} | ${item.target_filename_matches.length} | ${item.raw_target_filename_matches.length} | ${item.counts.ignored_dirs} | ${item.mount?.source || '-'} |`);
  }
  lines.push('');
  lines.push('## Target Filename Matches');
  lines.push('');
  const matches = report.roots.flatMap((item) => item.target_filename_matches.map((match) => `${item.path}: ${match}`));
  if (matches.length > 0) matches.forEach((match) => lines.push(`- ${match}`));
  else lines.push('- None.');
  lines.push('');
  lines.push('## Ignored Raw Keyword Matches');
  lines.push('');
  const ignoredMatches = report.roots.flatMap((item) => {
    const strong = new Set(item.target_filename_matches);
    return item.raw_target_filename_matches
      .filter((match) => !strong.has(match))
      .map((match) => `${item.path}: ${match}`);
  });
  if (ignoredMatches.length > 0) ignoredMatches.forEach((match) => lines.push(`- ${match}`));
  else lines.push('- None.');
  lines.push('');
  lines.push('## Next Actions');
  lines.push('');
  report.next_actions.forEach((action) => lines.push(`- ${action}`));
  lines.push('');
  return `${lines.join('\n')}\n`;
}

function emptyCounts() {
  return {
    files: 0,
    dirs: 0,
    other: 0,
    ignored_dirs: 0,
    ignored_keyword_matches: 0,
    sync_error_files: 0,
    unreadable_dirs: 0,
    book_like_files: 0,
    text_like_files: 0,
    extensions: {}
  };
}

function isStrongArchitectureEvidence(lowerPath, ext) {
  if (!architectureEvidenceExtensions.has(ext)) return false;
  if (noisyPathTokens.some((token) => lowerPath.includes(token))) return false;
  return true;
}

function extensionOf(name) {
  const index = name.lastIndexOf('.');
  return index >= 0 ? name.slice(index) : '';
}

function unescapeMount(value) {
  return value.replace(/\\040/g, ' ');
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
