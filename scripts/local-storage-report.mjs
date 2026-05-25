#!/usr/bin/env node

import { mkdir, rm, writeFile } from 'node:fs/promises';
import { existsSync, readdirSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const args = parseArgs(process.argv.slice(2));
const defaultTargets = ['archive-inbox', 'archive-intake', 'out'];
const targets = String(args.targets || defaultTargets.join(','))
  .split(',')
  .map((item) => item.trim())
  .filter(Boolean);
const cleanupMode = Boolean(args.cleanup);
const apply = Boolean(args.apply);
const confirmDelete = Boolean(args['i-understand-local-delete']);
const olderThanDays = Number.parseInt(String(args['older-than-days'] || '14'), 10);
const maxDepth = Number.parseInt(String(args.depth || '2'), 10);
const now = Date.now();

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});

async function main() {
  if (apply && !confirmDelete) {
    throw new Error('Refusing to delete files without --i-understand-local-delete.');
  }

  const targetReports = targets.map((target) => inspectTarget(target));
  const cleanupCandidates = cleanupMode ? findCleanupCandidates(targetReports) : [];
  const report = {
    generated_at: new Date().toISOString(),
    root: '.',
    mode: cleanupMode ? (apply ? 'cleanup_apply' : 'cleanup_dry_run') : 'report',
    older_than_days: cleanupMode ? olderThanDays : null,
    totals: {
      bytes: sum(targetReports.map((target) => target.bytes)),
      formatted: formatBytes(sum(targetReports.map((target) => target.bytes)))
    },
    targets: targetReports,
    cleanup_candidates: cleanupCandidates
  };

  if (apply) {
    for (const candidate of cleanupCandidates) {
      await rm(resolve(root, candidate.path), { recursive: true, force: true });
    }
  }

  await writeReport(report);
  printReport(report);
}

function inspectTarget(target) {
  const fullPath = safeTargetPath(target);
  if (!existsSync(fullPath)) {
    return {
      path: target,
      exists: false,
      bytes: 0,
      formatted: '0 B',
      children: []
    };
  }

  const stats = statSync(fullPath);
  const children = stats.isDirectory() ? inspectChildren(fullPath, 0) : [];
  const bytes = stats.isDirectory() ? sum(children.map((child) => child.bytes)) : stats.size;

  return {
    path: relative(root, fullPath),
    exists: true,
    bytes,
    formatted: formatBytes(bytes),
    modified_at: stats.mtime.toISOString(),
    children: children
      .sort((a, b) => b.bytes - a.bytes)
      .slice(0, 24)
  };
}

function inspectChildren(folder, depth) {
  const names = safeReadDir(folder);
  const children = [];

  for (const name of names) {
    const fullPath = join(folder, name);
    const stats = statSync(fullPath);
    if (stats.isDirectory()) {
      const nested = depth + 1 < maxDepth ? inspectChildren(fullPath, depth + 1) : summarizeImmediate(fullPath);
      children.push({
        path: relative(root, fullPath),
        kind: 'directory',
        bytes: sum(nested.map((child) => child.bytes)),
        formatted: formatBytes(sum(nested.map((child) => child.bytes))),
        modified_at: stats.mtime.toISOString(),
        children: nested.sort((a, b) => b.bytes - a.bytes).slice(0, 12)
      });
    } else {
      children.push({
        path: relative(root, fullPath),
        kind: 'file',
        bytes: stats.size,
        formatted: formatBytes(stats.size),
        modified_at: stats.mtime.toISOString()
      });
    }
  }

  return children;
}

function summarizeImmediate(folder) {
  return safeReadDir(folder).map((name) => {
    const fullPath = join(folder, name);
    const stats = statSync(fullPath);
    return {
      path: relative(root, fullPath),
      kind: stats.isDirectory() ? 'directory' : 'file',
      bytes: stats.isDirectory() ? directorySize(fullPath) : stats.size,
      formatted: formatBytes(stats.isDirectory() ? directorySize(fullPath) : stats.size),
      modified_at: stats.mtime.toISOString()
    };
  });
}

