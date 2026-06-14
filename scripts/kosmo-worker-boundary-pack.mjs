#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = new Date().toISOString().slice(0, 10);

const refs = {
  sweep: resolve(root, args.sweep || `data/kosmodata-lane-sweep-${dateStamp}.json`),
  router: resolve(root, args.router || `data/kosmo-data-lane-command-router-${dateStamp}.json`),
  blockerRefresh: resolve(root, args.blockerRefresh || `data/kosmo-source-root-blocker-refresh-${dateStamp}.json`),
  sourceRootActivation: resolve(root, args.sourceRootActivation || `data/kosmo-source-root-activation-preflight-${dateStamp}.json`)
};

const outputJson = resolve(root, args.out || `data/kosmo-worker-boundary-pack-${dateStamp}.json`);
const outputMd = resolve(root, args.markdown || `docs/codex/kosmo-worker-boundary-pack-${dateStamp}.md`);

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const sweep = await readJson(refs.sweep);
  const router = await readJson(refs.router);
  const blockerRefresh = await readJson(refs.blockerRefresh);
  const sourceRootActivation = await readOptionalJson(refs.sourceRootActivation);
  const sweepSummary = sweep.summary || {};
  const blockerSummary = blockerRefresh.summary || {};
  const activationSummary = sourceRootActivation?.summary || {};

  const sourceRootReady = router.summary?.private_diagnostic_allowed === true &&
    blockerSummary.private_diagnostic_allowed === true;
  const privateInventoryReady = router.summary?.private_inventory_allowed === true;
  const activationReady = sourceRootActivation?.status === 'source_root_activation_ready_for_private_metadata_diagnostic' &&
    activationSummary.activation_ready === true;

  const report = {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    status: sourceRootReady && privateInventoryReady
      ? 'worker_boundary_pack_private_diagnostic_ready'
      : 'worker_boundary_pack_review_only_locked',
    policy: {
      metadata_only: true,
      reads_private_content: false,
      copies_private_content: false,
      public_writes_allowed: false,
      public_ready_allowed: false,
      local_worker_git_allowed: false,
      note: 'This pack is a single worker-facing boundary map. It does not change source-root decisions, unlock private diagnostics, promote assets or write public state.'
    },
    source_refs: Object.values(refs).map((path) => relative(root, path)),
    hard_state: {
      data_lane: `${sweepSummary.passed_steps}/${sweepSummary.steps}`,
      data_lane_status: sweep.status,
      source_root_blocker_status: blockerRefresh.status,
      source_root_activation_status: sourceRootActivation?.status || null,
      source_root_activation_ready: activationReady,
      source_root_activation_safe_commands: activationSummary.safe_command_count ?? null,
      source_root_activation_blocked_commands: activationSummary.blocked_command_count ?? null,
      source_root_candidates: blockerSummary.source_root_candidates ?? null,
      source_root_probable_libraries: blockerSummary.source_root_probable_libraries ?? null,
      source_root_workflow_mirrors: blockerSummary.source_root_workflow_mirrors ?? null,
      onedrive_marker_leaf_missing: [
        blockerSummary.onedrive_marker_files ?? null,
        blockerSummary.onedrive_leaf_marker_files ?? null,
        blockerSummary.onedrive_aggregate_missing_items ?? null
      ],
      selected_root_exists: blockerSummary.selected_root_exists === true,
      private_diagnostic_allowed: sourceRootReady,
      private_inventory_allowed: privateInventoryReady,
      owner_open_items: sweepSummary.human_queue_open_items ?? null,
      asset_open_human_reviews: sweepSummary.asset_open_human_reviews ?? null,
      public_ready_total: 0
    },
    worker_boundaries: [
      {
        worker_id: 'kosmo-local-llm',
        command_scope: 'metadata_review_only',
        allowed_tasks: [
          'summarize existing JSON/Markdown reports',
          'draft gap maps and checklists from repo-visible metadata',
          'prepare local-only private inventory row shapes from templates',
          'run pilot-scoped metadata inventory only after source-root activation is ready',
          'propose source-search keywords without reading private files'
        ],
        blocked_tasks: [
          'read or OCR private books, PDFs, plans, lectures or images',
          'copy private excerpts into Git',
          'write public-ready flags',
          'run Git, cloud, deploy or external upload commands'
        ]
      },
      {
        worker_id: 'codex-central-overseer',
        command_scope: 'review_gate_code_ui_private_push',
        allowed_tasks: [
          'add validators and status reports',
          'run review-only sweeps',
          'review local worker outputs for high-risk terms',
          'push scoped private commits with explicit staged files'
        ],
        blocked_tasks: [
          'select a source root from weak path signals',
          'promote public assets from review-only status',
          'treat previous chat signals as current owner decisions'
        ]
      },
      {
        worker_id: 'claude-code-kosmooverseer',
        command_scope: 'parallel_review_owner_decision_recording',
        allowed_tasks: [
          'review Codex handoffs',
          'challenge provenance, source-root and rights assumptions',
          'record explicit owner decisions in the approved session files',
          'request rerun of diagnostics after storage changes'
        ],
        blocked_tasks: [
          'bypass source-root decision session',
          'use workflow mirrors as the large private library',
          'start private extraction while blocker refresh is active'
        ]
      }
    ],
    allowed_commands_now: unique([
      ...(router.allowed_commands_now || []),
      'npm run kosmo:storage-mount-snapshot',
      'npm run kosmo:source-root-activation-preflight',
      'npm run kosmo:private-metadata-inventory',
      'npm run kosmo:worker-boundary-pack'
    ]),
    blocked_commands_now: router.blocked_commands_now || [],
    escalation_triggers: [
      'real private library root is mounted or selected',
      'OneDrive sync markers are repaired',
      'source-root decision check reports private_diagnostic_allowed=true',
      'source-root activation preflight reports metadata diagnostic ready',
      'private metadata inventory runner writes contract-safe private output',
      'owner provides explicit current answers for owner review packet'
    ],
    next_best_actions: [
      'Keep worker activity metadata-only until source-root blocker clears.',
      'Use this pack as the first local-LLM/Claude instruction boundary before any KosmoReferences task.',
      'After a storage change, rerun source-root diagnostics, blocker refresh, command router and this pack.',
      'After any source-root decision change, rerun activation preflight before assigning private metadata work.',
      'Keep Villa Savoye, Sogn Benedetg and Ingenbohl pilots review-only until separate provenance and rights gates pass.'
    ]
  };

  await mkdir(dirname(outputJson), { recursive: true });
  await mkdir(dirname(outputMd), { recursive: true });
  await writeFile(outputJson, `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(outputMd, renderMarkdown(report));

  console.log('Kosmo worker boundary pack');
  console.log(`Status: ${report.status}`);
  console.log(`Data lane: ${report.hard_state.data_lane}`);
  console.log(`Private diagnostic allowed: ${report.hard_state.private_diagnostic_allowed}`);
  console.log(`Public-ready total: ${report.hard_state.public_ready_total}`);
  console.log(`Wrote: ${relative(root, outputMd)}`);
}

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

async function readOptionalJson(path) {
  try {
    return JSON.parse(await readFile(path, 'utf8'));
  } catch {
    return null;
  }
}

function unique(items) {
  return [...new Set(items)];
}

function renderMarkdown(report) {
  const lines = [];
  lines.push('# Kosmo Worker Boundary Pack');
  lines.push('');
  lines.push(`Generated: ${report.generated_at}`);
  lines.push(`Status: \`${report.status}\``);
  lines.push('');
  lines.push('## Hard State');
  lines.push('');
  lines.push(`- Data lane: ${report.hard_state.data_lane} (${report.hard_state.data_lane_status})`);
  lines.push(`- Source-root blocker: ${report.hard_state.source_root_blocker_status}`);
  lines.push(`- Source-root activation: ${report.hard_state.source_root_activation_status}`);
  lines.push(`- Source-root activation ready: ${report.hard_state.source_root_activation_ready ? 'yes' : 'no'}`);
  lines.push(`- Source-root activation safe/blocked commands: ${report.hard_state.source_root_activation_safe_commands}/${report.hard_state.source_root_activation_blocked_commands}`);
  lines.push(`- Source-root candidates/probable/mirrors: ${report.hard_state.source_root_candidates}/${report.hard_state.source_root_probable_libraries}/${report.hard_state.source_root_workflow_mirrors}`);
  lines.push(`- OneDrive marker/leaf/missing: ${report.hard_state.onedrive_marker_leaf_missing.join('/')}`);
  lines.push(`- Selected root exists: ${report.hard_state.selected_root_exists ? 'yes' : 'no'}`);
  lines.push(`- Private diagnostic allowed: ${report.hard_state.private_diagnostic_allowed ? 'yes' : 'no'}`);
  lines.push(`- Private inventory allowed: ${report.hard_state.private_inventory_allowed ? 'yes' : 'no'}`);
  lines.push(`- Owner open items: ${report.hard_state.owner_open_items}`);
  lines.push(`- Asset open human reviews: ${report.hard_state.asset_open_human_reviews}`);
  lines.push(`- Public-ready total: ${report.hard_state.public_ready_total}`);
  lines.push('');
  lines.push('## Worker Boundaries');
  lines.push('');
  for (const worker of report.worker_boundaries) {
    lines.push(`### ${worker.worker_id}`);
    lines.push('');
    lines.push(`Scope: \`${worker.command_scope}\``);
    lines.push('');
    lines.push('Allowed tasks:');
    worker.allowed_tasks.forEach((task) => lines.push(`- ${task}`));
    lines.push('');
    lines.push('Blocked tasks:');
    worker.blocked_tasks.forEach((task) => lines.push(`- ${task}`));
    lines.push('');
  }
  lines.push('## Allowed Commands Now');
  lines.push('');
  report.allowed_commands_now.forEach((command) => lines.push(`- \`${command}\``));
  lines.push('');
  lines.push('## Blocked Commands Now');
  lines.push('');
  report.blocked_commands_now.forEach((item) => lines.push(`- \`${item.command}\`: ${item.reason}`));
  lines.push('');
  lines.push('## Escalation Triggers');
  lines.push('');
  report.escalation_triggers.forEach((item) => lines.push(`- ${item}`));
  lines.push('');
  lines.push('## Next Best Actions');
  lines.push('');
  report.next_best_actions.forEach((item) => lines.push(`- ${item}`));
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
