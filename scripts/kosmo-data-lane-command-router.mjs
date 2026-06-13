#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = new Date().toISOString().slice(0, 10);
const sweepPath = resolve(root, args.sweep || `data/kosmodata-lane-sweep-${dateStamp}.json`);
const outputJson = resolve(root, args.out || `data/kosmo-data-lane-command-router-${dateStamp}.json`);
const outputMd = resolve(root, args.markdown || `docs/codex/kosmo-data-lane-command-router-${dateStamp}.md`);

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const sweep = JSON.parse(await readFile(sweepPath, 'utf8'));
  const summary = sweep.summary || {};
  const sourceRootReady = summary.source_root_decision_session_private_diagnostic_allowed === true;
  const privateInventoryReady = summary.private_source_inventory_plan_allowed === true;
  const outputContractPassed = summary.private_inventory_output_check_failures === 0 &&
    summary.private_inventory_output_check_public_ready_hits === 0 &&
    summary.private_inventory_output_check_status === 'private_inventory_output_contract_passed';

  const router = {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    status: sourceRootReady && privateInventoryReady
      ? 'worker_router_private_diagnostic_ready'
      : 'worker_router_guarded_review_only',
    source_refs: [relative(root, sweepPath)],
    policy: {
      review_only_default: true,
      local_worker_public_writes_allowed: false,
      local_worker_git_allowed: false,
      private_diagnostic_allowed: sourceRootReady,
      private_inventory_allowed: privateInventoryReady,
      public_ready_allowed: false
    },
    summary: {
      data_lane_status: sweep.status,
      data_lane_steps: `${summary.passed_steps}/${summary.steps}`,
      source_root_decision_status: summary.source_root_decision_session_status,
      private_diagnostic_allowed: sourceRootReady,
      private_inventory_plan_status: summary.private_source_inventory_plan_status,
      private_inventory_allowed: privateInventoryReady,
      private_inventory_output_contract: summary.private_inventory_output_check_status,
      output_contract_passed: outputContractPassed,
      owner_open_items: summary.human_queue_open_items ?? null,
      asset_open_reviews: summary.asset_open_human_reviews ?? null
    },
    workers: [
      {
        worker_id: 'kosmo-local-llm',
        role: 'fliessarbeit_metadata_review_only',
        allowed_now: [
          'summarize existing repo reports in own words',
          'prepare gap maps from provided JSON/Markdown',
          'draft metadata-only private inventory rows using the output template after owner-approved source-root flow',
          'run no Git, cloud, public promotion or source-copy actions'
        ],
        forbidden_now: [
          'run private-library diagnostic before source-root decision passes',
          'copy private book/PDF/plan/image content into repo outputs',
          'set public_ready=true',
          'push to Git or write R2/D1/cloud state'
        ]
      },
      {
        worker_id: 'codex-central-overseer',
        role: 'architecture_reasoning_code_review_gate_owner',
        allowed_now: [
          'run review-only gates',
          'add validators, contracts and UI visibility',
          'review local-worker outputs',
          'prepare scoped commits and private Git pushes'
        ],
        forbidden_now: [
          'invent source-root selection',
          'promote public assets without separate owner/provenance review',
          'copy private source contents into Git'
        ]
      },
      {
        worker_id: 'claude-code-kosmooverseer',
        role: 'parallel_overseer_architecture_review',
        allowed_now: [
          'review Codex changes from handoff inbox',
          'challenge provenance, rights and worker-boundary assumptions',
          'record owner decisions when provided'
        ],
        forbidden_now: [
          'treat workflow mirrors as complete private library',
          'bypass source-root decision session',
          'approve public-ready from review-only reports'
        ]
      }
    ],
    allowed_commands_now: [
      'npm run kosmo:data-lane-sweep',
      'npm run kosmo:private-inventory-output-template',
      'npm run kosmo:private-inventory-output-check',
      'npm run kosmo:human-decision-owner-batches',
      'npm run kosmo:owner-decision-session-check',
      'npm run kosmo:owner-review-packet-check',
      'npm run kosmo:owner-review-session-brief',
      'npm run kosmo:owner-review-session-brief-check'
    ],
    blocked_commands_now: blockedCommands({ sourceRootReady, privateInventoryReady }),
    next_best_actions: nextBestActions({ sourceRootReady, privateInventoryReady, outputContractPassed, summary })
  };

  await mkdir(dirname(outputJson), { recursive: true });
  await mkdir(dirname(outputMd), { recursive: true });
  await writeFile(outputJson, `${JSON.stringify(router, null, 2)}\n`);
  await writeFile(outputMd, renderMarkdown(router));

  console.log('Kosmo data-lane command router');
  console.log(`Status: ${router.status}`);
  console.log(`Data lane: ${router.summary.data_lane_steps}`);
  console.log(`Private diagnostic allowed: ${router.summary.private_diagnostic_allowed}`);
  console.log(`Private inventory allowed: ${router.summary.private_inventory_allowed}`);
  console.log(`Wrote: ${relative(root, outputMd)}`);
}

