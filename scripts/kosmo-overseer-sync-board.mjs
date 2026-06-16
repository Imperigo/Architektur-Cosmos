#!/usr/bin/env node

import { access, mkdir, readdir, readFile, stat, writeFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = new Date().toISOString().slice(0, 10);

const refs = {
  sweep: resolve(root, args.sweep || `data/kosmodata-lane-sweep-${dateStamp}.json`),
  router: resolve(root, args.router || `data/kosmo-data-lane-command-router-${dateStamp}.json`),
  checkpoint: resolve(root, args.checkpoint || `data/kosmo-night-loop-checkpoint-${dateStamp}.json`),
  sessionBriefCheck: resolve(root, args.sessionBriefCheck || `data/kosmo-owner-review-session-brief-check-${dateStamp}.json`),
  localWorkerReview: resolve(root, args.localWorkerReview || `data/kosmo-local-worker-output-review-${dateStamp}.json`)
};

const handoffInboxes = [
  resolve(root, '../KosmoOrbit/_overseer/intake/inbox'),
  '/mnt/data/ArchitekturKosmos/KosmoOrbit/_overseer/intake/inbox'
];

const outputJson = resolve(root, args.out || `data/kosmo-overseer-sync-board-${dateStamp}.json`);
const outputMd = resolve(root, args.markdown || `docs/codex/kosmo-overseer-sync-board-${dateStamp}.md`);

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const sweep = await readJson(refs.sweep);
  const router = await readJson(refs.router);
  const checkpoint = await readJson(refs.checkpoint);
  const sessionBriefCheck = await readJson(refs.sessionBriefCheck);
  const localWorkerReview = await readJson(refs.localWorkerReview);
  const inboxes = await Promise.all(handoffInboxes.map((inbox) => readInbox(inbox)));
  const latestHandoffs = mergeLatestHandoffs(inboxes, 8);
  const mirrorStatus = mirrorStatusFor(inboxes);
  const activeInboxCount = inboxes.filter((inbox) => inbox.exists).length;
  const latestMissingMirrors = latestHandoffs.filter((handoff) => handoff.mirrored_inboxes < activeInboxCount).length;
  const handoffRange = rangeLabel(latestHandoffs);

  const board = {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    status: latestMissingMirrors === 0 ? 'overseer_sync_board_ready' : 'overseer_sync_board_needs_mirror_review',
    policy: {
      records_decisions: false,
      writes_session_files: false,
      applies_decisions: false,
      writes_public_files: false,
      writes_public_manifest: false,
      public_ready_after_board: 0,
      note: 'This board summarizes Codex/Claude/KosmoOverseer coordination state. It does not record owner answers or change data-lane decisions.'
    },
    source_refs: Object.values(refs).map((path) => relative(root, path)),
    handoff_inboxes: inboxes.map((inbox) => ({
      path: inbox.path,
      exists: inbox.exists,
      files: inbox.files.length
    })),
    summary: {
      data_lane_status: sweep.status,
      data_lane_steps: `${sweep.summary?.passed_steps}/${sweep.summary?.steps}`,
      router_status: router.status,
      checkpoint_status: checkpoint.status,
      next_loop: checkpoint.next_loop?.primary_action ?? null,
      session_brief_guard_status: sessionBriefCheck.status,
      session_brief_failures: sessionBriefCheck.summary?.failures ?? null,
      local_worker_review_status: localWorkerReview.status,
      local_worker_outputs: `${localWorkerReview.summary?.present_outputs}/${localWorkerReview.summary?.required_outputs}`,
      local_worker_high_risk_hits: localWorkerReview.summary?.high_risk_hits ?? null,
      latest_handoffs: latestHandoffs.length,
      latest_handoff_mirror_missing_files: latestMissingMirrors,
      historical_handoff_mirror_missing_files: mirrorStatus.missing_files,
      public_ready_after_board: 0
    },
    latest_handoffs: latestHandoffs,
    blockers: [
      {
        id: 'source_root_pending',
        status: checkpoint.summary?.source_root_blocked ? 'blocked' : 'metadata_only_allowed',
        evidence: `source_root_blocked=${checkpoint.summary?.source_root_blocked}`
      },
      {
        id: 'private_inventory_pending',
        status: checkpoint.summary?.private_inventory_blocked ? 'blocked' : 'metadata_only_allowed',
        evidence: `private_inventory_blocked=${checkpoint.summary?.private_inventory_blocked}`
      },
      {
        id: 'owner_answers_pending',
        status: 'blocked',
        evidence: `session_brief_failures=${sessionBriefCheck.summary?.failures}, prior_signals_recordable_now=${sessionBriefCheck.summary?.prior_signals_recordable_now}`
      },
      {
        id: 'public_ready_zero',
        status: sweep.summary?.references_public_ready_assets === 0 ? 'passed' : 'failed',
        evidence: `references_public_ready_assets=${sweep.summary?.references_public_ready_assets}`
      }
    ],
    next_actions: [
      `Claude/KosmoOverseer reviews latest handoffs ${handoffRange} before editing related files.`,
      'Use the owner review session brief as the next owner-facing entry point.',
      'Keep local worker tasks review-only while source-root and owner answers are pending.',
      'After any explicit owner answer, update intake first, then rerun guards and this sync board.'
    ]
  };

  await mkdir(dirname(outputJson), { recursive: true });
  await mkdir(dirname(outputMd), { recursive: true });
  await writeFile(outputJson, `${JSON.stringify(board, null, 2)}\n`);
  await writeFile(outputMd, renderMarkdown(board));

  console.log('Kosmo overseer sync board');
  console.log(`Status: ${board.status}`);
  console.log(`Data lane: ${board.summary.data_lane_steps}`);
  console.log(`Latest handoffs: ${board.summary.latest_handoffs}`);
  console.log(`Latest mirror missing: ${board.summary.latest_handoff_mirror_missing_files}`);
  console.log(`Wrote: ${relative(root, outputMd)}`);
}

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

