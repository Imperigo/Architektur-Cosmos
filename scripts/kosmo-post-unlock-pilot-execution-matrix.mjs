#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = new Date().toISOString().slice(0, 10);

const pilotPackPath = resolve(root, args.pilotPack || `data/kosmoreferences-pilot-intake-readiness-pack-${dateStamp}.json`);
const assetPackPath = resolve(root, args.assetPack || `data/kosmoasset-intake-readiness-pack-${dateStamp}.json`);
const postSourcePath = resolve(root, args.postSource || `data/kosmo-post-source-root-metadata-readiness-pack-${dateStamp}.json`);
const ownerUnlockCheckpointPath = resolve(root, args.ownerUnlockCheckpoint || `data/kosmo-owner-unlock-pipeline-checkpoint-${dateStamp}.json`);
const roadmapPath = resolve(root, args.roadmap || `data/kosmo-vision-completion-roadmap-${dateStamp}.json`);
const outputJson = resolve(root, args.out || `data/kosmo-post-unlock-pilot-execution-matrix-${dateStamp}.json`);
const outputMd = resolve(root, args.markdown || `docs/codex/kosmo-post-unlock-pilot-execution-matrix-${dateStamp}.md`);

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const pilotPack = await readJson(pilotPackPath);
  const assetPack = await readJson(assetPackPath);
  const postSource = await readJson(postSourcePath);
  const ownerUnlockCheckpoint = await readJson(ownerUnlockCheckpointPath);
  const roadmap = await readJsonOptional(roadmapPath, {
    status: 'vision_completion_roadmap_bootstrap_missing',
    summary: {},
    bootstrap_missing: true
  });
  const report = buildReport({ pilotPack, assetPack, postSource, ownerUnlockCheckpoint, roadmap });

  await mkdir(dirname(outputJson), { recursive: true });
  await mkdir(dirname(outputMd), { recursive: true });
  await writeFile(outputJson, `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(outputMd, renderMarkdown(report));

  console.log('Kosmo post-unlock pilot execution matrix');
  console.log(`Status: ${report.status}`);
  console.log(`Pilots: ${report.summary.pilots}`);
  console.log(`Reference stages: ${report.summary.reference_stages}`);
  console.log(`Asset stages: ${report.summary.asset_stages}`);
  console.log(`Executable now: ${report.summary.executable_now}`);
  console.log(`Public-ready after matrix: ${report.summary.public_ready_after_matrix}`);
  console.log(`Wrote: ${relative(root, outputMd)}`);
}

function buildReport({ pilotPack, assetPack, postSource, ownerUnlockCheckpoint, roadmap }) {
  const failures = [];
  if (pilotPack.status !== 'kosmoreferences_pilot_intake_readiness_pack_ready') failures.push(`Pilot pack not ready: ${pilotPack.status}`);
  if (assetPack.status !== 'kosmoasset_intake_readiness_pack_ready') failures.push(`Asset pack not ready: ${assetPack.status}`);
  if (postSource.status !== 'post_source_root_metadata_readiness_pack_ready') failures.push(`Post-source pack not ready: ${postSource.status}`);
  if (ownerUnlockCheckpoint.status !== 'owner_unlock_pipeline_checkpoint_ready') failures.push(`Owner unlock checkpoint not ready: ${ownerUnlockCheckpoint.status}`);
  const roadmapAccepted = [
    'vision_completion_roadmap_ready',
    'vision_completion_roadmap_needs_review',
    'vision_completion_roadmap_bootstrap_missing'
  ].includes(roadmap.status);
  if (!roadmapAccepted) failures.push(`Roadmap not in a guarded bootstrap state: ${roadmap.status}`);

  const assetGroupById = new Map((assetPack.pilot_asset_groups || []).map((group) => [group.id, group]));
  const pilots = (pilotPack.pilots || []).map((pilot) => {
    const assetGroup = assetGroupById.get(pilot.id) || {};
    const referenceStages = pilot.intake_stages || [];
    const assetStages = assetGroup.stages || [];
    return {
      id: pilot.id,
      title: pilot.title,
      status: 'blocked_until_owner_unlock_and_source_root_guards',
      reference_stages: referenceStages.length,
      reference_blocked_now: referenceStages.filter((stage) => String(stage.status || '').includes('blocked')).length,
      evidence_gap_count: (pilot.evidence_gaps || []).length,
      asset_count: assetGroup.asset_count || 0,
      asset_stage_count: assetStages.length,
      asset_public_use_allowed: assetGroup.public_use_allowed || 0,
      first_unlocked_reference_actions: [
        'metadata_inventory_match',
        'source_slot_binding',
        'provenance_review',
        'analysis_layer_completion'
      ],
      first_unlocked_asset_actions: [
        'source_basis_review',
        'rights_and_human_review',
        'asset_schema_normalization',
        'export_profile_planning'
      ],
      owner_review_surface: 'review-only',
      public_ready_after_pilot: 0
    };
  });

  const commandSequence = [
    {
      id: 'owner_answer_dry_run',
      action: 'npm run kosmo:owner-unlock-answer-dry-run -- --answer "<owner_reply>"',
      executable_now: false,
      before_private_inventory: true
    },
    ...(postSource.command_sequence || []).map((command) => ({
      id: command.id,
      action: command.action,
      executable_now: false,
      before_private_inventory: !command.private_inventory_related,
      private_inventory_related: Boolean(command.private_inventory_related)
    }))
  ];

  return {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    status: failures.length === 0
      ? 'post_unlock_pilot_execution_matrix_ready'
      : 'post_unlock_pilot_execution_matrix_needs_review',
    policy: {
      matrix_only: true,
      executes_commands_now: false,
      reads_private_content_now: false,
      runs_private_inventory_now: false,
      mutates_pilot_packages_now: false,
      public_ready_after_matrix: 0
    },
    source_refs: [
      relative(root, pilotPackPath),
      relative(root, assetPackPath),
      relative(root, postSourcePath),
      relative(root, ownerUnlockCheckpointPath),
      relative(root, roadmapPath)
    ],
    summary: {
      pilots: pilots.length,
      reference_stages: pilots.reduce((sum, pilot) => sum + pilot.reference_stages, 0),
      reference_blocked_now: pilots.reduce((sum, pilot) => sum + pilot.reference_blocked_now, 0),
      evidence_gap_count: pilotPack.summary?.evidence_gap_count ?? null,
      asset_stages: pilots.reduce((sum, pilot) => sum + pilot.asset_stage_count, 0),
      asset_count: pilots.reduce((sum, pilot) => sum + pilot.asset_count, 0),
      command_sequence_steps: commandSequence.length,
      owner_unlock_components_ready: ownerUnlockCheckpoint.summary?.components_ready ?? null,
      owner_unlock_guard_checks_passed: ownerUnlockCheckpoint.summary?.guard_checks_passed ?? null,
      roadmap_status: roadmap.status,
      roadmap_bootstrap_missing: roadmap.bootstrap_missing === true,
      executable_now: 0,
      public_ready_after_matrix: 0,
      failures: failures.length
    },
    pilots,
    command_sequence: commandSequence,
    next_actions_after_owner_reply: [
      'Run owner unlock answer dry-run and review generated intake map.',
      'Apply reviewed intake only if owner intent is unambiguous.',
      'Run source-root guards before private metadata inventory.',
      'Run pilot-scoped metadata inventory before any OCR, asset generation or public promotion.',
      'Keep all three pilot packages review-only until provenance and rights gates pass.'
    ],
    hard_stops: [
      'Do not run private inventory from this matrix.',
      'Do not read private content from this matrix.',
      'Do not generate assets from private sources before owner/source-root gates pass.',
      'Do not mark any pilot or asset public-ready.'
    ],
    failures
  };
}

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

async function readJsonOptional(path, fallback) {
  try {
    return await readJson(path);
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error;
    return fallback;
  }
}

function renderMarkdown(report) {
  const lines = [];
  lines.push('# Kosmo Post-Unlock Pilot Execution Matrix');
  lines.push('');
  lines.push(`Generated: ${report.generated_at}`);
  lines.push(`Status: \`${report.status}\``);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Pilots: ${report.summary.pilots}`);
  lines.push(`- Reference stages: ${report.summary.reference_blocked_now}/${report.summary.reference_stages} blocked now`);
  lines.push(`- Evidence gaps: ${report.summary.evidence_gap_count}`);
  lines.push(`- Asset stages: ${report.summary.asset_stages}`);
  lines.push(`- Asset count: ${report.summary.asset_count}`);
  lines.push(`- Command sequence steps: ${report.summary.command_sequence_steps}`);
  lines.push(`- Owner unlock: ${report.summary.owner_unlock_components_ready} components, ${report.summary.owner_unlock_guard_checks_passed} guards`);
  lines.push(`- Executable now: ${report.summary.executable_now}`);
  lines.push(`- Public-ready after matrix: ${report.summary.public_ready_after_matrix}`);
  lines.push('');
  lines.push('## Pilots');
  lines.push('');
  report.pilots.forEach((pilot) => {
    lines.push(`- ${pilot.title}: references ${pilot.reference_blocked_now}/${pilot.reference_stages} blocked, assets ${pilot.asset_count}, asset stages ${pilot.asset_stage_count}, public-ready ${pilot.public_ready_after_pilot}`);
  });
  lines.push('');
  lines.push('## Command Sequence');
  lines.push('');
  report.command_sequence.forEach((command) => {
    lines.push(`- \`${command.id}\`: ${command.action}`);
  });
  lines.push('');
  lines.push('## Next Actions After Owner Reply');
  lines.push('');
  report.next_actions_after_owner_reply.forEach((action) => lines.push(`- ${action}`));
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
