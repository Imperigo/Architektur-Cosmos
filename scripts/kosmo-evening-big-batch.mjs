#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = new Date().toISOString().slice(0, 10);
const targetDate = addDays(dateStamp, 1);

const refs = {
  dataLane: resolve(root, args.dataLane || `data/kosmodata-lane-sweep-${dateStamp}.json`),
  dayLoop: resolve(root, args.dayLoop || `data/kosmo-day-batch-loop-${dateStamp}.json`),
  sourceQueue: resolve(root, args.sourceQueue || `data/kosmo-source-independent-work-queue-${dateStamp}.json`),
  nightCheckpoint: resolve(root, args.nightCheckpoint || `data/kosmo-night-loop-checkpoint-${dateStamp}.json`),
  reviewLedger: resolve(root, args.reviewLedger || `data/kosmo-owner-review-batch-resolution-ledger-${dateStamp}.json`),
  reviewLedgerCheck: resolve(root, args.reviewLedgerCheck || `data/kosmo-owner-review-batch-resolution-ledger-check-${dateStamp}.json`),
  orbitBridge: resolve(root, args.orbitBridge || `data/kosmo-orbit-status-bridge-${dateStamp}.json`),
  overseerSync: resolve(root, args.overseerSync || `data/kosmo-overseer-sync-board-${dateStamp}.json`),
  overseerSyncCheck: resolve(root, args.overseerSyncCheck || `data/kosmo-overseer-sync-board-check-${dateStamp}.json`),
  localWorkerRunbook: resolve(root, args.localWorkerRunbook || `data/kosmo-local-worker-execution-runbook-${dateStamp}.json`),
  localWorkerRunbookCheck: resolve(root, args.localWorkerRunbookCheck || `data/kosmo-local-worker-execution-runbook-check-${dateStamp}.json`),
  assetTaxonomy: resolve(root, args.assetTaxonomy || `data/kosmoasset-candidate-taxonomy-review-${dateStamp}.json`),
  assetTaxonomyCheck: resolve(root, args.assetTaxonomyCheck || `data/kosmoasset-candidate-taxonomy-review-check-${dateStamp}.json`),
  pilotGap: resolve(root, args.pilotGap || `data/kosmoreferences-pilot-gap-label-review-${dateStamp}.json`),
  pilotGapCheck: resolve(root, args.pilotGapCheck || `data/kosmoreferences-pilot-gap-label-review-check-${dateStamp}.json`)
};

const outputJson = resolve(root, args.out || `data/kosmo-evening-big-batch-${dateStamp}.json`);
const outputMd = resolve(root, args.markdown || `docs/codex/kosmo-evening-big-batch-${dateStamp}.md`);

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const reports = {};
  for (const [key, path] of Object.entries(refs)) {
    reports[key] = await readOptionalJson(path);
  }
  const batch = buildBatch(reports);

  await mkdir(dirname(outputJson), { recursive: true });
  await mkdir(dirname(outputMd), { recursive: true });
  await writeFile(outputJson, `${JSON.stringify(batch, null, 2)}\n`);
  await writeFile(outputMd, renderMarkdown(batch));

  console.log('Kosmo evening big batch');
  console.log(`Status: ${batch.status}`);
  console.log(`Target date: ${batch.target_date}`);
  console.log(`Phases: ${batch.summary.phases}`);
  console.log(`Required commands: ${batch.summary.required_commands}`);
  console.log(`Owner actions now: ${batch.summary.owner_actions_now}`);
  console.log(`Public-ready after batch: ${batch.summary.public_ready_after_batch}`);
  console.log(`Wrote: ${relative(root, outputMd)}`);

  if (batch.status !== 'evening_big_batch_ready') process.exitCode = 1;
}

