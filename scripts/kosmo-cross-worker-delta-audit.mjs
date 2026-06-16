#!/usr/bin/env node

import { execFile } from 'node:child_process';
import { access, mkdir, readdir, readFile, stat, writeFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = new Date().toISOString().slice(0, 10);

const repos = [
  {
    id: 'architecture-cosmos',
    role: 'codex-central',
    path: resolve(root, args.architectureCosmos || '.')
  },
  {
    id: 'kosmo-orbit',
    role: 'orbit-claude-codex-shared',
    path: resolve(root, args.kosmoOrbit || '../KosmoOrbit')
  }
];

const handoffInboxes = [
  resolve(root, args.codeOrbitInbox || '../KosmoOrbit/_overseer/intake/inbox'),
  resolve(root, args.mirrorOrbitInbox || '/mnt/data/ArchitekturKosmos/KosmoOrbit/_overseer/intake/inbox')
];

const reviewDocsDir = resolve(root, args.reviewDocs || 'docs/codex');
const outputJson = resolve(root, args.out || `data/kosmo-cross-worker-delta-audit-${dateStamp}.json`);
const outputMd = resolve(root, args.markdown || `docs/codex/kosmo-cross-worker-delta-audit-${dateStamp}.md`);

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const repoReports = [];
  for (const repo of repos) repoReports.push(await readRepo(repo));
  const inboxReports = await Promise.all(handoffInboxes.map((path) => readInbox(path)));
  const reviewLedger = await readReviewLedger(reviewDocsDir);
  const audit = buildAudit(repoReports, inboxReports, reviewLedger);

  await mkdir(dirname(outputJson), { recursive: true });
  await mkdir(dirname(outputMd), { recursive: true });
  await writeFile(outputJson, `${JSON.stringify(audit, null, 2)}\n`);
  await writeFile(outputMd, renderMarkdown(audit));

  console.log('Kosmo cross-worker delta audit');
  console.log(`Status: ${audit.status}`);
  console.log(`Repos: ${audit.summary.repos}`);
  console.log(`Latest handoff: ${audit.summary.latest_handoff_number}`);
  console.log(`Unmirrored latest handoffs: ${audit.summary.latest_unmirrored_handoffs}`);
  console.log(`Foreign commits needing review: ${audit.summary.foreign_commits_needing_review}`);
  console.log(`Wrote: ${relative(root, outputMd)}`);
}

async function readRepo(repo) {
  const exists = await pathExists(resolve(repo.path, '.git'));
  if (!exists) {
    return {
      ...repo,
      exists: false,
      head: null,
      branch: null,
      status_count: null,
      recent_commits: []
    };
  }

  const [head, branch, status, log] = await Promise.all([
    git(repo.path, ['rev-parse', '--short', 'HEAD']),
    git(repo.path, ['branch', '--show-current']),
    git(repo.path, ['status', '--porcelain=v1']),
    git(repo.path, ['log', '-12', '--date=iso-strict', '--pretty=format:%h%x09%an%x09%ad%x09%s'])
  ]);

  return {
    ...repo,
    exists: true,
    head: head.trim(),
    branch: branch.trim(),
    status_count: status.split(/\r?\n/).filter(Boolean).length,
    recent_commits: log.split(/\r?\n/)
      .filter(Boolean)
      .map(parseCommitLine)
  };
}

async function readInbox(path) {
  const exists = await pathExists(path);
  if (!exists) return { path, exists: false, files: [] };
  const entries = (await readdir(path)).filter((name) => name.endsWith('.md'));
  const files = [];
  for (const filename of entries) {
    const fullPath = resolve(path, filename);
    const info = await stat(fullPath);
    const text = await readFile(fullPath, 'utf8');
    files.push({
      filename,
      number: handoffNumber(filename),
      title: firstHeading(text),
      modified_at: info.mtime.toISOString(),
      bytes: info.size
    });
  }
  files.sort((left, right) => right.number - left.number || right.filename.localeCompare(left.filename));
  return { path, exists: true, files };
}

async function readReviewLedger(path) {
  const exists = await pathExists(path);
  if (!exists) return { path, exists: false, files: [], reviewed_hashes: [] };
  const entries = (await readdir(path))
    .filter((name) => /^kosmo-cross-worker-commit-review.*\.md$/.test(name))
    .sort();
  const hashes = new Set();
  const files = [];
  for (const filename of entries) {
    const text = await readFile(resolve(path, filename), 'utf8');
    const reviewedHashes = [...text.matchAll(/`([0-9a-f]{7,40})`/gi)]
      .map((match) => match[1].slice(0, 7).toLowerCase());
    reviewedHashes.forEach((hash) => hashes.add(hash));
    files.push({ filename, reviewed_hashes: reviewedHashes });
  }
  return { path, exists: true, files, reviewed_hashes: [...hashes].sort() };
}

