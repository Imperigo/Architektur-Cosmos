#!/usr/bin/env node

import { execFile } from 'node:child_process';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = new Date().toISOString().slice(0, 10);

const architectureRepo = resolve(root);
const orbitRepo = resolve(root, args.orbitRepo || '../KosmoOrbit');
const handoffInboxes = [
  resolve(root, args.orbitCodeInbox || '../KosmoOrbit/_overseer/intake/inbox'),
  resolve(root, args.orbitMirrorInbox || '../../KosmoOrbit/_overseer/intake/inbox')
];

const refs = {
  dailyLoopRoutine: resolve(root, args.dailyLoopRoutine || `data/kosmo-codex-daily-loop-routine-${dateStamp}.json`),
  dailyLoopRoutineCheck: resolve(root, args.dailyLoopRoutineCheck || `data/kosmo-codex-daily-loop-routine-check-${dateStamp}.json`),
  ownerCheckpoint: resolve(root, args.ownerCheckpoint || `data/kosmo-owner-unlock-pipeline-checkpoint-${dateStamp}.json`),
  sessionApplyGuard: resolve(root, args.sessionApplyGuard || `data/kosmo-owner-unlock-session-apply-guard-${dateStamp}.json`),
  githubWatchlist: resolve(root, args.githubWatchlist || `data/kosmo-innovation-github-watchlist-${dateStamp}.json`),
  githubDiscovery: resolve(root, args.githubDiscovery || `data/kosmo-innovation-github-discovery-${dateStamp}.json`),
  githubReviewQueue: resolve(root, args.githubReviewQueue || `data/kosmo-innovation-github-review-queue-${dateStamp}.json`),
  syncBoard: resolve(root, args.syncBoard || `data/kosmo-overseer-sync-board-${dateStamp}.json`),
  tomorrowDayBatch: resolve(root, args.tomorrowDayBatch || `data/kosmo-tomorrow-day-batch-${dateStamp}.json`)
};

const outputJson = resolve(root, args.out || `data/kosmo-codex-morning-routine-run-${dateStamp}.json`);
const outputMd = resolve(root, args.markdown || `docs/codex/kosmo-codex-morning-routine-run-${dateStamp}.md`);

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const reports = {};
  for (const [key, path] of Object.entries(refs)) {
    reports[key] = await readOptionalJson(path);
  }

  const repos = await Promise.all([
    inspectRepo('architecture_cosmos', architectureRepo),
    inspectRepo('kosmo_orbit', orbitRepo)
  ]);
  const handoffs = await inspectHandoffs(handoffInboxes);
  const run = buildRun({ reports, repos, handoffs });

  await mkdir(dirname(outputJson), { recursive: true });
  await mkdir(dirname(outputMd), { recursive: true });
  await writeFile(outputJson, `${JSON.stringify(run, null, 2)}\n`);
  await writeFile(outputMd, renderMarkdown(run));

  console.log('Kosmo Codex morning routine run');
  console.log(`Status: ${run.status}`);
  console.log(`Repos checked: ${run.summary.repos_checked}`);
  console.log(`Fetch succeeded: ${run.summary.fetch_succeeded}/${run.summary.repos_checked}`);
  console.log(`Remote behind total: ${run.summary.remote_behind_total}`);
  console.log(`Source Root state: ${run.summary.source_root_state}`);
  console.log(`Next batch: ${run.summary.next_batch_mode}`);
  console.log(`Wrote: ${relative(root, outputMd)}`);
}

async function inspectRepo(id, path) {
  const fetch = await runGit(path, ['fetch', 'origin', 'main']);
  const branch = await runGit(path, ['rev-parse', '--abbrev-ref', 'HEAD']);
  const head = await runGit(path, ['rev-parse', 'HEAD']);
  const upstreamHead = await runGit(path, ['rev-parse', 'origin/main']);
  const behind = await runGit(path, ['rev-list', '--count', 'HEAD..origin/main']);
  const ahead = await runGit(path, ['rev-list', '--count', 'origin/main..HEAD']);
  const status = await runGit(path, ['status', '--short']);
  const dirtyLines = lines(status.stdout);

  return {
    id,
    path,
    branch: branch.stdout.trim() || null,
    head: head.stdout.trim() || null,
    origin_main: upstreamHead.stdout.trim() || null,
    fetch_attempted: true,
    fetch_succeeded: fetch.ok,
    fetch_error: fetch.ok ? null : fetch.stderr || fetch.stdout || fetch.error,
    remote_behind_count: Number(behind.stdout.trim() || 0),
    remote_ahead_count: Number(ahead.stdout.trim() || 0),
    dirty_count: dirtyLines.length,
    dirty_sample: dirtyLines.slice(0, 25),
    pulls_or_merges_now: false,
    resets_now: false
  };
}

