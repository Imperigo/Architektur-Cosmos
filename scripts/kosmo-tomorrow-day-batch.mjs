#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = new Date().toISOString().slice(0, 10);
const targetDate = addDays(dateStamp, 1);

const refs = {
  ownerCheckpoint: resolve(root, args.ownerCheckpoint || `data/kosmo-owner-unlock-pipeline-checkpoint-${dateStamp}.json`),
  acceptance: resolve(root, args.acceptance || `data/kosmo-evening-batch-acceptance-certificate-${dateStamp}.json`),
  sourceQueue: resolve(root, args.sourceQueue || `data/kosmo-source-independent-work-queue-${dateStamp}.json`),
  ownerDecisionBrief: resolve(root, args.ownerDecisionBrief || `data/kosmo-owner-remaining-decision-brief-${dateStamp}.json`),
  githubWatchlist: resolve(root, args.githubWatchlist || `data/kosmo-innovation-github-watchlist-${dateStamp}.json`),
  syncBoard: resolve(root, args.syncBoard || `data/kosmo-overseer-sync-board-${dateStamp}.json`)
};

const outputJson = resolve(root, args.out || `data/kosmo-tomorrow-day-batch-${dateStamp}.json`);
const outputMd = resolve(root, args.markdown || `docs/codex/kosmo-tomorrow-day-batch-${dateStamp}.md`);

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const reports = {
    ownerCheckpoint: await readOptionalJson(refs.ownerCheckpoint),
    acceptance: await readOptionalJson(refs.acceptance),
    sourceQueue: await readOptionalJson(refs.sourceQueue),
    ownerDecisionBrief: await readOptionalJson(refs.ownerDecisionBrief),
    githubWatchlist: await readOptionalJson(refs.githubWatchlist),
    syncBoard: await readOptionalJson(refs.syncBoard)
  };
  const plan = buildPlan(reports);

  await mkdir(dirname(outputJson), { recursive: true });
  await mkdir(dirname(outputMd), { recursive: true });
  await writeFile(outputJson, `${JSON.stringify(plan, null, 2)}\n`);
  await writeFile(outputMd, renderMarkdown(plan));

  console.log('Kosmo tomorrow day batch');
  console.log(`Status: ${plan.status}`);
  console.log(`Target date: ${plan.target_date}`);
  console.log(`Mode: ${plan.summary.execution_mode}`);
  console.log(`Open owner actions: ${plan.summary.open_owner_actions}`);
  console.log(`Public-ready after plan: ${plan.policy.public_ready_after_plan}`);
  console.log(`Wrote: ${relative(root, outputMd)}`);
}

