#!/usr/bin/env node

import { execFile } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = new Date().toISOString().slice(0, 10);

const outputJson = resolve(root, args.out || `data/kosmo-worktree-guard-audit-${dateStamp}.json`);
const outputMd = resolve(root, args.markdown || `docs/codex/kosmo-worktree-guard-audit-${dateStamp}.md`);

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const statusLines = await gitStatusLines();
  const branchState = await gitBranchState();
  const entries = statusLines
    .map(parseStatusLine)
    .filter(Boolean)
    .filter((entry) => !isSelfOutput(entry.path));
  const audit = buildAudit(entries, branchState);

  await mkdir(dirname(outputJson), { recursive: true });
  await mkdir(dirname(outputMd), { recursive: true });
  await writeFile(outputJson, `${JSON.stringify(audit, null, 2)}\n`);
  await writeFile(outputMd, renderMarkdown(audit));

  console.log('Kosmo worktree guard audit');
  console.log(`Status: ${audit.status}`);
  console.log(`Entries: ${audit.summary.entries}`);
  console.log(`Staged: ${audit.summary.staged}`);
  console.log(`Unstaged: ${audit.summary.unstaged}`);
  console.log(`Untracked: ${audit.summary.untracked}`);
  console.log(`Broad stage allowed: ${audit.summary.broad_stage_allowed ? 'yes' : 'no'}`);
  console.log(`Wrote: ${relative(root, outputMd)}`);
}

async function gitStatusLines() {
  const { stdout } = await execFileAsync('git', ['status', '--porcelain=v1'], {
    cwd: root,
    maxBuffer: 1024 * 1024 * 10
  });
  return stdout.split(/\r?\n/).filter(Boolean);
}

async function gitBranchState() {
  const branch = await gitText(['rev-parse', '--abbrev-ref', 'HEAD']);
  const upstream = await gitText(['rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{upstream}']);
  let ahead = null;
  let behind = null;

  if (upstream) {
    const counts = await gitText(['rev-list', '--left-right', '--count', `${upstream}...HEAD`]);
    const [behindText, aheadText] = counts.split(/\s+/);
    behind = Number.isInteger(Number.parseInt(behindText, 10)) ? Number.parseInt(behindText, 10) : null;
    ahead = Number.isInteger(Number.parseInt(aheadText, 10)) ? Number.parseInt(aheadText, 10) : null;
  }

  return {
    branch: branch || null,
    upstream: upstream || null,
    ahead,
    behind,
    diverged: Number.isInteger(ahead) && Number.isInteger(behind) && ahead > 0 && behind > 0,
    push_requires_sync_decision: Number.isInteger(behind) && behind > 0
  };
}

async function gitText(args) {
  try {
    const { stdout } = await execFileAsync('git', args, {
      cwd: root,
      maxBuffer: 1024 * 1024
    });
    return stdout.trim();
  } catch {
    return '';
  }
}

function parseStatusLine(line) {
  if (line.length < 4) return null;
  const x = line[0];
  const y = line[1];
  const rawPath = line.slice(3);
  const path = rawPath.includes(' -> ') ? rawPath.split(' -> ').at(-1) : rawPath;
  return {
    code: `${x}${y}`,
    staged: x !== ' ' && x !== '?',
    unstaged: y !== ' ' && y !== '?',
    untracked: x === '?' && y === '?',
    top_level: path.split('/')[0] || path,
    path
  };
}

function isSelfOutput(path) {
  return [
    relative(root, outputJson),
    relative(root, outputMd),
    `data/kosmo-worktree-guard-audit-check-${dateStamp}.json`,
    `docs/codex/kosmo-worktree-guard-audit-check-${dateStamp}.md`
  ].includes(path);
}