async function runGit(cwd, argsList) {
  try {
    const { stdout, stderr } = await execFileAsync('git', argsList, {
      cwd,
      timeout: 30000,
      maxBuffer: 1024 * 1024 * 4
    });
    return { ok: true, stdout, stderr };
  } catch (error) {
    return {
      ok: false,
      stdout: error.stdout || '',
      stderr: error.stderr || '',
      error: error.message
    };
  }
}

async function inspectHandoffs(inboxes) {
  const snapshots = [];
  const byFile = new Map();
  for (const inbox of inboxes) {
    try {
      const files = await readdir(inbox);
      const handoffFiles = files.filter((file) => /synergiebericht-\d+/.test(file));
      snapshots.push({
        path: inbox,
        exists: true,
        files: handoffFiles.length,
        latest_number: latestNumber(handoffFiles),
        latest_file: latestFile(handoffFiles)
      });
      handoffFiles.forEach((file) => {
        if (!byFile.has(file)) byFile.set(file, 0);
        byFile.set(file, byFile.get(file) + 1);
      });
    } catch (error) {
      snapshots.push({
        path: inbox,
        exists: false,
        files: 0,
        latest_number: null,
        latest_file: null,
        error: error.message
      });
    }
  }

  const mirroredLatest = [...byFile.entries()]
    .filter(([, count]) => count === inboxes.length)
    .map(([file]) => ({ file, number: extractNumber(file) }))
    .filter((item) => Number.isFinite(item.number))
    .sort((left, right) => right.number - left.number)[0] || null;

  return {
    inboxes: snapshots,
    latest_number: Math.max(...snapshots.map((item) => item.latest_number || 0)),
    latest_mirrored_number: mirroredLatest?.number || null,
    latest_mirrored_file: mirroredLatest?.file || null
  };
}

function buildRun({ reports, repos, handoffs }) {
  const checkpointSummary = reports.ownerCheckpoint?.summary || {};
  const sessionGuardSummary = reports.sessionApplyGuard?.summary || {};
  const sourceRootState = checkpointSummary.source_root_state || 'unknown';
  const sourceRootBlocked = String(sourceRootState).includes('blocked') ||
    sessionGuardSummary.mode === 'waiting_for_manual_apply';
  const privateProcessingAllowed = reports.sessionApplyGuard?.status === 'owner_unlock_session_apply_guard_passed_after_manual_apply' &&
    sessionGuardSummary.private_diagnostic_allowed_after_apply === true;
  const remoteBehindTotal = repos.reduce((sum, repo) => sum + Number(repo.remote_behind_count || 0), 0);
  const fetchSucceeded = repos.filter((repo) => repo.fetch_succeeded).length;
  const innovationCandidates = Number(reports.githubWatchlist?.summary?.candidates || 0) +
    Number(reports.githubDiscovery?.summary?.unique_candidates || 0);
  const nextBatch = chooseNextBatch({ remoteBehindTotal, sourceRootBlocked, privateProcessingAllowed, reports });

  return {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    status: fetchSucceeded === repos.length
      ? 'codex_morning_routine_run_ready'
      : 'codex_morning_routine_run_attention_required',
    policy: {
      morning_execution_evidence: true,
      fetches_git_remotes: true,
      pulls_or_merges_now: false,
      resets_now: false,
      reads_private_content_now: false,
      runs_private_inventory_now: false,
      runs_ocr_now: false,
      creates_embeddings_now: false,
      installs_or_downloads_now: false,
      public_ready_after_run: 0
    },
    source_refs: Object.values(refs).map((path) => relative(root, path)),
    summary: {
      repos_checked: repos.length,
      fetch_succeeded: fetchSucceeded,
      remote_behind_total: remoteBehindTotal,
      dirty_repos: repos.filter((repo) => repo.dirty_count > 0).length,
      latest_handoff: handoffs.latest_number,
      latest_mirrored_handoff: handoffs.latest_mirrored_number,
      source_root_state: sourceRootState,
      source_root_blocked: sourceRootBlocked,
      private_processing_allowed: privateProcessingAllowed,
      github_watchlist_candidates: reports.githubWatchlist?.summary?.candidates ?? null,
      github_discovery_unique_candidates: reports.githubDiscovery?.summary?.unique_candidates ?? null,
      github_review_queue_items: reports.githubReviewQueue?.summary?.review_items ?? null,
      innovation_candidates: innovationCandidates,
      next_batch_mode: nextBatch.mode,
      next_batch_commands: nextBatch.commands.length,
      public_ready_after_run: 0
    },
    repos,
    handoffs,
    next_batch: nextBatch,
    hard_stops: [
      'Do not pull over dirty worktrees automatically.',
      'Do not treat broad owner intent as Source Root unlock.',
      'Do not read private architecture source content from this routine.',
      'Do not install dependencies or download models from this routine.'
    ]
  };
}