function findCleanupCandidates(targetReports) {
  const cutoff = now - olderThanDays * 24 * 60 * 60 * 1000;
  const candidates = [];

  for (const report of targetReports) {
    if (!report.exists) continue;
    for (const child of report.children) {
      const modified = Date.parse(child.modified_at);
      if (!Number.isFinite(modified) || modified > cutoff) continue;
      candidates.push({
        path: child.path,
        kind: child.kind,
        bytes: child.bytes,
        formatted: child.formatted,
        modified_at: child.modified_at,
        reason: `${olderThanDays}+ days old generated local artifact`
      });
    }
  }

  return candidates.sort((a, b) => b.bytes - a.bytes);
}

async function writeReport(report) {
  const outputDir = resolve(root, 'out/local-storage');
  await mkdir(outputDir, { recursive: true });
  await writeFile(join(outputDir, 'latest.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await writeFile(join(outputDir, 'latest.md'), renderMarkdown(report), 'utf8');
}

function printReport(report) {
  console.log('Architecture Cosmos local storage report');
  console.log(`Mode: ${report.mode}`);
  console.log(`Total: ${report.totals.formatted}`);
  for (const target of report.targets) {
    console.log(`- ${target.path}: ${target.formatted}`);
  }
  if (cleanupMode) {
    console.log(`Cleanup candidates: ${report.cleanup_candidates.length}`);
    console.log(apply ? 'Cleanup applied.' : 'Dry run only. Add --apply --i-understand-local-delete to delete.');
  }
  console.log('Report: out/local-storage/latest.md');
}

function renderMarkdown(report) {
  const lines = [
    '# Local Storage Report',
    '',
    `Generated: ${report.generated_at}`,
    `Mode: ${report.mode}`,
    `Total: ${report.totals.formatted}`,
    ''
  ];

  lines.push('## Targets', '');
  for (const target of report.targets) {
    lines.push(`- \`${target.path}\`: ${target.formatted}`);
    for (const child of target.children.slice(0, 8)) {
      lines.push(`  - \`${child.path}\`: ${child.formatted}`);
    }
  }

  if (cleanupMode) {
    lines.push('', '## Cleanup Candidates', '');
    if (!report.cleanup_candidates.length) {
      lines.push('No cleanup candidates found.');
    } else {
      for (const candidate of report.cleanup_candidates.slice(0, 20)) {
        lines.push(`- \`${candidate.path}\`: ${candidate.formatted}, modified ${candidate.modified_at}`);
      }
    }
    lines.push('', apply ? 'Cleanup was applied.' : 'Dry run only. Nothing was deleted.');
  }

  return `${lines.join('\n')}\n`;
}

function safeTargetPath(target) {
  if (!defaultTargets.includes(target)) {
    throw new Error(`Unsafe target "${target}". Allowed targets: ${defaultTargets.join(', ')}`);
  }
  return resolve(root, target);
}

function directorySize(folder) {
  return sum(safeReadDir(folder).map((name) => {
    const fullPath = join(folder, name);
    const stats = statSync(fullPath);
    return stats.isDirectory() ? directorySize(fullPath) : stats.size;
  }));
}

function safeReadDir(folder) {
  if (!existsSync(folder)) return [];
  return readdirSync(folder).filter((name) => name !== '.DS_Store');
}

function sum(values) {
  return values.reduce((total, value) => total + value, 0);
}

function formatBytes(bytes) {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** index;
  return `${value.toFixed(value >= 10 || index === 0 ? 0 : 1)} ${units[index]}`;
}

function parseArgs(argv) {
  const parsed = {};
  for (let index = 0; index < argv.length; index += 1) {
    const item = argv[index];
    if (!item.startsWith('--')) continue;
    const key = item.slice(2);
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
