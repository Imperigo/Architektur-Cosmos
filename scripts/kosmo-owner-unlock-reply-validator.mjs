#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = new Date().toISOString().slice(0, 10);

const promptPackPath = resolve(root, args.promptPack || `data/kosmo-owner-unlock-prompt-pack-${dateStamp}.json`);
const answer = String(args.answer || '').trim();
const outputJson = resolve(root, args.out || `data/kosmo-owner-unlock-reply-validator-${dateStamp}.json`);
const outputMd = resolve(root, args.markdown || `docs/codex/kosmo-owner-unlock-reply-validator-${dateStamp}.md`);

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const promptPack = await readJson(promptPackPath);
  const report = buildReport(promptPack, answer);

  await mkdir(dirname(outputJson), { recursive: true });
  await mkdir(dirname(outputMd), { recursive: true });
  await writeFile(outputJson, `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(outputMd, renderMarkdown(report));

  console.log('Kosmo owner unlock reply validator');
  console.log(`Status: ${report.status}`);
  console.log(`Answer present: ${report.summary.answer_present ? 'yes' : 'no'}`);
  console.log(`Valid: ${report.summary.valid ? 'yes' : 'no'}`);
  console.log(`Failures: ${report.summary.failures}`);
  console.log(`Public-ready after validation: ${report.summary.public_ready_after_validation}`);
  console.log(`Wrote: ${relative(root, outputMd)}`);

  if (report.failures.length > 0) process.exitCode = 1;
}

function buildReport(promptPack, rawAnswer) {
  const failures = [];
  if (promptPack.status !== 'owner_unlock_prompt_pack_ready') failures.push(`Prompt pack not ready: ${promptPack.status}`);

  const parsed = parseOwnerAnswer(rawAnswer);
  const sourceRootQuestion = (promptPack.questions || []).find((question) => question.id === 'source_root_choice');
  const reviewBatchQuestion = (promptPack.questions || []).find((question) => question.id === 'review_batch_scope');
  const allowedSourceChoices = new Set((sourceRootQuestion?.allowed_answers || []).map((item) => item.answer));
  const allowedReviewChoices = new Set(['none', 'all_review_only', 'batch-a', 'batch-b', 'batch-c', 'batch-d', 'batch-e']);

  const answerPresent = rawAnswer.length > 0;
  if (answerPresent) {
    if (!parsed.source_root_choice) failures.push('Missing source_root_choice.');
    if (parsed.source_root_choice && !allowedSourceChoices.has(parsed.source_root_choice)) failures.push(`Invalid source_root_choice: ${parsed.source_root_choice}`);
    if (!['yes', 'no'].includes(parsed.confirmed_exact_root || '')) failures.push('confirmed_exact_root must be yes or no.');
    if (parsed.source_root_choice === 'select_exact_root_1' && parsed.confirmed_exact_root !== 'yes') {
      failures.push('select_exact_root_1 requires confirmed_exact_root=yes.');
    }
    if (parsed.source_root_choice !== 'select_exact_root_1' && parsed.confirmed_exact_root === 'yes') {
      failures.push('confirmed_exact_root=yes is only allowed with select_exact_root_1.');
    }
    const reviewBatches = splitList(parsed.review_batches || 'none');
    const invalidBatches = reviewBatches.filter((item) => !allowedReviewChoices.has(item));
    if (invalidBatches.length > 0) failures.push(`Invalid review_batches: ${invalidBatches.join(', ')}`);
  }

  const status = !answerPresent
    ? 'owner_unlock_reply_validator_pending_owner_reply'
    : failures.length === 0
      ? 'owner_unlock_reply_valid'
      : 'owner_unlock_reply_invalid';

  return {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    status,
    policy: {
      validator_only: true,
      records_decisions: false,
      mutates_intake_template: false,
      mutates_session_files: false,
      executes_commands: false,
      reads_private_content: false,
      runs_private_inventory_now: false,
      public_ready_after_validation: 0
    },
    source_refs: [relative(root, promptPackPath)],
    summary: {
      answer_present: answerPresent,
      valid: answerPresent && failures.length === 0,
      source_root_choices: allowedSourceChoices.size,
      review_batch_choices: reviewBatchQuestion?.allowed_answers?.length ?? null,
      failures: failures.length,
      public_ready_after_validation: 0
    },
    parsed_answer: answerPresent ? parsed : null,
    required_format: promptPack.prompt_blocks?.[0]?.lines || [],
    safe_default_reply: promptPack.prompt_blocks?.[1]?.lines || [],
    next_actions: answerPresent && failures.length === 0
      ? [
          'Copy only explicit validated fields into owner answer intake/session files.',
          'Run owner answer intake check, session edit plan and source-root guards.',
          'Do not run private inventory unless the selected branch permits it and guards pass.'
        ]
      : [
          'Wait for explicit owner reply in the required format.',
          'Keep source-root and review batches pending.'
        ],
    hard_stops: [
      'Do not treat a valid reply as an applied decision.',
      'Do not mutate intake or session files from this validator.',
      'Do not run commands from this validator.',
      'Do not read private content.',
      'Keep public-ready at 0.'
    ],
    failures
  };
}

function parseOwnerAnswer(rawAnswer) {
  const parsed = {};
  rawAnswer.split(/[;\n]/).forEach((part) => {
    const [key, ...rest] = part.split('=');
    if (!key || rest.length === 0) return;
    parsed[key.trim()] = rest.join('=').trim();
  });
  return parsed;
}

function splitList(value) {
  return String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

function renderMarkdown(report) {
  const lines = [];
  lines.push('# Kosmo Owner Unlock Reply Validator');
  lines.push('');
  lines.push(`Generated: ${report.generated_at}`);
  lines.push(`Status: \`${report.status}\``);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Answer present: ${report.summary.answer_present ? 'yes' : 'no'}`);
  lines.push(`- Valid: ${report.summary.valid ? 'yes' : 'no'}`);
  lines.push(`- Source-root choices: ${report.summary.source_root_choices}`);
  lines.push(`- Review batch choices: ${report.summary.review_batch_choices}`);
  lines.push(`- Failures: ${report.summary.failures}`);
  lines.push(`- Public-ready after validation: ${report.summary.public_ready_after_validation}`);
  lines.push('');
  lines.push('## Required Format');
  lines.push('');
  report.required_format.forEach((line) => lines.push(`- \`${line}\``));
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
