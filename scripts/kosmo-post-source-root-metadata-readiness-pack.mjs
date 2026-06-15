#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = new Date().toISOString().slice(0, 10);

const activationQueuePath = resolve(root, args.activationQueue || `data/kosmo-source-root-post-owner-activation-queue-${dateStamp}.json`);
const inventoryRunnerPath = resolve(root, args.inventoryRunner || `data/kosmo-private-metadata-inventory-runner-${dateStamp}.json`);
const inventoryCheckPath = resolve(root, args.inventoryCheck || `data/kosmo-private-metadata-inventory-check-${dateStamp}.json`);
const ownerBriefPath = resolve(root, args.ownerBrief || `data/kosmo-owner-remaining-decision-brief-${dateStamp}.json`);
const roadmapPath = resolve(root, args.roadmap || `data/kosmo-vision-completion-roadmap-${dateStamp}.json`);
const outputJson = resolve(root, args.out || `data/kosmo-post-source-root-metadata-readiness-pack-${dateStamp}.json`);
const outputMd = resolve(root, args.markdown || `docs/codex/kosmo-post-source-root-metadata-readiness-pack-${dateStamp}.md`);

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const activationQueue = await readJson(activationQueuePath);
  const inventoryRunner = await readJson(inventoryRunnerPath);
  const inventoryCheck = await readJson(inventoryCheckPath);
  const ownerBrief = await readJson(ownerBriefPath);
  const roadmap = await readJson(roadmapPath);
  const report = buildReport({ activationQueue, inventoryRunner, inventoryCheck, ownerBrief, roadmap });

  await mkdir(dirname(outputJson), { recursive: true });
  await mkdir(dirname(outputMd), { recursive: true });
  await writeFile(outputJson, `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(outputMd, renderMarkdown(report));

  console.log('Kosmo post-source-root metadata readiness pack');
  console.log(`Status: ${report.status}`);
  console.log(`Command sequence: ${report.summary.command_sequence_steps}`);
  console.log(`Blocked now: ${report.summary.blocked_now}`);
  console.log(`Failures: ${report.summary.failures}`);
  console.log(`Public-ready after pack: ${report.summary.public_ready_after_pack}`);
  console.log(`Wrote: ${relative(root, outputMd)}`);

  if (report.failures.length > 0) process.exitCode = 1;
}

function buildReport({ activationQueue, inventoryRunner, inventoryCheck, ownerBrief, roadmap }) {
  const failures = [];
  if (activationQueue.status !== 'source_root_post_owner_activation_queue_ready') failures.push(`Activation queue not ready: ${activationQueue.status}`);
  if (inventoryRunner.status !== 'private_metadata_inventory_blocked_until_activation') failures.push(`Inventory runner not blocked as expected: ${inventoryRunner.status}`);
  if (inventoryCheck.status !== 'private_metadata_inventory_guard_passed') failures.push(`Inventory check not passed: ${inventoryCheck.status}`);
  const ownerBriefAccepted = [
    'owner_remaining_decision_brief_ready',
    'owner_remaining_decision_brief_needs_review'
  ].includes(ownerBrief.status);
  if (!ownerBriefAccepted) failures.push(`Owner brief not in a guarded review state: ${ownerBrief.status}`);
  if (roadmap.status !== 'vision_completion_roadmap_ready') failures.push(`Roadmap not ready: ${roadmap.status}`);

  const commandSequence = [
    command('record_owner_source_root_choice', 'owner_or_overseer', 'Record explicit owner answer in decision session; no automatic selection.', false),
    command('source_root_decision_session_check', 'codex_or_claude', 'npm run kosmo:source-root-decision-session-check', false),
    command('source_root_blocker_refresh', 'codex_or_claude', 'npm run kosmo:source-root-blocker-refresh', false),
    command('source_root_activation_preflight', 'codex_or_claude', 'npm run kosmo:source-root-activation-preflight', false),
    command('post_owner_activation_queue', 'codex_or_claude', 'npm run kosmo:source-root-post-owner-activation-queue', false),
    command('post_owner_activation_queue_check', 'codex_or_claude', 'npm run kosmo:source-root-post-owner-activation-queue-check', false),
    command('private_metadata_inventory', 'codex_or_claude_after_activation', 'npm run kosmo:private-metadata-inventory', true),
    command('private_metadata_inventory_check', 'codex_or_claude_after_inventory', 'npm run kosmo:private-metadata-inventory-check', true),
    command('day_batch_loop', 'codex_or_claude', 'npm run kosmo:day-batch-loop', false)
  ];

  return {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    status: failures.length === 0
      ? 'post_source_root_metadata_readiness_pack_ready'
      : 'post_source_root_metadata_readiness_pack_needs_review',
    policy: {
      readiness_only: true,
      records_decisions: false,
      reads_private_content: false,
      runs_private_inventory_now: false,
      writes_public_files: false,
      public_ready_after_pack: 0
    },
    source_refs: [
      relative(root, activationQueuePath),
      relative(root, inventoryRunnerPath),
      relative(root, inventoryCheckPath),
      relative(root, ownerBriefPath),
      relative(root, roadmapPath)
    ],
    summary: {
      command_sequence_steps: commandSequence.length,
      blocked_now: activationQueue.summary?.blocked_now ?? 7,
      owner_actions_required: ownerBrief.summary?.open_owner_actions ?? 2,
      inventory_runner_status: inventoryRunner.status,
      inventory_guard_status: inventoryCheck.status,
      private_inventory_commands_after_owner: commandSequence.filter((item) => item.private_inventory_related).length,
      failures: failures.length,
      public_ready_after_pack: 0
    },
    command_sequence: commandSequence,
    expected_private_inventory_output_contract: {
      output_root: inventoryRunner.summary?.private_output_root ?? null,
      writes_to_git: false,
      contains_raw_paths: false,
      contains_file_contents: false,
      contains_ocr_text: false,
      contains_public_ready_true: false,
      required_guard: 'npm run kosmo:private-metadata-inventory-check'
    },
    hard_stops: [
      'Do not run private metadata inventory before source-root activation preflight is ready.',
      'Do not record owner decisions automatically.',
      'Do not read private file contents or OCR/PDF text during metadata inventory.',
      'Do not copy private inventory outputs into Git.',
      'Do not set public-ready.'
    ],
    failures
  };
}

function command(id, actor, action, privateInventoryRelated) {
  return {
    id,
    actor,
    action,
    private_inventory_related: privateInventoryRelated,
    executable_now: false,
    requires_owner_source_root_answer: true,
    public_ready_after_command: 0
  };
}

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

function renderMarkdown(report) {
  const lines = [];
  lines.push('# Kosmo Post-Source-Root Metadata Readiness Pack');
  lines.push('');
  lines.push(`Generated: ${report.generated_at}`);
  lines.push(`Status: \`${report.status}\``);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Command sequence steps: ${report.summary.command_sequence_steps}`);
  lines.push(`- Blocked now: ${report.summary.blocked_now}`);
  lines.push(`- Owner actions required: ${report.summary.owner_actions_required}`);
  lines.push(`- Inventory runner: ${report.summary.inventory_runner_status}`);
  lines.push(`- Inventory guard: ${report.summary.inventory_guard_status}`);
  lines.push(`- Private inventory commands after owner: ${report.summary.private_inventory_commands_after_owner}`);
  lines.push(`- Public-ready after pack: ${report.summary.public_ready_after_pack}`);
  lines.push('');
  lines.push('## Command Sequence');
  lines.push('');
  lines.push('| Step | Actor | Action | Private inventory | Executable now |');
  lines.push('| --- | --- | --- | --- | --- |');
  report.command_sequence.forEach((item) => {
    lines.push(`| \`${item.id}\` | ${item.actor} | ${item.action} | ${item.private_inventory_related ? 'yes' : 'no'} | ${item.executable_now ? 'yes' : 'no'} |`);
  });
  lines.push('');
  lines.push('## Expected Output Contract');
  lines.push('');
  Object.entries(report.expected_private_inventory_output_contract).forEach(([key, value]) => {
    lines.push(`- ${key}: ${value}`);
  });
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
