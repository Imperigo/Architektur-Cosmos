#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = new Date().toISOString().slice(0, 10);

const refs = {
  reviewQueue: resolve(root, args.reviewQueue || `data/kosmo-innovation-github-review-queue-${dateStamp}.json`),
  readmeScan: resolve(root, args.readmeScan || `data/kosmo-innovation-github-readme-signal-scan-${dateStamp}.json`),
  fixtureContractPlan: resolve(root, args.fixtureContractPlan || `data/kosmo-innovation-github-fixture-contract-plan-${dateStamp}.json`),
  trainingEvalReviewQueue: resolve(root, args.trainingEvalReviewQueue || `data/kosmo-training-eval-review-queue-plan-${dateStamp}.json`),
  ontologySeed: resolve(root, args.ontologySeed || `data/kosmo-architecture-ontology-seed-${dateStamp}.json`),
  morningRun: resolve(root, args.morningRun || `data/kosmo-codex-morning-routine-run-${dateStamp}.json`)
};

const outputJson = resolve(root, args.out || `data/kosmo-innovation-github-promotion-matrix-${dateStamp}.json`);
const outputMd = resolve(root, args.markdown || `docs/codex/kosmo-innovation-github-promotion-matrix-${dateStamp}.md`);

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const reports = {};
  for (const [key, path] of Object.entries(refs)) {
    reports[key] = await readJson(path);
  }

  const matrix = buildMatrix(reports);
  await mkdir(dirname(outputJson), { recursive: true });
  await mkdir(dirname(outputMd), { recursive: true });
  await writeFile(outputJson, `${JSON.stringify(matrix, null, 2)}\n`);
  await writeFile(outputMd, renderMarkdown(matrix));

  console.log('Kosmo innovation GitHub promotion matrix');
  console.log(`Status: ${matrix.status}`);
  console.log(`Promotable source-free: ${matrix.summary.promotable_source_free}`);
  console.log(`Held items: ${matrix.summary.held_items}`);
  console.log(`Executable now: ${matrix.summary.executable_now}`);
  console.log(`Wrote: ${relative(root, outputMd)}`);
}

