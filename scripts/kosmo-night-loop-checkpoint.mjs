#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = new Date().toISOString().slice(0, 10);
const sweepPath = resolve(root, args.sweep || `data/kosmodata-lane-sweep-${dateStamp}.json`);
const routerPath = resolve(root, args.router || `data/kosmo-data-lane-command-router-${dateStamp}.json`);
const ownerBriefPath = resolve(root, args.ownerBrief || `data/kosmo-owner-next-review-brief-${dateStamp}.json`);
const outputJson = resolve(root, args.out || `data/kosmo-night-loop-checkpoint-${dateStamp}.json`);
const outputMd = resolve(root, args.markdown || `docs/codex/kosmo-night-loop-checkpoint-${dateStamp}.md`);

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const sweep = JSON.parse(await readFile(sweepPath, 'utf8'));
  const router = JSON.parse(await readFile(routerPath, 'utf8'));
  const ownerBrief = JSON.parse(await readFile(ownerBriefPath, 'utf8'));
  const checkpoint = buildCheckpoint({ sweep, router, ownerBrief });

  await mkdir(dirname(outputJson), { recursive: true });
  await mkdir(dirname(outputMd), { recursive: true });
  await writeFile(outputJson, `${JSON.stringify(checkpoint, null, 2)}\n`);
  await writeFile(outputMd, renderMarkdown(checkpoint));

  console.log('Kosmo night loop checkpoint');
  console.log(`Status: ${checkpoint.status}`);
  console.log(`Data lane: ${checkpoint.summary.data_lane_steps}`);
  console.log(`Next loop: ${checkpoint.next_loop.primary_action}`);
  console.log(`Wrote: ${relative(root, outputMd)}`);
}

function buildCheckpoint({ sweep, router, ownerBrief }) {
  const sweepSummary = sweep.summary || {};
  const routerSummary = router.summary || {};
  const ownerSummary = ownerBrief.summary || {};
  const sourceRootBlocked = routerSummary.private_diagnostic_allowed !== true;
  const privateInventoryBlocked = routerSummary.private_inventory_allowed !== true;
  const routerReady = [
    'worker_router_guarded_review_only',
    'worker_router_private_diagnostic_ready'
  ].includes(router.status);
  const ownerOpen = ownerSummary.open_items ?? sweepSummary.human_queue_open_items ?? 0;
  const assetOpen = sweepSummary.asset_open_human_reviews ?? 0;
  const ownerBriefReady = [
    'owner_next_review_brief_open',
    'owner_next_review_brief_clear'
  ].includes(ownerBrief.status);
  const status = sweep.status === 'kosmodata_lane_sweep_review_only_passed' &&
    routerReady &&
    ownerBriefReady
    ? 'night_loop_guarded_ready'
    : 'night_loop_needs_review';

  return {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    status,
    policy: {
      review_only: true,
      records_decisions: false,
      public_writes_allowed: false,
      public_ready_after_checkpoint: 0,
      note: 'This checkpoint summarizes the current autonomous loop state. It does not run owner decisions, private extraction, public promotion or source copying.'
    },
    source_refs: [
      relative(root, sweepPath),
      relative(root, routerPath),
      relative(root, ownerBriefPath)
    ],
    summary: {
      data_lane_status: sweep.status,
      data_lane_steps: `${sweepSummary.passed_steps}/${sweepSummary.steps}`,
      data_lane_duration_ms: sweepSummary.duration_ms,
      router_status: router.status,
      owner_brief_status: ownerBrief.status,
      owner_open_batches: ownerSummary.open_batches,
      owner_open_items: ownerOpen,
      asset_open_reviews: assetOpen,
      source_root_blocked: sourceRootBlocked,
      private_inventory_blocked: privateInventoryBlocked,
      public_ready_assets: sweepSummary.references_public_ready_assets ?? 0,
      private_inventory_output_contract: sweepSummary.private_inventory_output_check_status,
      local_worker_review: sweepSummary.local_worker_review_status,
      local_worker_risk_hits: sweepSummary.local_worker_high_risk_hits ?? 0
    },
    next_loop: {
      primary_action: sourceRootBlocked
        ? 'prepare_owner_source_root_decision_and_batch_questions'
        : ownerOpen > 0
          ? 'resolve_owner_review_batch'
          : assetOpen > 0
            ? 'resolve_asset_human_reviews'
            : 'continue_review_only_quality_gates',
      owner_card_to_present_first: ownerBrief.recommended_order?.[0] || null,
      allowed_commands: router.allowed_commands_now || [],
      blocked_commands: router.blocked_commands_now || [],
      recommended_sequence: [
        'npm run kosmo:data-lane-sweep',
        'npm run kosmo:data-lane-command-router',
        'npm run kosmo:owner-next-review-brief',
        'npm run kosmo:owner-answer-sheet',
        'npm run kosmo:owner-answer-sheet-check',
        'npm run kosmo:owner-review-batch-resolution-ledger',
        'npm run kosmo:owner-review-batch-resolution-ledger-check',
        'Present one owner review card or record a confirmed source-root decision.',
        'After any decision edit, rerun sweep/router/checkpoint.'
      ]
    },
    invariants: [
      {
        id: 'public_ready_zero',
        status: (sweepSummary.references_public_ready_assets ?? 0) === 0 ? 'passed' : 'failed',
        evidence: `references_public_ready_assets=${sweepSummary.references_public_ready_assets ?? 0}`
      },
      {
        id: 'local_worker_review_only',
        status: sweepSummary.local_worker_public_ready_allowed !== true && (sweepSummary.local_worker_high_risk_hits ?? 0) === 0 ? 'passed' : 'failed',
        evidence: `public_ready_allowed=${sweepSummary.local_worker_public_ready_allowed}, risk=${sweepSummary.local_worker_high_risk_hits ?? 0}`
      },
      {
        id: 'private_inventory_contract',
        status: sweepSummary.private_inventory_output_check_failures === 0 && sweepSummary.private_inventory_output_check_public_ready_hits === 0 ? 'passed' : 'failed',
        evidence: `failures=${sweepSummary.private_inventory_output_check_failures}, public_ready_hits=${sweepSummary.private_inventory_output_check_public_ready_hits}`
      },
      {
        id: 'router_blocks_private_without_root',
        status: sourceRootBlocked && privateInventoryBlocked
          ? 'passed'
          : router.status === 'worker_router_private_diagnostic_ready' &&
              routerSummary.private_diagnostic_allowed === true &&
              routerSummary.private_inventory_allowed === true &&
              (sweepSummary.references_public_ready_assets ?? 0) === 0
            ? 'passed'
            : 'needs_review',
        evidence: `private_diagnostic_allowed=${routerSummary.private_diagnostic_allowed}, private_inventory_allowed=${routerSummary.private_inventory_allowed}`
      }
    ]
  };
}

