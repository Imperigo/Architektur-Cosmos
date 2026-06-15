#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = new Date().toISOString().slice(0, 10);

const refs = {
  dataLaneSweep: resolve(root, args.dataLaneSweep || `data/kosmodata-lane-sweep-${dateStamp}.json`),
  router: resolve(root, args.router || `data/kosmo-data-lane-command-router-${dateStamp}.json`),
  workerBoundaryCheck: resolve(root, args.workerBoundaryCheck || `data/kosmo-worker-boundary-pack-check-${dateStamp}.json`),
  dayBatchLoop: resolve(root, args.dayBatchLoop || `data/kosmo-day-batch-loop-${dateStamp}.json`),
  sourceRootOwnerAction: resolve(root, args.sourceRootOwnerAction || `data/kosmo-source-root-owner-action-card-${dateStamp}.json`),
  sourceRootFinalBrief: resolve(root, args.sourceRootFinalBrief || `data/kosmo-source-root-owner-final-decision-brief-${dateStamp}.json`),
  tomorrowPlan: resolve(root, args.tomorrowPlan || `data/kosmo-tomorrow-day-batch-${dateStamp}.json`)
};

const outputJson = resolve(root, args.out || `data/kosmo-today-loop-plan-${dateStamp}.json`);
const outputMd = resolve(root, args.markdown || `docs/codex/kosmo-today-loop-plan-${dateStamp}.md`);

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const reports = {
    dataLaneSweep: await readOptionalJson(refs.dataLaneSweep),
    router: await readOptionalJson(refs.router),
    workerBoundaryCheck: await readOptionalJson(refs.workerBoundaryCheck),
    dayBatchLoop: await readOptionalJson(refs.dayBatchLoop),
    sourceRootOwnerAction: await readOptionalJson(refs.sourceRootOwnerAction),
    sourceRootFinalBrief: await readOptionalJson(refs.sourceRootFinalBrief),
    tomorrowPlan: await readOptionalJson(refs.tomorrowPlan)
  };
  const plan = buildPlan(reports);

  await mkdir(dirname(outputJson), { recursive: true });
  await mkdir(dirname(outputMd), { recursive: true });
  await writeFile(outputJson, `${JSON.stringify(plan, null, 2)}\n`);
  await writeFile(outputMd, renderMarkdown(plan));

  console.log('Kosmo today loop plan');
  console.log(`Status: ${plan.status}`);
  console.log(`Loop until: ${plan.loop.until_local}`);
  console.log(`Mode: ${plan.summary.execution_mode}`);
  console.log(`Work blocks: ${plan.work_blocks.length}`);
  console.log(`Public-ready after plan: ${plan.summary.public_ready_after_plan}`);
  console.log(`Wrote: ${relative(root, outputMd)}`);
}

