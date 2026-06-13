#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = new Date().toISOString().slice(0, 10);
const briefPath = resolve(root, args.brief || `data/kosmo-owner-question-brief-${dateStamp}.json`);
const answerSheetPath = resolve(root, args.answerSheet || `data/kosmo-owner-answer-sheet-${dateStamp}.json`);
const outputJson = resolve(root, args.out || `data/kosmo-owner-question-brief-check-${dateStamp}.json`);
const outputMd = resolve(root, args.markdown || `docs/codex/kosmo-owner-question-brief-check-${dateStamp}.md`);

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const brief = JSON.parse(await readFile(briefPath, 'utf8'));
  const answerSheet = JSON.parse(await readFile(answerSheetPath, 'utf8'));
  const ownerCards = getSection(answerSheet, 'owner-review-cards').cards || [];
  const sourceRoot = getSection(answerSheet, 'source-root-decision');

  const findings = [
    ...checkPolicy(brief),
    ...checkSummary(brief, ownerCards),
    ...checkQuestions(brief, ownerCards, sourceRoot)
  ];
  const failures = findings.filter((finding) => finding.severity === 'failure');
  const warnings = findings.filter((finding) => finding.severity === 'warning');

  const report = {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    status: failures.length === 0 ? 'owner_question_brief_guard_passed' : 'owner_question_brief_guard_failed',
    policy: {
      records_decisions: false,
      writes_session_files: false,
      writes_public_files: false,
      writes_public_manifest: false,
      public_ready_after_guard: 0,
      note: 'This guard validates owner-facing question copy only. It never records answers or applies decisions.'
    },
    source_refs: [relative(root, briefPath), relative(root, answerSheetPath)],
    summary: {
      brief_status: brief.status,
      questions: brief.summary?.questions ?? null,
      expected_questions: 1 + ownerCards.length,
      failures: failures.length,
      warnings: warnings.length,
      public_ready_after_guard: 0
    },
    findings,
    next_actions: failures.length === 0
      ? [
          'Use docs/codex/kosmo-owner-question-brief-2026-06-13.md as the next owner-facing question block.',
          'Transfer only explicitly confirmed owner answers into the owner answer intake template.',
          'Keep all decisions blocked until intake check and session edit plan pass.'
        ]
      : [
          'Fix owner question brief contract failures before using the brief.',
          'Rerun npm run kosmo:owner-question-brief and npm run kosmo:owner-question-brief-check.'
        ]
  };

  await mkdir(dirname(outputJson), { recursive: true });
  await mkdir(dirname(outputMd), { recursive: true });
  await writeFile(outputJson, `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(outputMd, renderMarkdown(report));

  console.log('Kosmo owner question brief check');
  console.log(`Status: ${report.status}`);
  console.log(`Failures: ${report.summary.failures}`);
  console.log(`Warnings: ${report.summary.warnings}`);
  console.log(`Wrote: ${relative(root, outputMd)}`);

  if (failures.length > 0) process.exitCode = 1;
}

function checkPolicy(brief) {
  const findings = [];
  expect(brief.status === 'owner_question_brief_ready', findings, 'brief_status_ready', 'Question brief status must be owner_question_brief_ready.');
  expect(brief.policy?.records_decisions === false, findings, 'records_decisions_false', 'Question brief must not record decisions.');
  expect(brief.policy?.writes_session_files === false, findings, 'writes_session_files_false', 'Question brief must not write session files.');
  expect(brief.policy?.writes_public_files === false, findings, 'writes_public_files_false', 'Question brief must not write public files.');
  expect(brief.policy?.writes_public_manifest === false, findings, 'writes_public_manifest_false', 'Question brief must not write public manifests.');
  expect(brief.policy?.public_ready_after_brief === 0, findings, 'public_ready_after_brief_zero', 'Question brief must keep public_ready_after_brief at 0.');
  return findings;
}

function checkSummary(brief, ownerCards) {
  const expected = 1 + ownerCards.length;
  const findings = [];
  expect(brief.summary?.questions === expected, findings, 'question_count_match', `Question brief must contain ${expected} questions.`);
  expect(brief.summary?.source_root_questions === 1, findings, 'source_root_question_count', 'Question brief must contain one source-root question.');
  expect(brief.summary?.owner_card_questions === ownerCards.length, findings, 'owner_card_question_count', 'Question brief must contain one question per owner card.');
  expect(brief.summary?.planned_edits === 0, findings, 'planned_edits_zero', 'Question brief must not plan edits.');
  expect(brief.summary?.public_ready_after_brief === 0, findings, 'summary_public_ready_zero', 'Question brief summary must keep public-ready at 0.');
  return findings;
}

function checkQuestions(brief, ownerCards, sourceRoot) {
  const findings = [];
  const questions = brief.questions || [];
  const questionById = new Map(questions.map((question) => [question.id, question]));
  const sourceQuestion = questionById.get('source-root');
  expect(Boolean(sourceQuestion), findings, 'source_root_question_present', 'Source-root question must be present.');
  if (sourceQuestion) {
    expect(sourceQuestion.safe_default === sourceRoot.safe_default, findings, 'source_root_safe_default_match', 'Source-root safe default must match answer sheet.');
    expect(sameSet(sourceQuestion.allowed_answers, sourceRoot.allowed_decisions), findings, 'source_root_allowed_answers_match', 'Source-root allowed answers must match answer sheet.');
  }

  for (const card of ownerCards) {
    const question = questionById.get(card.batch_id);
    expect(Boolean(question), findings, `owner_card_question_present:${card.batch_id}`, `Owner card question ${card.batch_id} must be present.`);
    if (!question) continue;
    expect(question.safe_default === card.safe_default, findings, `owner_card_safe_default_match:${card.batch_id}`, `Owner card ${card.batch_id} safe default must match answer sheet.`);
    expect(sameSet(question.allowed_answers, card.options), findings, `owner_card_allowed_answers_match:${card.batch_id}`, `Owner card ${card.batch_id} allowed answers must match answer sheet.`);
    expect(typeof question.question === 'string' && question.question.length > 20, findings, `owner_card_question_text:${card.batch_id}`, `Owner card ${card.batch_id} must include usable question text.`);
  }

  return findings;
}

function getSection(sheet, id) {
  const section = (sheet.sections || []).find((candidate) => candidate.id === id);
  if (!section) throw new Error(`Missing answer sheet section: ${id}`);
  return section;
}

function expect(condition, findings, id, message) {
  findings.push({
    id,
    severity: condition ? 'passed' : 'failure',
    message
  });
}

function sameSet(left = [], right = []) {
  if (!Array.isArray(left) || !Array.isArray(right)) return false;
  if (left.length !== right.length) return false;
  const rightSet = new Set(right);
  return left.every((item) => rightSet.has(item));
}

function renderMarkdown(report) {
  const lines = [];
  lines.push('# Kosmo Owner Question Brief Check');
  lines.push('');
  lines.push(`Generated: ${report.generated_at}`);
  lines.push(`Status: \`${report.status}\``);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Brief status: ${report.summary.brief_status}`);
  lines.push(`- Questions: ${report.summary.questions}/${report.summary.expected_questions}`);
  lines.push(`- Failures: ${report.summary.failures}`);
  lines.push(`- Warnings: ${report.summary.warnings}`);
  lines.push(`- Public-ready after guard: ${report.summary.public_ready_after_guard}`);
  lines.push('');
  lines.push('## Findings');
  lines.push('');
  report.findings.forEach((finding) => {
    lines.push(`- ${finding.severity}: \`${finding.id}\` - ${finding.message}`);
  });
  lines.push('');
  lines.push('## Next Actions');
  lines.push('');
  report.next_actions.forEach((action) => lines.push(`- ${action}`));
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
