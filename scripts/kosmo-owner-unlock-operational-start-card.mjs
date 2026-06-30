#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = new Date().toISOString().slice(0, 10);

const refs = {
  checkpoint: resolve(root, args.checkpoint || `data/kosmo-owner-unlock-pipeline-checkpoint-${dateStamp}.json`),
  sessionEditPreview: resolve(root, args.sessionEditPreview || `data/kosmo-owner-unlock-session-edit-preview-${dateStamp}.json`),
  postOwnerQueue: resolve(root, args.postOwnerQueue || `data/kosmo-source-root-post-owner-activation-queue-${dateStamp}.json`),
  fastReplyCard: resolve(root, args.fastReplyCard || `data/kosmo-owner-unlock-fast-reply-card-${dateStamp}.json`),
  tomorrowBatch: resolve(root, args.tomorrowBatch || `data/kosmo-tomorrow-day-batch-${dateStamp}.json`),
  syncBoard: resolve(root, args.syncBoard || `data/kosmo-overseer-sync-board-${dateStamp}.json`)
};

const outputJson = resolve(root, args.out || `data/kosmo-owner-unlock-operational-start-card-${dateStamp}.json`);
const outputMd = resolve(root, args.markdown || `docs/codex/kosmo-owner-unlock-operational-start-card-${dateStamp}.md`);

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const reports = {};
  for (const [key, path] of Object.entries(refs)) reports[key] = await readJson(path);
  const card = buildCard(reports);

  await mkdir(dirname(outputJson), { recursive: true });
  await mkdir(dirname(outputMd), { recursive: true });
  await writeFile(outputJson, `${JSON.stringify(card, null, 2)}\n`);
  await writeFile(outputMd, renderMarkdown(card));

  console.log('Kosmo owner unlock operational start card');
  console.log(`Status: ${card.status}`);
  console.log(`Ready components: ${card.summary.ready_components}/${card.summary.components}`);
  console.log(`Next commands: ${card.summary.next_commands}`);
  console.log(`Blocked commands: ${card.summary.blocked_commands}`);
  console.log(`Writes now: ${card.summary.writes_now ? 'yes' : 'no'}`);
  console.log(`Public-ready after card: ${card.summary.public_ready_after_card}`);
  console.log(`Wrote: ${relative(root, outputMd)}`);
}

function buildCard(reports) {
  const expectedSessionFile = `examples/kosmo-references/provenance/source-root-decision-session-${dateStamp}.json`;
  const exactOwnerReply = exactReplyText(reports.fastReplyCard);
  const nextCommands = [
    `npm run kosmo:owner-unlock-reply-validator -- --answer "${exactOwnerReply}"`,
    `npm run kosmo:owner-unlock-answer-dry-run -- --answer "${exactOwnerReply}"`,
    'npm run kosmo:owner-unlock-session-edit-preview',
    'npm run kosmo:owner-unlock-session-edit-preview-check',
    'npm run kosmo:source-root-decision-session-check',
    'npm run kosmo:source-root-blocker-refresh',
    'npm run kosmo:source-root-activation-preflight',
    'npm run kosmo:source-root-post-owner-activation-queue',
    'npm run kosmo:source-root-post-owner-activation-queue-check'
  ];
  const blockedCommands = [
    'npm run kosmo:private-metadata-inventory',
    'npm run kosmo:private-library-diagnostic -- --roots "<selected-root>"',
    'private OCR/PDF/book extraction',
    'local LLM private-content task assignment',
    'public-ready promotion'
  ];

  const components = [
    readyComponent('pipeline_checkpoint', reports.checkpoint.status === 'owner_unlock_pipeline_checkpoint_ready'),
    readyComponent('session_edit_preview', reports.sessionEditPreview.status === 'owner_unlock_session_edit_preview_ready'),
    readyComponent('post_owner_queue', [
      'source_root_post_owner_activation_queue_ready',
      'source_root_post_owner_activation_queue_needs_review'
    ].includes(reports.postOwnerQueue.status)),
    readyComponent('fast_reply_card', reports.fastReplyCard.status === 'owner_unlock_fast_reply_card_ready'),
    readyComponent('tomorrow_batch', reports.tomorrowBatch.status === 'tomorrow_day_batch_ready'),
    readyComponent('sync_board', reports.syncBoard.status === 'overseer_sync_board_ready')
  ];
  const sourceRootSessionEdit = (reports.sessionEditPreview.preview_edits || [])
    .find((edit) => edit.id === 'source-root-session-record-preview');
  const postOwnerRecordStep = (reports.postOwnerQueue.queue_steps || [])
    .find((step) => step.id === 'record_owner_decision');
  const failures = [];

  if (!exactOwnerReply.includes('/mnt/archiv/ArchitekturKosmos/Assets')) failures.push('Exact owner reply is missing selected source root.');
  if (reports.checkpoint.summary?.source_root_state !== 'blocked_until_explicit_owner_reply_and_guards') failures.push('Source-root state is not blocked.');
  if (reports.checkpoint.summary?.applies_decision_now !== false) failures.push('Checkpoint would apply a decision now.');
  if (reports.sessionEditPreview.summary?.writes_now !== false) failures.push('Session edit preview writes now.');
  if (reports.postOwnerQueue.summary?.executable_now !== 0 || reports.postOwnerQueue.summary?.blocked_now !== reports.postOwnerQueue.summary?.queue_steps) {
    failures.push('Post-owner queue is not fully blocked while decision is pending.');
  }
  if (sourceRootSessionEdit?.target_file !== expectedSessionFile) failures.push(`Session edit target is not current date: ${sourceRootSessionEdit?.target_file || 'missing'}`);
  if (!String(postOwnerRecordStep?.command || '').includes(expectedSessionFile)) failures.push(`Post-owner record step does not point to ${expectedSessionFile}.`);

  return {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    status: failures.length === 0 && components.every((component) => component.ready)
      ? 'owner_unlock_operational_start_card_ready'
      : 'owner_unlock_operational_start_card_needs_review',
    policy: {
      card_only: true,
      records_decisions: false,
      writes_intake_now: false,
      writes_session_files_now: false,
      executes_commands_now: false,
      reads_private_content_now: false,
      runs_private_inventory_now: false,
      runs_local_llm_now: false,
      public_ready_after_card: 0
    },
    source_refs: Object.values(refs).map((path) => relative(root, path)),
    summary: {
      components: components.length,
      ready_components: components.filter((component) => component.ready).length,
      checkpoint_status: reports.checkpoint.status,
      checkpoint_guards: `${reports.checkpoint.summary?.guard_checks_passed}/${reports.checkpoint.summary?.guard_checks}`,
      owner_reply_state: reports.checkpoint.summary?.owner_reply_state || null,
      source_root_state: reports.checkpoint.summary?.source_root_state || null,
      selected_root_path_preview: reports.checkpoint.summary?.selected_root_path_preview || reports.sessionEditPreview.summary?.selected_root_path || null,
      selected_root_exists_preview: reports.checkpoint.summary?.selected_root_exists_preview === true,
      expected_session_file: expectedSessionFile,
      session_edit_preview_writes_now: reports.sessionEditPreview.summary?.writes_now === true,
      post_owner_queue_steps: reports.postOwnerQueue.summary?.queue_steps || null,
      post_owner_queue_executable_now: reports.postOwnerQueue.summary?.executable_now ?? null,
      post_owner_queue_blocked_now: reports.postOwnerQueue.summary?.blocked_now ?? null,
      next_commands: nextCommands.length,
      blocked_commands: blockedCommands.length,
      writes_now: false,
      failures: failures.length,
      public_ready_after_card: 0
    },
    components,
    exact_owner_reply_template: exactOwnerReply,
    next_commands_after_exact_reply: nextCommands,
    blocked_commands_until_guards_pass: blockedCommands,
    worker_notes: {
      codex: 'Start with this card, then run checkpoint and queue guards before any private metadata task.',
      claude_code: 'Do not apply the session edit unless the exact owner reply is present and reviewed.',
      local_llm: 'No private-content work is executable from this card.',
      kosmo_overseer: 'Treat this as an operational checklist, not owner approval.'
    },
    hard_stops: [
      'Do not treat broad freeform approval as exact owner reply.',
      'Do not write intake or session files from this card.',
      'Do not run private inventory, OCR, embeddings or local LLM private tasks from this card.',
      'Do not change public-ready state.'
    ],
    failures
  };
}