async function readInbox(path) {
  const exists = await pathExists(path);
  if (!exists) return { path, exists: false, files: [] };
  const entries = await readdir(path);
  const files = [];
  for (const entry of entries.filter((name) => name.endsWith('.md'))) {
    const fullPath = resolve(path, entry);
    const info = await stat(fullPath);
    const text = await readFile(fullPath, 'utf8');
    files.push({
      filename: entry,
      path: fullPath,
      bytes: info.size,
      modified_at: info.mtime.toISOString(),
      title: firstHeading(text)
    });
  }
  files.sort(compareHandoffFiles);
  return { path, exists: true, files };
}

function mergeLatestHandoffs(inboxes, limit) {
  const byName = new Map();
  for (const inbox of inboxes) {
    for (const file of inbox.files) {
      const current = byName.get(file.filename) || {
        filename: file.filename,
        title: file.title,
        inboxes: [],
        bytes: file.bytes,
        modified_at: file.modified_at
      };
      current.inboxes.push(inbox.path);
      byName.set(file.filename, current);
    }
  }
  return [...byName.values()]
    .sort(compareHandoffFiles)
    .slice(0, limit)
    .map((item) => ({
      filename: item.filename,
      title: item.title,
      mirrored_inboxes: item.inboxes.length,
      bytes: item.bytes,
      modified_at: item.modified_at
    }));
}

function compareHandoffFiles(left, right) {
  const leftNumber = handoffNumber(left.filename);
  const rightNumber = handoffNumber(right.filename);
  if (leftNumber !== rightNumber) return rightNumber - leftNumber;
  return right.filename.localeCompare(left.filename);
}

function handoffNumber(filename) {
  const match = filename.match(/synergiebericht-(\d+)/);
  return match ? Number(match[1]) : 0;
}

function rangeLabel(handoffs) {
  const numbers = handoffs.map((handoff) => handoffNumber(handoff.filename)).filter(Boolean);
  if (numbers.length === 0) return 'n/a';
  return `${Math.min(...numbers)}-${Math.max(...numbers)}`;
}

function mirrorStatusFor(inboxes) {
  if (inboxes.length < 2) return { missing_files: 0 };
  const allNames = new Set(inboxes.flatMap((inbox) => inbox.files.map((file) => file.filename)));
  let missing = 0;
  for (const name of allNames) {
    for (const inbox of inboxes) {
      if (!inbox.files.some((file) => file.filename === name)) missing += 1;
    }
  }
  return { missing_files: missing };
}

async function pathExists(path) {
  try {
    await access(path, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

function firstHeading(text) {
  const line = text.split(/\r?\n/).find((candidate) => candidate.startsWith('# '));
  return line ? line.slice(2).trim() : null;
}

function renderMarkdown(board) {
  const lines = [];
  lines.push('# Kosmo Overseer Sync Board');
  lines.push('');
  lines.push(`Generated: ${board.generated_at}`);
  lines.push(`Status: \`${board.status}\``);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Data lane: ${board.summary.data_lane_steps} (${board.summary.data_lane_status})`);
  lines.push(`- Router: ${board.summary.router_status}`);
  lines.push(`- Checkpoint: ${board.summary.checkpoint_status}`);
  lines.push(`- Next loop: ${board.summary.next_loop}`);
  lines.push(`- Session brief guard: ${board.summary.session_brief_guard_status}, failures ${board.summary.session_brief_failures}`);
  lines.push(`- Local worker review: ${board.summary.local_worker_review_status}, outputs ${board.summary.local_worker_outputs}, risk ${board.summary.local_worker_high_risk_hits}`);
  lines.push(`- Latest handoffs tracked: ${board.summary.latest_handoffs}`);
  lines.push(`- Latest handoff mirror missing files: ${board.summary.latest_handoff_mirror_missing_files}`);
  lines.push(`- Historical handoff mirror missing files: ${board.summary.historical_handoff_mirror_missing_files}`);
  lines.push(`- Public-ready after board: ${board.summary.public_ready_after_board}`);
  lines.push('');
  lines.push('## Latest Handoffs');
  lines.push('');
  lines.push('| File | Title | Mirrors |');
  lines.push('| --- | --- | ---: |');
  board.latest_handoffs.forEach((handoff) => {
    lines.push(`| \`${handoff.filename}\` | ${handoff.title || '-'} | ${handoff.mirrored_inboxes} |`);
  });
  lines.push('');
  lines.push('## Blockers');
  lines.push('');
  lines.push('| Blocker | Status | Evidence |');
  lines.push('| --- | --- | --- |');
  board.blockers.forEach((blocker) => {
    lines.push(`| \`${blocker.id}\` | ${blocker.status} | ${blocker.evidence} |`);
  });
  lines.push('');
  lines.push('## Next Actions');
  lines.push('');
  board.next_actions.forEach((action) => lines.push(`- ${action}`));
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
