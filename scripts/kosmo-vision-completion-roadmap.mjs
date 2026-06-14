#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = new Date().toISOString().slice(0, 10);

const dayBatchPath = resolve(root, args.dayBatch || `data/kosmo-day-batch-loop-${dateStamp}.json`);
const ownerBriefPath = resolve(root, args.ownerBrief || `data/kosmo-owner-remaining-decision-brief-${dateStamp}.json`);
const queuePath = resolve(root, args.queue || `data/kosmo-source-independent-work-queue-${dateStamp}.json`);
const pilotGapPath = resolve(root, args.pilotGapLabels || `data/kosmoreferences-pilot-gap-label-review-${dateStamp}.json`);
const assetTaxonomyPath = resolve(root, args.assetTaxonomy || `data/kosmoasset-candidate-taxonomy-review-${dateStamp}.json`);
const ownerUnlockCheckpointPath = resolve(root, args.ownerUnlockCheckpoint || `data/kosmo-owner-unlock-pipeline-checkpoint-${dateStamp}.json`);
const outputJson = resolve(root, args.out || `data/kosmo-vision-completion-roadmap-${dateStamp}.json`);
const outputMd = resolve(root, args.markdown || `docs/codex/kosmo-vision-completion-roadmap-${dateStamp}.md`);

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const dayBatch = await readJson(dayBatchPath);
  const ownerBrief = await readJson(ownerBriefPath);
  const queue = await readJson(queuePath);
  const pilotGapLabels = await readJson(pilotGapPath);
  const assetTaxonomy = await readJson(assetTaxonomyPath);
  const ownerUnlockCheckpoint = await readJson(ownerUnlockCheckpointPath);
  const report = buildReport({ dayBatch, ownerBrief, queue, pilotGapLabels, assetTaxonomy, ownerUnlockCheckpoint });

  await mkdir(dirname(outputJson), { recursive: true });
  await mkdir(dirname(outputMd), { recursive: true });
  await writeFile(outputJson, `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(outputMd, renderMarkdown(report));

  console.log('Kosmo vision completion roadmap');
  console.log(`Status: ${report.status}`);
  console.log(`Phases: ${report.summary.phases}`);
  console.log(`Immediate owner gates: ${report.summary.immediate_owner_gates}`);
  console.log(`Codex-ready tonight: ${report.summary.codex_ready_tonight}`);
  console.log(`Failures: ${report.summary.failures}`);
  console.log(`Wrote: ${relative(root, outputMd)}`);

  if (report.failures.length > 0) process.exitCode = 1;
}

function buildReport({ dayBatch, ownerBrief, queue, pilotGapLabels, assetTaxonomy, ownerUnlockCheckpoint }) {
  const failures = [];
  if (dayBatch.status !== 'day_batch_loop_passed_review_only') failures.push(`Day batch not passed: ${dayBatch.status}`);
  if (ownerBrief.status !== 'owner_remaining_decision_brief_ready') failures.push(`Owner brief not ready: ${ownerBrief.status}`);
  if (queue.status !== 'source_independent_work_queue_ready') failures.push(`Source-free queue not ready: ${queue.status}`);
  if (ownerUnlockCheckpoint.status !== 'owner_unlock_pipeline_checkpoint_ready') failures.push(`Owner unlock checkpoint not ready: ${ownerUnlockCheckpoint.status}`);
  if ((queue.summary?.codex_executable_now ?? 1) !== 0) failures.push('Source-free queue still has Codex-executable tasks.');

  const phases = [
    phase({
      id: 'phase_1_owner_unlock',
      title: 'Owner/Overseer Unlock',
      objective: 'Capture the explicit owner source-root/review-batch answer through dry-run, map review and guards without weakening privacy rules.',
      status: 'dry_run_pipeline_ready_blocked_by_owner_reply',
      gates: ['owner_unlock_answer_dry_run', 'intake_map_review', 'source_root_choice', 'owner_open_review_batches'],
      deliverables: [
        'Validated owner reply dry-run',
        'Reviewed intake patch',
        'Recorded owner answer intake',
        'Activation preflight rerun'
      ],
      codex_now: [
        `Use checkpoint ${ownerUnlockCheckpoint.summary?.components_ready ?? 0}/${ownerUnlockCheckpoint.summary?.components ?? 0} components and ${ownerUnlockCheckpoint.summary?.guard_checks_passed ?? 0}/${ownerUnlockCheckpoint.summary?.guard_checks ?? 0} guards`,
        'Run npm run kosmo:owner-unlock-answer-dry-run -- --answer "<owner_reply>" before any intake edit',
        'Keep source-root private diagnostics blocked until reviewed intake and source-root guards pass'
      ]
    }),
    phase({
      id: 'phase_2_private_metadata_inventory',
      title: 'Private Metadata Inventory',
      objective: 'After owner unlock, scan metadata only for pilot-relevant private sources.',
      status: 'blocked_until_source_root_activation',
      gates: ['source_root_activation_preflight', 'private_metadata_inventory_check'],
      deliverables: [
        'Pilot-scoped metadata inventory',
        'No OCR/text extraction yet',
        'No private files in Git'
      ],
      codex_now: [
        'Keep output contract strict',
        'Prepare review templates for Villa/Sogn/Ingenbohl'
      ]
    }),
    phase({
      id: 'phase_3_pilot_reference_packages',
      title: 'Pilot Reference Packages',
      objective: 'Turn Villa Savoye, Sogn Benedetg and Ingenbohl into complete review-only KosmoReferences packages.',
      status: 'partially_ready_review_only',
      gates: ['7 pilot owner decisions', 'file rights/provenance', 'source evidence'],
      deliverables: [
        'Project metadata',
        'Plan/image/PDF slots with rights state',
        'Typology/material/structure/space/construction analysis',
        'Export status private/review-only/public-ready false'
      ],
      codex_now: [
        `Use ${pilotGapLabels.summary?.gap_labels ?? 12} gap labels as worklist`,
        'Prioritize Villa file provenance, Sogn source evidence, Ingenbohl PDF decision'
      ]
    }),
    phase({
      id: 'phase_4_kosmoasset_bridge',
      title: 'KosmoAsset Bridge',
      objective: 'Convert validated reference signals into 2D/3D/material asset candidates without public release.',
      status: 'review_only_ready',
      gates: ['3 asset owner confirmations', 'rights review', 'manual metadata review'],
      deliverables: [
        'Material/texture candidate lanes',
        'Project asset scope review',
        'Asset provenance contracts',
        'No automatic public release'
      ],
      codex_now: [
        `Use ${assetTaxonomy.summary?.candidate_reviews ?? 10} asset taxonomy reviews`,
        'Keep repo conversion at 0 until manual approval'
      ]
    }),
    phase({
      id: 'phase_5_local_worker_fleet',
      title: 'Local Worker Fleet',
      objective: 'Use local LLMs for cheap fleissarbeit while Codex/Claude supervise quality and architecture.',
      status: 'contracts_ready_no_execution_now',
      gates: ['manual metadata review', 'safe task execution request', 'output guard'],
      deliverables: [
        'Runnable local worker command map',
        'Output contracts',
        'Review-only worker packets',
        'No blind commit of local output'
      ],
      codex_now: [
        'Convert worker outputs only through guarded metadata review',
        'Keep smart models as overseer/reviewer'
      ]
    }),
    phase({
      id: 'phase_6_kosmo_training_memory',
      title: 'Kosmo Training Memory',
      objective: 'Transform verified references/assets into future RAG, eval and fine-tuning material for Kosmo KI.',
      status: 'future_after_verified_data',
      gates: ['verified provenance', 'rights classification', 'quality evals'],
      deliverables: [
        'Architecture-specific schema',
        'RAG corpus',
        'Evaluation set',
        'Fine-tuning candidate set'
      ],
      codex_now: [
        'Do not train on unverified private content',
        'Prepare schemas and eval rubrics first'
      ]
    })
  ];

  return {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    status: failures.length === 0
      ? 'vision_completion_roadmap_ready'
      : 'vision_completion_roadmap_needs_review',
    policy: {
      review_only: true,
      strategic_plan_only: true,
      reads_private_content: false,
      records_owner_decisions: false,
      runs_private_inventory_now: false,
      public_ready_after_roadmap: 0
    },
    source_refs: [
      relative(root, dayBatchPath),
      relative(root, ownerBriefPath),
      relative(root, queuePath),
      relative(root, pilotGapPath),
      relative(root, assetTaxonomyPath),
      relative(root, ownerUnlockCheckpointPath)
    ],
    summary: {
      phases: phases.length,
      immediate_owner_gates: ownerBrief.summary?.open_owner_actions ?? 2,
      owner_unlock_components_ready: ownerUnlockCheckpoint.summary?.components_ready ?? null,
      owner_unlock_components: ownerUnlockCheckpoint.summary?.components ?? null,
      owner_unlock_guard_checks_passed: ownerUnlockCheckpoint.summary?.guard_checks_passed ?? null,
      owner_unlock_guard_checks: ownerUnlockCheckpoint.summary?.guard_checks ?? null,
      owner_unlock_latest_handoff_max: ownerUnlockCheckpoint.summary?.latest_handoff_max ?? null,
      source_free_codex_tasks_remaining: queue.summary?.codex_executable_now ?? null,
      codex_ready_tonight: 2,
      pilot_gap_owner_decisions: pilotGapLabels.summary?.owner_decisions_required ?? null,
      asset_owner_confirmations: assetTaxonomy.summary?.owner_confirmations_required ?? null,
      public_ready_after_roadmap: 0,
      failures: failures.length
    },
    phases,
    tonight_batch: [
      'Publish this roadmap artifact and guard status.',
      'Use Owner Unlock Answer Dry Run as the next machine entry point after owner reply.',
      'Keep Owner Unlock Prompt as the single next human decision surface.',
      'Do not run private inventory, local worker execution or public promotion until owner gates pass.'
    ],
    failures
  };
}

function phase({ id, title, objective, status, gates, deliverables, codex_now }) {
  return {
    id,
    title,
    objective,
    status,
    gates,
    deliverables,
    codex_now,
    public_ready_after_phase: 0
  };
}

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

function renderMarkdown(report) {
  const lines = [];
  lines.push('# Kosmo Vision Completion Roadmap');
  lines.push('');
  lines.push(`Generated: ${report.generated_at}`);
  lines.push(`Status: \`${report.status}\``);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Phases: ${report.summary.phases}`);
  lines.push(`- Immediate owner gates: ${report.summary.immediate_owner_gates}`);
  lines.push(`- Owner unlock checkpoint: ${report.summary.owner_unlock_components_ready}/${report.summary.owner_unlock_components} components, ${report.summary.owner_unlock_guard_checks_passed}/${report.summary.owner_unlock_guard_checks} guards`);
  lines.push(`- Owner unlock latest handoff: ${report.summary.owner_unlock_latest_handoff_max}`);
  lines.push(`- Source-free Codex tasks remaining: ${report.summary.source_free_codex_tasks_remaining}`);
  lines.push(`- Codex-ready tonight: ${report.summary.codex_ready_tonight}`);
  lines.push(`- Pilot-gap owner decisions: ${report.summary.pilot_gap_owner_decisions}`);
  lines.push(`- Asset owner confirmations: ${report.summary.asset_owner_confirmations}`);
  lines.push(`- Public-ready after roadmap: ${report.summary.public_ready_after_roadmap}`);
  lines.push('');
  lines.push('## Phases');
  lines.push('');
  report.phases.forEach((phaseItem) => {
    lines.push(`### ${phaseItem.title}`);
    lines.push('');
    lines.push(`- Status: ${phaseItem.status}`);
    lines.push(`- Objective: ${phaseItem.objective}`);
    lines.push(`- Gates: ${phaseItem.gates.join(', ')}`);
    lines.push(`- Deliverables: ${phaseItem.deliverables.join('; ')}`);
    lines.push(`- Codex now: ${phaseItem.codex_now.join('; ')}`);
    lines.push('');
  });
  lines.push('## Tonight Batch');
  lines.push('');
  report.tonight_batch.forEach((item) => lines.push(`- ${item}`));
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
