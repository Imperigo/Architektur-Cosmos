#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = new Date().toISOString().slice(0, 10);
const answerSheetPath = resolve(root, args.answerSheet || `data/kosmo-owner-answer-sheet-${dateStamp}.json`);
const outputJson = resolve(
  root,
  args.out || `examples/kosmo-references/provenance/owner-answer-intake-template-${dateStamp}.json`
);
const outputMd = resolve(root, args.markdown || `docs/codex/kosmo-owner-answer-intake-template-${dateStamp}.md`);

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const answerSheet = JSON.parse(await readFile(answerSheetPath, 'utf8'));
  const existingIntake = await readOptionalJson(outputJson);
  const sourceRoot = getSection(answerSheet, 'source-root-decision');
  const ownerCards = getSection(answerSheet, 'owner-review-cards');
  const referenceDecisions = getSection(answerSheet, 'reference-owner-decisions');
  const existingCardsById = new Map((existingIntake?.owner_card_answers || []).map((answer) => [answer.batch_id, answer]));
  const existingReferencesById = new Map((existingIntake?.reference_decision_answers || []).map((answer) => [`${answer.group_id}:${answer.item_id}`, answer]));

  const intake = {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    status: 'owner_answer_intake_template_pending_owner_input',
    policy: {
      records_decisions: false,
      writes_session_files: false,
      writes_public_files: false,
      writes_public_manifest: false,
      public_ready_after_intake: 0,
      note: 'This file is a machine-readable owner answer intake template only. Filling it does not apply decisions.'
    },
    source_refs: [relative(root, answerSheetPath)],
    source_root_answer: {
      selected_decision: existingIntake?.source_root_answer?.selected_decision ?? null,
      selected_root_path: existingIntake?.source_root_answer?.selected_root_path ?? null,
      owner_note: existingIntake?.source_root_answer?.owner_note ?? '',
      allowed_decisions: sourceRoot.allowed_decisions,
      safe_default: sourceRoot.safe_default,
      blocked_until_recorded_selection: sourceRoot.blocked_until_recorded_selection
    },
    owner_card_answers: ownerCards.cards.map((card) => ({
      batch_id: card.batch_id,
      label: card.label,
      owner_choice: existingCardsById.get(card.batch_id)?.owner_choice ?? null,
      owner_note: existingCardsById.get(card.batch_id)?.owner_note ?? '',
      allowed_choices: card.options,
      safe_default: card.safe_default,
      items: card.items,
      public_ready_after_card: 0
    })),
    reference_decision_answers: referenceDecisions.decisions.map((decision) => ({
      group_id: decision.group_id,
      item_id: decision.item_id,
      selected_decision: existingReferencesById.get(`${decision.group_id}:${decision.item_id}`)?.selected_decision ?? null,
      owner_note: existingReferencesById.get(`${decision.group_id}:${decision.item_id}`)?.owner_note ?? '',
      allowed_decisions: referenceDecisions.allowed_decisions,
      safe_default: decision.safe_default,
      public_ready_after_decision: false
    })),
    summary: {
      source_root_answer_present: Boolean(existingIntake?.source_root_answer?.selected_decision),
      owner_card_answers: ownerCards.cards.length,
      owner_card_answers_present: ownerCards.cards.filter((card) => existingCardsById.get(card.batch_id)?.owner_choice).length,
      reference_decision_answers: referenceDecisions.decisions.length,
      reference_decision_answers_present: referenceDecisions.decisions.filter((decision) => existingReferencesById.get(`${decision.group_id}:${decision.item_id}`)?.selected_decision).length,
      public_ready_after_intake: 0
    },
    next_actions: [
      'Owner or overseer may fill selected_decision/owner_choice fields only after explicit owner confirmation.',
      'Run npm run kosmo:owner-answer-intake-check before copying any answer into decision session files.',
      'Never treat this template as approval for public display or source ingestion.'
    ]
  };

  await mkdir(dirname(outputJson), { recursive: true });
  await mkdir(dirname(outputMd), { recursive: true });
  await writeFile(outputJson, `${JSON.stringify(intake, null, 2)}\n`);
  await writeFile(outputMd, renderMarkdown(intake));

  console.log('Kosmo owner answer intake template');
  console.log(`Status: ${intake.status}`);
  console.log(`Owner cards: ${intake.summary.owner_card_answers}`);
  console.log(`Reference decisions: ${intake.summary.reference_decision_answers}`);
  console.log(`Wrote: ${relative(root, outputMd)}`);
}

function getSection(sheet, id) {
  const section = (sheet.sections || []).find((candidate) => candidate.id === id);
  if (!section) throw new Error(`Missing answer sheet section: ${id}`);
  return section;
}

async function readOptionalJson(path) {
  try {
    return JSON.parse(await readFile(path, 'utf8'));
  } catch {
    return null;
  }
}

function renderMarkdown(intake) {
  const lines = [];
  lines.push('# Kosmo Owner Answer Intake Template');
  lines.push('');
  lines.push(`Generated: ${intake.generated_at}`);
  lines.push(`Status: \`${intake.status}\``);
  lines.push('');
  lines.push('## Guardrails');
  lines.push('');
  lines.push('- This template records no decisions.');
  lines.push('- Filling this file does not edit source-root or owner-review sessions.');
  lines.push('- Public-ready after intake: 0.');
  lines.push('- Run `npm run kosmo:owner-answer-intake-check` before any session edit.');
  lines.push('');
  lines.push('## Source-Root Answer');
  lines.push('');
  lines.push(`- Selected decision: ${intake.source_root_answer.selected_decision || 'null'}`);
  lines.push(`- Selected root path: ${intake.source_root_answer.selected_root_path || 'null'}`);
  lines.push(`- Safe default: \`${intake.source_root_answer.safe_default}\``);
  lines.push(`- Allowed decisions: ${intake.source_root_answer.allowed_decisions.map((decision) => `\`${decision}\``).join(', ')}`);
  lines.push('');
  lines.push('## Owner Card Answers');
  lines.push('');
  for (const answer of intake.owner_card_answers) {
    lines.push(`- \`${answer.batch_id}\`: ${answer.owner_choice || 'null'}; safe default \`${answer.safe_default}\`; choices ${answer.allowed_choices.map((choice) => `\`${choice}\``).join(', ')}`);
  }
  lines.push('');
  lines.push('## Reference Decision Answers');
  lines.push('');
  for (const answer of intake.reference_decision_answers) {
    lines.push(`- \`${answer.item_id}\`: ${answer.selected_decision || 'null'}; safe default \`${answer.safe_default}\``);
  }
  lines.push('');
  lines.push('## Next Actions');
  lines.push('');
  intake.next_actions.forEach((action) => lines.push(`- ${action}`));
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
