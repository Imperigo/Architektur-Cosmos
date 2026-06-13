#!/usr/bin/env node

import { mkdir, readdir, readFile, stat, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = new Date().toISOString().slice(0, 10);
const outputJson = resolve(root, args.out || `data/kosmo-source-root-locator-${dateStamp}.json`);
const outputMd = resolve(root, args.markdown || `docs/codex/kosmo-source-root-locator-${dateStamp}.md`);
const maxDepth = Number(args.maxDepth || 5);
const maxDirs = Number(args.maxDirs || 60000);
const inspectMaxEntries = Number(args.inspectMaxEntries || 3000);
const startRoots = (args.roots
  ? String(args.roots).split('|')
  : [
      '/home/andrin-baumann',
      '/mnt/data',
      '/mnt/archiv',
      '/mnt',
      '/media',
      '/run/media'
    ]).map((item) => item.trim()).filter(Boolean);
const pathSignals = [
  'architekturkosmos',
  'architektur kosmos',
  'onedrive',
  'one drive',
  '11 ai workflow',
  '11_ai_workflow',
  'bibliothek',
  'buecher',
  'bücher',
  'books',
  'library',
  'vorlesung',
  'vorlesungen',
  'lecture',
  'lectures',
  'eth',
  'hslu',
  'archiv',
  'archive',
  'references',
  'referenzen',
  'kosmozentrale'
];
const bookExtensions = new Set(['.pdf', '.epub', '.djvu', '.mobi', '.azw3', '.cbz', '.cbr']);
const lectureExtensions = new Set(['.pdf', '.ppt', '.pptx', '.key', '.doc', '.docx', '.md', '.txt']);
const ignoredDirNames = new Set([
  '.cache',
  '.git',
  '.local',
  '.npm',
  '.rustup',
  '.venv',
  '__pycache__',
  'build',
  'dist',
  'node_modules',
  'site-packages',
  'target',
  'venv'
]);
const devOrGeneratedPathTokens = [
  '/code/',
  '/ai-models/',
  '/comfyui/',
  '/node_modules/',
  '/dist/',
  '/build/',
  '/.codex/',
  '/.cache/'
];
const devOrGeneratedSegments = new Set([
  'code',
  'architecturecosmos',
  'architekturkosmos-codex',
  'kosmoorbit',
  'kosmopublish',
  'kosmovis',
  'kosmodraw',
  'kosmoprepare',
  'comfyui',
  'ai-models'
]);
const sensitiveTokens = ['secret', 'secrets', 'token', '.env', 'credential', 'password'];

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const mounts = await readMounts();
  const candidates = [];
  const seen = new Set();
  let scannedDirs = 0;
  let truncated = false;

  for (const startRoot of startRoots) {
    const scan = await scanForCandidateDirs(startRoot, mounts, seen);
    candidates.push(...scan.candidates);
    scannedDirs += scan.scannedDirs;
    truncated = truncated || scan.truncated;
  }

  const inspected = [];
  for (const candidate of candidates) {
    inspected.push(await inspectCandidate(candidate, mounts));
  }
  inspected.sort((a, b) => b.score - a.score || a.path.localeCompare(b.path));

  const report = {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    status: inspected.some((item) => item.classification === 'probable_large_private_library')
      ? 'probable_source_root_visible'
      : inspected.some((item) => item.classification === 'workflow_or_project_mirror')
        ? 'source_root_candidates_need_owner_selection'
        : 'no_strong_source_root_candidate',
    policy: {
      read_only: true,
      copied_private_content: false,
      file_content_read: false,
      note: 'This locator reads directory entries and filesystem metadata only. It does not open books, PDFs, lecture documents, plans, images or private source files.'
    },
    scan: {
      start_roots: startRoots,
      max_depth: maxDepth,
      max_dirs: maxDirs,
      inspect_max_entries: inspectMaxEntries,
      scanned_dirs: scannedDirs,
      truncated
    },
    summary: {
      candidates: inspected.length,
      probable_large_private_libraries: inspected.filter((item) => item.classification === 'probable_large_private_library').length,
      workflow_or_project_mirrors: inspected.filter((item) => item.classification === 'workflow_or_project_mirror').length,
      archive_like_roots: inspected.filter((item) => item.signals.includes('archive_like')).length,
      onedrive_like_roots: inspected.filter((item) => item.signals.includes('onedrive_like')).length,
      roots_with_sync_errors: inspected.filter((item) => item.counts.sync_error_files > 0).length,
      own_mount_candidates: inspected.filter((item) => item.own_mount).length,
      top_candidates: inspected.slice(0, 8).map((item) => ({
        path: item.path,
        classification: item.classification,
        score: item.score,
        book_like_files: item.counts.book_like_files,
        lecture_like_files: item.counts.lecture_like_files,
        sync_error_files: item.counts.sync_error_files
      }))
    },
    candidates: inspected,
    next_actions: nextActions(inspected)
  };

  await mkdir(dirname(outputJson), { recursive: true });
  await mkdir(dirname(outputMd), { recursive: true });
  await writeFile(outputJson, `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(outputMd, renderMarkdown(report));

  console.log('Kosmo source-root locator');
  console.log(`Status: ${report.status}`);
  console.log(`Candidates: ${report.summary.candidates}`);
  console.log(`Probable libraries: ${report.summary.probable_large_private_libraries}`);
  console.log(`Workflow mirrors: ${report.summary.workflow_or_project_mirrors}`);
  console.log(`Wrote: ${relative(root, outputMd)}`);
}

async function scanForCandidateDirs(startRoot, mounts, seen) {
  const start = resolve(startRoot);
  const candidates = [];
  const stack = [{ path: start, depth: 0 }];
  let scannedDirs = 0;
  let truncated = false;

  while (stack.length > 0) {
    if (scannedDirs >= maxDirs) {
      truncated = true;
      break;
    }
    const current = stack.pop();
    let info;
    try {
      info = await stat(current.path);
    } catch {
      continue;
    }
    if (!info.isDirectory()) continue;
    scannedDirs += 1;

    const key = current.path;
    if (!seen.has(key) && isCandidatePath(current.path)) {
      seen.add(key);
      candidates.push({
        path: current.path,
        depth: current.depth,
        mount: findMount(current.path, mounts)
      });
    }
    if (current.depth >= maxDepth) continue;

    let entries = [];
    try {
      entries = await readdir(current.path, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      if (ignoredDirNames.has(entry.name.toLowerCase())) continue;
      stack.push({ path: `${current.path}/${entry.name}`, depth: current.depth + 1 });
    }
  }

  return { candidates, scannedDirs, truncated };
}

async function inspectCandidate(candidate, mounts) {
  const mount = findMount(candidate.path, mounts);
  const counts = emptyCounts();
  const topLevelEntries = [];
  const sampleExtensions = {};
  const queue = [{ path: candidate.path, depth: 0 }];
  let inspectedEntries = 0;
  let truncated = false;

  while (queue.length > 0) {
    const current = queue.shift();
    let entries = [];
    try {
      entries = await readdir(current.path, { withFileTypes: true });
    } catch {
      counts.unreadable_dirs += 1;
      continue;
    }

    for (const entry of entries) {
      inspectedEntries += 1;
      if (current.depth === 0 && topLevelEntries.length < 30) {
        topLevelEntries.push({
          name: redactSegment(entry.name),
          type: entry.isDirectory() ? 'dir' : entry.isFile() ? 'file' : 'other'
        });
      }
      if (entry.isDirectory()) {
        counts.dirs += 1;
        const lowerName = entry.name.toLowerCase();
        if (ignoredDirNames.has(lowerName)) {
          counts.ignored_dirs += 1;
        } else if (current.depth < 2) {
          queue.push({ path: `${current.path}/${entry.name}`, depth: current.depth + 1 });
        }
      } else if (entry.isFile()) {
        counts.files += 1;
        const lowerName = entry.name.toLowerCase();
        const ext = extensionOf(lowerName);
        sampleExtensions[ext || '<none>'] = (sampleExtensions[ext || '<none>'] || 0) + 1;
        if (bookExtensions.has(ext)) counts.book_like_files += 1;
        if (lectureExtensions.has(ext)) counts.lecture_like_files += 1;
        if (lowerName.endsWith('_error.txt') || lowerName === '___all_errors.txt') counts.sync_error_files += 1;
      } else {
        counts.other += 1;
      }
      if (inspectedEntries >= inspectMaxEntries) {
        truncated = true;
        queue.length = 0;
        break;
      }
    }
  }

  counts.extensions = Object.fromEntries(Object.entries(sampleExtensions).sort((a, b) => b[1] - a[1]).slice(0, 15));
  const signals = detectSignals(candidate.path, counts, topLevelEntries, mount);
  const score = scoreCandidate(signals, counts, mount, candidate.path);
  return {
    path: candidate.path,
    redacted_path: redactPath(candidate.path),
    depth: candidate.depth,
    own_mount: mount?.mount_point === candidate.path,
    mount: mount || null,
    signals,
    score,
    classification: classify(score, signals, counts),
    counts,
    top_level_entries: topLevelEntries,
    inspect_truncated: truncated
  };
}

function isCandidatePath(path) {
  const normalized = path.toLowerCase().replace(/[_-]+/g, ' ');
  return pathSignals.some((signal) => normalized.includes(signal.replace(/[_-]+/g, ' ')));
}

function detectSignals(path, counts, topLevelEntries, mount) {
  const lower = path.toLowerCase();
  const entryNames = topLevelEntries.map((entry) => String(entry.name).toLowerCase()).join(' ');
  const signals = [];
  if (lower.includes('onedrive') || lower.includes('one drive')) signals.push('onedrive_like');
  if (lower.includes('archiv') || lower.includes('archive')) signals.push('archive_like');
  if (lower.includes('bibliothek') || lower.includes('buecher') || lower.includes('bücher') || lower.includes('books') || lower.includes('library')) signals.push('library_named');
  if (lower.includes('eth') || lower.includes('hslu') || lower.includes('vorlesung') || lower.includes('lecture')) signals.push('lecture_named');
  if (lower.includes('11_ai_workflow') || lower.includes('11 ai workflow') || lower.includes('kosmozentrale')) signals.push('workflow_named');
  if (devOrGeneratedPathTokens.some((token) => lower.includes(token)) || hasDevOrGeneratedSegment(path)) signals.push('dev_or_generated_path');
  if (counts.book_like_files >= 500) signals.push('large_book_count');
  else if (counts.book_like_files >= 40) signals.push('medium_book_count');
  else if (counts.book_like_files > 0) signals.push('small_book_count');
  if (counts.lecture_like_files >= 100) signals.push('lecture_file_count');
  if (counts.sync_error_files > 0) signals.push('sync_errors_visible');
  if (mount?.mount_point === path) signals.push('own_mount');
  if (entryNames.includes('eth') || entryNames.includes('hslu') || entryNames.includes('vorlesung') || entryNames.includes('lecture')) signals.push('top_level_lecture_signal');
  return signals;
}

function scoreCandidate(signals, counts, mount, path) {
  let score = 0;
  if (signals.includes('library_named')) score += 30;
  if (signals.includes('lecture_named')) score += 24;
  if (signals.includes('archive_like')) score += 20;
  if (signals.includes('onedrive_like')) score += 18;
  if (signals.includes('large_book_count')) score += 45;
  if (signals.includes('medium_book_count')) score += 28;
  if (signals.includes('small_book_count')) score += 10;
  if (signals.includes('lecture_file_count')) score += 22;
  if (signals.includes('top_level_lecture_signal')) score += 16;
  if (signals.includes('own_mount')) score += 16;
  if (signals.includes('workflow_named')) score -= 12;
  if (signals.includes('dev_or_generated_path')) score -= 38;
  if (counts.sync_error_files > 0) score -= 6;
  if (path.includes('/.')) score -= 8;
  if (mount?.fs_type === 'fuse.portal') score -= 10;
  return score;
}

function classify(score, signals, counts) {
  if (signals.includes('dev_or_generated_path') && !signals.includes('large_book_count')) return 'dev_or_generated_candidate';
  if (score >= 72 && (signals.includes('large_book_count') || signals.includes('library_named') || signals.includes('lecture_named'))) {
    return 'probable_large_private_library';
  }
  if (signals.includes('workflow_named')) return 'workflow_or_project_mirror';
  if (signals.includes('sync_errors_visible')) return 'incomplete_onedrive_candidate';
  if (counts.book_like_files > 0 || signals.includes('lecture_named') || signals.includes('library_named')) return 'possible_source_root';
  return 'weak_path_signal';
}

function hasDevOrGeneratedSegment(path) {
  return String(path)
    .split('/')
    .map((segment) => segment.toLowerCase())
    .some((segment) => devOrGeneratedSegments.has(segment));
}

function nextActions(candidates) {
  const actions = [];
  const probable = candidates.filter((item) => item.classification === 'probable_large_private_library');
  if (probable.length > 0) {
    actions.push(`Owner/overseers should choose the real source root from ${probable.length} probable large-library candidates.`);
    actions.push('After selection, run the private-library diagnostic with --roots set to the selected path.');
  } else {
    actions.push('No strong large-library root was confirmed by metadata. Keep Sogn and source-dependent assets review-only.');
    actions.push('Ask owner/Claude whether the archive HDD or OneDrive library is mounted under another path.');
  }
  if (candidates.some((item) => item.counts.sync_error_files > 0)) {
    actions.push('Resolve visible OneDrive sync error markers before treating any OneDrive candidate as complete.');
  }
  actions.push('Do not ingest or copy private files until a root is explicitly selected and a private metadata-only inventory task is opened.');
  return actions;
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
  lines.push('# Kosmo Source-Root Locator');
  lines.push('');
  lines.push(`Generated: ${report.generated_at}`);
  lines.push(`Status: \`${report.status}\``);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Candidates: ${report.summary.candidates}`);
  lines.push(`- Probable large private libraries: ${report.summary.probable_large_private_libraries}`);
  lines.push(`- Workflow/project mirrors: ${report.summary.workflow_or_project_mirrors}`);
  lines.push(`- Archive-like roots: ${report.summary.archive_like_roots}`);
  lines.push(`- OneDrive-like roots: ${report.summary.onedrive_like_roots}`);
  lines.push(`- Roots with sync errors: ${report.summary.roots_with_sync_errors}`);
  lines.push(`- Own mount candidates: ${report.summary.own_mount_candidates}`);
  lines.push(`- Scanned dirs: ${report.scan.scanned_dirs}`);
  lines.push(`- Scan truncated: ${report.scan.truncated ? 'yes' : 'no'}`);
  lines.push('');
  lines.push('## Top Candidates');
  lines.push('');
  lines.push('| Path | Classification | Score | Book-like | Lecture-like | Sync errors | Signals |');
  lines.push('| --- | --- | ---: | ---: | ---: | ---: | --- |');
  for (const item of report.candidates.slice(0, 20)) {
    lines.push(`| \`${escapePipe(item.redacted_path)}\` | ${item.classification} | ${item.score} | ${item.counts.book_like_files} | ${item.counts.lecture_like_files} | ${item.counts.sync_error_files} | ${item.signals.map((signal) => `\`${signal}\``).join(', ')} |`);
  }
  lines.push('');
  lines.push('## Next Actions');
  lines.push('');
  report.next_actions.forEach((action) => lines.push(`- ${action}`));
  lines.push('');
  lines.push('## Safety');
  lines.push('');
  lines.push('This locator does not read file contents and does not copy books, lecture material, plans, images, PDFs or private text into Git. It records path and count metadata only.');
  lines.push('');
  return `${lines.join('\n')}`;
}

function emptyCounts() {
  return {
    files: 0,
    dirs: 0,
    other: 0,
    ignored_dirs: 0,
    unreadable_dirs: 0,
    book_like_files: 0,
    lecture_like_files: 0,
    sync_error_files: 0,
    extensions: {}
  };
}

function extensionOf(name) {
  const index = name.lastIndexOf('.');
  return index >= 0 ? name.slice(index) : '';
}

function redactPath(path) {
  return String(path).split('/').map(redactSegment).join('/');
}

function redactSegment(segment) {
  const lower = String(segment).toLowerCase();
  if (sensitiveTokens.some((token) => lower.includes(token))) return '[redacted-sensitive]';
  return segment;
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
