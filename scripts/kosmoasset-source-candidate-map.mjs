#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = new Date().toISOString().slice(0, 10);

const selectionPath = resolve(root, args.selection || `data/kosmo-source-root-selection-brief-${dateStamp}.json`);
const assetBridgePath = resolve(root, args.assetBridge || `data/kosmoasset-reference-bridge-check-${dateStamp}.json`);
const outputJson = resolve(root, args.out || `data/kosmoasset-source-candidate-map-${dateStamp}.json`);
const outputMd = resolve(root, args.markdown || `docs/codex/kosmoasset-source-candidate-map-${dateStamp}.md`);

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const selection = await readJson(selectionPath);
  const assetBridge = await readOptionalJson(assetBridgePath);
  const candidates = buildCandidates(selection.selection_options || []);
  const blockers = buildBlockers(selection, assetBridge);
  const report = {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    status: 'kosmoasset_source_candidate_map_review_only_ready',
    policy: {
      metadata_only: true,
      reads_private_content: false,
      copies_private_content: false,
      ingests_assets: false,
      generates_assets: false,
      uploads_allowed: false,
      public_ready_after_map: 0,
      note: 'This map routes source-root candidate metadata into KosmoAsset review lanes. It does not inspect or copy private asset files.'
    },
    source_refs: [
      relative(root, selectionPath),
      relative(root, assetBridgePath)
    ],
    summary: {
      selection_status: selection.status,
      asset_bridge_status: assetBridge?.status || null,
      source_candidates_seen: selection.selection_options?.length || 0,
      asset_lane_candidates: candidates.filter((candidate) => candidate.asset_lane !== 'not_asset_lane').length,
      material_library_candidates: candidates.filter((candidate) => candidate.asset_lane === 'material_texture_library').length,
      project_asset_candidates: candidates.filter((candidate) => candidate.asset_lane === 'project_asset_library').length,
      blocked_reference_root_candidates: candidates.filter((candidate) => candidate.reference_root_allowed === false).length,
      public_ready_after_map: 0
    },
    candidates,
    blockers,
    next_actions: [
      'Use material_texture_library candidates only as KosmoAsset review inputs after owner confirmation.',
      'Do not treat KosmoAsset material libraries as the main KosmoReferences source root.',
      'After owner selection, run private diagnostics on the exact selected path before any extraction.',
      'Keep public-ready at 0 until rights, provenance and human review gates pass.'
    ]
  };

  await mkdir(dirname(outputJson), { recursive: true });
  await mkdir(dirname(outputMd), { recursive: true });
  await writeFile(outputJson, `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(outputMd, renderMarkdown(report));

  console.log('KosmoAsset source candidate map');
  console.log(`Status: ${report.status}`);
  console.log(`Asset-lane candidates: ${report.summary.asset_lane_candidates}`);
  console.log(`Material libraries: ${report.summary.material_library_candidates}`);
  console.log(`Public-ready after map: ${report.summary.public_ready_after_map}`);
  console.log(`Wrote: ${relative(root, outputMd)}`);
}

function buildCandidates(options) {
  return options.map((option) => {
    const assetLane = assetLaneFor(option);
    return {
      id: option.id,
      path: option.path,
      role_guess: option.role_guess || 'unknown_owner_confirmation_required',
      classification: option.classification,
      score: option.score,
      book_like_files: option.book_like_files,
      lecture_like_files: option.lecture_like_files,
      sync_error_files: option.sync_error_files,
      asset_lane: assetLane,
      reference_root_allowed: false,
      asset_use_allowed_now: false,
      required_confirmation: requiredConfirmationFor(assetLane),
      recommended_action: recommendedActionFor(option, assetLane)
    };
  });
}

function assetLaneFor(option) {
  if (option.role_guess === 'asset_material_library_candidate') return 'material_texture_library';
  const lower = String(option.path || '').toLowerCase();
  if (lower.includes('/assets')) return 'project_asset_library';
  if (option.role_guess === 'archive_subtree_candidate' && lower.includes('assets')) return 'project_asset_library';
  return 'not_asset_lane';
}

function requiredConfirmationFor(assetLane) {
  if (assetLane === 'material_texture_library') return 'owner_confirms_kosmoasset_material_source_then_rights_review';
  if (assetLane === 'project_asset_library') return 'owner_confirms_asset_scope_then_private_metadata_only_inventory';
  return 'keep_blocked_for_asset_use';
}

function recommendedActionFor(option, assetLane) {
  if (assetLane === 'material_texture_library') {
    return 'Route to KosmoAsset material/source candidate list, not to KosmoReferences main source root.';
  }
  if (assetLane === 'project_asset_library') {
    return 'Review as possible KosmoAsset project-asset source, with no copy or extraction before owner confirmation.';
  }
  if (option.role_guess === 'workflow_mirror_or_codex_context') {
    return 'Keep out of KosmoAsset ingestion; this looks like workflow/context material.';
  }
  return 'Keep blocked until owner/KosmoOverseer assigns a lane.';
}

function buildBlockers(selection, assetBridge) {
  return [
    {
      id: 'source_root_owner_selection',
      active: selection.summary?.owner_selection_required !== false,
      message: 'Owner/KosmoOverseer has not selected an exact private source root.'
    },
    {
      id: 'asset_bridge_review_only',
      active: assetBridge?.status !== 'kosmoasset_reference_bridge_review_only_passed',
      message: 'KosmoAsset reference bridge must stay review-only and passing before new candidate lanes are promoted.'
    },
    {
      id: 'public_ready_zero',
      active: true,
      message: 'All source-derived KosmoAsset candidates stay public-ready=false until rights and human review gates pass.'
    }
  ];
}

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

async function readOptionalJson(path) {
  try {
    return await readJson(path);
  } catch {
    return null;
  }
}

function renderMarkdown(report) {
  const lines = [];
  lines.push('# KosmoAsset Source Candidate Map');
  lines.push('');
  lines.push(`Generated: ${report.generated_at}`);
  lines.push(`Status: \`${report.status}\``);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Selection status: ${report.summary.selection_status}`);
  lines.push(`- Asset bridge: ${report.summary.asset_bridge_status}`);
  lines.push(`- Source candidates seen: ${report.summary.source_candidates_seen}`);
  lines.push(`- Asset-lane candidates: ${report.summary.asset_lane_candidates}`);
  lines.push(`- Material library candidates: ${report.summary.material_library_candidates}`);
  lines.push(`- Project asset candidates: ${report.summary.project_asset_candidates}`);
  lines.push(`- Blocked reference-root candidates: ${report.summary.blocked_reference_root_candidates}`);
  lines.push(`- Public-ready after map: ${report.summary.public_ready_after_map}`);
  lines.push('');
  lines.push('## Candidate Lanes');
  lines.push('');
  lines.push('| Candidate | Lane | Role | Score | Reference root allowed | Asset use now | Required confirmation | Path |');
  lines.push('| --- | --- | --- | ---: | --- | --- | --- | --- |');
  report.candidates.forEach((candidate) => {
    lines.push(`| \`${candidate.id}\` | ${candidate.asset_lane} | ${candidate.role_guess} | ${candidate.score ?? '-'} | ${candidate.reference_root_allowed ? 'yes' : 'no'} | ${candidate.asset_use_allowed_now ? 'yes' : 'no'} | ${candidate.required_confirmation} | ${candidate.path ? `\`${escapePipe(candidate.path)}\`` : '-'} |`);
  });
  lines.push('');
  lines.push('## Blockers');
  lines.push('');
  report.blockers.forEach((blocker) => lines.push(`- \`${blocker.id}\`: ${blocker.active ? 'active' : 'clear'} - ${blocker.message}`));
  lines.push('');
  lines.push('## Next Actions');
  lines.push('');
  report.next_actions.forEach((action) => lines.push(`- ${action}`));
  lines.push('');
  lines.push('## Safety');
  lines.push('');
  lines.push('This map is metadata-only. It does not read private source contents, copy assets, create textures, generate models or approve public use.');
  lines.push('');
  return `${lines.join('\n')}`;
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
