#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = new Date().toISOString().slice(0, 10);

const roadmapPath = resolve(root, args.roadmap || `data/kosmo-vision-completion-roadmap-${dateStamp}.json`);
const ownerChecklistPath = resolve(root, args.ownerChecklist || `data/kosmo-source-root-owner-answer-execution-checklist-${dateStamp}.json`);
const postSourceReadinessPath = resolve(root, args.postSource || `data/kosmo-post-source-root-metadata-readiness-pack-${dateStamp}.json`);
const pilotIntakePath = resolve(root, args.pilotIntake || `data/kosmoreferences-pilot-intake-readiness-pack-${dateStamp}.json`);
const assetIntakePath = resolve(root, args.assetIntake || `data/kosmoasset-intake-readiness-pack-${dateStamp}.json`);
const trainingReadinessPath = resolve(root, args.training || `data/kosmo-training-memory-readiness-pack-${dateStamp}.json`);
const outputJson = resolve(root, args.out || `data/kosmo-evening-batch-rollup-${dateStamp}.json`);
const outputMd = resolve(root, args.markdown || `docs/codex/kosmo-evening-batch-rollup-${dateStamp}.md`);

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const roadmap = await readJson(roadmapPath);
  const ownerChecklist = await readJson(ownerChecklistPath);
  const postSourceReadiness = await readJson(postSourceReadinessPath);
  const pilotIntake = await readJson(pilotIntakePath);
  const assetIntake = await readJson(assetIntakePath);
  const trainingReadiness = await readJson(trainingReadinessPath);
  const report = buildReport({ roadmap, ownerChecklist, postSourceReadiness, pilotIntake, assetIntake, trainingReadiness });

  await mkdir(dirname(outputJson), { recursive: true });
  await mkdir(dirname(outputMd), { recursive: true });
  await writeFile(outputJson, `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(outputMd, renderMarkdown(report));

  console.log('Kosmo evening batch rollup');
  console.log(`Status: ${report.status}`);
  console.log(`Readiness packs: ${report.summary.readiness_packs}`);
  console.log(`Guarded checks: ${report.summary.guarded_checks}`);
  console.log(`Executable now: ${report.summary.executable_now}`);
  console.log(`Owner gates: ${report.summary.owner_gates}`);
  console.log(`Failures: ${report.summary.failures}`);
  console.log(`Public-ready after rollup: ${report.summary.public_ready_after_rollup}`);
  console.log(`Wrote: ${relative(root, outputMd)}`);

  if (report.failures.length > 0) process.exitCode = 1;
}

function buildReport({ roadmap, ownerChecklist, postSourceReadiness, pilotIntake, assetIntake, trainingReadiness }) {
  const failures = [];
  const expected = [
    ['roadmap', roadmap.status, 'vision_completion_roadmap_ready'],
    ['owner_checklist', ownerChecklist.status, 'source_root_owner_answer_execution_checklist_ready'],
    ['post_source_readiness', postSourceReadiness.status, 'post_source_root_metadata_readiness_pack_ready'],
    ['pilot_intake', pilotIntake.status, 'kosmoreferences_pilot_intake_readiness_pack_ready'],
    ['asset_intake', assetIntake.status, 'kosmoasset_intake_readiness_pack_ready'],
    ['training_readiness', trainingReadiness.status, 'kosmo_training_memory_readiness_pack_ready']
  ];
  expected.forEach(([id, status, wanted]) => {
    if (status !== wanted) failures.push(`${id} not ready: ${status}`);
  });

  const packs = [
    pack('post_source_metadata', postSourceReadiness.status, postSourceReadiness.summary?.command_sequence_steps, postSourceReadiness.summary?.blocked_now, 'Owner answer first, then source-root guards.'),
    pack('owner_answer_paths', ownerChecklist.status, ownerChecklist.summary?.branches, ownerChecklist.summary?.executable_now, 'Three branches, one unlock branch; no automatic decision.'),
    pack('pilot_intake', pilotIntake.status, pilotIntake.summary?.total_stages, pilotIntake.summary?.blocked_now, 'Three pilots prepared; all stages blocked until source-root unlock.'),
    pack('asset_intake', assetIntake.status, assetIntake.summary?.total_stages, assetIntake.summary?.executable_now, 'Pilot assets and private library candidates separated.'),
    pack('training_memory', trainingReadiness.status, trainingReadiness.summary?.lanes, trainingReadiness.summary?.executable_now, 'RAG/eval/fine-tune/embedding lanes prepared; no data writes now.')
  ];

  return {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    status: failures.length === 0 ? 'kosmo_evening_batch_rollup_ready' : 'kosmo_evening_batch_rollup_needs_review',
    policy: {
      rollup_only: true,
      reads_private_content: false,
      records_owner_decisions: false,
      runs_private_inventory_now: false,
      executes_local_workers_now: false,
      writes_training_data_now: false,
      public_ready_after_rollup: 0
    },
    source_refs: [
      relative(root, roadmapPath),
      relative(root, ownerChecklistPath),
      relative(root, postSourceReadinessPath),
      relative(root, pilotIntakePath),
      relative(root, assetIntakePath),
      relative(root, trainingReadinessPath)
    ],
    summary: {
      phases: roadmap.summary?.phases ?? null,
      readiness_packs: packs.length,
      guarded_checks: 'post-source, owner paths, pilot intake, asset intake, training memory',
      executable_now: 0,
      owner_gates: roadmap.summary?.immediate_owner_gates ?? 2,
      source_free_codex_tasks_remaining: roadmap.summary?.source_free_codex_tasks_remaining ?? 0,
      failures: failures.length,
      public_ready_after_rollup: 0
    },
    packs,
    next_owner_action: {
      required: true,
      answer_surface: 'Source Root Owner Answer Execution Checklist',
      accepted_choices: ['keep_blocked', 'repair_onedrive_first', 'select_exact_root_1'],
      unlock_rule: 'Use select_exact_root_1 only if the owner confirms the exact shown path is the complete private architecture source root.'
    },
    next_codex_after_owner_answer: [
      'Record the explicit source-root answer in the decision session.',
      'Run source-root decision session check, blocker refresh and activation preflight.',
      'If and only if activation is ready, run metadata-only private inventory and its guard.',
      'Then rerun pilot, asset and training readiness packs before any worker execution.'
    ],
    hard_stops: [
      'Do not infer owner decisions from rollup status.',
      'Do not run private inventory before explicit owner answer and source-root guards.',
      'Do not read, OCR, embed, train on or copy private source contents from this rollup.',
      'Do not execute local workers from this rollup.',
      'Keep public-ready at 0.'
    ],
    failures
  };
}

function pack(id, status, count, blockedOrExecutable, note) {
  return {
    id,
    status,
    count,
    blocked_or_executable: blockedOrExecutable,
    executable_now: false,
    public_ready_after_pack: 0,
    note
  };
}

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

function renderMarkdown(report) {
  const lines = [];
  lines.push('# Kosmo Evening Batch Rollup');
  lines.push('');
  lines.push(`Generated: ${report.generated_at}`);
  lines.push(`Status: \`${report.status}\``);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Phases: ${report.summary.phases}`);
  lines.push(`- Readiness packs: ${report.summary.readiness_packs}`);
  lines.push(`- Executable now: ${report.summary.executable_now}`);
  lines.push(`- Owner gates: ${report.summary.owner_gates}`);
  lines.push(`- Source-free Codex tasks remaining: ${report.summary.source_free_codex_tasks_remaining}`);
  lines.push(`- Public-ready after rollup: ${report.summary.public_ready_after_rollup}`);
  lines.push('');
  lines.push('## Packs');
  lines.push('');
  lines.push('| Pack | Status | Count | Blocked/executable | Public-ready | Note |');
  lines.push('| --- | --- | ---: | ---: | ---: | --- |');
  report.packs.forEach((item) => {
    lines.push(`| \`${item.id}\` | ${item.status} | ${item.count} | ${item.blocked_or_executable} | ${item.public_ready_after_pack} | ${item.note} |`);
  });
  lines.push('');
  lines.push('## Next Owner Action');
  lines.push('');
  lines.push(`- Answer surface: ${report.next_owner_action.answer_surface}`);
  lines.push(`- Choices: ${report.next_owner_action.accepted_choices.join(', ')}`);
  lines.push(`- Unlock rule: ${report.next_owner_action.unlock_rule}`);
  lines.push('');
  lines.push('## Next Codex After Owner Answer');
  lines.push('');
  report.next_codex_after_owner_answer.forEach((item) => lines.push(`- ${item}`));
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
