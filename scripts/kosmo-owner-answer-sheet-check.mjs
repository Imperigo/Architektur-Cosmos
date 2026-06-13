#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = new Date().toISOString().slice(0, 10);

const answerSheetPath = resolve(root, args.answerSheet || `data/kosmo-owner-answer-sheet-${dateStamp}.json`);
const ownerCardSetPath = resolve(root, args.ownerCardSet || `data/kosmo-owner-review-card-set-${dateStamp}.json`);
const sourceRootSessionPath = resolve(
  root,
  args.sourceRootSession || 'examples/kosmo-references/provenance/source-root-decision-session-2026-06-13.json'
);
const ownerDecisionSessionPath = resolve(
  root,
  args.ownerDecisionSession || 'examples/kosmo-references/provenance/owner-review-decision-session-2026-06-13.json'
);
const outputJson = resolve(root, args.out || `data/kosmo-owner-answer-sheet-check-${dateStamp}.json`);
const outputMd = resolve(root, args.markdown || `docs/codex/kosmo-owner-answer-sheet-check-${dateStamp}.md`);

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const answerSheet = JSON.parse(await readFile(answerSheetPath, 'utf8'));
  const ownerCardSet = JSON.parse(await readFile(ownerCardSetPath, 'utf8'));
  const sourceRootSession = JSON.parse(await readFile(sourceRootSessionPath, 'utf8'));
  const ownerDecisionSession = JSON.parse(await readFile(ownerDecisionSessionPath, 'utf8'));

  const findings = [
    ...checkAnswerSheetPolicy(answerSheet),
    ...checkSourceRefs(answerSheet),
    ...checkSourceRootSection(answerSheet, sourceRootSession),
    ...checkOwnerCards(answerSheet, ownerCardSet),
    ...checkReferenceDecisions(answerSheet, ownerDecisionSession)
  ];

  const failures = findings.filter((finding) => finding.severity === 'failure');
  const warnings = findings.filter((finding) => finding.severity === 'warning');
  const report = {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    status: failures.length === 0 ? 'owner_answer_sheet_guard_passed' : 'owner_answer_sheet_guard_failed',
    policy: {
      reads_private_content: false,
      writes_session_files: false,
      records_decisions: false,
      writes_public_files: false,
      writes_public_manifest: false,
      public_ready_after_guard: 0,
      note: 'This guard validates the owner answer sheet contract only. It never records decisions or changes source/session files.'
    },
    source_refs: [
      relative(root, answerSheetPath),
      relative(root, ownerCardSetPath),
      relative(root, sourceRootSessionPath),
      relative(root, ownerDecisionSessionPath)
    ],
    summary: {
      answer_sheet_status: answerSheet.status,
      owner_cards: ownerCardSet.summary?.cards ?? null,
      answer_sheet_owner_cards: answerSheet.summary?.owner_cards ?? null,
      answer_sheet_owner_card_items: answerSheet.summary?.owner_card_items ?? null,
      source_root_allowed_decisions: sourceRootSession.allowed_decisions?.length ?? null,
      answer_sheet_source_root_options: answerSheet.summary?.source_root_options ?? null,
      owner_reference_decisions: ownerDecisionSession.decisions?.length ?? null,
      answer_sheet_reference_decisions: answerSheet.summary?.owner_reference_decisions ?? null,
      public_ready_after_guard: 0,
      failures: failures.length,
      warnings: warnings.length
    },
    findings,
    next_actions: failures.length === 0
      ? [
          'Use docs/codex/kosmo-owner-answer-sheet-2026-06-13.md for owner capture only.',
          'Do not copy answer fields into decision sessions until the owner explicitly confirms them.',
          'After any explicit owner decision is recorded, rerun source-root/owner decision checks and the full data-lane sweep.'
        ]
      : [
          'Fix owner answer sheet contract failures before presenting or applying owner answers.',
          'Rerun npm run kosmo:owner-answer-sheet and npm run kosmo:owner-answer-sheet-check.'
        ]
  };

  await mkdir(dirname(outputJson), { recursive: true });
  await mkdir(dirname(outputMd), { recursive: true });
  await writeFile(outputJson, `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(outputMd, renderMarkdown(report));

  console.log('Kosmo owner answer sheet check');
  console.log(`Status: ${report.status}`);
  console.log(`Failures: ${report.summary.failures}`);
  console.log(`Warnings: ${report.summary.warnings}`);
  console.log(`Wrote: ${relative(root, outputMd)}`);

  if (failures.length > 0) process.exitCode = 1;
}

function checkAnswerSheetPolicy(sheet) {
  const findings = [];
  expect(sheet.status === 'owner_answer_sheet_ready', findings, 'answer_sheet_status', 'Answer sheet status must be owner_answer_sheet_ready.');
  expect(sheet.policy?.records_decisions === false, findings, 'records_decisions_false', 'Answer sheet must not record decisions.');
  expect(sheet.policy?.writes_session_files === false, findings, 'writes_session_files_false', 'Answer sheet must not write session files.');
  expect(sheet.policy?.public_ready_after_sheet === 0, findings, 'public_ready_zero', 'Answer sheet must keep public_ready_after_sheet at 0.');
  expect(sheet.summary?.public_ready_after_sheet === 0, findings, 'summary_public_ready_zero', 'Answer sheet summary must keep public_ready_after_sheet at 0.');
  return findings;
}

function checkSourceRefs(sheet) {
  const refs = new Set(sheet.source_refs || []);
  const requiredRefs = [
    'examples/kosmo-references/provenance/source-root-decision-session-2026-06-13.json',
    'data/kosmo-owner-review-card-set-2026-06-13.json',
    'examples/kosmo-references/provenance/owner-review-decision-session-2026-06-13.json'
  ];
  return requiredRefs.map((ref) => ({
    id: `source_ref:${ref}`,
    severity: refs.has(ref) ? 'passed' : 'failure',
    message: refs.has(ref) ? `Source ref present: ${ref}` : `Missing source ref: ${ref}`
  }));
}

function checkSourceRootSection(sheet, session) {
  const findings = [];
  const section = getSection(sheet, 'source-root-decision');
  expect(Boolean(section), findings, 'source_root_section_present', 'Source-root section must exist.');
  if (!section) return findings;

  expect(sameSet(section.allowed_decisions, session.allowed_decisions), findings, 'source_root_allowed_decisions_match', 'Source-root allowed decisions must match the decision session.');
  expect(section.safe_default === 'keep_blocked', findings, 'source_root_safe_default', 'Source-root safe default must stay keep_blocked.');
  expect(section.current_selected_decision === session.selected_decision, findings, 'source_root_selected_decision_reflects_session', 'Source-root selected decision must only reflect the session state.');
  expect(section.current_selected_root_path === session.selected_root_path, findings, 'source_root_selected_path_reflects_session', 'Source-root selected path must only reflect the session state.');
  expect((section.top_options || []).length === (session.selection_options || []).length, findings, 'source_root_option_count_match', 'Source-root option count must match the decision session.');
  expect((sheet.summary?.source_root_options ?? null) === (session.selection_options || []).length, findings, 'summary_source_root_options_match', 'Answer sheet source-root option count must match session options.');
  return findings;
}

function checkOwnerCards(sheet, cardSet) {
  const findings = [];
  const section = getSection(sheet, 'owner-review-cards');
  expect(Boolean(section), findings, 'owner_cards_section_present', 'Owner review card section must exist.');
  if (!section) return findings;

  const cards = section.cards || [];
  expect(cards.length === (cardSet.cards || []).length, findings, 'owner_card_count_match', 'Owner card count must match the card set.');
  expect((sheet.summary?.owner_cards ?? null) === cards.length, findings, 'summary_owner_cards_match', 'Answer sheet owner card summary must match section cards.');
  expect((sheet.summary?.owner_card_items ?? null) === cards.reduce((sum, card) => sum + (card.items || 0), 0), findings, 'summary_owner_card_items_match', 'Answer sheet owner card item summary must match section cards.');
  for (const card of cards) {
    expect(card.public_ready_after_card === 0, findings, `owner_card_public_ready_zero:${card.batch_id}`, `Owner card ${card.batch_id} must keep public_ready_after_card at 0.`);
  }
  return findings;
}

function checkReferenceDecisions(sheet, session) {
  const findings = [];
  const section = getSection(sheet, 'reference-owner-decisions');
  expect(Boolean(section), findings, 'reference_decisions_section_present', 'Reference decision section must exist.');
  if (!section) return findings;

  const decisions = section.decisions || [];
  expect(sameSet(section.allowed_decisions, session.allowed_decisions), findings, 'reference_allowed_decisions_match', 'Reference allowed decisions must match owner decision session.');
  expect(decisions.length === (session.decisions || []).length, findings, 'reference_decision_count_match', 'Reference decision count must match owner decision session.');
  expect((sheet.summary?.owner_reference_decisions ?? null) === decisions.length, findings, 'summary_reference_decisions_match', 'Answer sheet reference decision summary must match section decisions.');
  for (const decision of decisions) {
    expect(decision.public_ready_after_decision === false, findings, `reference_public_ready_false:${decision.item_id}`, `Reference decision ${decision.item_id} must keep public_ready_after_decision false.`);
  }
  return findings;
}

function getSection(sheet, id) {
  return (sheet.sections || []).find((section) => section.id === id);
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
  lines.push('# Kosmo Owner Answer Sheet Check');
  lines.push('');
  lines.push(`Generated: ${report.generated_at}`);
  lines.push(`Status: \`${report.status}\``);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Answer sheet: ${report.summary.answer_sheet_status}`);
  lines.push(`- Owner cards: ${report.summary.answer_sheet_owner_cards}/${report.summary.owner_cards}`);
  lines.push(`- Owner card items: ${report.summary.answer_sheet_owner_card_items}`);
  lines.push(`- Source-root options: ${report.summary.answer_sheet_source_root_options}`);
  lines.push(`- Reference decisions: ${report.summary.answer_sheet_reference_decisions}/${report.summary.owner_reference_decisions}`);
  lines.push(`- Public-ready after guard: ${report.summary.public_ready_after_guard}`);
  lines.push(`- Failures: ${report.summary.failures}`);
  lines.push(`- Warnings: ${report.summary.warnings}`);
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