function buildBatch(reports) {
  const failures = [];
  requireStatus(failures, 'dataLane', reports.dataLane, 'kosmodata_lane_sweep_review_only_passed');
  requireStatus(failures, 'dayLoop', reports.dayLoop, 'day_batch_loop_passed_review_only');
  requireStatus(failures, 'sourceQueue', reports.sourceQueue, 'source_independent_work_queue_ready');
  requireStatus(failures, 'nightCheckpoint', reports.nightCheckpoint, 'night_loop_guarded_ready');
  requireStatus(failures, 'reviewLedger', reports.reviewLedger, 'owner_review_batch_resolution_ledger_ready');
  requireStatus(failures, 'reviewLedgerCheck', reports.reviewLedgerCheck, 'owner_review_batch_resolution_ledger_guard_passed');
  requireStatus(failures, 'orbitBridge', reports.orbitBridge, 'orbit_bridge_ready_with_blockers');
  requireStatus(failures, 'overseerSync', reports.overseerSync, 'overseer_sync_board_ready');
  requireStatus(failures, 'overseerSyncCheck', reports.overseerSyncCheck, 'overseer_sync_board_guard_passed');
  requireStatus(failures, 'localWorkerRunbook', reports.localWorkerRunbook, 'local_worker_execution_runbook_idle_review_only');
  requireStatus(failures, 'localWorkerRunbookCheck', reports.localWorkerRunbookCheck, 'local_worker_execution_runbook_guard_passed');
  requireStatus(failures, 'assetTaxonomy', reports.assetTaxonomy, 'kosmoasset_candidate_taxonomy_review_ready');
  requireStatus(failures, 'assetTaxonomyCheck', reports.assetTaxonomyCheck, 'kosmoasset_candidate_taxonomy_review_guard_passed');
  requireStatus(failures, 'pilotGap', reports.pilotGap, 'pilot_gap_label_review_ready');
  requireStatus(failures, 'pilotGapCheck', reports.pilotGapCheck, 'pilot_gap_label_review_guard_passed');

  const phases = [
    phase('01_refresh_and_lock_status', 'Status frisch halten und keine neuen privaten Inhalte anfassen.', [
      'npm run kosmo:data-lane-sweep',
      'npm run kosmo:data-lane-command-router',
      'npm run kosmo:source-independent-work-queue',
      'npm run kosmo:night-loop-checkpoint'
    ]),
    phase('02_references_detail_review_prep', 'Detailreviews fuer die drei Piloten vorbereiten, aber keine Public-Freigabe setzen.', [
      'npm run kosmo:pilot-evidence-matrix',
      'npm run kosmo:pilot-gap-label-review',
      'npm run kosmo:pilot-gap-label-review-check',
      'npm run kosmo:villa-provenance-brief',
      'npm run kosmo:sogn-source-root-brief',
      'npm run kosmo:ingenbohl-pdf-brief'
    ]),
    phase('03_asset_review_prep', 'KosmoAsset-Kandidaten weiter review-only strukturieren.', [
      'npm run kosmo:asset-reference-bridge-check',
      'npm run kosmo:asset-source-candidate-map',
      'npm run kosmo:asset-candidate-taxonomy-review',
      'npm run kosmo:asset-candidate-taxonomy-review-check'
    ]),
    phase('04_local_worker_guarded_preflight', 'Lokale Worker nur mit Fixture-/Runbook-Gates vorbereiten, keine private Inhaltsausfuehrung.', [
      'npm run kosmo:local-worker-output-review',
      'npm run kosmo:local-worker-output-contract-review',
      'npm run kosmo:local-worker-output-contract-review-check',
      'npm run kosmo:local-worker-execution-runbook',
      'npm run kosmo:local-worker-execution-runbook-check'
    ]),
    phase('05_innovation_runtime_backlog', 'GitHub-/Runtime-Innovationen als review-only Backlog fuer morgen aktualisieren.', [
      'npm run kosmo:innovation-github-watchlist',
      'npm run kosmo:innovation-github-watchlist-check',
      'npm run kosmo:innovation-github-discovery',
      'npm run kosmo:innovation-github-discovery-check',
      'npm run kosmo:innovation-github-review-queue',
      'npm run kosmo:innovation-github-review-queue-check'
    ]),
    phase('06_orbit_overseer_handoff', 'Orbit und Overseer mit Abendstand und Morgenauftrag synchronisieren.', [
      'npm run kosmo:orbit-status-bridge',
      'npm run kosmo:overseer-sync-board',
      'npm run kosmo:overseer-sync-board-check'
    ]),
    phase('07_final_acceptance', 'Abschluss pruefen, Handoff schreiben, gezielt committen und privat pushen.', [
      'npm run kosmo:day-batch-loop',
      'npm run lint',
      'git diff --cached --check',
      'git status --short'
    ])
  ];

  const requiredCommands = phases.reduce((sum, item) => sum + item.commands.length, 0);
  const ownerActionsNow = reports.sourceQueue?.summary?.owner_actions ?? null;
  const publicReady = [
    reports.dataLane?.summary?.references_public_ready_assets,
    reports.sourceQueue?.summary?.public_ready_after_queue,
    reports.reviewLedger?.summary?.public_ready_after_ledger,
    reports.nightCheckpoint?.policy?.public_ready_after_checkpoint
  ].some((value) => Number(value || 0) !== 0);

  if (ownerActionsNow !== 0) failures.push(`sourceQueue owner actions not clear: ${ownerActionsNow}`);
  if (publicReady) failures.push('At least one source report has public-ready above zero.');

  return {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    date: dateStamp,
    target_date: targetDate,
    status: failures.length === 0 ? 'evening_big_batch_ready' : 'evening_big_batch_needs_review',
    policy: {
      review_only_default: true,
      reads_private_content_now: false,
      copies_private_content_to_git: false,
      runs_ocr_now: false,
      creates_embeddings_now: false,
      runs_fine_tuning_now: false,
      executes_local_workers_on_private_content_now: false,
      publishes_or_sets_public_ready: false,
      private_metadata_inventory_allowed_only_by_existing_guard: true,
      max_tick_minutes: 2,
      checkup_interval_minutes: 3,
      public_ready_after_batch: 0
    },
    source_refs: Object.values(refs).map((path) => relative(root, path)),
    summary: {
      phases: phases.length,
      required_commands: requiredCommands,
      data_lane_status: reports.dataLane?.status || null,
      day_loop_status: reports.dayLoop?.status || null,
      source_queue_status: reports.sourceQueue?.status || null,
      night_checkpoint_status: reports.nightCheckpoint?.status || null,
      review_batches_resolved: reports.reviewLedger?.summary?.resolved_batches ?? null,
      review_items_resolved: reports.reviewLedger?.summary?.resolved_items ?? null,
      owner_actions_now: ownerActionsNow,
      asset_open_reviews: reports.dataLane?.summary?.asset_open_human_reviews ?? null,
      references_owner_pending: reports.dataLane?.summary?.references_owner_pending ?? null,
      orbit_blocking_cards: reports.orbitBridge?.summary?.blocking_cards ?? null,
      overseer_next_loop: reports.overseerSync?.summary?.next_loop || null,
      local_worker_executable_now: reports.localWorkerRunbook?.summary?.executable_now ?? null,
      failures: failures.length,
      public_ready_after_batch: 0
    },
    phases,
    tonight_focus: [
      'References: Villa Savoye, Sogn Benedetg und Ingenbohl auf item-level Review vorbereiten.',
      'Assets: sechs offene Human Reviews als echte naechste Owner-/Overseer-Entscheidung stehen lassen.',
      'Local Worker: nur Contracts, Validatoren und Runbooks haerten; keine private Inhaltsarbeit starten.',
      'Orbit/Overseer: Status sichtbar halten und Bericht 330 als Abendhandoff schreiben.',
      'Git: nur eigene Abendbatch-Artefakte gezielt committen und pushen.'
    ],
    hard_stops: [
      'Keine privaten PDFs, Scans, OCR-Texte oder geschuetzten Assets nach Git kopieren.',
      'Keine Public-Freigabe und kein Asset-Promotion-Flag setzen.',
      'Keine lokalen LLMs auf privaten Inhaltsdateien ausfuehren.',
      'Keine Embeddings, Fine-Tunes oder Eval-Rows aus privaten Quellen erzeugen.',
      'Keine fremden Worker-Artefakte verdeckt aendern; jede Aenderung im Handoff markieren.',
      'Bei neuen Guard-Fehlern stoppen, Befund dokumentieren und nicht weiter eskalieren.'
    ],
    tomorrow_start: {
      first_command: 'npm run kosmo:data-lane-sweep',
      second_command: 'npm run kosmo:night-loop-checkpoint',
      third_command: 'npm run kosmo:source-independent-work-queue',
      main_batch_after_green: 'Work through phases 02-06, then run phase 07 final acceptance.'
    },
    failures
  };
}

