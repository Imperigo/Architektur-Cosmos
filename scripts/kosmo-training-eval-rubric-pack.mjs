#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = new Date().toISOString().slice(0, 10);

const trainingReadinessPath = resolve(root, args.trainingReadiness || `data/kosmo-training-memory-readiness-pack-${dateStamp}.json`);
const pilotQueuePath = resolve(root, args.pilotQueue || `data/kosmo-local-worker-pilot-task-queue-${dateStamp}.json`);
const roadmapPath = resolve(root, args.roadmap || `data/kosmo-vision-completion-roadmap-${dateStamp}.json`);
const outputJson = resolve(root, args.out || `data/kosmo-training-eval-rubric-pack-${dateStamp}.json`);
const outputMd = resolve(root, args.markdown || `docs/codex/kosmo-training-eval-rubric-pack-${dateStamp}.md`);

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const trainingReadiness = await readJson(trainingReadinessPath);
  const pilotQueue = await readJson(pilotQueuePath);
  const roadmap = await readJson(roadmapPath);
  const report = buildReport({ trainingReadiness, pilotQueue, roadmap });

  await mkdir(dirname(outputJson), { recursive: true });
  await mkdir(dirname(outputMd), { recursive: true });
  await writeFile(outputJson, `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(outputMd, renderMarkdown(report));

  console.log('Kosmo training eval rubric pack');
  console.log(`Status: ${report.status}`);
  console.log(`Suites: ${report.summary.suites}`);
  console.log(`Criteria: ${report.summary.criteria}`);
  console.log(`Eval items planned: ${report.summary.eval_items_planned}`);
  console.log(`Writes training data now: ${report.summary.writes_training_data_now}`);
  console.log(`Public-ready after pack: ${report.summary.public_ready_after_pack}`);
  console.log(`Wrote: ${relative(root, outputMd)}`);
}

function buildReport({ trainingReadiness, pilotQueue, roadmap }) {
  const failures = [];
  if (trainingReadiness.status !== 'kosmo_training_memory_readiness_pack_ready') failures.push(`Training readiness not ready: ${trainingReadiness.status}`);
  if (pilotQueue.status !== 'local_worker_pilot_task_queue_ready_blocked') failures.push(`Pilot worker queue not ready blocked: ${pilotQueue.status}`);
  if (roadmap.status !== 'vision_completion_roadmap_ready') failures.push(`Roadmap not ready: ${roadmap.status}`);

  const suites = [
    suite('source_grounding_provenance', 'Can Kosmo cite source state, provenance and uncertainty without inventing facts?', [
      'uses_only_reviewed_source_fields',
      'separates_known_unknown_and_inferred',
      'flags_missing_rights_or_source_basis',
      'never_promotes_private_derived_content_public_ready'
    ]),
    suite('architectural_analysis_depth', 'Can Kosmo analyze typology, material, structure, space and construction as architectural arguments?', [
      'typology_is_specific_not_keyword_only',
      'material_and_construction_are_linked',
      'structure_space_and_circulation_are_related',
      'analysis_mentions_transferable_design_rule'
    ]),
    suite('asset_schema_quality', 'Can Kosmo turn reviewed reference signals into useful asset metadata without overclaiming?', [
      'asset_category_and_export_target_fit',
      'source_basis_and_rights_state_preserved',
      'geometry_material_texture_fields_are_separated',
      'public_release_state_stays_review_only'
    ]),
    suite('retrieval_answer_quality', 'Can Kosmo answer from retrieved reference chunks with controlled uncertainty?', [
      'answer_grounded_in_retrieved_context',
      'refuses_or_asks_when_context_missing',
      'compares_projects_without_false_equivalence',
      'keeps_private_context_out_of_public_answer'
    ]),
    suite('local_worker_output_review', 'Can overseers grade local worker output before repo conversion?', [
      'json_contract_validity',
      'semantic_fit_to_task',
      'risk_flags_for_private_or_public_release',
      'requires_codex_or_claude_review_before_write'
    ]),
    suite('kosmo_architecture_identity', 'Can Kosmo behave like a specialist architecture assistant rather than a generic chatbot?', [
      'uses_architectural_vocabulary_precisely',
      'connects_reference_to_design_operation',
      'distinguishes_fact_analysis_and_proposal',
      'maintains_rights_privacy_and_review_boundaries'
    ])
  ];

  const evalItemsPlanned = suites.length * 4;
  return {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    status: failures.length === 0
      ? 'training_eval_rubric_pack_ready'
      : 'training_eval_rubric_pack_needs_review',
    policy: {
      rubric_only: true,
      writes_training_data_now: false,
      writes_embeddings_now: false,
      runs_fine_tuning_now: false,
      reads_private_content_now: false,
      copies_worker_output_bodies: false,
      public_ready_after_pack: 0
    },
    source_refs: [
      relative(root, trainingReadinessPath),
      relative(root, pilotQueuePath),
      relative(root, roadmapPath)
    ],
    summary: {
      suites: suites.length,
      criteria: suites.reduce((sum, item) => sum + item.criteria.length, 0),
      eval_items_planned: evalItemsPlanned,
      training_lanes: trainingReadiness.summary?.lanes ?? null,
      candidate_sources: trainingReadiness.summary?.candidate_sources ?? null,
      pilot_worker_tasks: pilotQueue.summary?.tasks ?? null,
      writes_training_data_now: 0,
      writes_embeddings_now: 0,
      runs_fine_tuning_now: 0,
      public_ready_after_pack: 0,
      failures: failures.length
    },
    suites,
    scoring: {
      scale: '0-3',
      levels: [
        { score: 0, label: 'fail', description: 'Ungrounded, unsafe, missing required structure or violates rights/privacy boundary.' },
        { score: 1, label: 'weak', description: 'Partially structured but shallow, ambiguous or missing important evidence.' },
        { score: 2, label: 'pass', description: 'Grounded and useful with minor gaps or conservative uncertainty.' },
        { score: 3, label: 'excellent', description: 'Precise, evidence-aware, architecture-specific and review-ready.' }
      ],
      minimum_release_threshold: 2,
      automatic_public_release_allowed: false
    },
    next_actions_after_verified_data: [
      'Create public-safe example eval rows from reviewed pilot summaries.',
      'Keep RAG/eval before fine-tuning.',
      'Run local worker outputs through this rubric before repo conversion.',
      'Only create embeddings after provenance, rights and privacy gates pass.'
    ],
    hard_stops: [
      'Do not train or fine-tune now.',
      'Do not create embeddings now.',
      'Do not copy private source text or local worker output bodies into eval rows.',
      'Do not public-release any eval example derived from private content without review.'
    ],
    failures
  };
}

function suite(id, objective, criteria) {
  return {
    id,
    objective,
    criteria,
    public_ready_after_suite: 0
  };
}

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

function renderMarkdown(report) {
  const lines = [];
  lines.push('# Kosmo Training Eval Rubric Pack');
  lines.push('');
  lines.push(`Generated: ${report.generated_at}`);
  lines.push(`Status: \`${report.status}\``);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Suites: ${report.summary.suites}`);
  lines.push(`- Criteria: ${report.summary.criteria}`);
  lines.push(`- Eval items planned: ${report.summary.eval_items_planned}`);
  lines.push(`- Training lanes: ${report.summary.training_lanes}`);
  lines.push(`- Candidate sources: ${report.summary.candidate_sources}`);
  lines.push(`- Pilot worker tasks: ${report.summary.pilot_worker_tasks}`);
  lines.push(`- Writes training data now: ${report.summary.writes_training_data_now}`);
  lines.push(`- Writes embeddings now: ${report.summary.writes_embeddings_now}`);
  lines.push(`- Runs fine-tuning now: ${report.summary.runs_fine_tuning_now}`);
  lines.push(`- Public-ready after pack: ${report.summary.public_ready_after_pack}`);
  lines.push('');
  lines.push('## Suites');
  lines.push('');
  report.suites.forEach((suiteItem) => {
    lines.push(`### ${suiteItem.id}`);
    lines.push('');
    lines.push(`- Objective: ${suiteItem.objective}`);
    lines.push(`- Criteria: ${suiteItem.criteria.join(', ')}`);
    lines.push(`- Public-ready after suite: ${suiteItem.public_ready_after_suite}`);
    lines.push('');
  });
  lines.push('## Scoring');
  lines.push('');
  lines.push(`- Scale: ${report.scoring.scale}`);
  lines.push(`- Minimum release threshold: ${report.scoring.minimum_release_threshold}`);
  lines.push(`- Automatic public release allowed: ${report.scoring.automatic_public_release_allowed ? 'yes' : 'no'}`);
  lines.push('');
  lines.push('## Hard Stops');
  lines.push('');
  report.hard_stops.forEach((item) => lines.push(`- ${item}`));
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