function buildPlan(reports) {
  const sourceRootUnlocked = reports.sourceRootFinalBrief?.summary?.private_diagnostic_allowed === true ||
    reports.dayBatchLoop?.summary?.private_diagnostic_allowed === true;
  const dataLanePassed = reports.dataLaneSweep?.status === 'kosmodata_lane_sweep_review_only_passed';
  const boundaryPassed = reports.workerBoundaryCheck?.status === 'worker_boundary_pack_guard_passed';
  const ownerActionRequired = reports.sourceRootOwnerAction?.summary?.owner_action_required === true ||
    reports.sourceRootOwnerAction?.status === 'source_root_owner_action_required';

  const executionMode = sourceRootUnlocked ? 'post_owner_source_root_path_a' : 'source_free_path_b';
  const currentBlocker = sourceRootUnlocked
    ? 'none_for_private_metadata_diagnostic'
    : 'source_root_owner_confirmation_pending';

  return {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    status: dataLanePassed && boundaryPassed
      ? 'today_loop_plan_ready'
      : 'today_loop_plan_ready_with_bootstrap_warnings',
    policy: {
      autonomous_until_local_time: '18:00',
      max_tick_minutes: 2,
      checkup_interval_minutes: 3,
      no_idle_wait_between_tasks: true,
      source_root_gate_respected: !sourceRootUnlocked,
      reads_private_content: false,
      copies_private_content: false,
      runs_private_ocr: false,
      runs_embeddings_on_private_content: false,
      runs_fine_tuning: false,
      writes_public_files: false,
      writes_public_manifest: false,
      public_ready_after_plan: 0,
      note: 'This plan drives Codex source-free work until the owner explicitly confirms a Source Root. It does not unlock private libraries.'
    },
    source_refs: Object.values(refs).map((path) => relative(root, path)),
    summary: {
      execution_mode: executionMode,
      current_blocker: currentBlocker,
      data_lane_status: reports.dataLaneSweep?.status || null,
      data_lane_steps: `${reports.dataLaneSweep?.summary?.passed_steps ?? '?'}/${reports.dataLaneSweep?.summary?.steps ?? '?'}`,
      router_status: reports.router?.status || null,
      worker_boundary_guard_status: reports.workerBoundaryCheck?.status || null,
      day_batch_loop_status: reports.dayBatchLoop?.status || null,
      owner_action_required: ownerActionRequired,
      source_root_unlocked: sourceRootUnlocked,
      source_root_final_brief_status: reports.sourceRootFinalBrief?.status || null,
      inherited_tomorrow_plan_status: reports.tomorrowPlan?.status || null,
      public_ready_after_plan: 0
    },
    loop: {
      date: dateStamp,
      until_local: `${dateStamp}T18:00:00+02:00`,
      tick_max_minutes: 2,
      checkup_interval_minutes: 3,
      immediate_next_task_policy: 'start_next_task_without_waiting_when_current_task_finishes',
      stop_early_only_if: [
        'no source-free tasks remain',
        'all checks, handoffs and pushes are complete',
        'a command requires owner/admin input that cannot be inferred safely'
      ]
    },
    morning_routine: [
      command('refresh_daily_data_lane', 'npm run kosmo:data-lane-sweep'),
      command('refresh_worker_router', 'npm run kosmo:data-lane-command-router'),
      command('refresh_worker_boundary', 'npm run kosmo:worker-boundary-pack'),
      command('guard_worker_boundary', 'npm run kosmo:worker-boundary-pack-check'),
      command('refresh_owner_handoff', 'npm run kosmo:owner-review-session-brief && npm run kosmo:owner-review-session-brief-check'),
      command('refresh_overseer_board', 'npm run kosmo:overseer-sync-board && npm run kosmo:overseer-sync-board-check')
    ],
    work_blocks: [
      {
        id: 'innovation_scout',
        lane: 'kosmo-prepare-kosmoreferences-kosmoasset',
        objective: 'Check current primary-source code and model candidates that can accelerate ArchitekturKosmos without installing or touching private data.',
        first_commands: ['npm run kosmo:daily-innovation-scout', 'npm run kosmo:daily-innovation-scout-check'],
        acceptance: ['Scout report exists', 'all candidates mapped to lanes', 'no install/private-read/training action enabled']
      },
      {
        id: 'references_schema_hardening',
        lane: 'kosmoreferences',
        objective: 'Tighten source-free pilot package contracts for Villa Savoye, Sogn Benedetg and Ingenbohl.',
        first_commands: ['npm run kosmo:pilot-gap-label-review', 'npm run kosmo:pilot-gap-label-review-check', 'npm run kosmo:pilot-intake-readiness-pack', 'npm run kosmo:pilot-intake-readiness-pack-check'],
        acceptance: ['pilot gaps have machine labels', 'intake readiness remains review-only', 'public-ready remains 0']
      },
      {
        id: 'asset_schema_hardening',
        lane: 'kosmoasset',
        objective: 'Prepare review-only asset intake from reference candidates without public release.',
        first_commands: ['npm run kosmo:asset-source-candidate-map', 'npm run kosmo:asset-candidate-taxonomy-review', 'npm run kosmo:asset-candidate-taxonomy-review-check', 'npm run kosmo:asset-intake-readiness-pack', 'npm run kosmo:asset-intake-readiness-pack-check'],
        acceptance: ['asset candidates remain review-only', 'rights/owner fields explicit', 'local worker can classify metadata only']
      },
      {
        id: 'training_eval_readiness',
        lane: 'kosmo-training',
        objective: 'Keep future Kosmo training data honest before private ingestion: rubric, row template, review queue and ontology.',
        first_commands: ['npm run kosmo:training-eval-rubric-pack', 'npm run kosmo:training-eval-rubric-pack-check', 'npm run kosmo:training-eval-row-template', 'npm run kosmo:training-eval-row-template-check', 'npm run kosmo:training-eval-review-queue-plan', 'npm run kosmo:training-eval-review-queue-plan-check', 'npm run kosmo:architecture-ontology-seed', 'npm run kosmo:architecture-ontology-seed-check'],
        acceptance: ['no raw private text fields', 'evaluation gates explicit', 'ontology fields map to references/assets']
      },
      {
        id: 'orbit_and_handoff',
        lane: 'kosmoorbit-overseer-sync',
        objective: 'Expose today status in Orbit and mirror handoff for Claude/KosmoOverseer.',
        first_commands: ['npm run kosmo:orbit-status-bridge', 'npm run kosmo:overseer-sync-board', 'npm run kosmo:overseer-sync-board-check'],
        acceptance: ['Orbit bridge updated', 'handoff mirrored', 'checks pass before commit/push']
      }
    ],
    path_a_if_owner_confirms_source_root: [
      'npm run kosmo:owner-unlock-reply-validator -- --answer "<owner_reply>"',
      'npm run kosmo:owner-unlock-answer-dry-run -- --answer "<owner_reply>"',
      'npm run kosmo:source-root-decision-session-check',
      'npm run kosmo:source-root-blocker-refresh',
      'npm run kosmo:source-root-activation-preflight',
      'npm run kosmo:source-root-post-owner-activation-queue',
      'npm run kosmo:source-root-post-owner-activation-queue-check',
      'npm run kosmo:private-metadata-inventory',
      'npm run kosmo:private-metadata-inventory-check'
    ],
    path_b_while_blocked: [
      'Continue source-free schema, guard, eval, Orbit and handoff work.',
      'Do not scan private books, plans, PDFs, OCR text, OneDrive libraries or archive roots.',
      'Use public/current technical research only for planning and isolated experiments.',
      'Commit only repo-safe metadata, docs, scripts and checks.'
    ],
    handoff_notes: [
      'Codex may add clearly named Codex-owned reports and scripts.',
      'Codex must label any change that affects Claude/KosmoOverseer files.',
      'Local LLM work stays metadata-review-only until Source Root and owner gates pass.'
    ]
  };
}