function phase(id, goal, commands) {
  return {
    id,
    goal,
    commands,
    executes_now_from_plan: false,
    public_ready_after_phase: 0
  };
}

function requireStatus(failures, id, report, expected) {
  if (!report) {
    failures.push(`${id} missing`);
    return;
  }
  if (report.status !== expected) failures.push(`${id} expected ${expected}, got ${report.status}`);
}

async function readOptionalJson(path) {
  try {
    return JSON.parse(await readFile(path, 'utf8'));
  } catch {
    return null;
  }
}

function renderMarkdown(batch) {
  const lines = [];
  lines.push('# Kosmo Grosser Abendbatch');
  lines.push('');
  lines.push(`Generated: ${batch.generated_at}`);
  lines.push(`Status: \`${batch.status}\``);
  lines.push(`Target date: ${batch.target_date}`);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Phases: ${batch.summary.phases}`);
  lines.push(`- Required commands: ${batch.summary.required_commands}`);
  lines.push(`- Data lane: ${batch.summary.data_lane_status}`);
  lines.push(`- Day loop: ${batch.summary.day_loop_status}`);
  lines.push(`- Source queue: ${batch.summary.source_queue_status}`);
  lines.push(`- Night checkpoint: ${batch.summary.night_checkpoint_status}`);
  lines.push(`- Review batches/items resolved: ${batch.summary.review_batches_resolved}/${batch.summary.review_items_resolved}`);
  lines.push(`- Owner actions now: ${batch.summary.owner_actions_now}`);
  lines.push(`- Asset open reviews: ${batch.summary.asset_open_reviews}`);
  lines.push(`- References owner pending: ${batch.summary.references_owner_pending}`);
  lines.push(`- Orbit blocking cards: ${batch.summary.orbit_blocking_cards}`);
  lines.push(`- Overseer next loop: ${batch.summary.overseer_next_loop}`);
  lines.push(`- Public-ready after batch: ${batch.summary.public_ready_after_batch}`);
  lines.push('');
  lines.push('## Phases');
  lines.push('');
  batch.phases.forEach((phaseItem) => {
    lines.push(`### ${phaseItem.id}`);
    lines.push('');
    lines.push(phaseItem.goal);
    lines.push('');
    phaseItem.commands.forEach((command) => lines.push(`- \`${command}\``));
    lines.push('');
  });
  lines.push('## Tonight Focus');
  lines.push('');
  batch.tonight_focus.forEach((item) => lines.push(`- ${item}`));
  lines.push('');
  lines.push('## Hard Stops');
  lines.push('');
  batch.hard_stops.forEach((item) => lines.push(`- ${item}`));
  lines.push('');
  lines.push('## Tomorrow Start');
  lines.push('');
  Object.entries(batch.tomorrow_start).forEach(([key, value]) => lines.push(`- ${key}: \`${value}\``));
  lines.push('');
  lines.push('## Failures');
  lines.push('');
  if (batch.failures.length > 0) batch.failures.forEach((failure) => lines.push(`- ${failure}`));
  else lines.push('- None.');
  lines.push('');
  return lines.join('\n');
}

function addDays(dateText, days) {
  const date = new Date(`${dateText}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
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
