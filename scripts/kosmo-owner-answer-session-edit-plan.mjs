#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = new Date().toISOString().slice(0, 10);

const intakePath = resolve(
  root,
  args.intake || `examples/kosmo-references/provenance/owner-answer-intake-template-${dateStamp}.json`
);
const intakeCheckPath = resolve(root, args.intakeCheck || `data/kosmo-owner-answer-intake-check-${dateStamp}.json`);
const sourceRootSessionPath = resolve(
  root,
  args.sourceRootSession || 'examples/kosmo-references/provenance/source-root-decision-session-2026-06-13.json'
);
const ownerDecisionSessionPath = resolve(
  root,
  args.ownerDecisionSession || 'examples/kosmo-references/provenance/owner-review-decision-session-2026-06-13.json'
);
const outputJson = resolve(root, args.out || `data/kosmo-owner-answer-session-edit-plan-${dateStamp}.json`);
const outputMd = resolve(root, args.markdown || `docs/codex/kosmo-owner-answer-session-edit-plan-${dateStamp}.md`);

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const intake = JSON.parse(await readFile(intakePath, 'utf8'));
  const intakeCheck = JSON.parse(await readFile(intakeCheckPath, 'utf8'));
  const sourceRootSession = JSON.parse(await readFile(sourceRootSessionPath, 'utf8'));
  const ownerDecisionSession = JSON.parse(await readFile(ownerDecisionSessionPath, 'utf8'));

  const intakePassed = [
    'owner_answer_intake_guard_passed_pending_owner_input',
    'owner_answer_intake_guard_passed_with_answers'
  ].includes(intakeCheck.status) && intakeCheck.summary?.failures === 0;

  const plannedEdits = intakePassed ? buildPlannedEdits({ intake, sourceRootSession, ownerDecisionSession }) : [];
  const report = {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    status: !intakePassed
      ? 'owner_answer_session_edit_plan_blocked_by_intake_guard'
      : plannedEdits.length > 0
        ? 'owner_answer_session_edit_plan_ready_for_review'
        : 'owner_answer_session_edit_plan_pending_owner_input',
    policy: {
      writes_session_files: false,
      applies_decisions: false,
      writes_public_files: false,
      writes_public_manifest: false,
      public_ready_after_plan: 0,
      requires_explicit_owner_confirmation: true,
      note: 'This report plans possible session edits only. It never mutates source-root or owner decision session files.'
    },
    source_refs: [
      relative(root, intakePath),
      relative(root, intakeCheckPath),
      relative(root, sourceRootSessionPath),
      relative(root, ownerDecisionSessionPath)
    ],
    summary: {
      intake_guard_status: intakeCheck.status,
      intake_guard_failures: intakeCheck.summary?.failures ?? null,
      filled_answers: intakeCheck.summary?.filled_answers ?? 0,
      planned_edits: plannedEdits.length,
      source_root_session_edits: plannedEdits.filter((edit) => edit.target_file === relative(root, sourceRootSessionPath)).length,
      owner_decision_session_edits: plannedEdits.filter((edit) => edit.target_file === relative(root, ownerDecisionSessionPath)).length,
      public_ready_after_plan: 0
    },
    planned_edits: plannedEdits,
    next_actions: plannedEdits.length > 0
      ? [
          'Review this plan with Codex/Claude before changing any session file.',
          'Apply only explicitly confirmed owner answers.',
          'After applying reviewed session edits, rerun source-root/owner decision checks and the full data-lane sweep.'
        ]
      : [
          'Wait for explicit owner answers in the intake template.',
          'Rerun npm run kosmo:owner-answer-intake-check after intake fields are filled.',
          'Rerun this edit plan before any session edit.'
        ]
  };

  await mkdir(dirname(outputJson), { recursive: true });
  await mkdir(dirname(outputMd), { recursive: true });
  await writeFile(outputJson, `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(outputMd, renderMarkdown(report));

  console.log('Kosmo owner answer session edit plan');
  console.log(`Status: ${report.status}`);
  console.log(`Planned edits: ${report.summary.planned_edits}`);
  console.log(`Wrote: ${relative(root, outputMd)}`);

  if (!intakePassed) process.exitCode = 1;
}

function buildPlannedEdits({ intake, sourceRootSession, ownerDecisionSession }) {
  const edits = [];
  const sourceRootAnswer = intake.source_root_answer;
  if (sourceRootAnswer?.selected_decision) {
    edits.push({
      target_file: 'examples/kosmo-references/provenance/source-root-decision-session-2026-06-13.json',
      edit_type: 'source_root_decision',
      selected_decision: sourceRootAnswer.selected_decision,
      selected_root_path: sourceRootAnswer.selected_root_path,
      owner_note: sourceRootAnswer.owner_note || '',
      current_selected_decision: sourceRootSession.selected_decision,
      current_selected_root_path: sourceRootSession.selected_root_path,
      public_ready_after_edit: 0
    });
  }

  const ownerSessionByItem = new Map((ownerDecisionSession.decisions || []).map((decision) => [decision.item_id, decision]));
  for (const answer of intake.reference_decision_answers || []) {
    if (!answer.selected_decision) continue;
    const current = ownerSessionByItem.get(answer.item_id);
    edits.push({
      target_file: 'examples/kosmo-references/provenance/owner-review-decision-session-2026-06-13.json',
      edit_type: 'reference_owner_decision',
      group_id: answer.group_id,
      item_id: answer.item_id,
      selected_decision: answer.selected_decision,
      owner_note: answer.owner_note || '',
      current_selected_decision: current?.selected_decision ?? null,
      public_ready_after_edit: false
    });
  }

  for (const answer of intake.owner_card_answers || []) {
    if (!answer.owner_choice) continue;
    edits.push({
      target_file: 'manual-review-only',
      edit_type: 'owner_card_triage_note',
      batch_id: answer.batch_id,
      owner_choice: answer.owner_choice,
      owner_note: answer.owner_note || '',
      public_ready_after_edit: 0
    });
  }

  return edits;
}

function renderMarkdown(report) {
  const lines = [];
  lines.push('# Kosmo Owner Answer Session Edit Plan');
  lines.push('');
  lines.push(`Generated: ${report.generated_at}`);
  lines.push(`Status: \`${report.status}\``);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Intake guard: ${report.summary.intake_guard_status}`);
  lines.push(`- Intake guard failures: ${report.summary.intake_guard_failures}`);
  lines.push(`- Filled answers: ${report.summary.filled_answers}`);
  lines.push(`- Planned edits: ${report.summary.planned_edits}`);
  lines.push(`- Source-root session edits: ${report.summary.source_root_session_edits}`);
  lines.push(`- Owner decision session edits: ${report.summary.owner_decision_session_edits}`);
  lines.push(`- Public-ready after plan: ${report.summary.public_ready_after_plan}`);
  lines.push('');
  lines.push('## Planned Edits');
  lines.push('');
  if (report.planned_edits.length === 0) {
    lines.push('- none');
  } else {
    for (const edit of report.planned_edits) {
      lines.push(`- ${edit.edit_type} -> \`${edit.target_file}\``);
    }
  }
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
