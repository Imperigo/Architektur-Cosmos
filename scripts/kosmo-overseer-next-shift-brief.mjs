#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = new Date().toISOString().slice(0, 10);

const rollupPath = resolve(root, args.rollup || `data/kosmo-evening-batch-rollup-${dateStamp}.json`);
const promptPackPath = resolve(root, args.promptPack || `data/kosmo-owner-unlock-prompt-pack-${dateStamp}.json`);
const roadmapPath = resolve(root, args.roadmap || `data/kosmo-vision-completion-roadmap-${dateStamp}.json`);
const syncBoardPath = resolve(root, args.syncBoard || `data/kosmo-overseer-sync-board-${dateStamp}.json`);
const outputJson = resolve(root, args.out || `data/kosmo-overseer-next-shift-brief-${dateStamp}.json`);
const outputMd = resolve(root, args.markdown || `docs/codex/kosmo-overseer-next-shift-brief-${dateStamp}.md`);

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const rollup = await readJson(rollupPath);
  const promptPack = await readJson(promptPackPath);
  const roadmap = await readJson(roadmapPath);
  const syncBoard = await readJson(syncBoardPath);
  const report = buildReport({ rollup, promptPack, roadmap, syncBoard });

  await mkdir(dirname(outputJson), { recursive: true });
  await mkdir(dirname(outputMd), { recursive: true });
  await writeFile(outputJson, `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(outputMd, renderMarkdown(report));

  console.log('Kosmo overseer next shift brief');
  console.log(`Status: ${report.status}`);
  console.log(`Completed packs: ${report.summary.completed_packs}`);
  console.log(`Claude actions: ${report.summary.claude_actions}`);
  console.log(`Codex actions: ${report.summary.codex_actions}`);
  console.log(`Owner gates: ${report.summary.owner_gates}`);
  console.log(`Failures: ${report.summary.failures}`);
  console.log(`Public-ready after brief: ${report.summary.public_ready_after_brief}`);
  console.log(`Wrote: ${relative(root, outputMd)}`);

  if (report.failures.length > 0) process.exitCode = 1;
}

function buildReport({ rollup, promptPack, roadmap, syncBoard }) {
  const failures = [];
  if (rollup.status !== 'kosmo_evening_batch_rollup_ready') failures.push(`Rollup not ready: ${rollup.status}`);
  if (promptPack.status !== 'owner_unlock_prompt_pack_ready') failures.push(`Prompt pack not ready: ${promptPack.status}`);
  if (roadmap.status !== 'vision_completion_roadmap_ready') failures.push(`Roadmap not ready: ${roadmap.status}`);
  if (syncBoard.status !== 'overseer_sync_board_ready') failures.push(`Sync board not ready: ${syncBoard.status}`);
  const handoffRange = latestHandoffRange(syncBoard);

  const completedPacks = (rollup.packs || []).map((pack) => ({
    id: pack.id,
    status: pack.status,
    executable_now: pack.executable_now,
    public_ready_after_pack: pack.public_ready_after_pack
  }));

  const claudeActions = [
    action(`read_handoffs_${handoffRange.min}_to_${handoffRange.max}`, `Review newest Codex handoffs ${handoffRange.label} before changing shared Orbit/KosmoOverseer behavior.`, 'claude-code-overseer', false),
    action('verify_orbit_training_ontology_rollup_ui', 'Confirm KosmoOrbit DataPanel shows Training Template, Review Queue, Ontology Seed and Evening Rollup without private content.', 'claude-code-overseer', false),
    action('prepare_owner_reply_capture', 'Use Owner Unlock Prompt Pack as the next owner-facing input surface.', 'claude-code-overseer', false),
    action('review_training_scaffold_boundaries', 'Confirm training scaffold remains schema/review-only with no eval rows, embeddings or fine-tunes.', 'claude-code-overseer', false),
    action('do_not_apply_source_root_without_owner', 'Do not mutate source-root decision/session files until owner answer is explicit.', 'claude-code-overseer', false)
  ];

  const codexActions = [
    action('wait_for_owner_source_root_answer', 'After owner answer, record only explicit fields into intake/session files.', 'codex-central-overseer', false),
    action('run_post_answer_guard_chain', 'Run decision check, blocker refresh, activation preflight and matching readiness packs.', 'codex-central-overseer', false),
    action('maintain_training_ontology_guards', 'Keep eval template, review queue, ontology and rollup guards synced before any future data promotion.', 'codex-central-overseer', false),
    action('continue_source_free_schema_work_if_needed', 'If no owner answer arrives, continue only source-free schemas, UI status and guard work.', 'codex-central-overseer', false)
  ];

  return {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    status: failures.length === 0 ? 'overseer_next_shift_brief_ready' : 'overseer_next_shift_brief_needs_review',
    policy: {
      brief_only: true,
      reads_private_content: false,
      records_owner_decisions: false,
      mutates_session_files: false,
      executes_commands: false,
      runs_private_inventory_now: false,
      executes_local_workers_now: false,
      public_ready_after_brief: 0
    },
    source_refs: [
      relative(root, rollupPath),
      relative(root, promptPackPath),
      relative(root, roadmapPath),
      relative(root, syncBoardPath)
    ],
    summary: {
      completed_packs: completedPacks.length,
      claude_actions: claudeActions.length,
      codex_actions: codexActions.length,
      owner_gates: rollup.summary?.owner_gates ?? 2,
      latest_handoffs: syncBoard.summary?.latest_handoffs ?? null,
      latest_handoff_min: handoffRange.min,
      latest_handoff_max: handoffRange.max,
      latest_handoff_range: handoffRange.label,
      latest_mirror_missing: syncBoard.summary?.latest_handoff_mirror_missing_files ?? null,
      training_eval_templates: rollup.summary?.training_eval_templates ?? null,
      training_review_lanes: rollup.summary?.training_review_lanes ?? null,
      ontology_entity_types: rollup.summary?.ontology_entity_types ?? null,
      failures: failures.length,
      public_ready_after_brief: 0
    },
    completed_packs: completedPacks,
    claude_actions: claudeActions,
    codex_actions: codexActions,
    owner_prompt: {
      source: relative(root, promptPackPath),
      required_owner_reply_format: promptPack.prompt_blocks?.[0]?.lines || [],
      safe_default_reply: promptPack.prompt_blocks?.[1]?.lines || [],
      unlock_reply_requires_exact_confirmation: true
    },
    tomorrow_first_sequence_after_owner_answer: [
      'npm run kosmo:owner-unlock-prompt-pack-check',
      'npm run kosmo:owner-unlock-reply-validator -- --answer "<owner_reply>"',
      'npm run kosmo:owner-unlock-answer-dry-run -- --answer "<owner_reply>"',
      'npm run kosmo:source-root-decision-session-check',
      'npm run kosmo:source-root-blocker-refresh',
      'npm run kosmo:source-root-activation-preflight',
      'npm run kosmo:source-root-post-owner-activation-queue',
      'npm run kosmo:source-root-post-owner-activation-queue-check'
    ],
    hard_stops: [
      'Do not infer owner answers from chat context or prepared prompt packs.',
      'Do not run private inventory until explicit owner answer and source-root guards pass.',
      'Do not expose private source paths, file contents, OCR text, scans, plans or worker bodies in Orbit.',
      'Do not create eval rows, queue items, embeddings or fine-tunes from this brief.',
      'Do not execute local workers from this brief.',
      'Do not set public-ready.'
    ],
    failures
  };
}

function action(id, description, owner, executableNow) {
  return {
    id,
    description,
    owner,
    executable_now: executableNow,
    public_ready_after_action: 0
  };
}

function latestHandoffRange(syncBoard) {
  const numbers = (syncBoard.latest_handoffs || [])
    .map((handoff) => Number((handoff.filename?.match(/synergiebericht-(\d+)/) || [])[1]))
    .filter(Number.isFinite);
  if (numbers.length === 0) return { min: 0, max: 0, label: 'n/a' };
  const min = Math.min(...numbers);
  const max = Math.max(...numbers);
  return { min, max, label: `${min}-${max}` };
}

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

function renderMarkdown(report) {
  const lines = [];
  lines.push('# Kosmo Overseer Next Shift Brief');
  lines.push('');
  lines.push(`Generated: ${report.generated_at}`);
  lines.push(`Status: \`${report.status}\``);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Completed packs: ${report.summary.completed_packs}`);
  lines.push(`- Claude actions: ${report.summary.claude_actions}`);
  lines.push(`- Codex actions: ${report.summary.codex_actions}`);
  lines.push(`- Owner gates: ${report.summary.owner_gates}`);
  lines.push(`- Latest handoffs: ${report.summary.latest_handoffs} (${report.summary.latest_handoff_range})`);
  lines.push(`- Latest mirror missing: ${report.summary.latest_mirror_missing}`);
  lines.push(`- Training eval templates: ${report.summary.training_eval_templates}`);
  lines.push(`- Training review lanes: ${report.summary.training_review_lanes}`);
  lines.push(`- Ontology entity types: ${report.summary.ontology_entity_types}`);
  lines.push(`- Public-ready after brief: ${report.summary.public_ready_after_brief}`);
  lines.push('');
  lines.push('## Claude Actions');
  lines.push('');
  report.claude_actions.forEach((item) => lines.push(`- \`${item.id}\`: ${item.description}`));
  lines.push('');
  lines.push('## Codex Actions');
  lines.push('');
  report.codex_actions.forEach((item) => lines.push(`- \`${item.id}\`: ${item.description}`));
  lines.push('');
  lines.push('## Owner Prompt');
  lines.push('');
  lines.push(`- Source: \`${report.owner_prompt.source}\``);
  lines.push('- Required reply format:');
  report.owner_prompt.required_owner_reply_format.forEach((line) => lines.push(`  - \`${line}\``));
  lines.push('- Safe default reply:');
  report.owner_prompt.safe_default_reply.forEach((line) => lines.push(`  - \`${line}\``));
  lines.push('');
  lines.push('## Tomorrow First Sequence After Owner Answer');
  lines.push('');
  report.tomorrow_first_sequence_after_owner_answer.forEach((command) => lines.push(`- ${command}`));
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
