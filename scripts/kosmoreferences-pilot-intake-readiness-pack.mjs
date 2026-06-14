#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = new Date().toISOString().slice(0, 10);

const evidenceMatrixPath = resolve(root, args.evidenceMatrix || `data/kosmoreferences-pilot-evidence-matrix-${dateStamp}.json`);
const packageCheckPath = resolve(root, args.packageCheck || `data/kosmoreferences-pilot-package-check-${dateStamp}.json`);
const ownerChecklistPath = resolve(root, args.ownerChecklist || `data/kosmo-source-root-owner-answer-execution-checklist-${dateStamp}.json`);
const outputJson = resolve(root, args.out || `data/kosmoreferences-pilot-intake-readiness-pack-${dateStamp}.json`);
const outputMd = resolve(root, args.markdown || `docs/codex/kosmoreferences-pilot-intake-readiness-pack-${dateStamp}.md`);

const intakeStages = [
  'metadata_inventory_match',
  'source_list_review',
  'media_plan_slot_review',
  'rights_and_provenance_review',
  'analysis_layer_completion',
  'asset_candidate_bridge',
  'local_worker_packet',
  'orbit_status_update'
];

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const evidenceMatrix = await readJson(evidenceMatrixPath);
  const packageCheck = await readJson(packageCheckPath);
  const ownerChecklist = await readJson(ownerChecklistPath);
  const report = buildReport({ evidenceMatrix, packageCheck, ownerChecklist });

  await mkdir(dirname(outputJson), { recursive: true });
  await mkdir(dirname(outputMd), { recursive: true });
  await writeFile(outputJson, `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(outputMd, renderMarkdown(report));

  console.log('KosmoReferences pilot intake readiness pack');
  console.log(`Status: ${report.status}`);
  console.log(`Pilots: ${report.summary.pilots}`);
  console.log(`Stages: ${report.summary.total_stages}`);
  console.log(`Blocked now: ${report.summary.blocked_now}`);
  console.log(`Failures: ${report.summary.failures}`);
  console.log(`Public-ready after pack: ${report.summary.public_ready_after_pack}`);
  console.log(`Wrote: ${relative(root, outputMd)}`);

  if (report.failures.length > 0) process.exitCode = 1;
}

function buildReport({ evidenceMatrix, packageCheck, ownerChecklist }) {
  const failures = [];
  if (evidenceMatrix.status !== 'pilot_evidence_matrix_review_only') failures.push(`Evidence matrix not review-only: ${evidenceMatrix.status}`);
  if (packageCheck.status !== 'pilot_packages_review_only_complete') failures.push(`Pilot packages not complete: ${packageCheck.status}`);
  if (ownerChecklist.status !== 'source_root_owner_answer_execution_checklist_ready') failures.push(`Owner checklist not ready: ${ownerChecklist.status}`);

  const evidenceById = new Map((evidenceMatrix.pilots || []).map((pilot) => [pilot.id, pilot]));
  const pilots = (packageCheck.pilots || []).map((pilot) => buildPilotIntake(pilot, evidenceById.get(pilot.id)));
  const totalStages = pilots.reduce((sum, pilot) => sum + pilot.intake_stages.length, 0);
  const blockedNow = pilots.reduce((sum, pilot) => sum + pilot.intake_stages.filter((stageItem) => stageItem.executable_now !== true).length, 0);

  return {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    status: failures.length === 0
      ? 'kosmoreferences_pilot_intake_readiness_pack_ready'
      : 'kosmoreferences_pilot_intake_readiness_pack_needs_review',
    policy: {
      readiness_only: true,
      reads_private_content: false,
      copies_private_content: false,
      runs_private_inventory_now: false,
      executes_local_workers: false,
      writes_public_files: false,
      public_ready_after_pack: 0
    },
    source_refs: [
      relative(root, evidenceMatrixPath),
      relative(root, packageCheckPath),
      relative(root, ownerChecklistPath)
    ],
    summary: {
      pilots: pilots.length,
      total_stages: totalStages,
      blocked_now: blockedNow,
      complete_review_only_pilots: packageCheck.summary?.complete_pilots ?? null,
      evidence_gap_count: evidenceMatrix.summary?.total_gap_count ?? null,
      public_ready_assets: evidenceMatrix.summary?.public_ready_assets ?? null,
      failures: failures.length,
      public_ready_after_pack: 0
    },
    pilots,
    command_order_after_source_root_unlock: [
      'npm run kosmo:private-metadata-inventory',
      'npm run kosmo:private-metadata-inventory-check',
      'npm run kosmo:pilot-evidence-matrix',
      'npm run kosmo:pilot-package-check',
      'npm run kosmo:pilot-intake-readiness-pack',
      'npm run kosmo:pilot-intake-readiness-pack-check',
      'npm run kosmo:data-lane-sweep',
      'npm run kosmo:references-nightly-gate'
    ],
    hard_stops: [
      'Do not execute pilot intake stages before the owner source-root answer is explicit and guards pass.',
      'Do not read private file contents in this readiness pack.',
      'Do not OCR, extract PDF text, or send private source contents to local LLM workers from this pack.',
      'Do not copy private files or generated private outputs into Git.',
      'Keep every pilot review-only and public-ready false.'
    ],
    failures
  };
}

function buildPilotIntake(packagePilot, evidencePilot) {
  return {
    id: packagePilot.id,
    title: packagePilot.title,
    package_status: packagePilot.status,
    evidence_source_state: evidencePilot?.source_state ?? null,
    gap_count: evidencePilot?.gap_count ?? null,
    blocking_gap_types: evidencePilot?.blocking_gap_types ?? [],
    recommended_workers: evidencePilot?.recommended_workers ?? [],
    source_package_path: packagePilot.source_package_path,
    entry_draft_path: packagePilot.registry_path,
    public_ready: false,
    intake_stages: intakeStages.map((stageId) => stage(stageId, packagePilot, evidencePilot))
  };
}

function stage(id, packagePilot, evidencePilot) {
  const privateDependent = [
    'metadata_inventory_match',
    'source_list_review',
    'media_plan_slot_review',
    'rights_and_provenance_review',
    'analysis_layer_completion',
    'asset_candidate_bridge',
    'local_worker_packet'
  ].includes(id);
  return {
    id,
    status: privateDependent ? 'blocked_until_source_root_unlock' : 'blocked_until_prior_stages_pass',
    executable_now: false,
    reads_private_content_now: false,
    public_ready_after_stage: 0,
    worker_owner: workerOwner(id, evidencePilot),
    expected_output: expectedOutput(id, packagePilot),
    guard: guardFor(id)
  };
}

function workerOwner(id, evidencePilot) {
  if (id === 'orbit_status_update') return 'codex_or_claude_overseer';
  if (id === 'local_worker_packet') return (evidencePilot?.recommended_workers || []).includes('kosmo-local-llm') ? 'local_llm_after_overseer_guard' : 'codex_overseer';
  if (id === 'asset_candidate_bridge') return 'codex_kosmoasset_lane';
  return 'codex_kosmoreferences_lane';
}

function expectedOutput(id, packagePilot) {
  const idPrefix = packagePilot.id;
  return {
    metadata_inventory_match: `${idPrefix}: matched filenames/counts only; no file bodies`,
    source_list_review: `${idPrefix}: reviewed source list with provenance status`,
    media_plan_slot_review: `${idPrefix}: exterior/interior/plan/section slots mapped to source candidates`,
    rights_and_provenance_review: `${idPrefix}: file-level rights/provenance review remains review-only`,
    analysis_layer_completion: `${idPrefix}: structure/material/typology analysis fields completed from approved metadata`,
    asset_candidate_bridge: `${idPrefix}: review-only KosmoAsset candidate bridge`,
    local_worker_packet: `${idPrefix}: local worker task packet without private file contents in Git`,
    orbit_status_update: `${idPrefix}: Orbit-visible status after guards`
  }[id];
}

function guardFor(id) {
  if (id === 'orbit_status_update') return 'npm run kosmo:data-lane-sweep';
  if (id === 'asset_candidate_bridge') return 'npm run kosmo:references-nightly-gate';
  if (id === 'local_worker_packet') return 'manual overseer review plus local worker output contract';
  return 'npm run kosmo:pilot-package-check';
}

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

function renderMarkdown(report) {
  const lines = [];
  lines.push('# KosmoReferences Pilot Intake Readiness Pack');
  lines.push('');
  lines.push(`Generated: ${report.generated_at}`);
  lines.push(`Status: \`${report.status}\``);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Pilots: ${report.summary.pilots}`);
  lines.push(`- Total stages: ${report.summary.total_stages}`);
  lines.push(`- Blocked now: ${report.summary.blocked_now}`);
  lines.push(`- Complete review-only pilots: ${report.summary.complete_review_only_pilots}`);
  lines.push(`- Evidence gap count: ${report.summary.evidence_gap_count}`);
  lines.push(`- Public-ready assets: ${report.summary.public_ready_assets}`);
  lines.push(`- Public-ready after pack: ${report.summary.public_ready_after_pack}`);
  lines.push('');
  lines.push('## Pilots');
  lines.push('');
  report.pilots.forEach((pilot) => {
    lines.push(`### ${pilot.title}`);
    lines.push('');
    lines.push(`- Package status: ${pilot.package_status}`);
    lines.push(`- Evidence state: ${pilot.evidence_source_state}`);
    lines.push(`- Gaps: ${pilot.gap_count}`);
    lines.push(`- Blocking gap types: ${pilot.blocking_gap_types.join(', ') || 'none'}`);
    lines.push(`- Recommended workers: ${pilot.recommended_workers.join(', ') || 'none'}`);
    lines.push('');
    lines.push('| Stage | Owner | Status | Guard |');
    lines.push('| --- | --- | --- | --- |');
    pilot.intake_stages.forEach((stageItem) => {
      lines.push(`| \`${stageItem.id}\` | ${stageItem.worker_owner} | ${stageItem.status} | ${stageItem.guard} |`);
    });
    lines.push('');
  });
  lines.push('## Command Order After Source-Root Unlock');
  lines.push('');
  report.command_order_after_source_root_unlock.forEach((command) => lines.push(`- ${command}`));
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