function chooseNextBatch({ remoteBehindTotal, sourceRootBlocked, privateProcessingAllowed, reports }) {
  if (remoteBehindTotal > 0) {
    return {
      mode: 'remote_delta_review',
      reason: 'At least one tracked repo is behind origin/main after fetch.',
      commands: [
        'git status --short',
        'git log --oneline --left-right HEAD...origin/main',
        'Review dirty worktree before any pull or merge.'
      ]
    };
  }

  if (!sourceRootBlocked && privateProcessingAllowed) {
    return {
      mode: 'post_owner_unlock_guarded_metadata_path',
      reason: 'Source Root guard indicates the exact owner-unlock path is applied.',
      commands: [
        'npm run kosmo:source-root-activation-preflight',
        'npm run kosmo:source-root-post-owner-activation-queue',
        'npm run kosmo:source-root-post-owner-activation-queue-check'
      ]
    };
  }

  return {
    mode: 'source_free_innovation_and_guarding',
    reason: reports.ownerCheckpoint?.summary?.source_root_state || 'Source Root is not unlocked.',
    commands: [
      'npm run kosmo:innovation-github-watchlist',
      'npm run kosmo:innovation-github-watchlist-check',
      'npm run kosmo:innovation-github-discovery',
      'npm run kosmo:innovation-github-discovery-check',
      'npm run kosmo:innovation-github-review-queue',
      'npm run kosmo:innovation-github-review-queue-check',
      'npm run kosmo:codex-morning-routine-run',
      'npm run kosmo:codex-morning-routine-run-check',
      'npm run kosmo:orbit-status-bridge'
    ]
  };
}

async function readOptionalJson(path) {
  try {
    return JSON.parse(await readFile(path, 'utf8'));
  } catch {
    return null;
  }
}

function latestFile(files) {
  return [...files].sort((left, right) => extractNumber(right) - extractNumber(left))[0] || null;
}

function latestNumber(files) {
  return extractNumber(latestFile(files));
}

function extractNumber(file) {
  const match = String(file || '').match(/synergiebericht-(\d+)/);
  return match ? Number(match[1]) : null;
}

function lines(value) {
  return String(value || '').split('\n').map((line) => line.trim()).filter(Boolean);
}

function renderMarkdown(report) {
  const linesOut = [];
  linesOut.push('# Kosmo Codex Morning Routine Run');
  linesOut.push('');
  linesOut.push(`Generated: ${report.generated_at}`);
  linesOut.push(`Status: \`${report.status}\``);
  linesOut.push('');
  linesOut.push('## Summary');
  linesOut.push('');
  linesOut.push(`- Repos checked: ${report.summary.repos_checked}`);
  linesOut.push(`- Fetch succeeded: ${report.summary.fetch_succeeded}/${report.summary.repos_checked}`);
  linesOut.push(`- Remote behind total: ${report.summary.remote_behind_total}`);
  linesOut.push(`- Dirty repos: ${report.summary.dirty_repos}`);
  linesOut.push(`- Latest handoff: ${report.summary.latest_handoff}`);
  linesOut.push(`- Latest mirrored handoff: ${report.summary.latest_mirrored_handoff}`);
  linesOut.push(`- Source Root state: ${report.summary.source_root_state}`);
  linesOut.push(`- Private processing allowed: ${report.summary.private_processing_allowed ? 'yes' : 'no'}`);
  linesOut.push(`- Innovation candidates: ${report.summary.innovation_candidates}`);
  linesOut.push(`- Next batch mode: ${report.summary.next_batch_mode}`);
  linesOut.push(`- Public-ready after run: ${report.summary.public_ready_after_run}`);
  linesOut.push('');
  linesOut.push('## Repos');
  linesOut.push('');
  report.repos.forEach((repo) => {
    linesOut.push(`- \`${repo.id}\`: branch ${repo.branch || '-'}, behind ${repo.remote_behind_count}, ahead ${repo.remote_ahead_count}, dirty ${repo.dirty_count}, fetch ${repo.fetch_succeeded ? 'ok' : 'failed'}`);
  });
  linesOut.push('');
  linesOut.push('## Next Batch');
  linesOut.push('');
  linesOut.push(`Mode: \`${report.next_batch.mode}\``);
  linesOut.push(`Reason: ${report.next_batch.reason}`);
  linesOut.push('');
  report.next_batch.commands.forEach((command) => linesOut.push(`- \`${command}\``));
  linesOut.push('');
  linesOut.push('## Hard Stops');
  linesOut.push('');
  report.hard_stops.forEach((item) => linesOut.push(`- ${item}`));
  linesOut.push('');
  return linesOut.join('\n');
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
