#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = new Date().toISOString().slice(0, 10);

const roadmapPath = resolve(root, args.roadmap || `data/kosmo-vision-completion-roadmap-${dateStamp}.json`);
const pilotIntakePath = resolve(root, args.pilotIntake || `data/kosmoreferences-pilot-intake-readiness-pack-${dateStamp}.json`);
const assetIntakePath = resolve(root, args.assetIntake || `data/kosmoasset-intake-readiness-pack-${dateStamp}.json`);
const workerContractPath = resolve(root, args.workerContract || `data/kosmo-local-worker-output-contract-review-${dateStamp}.json`);
const outputJson = resolve(root, args.out || `data/kosmo-training-memory-readiness-pack-${dateStamp}.json`);
const outputMd = resolve(root, args.markdown || `docs/codex/kosmo-training-memory-readiness-pack-${dateStamp}.md`);

const laneDefinitions = [
  lane('rag_corpus', 'Verified reference and asset summaries for retrieval; no raw private source text.', ['verified_provenance', 'rights_classification', 'chunk_schema_review']),
  lane('eval_set', 'Architecture QA and classification evals derived from reviewed metadata and public-safe summaries.', ['answer_key_review', 'source_evidence_review', 'quality_rubric']),
  lane('fine_tune_candidates', 'Future instruction examples from overseer-reviewed workflows only.', ['human_review', 'license_review', 'deduplication', 'quality_eval']),
  lane('embedding_manifest', 'Embedding-ready manifest rows after RAG corpus gates; no embeddings generated now.', ['rag_corpus_ready', 'embedding_model_selection', 'privacy_guard'])
];

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const roadmap = await readJson(roadmapPath);
  const pilotIntake = await readJson(pilotIntakePath);
  const assetIntake = await readJson(assetIntakePath);
  const workerContract = await readJson(workerContractPath);
  const report = buildReport({ roadmap, pilotIntake, assetIntake, workerContract });

  await mkdir(dirname(outputJson), { recursive: true });
  await mkdir(dirname(outputMd), { recursive: true });
  await writeFile(outputJson, `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(outputMd, renderMarkdown(report));

  console.log('Kosmo training memory readiness pack');
  console.log(`Status: ${report.status}`);
  console.log(`Lanes: ${report.summary.lanes}`);
  console.log(`Candidate sources: ${report.summary.candidate_sources}`);
  console.log(`Executable now: ${report.summary.executable_now}`);
  console.log(`Failures: ${report.summary.failures}`);
  console.log(`Public-ready after pack: ${report.summary.public_ready_after_pack}`);
  console.log(`Wrote: ${relative(root, outputMd)}`);

  if (report.failures.length > 0) process.exitCode = 1;
}

function buildReport({ roadmap, pilotIntake, assetIntake, workerContract }) {
  const failures = [];
  if (roadmap.status !== 'vision_completion_roadmap_ready') failures.push(`Roadmap not ready: ${roadmap.status}`);
  if (pilotIntake.status !== 'kosmoreferences_pilot_intake_readiness_pack_ready') failures.push(`Pilot intake not ready: ${pilotIntake.status}`);
  if (assetIntake.status !== 'kosmoasset_intake_readiness_pack_ready') failures.push(`Asset intake not ready: ${assetIntake.status}`);
  if (workerContract.status !== 'local_worker_output_contract_review_ready') failures.push(`Worker contract not ready: ${workerContract.status}`);

  const candidateSources = [
    ...candidateSourcesFromPilots(pilotIntake),
    ...candidateSourcesFromAssets(assetIntake),
    ...candidateSourcesFromWorkerContracts(workerContract)
  ];

  const lanes = laneDefinitions.map((definition) => ({
    ...definition,
    executable_now: false,
    writes_training_data_now: false,
    writes_embeddings_now: false,
    reads_private_content_now: false,
    public_ready_after_lane: 0,
    candidate_source_ids: candidateSources
      .filter((source) => source.allowed_future_lanes.includes(definition.id))
      .map((source) => source.id)
  }));

  return {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    status: failures.length === 0
      ? 'kosmo_training_memory_readiness_pack_ready'
      : 'kosmo_training_memory_readiness_pack_needs_review',
    policy: {
      readiness_only: true,
      writes_training_data_now: false,
      writes_embeddings_now: false,
      runs_fine_tuning_now: false,
      reads_private_content: false,
      copies_private_content: false,
      includes_raw_private_text: false,
      includes_worker_output_bodies: false,
      public_ready_after_pack: 0
    },
    source_refs: [
      relative(root, roadmapPath),
      relative(root, pilotIntakePath),
      relative(root, assetIntakePath),
      relative(root, workerContractPath)
    ],
    summary: {
      lanes: lanes.length,
      candidate_sources: candidateSources.length,
      pilot_sources: candidateSources.filter((source) => source.source_family === 'kosmoreferences_pilot').length,
      asset_sources: candidateSources.filter((source) => source.source_family === 'kosmoasset').length,
      worker_contract_sources: candidateSources.filter((source) => source.source_family === 'local_worker_contract').length,
      executable_now: lanes.filter((laneItem) => laneItem.executable_now).length,
      writes_training_data_now: lanes.filter((laneItem) => laneItem.writes_training_data_now).length,
      writes_embeddings_now: lanes.filter((laneItem) => laneItem.writes_embeddings_now).length,
      failures: failures.length,
      public_ready_after_pack: 0
    },
    lanes,
    candidate_sources: candidateSources,
    output_contract: {
      future_output_root: 'private/KosmoTrainingMemory',
      git_allowed_now: false,
      allowed_git_content_after_review: 'schemas, manifests without raw private text, eval rubrics, public-safe examples',
      disallowed_git_content: [
        'private PDF text',
        'OCR text',
        'private image/plan contents',
        'worker output bodies',
        'license-unknown asset files'
      ]
    },
    hard_stops: [
      'Do not train or fine-tune on unverified private content.',
      'Do not create embeddings from private source contents before source-root, rights and privacy guards pass.',
      'Do not copy worker output bodies into training data.',
      'Do not put private OCR/PDF text, scans, images, plans or assets into Git.',
      'Prepare schemas and eval rubrics first; data rows come only after provenance and rights review.',
      'Keep public-ready at 0.'
    ],
    next_actions: [
      'Draft schema rows only after pilot and asset intake guards pass with reviewed metadata.',
      'Use RAG before fine-tuning; keep eval rubrics mandatory for every training lane.',
      'Let local LLMs propose summaries only inside private output contracts, then overseer reviews.',
      'Use this pack as Phase 6 input once Phase 2-5 gates are actually passed.'
    ],
    failures
  };
}

function lane(id, description, requiredGates) {
  return {
    id,
    description,
    required_gates: requiredGates
  };
}

function candidateSourcesFromPilots(pilotIntake) {
  return (pilotIntake.pilots || []).map((pilot) => ({
    id: `pilot:${pilot.id}`,
    title: pilot.title,
    source_family: 'kosmoreferences_pilot',
    review_state: pilot.package_status,
    allowed_future_lanes: ['rag_corpus', 'eval_set', 'embedding_manifest'],
    blocked_until: ['source_root_unlock', 'provenance_review', 'rights_classification'],
    public_ready: false
  }));
}

function candidateSourcesFromAssets(assetIntake) {
  return [
    ...(assetIntake.pilot_asset_groups || []).map((group) => ({
      id: `asset-pilot:${group.id}`,
      title: group.title,
      source_family: 'kosmoasset',
      review_state: group.bridge_status,
      allowed_future_lanes: ['rag_corpus', 'eval_set', 'embedding_manifest'],
      blocked_until: ['human_asset_review', 'promotion_guard'],
      public_ready: false
    })),
    ...(assetIntake.library_candidate_groups || []).map((group) => ({
      id: `asset-library:${group.id}`,
      title: group.role_guess || group.id,
      source_family: 'kosmoasset',
      review_state: group.review_lane,
      allowed_future_lanes: ['rag_corpus', 'embedding_manifest'],
      blocked_until: ['owner_lane_confirmation', 'rights_and_license_review'],
      public_ready: false
    }))
  ];
}

function candidateSourcesFromWorkerContracts(workerContract) {
  return (workerContract.contracts || []).map((contract) => ({
    id: `worker-contract:${contract.task_id}`,
    title: contract.task_id,
    source_family: 'local_worker_contract',
    review_state: contract.contract_state,
    allowed_future_lanes: contract.repo_conversion_allowed_now ? ['fine_tune_candidates', 'eval_set'] : ['eval_set'],
    blocked_until: ['manual_metadata_review_without_body_copy'],
    public_ready: false
  }));
}

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

function renderMarkdown(report) {
  const lines = [];
  lines.push('# Kosmo Training Memory Readiness Pack');
  lines.push('');
  lines.push(`Generated: ${report.generated_at}`);
  lines.push(`Status: \`${report.status}\``);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Lanes: ${report.summary.lanes}`);
  lines.push(`- Candidate sources: ${report.summary.candidate_sources}`);
  lines.push(`- Pilot sources: ${report.summary.pilot_sources}`);
  lines.push(`- Asset sources: ${report.summary.asset_sources}`);
  lines.push(`- Worker contract sources: ${report.summary.worker_contract_sources}`);
  lines.push(`- Executable now: ${report.summary.executable_now}`);
  lines.push(`- Writes training data now: ${report.summary.writes_training_data_now}`);
  lines.push(`- Writes embeddings now: ${report.summary.writes_embeddings_now}`);
  lines.push(`- Public-ready after pack: ${report.summary.public_ready_after_pack}`);
  lines.push('');
  lines.push('## Lanes');
  lines.push('');
  report.lanes.forEach((laneItem) => {
    lines.push(`### ${laneItem.id}`);
    lines.push('');
    lines.push(`- Description: ${laneItem.description}`);
    lines.push(`- Required gates: ${laneItem.required_gates.join(', ')}`);
    lines.push(`- Candidate sources: ${laneItem.candidate_source_ids.length}`);
    lines.push(`- Executable now: ${laneItem.executable_now ? 'yes' : 'no'}`);
    lines.push(`- Public-ready after lane: ${laneItem.public_ready_after_lane}`);
    lines.push('');
  });
  lines.push('## Output Contract');
  lines.push('');
  lines.push(`- Future output root: ${report.output_contract.future_output_root}`);
  lines.push(`- Git allowed now: ${report.output_contract.git_allowed_now ? 'yes' : 'no'}`);
  lines.push(`- Allowed Git content after review: ${report.output_contract.allowed_git_content_after_review}`);
  lines.push(`- Disallowed Git content: ${report.output_contract.disallowed_git_content.join(', ')}`);
  lines.push('');
  lines.push('## Hard Stops');
  lines.push('');
  report.hard_stops.forEach((item) => lines.push(`- ${item}`));
  lines.push('');
  lines.push('## Next Actions');
  lines.push('');
  report.next_actions.forEach((item) => lines.push(`- ${item}`));
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
