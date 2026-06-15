#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = new Date().toISOString().slice(0, 10);

const promptPackPath = resolve(root, args.promptPack || `data/kosmo-owner-unlock-prompt-pack-${dateStamp}.json`);
const validatorPath = resolve(root, args.validator || `data/kosmo-owner-unlock-reply-validator-${dateStamp}.json`);
const answer = String(args.answer || '').trim();
const outputJson = resolve(root, args.out || `data/kosmo-owner-unlock-fast-reply-card-${dateStamp}.json`);
const outputMd = resolve(root, args.markdown || `docs/codex/kosmo-owner-unlock-fast-reply-card-${dateStamp}.md`);

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const promptPack = await readJson(promptPackPath);
  const validator = await readOptionalJson(validatorPath);
  const report = buildReport(promptPack, validator, answer);

  await mkdir(dirname(outputJson), { recursive: true });
  await mkdir(dirname(outputMd), { recursive: true });
  await writeFile(outputJson, `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(outputMd, renderMarkdown(report));

  console.log('Kosmo owner unlock fast reply card');
  console.log(`Status: ${report.status}`);
  console.log(`Broad unlock intent: ${report.summary.broad_unlock_intent ? 'yes' : 'no'}`);
  console.log(`Suggested replies: ${report.summary.suggested_replies}`);
  console.log(`Applies decision now: ${report.summary.applies_decision_now ? 'yes' : 'no'}`);
  console.log(`Public-ready after card: ${report.summary.public_ready_after_card}`);
  console.log(`Wrote: ${relative(root, outputMd)}`);

  if (report.failures.length > 0) process.exitCode = 1;
}

function buildReport(promptPack, validator, rawAnswer) {
  const failures = [];
  if (promptPack.status !== 'owner_unlock_prompt_pack_ready') failures.push(`Prompt pack not ready: ${promptPack.status}`);

  const unlockBlock = (promptPack.prompt_blocks || []).find((block) => block.id === 'unlock_reply_only_if_true');
  const safeBlock = (promptPack.prompt_blocks || []).find((block) => block.id === 'safe_default_reply');
  const broadUnlockIntent = detectBroadUnlockIntent(rawAnswer);
  const validatorRejected = validator?.status === 'owner_unlock_reply_invalid';

  const unlockReply = unlockBlock?.lines || [
    'source_root_choice=select_exact_root_1',
    'confirmed_exact_root=yes',
    'review_batches=all_review_only',
    'note=/mnt/archiv/ArchitekturKosmos/Assets ist die vollstaendige private Architekturquelle fuer den naechsten Metadata-Diagnostic-Lauf.'
  ];
  const safeDefaultReply = safeBlock?.lines || [
    'source_root_choice=repair_onedrive_first',
    'confirmed_exact_root=no',
    'review_batches=none',
    'note=Quelle bleibt blockiert, bis die vollstaendige private Architekturquelle bestaetigt ist.'
  ];

  return {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    status: failures.length === 0
      ? 'owner_unlock_fast_reply_card_ready'
      : 'owner_unlock_fast_reply_card_needs_review',
    policy: {
      review_only: true,
      records_owner_decision: false,
      mutates_intake_files: false,
      runs_source_root_guards: false,
      reads_private_content: false,
      runs_private_inventory_now: false,
      public_ready_after_card: 0
    },
    source_refs: [
      relative(root, promptPackPath),
      validator ? relative(root, validatorPath) : null
    ].filter(Boolean),
    summary: {
      answer_present: rawAnswer.length > 0,
      broad_unlock_intent: broadUnlockIntent,
      validator_status: validator?.status || 'missing',
      validator_rejected_freeform: validatorRejected,
      suggested_replies: 2,
      applies_decision_now: false,
      failures: failures.length,
      public_ready_after_card: 0
    },
    owner_context: {
      raw_answer: rawAnswer || null,
      interpretation: broadUnlockIntent
        ? 'Owner likely wants to unlock, but exact gate syntax is still required.'
        : 'Owner intent is not specific enough to suggest unlock as the primary reply.'
    },
    recommended_reply_if_exact_root_is_true: unlockReply,
    safe_default_reply: safeDefaultReply,
    next_actions: [
      'Owner can send exactly one of the reply blocks.',
      'After an exact reply, rerun owner-unlock-reply-validator and owner-unlock-answer-dry-run.',
      'Only after those pass may source-root activation preflight run.'
    ],
    hard_stops: [
      'Do not treat this card as owner approval.',
      'Do not rewrite the owner reply automatically.',
      'Do not edit intake/session files from this card.',
      'Do not read private content.',
      'Keep public-ready at 0.'
    ],
    failures
  };
}

function detectBroadUnlockIntent(value) {
  const normalized = String(value || '').toLowerCase();
  return [
    'alles frei',
    'gebe alles frei',
    'ich gebe alles frei',
    'freigabe',
    'unlock',
    'all clear'
  ].some((pattern) => normalized.includes(pattern));
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
  lines.push('# Kosmo Owner Unlock Fast Reply Card');
  lines.push('');
  lines.push(`Generated: ${report.generated_at}`);
  lines.push(`Status: \`${report.status}\``);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Answer present: ${report.summary.answer_present ? 'yes' : 'no'}`);
  lines.push(`- Broad unlock intent: ${report.summary.broad_unlock_intent ? 'yes' : 'no'}`);
  lines.push(`- Validator status: ${report.summary.validator_status}`);
  lines.push(`- Applies decision now: ${report.summary.applies_decision_now ? 'yes' : 'no'}`);
  lines.push(`- Public-ready after card: ${report.summary.public_ready_after_card}`);
  lines.push('');
  lines.push('## Recommended Reply If Exact Root Is True');
  lines.push('');
  report.recommended_reply_if_exact_root_is_true.forEach((line) => lines.push(`- \`${line}\``));
  lines.push('');
  lines.push('## Safe Default Reply');
  lines.push('');
  report.safe_default_reply.forEach((line) => lines.push(`- \`${line}\``));
  lines.push('');
  lines.push('## Next Actions');
  lines.push('');
  report.next_actions.forEach((action) => lines.push(`- ${action}`));
  lines.push('');
  lines.push('## Hard Stops');
  lines.push('');
  report.hard_stops.forEach((item) => lines.push(`- ${item}`));
  lines.push('');
  if (report.failures.length > 0) {
    lines.push('## Failures');
    lines.push('');
    report.failures.forEach((failure) => lines.push(`- ${failure}`));
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
