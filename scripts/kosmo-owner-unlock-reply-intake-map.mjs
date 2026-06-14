#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = new Date().toISOString().slice(0, 10);

const validatorPath = resolve(root, args.validator || `data/kosmo-owner-unlock-reply-validator-${dateStamp}.json`);
const promptPackPath = resolve(root, args.promptPack || `data/kosmo-owner-unlock-prompt-pack-${dateStamp}.json`);
const intakeTemplatePath = resolve(
  root,
  args.intake || `examples/kosmo-references/provenance/owner-answer-intake-template-${dateStamp}.json`
);
const outputJson = resolve(root, args.out || `data/kosmo-owner-unlock-reply-intake-map-${dateStamp}.json`);
const outputMd = resolve(root, args.markdown || `docs/codex/kosmo-owner-unlock-reply-intake-map-${dateStamp}.md`);

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const validator = await readJson(validatorPath);
  const promptPack = await readJson(promptPackPath);
  const intakeTemplate = await readJson(intakeTemplatePath);
  const report = buildReport({ validator, promptPack, intakeTemplate });

  await mkdir(dirname(outputJson), { recursive: true });
  await mkdir(dirname(outputMd), { recursive: true });
  await writeFile(outputJson, `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(outputMd, renderMarkdown(report));

  console.log('Kosmo owner unlock reply intake map');
  console.log(`Status: ${report.status}`);
  console.log(`Patch ready: ${report.summary.patch_ready ? 'yes' : 'no'}`);
  console.log(`Patch operations: ${report.summary.patch_operations}`);
  console.log(`Public-ready after map: ${report.summary.public_ready_after_map}`);
  console.log(`Wrote: ${relative(root, outputMd)}`);
}

function buildReport({ validator, promptPack, intakeTemplate }) {
  const parsed = validator.parsed_answer || {};
  const sourceChoice = parsed.source_root_choice || null;
  const sourceRootQuestion = (promptPack.questions || []).find((question) => question.id === 'source_root_choice');
  const sourceOption = (sourceRootQuestion?.allowed_answers || []).find((option) => option.answer === sourceChoice);
  const reviewBatches = splitList(parsed.review_batches || 'none');
  const ownerCardPatch = buildOwnerCardPatch(reviewBatches, intakeTemplate.owner_card_answers || [], parsed.note || '');

  const sourceRootPatch = validator.status === 'owner_unlock_reply_valid'
    ? {
        selected_decision: sourceOption?.selected_decision_for_intake ?? null,
        selected_root_path: sourceOption?.selected_root_path_for_intake ?? null,
        owner_note: parsed.note || '',
        public_ready_after_decision: 0
      }
    : null;

  const patchOperations = [
    sourceRootPatch ? {
      target: 'source_root_answer',
      operation: 'set_validated_owner_answer',
      value: sourceRootPatch
    } : null,
    ...ownerCardPatch.map((patch) => ({
      target: `owner_card_answers.${patch.batch_id}`,
      operation: 'set_review_only_owner_choice',
      value: patch
    }))
  ].filter(Boolean);

  const status = validator.status === 'owner_unlock_reply_valid'
    ? 'owner_unlock_reply_intake_map_ready_for_review'
    : validator.status === 'owner_unlock_reply_invalid'
      ? 'owner_unlock_reply_intake_map_blocked_by_invalid_reply'
      : 'owner_unlock_reply_intake_map_pending_owner_reply';

  return {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    status,
    policy: {
      map_only: true,
      writes_intake_file: false,
      records_decisions: false,
      mutates_session_files: false,
      executes_commands: false,
      reads_private_content: false,
      runs_private_inventory_now: false,
      public_ready_after_map: 0
    },
    source_refs: [
      relative(root, validatorPath),
      relative(root, promptPackPath),
      relative(root, intakeTemplatePath)
    ],
    summary: {
      validator_status: validator.status,
      patch_ready: validator.status === 'owner_unlock_reply_valid',
      source_root_choice: sourceChoice,
      review_batches: reviewBatches,
      patch_operations: patchOperations.length,
      owner_card_patches: ownerCardPatch.length,
      public_ready_after_map: 0
    },
    proposed_intake_patch: {
      source_root_answer: sourceRootPatch,
      owner_card_answers: ownerCardPatch,
      reference_decision_answers: []
    },
    patch_operations: patchOperations,
    next_actions: validator.status === 'owner_unlock_reply_valid'
      ? [
          'Review this map before editing the owner answer intake template.',
          'Apply only these proposed fields to the intake template if Claude/Codex agree.',
          'After intake edit, run owner-answer-intake-check before any session edit plan.'
        ]
      : [
          'Wait for a valid owner unlock reply validator report.',
          'Do not edit intake or session files from this map.'
        ],
    hard_stops: [
      'Do not apply this map automatically.',
      'Do not write the intake file from this script.',
      'Do not mutate session files.',
      'Do not read private content.',
      'Do not run private inventory.',
      'Keep public-ready at 0.'
    ]
  };
}

function buildOwnerCardPatch(reviewBatches, cards, ownerNote) {
  const requested = expandReviewBatches(reviewBatches);
  if (requested.size === 0) return [];
  const mapping = {
    'batch-a': {
      batch_id: 'batch-a-villa-savoye-image-candidates',
      owner_choice: 'needs_more_context'
    },
    'batch-b': {
      batch_id: 'batch-b-villa-savoye-derived-files',
      owner_choice: 'use_safe_default'
    },
    'batch-c': {
      batch_id: 'batch-c-model-promotion-confirmation',
      owner_choice: 'use_safe_default'
    },
    'batch-d': {
      batch_id: 'batch-d-sogn-benedetg-source-gap',
      owner_choice: 'use_safe_default'
    },
    'batch-e': {
      batch_id: 'batch-e-kosmoasset-human-reviews',
      owner_choice: 'keep_needs_review'
    }
  };

  const cardById = new Map(cards.map((card) => [card.batch_id, card]));
  return [...requested].map((batchKey) => {
    const mapped = mapping[batchKey];
    const card = cardById.get(mapped.batch_id);
    return {
      batch_id: mapped.batch_id,
      owner_choice: mapped.owner_choice,
      owner_note: ownerNote,
      allowed_by_template: (card?.allowed_choices || []).includes(mapped.owner_choice),
      public_ready_after_card: 0
    };
  });
}

function expandReviewBatches(reviewBatches) {
  const normalized = new Set(reviewBatches.filter((batch) => batch !== 'none'));
  if (normalized.has('all_review_only')) {
    return new Set(['batch-a', 'batch-b', 'batch-c', 'batch-d', 'batch-e']);
  }
  return normalized;
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
  lines.push('# Kosmo Owner Unlock Reply Intake Map');
  lines.push('');
  lines.push(`Generated: ${report.generated_at}`);
  lines.push(`Status: \`${report.status}\``);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Validator status: ${report.summary.validator_status}`);
  lines.push(`- Patch ready: ${report.summary.patch_ready ? 'yes' : 'no'}`);
  lines.push(`- Source-root choice: ${report.summary.source_root_choice || '-'}`);
  lines.push(`- Review batches: ${report.summary.review_batches.join(', ') || '-'}`);
  lines.push(`- Patch operations: ${report.summary.patch_operations}`);
  lines.push(`- Owner card patches: ${report.summary.owner_card_patches}`);
  lines.push(`- Public-ready after map: ${report.summary.public_ready_after_map}`);
  lines.push('');
  lines.push('## Patch Operations');
  lines.push('');
  if (report.patch_operations.length === 0) {
    lines.push('- none');
  } else {
    report.patch_operations.forEach((operation) => {
      lines.push(`- ${operation.operation} -> \`${operation.target}\``);
    });
  }
  lines.push('');
  lines.push('## Next Actions');
  lines.push('');
  report.next_actions.forEach((action) => lines.push(`- ${action}`));
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