function command(id, commandText) {
  return { id, command: commandText, required_before_loop: true };
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
  lines.push('# Kosmo Today Loop Plan');
  lines.push('');
  lines.push(`Generated: ${plan.generated_at}`);
  lines.push(`Status: \`${plan.status}\``);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Execution mode: ${plan.summary.execution_mode}`);
  lines.push(`- Current blocker: ${plan.summary.current_blocker}`);
  lines.push(`- Loop until: ${plan.loop.until_local}`);
  lines.push(`- Tick max: ${plan.loop.tick_max_minutes} minutes`);
  lines.push(`- Checkup interval: ${plan.loop.checkup_interval_minutes} minutes`);
  lines.push(`- Data lane: ${plan.summary.data_lane_status} (${plan.summary.data_lane_steps})`);
  lines.push(`- Router: ${plan.summary.router_status}`);
  lines.push(`- Worker boundary guard: ${plan.summary.worker_boundary_guard_status}`);
  lines.push(`- Source-root unlocked: ${plan.summary.source_root_unlocked ? 'yes' : 'no'}`);
  lines.push(`- Public-ready after plan: ${plan.summary.public_ready_after_plan}`);
  lines.push('');
  lines.push('## Morning Routine');
  lines.push('');
  for (const item of plan.morning_routine) {
    lines.push(`- \`${item.command}\``);
  }
  lines.push('');
  lines.push('## Work Blocks');
  lines.push('');
  for (const block of plan.work_blocks) {
    lines.push(`### ${block.id}`);
    lines.push('');
    lines.push(`- Lane: ${block.lane}`);
    lines.push(`- Objective: ${block.objective}`);
    lines.push(`- First commands: ${block.first_commands.map((commandText) => `\`${commandText}\``).join(', ')}`);
    lines.push(`- Acceptance: ${block.acceptance.join('; ')}`);
    lines.push('');
  }
  lines.push('## Path A If Owner Confirms Source Root');
  lines.push('');
  plan.path_a_if_owner_confirms_source_root.forEach((commandText) => lines.push(`- \`${commandText}\``));
  lines.push('');
  lines.push('## Path B While Blocked');
  lines.push('');
  plan.path_b_while_blocked.forEach((item) => lines.push(`- ${item}`));
  lines.push('');
  lines.push('## Handoff Notes');
  lines.push('');
  plan.handoff_notes.forEach((item) => lines.push(`- ${item}`));
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
