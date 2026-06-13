#!/usr/bin/env node

import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import { dirname, isAbsolute, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = new Date().toISOString().slice(0, 10);
const intakePath = resolve(
  root,
  args.intake || `examples/kosmo-references/provenance/owner-answer-intake-template-${dateStamp}.json`
);
const answerSheetPath = resolve(root, args.answerSheet || `data/kosmo-owner-answer-sheet-${dateStamp}.json`);
const outputJson = resolve(root, args.out || `data/kosmo-owner-answer-intake-check-${dateStamp}.json`);
const outputMd = resolve(root, args.markdown || `docs/codex/kosmo-owner-answer-intake-check-${dateStamp}.md`);

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const intake = JSON.parse(await readFile(intakePath, 'utf8'));
  const answerSheet = JSON.parse(await readFile(answerSheetPath, 'utf8'));
  const sourceRoot = getSection(answerSheet, 'source-root-decision');
  const ownerCards = getSection(answerSheet, 'owner-review-cards');
  const referenceDecisions = getSection(answerSheet, 'reference-owner-decisions');

  const findings = [
    ...checkPolicy(intake),
    ...await checkSourceRootAnswer(intake.source_root_answer, sourceRoot),
    ...checkOwnerCardAnswers(intake.owner_card_answers || [], ownerCards),
    ...checkReferenceDecisionAnswers(intake.reference_decision_answers || [], referenceDecisions)
  ];

  const failures = findings.filter((finding) => finding.severity === 'failure');
  const warnings = findings.filter((finding) => finding.severity === 'warning');
  const filledOwnerCards = (intake.owner_card_answers || []).filter((answer) => answer.owner_choice).length;
  const filledReferenceDecisions = (intake.reference_decision_answers || []).filter((answer) => answer.selected_decision).length;
  const sourceRootFilled = Boolean(intake.source_root_answer?.selected_decision);
  const filledAnswers = (sourceRootFilled ? 1 : 0) + filledOwnerCards + filledReferenceDecisions;

  const report = {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    status: failures.length === 0
      ? filledAnswers > 0
        ? 'owner_answer_intake_guard_passed_with_answers'
        : 'owner_answer_intake_guard_passed_pending_owner_input'
      : 'owner_answer_intake_guard_failed',
    policy: {
      reads_private_content: false,
      writes_session_files: false,
      records_decisions: false,
      writes_public_files: false,
      writes_public_manifest: false,
      public_ready_after_guard: 0,
      note: 'This guard validates owner answer intake only. It never applies answers to decision sessions.'
    },
    source_refs: [relative(root, intakePath), relative(root, answerSheetPath)],
    summary: {
      source_root_answer_present: sourceRootFilled,
      owner_card_answers: (intake.owner_card_answers || []).length,
      owner_card_answers_present: filledOwnerCards,
      reference_decision_answers: (intake.reference_decision_answers || []).length,
      reference_decision_answers_present: filledReferenceDecisions,
      filled_answers: filledAnswers,
      failures: failures.length,
      warnings: warnings.length,
      public_ready_after_guard: 0
    },
    findings,
    next_actions: failures.length === 0
      ? [
          'If filled_answers is 0, keep waiting for owner input.',
          'If filled_answers is greater than 0, Codex/Claude may prepare a separate reviewed session edit plan.',
          'Do not apply source-root or owner decisions without explicit owner confirmation and follow-up checks.'
        ]
      : [
          'Fix intake failures before using any owner answer.',
          'Rerun npm run kosmo:owner-answer-intake-check.'
        ]
  };

  await mkdir(dirname(outputJson), { recursive: true });
  await mkdir(dirname(outputMd), { recursive: true });
  await writeFile(outputJson, `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(outputMd, renderMarkdown(report));

  console.log('Kosmo owner answer intake check');
  console.log(`Status: ${report.status}`);
  console.log(`Filled answers: ${report.summary.filled_answers}`);
  console.log(`Failures: ${report.summary.failures}`);
  console.log(`Warnings: ${report.summary.warnings}`);
  console.log(`Wrote: ${relative(root, outputMd)}`);

  if (failures.length > 0) process.exitCode = 1;
}

function checkPolicy(intake) {
  const findings = [];
  expect(intake.policy?.records_decisions === false, findings, 'records_decisions_false', 'Intake must not record decisions.');
  expect(intake.policy?.writes_session_files === false, findings, 'writes_session_files_false', 'Intake must not write session files.');
  expect(intake.policy?.writes_public_files === false, findings, 'writes_public_files_false', 'Intake must not write public files.');
  expect(intake.policy?.writes_public_manifest === false, findings, 'writes_public_manifest_false', 'Intake must not write public manifests.');
  expect(intake.policy?.public_ready_after_intake === 0, findings, 'public_ready_after_intake_zero', 'Intake must keep public_ready_after_intake at 0.');
  return findings;
}

async function checkSourceRootAnswer(answer, section) {
  const findings = [];
  expect(Boolean(answer), findings, 'source_root_answer_present', 'Source-root answer block must exist.');
  if (!answer) return findings;

  const selected = answer.selected_decision;
  const allowed = new Set(section.allowed_decisions || []);
  expect(selected === null || allowed.has(selected), findings, 'source_root_selected_decision_allowed', 'Source-root selected_decision must be null or an allowed decision.');
  expect(answer.safe_default === section.safe_default, findings, 'source_root_safe_default_match', 'Source-root safe default must match answer sheet.');
  expect(answer.public_ready_after_decision !== true, findings, 'source_root_no_public_ready_flag', 'Source-root intake must not contain a public-ready flag.');

  if (selected === 'select_existing_root_for_private_diagnostic') {
    const rootPath = answer.selected_root_path;
    expect(typeof rootPath === 'string' && isAbsolute(rootPath), findings, 'source_root_path_absolute', 'Selected root path must be an absolute path.');
    expect(await exists(rootPath), findings, 'source_root_path_exists', 'Selected root path must exist before private diagnostic is allowed.');
  }

  if (['keep_blocked', 'mount_archive_first', 'repair_onedrive_first', 'select_root_after_mount_check', null].includes(selected) && answer.selected_root_path) {
    findings.push({
      id: 'source_root_path_without_selected_root',
      severity: 'warning',
      message: 'selected_root_path is set although selected_decision does not select an existing root.'
    });
  }

  return findings;
}

function checkOwnerCardAnswers(answers, section) {
  const findings = [];
  const cardsById = new Map((section.cards || []).map((card) => [card.batch_id, card]));
  expect(answers.length === cardsById.size, findings, 'owner_card_answer_count_match', 'Owner card answer count must match answer sheet cards.');
  for (const answer of answers) {
    const card = cardsById.get(answer.batch_id);
    expect(Boolean(card), findings, `owner_card_known:${answer.batch_id}`, `Owner card ${answer.batch_id} must exist in answer sheet.`);
    if (!card) continue;
    const allowed = new Set(card.options || []);
    expect(answer.owner_choice === null || allowed.has(answer.owner_choice), findings, `owner_card_choice_allowed:${answer.batch_id}`, `Owner card ${answer.batch_id} choice must be null or allowed.`);
    expect(answer.public_ready_after_card === 0, findings, `owner_card_public_ready_zero:${answer.batch_id}`, `Owner card ${answer.batch_id} must keep public_ready_after_card at 0.`);
  }
  return findings;
}

function checkReferenceDecisionAnswers(answers, section) {
  const findings = [];
  const decisionsById = new Map((section.decisions || []).map((decision) => [decision.item_id, decision]));
  const allowed = new Set(section.allowed_decisions || []);
  expect(answers.length === decisionsById.size, findings, 'reference_answer_count_match', 'Reference answer count must match answer sheet decisions.');
  for (const answer of answers) {
    const decision = decisionsById.get(answer.item_id);
    expect(Boolean(decision), findings, `reference_decision_known:${answer.item_id}`, `Reference decision ${answer.item_id} must exist in answer sheet.`);
    if (!decision) continue;
    expect(answer.selected_decision === null || allowed.has(answer.selected_decision), findings, `reference_decision_choice_allowed:${answer.item_id}`, `Reference decision ${answer.item_id} selected_decision must be null or allowed.`);
    expect(answer.public_ready_after_decision === false, findings, `reference_decision_public_ready_false:${answer.item_id}`, `Reference decision ${answer.item_id} must keep public_ready_after_decision false.`);
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

async function exists(path) {
  try {
    await access(path, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

function renderMarkdown(report) {
  const lines = [];
  lines.push('# Kosmo Owner Answer Intake Check');
  lines.push('');
  lines.push(`Generated: ${report.generated_at}`);
  lines.push(`Status: \`${report.status}\``);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Source-root answer present: ${report.summary.source_root_answer_present ? 'yes' : 'no'}`);
  lines.push(`- Owner card answers present: ${report.summary.owner_card_answers_present}/${report.summary.owner_card_answers}`);
  lines.push(`- Reference decision answers present: ${report.summary.reference_decision_answers_present}/${report.summary.reference_decision_answers}`);
  lines.push(`- Filled answers: ${report.summary.filled_answers}`);
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