function blockedCommands({ sourceRootReady, privateInventoryReady }) {
  const blocked = [];
  if (!sourceRootReady) {
    blocked.push({
      command: 'npm run kosmo:private-library-diagnostic -- --roots "<selected-root>"',
      reason: 'Source-root decision session has not passed with private_diagnostic_allowed=true.'
    });
  }
  if (!privateInventoryReady) {
    blocked.push({
      command: 'private inventory extraction or source-dependent asset authoring',
      reason: 'Private source inventory plan is still blocked.'
    });
  }
  blocked.push({
    command: 'public promotion / public_ready=true / R2-D1 public writes',
    reason: 'Separate owner, provenance and rights reviews are still required.'
  });
  return blocked;
}

function nextBestActions({ sourceRootReady, privateInventoryReady, outputContractPassed, summary }) {
  const actions = [];
  if (!sourceRootReady) actions.push('Owner/Claude/KosmoOverseer records a source-root decision session with a real visible source root.');
  if (sourceRootReady && !privateInventoryReady) actions.push('Run private-library diagnostic and refresh the private source inventory plan.');
  if (!outputContractPassed) actions.push('Fix the private inventory output template/check before any worker handoff.');
  if ((summary.human_queue_open_items ?? 0) > 0) actions.push(`Resolve ${summary.human_queue_open_items} owner decision queue items in batches.`);
  if ((summary.asset_open_human_reviews ?? 0) > 0) actions.push(`Resolve ${summary.asset_open_human_reviews} KosmoAsset human reviews before promotion.`);
  actions.push('Keep all three pilots review-only until source, provenance and rights gates pass.');
  return actions;
}

function renderMarkdown(router) {
  const lines = [];
  lines.push('# Kosmo Data-Lane Command Router');
  lines.push('');
  lines.push(`Generated: ${router.generated_at}`);
  lines.push(`Status: \`${router.status}\``);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Data lane: ${router.summary.data_lane_steps} (${router.summary.data_lane_status})`);
  lines.push(`- Source-root decision: ${router.summary.source_root_decision_status}`);
  lines.push(`- Private diagnostic allowed: ${router.summary.private_diagnostic_allowed ? 'yes' : 'no'}`);
  lines.push(`- Private inventory plan: ${router.summary.private_inventory_plan_status}`);
  lines.push(`- Private inventory allowed: ${router.summary.private_inventory_allowed ? 'yes' : 'no'}`);
  lines.push(`- Private inventory output contract: ${router.summary.private_inventory_output_contract}`);
  lines.push(`- Owner open items: ${router.summary.owner_open_items}`);
  lines.push(`- Asset open reviews: ${router.summary.asset_open_reviews}`);
  lines.push('');
  lines.push('## Workers');
  lines.push('');
  for (const worker of router.workers) {
    lines.push(`### ${worker.worker_id}`);
    lines.push('');
    lines.push(`Role: \`${worker.role}\``);
    lines.push('');
    lines.push('Allowed now:');
    worker.allowed_now.forEach((item) => lines.push(`- ${item}`));
    lines.push('');
    lines.push('Forbidden now:');
    worker.forbidden_now.forEach((item) => lines.push(`- ${item}`));
    lines.push('');
  }
  lines.push('## Allowed Commands Now');
  lines.push('');
  router.allowed_commands_now.forEach((command) => lines.push(`- \`${command}\``));
  lines.push('');
  lines.push('## Blocked Commands Now');
  lines.push('');
  router.blocked_commands_now.forEach((item) => lines.push(`- \`${item.command}\`: ${item.reason}`));
  lines.push('');
  lines.push('## Next Best Actions');
  lines.push('');
  router.next_best_actions.forEach((action) => lines.push(`- ${action}`));
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
