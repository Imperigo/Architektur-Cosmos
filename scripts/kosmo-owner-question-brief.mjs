#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = new Date().toISOString().slice(0, 10);
const answerSheetPath = resolve(root, args.answerSheet || `data/kosmo-owner-answer-sheet-${dateStamp}.json`);
const intakePath = resolve(
  root,
  args.intake || `examples/kosmo-references/provenance/owner-answer-intake-template-${dateStamp}.json`
);
const sessionEditPlanPath = resolve(root, args.editPlan || `data/kosmo-owner-answer-session-edit-plan-${dateStamp}.json`);
const outputJson = resolve(root, args.out || `data/kosmo-owner-question-brief-${dateStamp}.json`);
const outputMd = resolve(root, args.markdown || `docs/codex/kosmo-owner-question-brief-${dateStamp}.md`);

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const answerSheet = JSON.parse(await readFile(answerSheetPath, 'utf8'));
  const intake = JSON.parse(await readFile(intakePath, 'utf8'));
  const sessionEditPlan = JSON.parse(await readFile(sessionEditPlanPath, 'utf8'));
  const sourceRoot = getSection(answerSheet, 'source-root-decision');
  const cards = getSection(answerSheet, 'owner-review-cards').cards;

  const questions = [
    {
      id: 'source-root',
      title: 'Private Source-Root',
      question: 'Welcher Pfad ist die echte grosse Buch-/ETH-/HSLU-Architektur-Library, oder soll alles blockiert bleiben bis Archiv/OneDrive sauber sichtbar ist?',
      safe_default: sourceRoot.safe_default,
      allowed_answers: sourceRoot.allowed_decisions,
      answer_field: 'source_root_answer.selected_decision',
      note_field: 'source_root_answer.owner_note'
    },
    ...cards.map((card) => ({
      id: card.batch_id,
      title: card.label,
      question: card.question,
      safe_default: card.safe_default,
      allowed_answers: card.options,
      answer_field: `owner_card_answers.${card.batch_id}.owner_choice`,
      note_field: `owner_card_answers.${card.batch_id}.owner_note`
    }))
  ];

  const brief = {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    status: 'owner_question_brief_ready',
    policy: {
      records_decisions: false,
      writes_session_files: false,
      writes_public_files: false,
      writes_public_manifest: false,
      public_ready_after_brief: 0,
      note: 'This brief is owner-facing question copy only. Answers must be entered into the intake template and checked before any session edit plan.'
    },
    source_refs: [
      relative(root, answerSheetPath),
      relative(root, intakePath),
      relative(root, sessionEditPlanPath)
    ],
    summary: {
      questions: questions.length,
      source_root_questions: 1,
      owner_card_questions: cards.length,
      intake_status: intake.status,
      session_edit_plan_status: sessionEditPlan.status,
      planned_edits: sessionEditPlan.summary?.planned_edits ?? null,
      public_ready_after_brief: 0
    },
    questions,
    answer_flow: [
      'Owner answers this brief in plain language.',
      'Codex/Claude transfers explicitly confirmed answers into the owner answer intake template.',
      'Run npm run kosmo:owner-answer-intake-check.',
      'Run npm run kosmo:owner-answer-session-edit-plan.',
      'Only then review any planned session edit.'
    ]
  };

  await mkdir(dirname(outputJson), { recursive: true });
  await mkdir(dirname(outputMd), { recursive: true });
  await writeFile(outputJson, `${JSON.stringify(brief, null, 2)}\n`);
  await writeFile(outputMd, renderMarkdown(brief));

  console.log('Kosmo owner question brief');
  console.log(`Status: ${brief.status}`);
  console.log(`Questions: ${brief.summary.questions}`);
  console.log(`Wrote: ${relative(root, outputMd)}`);
}

function getSection(sheet, id) {
  const section = (sheet.sections || []).find((candidate) => candidate.id === id);
  if (!section) throw new Error(`Missing answer sheet section: ${id}`);
  return section;
}

function renderMarkdown(brief) {
  const lines = [];
  lines.push('# Kosmo Owner Question Brief');
  lines.push('');
  lines.push(`Generated: ${brief.generated_at}`);
  lines.push(`Status: \`${brief.status}\``);
  lines.push('');
  lines.push('## Guardrails');
  lines.push('');
  lines.push('- Diese Fragen schreiben keine Entscheidungen.');
  lines.push('- Public-ready bleibt 0.');
  lines.push('- Antworten muessen spaeter in das Intake Template uebertragen und geprueft werden.');
  lines.push('');
  lines.push('## Fragen');
  for (const question of brief.questions) {
    lines.push('');
    lines.push(`### ${question.title}`);
    lines.push('');
    lines.push(question.question);
    lines.push('');
    lines.push(`- Safe default: \`${question.safe_default}\``);
    lines.push(`- Erlaubte Antworten: ${question.allowed_answers.map((answer) => `\`${answer}\``).join(', ')}`);
    lines.push('');
    lines.push('```text');
    lines.push('Antwort:');
    lines.push('Notiz:');
    lines.push('```');
  }
  lines.push('');
  lines.push('## Antwortfluss');
  lines.push('');
  brief.answer_flow.forEach((step) => lines.push(`- ${step}`));
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