function exactReplyText(fastReplyCard) {
  const direct = fastReplyCard?.suggested_replies?.find((reply) => reply.id === 'path_a_exact_root_assets')?.reply_text;
  if (direct) return direct;
  return [
    'source_root_choice=select_exact_root_1',
    'confirmed_exact_root=yes',
    'review_batches=all_review_only',
    'note=/mnt/archiv/ArchitekturKosmos/Assets ist die vollstaendige private Architekturquelle fuer den naechsten Metadata-Diagnostic-Lauf.'
  ].join('; ');
}

function readyComponent(id, ready) {
  return { id, ready };
}

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

function renderMarkdown(card) {
  const lines = [];
  lines.push('# Kosmo Owner Unlock Operational Start Card');
  lines.push('');
  lines.push(`Generated: ${card.generated_at}`);
  lines.push(`Status: \`${card.status}\``);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Components: ${card.summary.ready_components}/${card.summary.components}`);
  lines.push(`- Checkpoint: ${card.summary.checkpoint_status} (${card.summary.checkpoint_guards})`);
  lines.push(`- Owner reply state: ${card.summary.owner_reply_state}`);
  lines.push(`- Source-root state: ${card.summary.source_root_state}`);
  lines.push(`- Selected root preview: ${card.summary.selected_root_path_preview || '-'}`);
  lines.push(`- Selected root exists preview: ${card.summary.selected_root_exists_preview ? 'yes' : 'no'}`);
  lines.push(`- Expected session file: \`${card.summary.expected_session_file}\``);
  lines.push(`- Queue: ${card.summary.post_owner_queue_steps} steps, executable ${card.summary.post_owner_queue_executable_now}, blocked ${card.summary.post_owner_queue_blocked_now}`);
  lines.push(`- Writes now: ${card.summary.writes_now ? 'yes' : 'no'}`);
  lines.push(`- Public-ready after card: ${card.summary.public_ready_after_card}`);
  lines.push('');
  lines.push('## Exact Owner Reply Template');
  lines.push('');
  lines.push('```text');
  lines.push(card.exact_owner_reply_template);
  lines.push('```');
  lines.push('');
  lines.push('## Next Commands After Exact Reply');
  lines.push('');
  card.next_commands_after_exact_reply.forEach((command) => lines.push(`- \`${command}\``));
  lines.push('');
  lines.push('## Blocked Commands');
  lines.push('');
  card.blocked_commands_until_guards_pass.forEach((command) => lines.push(`- \`${command}\``));
  lines.push('');
  lines.push('## Worker Notes');
  lines.push('');
  Object.entries(card.worker_notes).forEach(([worker, note]) => lines.push(`- ${worker}: ${note}`));
  lines.push('');
  lines.push('## Hard Stops');
  lines.push('');
  card.hard_stops.forEach((item) => lines.push(`- ${item}`));
  lines.push('');
  if (card.failures.length > 0) {
    lines.push('## Failures');
    lines.push('');
    card.failures.forEach((failure) => lines.push(`- ${failure}`));
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