function buildAudit(repoReports, inboxReports, reviewLedger) {
  const latestHandoffs = mergeLatestHandoffs(inboxReports, 10);
  const activeInboxCount = inboxReports.filter((inbox) => inbox.exists).length;
  const latestUnmirrored = latestHandoffs.filter((handoff) => handoff.mirrored_inboxes < activeInboxCount);
  const kosmoOrbit = repoReports.find((repo) => repo.id === 'kosmo-orbit');
  const foreignCandidates = (kosmoOrbit?.recent_commits || [])
    .filter((commit) => !/codex/i.test(commit.author))
    .slice(0, 12);
  const ignoredHandoffCommits = foreignCandidates.filter(isHandoffCommit);
  const functionalForeignCommits = foreignCandidates.filter((commit) => !isHandoffCommit(commit));
  const reviewedForeignCommits = functionalForeignCommits
    .filter((commit) => reviewLedger.reviewed_hashes.includes(commit.hash.toLowerCase()));
  const foreignCommits = functionalForeignCommits
    .filter((commit) => !reviewLedger.reviewed_hashes.includes(commit.hash.toLowerCase()));
  const failures = [];
  if (repoReports.some((repo) => !repo.exists)) failures.push('One or more expected repos are missing.');
  if (latestUnmirrored.length > 0) failures.push('Latest handoffs are not mirrored in all active inboxes.');
  if (activeInboxCount < 2) failures.push('Less than two handoff inboxes are visible.');

  return {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    status: failures.length === 0
      ? 'cross_worker_delta_audit_ready'
      : 'cross_worker_delta_audit_needs_review',
    policy: {
      audit_only: true,
      reads_private_content: false,
      reads_file_contents: 'review_notes_only',
      reads_handoff_headings_only: true,
      reads_review_notes_only: true,
      writes_repo_code: false,
      stages_files: false,
      public_ready_after_audit: 0
    },
    source_refs: repoReports.map((repo) => ({
      id: repo.id,
      path: repo.path
    })),
    summary: {
      repos: repoReports.length,
      visible_repos: repoReports.filter((repo) => repo.exists).length,
      latest_handoff_number: latestHandoffs[0]?.number || null,
      latest_handoffs: latestHandoffs.length,
      active_handoff_inboxes: activeInboxCount,
      latest_unmirrored_handoffs: latestUnmirrored.length,
      foreign_commits_seen: foreignCandidates.length,
      foreign_handoff_commits_ignored: ignoredHandoffCommits.length,
      functional_foreign_commits_seen: functionalForeignCommits.length,
      reviewed_foreign_commits: reviewedForeignCommits.length,
      foreign_commits_needing_review: foreignCommits.length,
      dirty_repo_entries: repoReports.reduce((sum, repo) => sum + (repo.status_count || 0), 0),
      failures: failures.length,
      public_ready_after_audit: 0
    },
    repos: repoReports.map((repo) => ({
      id: repo.id,
      role: repo.role,
      path: repo.path,
      exists: repo.exists,
      branch: repo.branch,
      head: repo.head,
      status_count: repo.status_count,
      recent_commits: repo.recent_commits
    })),
    handoff_inboxes: inboxReports.map((inbox) => ({
      path: inbox.path,
      exists: inbox.exists,
      files: inbox.files.length
    })),
    review_ledger: {
      path: reviewLedger.path,
      exists: reviewLedger.exists,
      files: reviewLedger.files.length,
      reviewed_hashes: reviewLedger.reviewed_hashes
    },
    latest_handoffs: latestHandoffs,
    foreign_handoff_commits_ignored: ignoredHandoffCommits,
    reviewed_foreign_commits: reviewedForeignCommits,
    foreign_commits_needing_review: foreignCommits,
    next_actions: [
      'Review unreviewed functional non-Codex KosmoOrbit commits before editing related Orbit files.',
      'Keep ArchitectureCosmos source-root and runtime gates closed until exact owner replies pass.',
      'Write a handoff when Codex changes shared Worker/Orbit coordination files.',
      'Use exact staging only; the worktree guard still blocks broad staging.'
    ],
    failures
  };
}

function isHandoffCommit(commit) {
  return /handoff/i.test(commit.subject || '');
}

async function git(cwd, args) {
  const { stdout } = await execFileAsync('git', args, {
    cwd,
    maxBuffer: 1024 * 1024 * 10
  });
  return stdout;
}