function buildMatrix(reports) {
  const failures = [];
  if (reports.reviewQueue.status !== 'innovation_github_review_queue_ready') failures.push(`Review queue not ready: ${reports.reviewQueue.status}`);
  if (reports.readmeScan.status !== 'innovation_github_readme_signal_scan_ready') failures.push(`README scan not ready: ${reports.readmeScan.status}`);
  if (reports.fixtureContractPlan.status !== 'innovation_github_fixture_contract_plan_ready') failures.push(`Fixture contract plan not ready: ${reports.fixtureContractPlan.status}`);
  if (reports.trainingEvalReviewQueue.status !== 'training_eval_review_queue_plan_ready') failures.push(`Training eval review queue not ready: ${reports.trainingEvalReviewQueue.status}`);
  if (reports.ontologySeed.status !== 'architecture_ontology_seed_ready') failures.push(`Ontology seed not ready: ${reports.ontologySeed.status}`);
  if (reports.morningRun.status !== 'codex_morning_routine_run_ready') failures.push(`Morning routine run not ready: ${reports.morningRun.status}`);

  const sourceFreeMode = reports.morningRun.summary?.next_batch_mode === 'source_free_innovation_and_guarding' &&
    reports.morningRun.summary?.private_processing_allowed === false;
  if (!sourceFreeMode) failures.push('Morning routine is not in source-free innovation mode.');

  const contractPlans = reports.fixtureContractPlan.contract_plans || [];
  const scannedByRepo = new Map((reports.readmeScan.scanned_items || []).map((item) => [item.repo, item]));
  const queueByRepo = new Map((reports.reviewQueue.review_items || []).map((item) => [item.repo, item]));
  const promotionItems = contractPlans.map((plan, index) => promotionItem({ plan, index, scannedByRepo, queueByRepo, reports }));
  const plannedRepos = new Set(contractPlans.map((plan) => plan.source_repo));
  const heldItems = (reports.reviewQueue.review_items || [])
    .filter((item) => !plannedRepos.has(item.repo))
    .map((item) => heldItem(item, scannedByRepo.get(item.repo)));

  const allItems = [...promotionItems, ...heldItems];
  if (promotionItems.length === 0) failures.push('No promotable fixture contract plans found.');
  if (allItems.some((item) => item.public_ready_after_item !== 0)) failures.push('Every promotion item must keep public-ready at 0.');
  if (allItems.some((item) => item.execute_now !== false)) failures.push('No promotion item may execute now.');
  if (promotionItems.some((item) => item.source_free_promotable !== true)) failures.push('All contract-plan items must be source-free promotable.');

  return {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    status: failures.length === 0
      ? 'innovation_github_promotion_matrix_ready'
      : 'innovation_github_promotion_matrix_needs_review',
    policy: {
      matrix_only: true,
      source_free_only: true,
      clones_repositories_now: false,
      stores_raw_readme_content: false,
      copies_github_code: false,
      installs_dependencies_now: false,
      downloads_models_now: false,
      runs_discovered_code_now: false,
      reads_private_content: false,
      creates_training_rows_now: false,
      creates_embeddings_now: false,
      public_ready_after_matrix: 0
    },
    source_refs: Object.values(refs).map((path) => relative(root, path)),
    summary: {
      review_queue_items: reports.reviewQueue.summary?.review_items ?? null,
      scanned_items: reports.readmeScan.summary?.scanned_items ?? null,
      contract_plans: contractPlans.length,
      promotable_source_free: promotionItems.filter((item) => item.source_free_promotable).length,
      held_items: heldItems.length,
      target_lanes: countUnique(promotionItems.map((item) => item.target_lane)),
      training_lanes_linked: countUnique(promotionItems.map((item) => item.training_eval_lane)),
      ontology_entity_types: reports.ontologySeed.summary?.entity_types ?? null,
      ontology_relation_types: reports.ontologySeed.summary?.relation_types ?? null,
      next_batch_mode: reports.morningRun.summary?.next_batch_mode || null,
      executable_now: 0,
      public_ready_after_matrix: 0,
      failures: failures.length
    },
    promotion_items: promotionItems,
    held_items: heldItems,
    next_source_free_sequence: [
      'npm run kosmo:innovation-github-fixture-skeletons',
      'npm run kosmo:innovation-github-fixture-skeletons-check',
      'npm run kosmo:innovation-github-fixture-payloads',
      'npm run kosmo:innovation-github-fixture-payloads-check',
      'npm run kosmo:innovation-github-fixture-payload-smoke',
      'npm run kosmo:innovation-github-fixture-payload-smoke-check',
      'npm run kosmo:training-eval-review-queue-plan',
      'npm run kosmo:training-eval-review-queue-plan-check',
      'npm run kosmo:architecture-ontology-seed',
      'npm run kosmo:architecture-ontology-seed-check'
    ],
    hard_stops: [
      'Do not clone public GitHub repositories from this matrix.',
      'Do not copy GitHub source code, README prose, datasets, models or assets.',
      'Do not create private-derived training rows before Source Root, provenance and rights gates pass.',
      'Do not install dependencies or download models from this matrix.',
      'Do not mark any promotion item public-ready.'
    ],
    failures
  };
}

function promotionItem({ plan, index, scannedByRepo, queueByRepo, reports }) {
  const scanned = scannedByRepo.get(plan.source_repo) || {};
  const queued = queueByRepo.get(plan.source_repo) || {};
  const targetLane = plan.target_lane;
  return {
    id: `promotion-${String(index + 1).padStart(2, '0')}`,
    source_repo: plan.source_repo,
    source_url: plan.source_url,
    review_queue_id: queued.id || null,
    target_lane: targetLane,
    fixture_id: plan.fixture_id,
    fixture_root: plan.proposed_fixture_root,
    signal_score: plan.signal_score,
    readme_available: scanned.readme?.available === true,
    source_free_promotable: true,
    promotion_decision: promotionDecisionFor(targetLane),
    training_eval_lane: trainingLaneFor(targetLane),
    ontology_bindings: ontologyBindingsFor(targetLane, reports.ontologySeed),
    required_guards_before_worker_use: [
      'fixture_skeleton_guard',
      'fixture_payload_guard',
      'fixture_payload_smoke',
      'training_eval_review_queue_guard',
      'ontology_seed_guard',
      'overseer_review'
    ],
    execute_now: false,
    local_worker_allowed_now: false,
    private_content_allowed: false,
    public_ready_after_item: 0
  };
}

function heldItem(item, scanned) {
  return {
    id: item.id,
    source_repo: item.repo,
    source_url: item.url,
    target_lane: item.lane,
    signal_score: scanned?.signal_score ?? null,
    source_free_promotable: false,
    promotion_decision: 'hold_for_more_public_signal_or_owner_review',
    execute_now: false,
    local_worker_allowed_now: false,
    private_content_allowed: false,
    public_ready_after_item: 0
  };
}

