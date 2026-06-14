#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = new Date().toISOString().slice(0, 10);

const bridgePath = resolve(root, args.bridge || `data/kosmoasset-reference-bridge-check-${dateStamp}.json`);
const taxonomyPath = resolve(root, args.taxonomy || `data/kosmoasset-candidate-taxonomy-review-${dateStamp}.json`);
const pilotIntakePath = resolve(root, args.pilotIntake || `data/kosmoreferences-pilot-intake-readiness-pack-${dateStamp}.json`);
const outputJson = resolve(root, args.out || `data/kosmoasset-intake-readiness-pack-${dateStamp}.json`);
const outputMd = resolve(root, args.markdown || `docs/codex/kosmoasset-intake-readiness-pack-${dateStamp}.md`);

const pilotAssetStages = [
  'source_basis_review',
  'rights_and_human_review',
  'asset_schema_normalization',
  'export_profile_planning',
  'local_worker_task_packet',
  'promotion_guard'
];

const libraryStages = [
  'owner_lane_confirmation',
  'metadata_inventory_preflight',
  'rights_and_license_review',
  'asset_taxonomy_mapping',
  'local_worker_packet_after_contract',
  'promotion_guard'
];

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const bridge = await readJson(bridgePath);
  const taxonomy = await readJson(taxonomyPath);
  const pilotIntake = await readJson(pilotIntakePath);
  const report = buildReport({ bridge, taxonomy, pilotIntake });

  await mkdir(dirname(outputJson), { recursive: true });
  await mkdir(dirname(outputMd), { recursive: true });
  await writeFile(outputJson, `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(outputMd, renderMarkdown(report));

  console.log('KosmoAsset intake readiness pack');
  console.log(`Status: ${report.status}`);
  console.log(`Pilot asset groups: ${report.summary.pilot_asset_groups}`);
  console.log(`Library candidates: ${report.summary.library_candidates}`);
  console.log(`Blocked candidates: ${report.summary.blocked_candidates}`);
  console.log(`Executable now: ${report.summary.executable_now}`);
  console.log(`Failures: ${report.summary.failures}`);
  console.log(`Public-ready after pack: ${report.summary.public_ready_after_pack}`);
  console.log(`Wrote: ${relative(root, outputMd)}`);

  if (report.failures.length > 0) process.exitCode = 1;
}

function buildReport({ bridge, taxonomy, pilotIntake }) {
  const failures = [];
  if (bridge.status !== 'kosmoasset_reference_bridge_review_only_passed') failures.push(`Asset bridge not passed: ${bridge.status}`);
  if (taxonomy.status !== 'kosmoasset_candidate_taxonomy_review_ready') failures.push(`Asset taxonomy not ready: ${taxonomy.status}`);
  if (pilotIntake.status !== 'kosmoreferences_pilot_intake_readiness_pack_ready') failures.push(`Pilot intake not ready: ${pilotIntake.status}`);

  const pilotAssetGroups = (bridge.pilots || []).map((pilot) => ({
    id: pilot.id,
    title: pilot.title,
    bridge_status: pilot.status,
    asset_count: pilot.asset_count,
    asset_ids: pilot.asset_ids || [],
    categories: pilot.categories || [],
    export_targets: pilot.export_targets || [],
    public_use_allowed: pilot.public_use_allowed ?? 0,
    stages: pilotAssetStages.map((stageId) => stage(stageId, 'pilot_derived_asset', pilot.id))
  }));
  const libraryCandidates = (taxonomy.candidate_reviews || []).filter((candidate) => candidate.private_metadata_inventory_after_owner === true);
  const blockedCandidates = (taxonomy.candidate_reviews || []).filter((candidate) => candidate.private_metadata_inventory_after_owner !== true);
  const libraryCandidateGroups = libraryCandidates.map((candidate) => ({
    id: candidate.id,
    review_lane: candidate.review_lane,
    role_guess: candidate.role_guess,
    owner_confirmation_required: candidate.owner_confirmation_required,
    asset_use_allowed_now: false,
    stages: libraryStages.map((stageId) => stage(stageId, 'private_asset_library_candidate', candidate.id))
  }));

  const allStages = [
    ...pilotAssetGroups.flatMap((group) => group.stages),
    ...libraryCandidateGroups.flatMap((group) => group.stages)
  ];

  return {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    status: failures.length === 0
      ? 'kosmoasset_intake_readiness_pack_ready'
      : 'kosmoasset_intake_readiness_pack_needs_review',
    policy: {
      readiness_only: true,
      reads_private_content: false,
      copies_private_content: false,
      runs_private_inventory_now: false,
      generates_assets_now: false,
      executes_local_workers_now: false,
      uploads_allowed: false,
      public_ready_after_pack: 0
    },
    source_refs: [
      relative(root, bridgePath),
      relative(root, taxonomyPath),
      relative(root, pilotIntakePath)
    ],
    summary: {
      pilot_asset_groups: pilotAssetGroups.length,
      pilot_assets: bridge.summary?.asset_count ?? null,
      library_candidates: libraryCandidateGroups.length,
      blocked_candidates: blockedCandidates.length,
      total_stages: allStages.length,
      executable_now: allStages.filter((stageItem) => stageItem.executable_now).length,
      open_human_review_count: bridge.summary?.open_human_review_count ?? null,
      promotion_allowed: bridge.summary?.promotion_allowed ?? false,
      failures: failures.length,
      public_ready_after_pack: 0
    },
    pilot_asset_groups: pilotAssetGroups,
    library_candidate_groups: libraryCandidateGroups,
    blocked_candidate_ids: blockedCandidates.map((candidate) => candidate.id),
    command_order_after_owner_and_source_guards: [
      'npm run kosmo:asset-reference-bridge-check',
      'npm run kosmo:asset-candidate-taxonomy-review',
      'npm run kosmo:asset-candidate-taxonomy-review-check',
      'npm run kosmo:asset-intake-readiness-pack',
      'npm run kosmo:asset-intake-readiness-pack-check',
      'npm run kosmo:data-lane-sweep',
      'npm run kosmo:references-nightly-gate'
    ],
    hard_stops: [
      'Do not ingest private asset libraries before owner lane confirmation and rights review.',
      'Do not generate, normalize or export assets from private contents in this pack.',
      'Do not send private file contents to local LLM workers.',
      'Do not upload or publish assets.',
      'Keep pilot-derived assets review-only until human review and promotion guards pass.',
      'Keep public-ready at 0.'
    ],
    failures
  };
}

function stage(id, lane, subjectId) {
  return {
    id,
    lane,
    subject_id: subjectId,
    executable_now: false,
    reads_private_content_now: false,
    generates_assets_now: false,
    public_ready_after_stage: 0,
    guard: guardFor(id, lane),
    owner: ownerFor(id, lane)
  };
}

function guardFor(id, lane) {
  if (id === 'promotion_guard') return 'npm run kosmo:references-nightly-gate';
  if (id === 'local_worker_task_packet' || id === 'local_worker_packet_after_contract') return 'local worker output contract plus overseer review';
  if (lane === 'private_asset_library_candidate') return 'owner confirmation plus metadata-only inventory preflight';
  return 'npm run kosmo:asset-reference-bridge-check';
}

function ownerFor(id, lane) {
  if (id.includes('local_worker')) return 'local_llm_after_overseer_guard';
  if (lane === 'private_asset_library_candidate') return 'codex_kosmoasset_lane_plus_owner';
  return 'codex_kosmoasset_lane';
}

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

function renderMarkdown(report) {
  const lines = [];
  lines.push('# KosmoAsset Intake Readiness Pack');
  lines.push('');
  lines.push(`Generated: ${report.generated_at}`);
  lines.push(`Status: \`${report.status}\``);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Pilot asset groups: ${report.summary.pilot_asset_groups}`);
  lines.push(`- Pilot assets: ${report.summary.pilot_assets}`);
  lines.push(`- Library candidates: ${report.summary.library_candidates}`);
  lines.push(`- Blocked candidates: ${report.summary.blocked_candidates}`);
  lines.push(`- Total stages: ${report.summary.total_stages}`);
  lines.push(`- Executable now: ${report.summary.executable_now}`);
  lines.push(`- Open human reviews: ${report.summary.open_human_review_count}`);
  lines.push(`- Promotion allowed: ${report.summary.promotion_allowed ? 'yes' : 'no'}`);
  lines.push(`- Public-ready after pack: ${report.summary.public_ready_after_pack}`);
  lines.push('');
  lines.push('## Pilot Asset Groups');
  lines.push('');
  report.pilot_asset_groups.forEach((group) => {
    lines.push(`### ${group.title}`);
    lines.push('');
    lines.push(`- Assets: ${group.asset_count}`);
    lines.push(`- Categories: ${group.categories.join(', ') || 'none'}`);
    lines.push(`- Export targets: ${group.export_targets.join(', ') || 'none'}`);
    lines.push(`- Public use allowed: ${group.public_use_allowed}`);
    lines.push(`- Asset IDs: ${group.asset_ids.join(', ') || 'none'}`);
    lines.push('');
  });
  lines.push('## Private Library Candidate Groups');
  lines.push('');
  report.library_candidate_groups.forEach((group) => {
    lines.push(`- \`${group.id}\`: ${group.review_lane}; owner confirmation ${group.owner_confirmation_required ? 'required' : 'not required'}`);
  });
  lines.push('');
  lines.push('## Command Order After Owner And Source Guards');
  lines.push('');
  report.command_order_after_owner_and_source_guards.forEach((command) => lines.push(`- ${command}`));
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