function parseCommitLine(line) {
  const [hash, author, date, ...subjectParts] = line.split('\t');
  return {
    hash,
    author,
    date,
    subject: subjectParts.join('\t')
  };
}

function mergeLatestHandoffs(inboxes, limit) {
  const byFilename = new Map();
  for (const inbox of inboxes) {
    for (const file of inbox.files) {
      const current = byFilename.get(file.filename) || {
        filename: file.filename,
        number: file.number,
        title: file.title,
        mirrored_inboxes: 0,
        modified_at: file.modified_at
      };
      current.mirrored_inboxes += 1;
      byFilename.set(file.filename, current);
    }
  }
  return [...byFilename.values()]
    .sort((left, right) => right.number - left.number || right.filename.localeCompare(left.filename))
    .slice(0, limit);
}

function handoffNumber(filename) {
  const match = filename.match(/synergiebericht-(\d+)/);
  return match ? Number(match[1]) : 0;
}

function firstHeading(text) {
  const line = text.split(/\r?\n/).find((candidate) => candidate.startsWith('# '));
  return line ? line.slice(2).trim() : null;
}

async function pathExists(path) {
  try {
    await access(path, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

function renderMarkdown(audit) {
  const lines = [];
  lines.push('# Kosmo Cross-Worker Delta Audit');
  lines.push('');
  lines.push(`Generated: ${audit.generated_at}`);
  lines.push(`Status: \`${audit.status}\``);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Repos: ${audit.summary.visible_repos}/${audit.summary.repos}`);
  lines.push(`- Latest handoff: ${audit.summary.latest_handoff_number ?? '-'}`);
  lines.push(`- Latest unmirrored handoffs: ${audit.summary.latest_unmirrored_handoffs}`);
  lines.push(`- Functional foreign commits seen: ${audit.summary.functional_foreign_commits_seen}`);
  lines.push(`- Reviewed foreign commits: ${audit.summary.reviewed_foreign_commits}`);
  lines.push(`- Foreign handoff commits ignored: ${audit.summary.foreign_handoff_commits_ignored}`);
  lines.push(`- Foreign commits needing review: ${audit.summary.foreign_commits_needing_review}`);
  lines.push(`- Dirty repo entries: ${audit.summary.dirty_repo_entries}`);
  lines.push(`- Public-ready after audit: ${audit.summary.public_ready_after_audit}`);
  lines.push('');
  lines.push('## Repos');
  lines.push('');
  audit.repos.forEach((repo) => {
    lines.push(`- ${repo.id}: ${repo.exists ? repo.branch : 'missing'} @ ${repo.head || '-'}, dirty ${repo.status_count ?? '-'}`);
  });
  lines.push('');
  lines.push('## Latest Handoffs');
  lines.push('');
  audit.latest_handoffs.forEach((handoff) => {
    lines.push(`- ${handoff.number}: ${handoff.title || handoff.filename} (mirrors ${handoff.mirrored_inboxes})`);
  });
  lines.push('');
  lines.push('## Review Ledger');
  lines.push('');
  lines.push(`- Exists: ${audit.review_ledger.exists}`);
  lines.push(`- Files: ${audit.review_ledger.files}`);
  lines.push(`- Reviewed hashes: ${audit.review_ledger.reviewed_hashes.join(', ') || '-'}`);
  lines.push('');
  lines.push('## Reviewed Foreign Commits');
  lines.push('');
  if (audit.reviewed_foreign_commits.length === 0) lines.push('- none');
  audit.reviewed_foreign_commits.forEach((commit) => {
    lines.push(`- ${commit.hash}: ${commit.author} - ${commit.subject}`);
  });
  lines.push('');
  lines.push('## Ignored Foreign Handoff Commits');
  lines.push('');
  if (audit.foreign_handoff_commits_ignored.length === 0) lines.push('- none');
  audit.foreign_handoff_commits_ignored.forEach((commit) => {
    lines.push(`- ${commit.hash}: ${commit.author} - ${commit.subject}`);
  });
  lines.push('');
  lines.push('## Foreign Commits Needing Review');
  lines.push('');
  if (audit.foreign_commits_needing_review.length === 0) lines.push('- none');
  audit.foreign_commits_needing_review.forEach((commit) => {
    lines.push(`- ${commit.hash}: ${commit.author} - ${commit.subject}`);
  });
  lines.push('');
  lines.push('## Next Actions');
  lines.push('');
  audit.next_actions.forEach((action) => lines.push(`- ${action}`));
  lines.push('');
  if (audit.failures.length > 0) {
    lines.push('## Failures');
    lines.push('');
    audit.failures.forEach((failure) => lines.push(`- ${failure}`));
    lines.push('');
  }
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