function buildPlan(reports) {
  const sourceUnlocked = reports.ownerCheckpoint?.summary?.source_root_unlocked === true;
  const latestHandoff = reports.syncBoard?.summary?.latest_handoff_max ?? reports.ownerCheckpoint?.summary?.latest_handoff_max ?? null;
  const openOwnerActions = reports.ownerDecisionBrief?.summary?.open_owner_actions ??
    reports.sourceQueue?.summary?.owner_actions ??
    null;
  const codexExecutableNow = reports.sourceQueue?.summary?.codex_executable_now ?? null;
  const liveProbeSucceeded = reports.githubWatchlist?.summary?.live_probe_succeeded ?? null;
  const liveProbeFallback = reports.githubWatchlist?.summary?.live_probe_fallback ?? null;

  return {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    date: dateStamp,
    target_date: targetDate,
    status: 'tomorrow_day_batch_ready',
    policy: {
      source_free_until_owner_unlock: !sourceUnlocked,
      max_tick_minutes: 2,
      checkup_interval_minutes: 3,
      no_idle_wait_between_tasks: true,
      reads_private_content_now: false,
      runs_private_inventory_now: false,
      runs_ocr_now: false,
      creates_embeddings_now: false,
      runs_fine_tuning_now: false,
      executes_local_workers_now: false,
      installs_or_downloads_now: false,
      public_ready_after_plan: 0
    },
    source_refs: Object.values(refs).map((path) => relative(root, path)),
    summary: {
      execution_mode: sourceUnlocked ? 'post_owner_unlock_guarded_metadata_path' : 'source_free_path_until_exact_owner_unlock',
      source_root_unlocked: sourceUnlocked,
      owner_unlock_components: formatRatio(reports.ownerCheckpoint?.summary?.components_ready, reports.ownerCheckpoint?.summary?.components),
      owner_unlock_guards: formatRatio(reports.ownerCheckpoint?.summary?.guard_checks_passed, reports.ownerCheckpoint?.summary?.guard_checks),
      acceptance_known_checks: formatRatio(reports.acceptance?.summary?.known_checks_passed, reports.acceptance?.summary?.known_checks),
      acceptance_guard: reports.acceptance?.status || null,
      source_queue_status: reports.sourceQueue?.status || null,
      codex_executable_now: codexExecutableNow,
      open_owner_actions: openOwnerActions,
      live_github_probe: formatRatio(liveProbeSucceeded, (liveProbeSucceeded ?? 0) + (liveProbeFallback ?? 0)),
      latest_handoff: latestHandoff,
      public_ready_after_plan: 0
    },
    start_sequence: [
      'git status --short in ArchitectureCosmos and KosmoOrbit',
      'npm run kosmo:innovation-github-watchlist',
      'npm run kosmo:innovation-github-watchlist-check',
      'npm run kosmo:codex-daily-loop-routine',
      'npm run kosmo:codex-daily-loop-routine-check',
      'npm run kosmo:owner-unlock-pipeline-checkpoint',
      'npm run kosmo:owner-unlock-pipeline-checkpoint-check',
      'npm run kosmo:source-independent-work-queue',
      'npm run kosmo:owner-remaining-decision-brief',
      'npm run kosmo:owner-remaining-decision-brief-check'
    ],
    path_a_if_exact_owner_unlock_reply_present: [
      'npm run kosmo:owner-unlock-prompt-pack-check',
      'npm run kosmo:owner-unlock-reply-validator -- --answer "<owner_reply>"',
      'npm run kosmo:owner-unlock-answer-dry-run -- --answer "<owner_reply>"',
      'npm run kosmo:source-root-decision-session-check',
      'npm run kosmo:source-root-blocker-refresh',
      'npm run kosmo:source-root-activation-preflight',
      'npm run kosmo:source-root-post-owner-activation-queue',
      'npm run kosmo:source-root-post-owner-activation-queue-check'
    ],
    after_path_a_clean_only: [
      'npm run kosmo:private-metadata-inventory',
      'npm run kosmo:private-metadata-inventory-check',
      'npm run kosmo:pilot-intake-readiness-pack',
      'npm run kosmo:pilot-intake-readiness-pack-check'
    ],
    path_b_if_still_blocked: [
      workBlock('live_innovation_scout', 'Refresh upstream GitHub candidates and keep installs/downloads gated.'),
      workBlock('guard_cleanup', 'Tighten source-root, public-ready and worker-boundary guards where ambiguity remains.'),
      workBlock('orbit_visibility', 'Refresh Orbit status bridge and overseer sync board after any source-free guard work.'),
      workBlock('owner_review_packet', 'Keep the exact owner decisions visible and answerable without exposing private content.'),
      workBlock('handoff_and_push', 'Mirror handoffs to KosmoOrbit, run lint/security and push exact staged files.')
    ],
    acceptance_criteria: [
      'Source Root either explicitly validated or cleanly blocked.',
      'No private PDFs, scans, OCR text, embeddings, training rows or protected assets in Git.',
      'No local worker execution, installation or model download without explicit batch gate.',
      'Live GitHub scout runs as watchlist-only and reports live/fallback probe counts.',
      'Claude/KosmoOverseer handoff is mirrored when shared state changes.',
      'ArchitectureCosmos and KosmoOrbit are pushed after verified blocks.'
    ],
    start_sentence: `Weiter mit docs/codex/kosmo-tomorrow-day-batch-${dateStamp}.md. Zuerst Live-GitHub-Scout und Owner-Unlock-Checkpoint ausfuehren, dann Path A nur bei exakter Owner-Antwort.`
  };
}