function promotionDecisionFor(targetLane) {
  if (targetLane === 'kosmo_prepare') return 'promote_to_synthetic_document_fixture_contract';
  if (targetLane === 'kosmo_asset') return 'promote_to_synthetic_asset_retrieval_fixture_contract';
  if (targetLane === 'worker_integration') return 'promote_to_worker_boundary_fixture_contract';
  return 'promote_to_source_free_research_fixture_contract';
}

function trainingLaneFor(targetLane) {
  if (targetLane === 'kosmo_prepare') return 'source_extraction_review';
  if (targetLane === 'kosmo_asset') return 'asset_candidate_review';
  if (targetLane === 'worker_integration') return 'worker_output_review';
  return 'architecture_quality_review';
}

function ontologyBindingsFor(targetLane, ontologySeed) {
  const entityTypes = ontologySeed.entity_types || [];
  const relationTypes = ontologySeed.relation_types || [];
  if (targetLane === 'kosmo_prepare') {
    return {
      entities: takeKnown(entityTypes, ['source_record', 'reference_project', 'eval_review_item']),
      relations: takeKnown(relationTypes, ['project_has_source', 'eval_item_tests_project', 'source_blocks_public_release'])
    };
  }
  if (targetLane === 'kosmo_asset') {
    return {
      entities: takeKnown(entityTypes, ['asset_record', 'building_element', 'material_system']),
      relations: takeKnown(relationTypes, ['asset_derived_from_element', 'asset_uses_material', 'eval_item_tests_asset'])
    };
  }
  if (targetLane === 'worker_integration') {
    return {
      entities: takeKnown(entityTypes, ['eval_review_item', 'source_record', 'asset_record']),
      relations: takeKnown(relationTypes, ['eval_item_tests_project', 'eval_item_tests_asset', 'source_blocks_public_release'])
    };
  }
  return {
    entities: entityTypes.slice(0, 3).map((item) => item.id),
    relations: relationTypes.slice(0, 3).map((item) => item.id)
  };
}

function takeKnown(items, ids) {
  const known = new Set((items || []).map((item) => item.id));
  return ids.filter((id) => known.has(id));
}

function countUnique(values) {
  return new Set(values.filter(Boolean)).size;
}

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

function renderMarkdown(report) {
  const lines = [];
  lines.push('# Kosmo Innovation GitHub Promotion Matrix');
  lines.push('');
  lines.push(`Generated: ${report.generated_at}`);
  lines.push(`Status: \`${report.status}\``);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Review queue items: ${report.summary.review_queue_items}`);
  lines.push(`- Scanned items: ${report.summary.scanned_items}`);
  lines.push(`- Contract plans: ${report.summary.contract_plans}`);
  lines.push(`- Promotable source-free: ${report.summary.promotable_source_free}`);
  lines.push(`- Held items: ${report.summary.held_items}`);
  lines.push(`- Target lanes: ${report.summary.target_lanes}`);
  lines.push(`- Training lanes linked: ${report.summary.training_lanes_linked}`);
  lines.push(`- Next batch mode: ${report.summary.next_batch_mode}`);
  lines.push(`- Executable now: ${report.summary.executable_now}`);
  lines.push(`- Public-ready after matrix: ${report.summary.public_ready_after_matrix}`);
  lines.push('');
  lines.push('## Promotion Items');
  lines.push('');
  lines.push('| ID | Source | Lane | Fixture | Training Lane | Decision |');
  lines.push('| --- | --- | --- | --- | --- | --- |');
  report.promotion_items.forEach((item) => {
    lines.push(`| \`${item.id}\` | [${item.source_repo}](${item.source_url}) | ${item.target_lane} | \`${item.fixture_id}\` | ${item.training_eval_lane} | ${item.promotion_decision} |`);
  });
  lines.push('');
  lines.push('## Held Items');
  lines.push('');
  report.held_items.forEach((item) => {
    lines.push(`- [${item.source_repo}](${item.source_url}): ${item.promotion_decision}`);
  });
  lines.push('');
  lines.push('## Next Source-Free Sequence');
  lines.push('');
  report.next_source_free_sequence.forEach((command) => lines.push(`- \`${command}\``));
  lines.push('');
  lines.push('## Hard Stops');
  lines.push('');
  report.hard_stops.forEach((item) => lines.push(`- ${item}`));
  lines.push('');
  if (report.failures.length) {
    lines.push('## Failures');
    lines.push('');
    report.failures.forEach((item) => lines.push(`- ${item}`));
    lines.push('');
  }
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
