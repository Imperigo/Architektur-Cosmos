#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = new Date().toISOString().slice(0, 10);

const sourceMapPath = resolve(root, args.sourceMap || `data/kosmoasset-source-candidate-map-${dateStamp}.json`);
const outputJson = resolve(root, args.out || `data/kosmoasset-candidate-taxonomy-review-${dateStamp}.json`);
const outputMd = resolve(root, args.markdown || `docs/codex/kosmoasset-candidate-taxonomy-review-${dateStamp}.md`);

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const sourceMap = await readJson(sourceMapPath);
  const report = buildReport(sourceMap);

  await mkdir(dirname(outputJson), { recursive: true });
  await mkdir(dirname(outputMd), { recursive: true });
  await writeFile(outputJson, `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(outputMd, renderMarkdown(report));

  console.log('KosmoAsset candidate taxonomy review');
  console.log(`Status: ${report.status}`);
  console.log(`Candidate reviews: ${report.summary.candidate_reviews}`);
  console.log(`Reviewable lanes: ${report.summary.reviewable_asset_lanes}`);
  console.log(`Owner confirmations: ${report.summary.owner_confirmations_required}`);
  console.log(`Failures: ${report.summary.failures}`);
  console.log(`Public-ready after review: ${report.summary.public_ready_after_review}`);
  console.log(`Wrote: ${relative(root, outputMd)}`);

  if (report.failures.length > 0) process.exitCode = 1;
}

function buildReport(sourceMap) {
  const failures = [];
  if (sourceMap.status !== 'kosmoasset_source_candidate_map_review_only_ready') {
    failures.push(`Source map not review-only ready: ${sourceMap.status}`);
  }

  const laneDefinitions = [
    lane('material_texture_library', 'Material and texture libraries; owner confirmation and rights review before metadata inventory.', 1),
    lane('project_asset_library', 'Project-level 2D/3D asset libraries; owner scope confirmation before metadata-only inventory.', 2),
    lane('not_asset_lane', 'Workflow mirrors, Codex context, missing roots or non-asset folders; keep blocked for KosmoAsset ingestion.', 3)
  ];

  const candidateReviews = (sourceMap.candidates || []).map((candidate) => reviewCandidate(candidate));
  const unsafe = candidateReviews.filter((candidate) => (
    candidate.asset_use_allowed_now ||
    candidate.public_ready_after_review !== 0 ||
    candidate.reads_private_content ||
    candidate.copies_private_content ||
    candidate.runs_private_inventory_now ||
    'path' in candidate
  ));
  if (unsafe.length > 0) failures.push(`Unsafe candidate reviews: ${unsafe.map((item) => item.id).join(', ')}`);

  const missingConfirmations = candidateReviews.filter((candidate) => !candidate.required_confirmation);
  if (missingConfirmations.length > 0) failures.push(`Missing required confirmations: ${missingConfirmations.map((item) => item.id).join(', ')}`);

  return {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    status: failures.length === 0
      ? 'kosmoasset_candidate_taxonomy_review_ready'
      : 'kosmoasset_candidate_taxonomy_review_needs_review',
    policy: {
      review_only: true,
      metadata_only: true,
      source_independent: true,
      includes_private_paths: false,
      reads_private_content: false,
      copies_private_content: false,
      ingests_assets: false,
      runs_private_inventory_now: false,
      executes_local_worker_now: false,
      public_ready_after_review: 0,
      note: 'This review refines candidate lanes from the existing source map without copying paths into candidate reviews or reading source contents.'
    },
    source_refs: [relative(root, sourceMapPath)],
    summary: {
      source_map_status: sourceMap.status,
      candidate_reviews: candidateReviews.length,
      reviewable_asset_lanes: candidateReviews.filter((candidate) => candidate.review_lane !== 'blocked_non_asset').length,
      material_texture_library: candidateReviews.filter((candidate) => candidate.review_lane === 'material_rights_review').length,
      project_asset_library: candidateReviews.filter((candidate) => candidate.review_lane === 'project_asset_scope_review').length,
      blocked_non_asset: candidateReviews.filter((candidate) => candidate.review_lane === 'blocked_non_asset').length,
      owner_confirmations_required: candidateReviews.filter((candidate) => candidate.owner_confirmation_required).length,
      private_inventory_candidates_after_owner: candidateReviews.filter((candidate) => candidate.private_metadata_inventory_after_owner).length,
      failures: failures.length,
      public_ready_after_review: 0
    },
    lane_definitions: laneDefinitions,
    candidate_reviews: candidateReviews,
    hard_stops: [
      'Do not copy candidate paths into downstream asset review tasks.',
      'Do not inspect private asset folders before owner confirmation.',
      'Do not run private metadata inventory from this review.',
      'Do not ingest, generate or publish assets.',
      'Keep public-ready at 0.'
    ],
    next_actions: [
      'Ask owner to confirm whether material_texture_library candidates belong in KosmoAsset.',
      'Ask owner to confirm the scope of project_asset_library candidates before any metadata-only inventory.',
      'Keep not_asset_lane candidates out of KosmoAsset ingestion.',
      'Use this taxonomy as the safe input contract for later local worker triage.'
    ],
    failures
  };
}

function lane(id, description, order) {
  return {
    id,
    order,
    description,
    source_root_required: false,
    owner_confirmation_required: id !== 'not_asset_lane',
    private_inventory_allowed_now: false,
    public_ready_after_lane: 0
  };
}

function reviewCandidate(candidate) {
  const reviewLane = reviewLaneFor(candidate.asset_lane);
  const ownerConfirmationRequired = reviewLane !== 'blocked_non_asset';
  return {
    id: candidate.id,
    original_asset_lane: candidate.asset_lane,
    review_lane: reviewLane,
    role_guess: candidate.role_guess || 'unknown_owner_confirmation_required',
    score: candidate.score,
    required_confirmation: candidate.required_confirmation,
    owner_confirmation_required: ownerConfirmationRequired,
    private_metadata_inventory_after_owner: ['material_rights_review', 'project_asset_scope_review'].includes(reviewLane),
    asset_use_allowed_now: false,
    reads_private_content: false,
    copies_private_content: false,
    runs_private_inventory_now: false,
    executes_local_worker_now: false,
    public_ready_after_review: 0,
    next_gate: nextGateFor(reviewLane),
    review_note: reviewNoteFor(reviewLane)
  };
}

function reviewLaneFor(assetLane) {
  if (assetLane === 'material_texture_library') return 'material_rights_review';
  if (assetLane === 'project_asset_library') return 'project_asset_scope_review';
  return 'blocked_non_asset';
}

function nextGateFor(reviewLane) {
  if (reviewLane === 'material_rights_review') return 'owner_material_source_confirmation_then_rights_review';
  if (reviewLane === 'project_asset_scope_review') return 'owner_asset_scope_confirmation_then_metadata_inventory_preflight';
  return 'keep_blocked_no_asset_action';
}

function reviewNoteFor(reviewLane) {
  if (reviewLane === 'material_rights_review') return 'Potential material/texture source; useful for KosmoAsset only after owner and rights gates.';
  if (reviewLane === 'project_asset_scope_review') return 'Potential project asset source; metadata inventory only after owner confirms scope.';
  return 'Not an asset lane for current KosmoAsset work.';
}

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

function renderMarkdown(report) {
  const lines = [];
  lines.push('# KosmoAsset Candidate Taxonomy Review');
  lines.push('');
  lines.push(`Generated: ${report.generated_at}`);
  lines.push(`Status: \`${report.status}\``);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Source map: ${report.summary.source_map_status}`);
  lines.push(`- Candidate reviews: ${report.summary.candidate_reviews}`);
  lines.push(`- Reviewable asset lanes: ${report.summary.reviewable_asset_lanes}`);
  lines.push(`- Material rights review: ${report.summary.material_texture_library}`);
  lines.push(`- Project asset scope review: ${report.summary.project_asset_library}`);
  lines.push(`- Blocked non-asset: ${report.summary.blocked_non_asset}`);
  lines.push(`- Owner confirmations required: ${report.summary.owner_confirmations_required}`);
  lines.push(`- Private inventory candidates after owner: ${report.summary.private_inventory_candidates_after_owner}`);
  lines.push(`- Failures: ${report.summary.failures}`);
  lines.push(`- Public-ready after review: ${report.summary.public_ready_after_review}`);
  lines.push('');
  lines.push('## Lane Definitions');
  lines.push('');
  lines.push('| Lane | Order | Owner confirmation | Private inventory now | Public-ready | Description |');
  lines.push('| --- | ---: | --- | --- | ---: | --- |');
  report.lane_definitions.forEach((item) => {
    lines.push(`| \`${item.id}\` | ${item.order} | ${item.owner_confirmation_required ? 'yes' : 'no'} | ${item.private_inventory_allowed_now ? 'yes' : 'no'} | ${item.public_ready_after_lane} | ${escapePipe(item.description)} |`);
  });
  lines.push('');
  lines.push('## Candidate Reviews');
  lines.push('');
  lines.push('| Candidate | Review lane | Owner confirmation | Inventory after owner | Next gate |');
  lines.push('| --- | --- | --- | --- | --- |');
  report.candidate_reviews.forEach((item) => {
    lines.push(`| \`${item.id}\` | ${item.review_lane} | ${item.owner_confirmation_required ? 'yes' : 'no'} | ${item.private_metadata_inventory_after_owner ? 'yes' : 'no'} | ${item.next_gate} |`);
  });
  lines.push('');
  lines.push('## Hard Stops');
  lines.push('');
  report.hard_stops.forEach((item) => lines.push(`- ${item}`));
  lines.push('');
  lines.push('## Next Actions');
  lines.push('');
  report.next_actions.forEach((item) => lines.push(`- ${item}`));
  lines.push('');
  lines.push('## Failures');
  lines.push('');
  if (report.failures.length > 0) report.failures.forEach((failure) => lines.push(`- ${failure}`));
  else lines.push('- None.');
  lines.push('');
  return lines.join('\n');
}

function escapePipe(value) {
  return String(value ?? '').replace(/\|/g, '\\|').replace(/\n/g, ' ');
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