function renderMarkdown(checkpoint) {
  const lines = [];
  lines.push('# Kosmo Night Loop Checkpoint');
  lines.push('');
  lines.push(`Generated: ${checkpoint.generated_at}`);
  lines.push(`Status: \`${checkpoint.status}\``);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Data lane: ${checkpoint.summary.data_lane_steps} (${checkpoint.summary.data_lane_status})`);
  lines.push(`- Duration: ${checkpoint.summary.data_lane_duration_ms}ms`);
  lines.push(`- Router: ${checkpoint.summary.router_status}`);
  lines.push(`- Owner brief: ${checkpoint.summary.owner_brief_status}`);
  lines.push(`- Owner open: ${checkpoint.summary.owner_open_batches} batches / ${checkpoint.summary.owner_open_items} items`);
  lines.push(`- Asset reviews open: ${checkpoint.summary.asset_open_reviews}`);
  lines.push(`- Source root blocked: ${checkpoint.summary.source_root_blocked ? 'yes' : 'no'}`);
  lines.push(`- Private inventory blocked: ${checkpoint.summary.private_inventory_blocked ? 'yes' : 'no'}`);
  lines.push(`- Public-ready assets: ${checkpoint.summary.public_ready_assets}`);
  lines.push(`- Local worker review: ${checkpoint.summary.local_worker_review}, risk ${checkpoint.summary.local_worker_risk_hits}`);
  lines.push(`- Private inventory contract: ${checkpoint.summary.private_inventory_output_contract}`);
  lines.push('');
  lines.push('## Next Loop');
  lines.push('');
  lines.push(`Primary action: \`${checkpoint.next_loop.primary_action}\``);
  lines.push(`First owner card: \`${checkpoint.next_loop.owner_card_to_present_first || 'none'}\``);
  lines.push('');
  lines.push('Recommended sequence:');
  checkpoint.next_loop.recommended_sequence.forEach((item) => lines.push(`- ${item}`));
  lines.push('');
  lines.push('## Invariants');
  lines.push('');
  lines.push('| Invariant | Status | Evidence |');
  lines.push('| --- | --- | --- |');
  checkpoint.invariants.forEach((item) => {
    lines.push(`| \`${item.id}\` | ${item.status} | ${item.evidence} |`);
  });
  lines.push('');
  lines.push('## Blocked Commands');
  lines.push('');
  checkpoint.next_loop.blocked_commands.forEach((item) => {
    lines.push(`- \`${item.command}\`: ${item.reason}`);
  });
  lines.push('');
  return `${lines.join('\n')}`;
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