function workBlock(id, objective) {
  return { id, objective, status: 'ready_source_free', public_ready_after_block: 0 };
}

function formatRatio(passed, total) {
  if (!Number.isFinite(passed) || !Number.isFinite(total)) return null;
  return `${passed}/${total}`;
}

function addDays(date, days) {
  const parsed = new Date(`${date}T00:00:00.000Z`);
  parsed.setUTCDate(parsed.getUTCDate() + days);
  return parsed.toISOString().slice(0, 10);
}

async function readOptionalJson(path) {
  try {
    return JSON.parse(await readFile(path, 'utf8'));
  } catch {
    return null;
  }
}

function renderMarkdown(plan) {
  const lines = [];
  lines.push(`# Kosmo Tagesauftrag ${plan.target_date}`);
  lines.push('');
  lines.push(`Generated: ${plan.generated_at}`);
  lines.push(`Status: \`${plan.status}\``);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Execution mode: ${plan.summary.execution_mode}`);
  lines.push(`- Source-root unlocked: ${plan.summary.source_root_unlocked ? 'yes' : 'no'}`);
  lines.push(`- Owner unlock components: ${plan.summary.owner_unlock_components || '-'}`);
  lines.push(`- Owner unlock guards: ${plan.summary.owner_unlock_guards || '-'}`);
  lines.push(`- Acceptance known checks: ${plan.summary.acceptance_known_checks || '-'}`);
  lines.push(`- Source queue: ${plan.summary.source_queue_status || '-'}`);
  lines.push(`- Codex executable now: ${plan.summary.codex_executable_now ?? '-'}`);
  lines.push(`- Open owner actions: ${plan.summary.open_owner_actions ?? '-'}`);
  lines.push(`- Live GitHub probe: ${plan.summary.live_github_probe || '-'}`);
  lines.push(`- Latest handoff: ${plan.summary.latest_handoff ?? '-'}`);
  lines.push(`- Public-ready after plan: ${plan.summary.public_ready_after_plan}`);
  lines.push('');
  lines.push('## Policy');
  lines.push('');
  lines.push(`- Max tick minutes: ${plan.policy.max_tick_minutes}`);
  lines.push(`- Checkup interval minutes: ${plan.policy.checkup_interval_minutes}`);
  lines.push(`- No idle wait between tasks: ${plan.policy.no_idle_wait_between_tasks}`);
  lines.push(`- Reads private content now: ${plan.policy.reads_private_content_now}`);
  lines.push(`- Installs or downloads now: ${plan.policy.installs_or_downloads_now}`);
  lines.push('');
  lines.push('## Start Sequence');
  lines.push('');
  plan.start_sequence.forEach((command) => lines.push(`- \`${command}\``));
  lines.push('');
  lines.push('## Path A If Exact Owner Unlock Reply Is Present');
  lines.push('');
  plan.path_a_if_exact_owner_unlock_reply_present.forEach((command) => lines.push(`- \`${command}\``));
  lines.push('');
  lines.push('## After Path A Clean Only');
  lines.push('');
  plan.after_path_a_clean_only.forEach((command) => lines.push(`- \`${command}\``));
  lines.push('');
  lines.push('## Path B If Still Blocked');
  lines.push('');
  plan.path_b_if_still_blocked.forEach((block) => {
    lines.push(`- \`${block.id}\`: ${block.objective}`);
  });
  lines.push('');
  lines.push('## Acceptance Criteria');
  lines.push('');
  plan.acceptance_criteria.forEach((item) => lines.push(`- ${item}`));
  lines.push('');
  lines.push('## Start Sentence');
  lines.push('');
  lines.push(`> ${plan.start_sentence}`);
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