function buildAudit(entries, branchState) {
  const staged = entries.filter((entry) => entry.staged);
  const unstaged = entries.filter((entry) => entry.unstaged);
  const untracked = entries.filter((entry) => entry.untracked);
  const byTopLevel = bucketCounts(entries, (entry) => entry.top_level);
  const byCode = bucketCounts(entries, (entry) => entry.code);
  const highRiskHints = entries.filter((entry) => highRiskPath(entry.path)).slice(0, 80);

  return {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    status: entries.length > 0
      ? 'worktree_guard_audit_dirty_review_required'
      : 'worktree_guard_audit_clean',
    policy: {
      audit_only: true,
      reads_file_contents: false,
      stages_files: false,
      reverts_files: false,
      broad_stage_allowed: false,
      push_when_remote_behind_requires_owner_or_sync_decision: true,
      public_ready_after_audit: 0
    },
    summary: {
      entries: entries.length,
      staged: staged.length,
      unstaged: unstaged.length,
      untracked: untracked.length,
      top_level_buckets: byTopLevel.length,
      status_code_buckets: byCode.length,
      high_risk_path_hints: highRiskHints.length,
      broad_stage_allowed: false,
      branch: branchState.branch,
      upstream: branchState.upstream,
      ahead: branchState.ahead,
      behind: branchState.behind,
      diverged: branchState.diverged,
      push_requires_sync_decision: branchState.push_requires_sync_decision,
      public_ready_after_audit: 0
    },
    branch_state: branchState,
    buckets: {
      by_top_level: byTopLevel,
      by_status_code: byCode
    },
    high_risk_path_hints: highRiskHints.map((entry) => ({
      code: entry.code,
      path: entry.path
    })),
    worker_rules: [
      'Do not run git add . in this repository.',
      'Stage exact files only and inspect git diff --cached --stat before commit.',
      'Treat existing dirty files as user/other-worker state unless the current worker created them in this batch.',
      'Do not revert unrelated dirty files.',
      'If local and upstream branches diverge, do not push until a sync or owner decision is explicit.',
      'If a file owned by another worker must change, write a handoff.'
    ]
  };
}

function bucketCounts(entries, keyFn) {
  const counts = new Map();
  for (const entry of entries) counts.set(keyFn(entry), (counts.get(keyFn(entry)) || 0) + 1);
  return [...counts.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .map(([key, count]) => ({ key, count }));
}

function highRiskPath(path) {
  return [
    '.github/',
    'app/',
    'components/',
    'scripts/',
    'package.json',
    'data/',
    'docs/codex/',
    'examples/'
  ].some((prefix) => path === prefix.replace(/\/$/, '') || path.startsWith(prefix));
}

function renderMarkdown(audit) {
  const lines = [];
  lines.push('# Kosmo Worktree Guard Audit');
  lines.push('');
  lines.push(`Generated: ${audit.generated_at}`);
  lines.push(`Status: \`${audit.status}\``);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Entries: ${audit.summary.entries}`);
  lines.push(`- Staged: ${audit.summary.staged}`);
  lines.push(`- Unstaged: ${audit.summary.unstaged}`);
  lines.push(`- Untracked: ${audit.summary.untracked}`);
  lines.push(`- High-risk path hints: ${audit.summary.high_risk_path_hints}`);
  lines.push(`- Broad stage allowed: ${audit.summary.broad_stage_allowed ? 'yes' : 'no'}`);
  lines.push(`- Public-ready after audit: ${audit.summary.public_ready_after_audit}`);
  lines.push('');
  lines.push('## Branch State');
  lines.push('');
  lines.push(`- Branch: ${audit.branch_state.branch || '-'}`);
  lines.push(`- Upstream: ${audit.branch_state.upstream || '-'}`);
  lines.push(`- Ahead: ${audit.branch_state.ahead ?? '-'}`);
  lines.push(`- Behind: ${audit.branch_state.behind ?? '-'}`);
  lines.push(`- Diverged: ${audit.branch_state.diverged ? 'yes' : 'no'}`);
  lines.push(`- Push requires sync decision: ${audit.branch_state.push_requires_sync_decision ? 'yes' : 'no'}`);
  lines.push('');
  lines.push('## Top-Level Buckets');
  lines.push('');
  audit.buckets.by_top_level.slice(0, 30).forEach((bucket) => {
    lines.push(`- ${bucket.key}: ${bucket.count}`);
  });
  lines.push('');
  lines.push('## Status Code Buckets');
  lines.push('');
  audit.buckets.by_status_code.forEach((bucket) => {
    lines.push(`- \`${bucket.key}\`: ${bucket.count}`);
  });
  lines.push('');
  lines.push('## Worker Rules');
  lines.push('');
  audit.worker_rules.forEach((rule) => lines.push(`- ${rule}`));
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
